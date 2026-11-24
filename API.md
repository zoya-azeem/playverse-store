# PlayVerse JSON API — for the MCP tools

The store is a static site, so this "API" is just JSON files served from `/api/`.
No server, no database, no build step — they deploy with the rest of the site.

**Base URL:** `https://playverse-store.vercel.app`
Replace it everywhere below with whatever your real deployed URL is.

## Endpoints

| Method | URL | Returns |
|---|---|---|
| GET | `/api/index.json` | What this API offers + the list of valid ids |
| GET | `/api/titles.json` | All 6 titles (games + apps) |
| GET | `/api/games.json` | The 4 games |
| GET | `/api/apps.json` | The 2 apps |
| GET | `/api/categories.json` | Each category and the title in it |
| GET | `/api/titles/{id}.json` | One title in full — description, tags, size, price |
| GET | `/api/reviews/{id}.json` | Reviews for one title |

**Valid `{id}` values:** `kingdom-of-ash`, `nebula-raiders`, `mindfold`, `pocket-racer`,
`notewell`, `pulsefit`

---

## MCP tools — copy these into the "Add Manually" form

### Tool 1 — list every title

| Field | Value |
|---|---|
| **Tool Name** | `list_titles` |
| **Description** | `Lists every game and app in the PlayVerse store with its rating, developer, category, size and price. Use this first when the user asks what is available, what games there are, or wants to browse or compare titles.` |
| **Method** | `GET` |
| **URL** | `https://playverse-store.vercel.app/api/titles.json` |
| **Headers** | leave empty |
| **Query Params** | leave empty |

Parameters Schema:

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### Tool 2 — get one title

| Field | Value |
|---|---|
| **Tool Name** | `get_title` |
| **Description** | `Fetches the full details of one PlayVerse title by its id: description, developer, category, rating, download size, price, content rating and tags. Use this after list_titles when the user asks about a specific game or app.` |
| **Method** | `GET` |
| **URL** | `https://playverse-store.vercel.app/api/titles/{id}.json` |
| **Headers** | leave empty |
| **Query Params** | leave empty |

Parameters Schema:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The title id, e.g. mindfold or kingdom-of-ash",
      "enum": [
        "kingdom-of-ash",
        "nebula-raiders",
        "mindfold",
        "pocket-racer",
        "notewell",
        "pulsefit"
      ]
    }
  },
  "required": ["id"]
}
```

### Tool 3 — get reviews for a title

| Field | Value |
|---|---|
| **Tool Name** | `get_title_reviews` |
| **Description** | `Returns user reviews for one PlayVerse title: star rating, date, review text and how many people found it helpful. Use this when the user asks what people think of a title, whether it is good, or about complaints.` |
| **Method** | `GET` |
| **URL** | `https://playverse-store.vercel.app/api/reviews/{id}.json` |
| **Headers** | leave empty |
| **Query Params** | leave empty |

Parameters Schema:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The title id to fetch reviews for",
      "enum": [
        "kingdom-of-ash",
        "nebula-raiders",
        "mindfold",
        "pocket-racer",
        "notewell",
        "pulsefit"
      ]
    }
  },
  "required": ["id"]
}
```

### Tool 4 (optional) — games only

| Field | Value |
|---|---|
| **Tool Name** | `list_games` |
| **Description** | `Lists only the games in the PlayVerse store, excluding apps. Use when the user specifically asks about games rather than apps.` |
| **Method** | `GET` |
| **URL** | `https://playverse-store.vercel.app/api/games.json` |

Same empty schema as Tool 1. Swap the URL for `/api/apps.json` to make a `list_apps` tool.

---

## Notes

- Everything is **GET** and read-only. No API key, no auth header, no rate limit.
- Headers and Query Params stay empty — the id travels in the URL path as `{id}`.
- `required` matters: without it the model may call `get_title` with no id and get a 404.
- The `enum` is what stops the model inventing an id that does not exist.
- Adding a title means adding its JSON files under `/api/` and extending the two `enum`
  lists above.

## Regenerating

The JSON is generated, not hand-written. If you change the catalogue, regenerate rather than
editing 18 files by hand — ask Claude to re-run the generator, or edit the files directly if
it is a one-off tweak.
