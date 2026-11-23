# PlayVerse — page map (endpoints)

Every box below is a **real, separate `.html` file**. No `?id=` query strings anywhere —
click a feature, you land on its own URL.

```
index.html                      Home / For you
│
├── games.html                  Games        (4 titles)
│   ├── kingdom-of-ash.html     ──► kingdom-of-ash-reviews.html
│   ├── nebula-raiders.html     ──► nebula-raiders-reviews.html
│   ├── mindfold.html           ──► mindfold-reviews.html
│   └── pocket-racer.html       ──► pocket-racer-reviews.html
│
├── apps.html                   Apps         (2 titles)
│   ├── notewell.html           ──► notewell-reviews.html
│   └── pulsefit.html           ──► pulsefit-reviews.html
│
├── charts.html                 Top charts   (3 tabs: games / apps / trending)
├── categories.html             Categories
├── library.html                My library   (localStorage)
├── news.html                   News & updates
└── support.html                Support      (#faq #refunds #policy #publish #contact)

404.html                        Served automatically for any address that does not exist
```

**Nothing on the site is clickable unless the page behind it exists.** Categories only appear
once they have a title in them, and `categories.html` carries the complete page index.
Any old or mistyped URL lands on `404.html`, which `http-server` serves on its own.

**Depth is 4 levels:** Home → Games → Kingdom of Ash → its reviews.
That is the "feature inside a feature" pattern — each step is its own endpoint.

## All 20 endpoints

| # | File | Level | Parent |
|---|------|-------|--------|
| 1 | `index.html` | 1 | — |
| 2 | `games.html` | 2 | index |
| 3 | `apps.html` | 2 | index |
| 4 | `charts.html` | 2 | index |
| 5 | `categories.html` | 2 | index |
| 6 | `library.html` | 2 | index |
| 7 | `news.html` | 2 | index |
| 8 | `support.html` | 2 | index |
| 9 | `kingdom-of-ash.html` | 3 | games |
| 10 | `nebula-raiders.html` | 3 | games |
| 11 | `mindfold.html` | 3 | games |
| 12 | `pocket-racer.html` | 3 | games |
| 13 | `notewell.html` | 3 | apps |
| 14 | `pulsefit.html` | 3 | apps |
| 15 | `kingdom-of-ash-reviews.html` | 4 | kingdom-of-ash |
| 16 | `nebula-raiders-reviews.html` | 4 | nebula-raiders |
| 17 | `mindfold-reviews.html` | 4 | mindfold |
| 18 | `pocket-racer-reviews.html` | 4 | pocket-racer |
| 19 | `notewell-reviews.html` | 4 | notewell |
| 20 | `pulsefit-reviews.html` | 4 | pulsefit |

## Adding a new title

Three steps, all copy-paste:

1. Copy `mindfold.html` → `<your-id>.html` and edit the text.
2. Copy `mindfold-reviews.html` → `<your-id>-reviews.html` and edit the text.
3. Add one line to `assets/js/catalog.js`:

```js
{ id: "your-id", page: "your-id.html", name: "Your Title", dev: "Studio",
  cat: "Puzzle", type: "game", rating: 4.5, size: "80 MB", price: "Free",
  art: "art-6", letter: "Y" },
```

Then add a card on `games.html` (or `apps.html`) pointing at `your-id.html`.

`catalog.js` is only used by the **library page**, which renders whatever the visitor
installed. Every other page is plain static HTML, so you can wire real endpoints into it
however you like.
