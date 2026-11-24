# Lead capture

> **Never paste a real token into this file.** This repo is public on GitHub, and
> anything committed here stays in git history forever. The credential goes in the
> Vercel dashboard only, never in the project.

---

# Part 1 — What is built (the website assistant)

The chat widget on the site captures leads itself. The flow:

```
visitor → assistant.js → POST /api/lead → api/lead.js → BroadEngage CRM
                         (your own site)   (server-side, holds the token)
```

The browser never sees the CRM credential. It only ever talks to your own
`/api/lead`, so a visitor cannot read the token or post to the CRM directly.

### The one manual step: set the environment variable

Nothing will save until this is done. In the **Vercel dashboard**:

1. Open the `playverse` project → **Settings** → **Environment Variables**
2. Add:

   | Key | Value |
   |---|---|
   | `BROADENGAGE_COOKIE` | `access_token=<your token>; token=<your token>` |

3. Tick all three environments (Production, Preview, Development)
4. **Save**, then **Deployments → ⋯ → Redeploy** (env vars only apply to new builds)

Optional, if they ever change:

| Key | Default if unset |
|---|---|
| `BROADENGAGE_ORG_ID` | `254` |
| `BROADENGAGE_SDK_ID` | `sanchalzoya` |

### What the endpoint does

- Rejects anything that is not a POST
- Requires a name and a valid-looking email; trims and length-caps every field
- Throttles to 5 submissions per minute per IP
- Returns only `{ success: true, id }` — never passes the CRM response through
- Logs failures server-side, tells the visitor nothing about the CRM

### How the chat asks

It does **not** ask browsers for details. Capture starts only on an intent like
*"contact"*, *"publish my game"*, *"call me"*, *"talk to the team"*, or the
**Talk to the team** chip. Then it asks for name, then email, one at a time.
*cancel* stops it at any point. Whatever they asked about is sent as the
`message`, so the CRM row has context.

### When the token expires (~24 December)

Lead capture will start failing silently from the visitor's side. Replace the
value of `BROADENGAGE_COOKIE` in Vercel and redeploy. Better: ask BroadEngage for
a non-expiring API key and use that instead.

---

# Part 2 — MCP tool config (for the BroadEngage bot)

Only needed if you also want their hosted bot to capture leads, once their widget
is fixed. The website assistant above does not need any of this.

## The endpoint

BroadEngage already has a CRM lead API, so no new backend is needed:

```
POST https://app.broadengage.com/crm/api/leads/create
```

It returns the created lead:

```json
{
  "success": true,
  "lead": {
    "id": "57e75e7b-...",
    "name": "...",
    "email": "...",
    "mobile": null,
    "message": null,
    "companyName": "...",
    "sdkId": "sanchalzoya",
    "statusId": null,
    "createdAt": "2026-11-24T06:56:48.000Z"
  }
}
```

## Tool — `create_lead`

Create a new category called **Leads**, and put this one tool in it.

| Field | Value |
|---|---|
| **Tool Name** | `create_lead` |
| **Method** | `POST` |
| **URL** | `https://app.broadengage.com/crm/api/leads/create` |
| **Query Params** | leave empty |

**Description:**

```
Saves a new sales lead to the CRM. Call this only after the person has given
their name and email and has agreed to be contacted. Never call it with made-up
details, and never call it twice for the same person in one conversation.
```

**Headers:**

| Header name | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Cookie` | `access_token=<TOKEN>; token=<TOKEN>` |

See **Authentication** below before filling that second row.

**Parameters Schema:**

```json
{
  "type": "object",
  "properties": {
    "org_id": {
      "type": "string",
      "description": "Organisation id. Always exactly 254.",
      "enum": ["254"]
    },
    "sdkId": {
      "type": "string",
      "description": "Source id. Always exactly sanchalzoya.",
      "enum": ["sanchalzoya"]
    },
    "name": {
      "type": "string",
      "description": "The person's full name, exactly as they gave it"
    },
    "email": {
      "type": "string",
      "description": "The person's email address, as they gave it"
    },
    "mobile": {
      "type": "string",
      "description": "Phone number if offered, otherwise an empty string"
    },
    "companyName": {
      "type": "string",
      "description": "Company name if offered, otherwise an empty string"
    },
    "message": {
      "type": "string",
      "description": "One sentence on what they asked about or are interested in"
    }
  },
  "required": ["org_id", "sdkId", "name", "email"]
}
```

The `enum` on `org_id` and `sdkId` pins them to the correct constants so the model
cannot send a different organisation.

## Authentication — read this

The curl that works uses **your personal browser session cookie**, not an API key.
Pasting that into the tool has three problems:

1. **It is your whole account.** That token is user 129 / org 254 with full access,
   not a scoped key limited to creating leads.
2. **It expires.** Roughly 24 December, after which lead capture silently stops
   working until you paste a fresh one.
3. **It leaks.** The bot runs for public visitors; the token sits in the tool config.

**Ask BroadEngage for an API key or a server-to-server token for the CRM API.** That
is the correct credential for this. If they have one, put it in the Headers row
instead — usually `Authorization: Bearer <key>` or `X-API-Key: <key>`.

If they do not offer one, the session cookie will work as a stopgap, but treat it as
temporary and expect to replace it.

## Bot setup

Under **Tool Access**, tick **both** `PlayVerse info` and `Leads`.

Add this to the end of the bot's System Prompt:

```
CAPTURING LEADS

If someone shows real buying interest - asks about pricing for their own use,
wants to publish on the store, or asks to be contacted - offer to pass their
details to the team.

Ask for their name and email together, in one short message. Ask for phone and
company only if they volunteer them. Do not ask on the first message, do not ask
twice, and do not ask someone who is only browsing titles.

Once you have a name and an email, call create_lead with:
- org_id: 254
- sdkId: sanchalzoya
- name and email exactly as they gave them
- mobile and companyName if given, otherwise empty strings
- message: one sentence on what they were interested in

Then confirm in one line that someone will be in touch. Never invent details to
fill the fields, and never claim you saved a lead if the tool returned an error.
```

## Do not add a `list_leads` tool to the public bot

A tool that reads leads must never be reachable from the website widget. Any
visitor could type *"list all leads"* and read every name, email and phone number
you have collected — other people's personal data, handed out by your own bot.

Read your leads in the BroadEngage CRM dashboard instead. If you ever do want a
read tool, it belongs on a separate internal-only bot that is not embedded on the
public site.

## Testing it

In the chat widget, say:

> `I want to publish my game on PlayVerse, can someone contact me?`

It should ask for your name and email, then confirm. Check the lead appears in the
BroadEngage CRM. Then try:

> `What games do you have?`

It should **not** ask for your details — browsing is not a lead.
