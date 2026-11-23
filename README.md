# PlayVerse — a Play Store–style app & game store

A static storefront with **nested, drill-down navigation**: click a feature, its own page
opens; click something inside that page, its own page opens. No build step, no dependencies,
no `?id=` query strings — every screen is a real `.html` file you can point an endpoint at.

See **[SITEMAP.md](SITEMAP.md)** for the full page tree and how to add a title.

> Everything in the catalogue is **fictional** — invented titles, studios, ratings, reviews
> and news. Nothing installs, nothing downloads, and no payment form exists anywhere.

## Structure — 20 pages, 4 levels deep

```
index.html
├── games.html ──► kingdom-of-ash.html ──► kingdom-of-ash-reviews.html
│                  nebula-raiders.html ──► nebula-raiders-reviews.html
│                  mindfold.html       ──► mindfold-reviews.html
│                  pocket-racer.html   ──► pocket-racer-reviews.html
├── apps.html  ──► notewell.html       ──► notewell-reviews.html
│                  pulsefit.html       ──► pulsefit-reviews.html
├── charts.html        categories.html
├── library.html       news.html        support.html
```

**6 titles** (4 games + 2 apps), each with its own page and its own reviews page.

## Interactive features

Progressive enhancement — every page except the library reads fine with JavaScript off.

- **Light / dark theme** — follows your system, manual toggle in the top bar, choice remembered
- **Install to library** — saves to `localStorage`; the Library tab shows a live count and buttons stay in sync across the page
- **Library page** — renders from storage, removes items, clears all, shows an empty state
- **Browse filters** — category chips, text filter, sort by featured / rating / name
- **Review filters** — each reviews page filters by star rating and searches reviewer text, reusing the same filter engine
- **Chart tabs** — three ranked lists switched without a page load
- **Validated contact form**, toast notifications, auto-updating year

## Files

| Path | What it is |
|------|------------|
| `*.html` | 20 pages (see the tree above) |
| `404.html` | Shown for any address that does not exist; `http-server` serves it automatically |
| `assets/css/style.css` | Design tokens, light + dark, all components |
| `assets/js/main.js` | Theme, library, filters, chart tabs, form |
| `assets/js/catalog.js` | The 6-title catalogue — **only** used by the library page |
| `archive/` | The earlier MCP site, plus the old query-string `game.html` |

## Running it

Double-click `index.html`, or serve the folder:

```powershell
npx --yes http-server "C:\Users\Admin\Documents\GitHub\MCP website" -p 8788
```

## Before publishing

- The contact form validates but **sends nothing** — there is no backend.
- Contact addresses use the reserved `.example` domain. Replace them.
- Icons and screenshots are CSS gradients, not images, so the site makes zero external requests.
