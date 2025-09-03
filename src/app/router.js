// Animated hash router met default route + active nav
export function createRouter({ routes, mountEl, defaultHash = "#/home" }) {
  let first = true;
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  function getRenderer() {
    const hash = window.location.hash || defaultHash;
    return (
      routes[hash] ||
      routes[defaultHash] ||
      ((el) => (el.innerHTML = "<div style='padding:2rem'>Home</div>"))
    );
  }

  function setActiveNav() {
    const current = window.location.hash || defaultHash;
    document.querySelectorAll(".nav-link").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === current);
    });
  }

  function animateOut() {
    if (reduceMotion || first) return Promise.resolve();
    return new Promise((resolve) => {
      const onEnd = (e) => {
        if (e.target === mountEl) {
          mountEl.removeEventListener("transitionend", onEnd);
          clearTimeout(fallback);
          resolve();
        }
      };
      const fallback = setTimeout(() => {
        mountEl.removeEventListener("transitionend", onEnd);
        resolve();
      }, 450);
      requestAnimationFrame(() => {
        mountEl.classList.add("out");
        mountEl.addEventListener("transitionend", onEnd);
      });
    });
  }

  function animateIn() {
    if (reduceMotion) return;
    requestAnimationFrame(() => mountEl.classList.remove("out"));
  }

  async function resolve() {
    const render = getRenderer();
    await animateOut();
    render(mountEl);
    setActiveNav();
    mountEl.scrollTop = 0;
    window.scrollTo(0, 0);
    animateIn();
    first = false;
  }

  function onHashChange() {
    resolve();
  }

  window.addEventListener("hashchange", onHashChange);

  function start() {
    if (!window.location.hash) {
      window.location.hash = defaultHash; // triggert hashchange -> resolve()
    } else {
      resolve(); // direct render voor deeplinks
    }
  }

  function navigate(to) {
    if (window.location.hash === to) resolve();
    else window.location.hash = to;
  }

  function destroy() {
    window.removeEventListener("hashchange", onHashChange);
  }

  return { start, navigate, destroy };
}
