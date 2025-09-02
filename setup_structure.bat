@echo off
REM === Supermarkt Scanner project structuur aanmaken ===
REM Run dit script vanuit de rootmap: supermarkt_scanner

echo [1/3] Mappen aanmaken...

REM Public
mkdir public
mkdir public\icons
mkdir public\images
mkdir public\mock-api

REM Src
mkdir src
mkdir src\pages
mkdir src\components
mkdir src\styles
mkdir src\scripts
mkdir src\scripts\services
mkdir src\scripts\services\adapters
mkdir src\scripts\ui
mkdir src\config

REM Dev
mkdir dev

echo [2/3] Bestanden aanmaken...

REM Public mock API voorbeeldbestanden
type nul > public\mock-api\products.json
type nul > public\mock-api\stores.json
type nul > public\mock-api\prices.json

REM Src pagina’s
type nul > src\index.html
type nul > src\pages\search.html
type nul > src\pages\prices.html
type nul > src\pages\deals.html
type nul > src\pages\settings.html

REM Src components
type nul > src\components\Navbar.html
type nul > src\components\Footer.html
type nul > src\components\StoreSelector.html
type nul > src\components\ItemRow.html
type nul > src\components\CartDrawer.html
type nul > src\components\Modal.html

REM Src styles
type nul > src\styles\base.css
type nul > src\styles\layout.css
type nul > src\styles\components.css
type nul > src\styles\pages.css

REM Src scripts
type nul > src\scripts\main.js
type nul > src\scripts\router.js
type nul > src\scripts\store.js
type nul > src\scripts\events.js
type nul > src\scripts\dom.js
type nul > src\scripts\telemetry.js

REM Src services
type nul > src\scripts\services\apiClient.js
type nul > src\scripts\services\schema.js
type nul > src\scripts\services\featureFlags.js
type nul > src\scripts\services\adapters\supermarktScanner.js
type nul > src\scripts\services\adapters\albertHeijn.js

REM Src UI
type nul > src\scripts\ui\mountNavbar.js
type nul > src\scripts\ui\mountStoreSelector.js
type nul > src\scripts\ui\mountCartDrawer.js
type nul > src\scripts\ui\mountModal.js

REM Config
type nul > src\config\app.config.json
type nul > src\config\endpoints.json
type nul > src\config\env.example.json

REM Dev
type nul > dev\server.js
type nul > dev\README.md

echo [3/3] Klaar! Structuur is aangemaakt.
pause
