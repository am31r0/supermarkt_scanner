export function renderHomePage(mount) {
  mount.innerHTML = `
    <!-- Hero Section -->
        <main class="hero">
            <section class="hero__content">
                <h1>Vind altijd de beste prijs</h1>
                <p>Vergelijk supermarkten en bespaar geld op je
                    boodschappenlijst.</p>
                <a href="#/search" class="btn btn--primary">Start zoeken</a>
            </section>
        </main>

        <!-- Feature Cards -->
        <section class="features">
            <article class="card">
                <h2>🔎 Slim zoeken</h2>
                <p>Zoek producten en merken met actuele prijzen.</p>
            </article>
            <article class="card">
                <h2>💰 Prijsvergelijking</h2>
                <p>Bekijk per supermarkt of gecombineerde mandjes.</p>
            </article>
            <article class="card">
                <h2>🔥 Aanbiedingen</h2>
                <p>Ontdek actuele acties en kortingen in één oogopslag.</p>
            </article>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <p>&copy; 2025 Supermarkt Scanner — Alle rechten voorbehouden</p>
        </footer>
  `;
}
