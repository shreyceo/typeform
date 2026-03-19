// ============================================================
// GOOGLE APPS SCRIPT — Lead Capture v6
// ── Email auto-reply to leads
// ── WhatsApp alert via CallMeBot (free)
// ── Lead reading for admin dashboard
// ============================================================

// ══════════ CONFIGURE THESE ══════════
var YOUR_EMAIL        = "you@youremail.com";        // Your email for alerts
var BRAND_NAME        = "LeadForm";                  // Your brand name
var REPLY_FROM_NAME   = "Shrey from LeadForm";       // Sender name in auto-reply
var WHATSAPP_NUMBER   = "919876543210";              // Your WhatsApp number (with country code, no +)
var WHATSAPP_API_KEY  = "YOUR_CALLMEBOT_API_KEY";    // Get free key at callmebot.com/blog/free-api-whatsapp-messages/
var ENABLE_EMAIL_REPLY  = true;   // Set false to disable auto-reply to leads
var ENABLE_WHATSAPP_ALERT = false; // Set true after getting CallMeBot API key
var ENABLE_EMAIL_ALERT    = true;  // Email alert to you on every lead
// ═════════════════════════════════════

function doPost(e) { return saveData(e.parameter); }

function doGet(e) {
  if (e.parameter && e.parameter.action === 'getLeads') return getLeads();
  if (e.parameter && e.parameter.name) return saveData(e.parameter);
  return ContentService.createTextOutput("✅ Live.").setMimeType(ContentService.MimeType.TEXT);
}

function saveData(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Headers on first run
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp","Name","Email","Phone","Company","Interest","Budget","Message","Lead Score","UTM Source","UTM Medium","UTM Campaign","Referrer","Language"]);
      var h = sheet.getRange(1,1,1,14);
      h.setFontWeight("bold"); h.setBackground("#111110"); h.setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      data.timestamp||new Date().toISOString(), data.name||"", data.email||"",
      data.phone||"", data.company||"", data.interest||"", data.budget||"",
      data.message||"", data.lead_score||"", data.utm_source||"direct",
      data.utm_medium||"", data.utm_campaign||"", data.referrer||"", data.language||""
    ]);
    sheet.autoResizeColumns(1,14);

    // ── 1. Email auto-reply to lead ──
    if (ENABLE_EMAIL_REPLY && data.email) {
      sendAutoReply(data);
    }

    // ── 2. Email alert to you ──
    if (ENABLE_EMAIL_ALERT && YOUR_EMAIL !== "you@youremail.com") {
      sendAlertEmail(data);
    }

    // ── 3. WhatsApp alert to you ──
    if (ENABLE_WHATSAPP_ALERT && WHATSAPP_API_KEY !== "YOUR_CALLMEBOT_API_KEY") {
      sendWhatsAppAlert(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({status:"success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({status:"error",message:err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════ EMAIL AUTO-REPLY ══════════
function sendAutoReply(data) {
  var firstName = (data.name || "there").split(" ")[0];
  var subject   = "We received your enquiry — " + BRAND_NAME;

  var html = '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;background:#fafaf8;color:#1a1708">'
    + '<h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Hi ' + firstName + ',</h2>'
    + '<p style="font-size:16px;line-height:1.6;color:#444;margin-bottom:16px">Thanks for reaching out to <strong>' + BRAND_NAME + '</strong>. We\'ve received your enquiry and will get back to you within <strong>24 hours</strong>.</p>'
    + '<div style="background:#fff;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e5e4df">'
    + '<p style="font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:10px">Your submission summary</p>'
    + '<table style="width:100%;font-size:14px;border-collapse:collapse">'
    + (data.company ? '<tr><td style="padding:5px 0;color:#888;width:100px">Company</td><td style="padding:5px 0;font-weight:600">' + data.company + '</td></tr>' : '')
    + (data.interest ? '<tr><td style="padding:5px 0;color:#888">Interest</td><td style="padding:5px 0;font-weight:600">' + data.interest + '</td></tr>' : '')
    + (data.budget ? '<tr><td style="padding:5px 0;color:#888">Budget</td><td style="padding:5px 0;font-weight:600">' + data.budget + '</td></tr>' : '')
    + '</table></div>'
    + '<p style="font-size:14px;color:#666;line-height:1.6">In the meantime, feel free to reply to this email if you have any questions.</p>'
    + '<p style="margin-top:24px;font-size:14px">Best regards,<br><strong>' + REPLY_FROM_NAME + '</strong></p>'
    + '<hr style="border:none;border-top:1px solid #e5e4df;margin:24px 0">'
    + '<p style="font-size:11px;color:#aaa">This is an automated confirmation. You\'re receiving this because you submitted a form on our website.</p>'
    + '</div>';

  MailApp.sendEmail({
    to:      data.email,
    subject: subject,
    htmlBody: html,
    name:    REPLY_FROM_NAME,
    replyTo: YOUR_EMAIL
  });
}

// ══════════ ALERT EMAIL TO YOU ══════════
function sendAlertEmail(data) {
  var score = data.lead_score || "?";
  var isHot = score.indexOf("Hot") !== -1;
  MailApp.sendEmail({
    to:      YOUR_EMAIL,
    subject: (isHot ? "🔥 " : "") + "[" + score + "] New Lead: " + (data.name||"Unknown") + " — " + BRAND_NAME,
    htmlBody: '<div style="font-family:sans-serif;max-width:500px;padding:24px;background:#f5f0e8">'
      + (isHot ? '<div style="background:#e74c3c;color:white;border-radius:8px;padding:10px 16px;margin-bottom:16px;font-weight:700">🔥 HOT LEAD — Follow up fast!</div>' : '')
      + '<table style="width:100%;font-size:14px;border-collapse:collapse">'
      + '<tr><td style="padding:6px 0;color:#888;width:100px">Name</td><td style="padding:6px 0;font-weight:600">' + (data.name||'—') + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0"><a href="mailto:'+data.email+'" style="color:#1a1708">'+data.email+'</a></td></tr>'
      + '<tr><td style="padding:6px 0;color:#888">Phone</td><td style="padding:6px 0">' + (data.phone||'—') + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888">Company</td><td style="padding:6px 0">' + (data.company||'—') + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888">Interest</td><td style="padding:6px 0">' + (data.interest||'—') + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888">Budget</td><td style="padding:6px 0">' + (data.budget||'—') + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888">Score</td><td style="padding:6px 0;font-weight:700">' + (data.lead_score||'—') + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888">Source</td><td style="padding:6px 0">' + (data.utm_source||'direct') + '</td></tr>'
      + (data.message ? '<tr><td style="padding:6px 0;color:#888;vertical-align:top">Message</td><td style="padding:6px 0">' + data.message + '</td></tr>' : '')
      + '</table>'
      + '<div style="margin-top:20px"><a href="https://shreyceo.github.io/typeform/admin.html" style="background:#1a1708;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View in Dashboard →</a></div>'
      + '</div>'
  });
}

// ══════════ WHATSAPP ALERT (CallMeBot) ══════════
function sendWhatsAppAlert(data) {
  var msg = "🔥 New Lead!\n"
    + "Name: " + (data.name||"?") + "\n"
    + "Company: " + (data.company||"?") + "\n"
    + "Interest: " + (data.interest||"?") + "\n"
    + "Score: " + (data.lead_score||"?") + "\n"
    + "Phone: " + (data.phone||"—");

  var url = "https://api.callmebot.com/whatsapp.php?phone=" + WHATSAPP_NUMBER
    + "&text=" + encodeURIComponent(msg)
    + "&apikey=" + WHATSAPP_API_KEY;

  try {
    UrlFetchApp.fetch(url);
  } catch(e) {
    Logger.log("WhatsApp alert failed: " + e.toString());
  }
}

// ══════════ READ LEADS FOR DASHBOARD ══════════
function getLeads() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return ContentService.createTextOutput(JSON.stringify({leads:[]})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getRange(2,1,lastRow-1,14).getValues();
    var leads = data.map(function(r) {
      return {
        timestamp:    r[0]?new Date(r[0]).toISOString():"",
        name:         String(r[1]||""),  email:       String(r[2]||""),
        phone:        String(r[3]||""),  company:     String(r[4]||""),
        interest:     String(r[5]||""),  budget:      String(r[6]||""),
        message:      String(r[7]||""),  lead_score:  String(r[8]||""),
        utm_source:   String(r[9]||"direct"), utm_medium: String(r[10]||""),
        utm_campaign: String(r[11]||""), referrer:    String(r[12]||""),
        language:     String(r[13]||"")
      };
    }).reverse();
    return ContentService.createTextOutput(JSON.stringify({leads:leads,total:leads.length})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error:err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
