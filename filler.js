(async () => {
  const { profile: p, resume } = await chrome.storage.local.get(["profile", "resume"]);
  if (!p) return { error: "No profile saved yet. Open Edit profile first." };

  const BOOL_KEYS = new Set([
    "authorized_us", "requires_sponsorship", "hispanic_latino", "restriction",
    "over_18", "relocate", "previously_employed",
  ]);

  const SCREENER = [
    [/sponsor|\bvisa\b|h-?1b/i, "requires_sponsorship"],
    [/non-?compete|restrictive covenant|bound by (any )?(agreement|contract)|restrict(s|ing)? your ability|prevent you from working/i, "restriction"],
    [/(legally )?(authori[sz]ed|eligible|permitted) to work|work authori[sz]ation|right to work/i, "authorized_us"],
    [/18 years|at least 18|age of 18|over the age/i, "over_18"],
    [/previously (been )?(employed|worked)|ever (been )?(employed|worked) (by|for|at)|former employee/i, "previously_employed"],
    [/relocat/i, "relocate"],
    [/current (or most recent )?(employer|company)|most recent (employer|company)|present employer/i, "current_employer"],
    [/current (or most recent )?(job )?title|current (role|position)|most recent (job )?title/i, "current_title"],
    [/race|ethnicit/i, "race"],
    [/hispanic|latin[oax]/i, "hispanic_latino"],
    [/gender|\bsex\b/i, "gender"],
    [/veteran|military|armed forces/i, "veteran_status"],
    [/disab/i, "disability_status"],
    [/pronoun/i, "pronouns"],
    [/salary|compensation|desired pay|expected pay|pay expectation/i, "salary"],
    [/start date|earliest.*start|when can you start|available to start/i, "start_date"],
    [/notice period/i, "notice_period"],
    [/how many years|years of.*experience|years.*experience/i, "years_experience"],
    [/how did you (hear|find|learn)|where did you (hear|find)|referral source/i, "referral_source"],
    [/why .*(interested|want to|join|apply)|what (excites|interests) you/i, "why_interested"],
  ];

  const BASIC = [
    [/preferred (first )?name|nickname/i, "preferred_name"],
    [/first\s*name|given name/i, "first_name"],
    [/last\s*name|surname|family name/i, "last_name"],
    [/full\s*name|legal name|your name|^name$/i, "full_name"],
    [/e-?mail/i, "email"],
    [/phone|mobile|telephone|\bcell\b/i, "phone"],
    [/linkedin/i, "linkedin"],
    [/github/i, "github"],
    [/scholar/i, "scholar"],
    [/website|portfolio|personal (site|url|page)|blog|other (link|url)/i, "website"],
    [/school|university|college|institution/i, "school"],
    [/degree/i, "degree"],
    [/discipline|major|field of study/i, "discipline"],
    [/graduat/i, "graduation"],
    [/location|where are you (based|located)|current residence/i, "location"],
    [/address line 2|apartment|suite|\bapt\b|\bunit\b/i, "address_line2"],
    [/street|address/i, "address_line1"],
    [/\bcity\b|\btown\b/i, "city"],
    [/\bstate\b|province/i, "state"],
    [/\bzip\b|postal/i, "postal_code"],
    [/country/i, "country"],
  ];

  const AUTOCOMPLETE = {
    "given-name": "first_name", "family-name": "last_name", name: "full_name",
    email: "email", tel: "phone", "tel-national": "phone",
    "address-line1": "address_line1", "street-address": "address_line1",
    "address-line2": "address_line2", "address-level2": "city",
    "address-level1": "state", "postal-code": "postal_code",
    country: "country", "country-name": "country", url: "website",
    "organization": "current_employer", "organization-title": "current_title",
  };

  const STATES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
    CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
    KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
    MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
    NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
    NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
    OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
    WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  };

  const values = { ...p };
  if (!values.full_name) values.full_name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  if (!values.preferred_name) values.preferred_name = p.first_name;
  if (!values.location && p.city) values.location = [p.city, p.state].filter(Boolean).join(", ");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (s) => (s || "").replace(/\s+/g, " ").replace(/\*/g, "").trim();
  const norm = (s) => clean(s).toLowerCase();
  const tokens = (s) => norm(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((t) => t.length > 1);
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function visible(el) {
    if (el.disabled || el.readOnly) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  }

  function textOf(ids) {
    return ids.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" ");
  }

  function ownLabel(el) {
    const parts = [];
    if (el.labels) for (const l of el.labels) parts.push(l.innerText);
    if (el.getAttribute("aria-label")) parts.push(el.getAttribute("aria-label"));
    if (el.getAttribute("aria-labelledby")) parts.push(textOf(el.getAttribute("aria-labelledby")));
    return clean([...new Set(parts.map(clean).filter(Boolean))].join(" "));
  }

  function questionText(el, exclude = []) {
    const fs = el.closest("fieldset");
    if (fs) {
      const lg = fs.querySelector("legend");
      if (lg && clean(lg.innerText)) return clean(lg.innerText);
    }
    const grp = el.closest('[role="radiogroup"],[role="group"]');
    if (grp) {
      const t = grp.getAttribute("aria-label") || (grp.getAttribute("aria-labelledby") && textOf(grp.getAttribute("aria-labelledby")));
      if (clean(t)) return clean(t);
    }
    let node = el.parentElement;
    for (let i = 0; node && i < 6; i++, node = node.parentElement) {
      let t = node.innerText || "";
      for (const x of exclude) if (x) t = t.split(x).join(" ");
      t = clean(t);
      if (t.length > 1) return t.slice(0, 400);
    }
    return "";
  }

  function nameHints(el) {
    return clean([el.placeholder, el.name, el.id].filter(Boolean).join(" ").replace(/[_\-\[\].]+/g, " "));
  }

  function keyFor(label, hints, el) {
    if (label) {
      for (const [re, k] of SCREENER) if (re.test(label)) return k;
      if (label.length <= 60) for (const [re, k] of BASIC) if (re.test(label)) return k;
    }
    const ac = (el && el.getAttribute("autocomplete")) || "";
    if (AUTOCOMPLETE[ac]) return AUTOCOMPLETE[ac];
    if (hints) {
      for (const [re, k] of BASIC) if (re.test(hints)) return k;
      for (const [re, k] of SCREENER) if (re.test(hints)) return k;
    }
    return null;
  }

  function wanted(key) {
    const v = values[key];
    if (v === undefined || v === null || v === "") return null;
    if (BOOL_KEYS.has(key)) return v ? "Yes" : "No";
    return String(v);
  }

  function score(option, want, key) {
    const o = norm(option);
    const w = norm(want);
    if (!o || !w) return 0;
    if (o === w) return 100;
    if (key === "state" && STATES[want.toUpperCase()] && o === norm(STATES[want.toUpperCase()])) return 100;
    if (w === "yes" || w === "no") {
      if (new RegExp(`^${w}\\b`).test(o)) return 90;
      return 0;
    }
    if (new RegExp(`\\b${escRe(w)}\\b`).test(o)) return 80 - Math.min(30, o.length - w.length);
    if (new RegExp(`\\b${escRe(o)}\\b`).test(w) && o.length > 2) return 70 - Math.min(30, w.length - o.length);
    const wt = tokens(want);
    const ot = new Set(tokens(option));
    if (!wt.length) return 0;
    const neg = (s) => /^(no|not|i am not|i don)/.test(norm(s));
    if (neg(want) !== neg(option)) return 0;
    const hit = wt.filter((t) => ot.has(t)).length;
    return Math.round((hit / wt.length) * 60);
  }

  function best(options, want, key) {
    let top = null;
    let topScore = 39;
    for (const o of options) {
      const s = score(o.text, want, key);
      if (s > topScore) { top = o; topScore = s; }
    }
    return top;
  }

  function setValue(el, v) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    el.focus();
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    el.blur();
  }

  const done = new Set();
  const missing = [];
  let filled = 0;

  function mark(el, ok) {
    el.style.outline = ok ? "2px solid #2e7d32" : "2px solid #f59e0b";
    el.style.outlineOffset = "1px";
  }

  function isRequired(el, label) {
    return el.required || el.getAttribute("aria-required") === "true" || /\*\s*$/.test(label || "");
  }

  function noteMissing(el, label) {
    if (!isRequired(el, label)) return;
    mark(el, false);
    const l = clean(label).slice(0, 80);
    if (l && !missing.includes(l)) missing.push(l);
  }

  function visibleOptions(el) {
    const lb = el.getAttribute("aria-controls") || el.getAttribute("aria-owns");
    const scope = (lb && document.getElementById(lb)) || document;
    return [...scope.querySelectorAll('[role="option"]')].filter(visible);
  }

  async function pickFrom(el, want, key) {
    for (let i = 0; i < 8; i++) {
      await sleep(120);
      const opts = visibleOptions(el);
      if (!opts.length) continue;
      const pick = best(opts.map((o) => ({ el: o, text: o.innerText })), want, key);
      if (!pick) return false;
      pick.el.scrollIntoView({ block: "nearest" });
      pick.el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      pick.el.click();
      return true;
    }
    return false;
  }

  function viaBridge(el, want, key) {
    el.dispatchEvent(new CustomEvent("applyfill:options", { bubbles: true }));
    let labels = [];
    try { labels = JSON.parse(el.getAttribute("data-applyfill-options") || "[]"); } catch {}
    el.removeAttribute("data-applyfill-options");
    if (!labels.length) return null;
    const pick = best(labels.map((text, i) => ({ el: i, text })), want, key);
    if (!pick) return false;
    el.setAttribute("data-applyfill-choose", String(pick.el));
    el.dispatchEvent(new CustomEvent("applyfill:choose", { bubbles: true }));
    return true;
  }

  async function fillCombobox(el, want, key) {
    const bridged = viaBridge(el, want, key);
    if (bridged !== null) return bridged;
    el.focus();
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", keyCode: 40, bubbles: true }));
    if (await pickFrom(el, want, key)) return true;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, want);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (await pickFrom(el, want, key)) return true;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
    el.blur();
    return false;
  }

  const fields = [...document.querySelectorAll("input, textarea, select")];

  for (const el of fields) {
    if (done.has(el)) continue;
    const type = (el.type || "").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image", "password", "file", "search"].includes(type)) continue;
    if (!visible(el)) continue;

    if (type === "radio" || type === "checkbox") {
      const group = el.name
        ? fields.filter((f) => f.type === el.type && f.name === el.name && (f.form === el.form))
        : [el];
      group.forEach((g) => done.add(g));
      const opts = group.map((g) => ({ el: g, text: ownLabel(g) || g.value }));
      const q = questionText(el, opts.map((o) => o.text));
      const single = group.length === 1 && type === "checkbox";
      const key = keyFor(single ? ownLabel(el) || q : q, null, null);
      if (group.some((g) => g.checked)) continue;
      const want = key && wanted(key);
      if (!want) { noteMissing(el, q); continue; }
      if (single) {
        if (want === "Yes") { el.click(); mark(el, true); filled++; }
        continue;
      }
      const pick = best(opts, want, key);
      if (pick) { pick.el.click(); mark(pick.el, true); filled++; } else noteMissing(el, q);
      continue;
    }

    done.add(el);
    const label = ownLabel(el) || (el.tagName !== "SELECT" ? "" : questionText(el, [...el.options].map((o) => o.text)));
    const fallbackQ = label ? "" : questionText(el);
    const key = keyFor(label || (fallbackQ.length <= 200 ? fallbackQ : ""), nameHints(el), el);
    const want = key && wanted(key);
    const shown = label || fallbackQ || nameHints(el);

    if (el.tagName === "SELECT") {
      if (el.value && el.selectedIndex > 0) continue;
      if (!want) { noteMissing(el, shown); continue; }
      const opts = [...el.options].filter((o) => o.value !== "").map((o) => ({ el: o, text: o.text }));
      const pick = best(opts, want, key);
      if (pick) { setValue(el, pick.el.value); mark(el, true); filled++; } else noteMissing(el, shown);
      continue;
    }

    if (el.value) continue;
    if (key === "why_interested" && el.tagName !== "TEXTAREA") continue;
    if (!want) { noteMissing(el, shown); continue; }

    if (el.getAttribute("role") === "combobox" || el.getAttribute("aria-autocomplete") === "list") {
      if (await fillCombobox(el, want, key)) { mark(el, true); filled++; } else noteMissing(el, shown);
      continue;
    }

    setValue(el, want);
    mark(el, true);
    filled++;
  }

  const yesNoGroups = new Set();
  for (const b of document.querySelectorAll("button")) {
    const t = norm(b.innerText);
    if (t !== "yes" && t !== "no") continue;
    const parent = b.parentElement;
    if (!parent || yesNoGroups.has(parent) || !visible(b)) continue;
    const btns = [...parent.querySelectorAll("button")].filter((x) => ["yes", "no"].includes(norm(x.innerText)));
    if (btns.length !== 2) continue;
    yesNoGroups.add(parent);
    if (btns.some((x) => x.getAttribute("aria-pressed") === "true" || /selected|active|checked/i.test(x.className))) continue;
    const q = questionText(parent, ["Yes", "No"]);
    const key = keyFor(q, null, null);
    const want = key && wanted(key);
    const pick = want && btns.find((x) => norm(x.innerText) === norm(want));
    if (pick) { pick.click(); mark(pick, true); filled++; }
  }

  let attached = false;
  if (resume && resume.data) {
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    const scored = inputs.map((f) => {
      const t = norm(ownLabel(f) + " " + questionText(f) + " " + nameHints(f));
      let s = 0;
      if (/resume|résumé|\bcv\b|curriculum/.test(t)) s += 2;
      if (/cover|letter|transcript|portfolio|writing/.test(t)) s -= 3;
      return { f, s };
    });
    let target = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s)[0];
    if (!target && inputs.length === 1 && scored[0].s >= 0) target = scored[0];
    if (target && !target.f.files.length) {
      const bin = atob(resume.data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], resume.name, { type: resume.type || "application/pdf" });
      const dt = new DataTransfer();
      dt.items.add(file);
      target.f.files = dt.files;
      target.f.dispatchEvent(new Event("input", { bubbles: true }));
      target.f.dispatchEvent(new Event("change", { bubbles: true }));
      attached = true;
    }
  }

  return { filled, resume: attached, missing };
})();
