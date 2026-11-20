// LeadScout scanner. Runs inside GitHub Actions (Node 20, no dependencies).
// Finds local businesses (OpenStreetMap), audits their websites, extracts public
// contact info, and writes data/jobs/<JOB_ID>.json for the app to read.
import fs from 'node:fs';
import path from 'node:path';

const env = process.env;
const COUNTRY = (env.COUNTRY || '').trim();
const CITY = (env.CITY || '').trim();
const CATS = (env.CATEGORIES || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIMIT = Math.min(parseInt(env.LIMIT || '100', 10) || 100, 100);
const JOB_ID = (env.JOB_ID || String(Date.now())).replace(/[^a-zA-Z0-9_-]/g, '');
const START = Date.now();
const MAX_RUNTIME_MS = 17 * 60 * 1000;

const API_UA = 'LeadScout/1.0 (personal lead research tool)';
const SITE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// category key -> OSM tag filters
const CATEGORIES = {
  restaurant: ['amenity=restaurant'],
  cafe: ['amenity=cafe'],
  bakery: ['shop=bakery'],
  hotel: ['tourism=hotel', 'tourism=guest_house'],
  dentist: ['amenity=dentist'],
  clinic: ['amenity=clinic', 'amenity=doctors'],
  pharmacy: ['amenity=pharmacy'],
  veterinary: ['amenity=veterinary'],
  optician: ['shop=optician'],
  salon: ['shop=hairdresser'],
  beauty: ['shop=beauty'],
  gym: ['leisure=fitness_centre'],
  real_estate: ['office=estate_agent'],
  lawyer: ['office=lawyer'],
  accountant: ['office=accountant'],
  architect: ['office=architect'],
  construction: ['office=construction_company'],
  insurance: ['office=insurance'],
  it_company: ['office=it'],
  car_repair: ['shop=car_repair'],
  car_dealer: ['shop=car'],
  clothes: ['shop=clothes'],
  jewelry: ['shop=jewelry'],
  furniture: ['shop=furniture'],
  florist: ['shop=florist'],
  travel_agency: ['shop=travel_agency'],
  photographer: ['craft=photographer'],
  school: ['amenity=school', 'amenity=language_school', 'amenity=driving_school'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiFetch(url, opts = {}, ms = 60000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal, headers: { 'User-Agent': API_UA, ...(opts.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

async function getText(url, ms = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': SITE_UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: ac.signal,
    });
    const ct = r.headers.get('content-type') || '';
    const text = !ct || ct.includes('html') || ct.includes('text') ? (await r.text()).slice(0, 600000) : '';
    return { ok: r.ok, status: r.status, url: r.url, text };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length).fill(null);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        try {
          out[k] = await fn(items[k]);
        } catch {
          out[k] = null;
        }
      }
    })
  );
  return out;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- discovery ----------
async function geocode() {
  const q = encodeURIComponent(`${CITY}, ${COUNTRY}`);
  const r = await apiFetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
    headers: { 'Accept-Language': 'en' },
  }, 25000);
  if (!r.ok) throw new Error('Geocoding failed (' + r.status + ')');
  const j = await r.json();
  if (!j.length) throw new Error(`City not found: ${CITY}, ${COUNTRY}`);
  const [s, n, w, e] = j[0].boundingbox.map(Number);
  return { s, w, n, e };
}

async function overpass(query) {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];
  let lastErr = 'unknown';
  for (let round = 0; round < 2; round++) {
    for (const ep of endpoints) {
      try {
        const r = await apiFetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
        }, 90000);
        if (r.ok) return await r.json();
        lastErr = ep + ' -> ' + r.status;
      } catch (e) {
        lastErr = ep + ' -> ' + e.message;
      }
      await sleep(2000);
    }
  }
  throw new Error('Overpass failed: ' + lastErr);
}

function buildQuery(bb, catKeys) {
  const box = `${bb.s},${bb.w},${bb.n},${bb.e}`;
  const parts = [];
  for (const key of catKeys) {
    for (const f of CATEGORIES[key] || []) {
      const [k, v] = f.split('=');
      parts.push(`nwr["${k}"="${v}"]["website"](${box});`);
      parts.push(`nwr["${k}"="${v}"]["contact:website"](${box});`);
    }
  }
  return `[out:json][timeout:80];(${parts.join('')});out center tags 1500;`;
}

function catOf(tags) {
  for (const [key, filters] of Object.entries(CATEGORIES)) {
    for (const f of filters) {
      const [k, v] = f.split('=');
      if (tags[k] === v) return key;
    }
  }
  return '';
}

function normUrl(u) {
  if (!u) return '';
  u = u.trim().split(/[;\s]/)[0];
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    return new URL(u).toString();
  } catch {
    return '';
  }
}

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function cleanPhone(p) {
  if (!p) return '';
  p = String(p).split(/[;,\/]/)[0].trim();
  let d = p.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  return d;
}

function waDigits(p) {
  const d = cleanPhone(p);
  if (!d.startsWith('+')) return '';
  const digits = d.slice(1);
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

// ---------- website audit ----------
const BAD_EXT = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ico|avif)$/i;
const BAD_DOM = /(sentry|wixpress|example\.|domain\.com|email\.com|yourdomain|godaddy|schema\.org|w3\.org|youremail|user@|name@)/i;

function findEmails(html) {
  const set = new Set();
  for (const m of html.matchAll(/mailto:([^"'?\s<>]+)/gi)) {
    try {
      set.add(decodeURIComponent(m[1]).toLowerCase().trim());
    } catch {}
  }
  for (const m of html.matchAll(/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi)) set.add(m[0].toLowerCase());
  return [...set].filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) && !BAD_EXT.test(e) && !BAD_DOM.test(e));
}

function pickEmail(emails, host) {
  if (!emails.length) return '';
  const root = host.split('.').slice(-2).join('.');
  const same = emails.filter((e) => e.endsWith('@' + host) || e.endsWith('.' + root) || e.endsWith('@' + root));
  const pool_ = same.length ? same : emails;
  const pref = pool_.find((e) => /^(info|contact|hello|office|mail|admin|sales|enquiries|support)@/.test(e));
  return pref || pool_[0];
}

function detectPlatform(html) {
  if (/wp-content|wp-includes|name=["']generator["'][^>]*WordPress/i.test(html)) return 'wordpress';
  if (/wixstatic\.com|wix\.com/i.test(html)) return 'wix';
  if (/squarespace/i.test(html)) return 'squarespace';
  if (/cdn\.shopify\.com/i.test(html)) return 'shopify';
  if (/webflow/i.test(html)) return 'webflow';
  return 'other';
}

async function audit(c) {
  if (Date.now() - START > MAX_RUNTIME_MS) return c;
  const host = hostOf(c.website);
  const t0 = Date.now();
  let page = null;
  let err = '';
  try {
    page = await getText(c.website);
  } catch (e) {
    err = String((e && e.cause && e.cause.code) || (e && e.name) || e);
  }
  const ms = Date.now() - t0;
  const issues = [];
  let checked = true;
  let html = '';
  let platform = 'other';
  let emails = [];

  if (!page) {
    // only a real DNS/connection failure counts as "down"; a timeout just means we could not tell
    if (/ENOTFOUND|ECONNREFUSED/.test(err)) issues.push('down');
    else if (/CERT|SSL|TLS/i.test(err)) issues.push('no_https');
    else checked = false;
  } else if (!page.ok) {
    // 404/410/5xx = broken page; 401/403/429/503 = usually a bot blocker, not a broken site
    if (page.status === 404 || page.status === 410 || (page.status >= 500 && page.status !== 503)) issues.push('down');
    else checked = false;
  } else if (page.text.length < 200) {
    checked = false;
  } else {
    html = page.text;
    platform = detectPlatform(html);
    if (page.url.startsWith('http://')) issues.push('no_https');
    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) issues.push('no_viewport');
    if (ms > 3500) issues.push('slow');
    const wp = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']WordPress\s*([\d.]+)/i);
    if (wp && parseFloat(wp[1]) < 6.0) issues.push('old_wp');
    const years = [...html.matchAll(/(?:©|&copy;|copyright)[^<]{0,40}?((?:19|20)\d{2})/gi)].map((m) => +m[1]);
    if (years.length && Math.max(...years) <= new Date().getFullYear() - 2) issues.push('outdated_year');
    if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html)) issues.push('no_meta_desc');
    if (platform !== 'wordpress') issues.push('not_wp');

    emails = findEmails(html);
    for (const m of html.matchAll(/wa\.me\/(\d{8,15})|[?&]phone=(\d{8,15})/gi)) {
      c.whatsapp = c.whatsapp || m[1] || m[2];
    }
    if (!c.phone) {
      const tel = html.match(/tel:([+\d][\d\s().-]{6,})/i);
      if (tel) c.phone = cleanPhone(tel[1]);
    }

    // look at up to 2 contact-like pages if no email yet
    if (!emails.length) {
      const links = new Set();
      for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
        if (/contact|kontakt|impressum|about|contacto|contatto|contactez|اتصل|تواصل/i.test(m[1])) {
          try {
            const u = new URL(m[1], page.url);
            if (hostOf(u.toString()) === host) links.add(u.toString());
          } catch {}
        }
      }
      for (const link of [...links].slice(0, 2)) {
        try {
          const p2 = await getText(link, 10000);
          if (p2.ok) {
            emails = emails.concat(findEmails(p2.text));
            for (const m of p2.text.matchAll(/wa\.me\/(\d{8,15})|[?&]phone=(\d{8,15})/gi)) {
              c.whatsapp = c.whatsapp || m[1] || m[2];
            }
            if (emails.length) break;
          }
        } catch {}
      }
    }
  }

  c.email = c.email || pickEmail(emails, host);
  if (c.whatsapp) {
    c.whatsapp = String(c.whatsapp).replace(/\D/g, '');
    c.whatsappGuess = false;
  } else {
    const d = waDigits(c.phone);
    c.whatsapp = d;
    c.whatsappGuess = !!d;
  }
  c.platform = platform;
  c.issues = issues;
  c.loadMs = ms;
  c.checked = checked;
  c.err = err || (page && !page.ok ? 'HTTP ' + page.status : '');

  const weights = { down: 5, no_https: 3, no_viewport: 3, old_wp: 3, slow: 2, outdated_year: 2, no_meta_desc: 1, not_wp: 1 };
  c.score =
    issues.reduce((a, k) => a + (weights[k] || 0), 0) + (c.email ? 3 : 0) + (c.whatsapp ? (c.whatsappGuess ? 1 : 2) : 0);
  return c;
}

// ---------- main ----------
function writeJob(obj) {
  fs.mkdirSync('data/jobs', { recursive: true });
  fs.writeFileSync(path.join('data/jobs', JOB_ID + '.json'), JSON.stringify(obj, null, 1));
}

async function main() {
  if (!COUNTRY || !CITY) throw new Error('City and country are required');
  const cats = CATS.filter((c) => CATEGORIES[c]);
  if (!cats.length) throw new Error('Pick at least one business type');

  console.log(`Scanning ${CITY}, ${COUNTRY} for: ${cats.join(', ')}`);
  const bb = await geocode();
  await sleep(1100);
  const data = await overpass(buildQuery(bb, cats));
  console.log('Overpass elements:', data.elements.length);

  let seen = [];
  try {
    seen = JSON.parse(fs.readFileSync('data/seen.json', 'utf8'));
  } catch {}
  const seenSet = new Set(seen);

  const byHost = new Map();
  for (const el of data.elements) {
    const t = el.tags || {};
    const website = normUrl(t.website || t['contact:website']);
    const host = hostOf(website);
    if (!t.name || !host || byHost.has(host) || seenSet.has(host)) continue;
    const addr = [t['addr:housenumber'], t['addr:street'], t['addr:city'] || t['addr:suburb']].filter(Boolean).join(' ');
    byHost.set(host, {
      id: `${el.type[0]}${el.id}`,
      name: t.name,
      category: catOf(t),
      website,
      host,
      address: addr,
      email: (t.email || t['contact:email'] || '').split(';')[0].trim().toLowerCase(),
      phone: cleanPhone(t.phone || t['contact:phone'] || t['contact:mobile']),
      whatsapp: waDigits(t['contact:whatsapp'] || ''),
    });
  }
  const candidates = shuffle([...byHost.values()]).slice(0, 320);
  console.log('Unseen candidates with websites:', candidates.length);

  const done = (await pool(candidates, 10, audit)).filter((c) => c && c.issues);
  const usable = done.filter((c) => c.email || c.phone || c.whatsapp);
  usable.sort((a, b) => b.score - a.score);
  const leads = usable.slice(0, LIMIT);

  for (const l of leads) seenSet.add(l.host);
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/seen.json', JSON.stringify([...seenSet].slice(-20000)));

  writeJob({
    id: JOB_ID,
    createdAt: new Date().toISOString(),
    country: COUNTRY,
    city: CITY,
    categories: cats,
    count: leads.length,
    withEmail: leads.filter((l) => l.email).length,
    withWhatsapp: leads.filter((l) => l.whatsapp).length,
    leads,
  });
  console.log(`Done. ${leads.length} leads saved.`);
}

main().catch((e) => {
  console.error(e);
  writeJob({ id: JOB_ID, createdAt: new Date().toISOString(), country: COUNTRY, city: CITY, error: String(e.message || e), leads: [] });
  process.exit(0); // still commit the error file so the app stops waiting
});
