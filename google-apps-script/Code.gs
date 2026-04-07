/**
 * Visitor Tracker — Google Apps Script (all dashboards)
 * Deployed URL: https://script.google.com/macros/s/AKfycbyfdZwRQY6HNBUAyAQQjRW8H9EGCKqMbSEg0IIbPW2y1HLMXV5C19zPaLbj-nEkUAVGrw/exec
 *
 * UPDATE: After editing, Deploy → Manage deployments → Edit → New version → Deploy
 */

var SHEET_ID = '15wcRoWX-qMsusROgPAablSxV0CgT_Yql5EbQNXsJR90';
var SHEET_NAME = 'Visitors';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 'Dashboard', 'Page URL', 'Referrer',
        'Country', 'City', 'IP', 'User Agent',
        'Language', 'Screen', 'Timezone'
      ]);
      sheet.getRange('1:1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
      data.dashboard  || 'unknown',
      data.page       || '',
      data.referrer   || 'Direct',
      data.country    || '',
      data.city       || '',
      data.ip         || '',
      (data.userAgent || '').substring(0, 200),
      data.language   || '',
      data.screen     || '',
      data.timezone   || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Visitor tracking active' }))
    .setMimeType(ContentService.MimeType.JSON);
}
