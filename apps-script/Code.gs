// LeadScout Google Sheet + Gmail helper. Runs in YOUR Google account (free).
// Setup: create a Google Sheet, open Extensions > Apps Script, paste this file, set SECRET and SENDER_NAME below,
// then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Approve the permission screen.
// Paste the Web app URL and the SECRET into the LeadScout app > Settings.
//
// What it does
// - Every day gets its own tab (named 2026-11-20) with that day's leads, newest day on the left.
// - Each row has a WhatsApp link (opens the chat with the message ready) and a "Send email" link
//   (shows a preview, then sends from your Gmail when you confirm).
// - Cell A1 of each day tab: "Send ALL New emails" (asks to confirm, then sends every row with Status "New").
// - Status dropdown: New, Emailed, WhatsApp sent, Replied, Won, Not interested.
// Free Gmail allows about 100 emails per day through scripts.

const SECRET = 'CHANGE-ME-TO-A-LONG-RANDOM-TEXT';
const SPREADSHEET_ID = ''; // leave empty when the script is attached to the sheet
const WEBAPP_URL = ''; // leave empty to detect automatically
const SENDER_NAME = 'Your Name';
const DAILY_EMAIL_CAP = 100;

const HEADERS = ['Date', 'City', 'Country', 'Type', 'Name', 'Website', 'Email', 'Phone', 'WhatsApp', 'Send email', 'Problems', 'Platform', 'Score', 'Status', 'Notes', 'Subject', 'Message'];
const STATUSES = ['New', 'Emailed', 'WhatsApp sent', 'Replied', 'Won', 'Not interested'];
const COL = { NAME: 5, WEBSITE: 6, EMAIL: 7, STATUS: 14, NOTES: 15, SUBJECT: 16, MESSAGE: 17 };
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
    if (p.action === 'bulk') return bulkPage_(p);
  } catch (err) {
    return page_('<p>Error: ' + esc_(String(err)) + '</p>');
  }
  return page_('<p>LeadScout is running.</p>');
}

// ---------- sheet ----------
function dayTab_(day) {
  const ss = ss_();
  let sh = ss.getSheetByName(day);
  if (sh) return sh;
  const old = ss.getSheetByName('Leads'); // keep the old single tab as an archive
  if (old) {
    try { old.setName('Old leads'); } catch (err) {}
  }
  sh = ss.insertSheet(day, 0);
  const bulk = baseUrl_() + '?action=bulk&tab=' + day + '&secret=' + SECRET;
  sh.getRange(1, 1).setFormula('=HYPERLINK("' + bulk + '","▶ Send ALL \'New\' emails in this tab")').setFontWeight('bold').setFontColor('#1d4ed8');
  sh.getRange(1, 4).setValue('WhatsApp: tap the link, then press Send. Email: tap "Send email", check the preview, confirm.');
  sh.getRange(2, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  sh.setFrozenRows(2);
  [[5, 200], [6, 220], [7, 220], [11, 240]].forEach((w) => sh.setColumnWidth(w[0], w[1]));
  sh.hideColumns(COL.SUBJECT, 2);
  return sh;
}

function addRows_(rows) {
  const have = new Set();
  ss_().getSheets().filter(isDayTab_).forEach((sh) => {
    const n = sh.getLastRow();
    if (n >= FIRST_ROW) sh.getRange(FIRST_ROW, COL.WEBSITE, n - FIRST_ROW + 1, 1).getValues().forEach((r) => have.add(hostOf_(r[0])));
  });
  const byDay = {};
  rows.forEach((r) => {
    const h = r.host || hostOf_(r.website);
    if (!h || have.has(h)) return;
    have.add(h);
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
        day, r.city, r.country, r.category, r.name, r.website, r.email, r.phone,
        wa ? '=HYPERLINK("https://wa.me/' + wa + '?text="&ENCODEURL(Q' + row + '),"WhatsApp")' : '',
        r.email ? '=HYPERLINK("' + base + '?action=email&tab=' + day + '&secret=' + SECRET + '&row="&ROW(),"Send email")' : '',
        r.issues, r.platform, r.score, 'New', '', r.subject || '', r.message || '',
      ];
    });
    sh.getRange(start, 1, values.length, HEADERS.length).setValues(values);
    sh.getRange(start, COL.STATUS, values.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build()
    );
    added += values.length;
  });
  return { ok: true, added: added };
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
function button_(href, label) {
  return '<p><a href="' + href + '" target="_top" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">' + label + '</a></p>';
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
    return page_('<h3>✅ Sent</h3><p>Email sent to <b>' + esc_(to) + '</b>. The row is now marked "Emailed".</p>');
  }
  return page_(
    '<h3>Send to ' + esc_(name) + '</h3><p><b>To:</b> ' + esc_(to) + '<br><b>Subject:</b> ' + esc_(subject) + '</p>' +
    (status === 'Emailed' ? '<p style="color:#b45309">Already emailed before.</p>' : '') +
    '<pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px;font-family:inherit">' + esc_(body) + '</pre>' +
    button_(link_({ action: 'email', tab: p.tab, row: p.row, secret: p.secret, confirm: 1 }), 'Send now')
  );
}

function bulkPage_(p) {
  const sh = ss_().getSheetByName(p.tab);
  if (!sh) return page_('<p>Tab not found.</p>');
  const n = sh.getLastRow();
  if (n < FIRST_ROW) return page_('<p>No leads in this tab.</p>');
  const data = sh.getRange(FIRST_ROW, 1, n - FIRST_ROW + 1, HEADERS.length).getValues();
  const todo = [];
  data.forEach((v, i) => {
    if (v[COL.STATUS - 1] === 'New' && EMAIL_RE.test(String(v[COL.EMAIL - 1]).trim()) && v[COL.MESSAGE - 1]) todo.push(i);
  });
  if (p.confirm === '1') {
    let sent = 0;
    for (const i of todo) {
      if (!takeQuota_(1)) break;
      const v = data[i];
      GmailApp.sendEmail(String(v[COL.EMAIL - 1]).trim(), v[COL.SUBJECT - 1], v[COL.MESSAGE - 1], { name: SENDER_NAME });
      sh.getRange(FIRST_ROW + i, COL.STATUS).setValue('Emailed');
      sh.getRange(FIRST_ROW + i, COL.NOTES).setValue('Emailed ' + stamp_());
      sent++;
      Utilities.sleep(1500);
    }
    return page_('<h3>✅ Done</h3><p>Sent ' + sent + ' of ' + todo.length + ' emails.' + (sent < todo.length ? ' The daily limit was reached; the rest stay "New".' : '') + '</p>');
  }
  return page_(
    '<h3>Send ' + todo.length + ' emails?</h3><p>Every row in tab <b>' + esc_(p.tab) + '</b> with Status "New" and an email address will be emailed from your Gmail now. This cannot be undone.</p>' +
    (todo.length ? button_(link_({ action: 'bulk', tab: p.tab, secret: p.secret, confirm: 1 }), 'Yes, send ' + todo.length + ' emails') : '')
  );
}
