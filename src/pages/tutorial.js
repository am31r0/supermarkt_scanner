// src/pages/tutorial.js
import { markTutorialShown } from "../lib/tutorialPopup.js";
import { showNav } from "../lib/utils.js"; // om nav te verbergen/tonen

export function renderTutorialPage(mount) {
  showNav(false); // nav verbergen zolang tutorial actief is

  mount.innerHTML = `
    <div class="tutorial-overlay">
      <div class="tutorial-wrapper">
        <div class="tutorial-pages">
          <div class="tutorial-page active">
            <p>Welkom bij<p>
            <h1 class="logo">Schappie</h1>
            <p class="welkom">
              Met deze app vergelijk je prijzen tussen verschillende supermarkten in één overzicht
              en kun je <orange>behoorlijk besparen!</orange>
            </p>
            <button class="tutorial-next btn small hidden">Volgende →</button>
          </div>

          <div class="tutorial-page">
            <h2>Zo werkt het</h2>
            <p>
              <br>Selecteer jouw winkels<br>
              <img src="./public/images/tutorial_storeSelector.webp" class="tutorial-img tutorial-selector">
              <br>Kies uit de lijst<br>of typ jouw product in de zoekbalk<br>
              <img src="./public/images/tutorial_zoekbalk.webp" class="tutorial-img tutorial-zoekbalk">
              <br>
            </p>
            <button class="tutorial-next btn small hidden">Volgende →</button>
          </div>

          <div class="tutorial-page">
            <h2>Zo werkt het</h2>
            <p>
              Gebruik filters<br>om jouw producten sneller te vinden<br>
              <img src="./public/images/tutorial_modalfilter.webp" class="tutorial-img tutorial-modalfilter">
            </p>
            <button class="tutorial-next btn small hidden">Volgende →</button>
          </div>

          <div class="tutorial-page">
            <h2>Klaar om te beginnen?</h2>
            <p>
              Je kunt deze uitleg later terugvinden in<br>
              <strong>Instellingen → Tutorial</strong><br>
              Veel plezier met <orange>besparen!</orange>
            </p>
            <button class="tutorial-finish btn small hidden">Begrepen</button>
          </div>
        </div>

        <div class="tutorial-pagination"></div>
      </div>
    </div>
  `;

  const pages = mount.querySelectorAll(".tutorial-page");
  const pagination = mount.querySelector(".tutorial-pagination");
  const nextBtns = mount.querySelectorAll(".tutorial-next");
  const finishBtn = mount.querySelector(".tutorial-finish");

  let current = 0;
  let showTimer = null;

  // === Pagination bolletjes ===
  pages.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot" + (i === 0 ? " active" : "");
    pagination.appendChild(dot);
  });
  const dots = pagination.querySelectorAll(".dot");

  function showButtonDelayed(pageIndex) {
    // Zoek de knop van de huidige pagina (next of finish)
    const btn =
      pages[pageIndex].querySelector(".tutorial-next") ||
      pages[pageIndex].querySelector(".tutorial-finish");

    if (!btn) return;
    btn.classList.add("hidden");

    clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      btn.classList.remove("hidden");
    }, 2200);
  }

  function goToPage(n) {
    clearTimeout(showTimer);

    pages[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = Math.max(0, Math.min(pages.length - 1, n));
    pages[current].classList.add("active");
    dots[current].classList.add("active");

    showButtonDelayed(current);
  }

  // Init: start delay voor eerste pagina
  showButtonDelayed(current);

  // === Navigatie ===
  nextBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (current < pages.length - 1) goToPage(current + 1);
    })
  );

  finishBtn.addEventListener("click", () => {
    if (finishBtn.classList.contains("hidden")) return; // prevent te vroeg klikken
    if (!sessionStorage.getItem("tutorialFromSettings")) {
      markTutorialShown();
    } else {
      sessionStorage.removeItem("tutorialFromSettings");
    }
    showNav(true);
    window.location.hash = "#/home";
  });
}
