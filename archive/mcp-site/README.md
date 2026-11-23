# MCP Hub — static multi-page site

An end-to-end static website about the **Model Context Protocol**. No build step, no
dependencies, no framework: open `index.html` in a browser and it works.

## Pages

| File | Page | What's on it |
|------|------|--------------|
| `index.html` | Home | Hero, the M×N problem, the three primitives, host/client/server flow, featured servers, use cases |
| `what-is-mcp.html` | What is MCP | Plain-language intro, comparison table vs. function calling, who it's for, glossary |
| `architecture.html` | Architecture | Participants, 6-step session lifecycle, JSON-RPC message examples, method table, transports, security boundaries |
| `servers.html` | Server directory | 18 server cards with live search + category filtering |
| `quickstart.html` | Quickstart | Connect a server, build one in Python and TypeScript, test with the Inspector, troubleshooting table |
| `tutorials.html` | Tutorials | 12 walkthroughs across a beginner → intermediate → advanced path |
| `blog.html` | Field notes | 8 self-contained practical notes |
| `faq.html` | FAQ | 15 questions in an accordion |
| `contact.html` | Contact | Validated form, submission guidelines, side column |

Shared assets: `assets/css/style.css` (design tokens + all components) and
`assets/js/main.js` (behaviour).

## Interactive features

All of it is progressive enhancement — every page is fully readable with JavaScript off.

- Sticky header with a mobile hamburger menu
- Current page auto-highlighted in the nav
- Copy-to-clipboard buttons on every code block
- Live search + category filter on the server directory, with a result count and empty state
- FAQ accordion
- Contact form with inline client-side validation
- Auto-updating copyright year

## Running it

Double-click `index.html`, or serve the folder:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes before publishing

- The contact form has **no backend** — it validates and shows a confirmation, but transmits
  nothing. Point it at your own endpoint or a form service to make it live.
- Contact addresses use the reserved `.example` domain. Replace them.
- Blog posts and tutorial listings are editorial content written for this site, not an archive
  of real published articles.
- The server directory is a curated sample of common server categories. Verify any server
  against its own source before installing it.
