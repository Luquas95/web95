# Lukas95

Vývojářské portfolio, které vypadá a chová se jako počítač s Windows 95.
Návštěvník uvidí plochu, otevírá okna, píše přes Outlook Express, čte bio
v Internet Exploreru a na konci počítač „vypne“.

Postaveno na čistém **HTML + CSS + TypeScriptu** (sestavení přes Vite), bez
frameworku a bez pluginů. Funguje v každém moderním prohlížeči na počítači
i na telefonu.

## Co umí

- **Plocha:** ikony Tento počítač, Outlook Express a Internet Explorer. Ikony
  se vybírají klepnutím nebo tažením obdélníku a posouvají tažením. Otevírají
  se poklepáním, na dotykovém displeji klepnutím. Kontextová nabídka umí
  Uspořádat ikony a Zarovnat ikony.
- **Okna:** přesun a změna velikosti s tečkovaným obrysem jako ve Win95.
  Minimalizace, maximalizace a obnovení s animací titulku, poklepání na
  titulek maximalizuje. Systémová nabídka je pod ikonou okna, modální dialogy
  blokují své vlastníky a jejich titulek při kliknutí na vlastníka zabliká.
- **Hlavní panel:** tlačítko Start, tlačítka oken, indikátor jazyka a hodiny.
  Když je panel prázdný, jede po něm nápověda „Click here to begin“.
- **Nabídka Start:** Programy, Dokumenty, Nastavení (včetně volby jazyka),
  Nápověda, Najít, GitHub a Vypnout.
- **Tento počítač:** složka s projekty. Zobrazení Velké ikony, Malé ikony,
  Seznam a Podrobnosti, dále stavový řádek a výběr.
- **Internet Explorer:** bio ve stylu webu z 90. let. Funguje Zpět, Vpřed,
  Zastavit, Obnovit, Domů, adresní řádek a Oblíbené. Ukázky projektů se
  otevírají v IE.
- **Outlook Express:** složky, uvítací zpráva a okno Nová zpráva. Zprávy se
  odesílají přes [Web3Forms](https://web3forms.com). Umí uložit koncept.
- **Najít:** hledá v celém obsahu webu podle názvu (i se zástupnými znaky
  `*` a `?`) nebo podle obsaženého textu.
- **Vypnout:** Vypnout, Restartovat, Režim MS-DOS a Odhlásit. Vypnutí končí
  obrazovkou „Nyní můžete počítač bezpečně vypnout“ a přesměrováním na
  DuckDuckGo.
- **Navíc:** úvodní obrazovka (BIOS a splash, jednou za relaci, dá se
  přeskočit), uvítací okno s tipy, Nápověda, příkazový řádek MS-DOS
  (`help`, `dir`, `type bio.txt`, `start ie`, …).
- **Dvojjazyčnost:** angličtina a čeština. Jazyk se vybírá automaticky podle
  prohlížeče a přepíná v liště nebo v nabídce Start > Nastavení > Jazyk.
- **Přístupnost:** ovládání klávesnicí (Ctrl+Esc, šipky, Enter, Esc,
  podtržené přístupové klávesy) a respektování `prefers-reduced-motion`.

Ikony jsou vlastní pixel-art v SVG, žádná grafika Microsoftu se nepoužívá.

## Vývoj

```bash
npm install
npm run dev          # vývojový server na http://localhost:5173
npm run typecheck    # kontrola typů
npm test             # jednotkové testy (Vitest)
npm run test:e2e     # testy v prohlížeči (Playwright, počítač + mobil)
npm run build        # produkční sestavení do dist/
```

Užitečné parametry URL: `?boot=0` (bez úvodní obrazovky), `?welcome=0`
(bez uvítacího okna), `?lang=cs` nebo `?lang=en`.

## Úpravy obsahu

| Co | Kde |
| --- | --- |
| Jméno, název systému, odkaz na GitHub, přesměrování po vypnutí | `src/config.ts` |
| Text bia (zatím zástupný) | `src/data/bio.ts` |
| Projekty ve složce Tento počítač | `src/data/projects.ts` |
| Texty rozhraní (EN/CS) | `src/core/strings.ts` |

**Přidání projektu:** stačí přidat záznam do `src/data/projects.ts`.
Projekt se sám objeví v Tento počítač, v Najít, v Oblíbených a v DOSovém
příkazu `projects`. Ukázky můžete dát i přímo do `public/demos/…` a odkazovat
na ně relativní cestou.

## Kontaktní formulář (Web3Forms)

1. Na https://web3forms.com si vytvořte bezplatný přístupový klíč pro svůj
   e-mail.
2. Lokálně: zkopírujte `.env.example` do `.env` a doplňte `VITE_WEB3FORMS_KEY`.
3. Na GitHubu: **Settings → Secrets and variables → Actions → New repository
   secret**, název `WEB3FORMS_KEY`.

Bez klíče Outlook Express slušně oznámí, že poštovní server zatím není
nastaven.

## Nasazení na GitHub Pages

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Pushnout do větve `main`. Workflow `.github/workflows/deploy.yml` web
   sestaví a nasadí.

Sestavení používá relativní cesty, takže funguje na `https://<uživatel>.github.io/<repozitář>/`
i na vlastní doméně.
