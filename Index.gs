// ============================================
// GSC + BING INDEXING AUTOMATION - Apps Script v5 (FINAL)
// ============================================
// This script reads URLs from a Google Sheet tab,
// submits them to Google's Indexing API AND Bing's
// URL Submission API, and logs the status, timestamp,
// and attempt count back — independently per engine.
//
// CREDENTIALS:
// All credentials are stored in Script Properties
// (Project Settings > Script Properties):
//   - SERVICE_ACCOUNT_EMAIL
//   - SERVICE_ACCOUNT_KEY
//   - BING_API_KEY
//
// PRIORITY ORDER (applied independently for each engine):
// 1. New URLs (blank date for that engine) — top to bottom
// 2. Previously submitted URLs — oldest date first for that engine
//
// WORKBOOK HEADERS (Row 1):
// A = URL
// B = Google Status
// C = Google Last Submitted
// D = Google Attempts
// E = Bing Status
// F = Bing Last Submitted
// G = Bing Attempts
// ============================================

// =====================
// CONFIGURATION
// =====================
const SERVICE_ACCOUNT_CONFIG = {
  client_email: PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_EMAIL'),
  private_key: PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_KEY')?.replace(/\\n/g, '\n')
};

const BING_API_KEY = PropertiesService.getScriptProperties().getProperty('BING_API_KEY');

// Rate limits
const GOOGLE_DAILY_RATE_LIMIT = 200;
const BING_DAILY_RATE_LIMIT = 10000;


// =====================
// MAIN FUNCTION (Web App Entry Point)
// =====================
// Your site calls this URL with a POST request containing:
// {
//   "workbook_url": "https://docs.google.com/spreadsheets/d/abc123.../edit",
//   "tab_name": "Indexing Automation",
//   "gsc_property": "https://example.com/",       (or "sc-domain:example.com")
//   "bing_site_url": "https://example.com"         (optional — omit to skip Bing)
// }
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const workbookUrl = params.workbook_url;
    const tabName = params.tab_name;
    const gscProperty = params.gsc_property;
    const bingSiteUrl = params.bing_site_url || null;
    
    if (!workbookUrl || !tabName || !gscProperty) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Missing required parameters: workbook_url, tab_name, gsc_property"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const result = runIndexing(workbookUrl, tabName, gscProperty, bingSiteUrl);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


// =====================
// FOR MANUAL TESTING
// =====================
// Change these values and run this function from the editor to test
function testIndexing() {
  const workbookUrl = "https://docs.google.com/spreadsheets/d/1L2obyQjLNUtL2zrTbwMqT6BjePdOgGM1KekX-vLadbk/edit";
  const tabName = "Indexing Automation";
  const gscProperty = "https://agribilt.com/";
  
  // Set to the Bing site URL to test Bing, or null to skip
  const bingSiteUrl = null;   // e.g. "https://agribilt.com"
  
  const result = runIndexing(workbookUrl, tabName, gscProperty, bingSiteUrl);
  Logger.log(JSON.stringify(result, null, 2));
}


// =====================
// CORE INDEXING LOGIC
// =====================
function runIndexing(workbookUrl, tabName, gscProperty, bingSiteUrl) {
  // Open the workbook and tab
  const spreadsheetId = extractSpreadsheetId(workbookUrl);
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(tabName);
  
  if (!sheet) {
    return { success: false, error: 'Tab "' + tabName + '" not found in the workbook.' };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: false, error: "No URLs found in the sheet. Add URLs starting at row 2." };
  }
  
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 7); // Columns A-G
  const data = dataRange.getValues();
  
  // Get Google OAuth access token
  const googleAccessToken = getAccessToken();
  if (!googleAccessToken) {
    return { success: false, error: "Failed to obtain Google access token. Check service account credentials in Script Properties." };
  }
  
  // Check if Bing is enabled (site URL provided AND API key exists in properties)
  const bingEnabled = bingSiteUrl && BING_API_KEY;
  
  // =====================
  // BUILD GOOGLE PROCESSING ORDER
  // =====================
  const googleNew = [];
  const googleExisting = [];
  
  for (let i = 0; i < data.length; i++) {
    const url = data[i][0];
    const googleLastSubmitted = data[i][2]; // Column C
    const googleAttempts = data[i][3];      // Column D
    
    if (!url || url.toString().trim() === "") continue;
    
    const item = {
      rowIndex: i + 2,
      url: url.toString().trim(),
      attempts: (typeof googleAttempts === "number") ? googleAttempts : 0
    };
    
    if (!googleLastSubmitted || googleLastSubmitted === "") {
      googleNew.push(item);
    } else {
      item.lastSubmitted = googleLastSubmitted instanceof Date ? googleLastSubmitted : new Date(googleLastSubmitted);
      googleExisting.push(item);
    }
  }
  
  googleExisting.sort(function(a, b) {
    return a.lastSubmitted.getTime() - b.lastSubmitted.getTime();
  });
  
  const googleOrder = googleNew.concat(googleExisting);
  
  // =====================
  // BUILD BING PROCESSING ORDER
  // =====================
  const bingNew = [];
  const bingExisting = [];
  
  if (bingEnabled) {
    for (let i = 0; i < data.length; i++) {
      const url = data[i][0];
      const bingLastSubmitted = data[i][5]; // Column F
      const bingAttempts = data[i][6];      // Column G
      
      if (!url || url.toString().trim() === "") continue;
      
      var item = {
        rowIndex: i + 2,
        url: url.toString().trim(),
        attempts: (typeof bingAttempts === "number") ? bingAttempts : 0
      };
      
      if (!bingLastSubmitted || bingLastSubmitted === "") {
        bingNew.push(item);
      } else {
        item.lastSubmitted = bingLastSubmitted instanceof Date ? bingLastSubmitted : new Date(bingLastSubmitted);
        bingExisting.push(item);
      }
    }
    
    bingExisting.sort(function(a, b) {
      return a.lastSubmitted.getTime() - b.lastSubmitted.getTime();
    });
  }
  
  const bingOrder = bingNew.concat(bingExisting);
  
  // =====================
  // PROCESS GOOGLE
  // =====================
  let googleSubmitted = 0;
  let googleErrors = 0;
  let googleRateLimited = 0;
  const errorDetails = [];
  
  for (let i = 0; i < googleOrder.length; i++) {
    const item = googleOrder[i];
    
    if (googleSubmitted >= GOOGLE_DAILY_RATE_LIMIT) {
      sheet.getRange(item.rowIndex, 2).setValue("Rate Limited");
      googleRateLimited++;
      continue;
    }
    
    const result = submitUrlToGoogle(item.url, googleAccessToken);
    
    if (result.success) {
      sheet.getRange(item.rowIndex, 2).setValue("Submitted");
      sheet.getRange(item.rowIndex, 3).setValue(new Date());
      sheet.getRange(item.rowIndex, 4).setValue(item.attempts + 1);
      googleSubmitted++;
    } else {
      sheet.getRange(item.rowIndex, 2).setValue("Error: " + result.error);
      googleErrors++;
      errorDetails.push({ url: item.url, engine: "Google", error: result.error });
    }
    
    Utilities.sleep(500);
  }
  
  // =====================
  // PROCESS BING
  // =====================
  let bingSubmitted = 0;
  let bingErrors = 0;
  let bingRateLimited = 0;
  
  if (bingEnabled) {
    for (let i = 0; i < bingOrder.length; i++) {
      const item = bingOrder[i];
      
      if (bingSubmitted >= BING_DAILY_RATE_LIMIT) {
        sheet.getRange(item.rowIndex, 5).setValue("Rate Limited");
        bingRateLimited++;
        continue;
      }
      
      const result = submitUrlToBing(item.url, bingSiteUrl, BING_API_KEY);
      
      if (result.success) {
        sheet.getRange(item.rowIndex, 5).setValue("Submitted");
        sheet.getRange(item.rowIndex, 6).setValue(new Date());
        sheet.getRange(item.rowIndex, 7).setValue(item.attempts + 1);
        bingSubmitted++;
      } else {
        sheet.getRange(item.rowIndex, 5).setValue("Error: " + result.error);
        bingErrors++;
        errorDetails.push({ url: item.url, engine: "Bing", error: result.error });
      }
      
      Utilities.sleep(200);
    }
  }
  
  return {
    success: true,
    summary: {
      google: {
        newUrls: googleNew.length,
        existingUrls: googleExisting.length,
        submitted: googleSubmitted,
        errors: googleErrors,
        rateLimited: googleRateLimited
      },
      bing: bingEnabled ? {
        newUrls: bingNew.length,
        existingUrls: bingExisting.length,
        submitted: bingSubmitted,
        errors: bingErrors,
        rateLimited: bingRateLimited
      } : "Bing not configured — skipped",
      errorDetails: errorDetails
    }
  };
}


// =====================
// GOOGLE INDEXING API CALL
// =====================
function submitUrlToGoogle(url, accessToken) {
  try {
    const endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish";
    
    const payload = {
      url: url,
      type: "URL_UPDATED"
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + accessToken
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    const responseBody = JSON.parse(response.getContentText());
    
    if (responseCode === 200) {
      return { success: true };
    } else if (responseCode === 429) {
      return { success: false, error: "Rate limit exceeded" };
    } else if (responseCode === 403) {
      return { success: false, error: "Permission denied - check service account ownership in GSC" };
    } else {
      const errorMessage = responseBody.error ? responseBody.error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}


// =====================
// BING URL SUBMISSION API CALL
// =====================
function submitUrlToBing(url, siteUrl, apiKey) {
  try {
    const endpoint = "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey=" + apiKey;
    
    const payload = {
      siteUrl: siteUrl,
      url: url
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true };
    } else if (responseCode === 429) {
      return { success: false, error: "Rate limit exceeded" };
    } else {
      var errorMessage = "HTTP " + responseCode;
      try {
        var responseBody = JSON.parse(response.getContentText());
        if (responseBody.ErrorCode) {
          errorMessage = responseBody.ErrorCode + ": " + (responseBody.Message || "");
        }
      } catch (e) {
        // Response wasn't JSON, use the HTTP code
      }
      return { success: false, error: errorMessage };
    }
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}


// =====================
// AUTHENTICATION (JWT / OAuth2 for Google)
// =====================
function getAccessToken() {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    const header = {
      alg: "RS256",
      typ: "JWT"
    };
    
    const claimSet = {
      iss: SERVICE_ACCOUNT_CONFIG.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };
    
    const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
    const encodedClaimSet = Utilities.base64EncodeWebSafe(JSON.stringify(claimSet));
    
    const signingInput = encodedHeader + "." + encodedClaimSet;
    
    const signatureBytes = Utilities.computeRsaSha256Signature(
      signingInput,
      SERVICE_ACCOUNT_CONFIG.private_key
    );
    const encodedSignature = Utilities.base64EncodeWebSafe(signatureBytes);
    
    const jwt = signingInput + "." + encodedSignature;
    
    const tokenResponse = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
      method: "post",
      contentType: "application/x-www-form-urlencoded",
      payload: {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      },
      muteHttpExceptions: true
    });
    
    const tokenData = JSON.parse(tokenResponse.getContentText());
    
    if (tokenData.access_token) {
      return tokenData.access_token;
    } else {
      Logger.log("Token error: " + JSON.stringify(tokenData));
      return null;
    }
    
  } catch (error) {
    Logger.log("Auth error: " + error.toString());
    return null;
  }
}


// =====================
// UTILITY FUNCTIONS
// =====================
function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error("Could not extract spreadsheet ID from URL: " + url);
}
