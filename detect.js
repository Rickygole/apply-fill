(() => {
  if (window.__applyFillDetect) return;
  window.__applyFillDetect = true;

  const ATS = /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|myworkday\.com|smartrecruiters\.com|icims\.com|jobvite\.com|bamboohr\.com|workable\.com|taleo\.net|successfactors\.|rippling\.com|dover\.com|breezy\.hr|recruitee\.com|teamtailor\.com|personio\.|jazzhr\.com|applytojob\.com|paylocity\.com|ultipro\.com|oraclecloud\.com|eightfold\.ai|wellfound\.com/i;
  const dismissKey = "applyfill-dismissed:" + location.host + location.pathname;

  let host = null;
  let shown = false;

  function looksLikeApplication() {
    const fields = [...document.querySelectorAll("input, textarea, select")].filter((el) => {
      const r = el.getBoundingClientRect();
      return el.type === "file" || (r.width > 0 && r.height > 0);
    });
    if (fields.length < 3) return false;
    const text = fields.map((el) => [
      el.name, el.id, el.placeholder, el.getAttribute("aria-label"), el.getAttribute("autocomplete"),
      ...(el.labels ? [...el.labels].map((l) => l.innerText) : []),
    ].join(" ")).join(" ").toLowerCase();
    const hits = [
      /first.?name|given.?name|full.?name|legal.?name/.test(text),
      /e.?mail/.test(text),
      /phone|mobile|\btel\b/.test(text),
      /resume|\bcv\b/.test(text) || fields.some((el) => el.type === "file"),
      /linkedin/.test(text),
    ].filter(Boolean).length;
    if (ATS.test(location.hostname)) return hits >= 2;
    return hits >= 3;
  }

  function build() {
    host = document.createElement("div");
    host.style.cssText = "all: initial; position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .wrap { font: 13px system-ui, sans-serif; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .row { display: flex; align-items: center; gap: 4px; }
        button.fill { font: 600 13px system-ui, sans-serif; color: #fff; background: #2e7d32; border: 0; border-radius: 22px; padding: 10px 16px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.22); }
        button.fill:hover { background: #276b2b; }
        button.fill:disabled { opacity: .7; cursor: default; }
        button.x { font: 14px system-ui, sans-serif; width: 24px; height: 24px; border-radius: 12px; border: 0; background: #fff; color: #555; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.18); }
        .msg { max-width: 260px; background: #fff; color: #1b1b1b; border-radius: 8px; padding: 8px 10px; box-shadow: 0 4px 14px rgba(0,0,0,.18); line-height: 1.4; display: none; }
        .msg.on { display: block; }
        .msg ul { margin: 4px 0 0; padding-left: 16px; color: #b45309; }
      </style>
      <div class="wrap">
        <div class="msg"></div>
        <div class="row"><button class="x" title="Hide on this page">&times;</button><button class="fill">Fill application</button></div>
      </div>`;
    const btn = root.querySelector(".fill");
    const msg = root.querySelector(".msg");
    root.querySelector(".x").onclick = () => {
      try { sessionStorage.setItem(dismissKey, "1"); } catch {}
      dismissed = true;
      host.remove();
    };
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = "Filling...";
      let r;
      try {
        r = await chrome.runtime.sendMessage({ type: "fill" });
      } catch {
        r = { errors: ["Extension was reloaded. Refresh this page."] };
      }
      btn.disabled = false;
      btn.textContent = "Fill again";
      msg.textContent = "";
      if (r.errors && r.errors.length && !r.filled) {
        msg.textContent = r.errors[0];
      } else {
        const head = document.createElement("div");
        head.textContent = `Filled ${r.filled} field${r.filled === 1 ? "" : "s"}${r.resume ? ", resume attached" : ""}. Review, then submit yourself.`;
        msg.appendChild(head);
        if (r.missing && r.missing.length) {
          const ul = document.createElement("ul");
          for (const m of r.missing.slice(0, 6)) {
            const li = document.createElement("li");
            li.textContent = m;
            ul.appendChild(li);
          }
          msg.appendChild(document.createTextNode("Left for you:"));
          msg.appendChild(ul);
        }
      }
      msg.classList.add("on");
      setTimeout(() => msg.classList.remove("on"), 9000);
    };
    document.documentElement.appendChild(host);
    shown = true;
  }

  async function check() {
    if (shown) return;
    try { if (sessionStorage.getItem(dismissKey)) return; } catch {}
    if (!looksLikeApplication()) return;
    const { showButton } = await chrome.storage.local.get("showButton");
    if (showButton === false || shown) return;
    build();
  }

  let timer = null;
  let dismissed = false;
  const observer = new MutationObserver(() => {
    if (dismissed) { observer.disconnect(); return; }
    if (shown) {
      if (!host.isConnected) document.documentElement.appendChild(host);
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(check, 600);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  check();
})();
