const SECTIONS = [
  ["Identity", [
    ["first_name", "First name"], ["last_name", "Last name"],
    ["full_name", "Full name"], ["preferred_name", "Preferred name"],
    ["email", "Email"], ["phone", "Phone"], ["phone_type", "Phone type (e.g. Mobile)"], ["pronouns", "Pronouns"],
  ]],
  ["Address", [
    ["address_line1", "Street", "wide"], ["address_line2", "Line 2", "wide"],
    ["city", "City"], ["state", "State (e.g. MD)"], ["postal_code", "ZIP"], ["country", "Country"],
    ["location", "Location shown on forms (blank = City, ST)", "wide"],
  ]],
  ["Links", [
    ["linkedin", "LinkedIn"], ["github", "GitHub"], ["website", "Website"], ["scholar", "Google Scholar"],
  ]],
  ["Work and education", [
    ["current_employer", "Current employer"], ["current_title", "Current title"],
    ["school", "School"], ["degree", "Degree"], ["discipline", "Major / discipline"],
    ["graduation", "Graduation date"], ["years_experience", "Years of experience"],
    ["start_date", "Earliest start date"], ["notice_period", "Notice period"],
    ["salary", "Salary answer", "wide"], ["referral_source", "How did you hear about us", "wide"],
    ["why_interested", "Why are you interested (textarea default)", "wide", "area"],
  ]],
  ["Screening questions", [
    ["authorized_us", "Authorized to work in the US", "", "bool"],
    ["requires_sponsorship", "Requires visa sponsorship", "", "bool"],
    ["sponsorship_explanation", "If yes, please explain (sponsorship)", "wide"],
    ["over_18", "At least 18 years old", "", "bool"],
    ["relocate", "Willing to relocate", "", "bool"],
    ["restriction", "Bound by a non-compete", "", "bool"],
    ["previously_employed", "Previously worked at the company", "", "bool"],
    ["student", "Currently a student", "", "bool"],
    ["terminated", "Ever terminated or asked to resign", "", "bool"],
    ["relatives_at_company", "Relatives work at the company", "", "bool"],
    ["interviewed_before", "Interviewed or applied at the company before", "", "bool"],
    ["onsite_ok", "Open to working on site or hybrid", "", "bool"],
    ["accept_acknowledgements", "Answer yes to privacy notice and accuracy acknowledgements (never arbitration)", "", "bool"],
  ]],
  ["Work experience and education", [
    ["experience", "Work experience, newest first: [{title, company, location, from: \"MM/YYYY\", to, current, description}]", "wide", "json"],
    ["education", "Education: [{school, degree, field, field_alt, gpa, from: \"YYYY\", to}]", "wide", "json"],
  ]],
  ["Voluntary self-ID", [
    ["gender", "Gender"], ["race", "Race / ethnicity"],
    ["hispanic_latino", "Hispanic or Latino", "", "bool"],
    ["veteran_status", "Veteran status (exact wording)", "wide"],
    ["disability_status", "Disability status (exact wording)", "wide"],
  ]],
];

const form = document.getElementById("form");
const status = document.getElementById("status");
const resumeName = document.getElementById("resumeName");
let resume = null;
let hadProfile = false;

for (const [title, fields] of SECTIONS) {
  const h = document.createElement("h2");
  h.textContent = title;
  form.appendChild(h);
  const grid = document.createElement("div");
  grid.className = "grid";
  for (const [key, text, cls, kind] of fields) {
    const label = document.createElement("label");
    if (cls) label.className = cls;
    let input;
    if (kind === "bool") {
      label.className = "check";
      input = document.createElement("input");
      input.type = "checkbox";
      label.append(input, text);
    } else {
      input = document.createElement(kind === "area" || kind === "json" ? "textarea" : "input");
      if (kind === "json") { input.dataset.json = "1"; input.style.minHeight = "160px"; input.style.fontFamily = "ui-monospace, monospace"; input.style.fontSize = "12px"; }
      else if (kind !== "area") input.type = "text";
      label.append(text, input);
    }
    input.name = key;
    grid.appendChild(label);
  }
  form.appendChild(grid);
}

function readForm() {
  const p = {};
  for (const el of form.elements) {
    if (el.dataset.json) {
      const t = el.value.trim();
      p[el.name] = t ? JSON.parse(t) : [];
    } else p[el.name] = el.type === "checkbox" ? el.checked : el.value.trim();
  }
  return p;
}

function writeForm(p) {
  for (const el of form.elements) {
    if (!(el.name in p)) continue;
    if (el.type === "checkbox") el.checked = !!p[el.name];
    else if (el.dataset.json) el.value = p[el.name] && p[el.name].length ? JSON.stringify(p[el.name], null, 2) : "";
    else el.value = p[el.name] ?? "";
  }
}

function fillBlanks(p) {
  let n = 0;
  for (const el of form.elements) {
    if (!(el.name in p)) continue;
    if (el.type === "checkbox") {
      if (hadProfile) continue;
      el.checked = !!p[el.name];
    } else if (el.value.trim()) continue;
    else if (el.dataset.json) {
      if (!p[el.name] || !p[el.name].length) continue;
      el.value = JSON.stringify(p[el.name], null, 2);
    } else {
      if (p[el.name] == null || p[el.name] === "") continue;
      el.value = p[el.name];
    }
    n++;
  }
  return n;
}

function showResume() {
  resumeName.textContent = resume ? `Saved: ${resume.name} (${Math.round(resume.data.length * 0.75 / 1024)} KB)` : "No resume saved. You attach one on each application.";
}

function flash(msg) {
  status.textContent = msg;
  setTimeout(() => (status.textContent = ""), 2500);
}

const showButton = document.getElementById("showButton");
showButton.onchange = () => chrome.storage.local.set({ showButton: showButton.checked });

chrome.storage.local.get(["profile", "resume", "showButton"]).then((s) => {
  showButton.checked = s.showButton !== false;
  hadProfile = !!s.profile;
  writeForm({ authorized_us: true, over_18: true, onsite_ok: true, accept_acknowledgements: true, ...(s.profile || {}) });
  resume = s.resume || null;
  showResume();
});

document.getElementById("resumeFile").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    resume = { name: f.name, type: f.type, data: r.result.split(",")[1] };
    showResume();
  };
  r.readAsDataURL(f);
};

document.getElementById("save").onclick = async () => {
  let profile;
  try { profile = readForm(); } catch { flash("Experience or education is not valid JSON."); return; }
  await chrome.storage.local.set({ profile, resume });
  flash("Saved");
};

document.getElementById("clearResume").onclick = () => {
  resume = null;
  document.getElementById("resumeFile").value = "";
  showResume();
  flash("Resume removed. Press Save to keep it that way.");
};

document.getElementById("import").onclick = () => document.getElementById("importFile").click();

document.getElementById("importFile").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const n = fillBlanks(data.profile || data);
    if (data.resume && !resume) { resume = data.resume; showResume(); }
    flash(`Filled ${n} empty field${n === 1 ? "" : "s"}. Nothing you typed was changed. Press Save to keep it.`);
  } catch {
    flash("That file is not valid JSON.");
  }
  e.target.value = "";
};

document.getElementById("export").onclick = () => {
  let profile;
  try { profile = readForm(); } catch { flash("Experience or education is not valid JSON."); return; }
  const blob = new Blob([JSON.stringify({ profile, resume }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "apply-fill-profile.json";
  a.click();
};
