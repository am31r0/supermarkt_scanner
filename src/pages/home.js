/* ---------------- Renderer ---------------- */
export async function renderHomePage(mount) {

  mount.innerHTML = `

    <div class="page-header"><h1>Slim Boodschappen</h1><h3 style="font-size:0.6rem">Alpha Build 0.3.251002.1</h3></div>

    <main class="hero">
      <section class="hero__content">
        <h1>Vind altijd de beste prijs</h1>
        <p>Vergelijk supermarkten en bespaar geld op je boodschappenlijst.</p>
        <a href="#/search" class="btn btn--primary">Start zoeken</a>
      </section>
    </main>


    <footer class="footer">
      <p>&copy; 2025 Supermarkt Scanner — Alle rechten voorbehouden</p>
    </footer>
  `;

}
