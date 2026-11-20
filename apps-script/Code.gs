// LeadScout Google Sheet + Gmail helper. Runs in YOUR Google account (free).
// Setup: create a Google Sheet, open Extensions > Apps Script, paste this file, set SECRET and SENDER_NAME below,
// then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Approve the permission screen.
// Paste the Web app URL and the SECRET into the LeadScout app > Settings.
//
// What it does
// - Every day gets its own tab (named 2026-11-20) with that day's leads, newest day on the left.
// - Each row has a tick box, a WhatsApp link and a "Send email" link (preview, then confirm).
// - Links in row 1 of each tab:
//     All / None            tick or untick every row
//     Send SELECTED emails  emails every ticked row (asks to confirm first)
//     WhatsApp queue        shows the ticked leads one by one: tap to open WhatsApp, then "next"
//     Send ALL New emails   emails every row whose Status is "New" (asks to confirm first)
// - Status dropdown: New, Emailed, WhatsApp sent, Replied, Won, Not interested.
// Free Gmail allows about 100 emails per day through scripts.

const SECRET = 'CHANGE-ME-TO-A-LONG-RANDOM-TEXT';
const SPREADSHEET_ID = ''; // leave empty when the script is attached to the sheet
const WEBAPP_URL = ''; // leave empty to detect automatically
const SENDER_NAME = 'Your Name';
const DAILY_EMAIL_CAP = 100;

const HEADERS = ['Select', 'Date', 'City', 'Country', 'Type', 'Name', 'Website', 'Email', 'Phone', 'WhatsApp', 'Send email', 'Problems', 'Platform', 'Score', 'Status', 'Notes', 'Subject', 'Message'];
const STATUSES = ['New', 'Emailed', 'WhatsApp sent', 'Replied', 'Won', 'Not interested'];
const COL = { SELECT: 1, NAME: 6, WEBSITE: 7, EMAIL: 8, WA: 10, STATUS: 15, NOTES: 16, SUBJECT: 17, MESSAGE: 18 };
const FIRST_ROW = 3;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
function baseUrl_() {
  return WEBAPP_URL || ScriptApp.getService().getUrl();
}
function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function stamp_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}
function isDayTab_(sh) {
  return /^\d{4}-\d{2}-\d{2}$/.test(sh.getName());
}
function hostOf_(u) {
  return String(u || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
}
function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- entry points ----------
function doPost(e) {
  let out = { ok: false };
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) throw new Error('bad secret');
    if (body.action === 'sheet') out = addRows_(body.rows || []);
    else out = sendMails_(body);
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.secret !== SECRET) return page_('<p>Not allowed.</p>');
  try {
    if (p.action === 'email') return emailPage_(p);
    if (p.action === 'bulk') return bulkPage_(p, false);
    if (p.action === 'bulkSel') return bulkPage_(p, true);
    if (p.action === 'select') return selectPage_(p);
    if (p.action === 'waq') return waqPage_(p);
  } catch (err) {
    return page_('<p>Error: ' + esc_(String(err)) + '</p>');
  }
  return page_('<p>LeadScout is running.</p>');
}

// ---------- sheet ----------
function dayTab_(day) {
  const ss = ss_();
  let sh = ss.getSheetByName(day);
  if (sh && String(sh.getRange(2, 1).getValue()) !== 'Select') {
    // older layout: keep it as an archive and start a fresh tab
    try { sh.setName(day + ' (old)'); } catch (err) { sh.setName(day + ' (old ' + stamp_() + ')'); }
    sh = null;
  }
  if (sh) return sh;
  const oldAll = ss.getSheetByName('Leads');
  if (oldAll) {
    try { oldAll.setName('Old leads'); } catch (err) {}
  }
  sh = ss.insertSheet(day, 0);
  const b = baseUrl_() + '?secret=' + SECRET + '&tab=' + day + '&action=';
  [
    [1, '☑ All', 'select&mode=all'],
    [2, '☐ None', 'select&mode=none'],
    [3, '✉ Send SELECTED emails', 'bulkSel'],
    [6, '💬 WhatsApp queue (SELECTED)', 'waq'],
    [8, '✉ Send ALL New emails', 'bulk'],
  ].forEach((c) => {
    sh.getRange(1, c[0]).setFormula('=HYPERLINK("' + b + c[2] + '","' + c[1] + '")').setFontWeight('bold').setFontColor('#1d4ed8');
  });
  sh.getRange(1, 12).setValue('Tick rows, then use the links. WhatsApp / Send email links work per row.');
  sh.getRange(2, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  sh.setFrozenRows(2);
  [[1, 80], [2, 90], [6, 200], [7, 220], [8, 220], [12, 240]].forEach((w) => sh.setColumnWidth(w[0], w[1]));
  sh.hideColumns(COL.SUBJECT, 2);
  return sh;
}

function addRows_(rows) {
  const have = new Set();
  ss_().getSheets().filter(isDayTab_).forEach((sh) => {
    const n = sh.getLastRow();
    if (n >= FIRST_ROW && String(sh.getRange(2, 1).getValue()) === 'Select') {
      sh.getRange(FIRST_ROW, COL.WEBSITE, n - FIRST_ROW + 1, 2).getValues().forEach((r) => {
        have.add('h:' + hostOf_(r[0]));
        if (r[1]) have.add('e:' + String(r[1]).toLowerCase());
      });
    }
  });
  const byDay = {};
  rows.forEach((r) => {
    const h = r.host || hostOf_(r.website);
    const em = r.email ? 'e:' + String(r.email).toLowerCase() : '';
    if (!h || have.has('h:' + h) || (em && have.has(em))) return; // same website or same email = same business
    have.add('h:' + h);
    if (em) have.add(em);
    const day = r.date || today_();
    (byDay[day] = byDay[day] || []).push(r);
  });
  const base = baseUrl_();
  let added = 0;
  Object.keys(byDay).forEach((day) => {
    const sh = dayTab_(day);
    const list = byDay[day];
    const start = Math.max(sh.getLastRow() + 1, FIRST_ROW);
    const values = list.map((r, i) => {
      const row = start + i;
      const wa = r.whatsapp ? String(r.whatsapp).replace(/\D/g, '') : '';
      return [
        false, day, r.city, r.country, r.category, r.name, r.website, r.email, r.phone,
        wa ? '=HYPERLINK("https://wa.me/' + wa + '?text="&ENCODEURL(R' + row + '),"WhatsApp")' : '',
        r.email ? '=HYPERLINK("' + base + '?action=email&tab=' + day + '&secret=' + SECRET + '&row="&ROW(),"Send email")' : '',
        r.issues, r.platform, r.score, 'New', '', r.subject || '', r.message || '',
      ];
    });
    sh.getRange(start, 1, values.length, HEADERS.length).setValues(values);
    sh.getRange(start, COL.SELECT, values.length, 1).insertCheckboxes();
    sh.getRange(start, COL.STATUS, values.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build()
    );
    added += values.length;
  });
  return { ok: true, added: added };
}

function readRows_(sh) {
  const n = sh.getLastRow();
  if (n < FIRST_ROW) return [];
  const count = n - FIRST_ROW + 1;
  const vals = sh.getRange(FIRST_ROW, 1, count, HEADERS.length).getValues();
  const forms = sh.getRange(FIRST_ROW, COL.WA, count, 1).getFormulas();
  return vals.map((v, i) => ({
    row: FIRST_ROW + i,
    v: v,
    wa: (String(forms[i][0]).match(/wa\.me\/(\d+)/) || [])[1] || '',
  }));
}

// ---------- sending ----------
function takeQuota_(n) {
  const props = PropertiesService.getScriptProperties();
  const today = today_();
  const used = props.getProperty('day') === today ? Number(props.getProperty('used') || 0) : 0;
  if (used + n > DAILY_EMAIL_CAP) return false;
  props.setProperty('day', today);
  props.setProperty('used', String(used + n));
  return true;
}

// used by the LeadScout app's own "Send all emails now" button
function sendMails_(body) {
  let sent = 0;
  for (const m of body.mails || []) {
    if (!EMAIL_RE.test(m.to || '')) continue;
    if (!takeQuota_(1)) break;
    GmailApp.sendEmail(m.to, m.subject, m.body, { name: body.fromName || SENDER_NAME });
    sent++;
    Utilities.sleep(1500);
  }
  return { ok: true, sent: sent };
}

// ---------- web pages (opened from the links in the sheet) ----------
function page_(html) {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:18px;line-height:1.45">' + html + '</div>'
  ).setTitle('LeadScout').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function link_(p) {
  return baseUrl_() + '?' + Object.keys(p).map((k) => k + '=' + encodeURIComponent(p[k])).join('&');
}
function button_(href, label, color, blank) {
  return '<p><a href="' + href + '" target="' + (blank ? '_blank' : '_top') + '" style="display:inline-block;background:' + (color || '#2563eb') +
    ';color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">' + label + '</a></p>';
}

function selectPage_(p) {
  const sh = ss_().getSheetByName(p.tab);
  if (!sh) return page_('<p>Tab not found.</p>');
  const rows = readRows_(sh);
  const on = p.mode === 'all';
  if (rows.length) sh.getRange(FIRST_ROW, COL.SELECT, rows.length, 1).setValue(on);
  return page_('<h3>' + (on ? '☑ All ' + rows.length + ' rows selected' : '☐ Selection cleared') + '</h3><p>Go back to the sheet tab. The tick boxes are updated.</p>');
}

function emailPage_(p) {
  const sh = ss_().getSheetByName(p.tab);
  const row = Number(p.row);
  if (!sh || !(row >= FIRST_ROW)) return page_('<p>Row not found.</p>');
  const v = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const to = String(v[COL.EMAIL - 1]).trim();
  const name = v[COL.NAME - 1];
  const status = v[COL.STATUS - 1];
  const subject = v[COL.SUBJECT - 1];
  const body = v[COL.MESSAGE - 1];
  if (!EMAIL_RE.test(to)) return page_('<p>No valid email in this row.</p>');
  if (!body) return page_('<p>This row has no message text.</p>');
  if (p.confirm === '1') {
    if (!takeQuota_(1)) return page_('<p>Daily limit reached (' + DAILY_EMAIL_CAP + '). Try again tomorrow.</p>');
    GmailApp.sendEmail(to, subject, body, { name: SENDER_NAME });
    sh.getRange(row, COL.STATUS).setValue('Emailed');
    sh.getRange(row, COL.NOTES).setValue('Emailed ' + stamp_());
    sh.getRange(row, COL.SELECT).setValue(false);
    return page_('<h3>✅ Sent</h3><p>Email sent to <b>' + esc_(to) + '</b>. The row is now marked "Emailed".</p>');
  }
  return page_(
    '<h3>Send to ' + esc_(name) + '</h3><p><b>To:</b> ' + esc_(to) + '<br><b>Subject:</b> ' + esc_(subject) + '</p>' +
    (status === 'Emailed' ? '<p style="color:#b45309">Already emailed before.</p>' : '') +
    '<pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px;font-family:inherit">' + esc_(body) + '</pre>' +
    button_(link_({ action: 'email', tab: p.tab, row: p.row, secret: p.secret, confirm: 1 }), 'Send now')
  );
}

function bulkPage_(p, selectedOnly) {
  const sh = ss_().getSheetByName(p.tab);
  if (!sh) return page_('<p>Tab not found.</p>');
  const todo = readRows_(sh).filter((r) => {
    const okMail = EMAIL_RE.test(String(r.v[COL.EMAIL - 1]).trim()) && r.v[COL.MESSAGE - 1];
    if (!okMail) return false;
    return selectedOnly ? r.v[COL.SELECT - 1] === true && r.v[COL.STATUS - 1] !== 'Emailed' : r.v[COL.STATUS - 1] === 'New';
  });
  const what = selectedOnly ? 'ticked rows (not yet emailed)' : 'rows with Status "New"';
  if (p.confirm === '1') {
    let sent = 0;
    for (const r of todo) {
      if (!takeQuota_(1)) break;
      GmailApp.sendEmail(String(r.v[COL.EMAIL - 1]).trim(), r.v[COL.SUBJECT - 1], r.v[COL.MESSAGE - 1], { name: SENDER_NAME });
      sh.getRange(r.row, COL.STATUS).setValue('Emailed');
      sh.getRange(r.row, COL.NOTES).setValue('Emailed ' + stamp_());
      sh.getRange(r.row, COL.SELECT).setValue(false);
      sent++;
      Utilities.sleep(1500);
    }
    return page_('<h3>✅ Done</h3><p>Sent ' + sent + ' of ' + todo.length + ' emails.' + (sent < todo.length ? ' The daily limit was reached; the rest were not sent.' : '') + '</p>');
  }
  return page_(
    '<h3>Send ' + todo.length + ' emails?</h3><p>Tab <b>' + esc_(p.tab) + '</b>: ' + todo.length + ' ' + what + ' with an email address will be emailed from your Gmail now. This cannot be undone.</p>' +
    (todo.length ? button_(link_({ action: p.action, tab: p.tab, secret: p.secret, confirm: 1 }), 'Yes, send ' + todo.length + ' emails') : '')
  );
}

function waqPage_(p) {
  const sh = ss_().getSheetByName(p.tab);
  if (!sh) return page_('<p>Tab not found.</p>');
  if (p.done) {
    const r = Number(p.done);
    if (r >= FIRST_ROW) {
      sh.getRange(r, COL.STATUS).setValue('WhatsApp sent');
      sh.getRange(r, COL.NOTES).setValue('WhatsApp ' + stamp_());
      sh.getRange(r, COL.SELECT).setValue(false);
    }
  }
  if (p.skip) {
    const r = Number(p.skip);
    if (r >= FIRST_ROW) sh.getRange(r, COL.SELECT).setValue(false);
  }
  const q = readRows_(sh).filter((r) => r.v[COL.SELECT - 1] === true && r.wa && r.v[COL.STATUS - 1] !== 'WhatsApp sent');
  if (!q.length) {
    return page_('<h3>✅ WhatsApp queue finished</h3><p>No more ticked leads with a WhatsApp number. Tick more rows in the sheet and open the queue again.</p>');
  }
  const cur = q[0];
  const msg = String(cur.v[COL.MESSAGE - 1] || '');
  const open = 'https://wa.me/' + cur.wa + '?text=' + encodeURIComponent(msg);
  return page_(
    '<p style="color:#64748b">' + q.length + ' left in the queue</p><h3>' + esc_(cur.v[COL.NAME - 1]) + '</h3><p>+' + esc_(cur.wa) + '</p>' +
    '<pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px;font-family:inherit">' + esc_(msg) + '</pre>' +
    button_(open, '1. Open WhatsApp', '#16a34a', true) +
    button_(link_({ action: 'waq', tab: p.tab, secret: p.secret, done: cur.row }), '2. I sent it, next ▶') +
    '<p><a href="' + link_({ action: 'waq', tab: p.tab, secret: p.secret, skip: cur.row }) + '" target="_top">Skip this lead</a></p>'
  );
}
