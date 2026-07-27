const INTEGRATION_DEFAULTS = Object.freeze({
  version: "2026-07-27-1",
  publicSiteUrl: "https://elcaliente69.github.io/hot-host-hospitality/",
  rootFolderName: "Solicitudes_Web_Hot_Host",
  leadsSheetName: "Solicitudes web",
  maxRequestCharacters: 30 * 1024 * 1024,
  maxMetadataCharacters: 64 * 1024,
  maxFiles: 10,
  maxFileBytes: 4 * 1024 * 1024,
  maxSubmissionsPerEmail: 5,
  rateLimitSeconds: 6 * 60 * 60,
  maxSubmissionsGlobally: 30,
  globalRateLimitSeconds: 60 * 60,
  retentionDays: 365,
  followupDelayHours: 24,
  eventDurationMinutes: 30,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
});

const LEAD_HEADERS = Object.freeze([
  "submissionId",
  "submittedAt",
  "receivedAt",
  "language",
  "sourceUrl",
  "deliveryMethod",
  "consentAccepted",
  "consentText",
  "relationship",
  "name",
  "email",
  "phone",
  "street",
  "postalCode",
  "city",
  "country",
  "propertyType",
  "bedrooms",
  "bathrooms",
  "floor",
  "totalFloors",
  "touristRental",
  "listingUrl",
  "photosUrl",
  "comments",
  "photoCount",
  "driveFolderId",
  "driveFolderUrl",
  "calendarEventId",
  "status"
]);

const SCRIPT_PROPERTY_KEYS = Object.freeze([
  "PUBLIC_SITE_URL",
  "GOOGLE_DRIVE_FOLDER_ID",
  "GOOGLE_SHEETS_SPREADSHEET_ID",
  "GOOGLE_SHEETS_LEADS_SHEET",
  "GOOGLE_CALENDAR_ID",
  "GOOGLE_CALENDAR_FOLLOWUP_ENABLED",
  "GOOGLE_CALENDAR_FOLLOWUP_DELAY_HOURS",
  "GOOGLE_CALENDAR_EVENT_DURATION_MINUTES",
  "GOOGLE_GMAIL_NOTIFICATION_ENABLED",
  "GOOGLE_GMAIL_NOTIFICATION_TO",
  "GOOGLE_DATA_RETENTION_DAYS"
]);

function doGet() {
  const config = getConfiguration_();
  return jsonResponse_({
    ok: Boolean(config.spreadsheetId),
    configured: {
      sheets: Boolean(config.spreadsheetId),
      drive: Boolean(config.driveFolderId),
      calendar: Boolean(config.calendarFollowupEnabled && config.calendarId),
      gmail: Boolean(config.gmailNotificationEnabled && config.notificationEmail)
    },
    service: "Hot Host Google Workspace integration",
    timeZone: Session.getScriptTimeZone(),
    version: INTEGRATION_DEFAULTS.version
  });
}

function doPost(event) {
  let requestFolder = null;
  let calendarEvent = null;
  let reservationCreated = false;
  let leadStored = false;

  try {
    const rawPayload = readPayload_(event);
    if (rawPayload.length > INTEGRATION_DEFAULTS.maxRequestCharacters) {
      throw new Error("Request is too large");
    }

    const payload = JSON.parse(rawPayload);
    if (payload.website) return jsonResponse_({ ok: true, ignored: true });

    const config = getConfiguration_();
    validatePayload_(payload, config);
    const sheet = getLeadsSheet_(config);
    if (!reserveSubmission_(payload.submissionId, sheet)) {
      return jsonResponse_({
        ok: true,
        duplicate: true,
        submissionId: payload.submissionId,
        version: INTEGRATION_DEFAULTS.version
      });
    }
    reservationCreated = true;
    enforceRateLimit_(payload.contact.email);

    const warnings = [];
    const storedPhotos = [];
    if (payload.photos.length) {
      requestFolder = createRequestFolder_(payload, config);
      payload.photos.forEach(function (photo, index) {
        storedPhotos.push(storePhoto_(requestFolder, photo, index));
      });
      storeRequestMetadata_(requestFolder, payload, storedPhotos);
    }

    try {
      calendarEvent = createCalendarFollowup_(payload, config);
    } catch (calendarError) {
      warnings.push("calendar");
      console.error(calendarError);
    }

    const receivedAt = new Date().toISOString();
    const record = buildLeadRecord_(
      payload,
      receivedAt,
      storedPhotos,
      requestFolder,
      calendarEvent
    );
    appendLead_(sheet, record);
    leadStored = true;
    markSubmissionProcessed_(payload.submissionId);

    let notificationSent = false;
    try {
      notificationSent = sendLeadNotification_(payload, record, config);
    } catch (notificationError) {
      warnings.push("gmail");
      console.error(notificationError);
    }

    return jsonResponse_({
      ok: true,
      submissionId: payload.submissionId,
      filesStored: storedPhotos.length,
      calendarCreated: Boolean(calendarEvent),
      notificationSent: notificationSent,
      warnings: warnings,
      version: INTEGRATION_DEFAULTS.version
    });
  } catch (error) {
    if (!leadStored) {
      if (calendarEvent) {
        try {
          calendarEvent.deleteEvent();
        } catch (calendarCleanupError) {
          console.error(calendarCleanupError);
        }
      }
      if (requestFolder) {
        try {
          requestFolder.setTrashed(true);
        } catch (driveCleanupError) {
          console.error(driveCleanupError);
        }
      }
    }
    if (reservationCreated && !leadStored) {
      releaseSubmissionReservation_(extractSubmissionId_(event));
    }
    console.error(error);
    return jsonResponse_({
      ok: false,
      error: String(error.message || error),
      version: INTEGRATION_DEFAULTS.version
    });
  }
}

function getConfiguration_() {
  const properties = PropertiesService.getScriptProperties();
  return {
    publicSiteUrl: getStringProperty_(properties, "PUBLIC_SITE_URL", INTEGRATION_DEFAULTS.publicSiteUrl),
    driveFolderId: getStringProperty_(properties, "GOOGLE_DRIVE_FOLDER_ID", ""),
    spreadsheetId: getStringProperty_(properties, "GOOGLE_SHEETS_SPREADSHEET_ID", ""),
    leadsSheetName: getStringProperty_(properties, "GOOGLE_SHEETS_LEADS_SHEET", INTEGRATION_DEFAULTS.leadsSheetName),
    calendarId: getStringProperty_(properties, "GOOGLE_CALENDAR_ID", ""),
    calendarFollowupEnabled: getBooleanProperty_(properties, "GOOGLE_CALENDAR_FOLLOWUP_ENABLED", false),
    followupDelayHours: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_FOLLOWUP_DELAY_HOURS",
      INTEGRATION_DEFAULTS.followupDelayHours,
      0,
      720
    ),
    eventDurationMinutes: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_EVENT_DURATION_MINUTES",
      INTEGRATION_DEFAULTS.eventDurationMinutes,
      5,
      480
    ),
    gmailNotificationEnabled: getBooleanProperty_(properties, "GOOGLE_GMAIL_NOTIFICATION_ENABLED", false),
    notificationEmail: getStringProperty_(properties, "GOOGLE_GMAIL_NOTIFICATION_TO", ""),
    retentionDays: getIntegerProperty_(
      properties,
      "GOOGLE_DATA_RETENTION_DAYS",
      INTEGRATION_DEFAULTS.retentionDays,
      1,
      3650
    )
  };
}

function getStringProperty_(properties, name, fallback) {
  const value = properties.getProperty(name);
  return value === null ? fallback : String(value).trim();
}

function getBooleanProperty_(properties, name, fallback) {
  const value = properties.getProperty(name);
  if (value === null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function getIntegerProperty_(properties, name, fallback, minimum, maximum) {
  const rawValue = properties.getProperty(name);
  if (rawValue === null || String(rawValue).trim() === "") return fallback;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function readPayload_(event) {
  if (!event) throw new Error("Empty request");

  if (event.parameter && typeof event.parameter.payload === "string" && event.parameter.payload) {
    return event.parameter.payload;
  }
  if (event.parameters && event.parameters.payload && event.parameters.payload.length) {
    return String(event.parameters.payload[0]);
  }
  if (event.postData && typeof event.postData.contents === "string" && event.postData.contents) {
    return event.postData.contents;
  }
  throw new Error("Empty request");
}

function extractSubmissionId_(event) {
  try {
    const payload = JSON.parse(readPayload_(event));
    return String(payload.submissionId || "");
  } catch (error) {
    return "";
  }
}

function validatePayload_(payload, config) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
  if (!/^[a-z0-9-]{8,80}$/i.test(String(payload.submissionId || ""))) {
    throw new Error("Invalid submission reference");
  }
  if (!payload.contact || !payload.property) throw new Error("Missing request data");
  if (!payload.consent || payload.consent.accepted !== true) throw new Error("Consent is required");
  if (["email", "whatsapp"].indexOf(String(payload.deliveryMethod || "")) === -1) {
    throw new Error("Invalid delivery method");
  }
  if (!String(payload.contact.name || "").trim()) throw new Error("Missing contact name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.contact.email || "").trim())) {
    throw new Error("Invalid contact email");
  }
  if (!String(payload.property.street || "").trim() || !String(payload.property.city || "").trim()) {
    throw new Error("Missing property address");
  }

  validateSourceUrl_(payload.sourceUrl, config.publicSiteUrl);
  payload.photos = Array.isArray(payload.photos) ? payload.photos : [];
  if (payload.photos.length > INTEGRATION_DEFAULTS.maxFiles) throw new Error("Too many photos");

  payload.photos.forEach(function (photo) {
    if (!photo || INTEGRATION_DEFAULTS.allowedMimeTypes.indexOf(photo.mimeType) === -1) {
      throw new Error("Unsupported image type");
    }
    if (!photo.data || typeof photo.data !== "string") throw new Error("Invalid image data");
  });

  const metadataLength = JSON.stringify({
    submissionId: payload.submissionId,
    submittedAt: payload.submittedAt,
    language: payload.language,
    sourceUrl: payload.sourceUrl,
    deliveryMethod: payload.deliveryMethod,
    consent: payload.consent,
    contact: payload.contact,
    property: payload.property
  }).length;
  if (metadataLength > INTEGRATION_DEFAULTS.maxMetadataCharacters) {
    throw new Error("Request metadata is too large");
  }
}

function validateSourceUrl_(sourceUrl, publicSiteUrl) {
  const source = String(sourceUrl || "").trim();
  const allowedBase = String(publicSiteUrl || "").trim().replace(/\/+$/, "") + "/";
  if (!source || !allowedBase || source.indexOf(allowedBase) !== 0) {
    throw new Error("Invalid request source");
  }
}

function reserveSubmission_(submissionId, sheet) {
  const key = "submission-" + submissionId;
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (cache.get(key) || findSubmissionRow_(sheet, submissionId)) return false;
    cache.put(key, "processing", 6 * 60 * 60);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function markSubmissionProcessed_(submissionId) {
  CacheService.getScriptCache().put("submission-" + submissionId, "done", 6 * 60 * 60);
}

function releaseSubmissionReservation_(submissionId) {
  if (!submissionId) return;
  CacheService.getScriptCache().remove("submission-" + submissionId);
}

function enforceRateLimit_(email) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(email).trim().toLowerCase(),
    Utilities.Charset.UTF_8
  );
  const key = "lead-" + digest.map(function (value) {
    return (value + 256).toString(16).slice(-2);
  }).join("").slice(0, 40);
  const cache = CacheService.getScriptCache();
  const globalKey = "lead-global";
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);
  try {
    const currentCount = Number(cache.get(key) || 0);
    const globalCount = Number(cache.get(globalKey) || 0);
    if (
      currentCount >= INTEGRATION_DEFAULTS.maxSubmissionsPerEmail ||
      globalCount >= INTEGRATION_DEFAULTS.maxSubmissionsGlobally
    ) {
      throw new Error("Submission rate limit reached");
    }
    cache.put(key, String(currentCount + 1), INTEGRATION_DEFAULTS.rateLimitSeconds);
    cache.put(
      globalKey,
      String(globalCount + 1),
      INTEGRATION_DEFAULTS.globalRateLimitSeconds
    );
  } finally {
    lock.releaseLock();
  }
}

function getLeadsSheet_(config) {
  if (!config.spreadsheetId) {
    throw new Error("Google Sheets is not configured");
  }
  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(config.leadsSheetName) ||
      spreadsheet.insertSheet(config.leadsSheetName);
    ensureLeadHeaders_(sheet);
    return sheet;
  } catch (error) {
    throw new Error("The configured Google Sheets document is unavailable");
  }
}

function ensureLeadHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  let headers = [];
  if (lastColumn > 0) {
    headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function (value) {
      return String(value).trim();
    });
  }
  if (!headers.some(Boolean)) headers = [];

  LEAD_HEADERS.forEach(function (header) {
    if (headers.indexOf(header) === -1) headers.push(header);
  });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  return headers;
}

function findSubmissionRow_(sheet, submissionId) {
  const headers = ensureLeadHeaders_(sheet);
  const submissionColumn = headers.indexOf("submissionId") + 1;
  if (!submissionColumn || sheet.getLastRow() < 2) return 0;
  const match = sheet
    .getRange(2, submissionColumn, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(submissionId))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : 0;
}

function appendLead_(sheet, record) {
  const headers = ensureLeadHeaders_(sheet);
  const values = headers.map(function (header) {
    return protectSheetValue_(record[header]);
  });
  const row = Math.max(2, sheet.getLastRow() + 1);
  sheet.getRange(row, 1, 1, values.length).setNumberFormat("@").setValues([values]);
}

function protectSheetValue_(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function createRequestFolder_(payload, config) {
  const rootFolder = getRootFolder_(config);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return rootFolder.createFolder(buildFolderName_(payload));
  } finally {
    lock.releaseLock();
  }
}

function getRootFolder_(config) {
  if (!config.driveFolderId) {
    throw new Error("Google Drive is not configured for photo uploads");
  }
  try {
    const folder = DriveApp.getFolderById(config.driveFolderId);
    folder.getName();
    return folder;
  } catch (error) {
    throw new Error("The configured Google Drive folder is unavailable");
  }
}

function storePhoto_(requestFolder, photo, index) {
  const maxBase64Length = Math.ceil(INTEGRATION_DEFAULTS.maxFileBytes * 4 / 3) + 8;
  if (photo.data.length > maxBase64Length) {
    throw new Error("An optimised image exceeds the allowed size");
  }

  const bytes = Utilities.base64Decode(photo.data);
  if (bytes.length > INTEGRATION_DEFAULTS.maxFileBytes) {
    throw new Error("An optimised image exceeds the allowed size");
  }
  if (!hasValidImageSignature_(bytes, photo.mimeType)) {
    throw new Error("Image content does not match its declared type");
  }

  const fileName = sanitiseFileName_(photo.name, index, photo.mimeType);
  requestFolder.createFile(Utilities.newBlob(bytes, photo.mimeType, fileName));
  return { name: fileName, mimeType: photo.mimeType, bytes: bytes.length };
}

function storeRequestMetadata_(requestFolder, payload, storedPhotos) {
  const metadata = {
    submissionId: payload.submissionId,
    submittedAt: payload.submittedAt,
    receivedAt: new Date().toISOString(),
    language: payload.language,
    sourceUrl: payload.sourceUrl,
    deliveryMethod: payload.deliveryMethod,
    consent: payload.consent,
    contact: payload.contact,
    property: payload.property,
    photos: storedPhotos
  };
  requestFolder.createFile(
    "solicitud.json",
    JSON.stringify(metadata, null, 2),
    MimeType.PLAIN_TEXT
  );
}

function buildLeadRecord_(payload, receivedAt, storedPhotos, requestFolder, calendarEvent) {
  const property = payload.property;
  return {
    submissionId: payload.submissionId,
    submittedAt: payload.submittedAt,
    receivedAt: receivedAt,
    language: payload.language,
    sourceUrl: payload.sourceUrl,
    deliveryMethod: payload.deliveryMethod,
    consentAccepted: String(payload.consent.accepted),
    consentText: payload.consent.text,
    relationship: payload.contact.relationship,
    name: payload.contact.name,
    email: payload.contact.email,
    phone: payload.contact.phone,
    street: property.street,
    postalCode: property.postalCode,
    city: property.city,
    country: property.country,
    propertyType: property.type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    floor: property.floor,
    totalFloors: property.totalFloors,
    touristRental: property.touristRental,
    listingUrl: property.listingUrl,
    photosUrl: property.photosUrl,
    comments: property.comments,
    photoCount: storedPhotos.length,
    driveFolderId: requestFolder ? requestFolder.getId() : "",
    driveFolderUrl: requestFolder ? requestFolder.getUrl() : "",
    calendarEventId: calendarEvent ? calendarEvent.getId() : "",
    status: "Nuevo"
  };
}

function createCalendarFollowup_(payload, config) {
  if (!config.calendarFollowupEnabled) return null;
  const calendar = getCalendar_(config);
  const start = new Date(Date.now() + config.followupDelayHours * 60 * 60 * 1000);
  const end = new Date(start.getTime() + config.eventDurationMinutes * 60 * 1000);
  const title = "Nueva solicitud web - " + sanitiseText_(payload.contact.name, "Contacto", 60);
  const description = [
    "Referencia: " + payload.submissionId,
    "Contacto: " + payload.contact.name,
    "Email: " + payload.contact.email,
    "Telefono: " + payload.contact.phone,
    "Alojamiento: " + payload.property.type,
    "Ubicacion: " + payload.property.city + ", " + payload.property.country,
    "Canal: " + payload.deliveryMethod
  ].join("\n");
  const location = [
    payload.property.street,
    payload.property.postalCode,
    payload.property.city,
    payload.property.country
  ].filter(Boolean).join(", ");
  const event = calendar.createEvent(title, start, end, {
    description: description,
    location: location
  });
  try {
    event.setTag("hotHostSubmissionId", payload.submissionId);
  } catch (tagError) {
    console.error(tagError);
  }
  return event;
}

function getCalendar_(config) {
  if (!config.calendarId) throw new Error("Google Calendar is not configured");
  const calendar = config.calendarId === "primary"
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(config.calendarId);
  if (!calendar) throw new Error("The configured Google Calendar is unavailable");
  return calendar;
}

function sendLeadNotification_(payload, record, config) {
  if (!config.gmailNotificationEnabled) return false;
  if (!config.notificationEmail) throw new Error("Gmail notification address is not configured");

  const subject = "Nueva solicitud web - " +
    sanitiseText_(payload.contact.name, "Contacto", 60) + " - " +
    sanitiseText_(payload.property.city, "Sin ciudad", 40);
  const body = [
    "Nueva solicitud recibida desde la web de Hot Host Hospitality.",
    "",
    "Referencia: " + payload.submissionId,
    "Nombre: " + payload.contact.name,
    "Email: " + payload.contact.email,
    "Telefono: " + payload.contact.phone,
    "Relacion: " + payload.contact.relationship,
    "Canal elegido: " + payload.deliveryMethod,
    "",
    "Alojamiento: " + payload.property.type,
    "Direccion: " + [
      payload.property.street,
      payload.property.postalCode,
      payload.property.city,
      payload.property.country
    ].filter(Boolean).join(", "),
    "Alquiler turistico: " + payload.property.touristRental,
    payload.property.listingUrl ? "Anuncio: " + payload.property.listingUrl : "",
    payload.property.photosUrl ? "Fotos: " + payload.property.photosUrl : "",
    record.driveFolderUrl ? "Carpeta Drive: " + record.driveFolderUrl : "",
    payload.property.comments ? "Comentarios: " + payload.property.comments : ""
  ].filter(function (line) { return line !== ""; }).join("\n");

  MailApp.sendEmail({
    to: config.notificationEmail,
    subject: subject,
    body: body,
    replyTo: payload.contact.email,
    name: "Hot Host Web"
  });
  return true;
}

function buildFolderName_(payload) {
  const timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd_HHmmss"
  );
  const contactName = sanitiseText_(payload.contact.name, "Contacto", 50);
  const city = sanitiseText_(payload.property.city, "Sin ciudad", 40);
  return timestamp + " - " + contactName + " - " + city + " - " +
    payload.submissionId.slice(0, 8);
}

function sanitiseText_(value, fallback, maxLength) {
  const cleanValue = String(value || "")
    .replace(/[\\/:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleanValue || fallback).slice(0, maxLength);
}

function sanitiseFileName_(value, index, mimeType) {
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  }[mimeType];
  const withoutExtension = String(value || "").replace(/\.[^.]+$/, "");
  const cleanName = sanitiseText_(withoutExtension, "photo-" + (index + 1), 80);
  return cleanName + "." + extension;
}

function hasValidImageSignature_(bytes, mimeType) {
  function byteAt(index) {
    return (Number(bytes[index]) + 256) % 256;
  }

  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 &&
      byteAt(0) === 0xff &&
      byteAt(1) === 0xd8 &&
      byteAt(2) === 0xff;
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every(function (value, index) {
      return byteAt(index) === value;
    });
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12 &&
      byteAt(0) === 0x52 &&
      byteAt(1) === 0x49 &&
      byteAt(2) === 0x46 &&
      byteAt(3) === 0x46 &&
      byteAt(8) === 0x57 &&
      byteAt(9) === 0x45 &&
      byteAt(10) === 0x42 &&
      byteAt(11) === 0x50;
  }
  return false;
}

function createWorkspaceResources() {
  const properties = PropertiesService.getScriptProperties();
  const updates = {};
  let config = getConfiguration_();

  if (!config.spreadsheetId) {
    const spreadsheet = SpreadsheetApp.create("Hot Host - Solicitudes web");
    updates.GOOGLE_SHEETS_SPREADSHEET_ID = spreadsheet.getId();
  }
  if (!config.driveFolderId) {
    const folder = DriveApp.createFolder(INTEGRATION_DEFAULTS.rootFolderName);
    updates.GOOGLE_DRIVE_FOLDER_ID = folder.getId();
  }
  if (config.calendarFollowupEnabled && !config.calendarId) {
    const calendar = CalendarApp.createCalendar("Hot Host - Seguimiento web");
    updates.GOOGLE_CALENDAR_ID = calendar.getId();
  }
  if (Object.keys(updates).length) properties.setProperties(updates, false);
  config = getConfiguration_();
  getLeadsSheet_(config);
  return testConfiguration();
}

function getConfigurationChecklist() {
  const properties = PropertiesService.getScriptProperties();
  const result = {};
  SCRIPT_PROPERTY_KEYS.forEach(function (key) {
    result[key] = Boolean(properties.getProperty(key));
  });
  console.log(JSON.stringify(result));
  return result;
}

function testConfiguration() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const config = getConfiguration_();
  const sheet = getLeadsSheet_(config);
  const result = {
    ok: true,
    spreadsheetName: sheet.getParent().getName(),
    sheetName: sheet.getName(),
    publicSiteUrl: config.publicSiteUrl,
    drive: null,
    calendar: null,
    gmail: null,
    timeZone: Session.getScriptTimeZone()
  };

  if (config.driveFolderId) {
    const folder = getRootFolder_(config);
    result.drive = { folderName: folder.getName(), folderUrl: folder.getUrl() };
  }
  if (config.calendarFollowupEnabled) {
    const calendar = getCalendar_(config);
    result.calendar = { name: calendar.getName(), id: calendar.getId() };
  }
  if (config.gmailNotificationEnabled) {
    if (!config.notificationEmail) throw new Error("Gmail notification address is not configured");
    result.gmail = {
      recipient: config.notificationEmail,
      remainingDailyQuota: MailApp.getRemainingDailyQuota()
    };
  }
  console.log(JSON.stringify(result));
  return result;
}

function testWriteAccess() {
  const config = getConfiguration_();
  const sheet = getLeadsSheet_(config);
  const testId = "test-" + Utilities.getUuid();
  const row = Math.max(2, sheet.getLastRow() + 1);
  sheet.getRange(row, 1).setValue(testId);
  sheet.deleteRow(row);

  const result = { ok: true, sheets: true, drive: false, calendar: false };
  if (config.driveFolderId) {
    const file = getRootFolder_(config).createFile(testId + ".txt", "Hot Host write test", MimeType.PLAIN_TEXT);
    file.setTrashed(true);
    result.drive = true;
  }
  if (config.calendarFollowupEnabled) {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const event = getCalendar_(config).createEvent(
      "Hot Host integration test",
      start,
      new Date(start.getTime() + 5 * 60 * 1000)
    );
    event.deleteEvent();
    result.calendar = true;
  }
  console.log(JSON.stringify(result));
  return result;
}

function purgeExpiredData() {
  const config = getConfiguration_();
  const cutoff = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);
  const result = { sheetRows: 0, driveFolders: 0, calendarEvents: 0 };

  if (config.spreadsheetId) {
    const sheet = getLeadsSheet_(config);
    const headers = ensureLeadHeaders_(sheet);
    const receivedAtIndex = headers.indexOf("receivedAt");
    const driveFolderIndex = headers.indexOf("driveFolderId");
    const calendarEventIndex = headers.indexOf("calendarEventId");

    if (receivedAtIndex !== -1 && sheet.getLastRow() >= 2) {
      const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues();
      for (let index = values.length - 1; index >= 0; index -= 1) {
        const receivedAt = new Date(values[index][receivedAtIndex]);
        if (Number.isNaN(receivedAt.getTime()) || receivedAt >= cutoff) continue;

        if (driveFolderIndex !== -1 && values[index][driveFolderIndex]) {
          try {
            DriveApp.getFolderById(values[index][driveFolderIndex]).setTrashed(true);
            result.driveFolders += 1;
          } catch (driveError) {
            console.error(driveError);
          }
        }
        if (calendarEventIndex !== -1 && values[index][calendarEventIndex] && config.calendarId) {
          try {
            const event = getCalendar_(config).getEventById(values[index][calendarEventIndex]);
            if (event) {
              event.deleteEvent();
              result.calendarEvents += 1;
            }
          } catch (calendarError) {
            console.error(calendarError);
          }
        }
        sheet.deleteRow(index + 2);
        result.sheetRows += 1;
      }
    }
  }

  if (config.driveFolderId) {
    const folders = getRootFolder_(config).getFolders();
    while (folders.hasNext()) {
      const folder = folders.next();
      if (folder.getDateCreated() < cutoff) {
        folder.setTrashed(true);
        result.driveFolders += 1;
      }
    }
  }
  console.log(JSON.stringify(result));
  return result;
}

function purgeExpiredRequestFolders() {
  return purgeExpiredData().driveFolders;
}

function installRetentionCleanupTrigger() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (["purgeExpiredData", "purgeExpiredRequestFolders"].indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("purgeExpiredData")
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
