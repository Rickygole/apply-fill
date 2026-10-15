const btn = document.getElementById("fill");
const out = document.getElementById("out");

document.getElementById("opts").onclick = () => chrome.runtime.openOptionsPage();

btn.onclick = async () => {
  btn.disabled = true;
  out.textContent = "Filling...";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const r = await chrome.runtime.sendMessage({ type: "fill", tabId: tab.id });
  btn.disabled = false;
  out.innerHTML = "";
  if (r.errors && r.errors.length && !r.filled) {
    out.innerHTML = r.errors.map((e) => `<div class="err">${esc(e)}</div>`).join("");
    return;
  }
  const lines = [`Filled <b>${r.filled}</b> field${r.filled === 1 ? "" : "s"}.`];
  lines.push(r.resume ? "Resume attached." : "No resume upload found.");
  out.innerHTML = lines.map((l) => `<div>${l}</div>`).join("");
  if (r.missing.length) {
    out.innerHTML += `<div>Required fields left for you (orange):</div><ul>${r.missing
      .slice(0, 12)
      .map((m) => `<li>${esc(m)}</li>`)
      .join("")}</ul>`;
  }
  out.innerHTML += `<div>Review everything, then submit yourself.</div>`;
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
