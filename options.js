const SECTIONS = [
  ["Identity", [
    ["first_name", "First name"], ["last_name", "Last name"],
    ["full_name", "Full name"], ["preferred_name", "Preferred name"],
    ["email", "Email"], ["phone", "Phone"], ["pronouns", "Pronouns"],
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
    ["over_18", "At least 18 years old", "", "bool"],
    ["relocate", "Willing to relocate", "", "bool"],
    ["restriction", "Bound by a non-compete", "", "bool"],
    ["previously_employed", "Previously worked at the company", "", "bool"],
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
      input = document.createElement(kind === "area" ? "textarea" : "input");
      if (kind !== "area") input.type = "text";
      label.append(text, input);
    }
    input.name = key;
    grid.appendChild(label);
  }
  form.appendChild(grid);
}

function readForm() {
  const p = {};
  for (const el of form.elements) p[el.name] = el.type === "checkbox" ? el.checked : el.value.trim();
  return p;
}

function writeForm(p) {
  for (const el of form.elements) {
    if (!(el.name in p)) continue;
    if (el.type === "checkbox") el.checked = !!p[el.name];
    else el.value = p[el.name] ?? "";
  }
}

function showResume() {
  resumeName.textContent = resume ? `Saved: ${resume.name} (${Math.round(resume.data.length * 0.75 / 1024)} KB)` : "No resume saved.";
}

function flash(msg) {
  status.textContent = msg;
  setTimeout(() => (status.textContent = ""), 2500);
}

chrome.storage.local.get(["profile", "resume"]).then((s) => {
  writeForm(s.profile || { authorized_us: true, over_18: true });
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
  await chrome.storage.local.set({ profile: readForm(), resume });
  flash("Saved");
};

document.getElementById("import").onclick = () => document.getElementById("importFile").click();

document.getElementById("importFile").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    writeForm(data.profile || data);
    if (data.resume) { resume = data.resume; showResume(); }
    flash("Imported. Press Save to keep it.");
  } catch {
    flash("That file is not valid JSON.");
  }
  e.target.value = "";
};

document.getElementById("export").onclick = () => {
  const blob = new Blob([JSON.stringify({ profile: readForm(), resume }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "apply-fill-profile.json";
  a.click();
};
