(async () => {
  const { profile: p, resume } = await chrome.storage.local.get(["profile", "resume"]);
  if (!p) return { error: "No profile saved yet. Open Edit profile first." };

  const BOOL_KEYS = new Set([
    "authorized_us", "requires_sponsorship", "hispanic_latino", "restriction",
    "over_18", "relocate", "previously_employed", "under_18", "terminated",
    "relatives_at_company", "current_company_employee", "enrolled_at_company", "student",
    "interviewed_before", "onsite_ok", "accept_acknowledgements", "criminal_conviction", "temporary_authorization",
  ]);

  const SCREENER = [
    [/\bminor\b|under (the age of )?18|younger than 18/i, "under_18"],
    [/terminated|discharged|asked to resign|ineligible for rehire|dismissed from/i, "terminated"],
    [/arbitrat|waive|class action/i, "never_auto"],
    [/convicted|plea of .{0,3}guilty|no contest|criminal (record|offen[cs]e|conviction|history)|pending criminal charges/i, "criminal_conviction"],
    [/\brelatives?\b|family members? (who )?(work|are employed)|related to (anyone|an employee)|(personal|family) relationship with/i, "relatives_at_company"],
    [/currently (an? )?(active )?employee|active employee|currently (employed|being paid) (by|directly)/i, "current_company_employee"],
    [/currently enrolled at|current student (at|of)/i, "enrolled_at_company"],
    [/currently (enrolled|a student|pursuing)|are you a (current )?student/i, "student"],
    [/temporary (employment|work) authori[sz]ation|\bOPT\b.{0,40}authori[sz]ation|authori[sz]ation .{0,40}\b(OPT|EAD)\b/i, "temporary_authorization"],
    [/sponsor|\bvisa\b|h-?1b/i, "requires_sponsorship"],
    [/non-?compete|restrictive covenant|bound by (any )?(agreement|contract)|restrict(s|ing)? your ability|prevent you from working/i, "restriction"],
    [/(legally )?(authori[sz]ed|eligible|permitted) to work|work authori[sz]ation|right to work/i, "authorized_us"],
    [/18 years|at least 18|age of 18|over the age|minimum (legal )?age|legal age/i, "over_18"],
    [/(interviewed|applied) (with|at|for|to) .{0,60}(before|previously|in the past)|previously (interviewed|applied)|ever (interviewed|applied)/i, "interviewed_before"],
    [/previously (been )?(employed|worked)|ever (been )?(employed|worked) (by|for|at)|have you (ever )?(worked|been employed) (at|for|with)|former (student|employee|affiliate|worker)|previous worker/i, "previously_employed"],
    [/relocat/i, "relocate"],
    [/in.?office|on.?site|in.?person|hybrid|days? (a|per|\/) ?week|commut/i, "onsite_ok"],
    [/current (or most recent )?(employer|company)|most recent (employer|company)|present employer/i, "current_employer"],
    [/current (or most recent )?(job )?title|current (role|position)|most recent (job )?title/i, "current_title"],
    [/hispanic|latin[oax]/i, "hispanic_latino"],
    [/\brace\b|ethnicit/i, "race"],
    [/gender|\bsex\b/i, "gender"],
    [/veteran|military|armed forces/i, "veteran_status"],
    [/disab/i, "disability_status"],
    [/pronoun/i, "pronouns"],
    [/salary|compensation|desired pay|expected pay|pay expectation/i, "salary"],
    [/start date|earliest.*start|when can you start|available to start/i, "start_date"],
    [/notice period/i, "notice_period"],
    [/how many years|years of.*experience|years.*experience/i, "years_experience"],
    [/how did you (hear|find|learn)|where did you (hear|find)|referral source/i, "referral_source"],
    [/phone (device )?type|type of phone/i, "phone_type"],
    [/phone code|country code|dialing code/i, "phone_country"],
    [/privacy (notice|policy|terms|statement)|candidate privacy|application accuracy|accuracy and completeness|information (provided )?(is )?(true|accurate|complete)|i certify|certification of|acknowledg/i, "accept_acknowledgements"],
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

  const values = {
    over_18: true, under_18: false, restriction: false, previously_employed: false,
    terminated: false, relatives_at_company: false, current_company_employee: false,
    enrolled_at_company: false, interviewed_before: false, onsite_ok: true, accept_acknowledgements: true, criminal_conviction: false, phone_type: "Mobile", ...p,
  };
  if (!values.phone_country) values.phone_country = values.country || "United States";
  if (!values.full_name) values.full_name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  if (!values.preferred_name) values.preferred_name = p.first_name;
  if (!values.location && p.city) values.location = [p.city, p.state].filter(Boolean).join(", ");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (s) => (s || "").replace(/\s+/g, " ").replace(/\*/g, "").trim();
  const norm = (s) => clean(s).toLowerCase();
  const tokens = (s) => norm(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((t) => t.length > 1)
    .map((t) => (t.length > 4 ? t.replace(/s$/, "") : t));
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function visible(el) {
    if (el.disabled) return false;
    if (el.readOnly && !["radio", "checkbox"].includes(el.type) && el.getAttribute("role") !== "combobox") return false;
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

  function fieldLabel(el) {
    const ff = el.closest('[data-automation-id^="formField-"]');
    const l = ff && ff.querySelector("label, legend");
    return l ? clean(l.innerText) : "";
  }

  function questionText(el, exclude = []) {
    const wd = fieldLabel(el);
    if (wd) return wd;
    const grp = el.closest('[role="radiogroup"],[role="group"]');
    if (grp) {
      const t = grp.getAttribute("aria-label") || (grp.getAttribute("aria-labelledby") && textOf(grp.getAttribute("aria-labelledby")));
      if (clean(t)) return clean(t);
    }
    const fs = el.closest("fieldset");
    if (fs && [...fs.querySelectorAll("input:not([type=hidden]), select, textarea")].every((x) => x.name && x.name === el.name)) {
      const lg = fs.querySelector("legend");
      if (lg && clean(lg.innerText)) return clean(lg.innerText);
    }
    if (el.type === "radio" || el.type === "checkbox") {
      let up = grp || el;
      for (let i = 0; up && i < 5; i++, up = up.parentElement) {
        const sib = up.previousElementSibling;
        if (!sib) continue;
        let t = sib.innerText || "";
        for (const x of exclude) if (x) t = t.split(x).join(" ");
        t = clean(t);
        if (t.length > 3) return t.slice(0, 400);
        break;
      }
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

  const FOLLOWUP = { requires_sponsorship: "sponsorship_explanation", authorized_us: "authorization_explanation" };

  function previousQuestionKey(el) {
    const ffs = [...document.querySelectorAll('[data-automation-id^="formField-"]')];
    const own = el.closest('[data-automation-id^="formField-"]');
    let prev = [];
    if (own && ffs.includes(own)) {
      prev = ffs.slice(0, ffs.indexOf(own)).reverse().map((f) => clean((f.querySelector("label, legend") || {}).innerText));
    } else {
      const all = [...document.querySelectorAll("input, select, textarea")];
      prev = all.slice(0, all.indexOf(el)).reverse().map((x) => ownLabel(x) || questionText(x));
    }
    for (const l of prev.slice(0, 3)) {
      if (!l || /^if (yes|so)\b/i.test(l)) continue;
      const k = keyFor(l, null, null);
      if (k) return k;
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
    if (lb && !document.getElementById(lb)) return [];
    const scope = (lb && document.getElementById(lb)) || document;
    return [...scope.querySelectorAll('[role="option"]')].filter(visible);
  }

  async function pickFrom(el, want, key) {
    for (let i = 0; i < 8; i++) {
      await sleep(120);
      const opts = visibleOptions(el);
      if (!opts.length) continue;
      const pick = bestOf(opts.map((o) => ({ el: o, text: o.innerText })), key, want);
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
    const pick = bestOf(labels.map((text, i) => ({ el: i, text })), key, want);
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
    if (el.getAttribute("aria-expanded") !== "true") el.click();
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

  const FALLBACKS = {
    referral_source: ["Company Careers Page", "Company Website", "Careers Website", "Career Site", "Website", "LinkedIn", "Job Board", "Internet", "Other"],
  };

  function keySeq(el, key, code, keyCode) {
    for (const t of ["keydown", "keypress", "keyup"]) {
      el.dispatchEvent(new KeyboardEvent(t, { key, code, keyCode, which: keyCode, bubbles: true }));
    }
  }

  function typeInto(el, text) {
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, "");
    for (const ch of text) {
      const code = /\d/.test(ch) ? "Digit" + ch : "Key" + ch.toUpperCase();
      el.dispatchEvent(new KeyboardEvent("keydown", { key: ch, code, keyCode: ch.charCodeAt(0), bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keypress", { key: ch, code, keyCode: ch.charCodeAt(0), bubbles: true }));
      setter.call(el, el.value + ch);
      el.dispatchEvent(new InputEvent("input", { data: ch, inputType: "insertText", bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: ch, code, keyCode: ch.charCodeAt(0), bubbles: true }));
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function waitFor(fn, ms = 2000) {
    for (let t = 0; t < ms; t += 100) {
      const v = fn();
      if (v && (!Array.isArray(v) || v.length)) return v;
      await sleep(100);
    }
    return null;
  }

  function degreeAliases(want) {
    if (/master|^m\.?s\.?\b|^m\.?a\.?\b|mba/i.test(want)) return ["Masters", "Master's Degree", "Master's", "Master"];
    if (/bachelor|^b\.?s\.?\b|^b\.?a\.?\b/i.test(want)) return ["Bachelors", "Bachelor's Degree", "Bachelor's", "Bachelor"];
    if (/doctor|ph\.?d/i.test(want)) return ["Doctoral", "Doctorate", "PhD", "Doctoral/Professional"];
    if (/associate/i.test(want)) return ["Associates", "Associate's Degree", "Associate"];
    return [];
  }

  function wantsFor(key, want) {
    const extra = key === "degree" ? degreeAliases(want)
      : key === "race" ? [values.hispanic_latino ? "Hispanic or Latino" : "Not Hispanic or Latino"]
      : (!values[key] && FALLBACKS[key]) || [];
    return [want, ...extra].filter(Boolean);
  }

  function bestOf(opts, key, want) {
    let top = null;
    let topScore = 39;
    for (const w of wantsFor(key, want)) {
      for (const o of opts) {
        const sc = score(o.text, w, key);
        if (sc > topScore) { top = o; topScore = sc; }
      }
      if (topScore >= 100) break;
    }
    return top;
  }

  const isPlaceholder = (t) => !t || /^(select( one)?|choose( one)?|please select|--)/i.test(t);

  async function fillListbox(btn, key, want) {
    if (!isPlaceholder(clean(btn.innerText))) return "skip";
    btn.click();
    const lists = await waitFor(() => [...document.querySelectorAll('[role="listbox"]')]
      .filter((l) => l.getAttribute("data-automation-id") !== "selectedItemList" && visible(l)
        && l.querySelector('[role="option"]')));
    if (!lists) return false;
    const opts = [...lists[lists.length - 1].querySelectorAll('[role="option"]')]
      .filter((o) => o.getAttribute("aria-disabled") !== "true")
      .map((o) => ({ el: o, text: o.innerText }));
    const pick = bestOf(opts, key, want);
    if (!pick) {
      keySeq(lists[lists.length - 1], "Escape", "Escape", 27);
      if (btn.getAttribute("aria-expanded") === "true") btn.click();
      return false;
    }
    pick.el.scrollIntoView({ block: "nearest" });
    pick.el.click();
    await sleep(400);
    return !isPlaceholder(clean(btn.innerText));
  }

  async function fillPrompt(box, key, want) {
    if (box.closest('[data-automation-id^="formField-"]')?.querySelector('[data-automation-id="selectedItem"]')) return "skip";
    const input = box.querySelector("input");
    if (!input) return false;
    const ff = box.closest('[data-automation-id^="formField-"]') || box.parentElement;
    const pills = () => ff.querySelectorAll('[data-automation-id="selectedItem"]').length;
    for (const w of wantsFor(key, want)) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      input.focus();
      setter.call(input, w);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      keySeq(input, "Enter", "Enter", 13);
      for (let depth = 0; depth < 3; depth++) {
        const opts = await waitFor(() => [...document.querySelectorAll('[data-automation-id="promptOption"]')]
          .filter(visible).map((o) => ({ el: o, text: o.innerText })));
        if (!opts) break;
        const pick = best(opts, w, key) || (opts.length === 1 && depth > 0 ? opts[0] : null);
        if (!pick) break;
        pick.el.click();
        await sleep(700);
        if (pills()) {
          keySeq(input, "Escape", "Escape", 27);
          input.blur();
          return true;
        }
      }
      setter.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    keySeq(input, "Escape", "Escape", 27);
    input.blur();
    return false;
  }

  async function fillDate(ff, value) {
    if (!value) return false;
    const m = String(value).match(/^(\d{1,2})\/(\d{4})$/) || String(value).match(/^(\d{4})$/);
    if (!m) return false;
    const [month, year] = m.length === 3 ? [m[1].padStart(2, "0"), m[2]] : [null, m[1]];
    const mi = ff.querySelector('input[data-automation-id="dateSectionMonth-input"]');
    const yi = ff.querySelector('input[data-automation-id="dateSectionYear-input"]');
    if (mi || yi) {
      if (mi && month) { typeInto(mi, month); await sleep(150); }
      if (yi) { typeInto(yi, year); await sleep(150); }
      (yi || mi).dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      (yi || mi).blur();
      return true;
    }
    const plain = ff.querySelector('input:not([type="checkbox"]):not([type="radio"])');
    if (plain && !plain.value) { setValue(plain, month ? `${month}/${year}` : year); return true; }
    return false;
  }

  function labelOf(el) {
    return fieldLabel(el) || ownLabel(el) || "";
  }

  function sectionAddButton(title) {
    const re = new RegExp(`^${title}$`, "i");
    const head = [...document.querySelectorAll("h2, h3, h4, h5, legend, [role='heading']")]
      .find((h) => re.test(clean(h.innerText)) && visible(h));
    if (!head) return null;
    const peers = [...document.querySelectorAll(head.tagName)];
    const next = peers[peers.indexOf(head) + 1];
    const FOLLOW = Node.DOCUMENT_POSITION_FOLLOWING;
    return [...document.querySelectorAll("button")].filter(visible)
      .filter((x) => /^add( another)?$/i.test(clean(x.innerText)) || /^add\b/i.test(x.getAttribute("aria-label") || ""))
      .find((x) => (head.compareDocumentPosition(x) & FOLLOW) && (!next || (x.compareDocumentPosition(next) & FOLLOW))) || null;
  }

  function entryContainers(anchorRe, otherRe) {
    const anchors = [...document.querySelectorAll("input")].filter((i) => visible(i) && anchorRe.test(labelOf(i)));
    return anchors.map((a) => {
      const grp = a.closest('[role="group"]');
      if (grp && [...grp.querySelectorAll("input")].filter((i) => anchorRe.test(labelOf(i))).length === 1) return grp;
      let node = a;
      for (let i = 0; i < 8 && node.parentElement; i++) {
        const up = node.parentElement;
        const inputs = [...up.querySelectorAll("input")];
        if (inputs.filter((x) => anchorRe.test(labelOf(x))).length > 1) break;
        if (inputs.some((x) => otherRe.test(labelOf(x)))) break;
        node = up;
      }
      return node;
    });
  }

  function fieldsIn(container) {
    const map = new Map();
    for (const ff of container.querySelectorAll('[data-automation-id^="formField-"]')) {
      const l = clean((ff.querySelector("label, legend") || {}).innerText);
      if (l && !map.has(l)) map.set(l, ff);
    }
    if (!map.size) {
      for (const el of container.querySelectorAll("input, textarea, button[aria-haspopup='listbox']")) {
        const l = ownLabel(el);
        if (l && !map.has(l)) map.set(l, el.parentElement);
      }
    }
    return map;
  }

  async function fillEntryField(ff, value, isDate, field, alt) {
    if (value === undefined || value === null || value === "") return false;
    if (isDate) return fillDate(ff, value);
    const key = field === "degree" ? "degree" : null;
    const btn = ff.querySelector('button[aria-haspopup="listbox"]');
    if (btn) { done.add(btn); return (await fillListbox(btn, key, String(value))) === true; }
    const prompt = ff.querySelector('[data-automation-id="multiselectInputContainer"]');
    if (prompt) {
      for (const v of [value, alt].filter(Boolean)) if ((await fillPrompt(prompt, key, String(v))) === true) return true;
      return false;
    }
    const el = ff.querySelector("textarea, input:not([type='checkbox']):not([type='radio']):not([type='file'])");
    if (!el) return false;
    done.add(el);
    if (el.value) return false;
    setValue(el, String(value));
    mark(el, true);
    return true;
  }

  const WORK_FIELDS = [
    [/job title|position title|^title$/i, "title"],
    [/company|employer|organi[sz]ation/i, "company"],
    [/location|city/i, "location"],
    [/^from|start/i, "from", true],
    [/^to\b|^end/i, "to", true],
    [/description|responsibilit|summary|duties/i, "description"],
  ];
  const EDU_FIELDS = [
    [/school|university|institution|college/i, "school"],
    [/degree/i, "degree"],
    [/field of study|major|discipline/i, "field"],
    [/gpa|overall result|grade/i, "gpa"],
    [/^from|start|first year/i, "from", true],
    [/^to\b|^end|last year|graduat/i, "to", true],
  ];

  async function fillEntries(section, anchorRe, otherRe, specs, entries, currentRe) {
    if (!Array.isArray(entries) || !entries.length) return;
    let boxes = entryContainers(anchorRe, otherRe);
    const add = sectionAddButton(section);
    while (add && boxes.length < entries.length) {
      const before = boxes.length;
      sectionAddButton(section)?.click();
      await sleep(900);
      boxes = entryContainers(anchorRe, otherRe);
      if (boxes.length === before) break;
    }
    for (let i = 0; i < boxes.length && i < entries.length; i++) {
      const e = entries[i];
      const fieldsMap = fieldsIn(boxes[i]);
      const anchorFilled = [...boxes[i].querySelectorAll("input")].find((x) => anchorRe.test(labelOf(x)));
      if (anchorFilled && anchorFilled.value) continue;
      if (currentRe && e.current) {
        const cb = [...boxes[i].querySelectorAll('input[type="checkbox"]')].find((c) => currentRe.test(labelOf(c)));
        if (cb) { done.add(cb); if (!cb.checked) { cb.click(); await sleep(300); } }
      }
      for (const [label, ff] of fieldsMap) {
        const spec = specs.find(([re]) => re.test(label));
        if (!spec) continue;
        const [, field, isDate] = spec;
        if (field === "to" && e.current) continue;
        if (await fillEntryField(ff, e[field], isDate, field, e[field + "_alt"])) filled++;
      }
      boxes[i].querySelectorAll("input, textarea").forEach((x) => done.add(x));
    }
  }

  async function fillWebsites(urls) {
    if (!urls.length) return;
    const anchorRe = /^url$|website url|^website$/i;
    const add = sectionAddButton("Websites");
    if (!add) return;
    let inputs = () => [...document.querySelectorAll("input")].filter((i) => visible(i) && anchorRe.test(labelOf(i)));
    const existing = new Set(inputs().map((i) => i.value).filter(Boolean));
    const todo = urls.filter((u) => !existing.has(u));
    for (const u of todo) {
      let empty = inputs().find((i) => !i.value);
      if (!empty) {
        sectionAddButton("Websites")?.click();
        empty = await waitFor(() => inputs().find((i) => !i.value), 1500);
      }
      if (!empty) break;
      setValue(empty, u);
      mark(empty, true);
      done.add(empty);
      filled++;
    }
  }

  async function searchCombobox(el, queries, key, want, alt) {
    for (const q of queries) {
      if (q == null) continue;
      el.setAttribute("data-applyfill-query", q);
      el.dispatchEvent(new CustomEvent("applyfill:search", { bubbles: true }));
      let labels = null;
      for (let t = 0; t < 40 && !labels; t++) {
        await sleep(100);
        const raw = el.getAttribute("data-applyfill-found");
        if (raw) labels = JSON.parse(raw);
      }
      el.removeAttribute("data-applyfill-found");
      if (!labels || !labels.length) continue;
      const opts = labels.map((text, i) => ({ el: i, text }));
      const pick = bestOf(opts, key, want) || (alt && bestOf(opts, key, alt)) || (key === "discipline" || key === "school" ? bestOverlap(opts, alt || want) : null);
      if (!pick) continue;
      el.setAttribute("data-applyfill-choose", String(pick.el));
      el.dispatchEvent(new CustomEvent("applyfill:choose-found", { bubbles: true }));
      return true;
    }
    return false;
  }

  function bestOverlap(opts, want) {
    const wt = new Set(tokens(want).filter((t) => !/^(university|college|institute|school|the|of|and|at)$/.test(t)));
    let top = null;
    let topHit = 0;
    for (const o of opts) {
      const hit = tokens(o.text).filter((t) => wt.has(t)).length;
      if (hit > topHit) { top = o; topHit = hit; }
    }
    return top;
  }

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function splitDate(v) {
    const m = String(v || "").match(/^(\d{1,2})\/(\d{4})$/);
    if (m) return { month: MONTHS[Number(m[1]) - 1], year: m[2] };
    const y = String(v || "").match(/\d{4}/);
    return { month: null, year: y ? y[0] : null };
  }

  async function fillGreenhouseEducation(entries) {
    if (!Array.isArray(entries) || !entries.length || !document.getElementById("school--0")) return;
    for (let i = 0; i < entries.length; i++) {
      let school = document.getElementById(`school--${i}`);
      if (!school) {
        const add = [...document.querySelectorAll("button, a")].filter(visible)
          .find((b) => /^add another$/i.test(clean(b.innerText)) && b.closest("fieldset, div")?.querySelector('[id^="school--"]'));
        if (!add) break;
        add.click();
        school = await waitFor(() => document.getElementById(`school--${i}`), 2000);
        if (!school) break;
      }
      const e = entries[i];
      const shown = (id) => clean(document.getElementById(id)?.closest('[class*="select__control"]')?.querySelector('[class*="single-value"]')?.innerText || "");
      if (shown(`school--${i}`)) continue;
      const words = (s) => clean(s).split(" ").filter((w) => w.length > 3);
      const steps = [
        [`school--${i}`, "school", e.school, [e.school, words(e.school).slice(0, 2).join(" "), words(e.school)[0]]],
        [`degree--${i}`, "degree", e.degree, ["", e.degree]],
        [`discipline--${i}`, "discipline", e.field, [e.field, e.field_alt, ...words(e.field), ...words(e.field_alt)], e.field_alt],
      ];
      for (const [id, key, want, queries, alt] of steps) {
        const el = document.getElementById(id);
        if (!el || !want || shown(id)) continue;
        done.add(el);
        if (await searchCombobox(el, [...new Set(queries.filter((q) => q != null))], key, want, alt)) { mark(el, true); filled++; } else noteMissing(el, key);
        await sleep(200);
      }
      for (const [side, v] of [["start", e.from], ["end", e.current ? null : e.to]]) {
        const { month, year } = splitDate(v);
        const mEl = document.getElementById(`${side}-month--${i}`);
        const yEl = document.getElementById(`${side}-year--${i}`);
        if (mEl) done.add(mEl);
        if (yEl) done.add(yEl);
        if (month && mEl && !shown(mEl.id) && viaBridge(mEl, month, null)) { mark(mEl, true); filled++; }
        if (year && yEl && !yEl.value) { setValue(yEl, year); mark(yEl, true); filled++; }
      }
    }
  }

  const isWorkday = /myworkday|workday/i.test(location.hostname) || !!document.querySelector('[data-automation-id^="formField-"]');
  if (isWorkday) {
    await fillEntries("Work Experience", /^job title/i, /school|university/i, WORK_FIELDS, values.experience, /currently work|i currently/i);
    await fillEntries("Education", /^(school|university|school or university)/i, /^job title/i, EDU_FIELDS, values.education, null);
    await fillWebsites([values.linkedin, values.github, values.website, values.scholar].filter(Boolean));
  }
  await fillGreenhouseEducation(values.education);

  for (let pass = 0; pass < 3; pass++) {
  if (pass) await sleep(500);
  const fields = [...document.querySelectorAll("input, textarea, select")];
  const fresh = fields.filter((el) => !done.has(el) && visible(el) && !["hidden", "submit", "button", "reset", "image", "password", "file", "search"].includes((el.type || "").toLowerCase()));
  if (pass && !fresh.length) break;

  for (const el of fields) {
    if (done.has(el)) continue;
    const type = (el.type || "").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image", "password", "file", "search"].includes(type)) continue;
    if (!visible(el)) continue;
    if (el.closest('[data-automation-id="multiselectInputContainer"]')) continue;
    if (/^dateSection/.test(el.getAttribute("data-automation-id") || "")) continue;
    if (el.getAttribute("aria-hidden") === "true" && el.tabIndex < 0) continue;
    if (/^(school|degree|discipline|start-month|start-year|end-month|end-year)--\d+$/.test(el.id)) continue;

    if (type === "radio" || type === "checkbox") {
      const group = el.name
        ? fields.filter((f) => f.type === el.type && f.name === el.name && (f.form === el.form))
        : [el];
      group.forEach((g) => done.add(g));
      const opts = group.map((g) => ({ el: g, text: ownLabel(g) || g.value }));
      const q = questionText(el, opts.map((o) => o.text));
      const single = group.length === 1 && type === "checkbox";
      if (single && !el.checked) {
        const ql = fieldLabel(el) || questionText(el, [ownLabel(el)]);
        const qk = keyFor(ql, null, null);
        const qw = qk && !BOOL_KEYS.has(qk) && wanted(qk);
        if (qw && score(ownLabel(el), qw, qk) >= 50) { el.click(); mark(el, true); filled++; continue; }
      }
      const key = keyFor(single ? ownLabel(el) || q : q, null, null);
      if (group.some((g) => g.checked)) continue;
      const want = key && wanted(key);
      if (!want) { noteMissing(el, single ? ownLabel(el) || q : q); continue; }
      if (single) {
        if (want === "Yes") { el.click(); mark(el, true); filled++; }
        continue;
      }
      const pick = bestOf(opts, key, want);
      if (pick) { pick.el.click(); mark(pick.el, true); filled++; } else noteMissing(el, q);
      continue;
    }

    done.add(el);
    const label = ownLabel(el) || (el.tagName !== "SELECT" ? "" : questionText(el, [...el.options].map((o) => o.text)));
    const fallbackQ = label ? "" : questionText(el);
    const q0 = label || fallbackQ;
    const key = /^if (yes|so)\b.*(explain|describe|provide|detail|specify)/i.test(q0)
      ? FOLLOWUP[previousQuestionKey(el)] || null
      : keyFor(label || (fallbackQ.length <= 200 ? fallbackQ : ""), nameHints(el), el);
    const want = key && (wanted(key) || (FALLBACKS[key] && FALLBACKS[key][0]));
    const shown = label || fallbackQ || nameHints(el);

    if (el.tagName === "SELECT") {
      if (el.value && el.selectedIndex > 0) continue;
      if (!want) { noteMissing(el, shown); continue; }
      const opts = [...el.options].filter((o) => o.value !== "").map((o) => ({ el: o, text: o.text }));
      const pick = bestOf(opts, key, want);
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
  }

  for (const btn of document.querySelectorAll('button[aria-haspopup="listbox"]')) {
    if (done.has(btn) || !visible(btn)) continue;
    done.add(btn);
    const label = fieldLabel(btn) || clean((btn.getAttribute("aria-label") || "").replace(btn.innerText, ""));
    const key = keyFor(label, btn.name ? btn.name.replace(/([a-z])([A-Z])/g, "$1 $2") : "", null);
    const want = key && wanted(key);
    if (!isPlaceholder(clean(btn.innerText))) continue;
    const req = /\bRequired\b/.test(btn.getAttribute("aria-label") || "") ? " *" : "";
    if (!want) { noteMissing(btn, label + req); continue; }
    const r = await fillListbox(btn, key, want);
    if (r === true) { mark(btn, true); filled++; } else if (r === false) noteMissing(btn, label + req);
  }

  for (const box of document.querySelectorAll('[data-automation-id="multiselectInputContainer"]')) {
    if (!visible(box)) continue;
    const label = fieldLabel(box);
    const key = keyFor(label, null, null);
    const want = key && wanted(key);
    if (!want) {
      if (!box.closest('[data-automation-id^="formField-"]')?.querySelector('[data-automation-id="selectedItem"]')) noteMissing(box.querySelector("input") || box, label);
      continue;
    }
    const r = await fillPrompt(box, key, want);
    if (r === true) { mark(box, true); filled++; } else if (r === false) noteMissing(box.querySelector("input") || box, label);
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
    const near = target && (target.f.closest('[data-automation-id^="formField-"], section') || target.f.parentElement?.parentElement?.parentElement);
    const already = near && /successfully uploaded|upload(ed)? successful/i.test(near.innerText || "");
    if (target && !target.f.files.length && !already) {
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
