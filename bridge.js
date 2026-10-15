(() => {
  if (window.__applyFillBridge) return;
  window.__applyFillBridge = true;

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

  document.addEventListener("applyfill:choose", (e) => {
    const inst = instanceFor(e.target);
    const i = Number(e.target.getAttribute("data-applyfill-choose"));
    const o = inst && flat(inst.props.options)[i];
    if (o) inst.selectOption(o);
    e.target.removeAttribute("data-applyfill-choose");
  }, true);
})();
