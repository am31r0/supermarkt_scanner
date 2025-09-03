// src/app/router.js
export function createRouter({ routes, mountEl }) {
  let firstRenderDone = false;
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  function getRenderer() {
    const hash = window.location.hash || "#/home";
    return (
      routes[hash] ||
      routes["#/home"] ||
      ((el) => (el.innerHTML = "<div style='padding:2rem'>Home</div>"))
    );
  }

  function animateOut() {
    if (reduceMotion || !firstRenderDone) return Promise.resolve();
    return new Promise((resolve) => {
      const cleanup = () => {
        mountEl.removeEventListener("transitionend", onEnd);
        clearTimeout(fallback);
        resolve();
      };
      const onEnd = (e) => {
        if (e.target === mountEl) cleanup();
      };
      // fallback voor browsers zonder transitionend of bij korte inhoud
      const fallback = setTimeout(cleanup, 450);

      requestAnimationFrame(() => {
        mountEl.classList.add("out"); // triggert fade/slide out
        mountEl.addEventListener("transitionend", onEnd, { once: true });
      });
    });
  }

  function animateIn() {
    if (reduceMotion) return;
    // volgende frame terug naar normaal (fade/slide in)
    requestAnimationFrame(() => mountEl.classList.remove("out"));
  }

  async function resolve() {
    const render = getRenderer();
    await animateOut(); // 1) out
    render(mountEl); // 2) content wisselen
    mountEl.scrollTop = 0; // optioneel: naar boven van de nieuwe view
    animateIn(); // 3) in
    firstRenderDone = true;
  }

  window.addEventListener("hashchange", resolve);
  // eerste render zonder 'out' animatie
  getRenderer()(mountEl);
  animateIn();
  firstRenderDone = true;

  return {
    navigate: (to) => {
      window.location.hash = to;
    },
  };
}
