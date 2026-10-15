async function fillTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ["bridge.js"],
    world: "MAIN",
  }).catch(() => {});
  const runs = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ["filler.js"],
  });
  const total = { filled: 0, resume: false, missing: [], errors: [] };
  for (const r of runs) {
    const v = r.result;
    if (!v) continue;
    if (v.error) { total.errors.push(v.error); continue; }
    total.filled += v.filled;
    total.resume = total.resume || v.resume;
    total.missing.push(...v.missing);
  }
  total.errors = [...new Set(total.errors)];
  await chrome.action.setBadgeText({ tabId, text: total.filled ? String(total.filled) : "" });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#2e7d32" });
  return total;
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "fill") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) fillTab(tab.id).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type !== "fill") return;
  fillTab(msg.tabId).then(reply, (e) => reply({ errors: [String(e.message || e)] }));
  return true;
});
