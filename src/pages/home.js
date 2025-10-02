/* ---------------- Renderer ---------------- */
export async function renderHomePage(mount) {

  mount.innerHTML = `

    <div class="page-header header-logo" style=""><h1 class="logo">Schappie</h1><h3 style="font-size:0.6rem">Alpha Build 0.3.251002.2</h3></div>

    <div class="hero">
      <section class="hero__content">
        <h1>Vind altijd de beste prijs</h1>
        <p>Vergelijk supermarkten en bespaar geld op je boodschappenlijst.</p>
        <a href="#/list" class="btn btn--primary">Start zoeken</a>
      </section>
    </div>


    <footer class="footer">
      <p>&copy; 2025 Supermarkt Scanner — Alle rechten voorbehouden</p>
    </footer>
  `;

}
