const INTEGRATION_DEFAULTS = Object.freeze({
  version: "2026-07-27-2",
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
  "status",
  "verificationTokenHash",
  "verificationEmailSentAt",
  "emailVerifiedAt",
  "internalNotificationSentAt",
  "statusUpdatedAt",
  "appointmentAt"
]);

const REQUEST_STATUSES = Object.freeze({
  pendingVerification: "Pendiente de verificación",
  processing: "En proceso",
  confirmed: "Confirmada",
  denied: "Denegada"
});

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
  "GOOGLE_APPS_SCRIPT_WEB_APP_URL",
  "GOOGLE_DATA_RETENTION_DAYS"
]);

function doGet(event) {
  const requestToken = event && event.parameter
    ? String(event.parameter.request || "").trim()
    : "";
  if (requestToken) return renderRequestStatus_(requestToken);

  const config = getConfiguration_();
  return jsonResponse_({
    ok: Boolean(config.spreadsheetId),
    configured: {
      sheets: Boolean(config.spreadsheetId),
      drive: Boolean(config.driveFolderId),
      calendar: Boolean(config.calendarFollowupEnabled && config.calendarId),
      gmail: Boolean(config.gmailNotificationEnabled && config.notificationEmail),
      verification: Boolean(config.webAppUrl)
    },
    service: "Hot Host Google Workspace integration",
    timeZone: Session.getScriptTimeZone(),
    version: INTEGRATION_DEFAULTS.version
  });
}

function doPost(event) {
  let requestFolder = null;
  let reservationCreated = false;
  let leadStored = false;

  try {
    const rawPayload = readPayload_(event);
    if (rawPayload.length > INTEGRATION_DEFAULTS.maxRequestCharacters) {
      throw new Error("Request is too large");
    }

    const payload = JSON.parse(rawPayload);
    if (payload.website) return postResponse_({ ok: true, ignored: true });

    const config = getConfiguration_();
    validatePayload_(payload, config);
    const sheet = getLeadsSheet_(config);
    if (!reserveSubmission_(payload.submissionId, sheet)) {
      return postResponse_({
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

    const receivedAt = new Date().toISOString();
    const verificationToken = createVerificationToken_();
    const record = buildLeadRecord_(
      payload,
      receivedAt,
      storedPhotos,
      requestFolder,
      null,
      hashVerificationToken_(verificationToken)
    );
    const leadRow = appendLead_(sheet, record);
    leadStored = true;
    markSubmissionProcessed_(payload.submissionId);

    let verificationSent = false;
    try {
      verificationSent = sendVerificationEmail_(payload, verificationToken, config);
      if (verificationSent) {
        const verificationEmailSentAt = new Date().toISOString();
        updateLeadFields_(sheet, leadRow, { verificationEmailSentAt: verificationEmailSentAt });
        record.verificationEmailSentAt = verificationEmailSentAt;
      }
    } catch (verificationError) {
      warnings.push("verification-email");
      console.error(verificationError);
    }

    return postResponse_({
      ok: true,
      submissionId: payload.submissionId,
      filesStored: storedPhotos.length,
      verificationSent: verificationSent,
      status: record.status,
      warnings: warnings,
      version: INTEGRATION_DEFAULTS.version
    });
  } catch (error) {
    if (!leadStored) {
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
    return postResponse_({
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
    webAppUrl: getStringProperty_(
      properties,
      "GOOGLE_APPS_SCRIPT_WEB_APP_URL",
      ScriptApp.getService().getUrl() || ""
    ),
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
  const statusColumn = headers.indexOf("status") + 1;
  if (statusColumn && !sheet.getRange(2, statusColumn).getDataValidation()) {
    const allowedStatuses = Object.keys(REQUEST_STATUSES).map(function (key) {
      return REQUEST_STATUSES[key];
    });
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(allowedStatuses, true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange(2, statusColumn, Math.max(1, sheet.getMaxRows() - 1), 1)
      .setDataValidation(statusRule);
  }
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
  const appointmentColumn = headers.indexOf("appointmentAt") + 1;
  if (appointmentColumn) sheet.getRange(row, appointmentColumn).setNumberFormat("dd/mm/yyyy hh:mm");
  return row;
}

function getLeadRecord_(sheet, row) {
  const headers = ensureLeadHeaders_(sheet);
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  return headers.reduce(function (record, header, index) {
    record[header] = values[index];
    return record;
  }, {});
}

function updateLeadFields_(sheet, row, updates) {
  const headers = ensureLeadHeaders_(sheet);
  Object.keys(updates).forEach(function (header) {
    const column = headers.indexOf(header) + 1;
    if (!column) throw new Error("Unknown lead field: " + header);
    sheet.getRange(row, column).setValue(protectSheetValue_(updates[header]));
  });
}

function findVerificationRow_(sheet, tokenHash) {
  const headers = ensureLeadHeaders_(sheet);
  const tokenColumn = headers.indexOf("verificationTokenHash") + 1;
  if (!tokenColumn || sheet.getLastRow() < 2) return 0;
  const match = sheet
    .getRange(2, tokenColumn, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(tokenHash))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : 0;
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

function buildLeadRecord_(payload, receivedAt, storedPhotos, requestFolder, calendarEvent, verificationTokenHash) {
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
    status: REQUEST_STATUSES.pendingVerification,
    verificationTokenHash: verificationTokenHash,
    verificationEmailSentAt: "",
    emailVerifiedAt: "",
    internalNotificationSentAt: "",
    statusUpdatedAt: receivedAt,
    appointmentAt: ""
  };
}

function createVerificationToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
}

function hashVerificationToken_(token) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(token),
    Utilities.Charset.UTF_8
  ).map(function (value) {
    return (value + 256).toString(16).slice(-2);
  }).join("");
}

function buildVerificationUrl_(token, config) {
  const webAppUrl = String(config.webAppUrl || "").trim().replace(/[?#].*$/, "");
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(webAppUrl)) {
    throw new Error("Google Apps Script web app URL is not configured for verification");
  }
  return webAppUrl + "?request=" + encodeURIComponent(token);
}

function getVerificationCopy_(language) {
  if (String(language || "").toLowerCase() !== "es") {
    return {
      emailSubject: "Verify your email - Hot Host Hospitality",
      greeting: "Hello",
      emailIntro: "We have received your property audit request. Verify your email to activate it and allow our team to review it.",
      verifyButton: "Verify email",
      emailNote: "This private button will continue to show the current status of your request. Do not share it.",
      emailFooter: "If you did not send this request, you can ignore this message.",
      pageTitle: "Request status - Hot Host Hospitality",
      verifiedLabel: "Email verified",
      verifiedTitle: "Email verified",
      verifiedText: "You can close this window and use the private button in your email whenever you want to check the status of your request.",
      statusTitle: "Current status",
      reference: "Reference",
      appointment: "Audit or appointment date",
      appointmentPending: "The date has not been assigned yet.",
      close: "Close window",
      invalidTitle: "Invalid private link",
      invalidText: "This verification link is invalid or no longer matches a request.",
      errorTitle: "We could not load the request",
      errorText: "Please try again shortly or contact direccion@hhosthospitality.com.",
      statuses: {
        pending: "Pending verification",
        processing: "In progress",
        confirmed: "Confirmed",
        denied: "Declined"
      }
    };
  }
  return {
    emailSubject: "Verifica tu email - Hot Host Hospitality",
    greeting: "Hola",
    emailIntro: "Hemos recibido tu solicitud de auditoría para una propiedad. Verifica tu email para activarla y permitir que nuestro equipo la revise.",
    verifyButton: "Verificar email",
    emailNote: "Este botón privado seguirá mostrando el estado actualizado de tu solicitud. No lo compartas.",
    emailFooter: "Si no enviaste esta solicitud, puedes ignorar este mensaje.",
    pageTitle: "Estado de solicitud - Hot Host Hospitality",
    verifiedLabel: "Email verificado",
    verifiedTitle: "Mail verificado",
    verifiedText: "Puedes cerrar esta ventana y usar el botón privado de tu email cuando quieras consultar el estado de tu solicitud.",
    statusTitle: "Estado actual",
    reference: "Referencia",
    appointment: "Fecha de cita o auditoría",
    appointmentPending: "La fecha todavía no ha sido asignada.",
    close: "Cerrar ventana",
    invalidTitle: "Enlace privado no válido",
    invalidText: "Este enlace de verificación no es válido o ya no corresponde a una solicitud.",
    errorTitle: "No pudimos cargar la solicitud",
    errorText: "Inténtalo de nuevo en unos minutos o escribe a direccion@hhosthospitality.com.",
    statuses: {
      pending: REQUEST_STATUSES.pendingVerification,
      processing: REQUEST_STATUSES.processing,
      confirmed: REQUEST_STATUSES.confirmed,
      denied: REQUEST_STATUSES.denied
    }
  };
}

function sendVerificationEmail_(payload, token, config) {
  const copy = getVerificationCopy_(payload.language);
  const verificationUrl = buildVerificationUrl_(token, config);
  const contactName = sanitiseText_(payload.contact.name, "", 80);
  const greeting = contactName ? copy.greeting + " " + contactName + "," : copy.greeting + ",";
  const body = [
    greeting,
    "",
    copy.emailIntro,
    "",
    copy.verifyButton + ": " + verificationUrl,
    "",
    copy.emailNote,
    copy.emailFooter
  ].join("\n");
  const htmlBody = [
    '<div style="margin:0;padding:32px 16px;background:#f5f1e8;color:#201a12;font-family:Arial,sans-serif">',
    '<div style="max-width:620px;margin:0 auto;overflow:hidden;border:1px solid #dfd3bd;border-radius:20px;background:#fffdf9;box-shadow:0 18px 50px rgba(52,36,13,.12)">',
    '<div style="padding:24px 30px;background:#131313;color:#fff"><div style="font-size:22px;font-weight:800;letter-spacing:.14em">HOT HOST</div><div style="margin-top:4px;color:#e1aa3f;font-size:11px;font-weight:700;letter-spacing:.24em">HOSPITALITY</div></div>',
    '<div style="padding:34px 30px 30px"><p style="margin:0 0 18px;font-size:17px">' + escapeHtml_(greeting) + '</p>',
    '<h1 style="margin:0 0 14px;color:#201a12;font-family:Georgia,serif;font-size:30px;line-height:1.15">' + escapeHtml_(copy.verifyButton) + '</h1>',
    '<p style="margin:0 0 26px;color:#645846;font-size:16px;line-height:1.65">' + escapeHtml_(copy.emailIntro) + '</p>',
    '<p style="margin:0 0 28px;text-align:center"><a href="' + escapeHtml_(verificationUrl) + '" style="display:inline-block;padding:15px 26px;border-radius:999px;background:#198754;color:#fff;font-size:16px;font-weight:800;text-decoration:none">' + escapeHtml_(copy.verifyButton) + '</a></p>',
    '<div style="padding:16px 18px;border-left:4px solid #e1aa3f;border-radius:8px;background:#faf5e9;color:#665943;font-size:14px;line-height:1.55">' + escapeHtml_(copy.emailNote) + '</div>',
    '<p style="margin:24px 0 0;color:#8a7e6c;font-size:12px;line-height:1.5">' + escapeHtml_(copy.emailFooter) + '</p></div></div></div>'
  ].join("");
  const message = {
    to: payload.contact.email,
    subject: copy.emailSubject,
    body: body,
    htmlBody: htmlBody,
    name: "Hot Host Hospitality"
  };
  if (config.notificationEmail) message.replyTo = config.notificationEmail;
  MailApp.sendEmail(message);
  return true;
}

function renderRequestStatus_(token) {
  const cleanToken = String(token || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(cleanToken)) {
    return buildRequestMessagePage_(getVerificationCopy_("es"), "invalid");
  }

  try {
    const config = getConfiguration_();
    const sheet = getLeadsSheet_(config);
    const row = findVerificationRow_(sheet, hashVerificationToken_(cleanToken));
    if (!row) return buildRequestMessagePage_(getVerificationCopy_("es"), "invalid");

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let record;
    try {
      record = getLeadRecord_(sheet, row);
      const now = new Date().toISOString();
      if (!record.emailVerifiedAt) {
        const nextStatus = getRequestStatusKey_(record.status) === "pending"
          ? REQUEST_STATUSES.processing
          : String(record.status || REQUEST_STATUSES.processing);
        updateLeadFields_(sheet, row, {
          emailVerifiedAt: now,
          status: nextStatus,
          statusUpdatedAt: now
        });
        record.emailVerifiedAt = now;
        record.status = nextStatus;
        record.statusUpdatedAt = now;
      }

      const payload = buildPayloadFromLeadRecord_(record);
      if (config.calendarFollowupEnabled && !record.calendarEventId) {
        try {
          const calendarEvent = createCalendarFollowup_(payload, config);
          if (calendarEvent) {
            record.calendarEventId = calendarEvent.getId();
            updateLeadFields_(sheet, row, { calendarEventId: record.calendarEventId });
          }
        } catch (calendarError) {
          console.error(calendarError);
        }
      }

      if (config.gmailNotificationEnabled && !record.internalNotificationSentAt) {
        try {
          if (sendLeadNotification_(payload, record, config)) {
            record.internalNotificationSentAt = new Date().toISOString();
            updateLeadFields_(sheet, row, {
              internalNotificationSentAt: record.internalNotificationSentAt
            });
          }
        } catch (notificationError) {
          console.error(notificationError);
        }
      }
    } finally {
      lock.releaseLock();
    }
    return buildRequestStatusPage_(record);
  } catch (error) {
    console.error(error);
    return buildRequestMessagePage_(getVerificationCopy_("es"), "error");
  }
}

function buildPayloadFromLeadRecord_(record) {
  return {
    submissionId: String(record.submissionId || ""),
    submittedAt: String(record.submittedAt || ""),
    language: String(record.language || "es"),
    sourceUrl: String(record.sourceUrl || ""),
    deliveryMethod: String(record.deliveryMethod || "email"),
    consent: {
      accepted: /^(true|1|yes)$/i.test(String(record.consentAccepted || "")),
      text: String(record.consentText || "")
    },
    contact: {
      relationship: String(record.relationship || ""),
      name: String(record.name || ""),
      email: String(record.email || ""),
      phone: String(record.phone || "")
    },
    property: {
      street: String(record.street || ""),
      postalCode: String(record.postalCode || ""),
      city: String(record.city || ""),
      country: String(record.country || ""),
      type: String(record.propertyType || ""),
      bedrooms: String(record.bedrooms || ""),
      bathrooms: String(record.bathrooms || ""),
      floor: String(record.floor || ""),
      totalFloors: String(record.totalFloors || ""),
      touristRental: String(record.touristRental || ""),
      listingUrl: String(record.listingUrl || ""),
      photosUrl: String(record.photosUrl || ""),
      comments: String(record.comments || "")
    }
  };
}

function getRequestStatusKey_(status) {
  const normalized = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (normalized.indexOf("deneg") !== -1 || normalized.indexOf("declin") !== -1) return "denied";
  if (normalized.indexOf("confirm") !== -1) return "confirmed";
  if (normalized.indexOf("pend") !== -1 || normalized.indexOf("verific") !== -1) return "pending";
  return "processing";
}

function formatAppointment_(value) {
  if (!value) return "";
  let date = value instanceof Date ? value : null;
  const text = String(value).trim();
  if (!date) {
    const localMatch = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/);
    if (localMatch) {
      date = new Date(
        Number(localMatch[3]),
        Number(localMatch[2]) - 1,
        Number(localMatch[1]),
        Number(localMatch[4] || 0),
        Number(localMatch[5] || 0)
      );
    } else {
      date = new Date(text);
    }
  }
  if (!date || Number.isNaN(date.getTime())) return text;
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
}

function buildRequestStatusPage_(record) {
  const copy = getVerificationCopy_(record.language);
  const statusKey = getRequestStatusKey_(record.status);
  const statusLabel = copy.statuses[statusKey];
  const appointment = statusKey === "confirmed" ? formatAppointment_(record.appointmentAt) : "";
  const appointmentHtml = statusKey === "confirmed"
    ? '<div class="appointment"><span>' + escapeHtml_(copy.appointment) + '</span><strong>' +
      escapeHtml_(appointment || copy.appointmentPending) + '</strong></div>'
    : "";
  const html = '<!doctype html><html lang="' + escapeHtml_(record.language || "es") + '"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><title>' + escapeHtml_(copy.pageTitle) + '</title>' +
    requestPageStyles_() + '</head><body><main class="card">' +
    '<div class="brand"><strong>HOT HOST</strong><span>HOSPITALITY</span></div>' +
    '<div class="verified">&#10003; ' + escapeHtml_(copy.verifiedLabel) + '</div>' +
    '<h1>' + escapeHtml_(copy.verifiedTitle) + '</h1><p class="lead">' + escapeHtml_(copy.verifiedText) + '</p>' +
    '<section class="status"><span>' + escapeHtml_(copy.statusTitle) + '</span><strong class="pill ' + statusKey + '">' + escapeHtml_(statusLabel) + '</strong></section>' +
    appointmentHtml + '<p class="reference">' + escapeHtml_(copy.reference) + ': <strong>' + escapeHtml_(record.submissionId) + '</strong></p>' +
    '<button type="button" onclick="window.close()">' + escapeHtml_(copy.close) + '</button>' +
    '</main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(copy.pageTitle);
}

function buildRequestMessagePage_(copy, kind) {
  const isInvalid = kind === "invalid";
  const title = isInvalid ? copy.invalidTitle : copy.errorTitle;
  const text = isInvalid ? copy.invalidText : copy.errorText;
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">' +
    '<title>' + escapeHtml_(title) + '</title>' + requestPageStyles_() + '</head><body>' +
    '<main class="card"><div class="brand"><strong>HOT HOST</strong><span>HOSPITALITY</span></div>' +
    '<h1>' + escapeHtml_(title) + '</h1><p class="lead">' + escapeHtml_(text) + '</p></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title);
}

function requestPageStyles_() {
  return '<style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at top,#fff8e7,#eee4d2 70%);color:#241d14;font-family:Arial,sans-serif}.card{width:min(680px,calc(100vw - 32px));padding:38px;border:1px solid #dfd0b6;border-radius:26px;background:#fffdf9;box-shadow:0 24px 70px rgba(62,43,17,.16)}.brand{margin:-38px -38px 32px;padding:25px 38px;border-radius:26px 26px 0 0;background:#131313;color:#fff}.brand strong{display:block;font-size:22px;letter-spacing:.14em}.brand span{display:block;margin-top:4px;color:#e1aa3f;font-size:11px;font-weight:800;letter-spacing:.24em}.verified{display:inline-flex;gap:8px;align-items:center;padding:8px 13px;border-radius:999px;background:#e6f5eb;color:#126c3e;font-size:13px;font-weight:800}h1{margin:18px 0 12px;font:700 clamp(32px,7vw,52px)/1.05 Georgia,serif}.lead{margin:0;color:#685c49;font-size:17px;line-height:1.65}.status,.appointment{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:28px;padding:18px 20px;border:1px solid #eadfcf;border-radius:16px;background:#faf6ed}.status>span,.appointment span{color:#776a57;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.pill{padding:8px 13px;border-radius:999px;font-size:14px}.pill.pending{background:#fff2c7;color:#725200}.pill.processing{background:#e8f0ff;color:#254d91}.pill.confirmed{background:#e6f5eb;color:#126c3e}.pill.denied{background:#fbe8e8;color:#963535}.appointment strong{text-align:right}.reference{margin:22px 0 0;color:#817563;font-size:13px;overflow-wrap:anywhere}button{margin-top:28px;padding:13px 21px;border:0;border-radius:999px;background:#198754;color:#fff;font-size:15px;font-weight:800;cursor:pointer}@media(max-width:520px){.card{padding:26px}.brand{margin:-26px -26px 26px;padding:22px 26px}.status,.appointment{align-items:flex-start;flex-direction:column}.appointment strong{text-align:left}}</style>';
}

function escapeHtml_(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  const subject = "Nueva solicitud web verificada - " +
    sanitiseText_(payload.contact.name, "Contacto", 60) + " - " +
    sanitiseText_(payload.property.city, "Sin ciudad", 40);
  const body = [
    "Nueva solicitud con email verificado recibida desde la web de Hot Host Hospitality.",
    "",
    "Referencia: " + payload.submissionId,
    "Estado: " + record.status,
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

function recoverWorkspaceConfiguration() {
  const properties = PropertiesService.getScriptProperties();
  const updates = {};

  function setIfMissing(name, value) {
    const currentValue = properties.getProperty(name);
    if ((!currentValue || !String(currentValue).trim()) && value !== undefined && value !== null && value !== "") {
      updates[name] = String(value);
    }
  }

  setIfMissing("PUBLIC_SITE_URL", INTEGRATION_DEFAULTS.publicSiteUrl);
  setIfMissing("GOOGLE_SHEETS_LEADS_SHEET", INTEGRATION_DEFAULTS.leadsSheetName);
  setIfMissing("GOOGLE_CALENDAR_FOLLOWUP_DELAY_HOURS", INTEGRATION_DEFAULTS.followupDelayHours);
  setIfMissing("GOOGLE_CALENDAR_EVENT_DURATION_MINUTES", INTEGRATION_DEFAULTS.eventDurationMinutes);
  setIfMissing("GOOGLE_GMAIL_NOTIFICATION_ENABLED", "true");
  setIfMissing("GOOGLE_GMAIL_NOTIFICATION_TO", Session.getEffectiveUser().getEmail());
  setIfMissing("GOOGLE_DATA_RETENTION_DAYS", INTEGRATION_DEFAULTS.retentionDays);
  setIfMissing("GOOGLE_APPS_SCRIPT_WEB_APP_URL", ScriptApp.getService().getUrl());

  if (!properties.getProperty("GOOGLE_SHEETS_SPREADSHEET_ID")) {
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
    let bestSpreadsheetId = "";
    let bestScore = -1;
    while (files.hasNext()) {
      const file = files.next();
      try {
        const spreadsheet = SpreadsheetApp.openById(file.getId());
        const sheet = spreadsheet.getSheetByName(INTEGRATION_DEFAULTS.leadsSheetName);
        if (!sheet) continue;
        const preferredName = file.getName() === "Hot Host - Solicitudes web" ? 100000 : 0;
        const relatedName = /hot host|solicitud/i.test(file.getName()) ? 10000 : 0;
        const score = preferredName + relatedName + sheet.getLastRow();
        if (score > bestScore) {
          bestSpreadsheetId = file.getId();
          bestScore = score;
        }
      } catch (spreadsheetError) {
        console.error(spreadsheetError);
      }
    }
    if (!bestSpreadsheetId) throw new Error("A spreadsheet with the Solicitudes web tab was not found");
    updates.GOOGLE_SHEETS_SPREADSHEET_ID = bestSpreadsheetId;
  }

  if (!properties.getProperty("GOOGLE_DRIVE_FOLDER_ID")) {
    const folders = DriveApp.getFoldersByName(INTEGRATION_DEFAULTS.rootFolderName);
    if (!folders.hasNext()) throw new Error("Existing Hot Host Drive folder was not found");
    updates.GOOGLE_DRIVE_FOLDER_ID = folders.next().getId();
  }

  if (!properties.getProperty("GOOGLE_CALENDAR_ID")) {
    const calendars = CalendarApp.getCalendarsByName("Hot Host - Seguimiento web");
    if (calendars.length) {
      updates.GOOGLE_CALENDAR_ID = calendars[0].getId();
      setIfMissing("GOOGLE_CALENDAR_FOLLOWUP_ENABLED", "true");
    }
  }

  if (Object.keys(updates).length) properties.setProperties(updates, false);
  const result = testConfiguration();
  console.log(JSON.stringify({ recovered: Object.keys(updates), configuration: result }));
  return result;
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
    webAppUrl: config.webAppUrl,
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

function postResponse_(value) {
  const siteUrl = getStringProperty_(
    PropertiesService.getScriptProperties(),
    "PUBLIC_SITE_URL",
    INTEGRATION_DEFAULTS.publicSiteUrl
  );
  const originMatch = String(siteUrl).match(/^https:\/\/[^/]+/i);
  const targetOrigin = originMatch ? originMatch[0] : "*";
  const result = JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>var message={source:"hot-host-workspace",result:' + result + '};var origin=' +
    JSON.stringify(targetOrigin) + ';window.parent.postMessage(message,origin);' +
    'if(window.top!==window.parent){window.top.postMessage(message,origin);}<\/script></body></html>';
  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
