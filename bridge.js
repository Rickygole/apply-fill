(() => {
  if (window.__applyFillBridge) return;
  window.__applyFillBridge = true;

  const found = new WeakMap();

  function loaderFor(el) {
    const key = Object.keys(el).find((k) => k.startsWith("__reactFiber"));
    let f = key && el[key];
    for (let i = 0; f && i < 40; i++, f = f.return) {
      if (f.memoizedProps && typeof f.memoizedProps.loadOptions === "function") return f.memoizedProps.loadOptions;
    }
    return null;
  }

  function instanceFor(el) {
    const key = Object.keys(el).find((k) => k.startsWith("__reactFiber"));
    let f = key && el[key];
    for (let i = 0; f && i < 40; i++, f = f.return) {
      const s = f.stateNode;
      if (s && typeof s.selectOption === "function" && s.props) return s;
    }
    return null;
  }

  function flat(options) {
    return (options || []).flatMap((o) => (o && Array.isArray(o.options) ? o.options : [o]));
  }

  function label(inst, o) {
    try {
      return String(inst.props.getOptionLabel ? inst.props.getOptionLabel(o) : o.label);
    } catch {
      return String(o && o.label);
    }
  }

  document.addEventListener("applyfill:options", (e) => {
    const inst = instanceFor(e.target);
    const opts = inst ? flat(inst.props.options).map((o) => label(inst, o)) : [];
    e.target.setAttribute("data-applyfill-options", JSON.stringify(opts));
  }, true);

  document.addEventListener("applyfill:search", async (e) => {
    const el = e.target;
    const q = el.getAttribute("data-applyfill-query") || "";
    el.removeAttribute("data-applyfill-query");
    const inst = instanceFor(el);
    let opts = [];
    const load = loaderFor(el);
    try {
      if (load) {
        const r = await load(q, [], { page: 1 });
        opts = flat(Array.isArray(r) ? r : r && r.options);
      } else if (inst) opts = flat(inst.props.options);
    } catch {}
    found.set(el, opts);
    el.setAttribute("data-applyfill-found", JSON.stringify(opts.map((o) => (inst ? label(inst, o) : String(o.label)))));
  }, true);

  document.addEventListener("applyfill:choose-found", (e) => {
    const inst = instanceFor(e.target);
    const i = Number(e.target.getAttribute("data-applyfill-choose"));
    const o = (found.get(e.target) || [])[i];
    if (inst && o) inst.selectOption(o);
    e.target.removeAttribute("data-applyfill-choose");
  }, true);

  document.addEventListener("applyfill:choose", (e) => {
    const inst = instanceFor(e.target);
    const i = Number(e.target.getAttribute("data-applyfill-choose"));
    const o = inst && flat(inst.props.options)[i];
    if (o) inst.selectOption(o);
    e.target.removeAttribute("data-applyfill-choose");
  }, true);
})();
