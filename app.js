'use strict';

// ---------------- data ----------------
const REGIONS = {
  'Middle East': {
    'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Al Ain'],
    'Saudi Arabia': ['Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Mecca', 'Medina'],
    Qatar: ['Doha', 'Al Wakrah', 'Al Khor'],
    Kuwait: ['Kuwait City', 'Hawalli', 'Salmiya'],
    Bahrain: ['Manama', 'Muharraq'],
    Oman: ['Muscat', 'Salalah', 'Sohar'],
    Jordan: ['Amman', 'Irbid', 'Aqaba'],
    Lebanon: ['Beirut', 'Tripoli'],
    Iraq: ['Baghdad', 'Erbil', 'Basra'],
    Turkey: ['Istanbul', 'Ankara', 'Izmir', 'Antalya'],
    Egypt: ['Cairo', 'Alexandria', 'Giza'],
  },
  Europe: {
    'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Leeds', 'Liverpool', 'Edinburgh'],
    Germany: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf'],
    France: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse'],
    Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Malaga'],
    Italy: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence'],
    Netherlands: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
    Belgium: ['Brussels', 'Antwerp'],
    Sweden: ['Stockholm', 'Gothenburg', 'Malmö'],
    Norway: ['Oslo', 'Bergen'],
    Denmark: ['Copenhagen', 'Aarhus'],
    Finland: ['Helsinki'],
    Ireland: ['Dublin', 'Cork'],
    Switzerland: ['Zurich', 'Geneva', 'Basel'],
    Austria: ['Vienna', 'Salzburg'],
    Portugal: ['Lisbon', 'Porto'],
    Poland: ['Warsaw', 'Krakow'],
    Greece: ['Athens', 'Thessaloniki'],
  },
  'North America': {
    'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Dallas', 'San Francisco', 'Seattle', 'Boston', 'Atlanta', 'Las Vegas', 'Phoenix', 'Philadelphia', 'San Diego', 'Austin', 'Denver'],
    Canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Mississauga', 'Winnipeg'],
  },
};

const CATEGORIES = {
  restaurant: 'Restaurant', cafe: 'Cafe', bakery: 'Bakery', hotel: 'Hotel / Guest house',
  dentist: 'Dentist', clinic: 'Clinic / Doctor', pharmacy: 'Pharmacy', veterinary: 'Veterinary', optician: 'Optician',
  salon: 'Hair salon', beauty: 'Beauty / Spa', gym: 'Gym / Fitness',
  real_estate: 'Real estate', lawyer: 'Lawyer', accountant: 'Accountant', architect: 'Architect',
  construction: 'Construction', insurance: 'Insurance', it_company: 'IT company',
  car_repair: 'Car repair', car_dealer: 'Car dealer', clothes: 'Clothes shop', jewelry: 'Jewelry',
  furniture: 'Furniture', florist: 'Florist', travel_agency: 'Travel agency', photographer: 'Photographer', school: 'School / Training',
  fast_food: 'Fast food', bar_pub: 'Bar / Pub', nightclub: 'Nightclub', ice_cream: 'Ice cream / Sweets', supermarket: 'Supermarket / Grocery',
  butcher: 'Butcher', hospital: 'Hospital', physio: 'Physiotherapy', psychologist: 'Psychologist', hearing_aids: 'Hearing aids',
  massage: 'Massage', tattoo: 'Tattoo studio', laundry: 'Laundry / Dry cleaning', pet_shop: 'Pet shop', books: 'Bookshop',
  electronics: 'Electronics / Mobile', hardware: 'Hardware / DIY', garden: 'Garden centre', shoes: 'Shoe shop', tailor: 'Tailor',
  gallery: 'Art gallery', photo_studio: 'Photo studio', printing: 'Printing', bicycle: 'Bicycle shop', motorcycle: 'Motorcycle shop',
  car_wash: 'Car wash', tyres: 'Tyre shop', locksmith: 'Locksmith', plumber: 'Plumber', electrician: 'Electrician',
  carpenter: 'Carpenter', hvac: 'AC / Heating (HVAC)', painter: 'Painter', roofer: 'Roofer', advertising: 'Advertising agency',
  consulting: 'Consulting', tax_advisor: 'Tax / Finance advisor', notary: 'Notary', moving: 'Moving / Logistics', coworking: 'Coworking space',
  events_venue: 'Events / Wedding', hostel_apartment: 'Hostel / Apartment / Motel', sports_centre: 'Sports centre', kindergarten: 'Kindergarten',
};

const SERVICES = {
  wp_new: ['building a new WordPress website', 'بناء موقع ووردبريس جديد'],
  redesign: ['mobile-friendly redesign', 'إعادة تصميم متوافق مع الجوال'],
  speed: ['speed optimization', 'تسريع الموقع'],
  seo: ['SEO', 'تحسين محركات البحث SEO'],
  maint: ['maintenance & updates', 'الصيانة والتحديثات'],
  security: ['security & malware cleanup', 'الحماية وإزالة الاختراقات'],
  woo: ['WooCommerce online store', 'متجر إلكتروني WooCommerce'],
};

const ISSUE_TEXT = {
  en: {
    down: 'your website does not seem to load properly',
    no_https: 'the site is not secured with HTTPS (browsers show a "Not secure" warning)',
    no_viewport: 'the site is not mobile-friendly',
    slow: 'the site loads slowly',
    old_wp: 'it runs an outdated WordPress version, which can be a security risk',
    outdated_year: 'the design looks a bit dated',
    no_meta_desc: 'there is no search description, which hurts Google visibility',
    not_wp: 'it could be easier to manage on WordPress',
  },
  ar: {
    down: 'الموقع لا يعمل أو لا يفتح بشكل صحيح',
    no_https: 'الموقع غير مؤمّن (بدون HTTPS) وتظهر للزوار رسالة "غير آمن"',
    no_viewport: 'الموقع غير متوافق مع الجوال',
    slow: 'الموقع بطيء في التحميل',
    old_wp: 'إصدار ووردبريس قديم وقد يشكل خطراً أمنياً',
    outdated_year: 'التصميم يبدو قديماً',
    no_meta_desc: 'لا يوجد وصف لمحركات البحث مما يضعف الظهور في جوجل',
    not_wp: 'يمكن أن يكون الموقع أسهل في الإدارة على ووردبريس',
  },
};

const ISSUE_LABEL = {
  down: 'Site down', no_https: 'No HTTPS', no_viewport: 'Not mobile', slow: 'Slow', old_wp: 'Old WordPress',
  outdated_year: 'Dated', no_meta_desc: 'No SEO desc', not_wp: 'Not WordPress',
};

const DEFAULT_DOC = 'https://docs.google.com/document/d/1cZBSV1VnnoP6MTmvV-URuDMyOpk1wYxiNycOZodYj8Y/edit';
const DEFAULT_SIG = 'Abir Hossain\nWordPress Developer\nWhatsApp: +8801789025256';
let selIssues = new Set();

function renderIssueFilters(all) {
  const counts = {};
  all.forEach((l) => (l.issues || []).forEach((i) => (counts[i] = (counts[i] || 0) + 1)));
  const el = $('fIssues');
  $('fWrap').hidden = !Object.keys(counts).length;
  el.innerHTML = Object.keys(ISSUE_LABEL).filter((k) => counts[k])
    .map((k) => `<span class="chip${selIssues.has(k) ? ' on' : ''}" data-k="${k}">${esc(ISSUE_LABEL[k])} (${counts[k]})</span>`).join('');
  el.onclick = (e) => {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    selIssues.has(k) ? selIssues.delete(k) : selIssues.add(k);
    renderLeads();
  };
}

// ---------------- state ----------------
const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let settings = store.get('ls_settings', {});
const DEFAULTS = { owner: 'abirhoosain09', repo: 'leadscout', name: 'Abir Hossain' };
// this app always talks to this one repo, so a wrongly typed username/repo on a device can never break it
settings.owner = DEFAULTS.owner;
settings.repo = DEFAULTS.repo;
if (!settings.name) settings.name = DEFAULTS.name;
// a "setup link" (…#cfg=...) carries this device's settings to a new device
try {
  const m = location.hash.match(/cfg=([^&]+)/);
  if (m) {
    const cfg = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
    settings = { ...settings, ...cfg };
    store.set('ls_settings', settings);
    history.replaceState(null, '', location.pathname + location.search);
  }
} catch {}
let sent = store.get('ls_sent', {}); // leadKey -> {email:ts, wa:ts}
let selCats = new Set(store.get('ls_cats', ['restaurant']));
let selSvcs = new Set(store.get('ls_svcs', ['wp_new', 'redesign', 'speed', 'seo']));
let currentJob = null;
let defaultBranch = null;

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- tabs ----------------
document.querySelectorAll('nav button').forEach((b) => {
  b.onclick = () => showTab(b.dataset.tab);
});
function showTab(name) {
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((t) => (t.hidden = t.id !== 'tab-' + name));
  if (name === 'leads') loadJobList();
}

// ---------------- scan form ----------------
function fillSelect(sel, items, selected) {
  sel.innerHTML = items.map((i) => `<option${i === selected ? ' selected' : ''}>${esc(i)}</option>`).join('');
}
function onRegion() {
  fillSelect($('country'), Object.keys(REGIONS[$('region').value]));
  onCountry();
}
function onCountry() {
  const cities = REGIONS[$('region').value][$('country').value] || [];
  fillSelect($('city'), [...cities, 'Other city…']);
  onCity();
}
function onCity() {
  const other = $('city').value === 'Other city…';
  $('cityCustom').hidden = !other;
}
$('region').onchange = onRegion;
$('country').onchange = onCountry;
$('city').onchange = onCity;
fillSelect($('region'), Object.keys(REGIONS), store.get('ls_region', 'Middle East'));
onRegion();

function renderChips(el, map, selSet, key, label) {
  el.innerHTML = Object.keys(map)
    .map((k) => `<span class="chip${selSet.has(k) ? ' on' : ''}" data-k="${k}">${esc(label(map[k]))}</span>`)
    .join('');
  el.onclick = (e) => {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    selSet.has(k) ? selSet.delete(k) : selSet.add(k);
    e.target.classList.toggle('on');
    store.set(key, [...selSet]);
  };
}
renderChips($('cats'), CATEGORIES, selCats, 'ls_cats', (v) => v);
renderChips($('svcs'), SERVICES, selSvcs, 'ls_svcs', (v) => v[0].replace(/^./, (c) => c.toUpperCase()));
$('catAll').onclick = () => { Object.keys(CATEGORIES).forEach((k) => selCats.add(k)); store.set('ls_cats', [...selCats]); renderChips($('cats'), CATEGORIES, selCats, 'ls_cats', (v) => v); };
$('catNone').onclick = () => { selCats.clear(); store.set('ls_cats', []); renderChips($('cats'), CATEGORIES, selCats, 'ls_cats', (v) => v); };
$('lang').value = store.get('ls_lang', 'en');
$('lang').onchange = () => store.set('ls_lang', $('lang').value);

// ---------------- GitHub API ----------------
function needSettings() {
  return !settings.owner || !settings.repo;
}
const needToken = () => !settings.token;
async function gh(pathname, opts = {}, raw = false) {
  const call = (auth) =>
    fetch('https://api.github.com' + pathname, {
      ...opts,
      headers: {
        ...(auth ? { Authorization: 'Bearer ' + settings.token } : {}),
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.headers || {}),
      },
    });
  let r = await call(!!settings.token);
  // a wrong/expired token must not block reading a public repo: retry without it
  if (r.status === 401 && settings.token && (opts.method || 'GET') === 'GET') r = await call(false);
  return r;
}
const repoPath = () => `/repos/${settings.owner}/${settings.repo}`;

async function getBranch() {
  if (defaultBranch) return defaultBranch;
  const r = await gh(repoPath());
  if (!r.ok) throw new Error('Cannot open the repository (check username, repo name and token). Code ' + r.status);
  defaultBranch = (await r.json()).default_branch;
  return defaultBranch;
}

function setScanStatus(msg, err) {
  const el = $('scanStatus');
  el.textContent = msg;
  el.className = 'status' + (err ? ' err' : '');
}

$('scanBtn').onclick = async () => {
  if (needSettings() || needToken()) { showTab('settings'); $('saveStatus').textContent = 'Paste your GitHub token here (or open your setup link) to start scans.'; return; }
  const country = $('country').value;
  const city = $('city').value === 'Other city…' ? $('cityCustom').value.trim() : $('city').value;
  if (!city) return setScanStatus('Type a city name.', true);
  if (!selCats.size) return setScanStatus('Pick at least one business type.', true);
  store.set('ls_region', $('region').value);
  const jobId = new Date().toISOString().replace(/\D/g, '').slice(0, 14) + '-' + city.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12);
  const limit = Math.max(10, Math.min(100, parseInt($('limit').value, 10) || 100));
  $('scanBtn').disabled = true;
  try {
    setScanStatus('Starting scan…');
    const branch = await getBranch();
    const r = await gh(`${repoPath()}/actions/workflows/scan.yml/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: branch, inputs: { job_id: jobId, country, city, categories: [...selCats].join(','), limit: String(limit) } }),
    });
    if (r.status === 401) throw new Error('This device has a wrong or expired token (401). Open a fresh setup link or paste the token again in Settings.');
    if (r.status !== 204) {
      const t = await r.text();
      throw new Error('Could not start the scan (' + r.status + '). Check the token permissions and that Actions is enabled.\n' + t.slice(0, 200));
    }
    const t0 = Date.now();
    for (;;) {
      await new Promise((res) => setTimeout(res, 8000));
      const secs = Math.round((Date.now() - t0) / 1000);
      setScanStatus(`Scanning ${city}… ${secs}s (usually 2-10 minutes). You can leave this screen open.`);
      const jr = await gh(`${repoPath()}/contents/data/jobs/${jobId}.json?ref=${branch}&t=${Date.now()}`, {}, true);
      if (jr.status === 200) {
        const job = await jr.json();
        if (job.error) throw new Error(job.error);
        setScanStatus(`Done. ${job.count} leads (${job.withEmail} with email, ${job.withWhatsapp} with WhatsApp).`);
        store.set('ls_lastjob', jobId);
        currentJob = job;
        sendToSheet(job, false);
        showTab('leads');
        return;
      }
      if (Date.now() - t0 > 25 * 60 * 1000) throw new Error('Timed out. Check the Actions tab on GitHub.');
    }
  } catch (e) {
    setScanStatus(String(e.message || e), true);
  } finally {
    $('scanBtn').disabled = false;
  }
};

// ---------------- leads ----------------
async function loadJobList() {
  if (needSettings()) { $('list').innerHTML = '<div class="empty">Open Settings and connect GitHub first.</div>'; return; }
  try {
    const branch = await getBranch();
    const r = await gh(`${repoPath()}/contents/data/jobs?ref=${branch}&t=${Date.now()}`);
    if (!r.ok && r.status !== 404) {
      throw new Error(`Could not load the scan list (HTTP ${r.status}). ` + (r.status === 401 ? 'Your token is wrong or expired: open a fresh setup link.' : r.status === 403 ? 'GitHub limit reached or the token lacks permission. Try again in a few minutes.' : ''));
    }
    let files = r.ok ? (await r.json()).filter((f) => f.name.endsWith('.json')).map((f) => f.name.replace('.json', '')) : [];
    files.sort().reverse();
    const sel = $('jobSel');
    const want = (currentJob && currentJob.id) || files[0];
    sel.innerHTML = files.map((f) => `<option value="${esc(f)}"${f === want ? ' selected' : ''}>${esc(prettyJob(f))}</option>`).join('');
    if (!files.length) { $('list').innerHTML = '<div class="empty">No scans yet. Go to the Scan tab.</div>'; $('summary').textContent = ''; return; }
    await openJob(sel.value);
  } catch (e) {
    $('list').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}
function prettyJob(id) {
  const m = id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]} · ${id.split('-')[1] || ''}` : id;
}
$('jobSel').onchange = () => openJob($('jobSel').value);
$('refreshBtn').onclick = () => { currentJob = null; loadJobList(); };
$('updateBtn').onclick = async () => {
  $('saveStatus').textContent = 'Updating…';
  try {
    for (const k of await caches.keys()) await caches.delete(k);
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
    await Promise.all(['app.js', 'style.css', 'index.html', './'].map((f) => fetch(f, { cache: 'reload' }).catch(() => {})));
  } catch {}
  location.reload();
};
const APP_VERSION = '2026-11-20.9';
$('hdrInfo').textContent = 'v' + APP_VERSION;
['fEmail', 'fWa', 'fHide'].forEach((id) => ($(id).onchange = renderLeads));

async function openJob(id) {
  if (currentJob && currentJob.id === id) return renderLeads();
  $('list').innerHTML = '<div class="empty">Loading…</div>';
  const branch = await getBranch();
  const r = await gh(`${repoPath()}/contents/data/jobs/${id}.json?ref=${branch}&t=${Date.now()}`, {}, true);
  if (!r.ok) { $('list').innerHTML = '<div class="empty">Could not load this scan.</div>'; return; }
  currentJob = await r.json();
  store.set('ls_lastjob', id);
  renderLeads();
}

const leadKey = (l) => (currentJob ? currentJob.id : '') + ':' + l.id;

function buildMessage(l) {
  const lang = $('lang').value;
  const li = lang === 'ar' ? 1 : 0;
  const sig = settings.signature || DEFAULT_SIG;
  const doc = settings.site || DEFAULT_DOC;
  const list = (l.issues || []).filter((i) => i !== 'not_wp' || (l.issues || []).length === 1);
  const bullets = list.slice(0, 5).map((i) => '- ' + ISSUE_TEXT[lang][i]).join('\n');
  const svc = [...selSvcs].map((k) => SERVICES[k][li]).join(lang === 'ar' ? '، ' : ', ');

  if (lang === 'ar') {
    return `مرحباً فريق ${l.name}،

اطلعت على موقعكم (${l.host})${bullets ? ' ووجدت النقاط التالية:\n' + bullets : '، وأعتقد أنه يمكن تحسينه ليجلب لكم عملاء أكثر.'}

أنا مطوّر ووردبريس، ويمكنني إصلاح ذلك ومساعدتكم في: ${svc}.
جهزت ملفاً مختصراً يوضح كيف يمكن تحسين موقع مثل موقعكم: ${doc}
يسعدني إرسال تقرير مجاني عن موقعكم، بدون أي التزام.

بانتظار ردكم هنا.

مع التحية،
${sig}`;
  }
  return `Hi ${l.name} team,

I looked at your website (${l.host})${bullets ? ' and found:\n' + bullets : ' and think it could be doing more to bring you customers.'}

I'm a WordPress developer and I can fix this and help with: ${svc}.
Here is a short note on how I would improve a site like yours: ${doc}
Happy to send a free audit of your website, no obligation.

Let me know here, I'm waiting for your reply.

Best regards,
${sig}`;
}
function buildSubject(l) {
  return $('lang').value === 'ar' ? `فكرة سريعة لتحسين موقع ${l.name}` : `Quick idea for ${l.name}'s website`;
}

function renderLeads() {
  if (!currentJob) return;
  const fE = $('fEmail').checked, fW = $('fWa').checked, fH = $('fHide').checked;
  const all = currentJob.leads || [];
  renderIssueFilters(all);
  const leads = all.filter((l) => (!fE || l.email) && (!fW || l.whatsapp) && (!selIssues.size || (l.issues || []).some((i) => selIssues.has(i))) && !(fH && sent[leadKey(l)] && (sent[leadKey(l)].email || sent[leadKey(l)].wa)));
  $('summary').textContent = `${currentJob.city}, ${currentJob.country} · ${all.length} leads · ${currentJob.withEmail} email · ${currentJob.withWhatsapp} WhatsApp · showing ${leads.length}`;
  $('bulkBtn').hidden = !(settings.scriptUrl && settings.scriptSecret);
  $('sheetBtn').hidden = $('bulkBtn').hidden;
  if (!leads.length) { $('list').innerHTML = '<div class="empty">Nothing to show with these filters.</div>'; return; }

  $('list').innerHTML = leads.map((l, idx) => {
    const k = leadKey(l), s = sent[k] || {};
    const badges = (l.issues || []).map((i) => `<span class="badge bad">${esc(ISSUE_LABEL[i] || i)}</span>`).join('') +
      (l.checked === false ? '<span class="badge">Site not checked</span>' : `<span class="badge">${esc(l.platform || '')}</span>`) + (l.category ? `<span class="badge">${esc(CATEGORIES[l.category] || l.category)}</span>` : '');
    return `<div class="card lead${s.email || s.wa ? ' sent' : ''}" data-i="${idx}" data-k="${esc(k)}">
      <h3>${esc(l.name)}</h3>
      <div class="meta"><a href="${esc(l.website)}" target="_blank" rel="noopener">${esc(l.host)}</a>${l.address ? ' · ' + esc(l.address) : ''}</div>
      <div class="meta">${l.email ? '✉ ' + esc(l.email) : ''}${l.email && l.phone ? ' · ' : ''}${l.phone ? '☎ ' + esc(l.phone) : ''}</div>
      <div class="badges">${badges}</div>
      <details><summary>Message</summary><textarea>${esc(buildMessage(l))}</textarea></details>
      <div class="actions">
        ${l.email ? `<button class="mail${s.email ? ' done' : ''}" data-a="mail">${s.email ? '✓ Emailed' : 'Email'}</button>` : ''}
        ${l.whatsapp ? `<button class="wa${s.wa ? ' done' : ''}" data-a="wa">${s.wa ? '✓ WhatsApp' : 'WhatsApp' + (l.whatsappGuess ? ' (try)' : '')}</button>` : ''}
        <button data-a="copy">Copy</button>
        <button data-a="skip">Hide</button>
      </div>
    </div>`;
  }).join('');

  const shown = leads;
  $('list').querySelectorAll('.lead').forEach((card, i) => {
    const l = shown[i];
    const k = card.dataset.k;
    const text = () => card.querySelector('textarea').value;
    card.querySelector('.actions').onclick = (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (!a) return;
      if (a === 'mail') {
        const url = `mailto:${encodeURIComponent(l.email)}?subject=${encodeURIComponent(buildSubject(l))}&body=${encodeURIComponent(text())}`;
        if (isMobile) location.href = url;
        else window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(l.email)}&su=${encodeURIComponent(buildSubject(l))}&body=${encodeURIComponent(text())}`, '_blank');
        mark(k, 'email', e.target);
      } else if (a === 'wa') {
        window.open(`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(text())}`, '_blank');
        mark(k, 'wa', e.target);
      } else if (a === 'copy') {
        navigator.clipboard && navigator.clipboard.writeText(text());
        e.target.textContent = 'Copied';
      } else if (a === 'skip') {
        sent[k] = { ...(sent[k] || {}), skip: Date.now(), email: sent[k]?.email || Date.now() };
        store.set('ls_sent', sent);
        renderLeads();
      }
    };
  });
}
function mark(k, what, btn) {
  sent[k] = { ...(sent[k] || {}), [what]: Date.now() };
  store.set('ls_sent', sent);
  btn.classList.add('done');
  btn.textContent = what === 'email' ? '✓ Emailed' : '✓ WhatsApp';
}

// bulk email through the user's own Google Apps Script
$('bulkBtn').onclick = async () => {
  if (!currentJob) return;
  const todo = (currentJob.leads || []).filter((l) => l.email && !(sent[leadKey(l)] && sent[leadKey(l)].email)).slice(0, 100);
  if (!todo.length) return alert('No unsent emails in this scan.');
  if (!confirm(`Send ${todo.length} emails from your Gmail now?\nThey go out immediately and cannot be recalled.`)) return;
  const mails = todo.map((l) => ({ to: l.email, subject: buildSubject(l), body: buildMessage(l) }));
  try {
    await fetch(settings.scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: settings.scriptSecret, fromName: settings.name || '', mails }),
    });
    todo.forEach((l) => (sent[leadKey(l)] = { ...(sent[leadKey(l)] || {}), email: Date.now() }));
    store.set('ls_sent', sent);
    alert('Request sent. Sending takes ~2 seconds per email. Check your Gmail "Sent" folder to confirm.');
    renderLeads();
  } catch (e) {
    alert('Failed: ' + e.message);
  }
};

// save leads to the user's Google Sheet through their Apps Script
async function sendToSheet(job, manual) {
  if (!settings.scriptUrl || !settings.scriptSecret) {
    if (manual) alert('Add the Google Script URL and secret in Settings first.');
    return;
  }
  const rows = (job.leads || []).map((l) => ({
    date: (job.createdAt || '').slice(0, 10), city: job.city, country: job.country,
    category: CATEGORIES[l.category] || l.category || '', name: l.name, website: l.website, host: l.host,
    email: l.email || '', phone: l.phone || '', whatsapp: l.whatsapp || '',
    issues: (l.issues || []).map((i) => ISSUE_LABEL[i] || i).join(', '), platform: l.platform || '', score: l.score || 0,
  }));
  try {
    await fetch(settings.scriptUrl, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: settings.scriptSecret, action: 'sheet', rows }),
    });
    if (manual) alert(`Sent ${rows.length} leads to your Google Sheet. Open the sheet to check.`);
  } catch (e) {
    if (manual) alert('Failed: ' + e.message);
  }
}
$('sheetBtn').onclick = () => currentJob && sendToSheet(currentJob, true);

// ---------------- settings ----------------
function loadSettingsForm() {
  $('sOwner').value = settings.owner || '';
  $('sRepo').value = settings.repo || '';
  $('sToken').value = settings.token || '';
  $('sName').value = settings.name || '';
  $('sAgency').value = settings.agency || '';
  $('sSite').value = settings.site || DEFAULT_DOC;
  $('sSig').value = settings.signature || DEFAULT_SIG;
  $('sScript').value = settings.scriptUrl || '';
  $('sSecret').value = settings.scriptSecret || '';
}
$('saveBtn').onclick = () => {
  settings = {
    owner: DEFAULTS.owner, repo: DEFAULTS.repo, token: $('sToken').value.trim(),
    name: $('sName').value.trim(), agency: $('sAgency').value.trim(), site: $('sSite').value.trim(), signature: $('sSig').value.trim(),
    scriptUrl: $('sScript').value.trim(), scriptSecret: $('sSecret').value.trim(),
  };
  store.set('ls_settings', settings);
  defaultBranch = null;
  $('saveStatus').textContent = 'Saved on this device.';
};
$('linkBtn').onclick = async () => {
  const keys = ['token', 'name', 'signature', 'site', 'scriptUrl', 'scriptSecret'];
  const cfg = {};
  keys.forEach((k) => { if (settings[k]) cfg[k] = settings[k]; });
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))).replace(/\+/g, '-').replace(/\//g, '_');
  const link = location.origin + location.pathname + '#cfg=' + b64;
  try {
    await navigator.clipboard.writeText(link);
    $('saveStatus').textContent = 'Setup link copied. It contains your token: send it only to yourself and open it once on the new device.';
  } catch {
    prompt('Copy this link (send only to yourself):', link);
  }
};
$('qrBtn').onclick = () => {
  const keys = ['token', 'name', 'signature', 'site', 'scriptUrl', 'scriptSecret'];
  const cfg = {};
  keys.forEach((k) => { if (settings[k]) cfg[k] = settings[k]; });
  if (!cfg.token) { $('saveStatus').textContent = 'Save your token in Settings first, then show the QR.'; return; }
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))).replace(/\+/g, '-').replace(/\//g, '_');
  const link = location.origin + location.pathname + '#cfg=' + b64;
  try {
    const q = qrcode(0, 'L');
    q.addData(link);
    q.make();
    $('qrBox').innerHTML = '<img alt="Setup QR" style="width:100%;max-width:320px;background:#fff;padding:8px;border-radius:12px" src="' + q.createDataURL(6, 4) + '"><p class="hint">Scan with the phone camera and open the link. Do not share or screenshot this QR: it contains your token.</p>';
  } catch (e) {
    $('qrBox').textContent = 'Could not make the QR: ' + e.message;
  }
};
loadSettingsForm();
if (needToken()) setScanStatus('This device is not connected yet: open your setup link, or add the token in Settings. You can still view saved leads.');

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
