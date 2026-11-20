// LeadScout Google Sheet + Gmail helper. Runs in YOUR Google account (free).
// 1. Create a new Google Sheet (sheets.new). Open Extensions > Apps Script.
// 2. Delete the sample code, paste this file, change SECRET below to any long random text, Save.
// 3. Deploy > New deployment > type "Web app" > Execute as: Me, Who has access: Anyone > Deploy.
//    Approve the Google permission screen (Sheets + Gmail). Copy the Web app URL.
// 4. In the LeadScout app > Settings: paste the URL and the SECRET, Save.
// New leads are added to the sheet "Leads", one row per business, with today's date.
// A Status dropdown (New, Emailed, WhatsApp sent, Replied, Won, Not interested) lets you manage leads from the Sheets app.
// Bulk email sends from your Gmail, about 100 per day on free Gmail.

const SECRET = 'CHANGE-ME-TO-A-LONG-RANDOM-TEXT';
const DAILY_EMAIL_CAP = 100;
const SHEET_NAME = 'Leads';
const HEADERS = ['Date', 'City', 'Country', 'Type', 'Name', 'Website', 'Email', 'Phone', 'WhatsApp', 'Problems', 'Platform', 'Score', 'Status', 'Notes'];
const STATUSES = ['New', 'Emailed', 'WhatsApp sent', 'Replied', 'Won', 'Not interested'];

function doPost(e) {
  let out = { ok: false };
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) throw new Error('bad secret');
    if (body.action === 'sheet') out = addRows(body.rows || []);
    else out = sendMails(body);
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    sh.setColumnWidth(5, 220);
    sh.setColumnWidth(6, 220);
    sh.setColumnWidth(7, 220);
    sh.setColumnWidth(10, 260);
  }
  return sh;
}

function addRows(rows) {
  const sh = getSheet();
  const last = sh.getLastRow();
  const have = new Set();
  if (last > 1) {
    sh.getRange(2, 6, last - 1, 1).getValues().forEach((r) => have.add(hostOf(r[0])));
  }
  const fresh = rows.filter((r) => r.host && !have.has(r.host));
  if (!fresh.length) return { ok: true, added: 0 };
  const values = fresh.map((r) => [
    r.date, r.city, r.country, r.category, r.name, r.website, r.email, r.phone,
    r.whatsapp ? '=HYPERLINK("https://wa.me/' + String(r.whatsapp).replace(/\D/g, '') + '","Open chat")' : '',
    r.issues, r.platform, r.score, 'New', '',
  ]);
  const start = sh.getLastRow() + 1;
  sh.getRange(start, 1, values.length, HEADERS.length).setValues(values);
  sh.getRange(start, 13, values.length, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build()
  );
  return { ok: true, added: values.length };
}

function hostOf(u) {
  return String(u || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
}

function sendMails(body) {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  let used = props.getProperty('day') === today ? Number(props.getProperty('used') || 0) : 0;
  let sent = 0;
  for (const m of body.mails || []) {
    if (used >= DAILY_EMAIL_CAP) break;
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(m.to || '')) continue;
    GmailApp.sendEmail(m.to, m.subject, m.body, { name: body.fromName || '' });
    used++;
    sent++;
    Utilities.sleep(1500); // be gentle, avoids spam filters
  }
  props.setProperty('day', today);
  props.setProperty('used', String(used));
  return { ok: true, sent: sent, usedToday: used };
}
