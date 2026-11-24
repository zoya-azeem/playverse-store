/* ==========================================================================
   POST /api/lead  -  Vercel serverless function

   Takes a lead from the website chat and forwards it to the BroadEngage CRM.

   The CRM credential lives in the BROADENGAGE_COOKIE environment variable,
   set in the Vercel dashboard. It is never sent to the browser and must never
   be committed to this repo.

   The browser only ever talks to this endpoint, so a visitor cannot see or
   reuse the credential, and cannot post to the CRM directly.
   ========================================================================== */

const CRM_URL = 'https://app.broadengage.com/crm/api/leads/create';
const ORG_ID = process.env.BROADENGAGE_ORG_ID || '254';
const SDK_ID = process.env.BROADENGAGE_SDK_ID || 'sanchalzoya';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Crude per-instance throttle. Not a real rate limiter - serverless instances
// come and go - but it blunts a script hammering the endpoint from one IP.
const recent = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function throttled(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 500) recent.clear();      // keep memory bounded
  return hits.length > MAX_PER_WINDOW;
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const cookie = process.env.BROADENGAGE_COOKIE;
  if (!cookie) {
    // Misconfiguration, not the visitor's fault - do not say why in public.
    console.error('BROADENGAGE_COOKIE is not set in the environment');
    return res.status(503).json({ error: 'Lead capture is not configured yet.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (throttled(ip)) {
    return res.status(429).json({ error: 'Too many submissions. Try again in a minute.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const mobile = clean(body.mobile, 40);
  const companyName = clean(body.companyName, 160);
  const message = clean(body.message, 500);

  if (!name) return res.status(400).json({ error: 'Please include a name.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'That email does not look right.' });

  try {
    const upstream = await fetch(CRM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Cookie': cookie
      },
      body: JSON.stringify({
        org_id: ORG_ID,
        sdkId: SDK_ID,
        name: name,
        email: email,
        mobile: mobile,
        message: message,
        companyName: companyName
      })
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      // Log the detail for us; tell the visitor nothing about the CRM.
      console.error('CRM rejected the lead', upstream.status, text.slice(0, 400));
      return res.status(502).json({ error: 'Could not save that just now. Please try again.' });
    }

    let data = safeParse(text) || {};
    // Return only what the page needs. Never pass the CRM payload straight through.
    return res.status(200).json({ success: true, id: (data.lead && data.lead.id) || null });
  } catch (err) {
    console.error('Lead forward failed', err && err.message);
    return res.status(502).json({ error: 'Could not save that just now. Please try again.' });
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
