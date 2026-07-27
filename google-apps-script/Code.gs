const INTEGRATION_DEFAULTS = Object.freeze({
  version: "2026-07-27-5",
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
  bookingDaysAhead: 14,
  bookingMinLeadHours: 24,
  bookingStartHour: 11,
  bookingEndHour: 14,
  bookingBufferMinutes: 30,
  bookingWeekdays: [1, 2, 3, 4],
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
  "meetingUrl",
  "status",
  "verificationTokenHash",
  "bookingTokenHash",
  "adminTokenHash",
  "verificationEmailSentAt",
  "emailVerifiedAt",
  "internalNotificationSentAt",
  "adminDecisionAt",
  "adminDecisionEmailSentAt",
  "visitorDecisionAt",
  "appointmentReviewEmailSentAt",
  "visitorConfirmationSentAt",
  "finalNotificationSentAt",
  "statusUpdatedAt",
  "appointmentAt"
]);

const REQUEST_STATUSES = Object.freeze({
  pendingVerification: "Pendiente de verificación",
  processing: "En proceso",
  scheduling: "Pendiente de cita",
  awaitingConfirmation: "Cita pendiente de confirmación",
  confirmed: "Confirmada",
  denied: "Denegada",
  declined: "Cita rechazada por el solicitante"
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
  "GOOGLE_CALENDAR_BOOKING_DAYS_AHEAD",
  "GOOGLE_CALENDAR_BOOKING_MIN_LEAD_HOURS",
  "GOOGLE_CALENDAR_BOOKING_START_HOUR",
  "GOOGLE_CALENDAR_BOOKING_END_HOUR",
  "GOOGLE_CALENDAR_BOOKING_BUFFER_MINUTES",
  "GOOGLE_GMAIL_NOTIFICATION_ENABLED",
  "GOOGLE_GMAIL_NOTIFICATION_TO",
  "GOOGLE_APPS_SCRIPT_WEB_APP_URL",
  "GOOGLE_DATA_RETENTION_DAYS"
]);

function doGet(event) {
  const adminToken = event && event.parameter
    ? String(event.parameter.admin || "").trim()
    : "";
  if (adminToken) return renderAdminReview_(adminToken);

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
  const workflowAction = event && event.parameter
    ? String(event.parameter.action || "").trim()
    : "";
  if (workflowAction) return handleWorkflowPost_(event, workflowAction);

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
    eventDurationMinutes: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_EVENT_DURATION_MINUTES",
      INTEGRATION_DEFAULTS.eventDurationMinutes,
      5,
      480
    ),
    bookingDaysAhead: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_BOOKING_DAYS_AHEAD",
      INTEGRATION_DEFAULTS.bookingDaysAhead,
      1,
      90
    ),
    bookingMinLeadHours: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_BOOKING_MIN_LEAD_HOURS",
      getIntegerProperty_(
        properties,
        "GOOGLE_CALENDAR_FOLLOWUP_DELAY_HOURS",
        INTEGRATION_DEFAULTS.bookingMinLeadHours,
        0,
        720
      ),
      0,
      720
    ),
    bookingStartHour: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_BOOKING_START_HOUR",
      INTEGRATION_DEFAULTS.bookingStartHour,
      0,
      23
    ),
    bookingEndHour: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_BOOKING_END_HOUR",
      INTEGRATION_DEFAULTS.bookingEndHour,
      1,
      24
    ),
    bookingBufferMinutes: getIntegerProperty_(
      properties,
      "GOOGLE_CALENDAR_BOOKING_BUFFER_MINUTES",
      INTEGRATION_DEFAULTS.bookingBufferMinutes,
      0,
      240
    ),
    bookingWeekdays: INTEGRATION_DEFAULTS.bookingWeekdays.slice(),
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
  if (statusColumn) {
    const allowedStatuses = Object.keys(REQUEST_STATUSES).map(function (key) {
      return REQUEST_STATUSES[key];
    });
    const currentRule = sheet.getRange(2, statusColumn).getDataValidation();
    const currentStatuses = currentRule &&
      currentRule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST
      ? currentRule.getCriteriaValues()[0].map(String)
      : [];
    const validationIsCurrent = currentStatuses.length === allowedStatuses.length &&
      allowedStatuses.every(function (status, index) { return currentStatuses[index] === status; });
    if (!validationIsCurrent) {
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(allowedStatuses, true)
        .setAllowInvalid(true)
        .build();
      sheet.getRange(2, statusColumn, Math.max(1, sheet.getMaxRows() - 1), 1)
        .setDataValidation(statusRule);
    }
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
  return findTokenRow_(sheet, "verificationTokenHash", tokenHash);
}

function findRequestTokenRow_(sheet, tokenHash) {
  return findTokenRow_(sheet, "verificationTokenHash", tokenHash) ||
    findTokenRow_(sheet, "bookingTokenHash", tokenHash);
}

function findAdminTokenRow_(sheet, tokenHash) {
  return findTokenRow_(sheet, "adminTokenHash", tokenHash);
}

function findTokenRow_(sheet, header, tokenHash) {
  const headers = ensureLeadHeaders_(sheet);
  const tokenColumn = headers.indexOf(header) + 1;
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
    meetingUrl: "",
    status: REQUEST_STATUSES.pendingVerification,
    verificationTokenHash: verificationTokenHash,
    bookingTokenHash: "",
    adminTokenHash: "",
    verificationEmailSentAt: "",
    emailVerifiedAt: "",
    internalNotificationSentAt: "",
    adminDecisionAt: "",
    adminDecisionEmailSentAt: "",
    visitorDecisionAt: "",
    appointmentReviewEmailSentAt: "",
    visitorConfirmationSentAt: "",
    finalNotificationSentAt: "",
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
  return buildPublicWorkflowUrl_("request", token, config);
}

function buildAdminReviewUrl_(token, config) {
  return buildPublicWorkflowUrl_("admin", token, config);
}

function buildPublicWorkflowUrl_(parameter, token, config) {
  if (["request", "admin"].indexOf(parameter) === -1) {
    throw new Error("Invalid private link type");
  }
  const siteUrl = String(config.publicSiteUrl || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\/[^/?#]+(?:\/[^?#]*)?$/.test(siteUrl)) {
    throw new Error("Public site URL is not configured");
  }
  return siteUrl + "/solicitud.html#" + parameter + "=" + encodeURIComponent(token);
}

function getWebAppUrl_(config) {
  const webAppUrl = String(config.webAppUrl || "").trim().replace(/[?#].*$/, "");
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(webAppUrl)) {
    throw new Error("Google Apps Script web app URL is not configured");
  }
  return webAppUrl;
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
      schedulingEmailSubject: "Choose your appointment - Hot Host Hospitality",
      schedulingEmailTitle: "Your request has been approved",
      schedulingEmailIntro: "Choose one of the available appointment times to continue with your property audit. Your selection will remain pending until our team confirms it.",
      schedulingButton: "Choose appointment",
      schedulingEmailNote: "Appointments are available Monday to Thursday from 11:00 to 14:00 (Madrid time). Each appointment lasts 30 minutes, with a 30-minute interval between appointments.",
      denialEmailSubject: "Update on your request - Hot Host Hospitality",
      denialEmailTitle: "Request declined",
      denialEmailText: "After reviewing the information, we cannot continue with this request at this time.",
      confirmationEmailSubject: "Appointment confirmed - Hot Host Hospitality",
      confirmationEmailTitle: "Your appointment is confirmed",
      confirmationEmailText: "We have reserved the following appointment for your property audit.",
      meetingDescriptionLabel: "Meeting description",
      addCalendarButton: "Add to Google Calendar",
      joinMeetButton: "Join Google Meet",
      declineEmailSubject: "Appointment declined - Hot Host Hospitality",
      declineEmailTitle: "Decision recorded",
      declineEmailText: "We have recorded that you do not wish to continue with the appointment.",
      pageTitle: "Request status - Hot Host Hospitality",
      verifiedLabel: "Email verified",
      verifiedTitle: "Email verified",
      verifiedText: "You can close this window and use the private button in your email whenever you want to check the status of your request.",
      statusTitle: "Current status",
      reference: "Reference",
      appointment: "Audit or appointment date (Madrid time)",
      appointmentPending: "The date has not been assigned yet.",
      scheduleTitle: "Choose your appointment",
      scheduleIntro: "Your request has been approved. Select an available date and time below.",
      scheduleWindow: "Monday to Thursday, 11:00-14:00 (Madrid time). 30-minute appointments with a 30-minute interval.",
      selectSlot: "Available appointments",
      confirmAppointment: "Select appointment",
      declineAppointment: "Decline and close request",
      noSlots: "There are no available appointments in the next 14 days. Please try again later or contact us by email.",
      slotUnavailable: "That appointment is no longer available. Choose another time from the updated list.",
      appointmentConfirmedTitle: "Appointment confirmed",
      appointmentConfirmedText: "Your appointment has been reserved. You can return to this private page to check the date and time.",
      awaitingConfirmationTitle: "Appointment selected",
      awaitingConfirmationText: "Our team must confirm your selected date and time. You will receive a final email when the appointment is added to the calendar.",
      appointmentDeniedEmailSubject: "Appointment not confirmed - Hot Host Hospitality",
      appointmentDeniedEmailTitle: "Appointment not confirmed",
      appointmentDeniedEmailText: "Our team could not confirm the selected appointment. This request has been closed.",
      requestDeniedTitle: "Request declined",
      requestDeniedText: "This request has been closed after our team's review.",
      appointmentDeclinedTitle: "Appointment declined",
      appointmentDeclinedText: "We have recorded your decision and notified our team.",
      close: "Close window",
      invalidTitle: "Invalid private link",
      invalidText: "This verification link is invalid or no longer matches a request.",
      errorTitle: "We could not load the request",
      errorText: "Please try again shortly or contact direccion@hhosthospitality.com.",
      statuses: {
        pending: "Pending verification",
        processing: "In progress",
        scheduling: "Appointment pending",
        awaiting: "Pending final confirmation",
        confirmed: "Confirmed",
        denied: "Declined",
        declined: "Declined by applicant"
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
    schedulingEmailSubject: "Elige tu cita - Hot Host Hospitality",
    schedulingEmailTitle: "Tu solicitud ha sido aprobada",
    schedulingEmailIntro: "Elige uno de los horarios disponibles para continuar con la auditoría de tu propiedad. La fecha quedará pendiente hasta que nuestro equipo la confirme.",
    schedulingButton: "Elegir cita",
    schedulingEmailNote: "Las citas están disponibles de lunes a jueves, de 11:00 a 14:00 (hora de Madrid). Cada cita dura 30 minutos y dejamos 30 minutos entre citas.",
    denialEmailSubject: "Actualización de tu solicitud - Hot Host Hospitality",
    denialEmailTitle: "Solicitud denegada",
    denialEmailText: "Después de revisar la información, en este momento no podemos continuar con esta solicitud.",
    confirmationEmailSubject: "Cita confirmada - Hot Host Hospitality",
    confirmationEmailTitle: "Tu cita está confirmada",
    confirmationEmailText: "Hemos reservado la siguiente cita para la auditoría de tu propiedad.",
    meetingDescriptionLabel: "Descripción de la reunión",
    addCalendarButton: "Añadir a Google Calendar",
    joinMeetButton: "Unirse a Google Meet",
    declineEmailSubject: "Cita rechazada - Hot Host Hospitality",
    declineEmailTitle: "Decisión registrada",
    declineEmailText: "Hemos registrado que no deseas continuar con la cita.",
    pageTitle: "Estado de solicitud - Hot Host Hospitality",
    verifiedLabel: "Email verificado",
    verifiedTitle: "Mail verificado",
    verifiedText: "Puedes cerrar esta ventana y usar el botón privado de tu email cuando quieras consultar el estado de tu solicitud.",
    statusTitle: "Estado actual",
    reference: "Referencia",
    appointment: "Fecha de cita o auditoría (hora de Madrid)",
    appointmentPending: "La fecha todavía no ha sido asignada.",
    scheduleTitle: "Elige tu cita",
    scheduleIntro: "Tu solicitud ha sido aprobada. Selecciona una fecha y una hora disponibles.",
    scheduleWindow: "De lunes a jueves, de 11:00 a 14:00 (hora de Madrid). Citas de 30 minutos con 30 minutos de separación.",
    selectSlot: "Citas disponibles",
    confirmAppointment: "Seleccionar fecha",
    declineAppointment: "Rechazar y cerrar solicitud",
    noSlots: "No quedan citas disponibles durante los próximos 14 días. Inténtalo de nuevo más tarde o escríbenos por email.",
    slotUnavailable: "Esa cita ya no está disponible. Elige otra hora de la lista actualizada.",
    appointmentConfirmedTitle: "Cita confirmada",
    appointmentConfirmedText: "Tu cita ha quedado reservada. Puedes volver a esta página privada para consultar la fecha y la hora.",
    awaitingConfirmationTitle: "Fecha seleccionada",
    awaitingConfirmationText: "Nuestro equipo debe confirmar definitivamente la fecha y la hora elegidas. Recibirás un último email cuando la cita se añada al calendario.",
    appointmentDeniedEmailSubject: "Cita no confirmada - Hot Host Hospitality",
    appointmentDeniedEmailTitle: "Cita no confirmada",
    appointmentDeniedEmailText: "Nuestro equipo no ha podido confirmar la cita seleccionada. La solicitud ha quedado cerrada.",
    requestDeniedTitle: "Solicitud denegada",
    requestDeniedText: "La solicitud ha sido cerrada después de la revisión de nuestro equipo.",
    appointmentDeclinedTitle: "Cita rechazada",
    appointmentDeclinedText: "Hemos registrado tu decisión y avisado a nuestro equipo.",
    close: "Cerrar ventana",
    invalidTitle: "Enlace privado no válido",
    invalidText: "Este enlace de verificación no es válido o ya no corresponde a una solicitud.",
    errorTitle: "No pudimos cargar la solicitud",
    errorText: "Inténtalo de nuevo en unos minutos o escribe a direccion@hhosthospitality.com.",
    statuses: {
      pending: REQUEST_STATUSES.pendingVerification,
      processing: REQUEST_STATUSES.processing,
      scheduling: REQUEST_STATUSES.scheduling,
      awaiting: REQUEST_STATUSES.awaitingConfirmation,
      confirmed: REQUEST_STATUSES.confirmed,
      denied: REQUEST_STATUSES.denied,
      declined: "Cita rechazada"
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
    const row = findRequestTokenRow_(sheet, hashVerificationToken_(cleanToken));
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
      if (
        config.gmailNotificationEnabled &&
        getRequestStatusKey_(record.status) === "processing" &&
        (!record.internalNotificationSentAt || !record.adminTokenHash)
      ) {
        const adminToken = createVerificationToken_();
        try {
          record.adminTokenHash = hashVerificationToken_(adminToken);
          updateLeadFields_(sheet, row, { adminTokenHash: record.adminTokenHash });
          if (sendLeadNotification_(payload, record, adminToken, config)) {
            record.internalNotificationSentAt = new Date().toISOString();
            updateLeadFields_(sheet, row, {
              internalNotificationSentAt: record.internalNotificationSentAt
            });
          }
        } catch (notificationError) {
          record.adminTokenHash = "";
          updateLeadFields_(sheet, row, { adminTokenHash: "" });
          console.error(notificationError);
        }
      }
    } finally {
      lock.releaseLock();
    }
    return buildRequestStatusPage_(record, cleanToken, config, null, sheet);
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
  if (normalized === "cita pendiente de confirmacion" || normalized.indexOf("final confirmation") !== -1) {
    return "awaiting";
  }
  if (normalized === "pendiente de cita" || normalized.indexOf("appointment pending") !== -1) {
    return "scheduling";
  }
  if (normalized.indexOf("rechaz") !== -1 || normalized.indexOf("applicant") !== -1) {
    return "declined";
  }
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

function buildRequestStatusPage_(record, token, config, notice, sheet) {
  const copy = getVerificationCopy_(record.language);
  const statusKey = getRequestStatusKey_(record.status);
  const statusLabel = copy.statuses[statusKey] || String(record.status || "");
  const showsAppointment = statusKey === "awaiting" || statusKey === "confirmed" ||
    (statusKey === "denied" && Boolean(record.appointmentAt));
  const appointment = showsAppointment ? formatAppointment_(record.appointmentAt) : "";
  const appointmentHtml = showsAppointment
    ? '<div class="appointment"><span>' + escapeHtml_(copy.appointment) + '</span><strong>' +
      escapeHtml_(appointment || copy.appointmentPending) + '</strong></div>'
    : "";
  let heading = copy.verifiedTitle;
  let lead = copy.verifiedText;
  if (statusKey === "scheduling") {
    heading = copy.scheduleTitle;
    lead = copy.scheduleIntro;
  } else if (statusKey === "awaiting") {
    heading = copy.awaitingConfirmationTitle;
    lead = copy.awaitingConfirmationText;
  } else if (statusKey === "confirmed") {
    heading = copy.appointmentConfirmedTitle;
    lead = copy.appointmentConfirmedText;
  } else if (statusKey === "denied") {
    heading = copy.requestDeniedTitle;
    lead = copy.requestDeniedText;
  } else if (statusKey === "declined") {
    heading = copy.appointmentDeclinedTitle;
    lead = copy.appointmentDeclinedText;
  }
  const schedulingHtml = statusKey === "scheduling"
    ? buildSchedulingFormHtml_(record, token, config, copy, sheet)
    : "";
  const noticeHtml = notice
    ? '<p class="notice warning">' + escapeHtml_(notice) + '</p>'
    : "";
  const html = '<!doctype html><html lang="' + escapeHtml_(record.language || "es") + '"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><title>' + escapeHtml_(copy.pageTitle) + '</title>' +
    requestPageStyles_() + workflowPageStyles_() + '</head><body><main class="card">' +
    '<div class="brand"><strong>HOT HOST</strong><span>HOSPITALITY</span></div>' +
    '<div class="verified">&#10003; ' + escapeHtml_(copy.verifiedLabel) + '</div>' +
    '<h1>' + escapeHtml_(heading) + '</h1><p class="lead">' + escapeHtml_(lead) + '</p>' +
    '<section class="status"><span>' + escapeHtml_(copy.statusTitle) + '</span><strong class="pill ' + statusKey + '">' + escapeHtml_(statusLabel) + '</strong></section>' +
    appointmentHtml + noticeHtml + schedulingHtml + '<p class="reference">' + escapeHtml_(copy.reference) + ': <strong>' + escapeHtml_(record.submissionId) + '</strong></p>' +
    '<button type="button" onclick="window.close()">' + escapeHtml_(copy.close) + '</button>' +
    '</main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(copy.pageTitle);
}

function buildSchedulingFormHtml_(record, token, config, copy, sheet) {
  let slots = [];
  try {
    slots = getAvailableBookingSlots_(config, sheet);
  } catch (error) {
    console.error(error);
  }
  const actionUrl = getWebAppUrl_(config);
  const cleanToken = String(token || "");
  const slotsHtml = slots.map(function (slot) {
    const formatted = formatBookingSlot_(slot, record.language, config.eventDurationMinutes);
    return '<label class="slot"><input type="radio" name="slot" value="' +
      escapeHtml_(slot.toISOString()) + '" required><span><strong>' +
      escapeHtml_(formatted.day) + '</strong><small>' + escapeHtml_(formatted.time) + '</small></span></label>';
  }).join("");
  const bookingForm = slots.length
    ? '<form class="booking-form" method="post" target="_top" action="' + escapeHtml_(actionUrl) + '">' +
      '<input type="hidden" name="action" value="book"><input type="hidden" name="request" value="' +
      escapeHtml_(cleanToken) + '"><fieldset><legend>' + escapeHtml_(copy.selectSlot) +
      '</legend><div class="slots">' + slotsHtml + '</div></fieldset><button type="submit">' +
      escapeHtml_(copy.confirmAppointment) + '</button></form>'
    : '<p class="no-slots">' + escapeHtml_(copy.noSlots) + '</p>';
  return '<section class="scheduler"><p class="schedule-window">' + escapeHtml_(copy.scheduleWindow) +
    '</p>' + bookingForm + '<form class="decline-form" method="post" target="_top" action="' + escapeHtml_(actionUrl) +
    '"><input type="hidden" name="action" value="decline"><input type="hidden" name="request" value="' +
    escapeHtml_(cleanToken) + '"><button class="danger" type="submit">' +
    escapeHtml_(copy.declineAppointment) + '</button></form></section>';
}

function formatBookingSlot_(start, language, durationMinutes) {
  const isSpanish = String(language || "").toLowerCase() === "es";
  const weekdays = isSpanish
    ? ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = isSpanish
    ? ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const timeZone = Session.getScriptTimeZone();
  const localDate = Utilities.formatDate(start, timeZone, "yyyy-MM-dd").split("-").map(Number);
  const localDay = new Date(Date.UTC(localDate[0], localDate[1] - 1, localDate[2]));
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const day = isSpanish
    ? weekdays[localDay.getUTCDay()] + ", " + localDate[2] + " de " + months[localDate[1] - 1]
    : weekdays[localDay.getUTCDay()] + ", " + months[localDate[1] - 1] + " " + localDate[2];
  return {
    day: day.charAt(0).toUpperCase() + day.slice(1),
    time: Utilities.formatDate(start, timeZone, "HH:mm") + " - " +
      Utilities.formatDate(end, timeZone, "HH:mm")
  };
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

function handleWorkflowPost_(event, workflowAction) {
  try {
    if (workflowAction === "admin-approve") {
      return handleAdminDecision_(event.parameter.admin, "approve");
    }
    if (workflowAction === "admin-deny") {
      return handleAdminDecision_(event.parameter.admin, "deny");
    }
    if (workflowAction === "admin-confirm-appointment") {
      return handleAdminDecision_(event.parameter.admin, "confirmAppointment");
    }
    if (workflowAction === "admin-deny-appointment") {
      return handleAdminDecision_(event.parameter.admin, "denyAppointment");
    }
    if (workflowAction === "book" || workflowAction === "decline") {
      return handleVisitorDecision_(
        event.parameter.request,
        workflowAction,
        event.parameter.slot || ""
      );
    }
    throw new Error("Unknown workflow action");
  } catch (error) {
    console.error(error);
    return buildWorkflowMessagePage_(
      "No pudimos completar la acción",
      "El enlace puede no ser válido o el estado de la solicitud ha cambiado. Vuelve a abrir el último correo recibido o escribe a direccion@hhosthospitality.com."
    );
  }
}

function renderAdminReview_(token) {
  const cleanToken = String(token || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(cleanToken)) {
    return buildWorkflowMessagePage_("Enlace privado no válido", "Abre el enlace incluido en el último correo de revisión.");
  }
  try {
    const config = getConfiguration_();
    const sheet = getLeadsSheet_(config);
    const row = findAdminTokenRow_(sheet, hashVerificationToken_(cleanToken));
    if (!row) {
      return buildWorkflowMessagePage_("Enlace privado no válido", "La revisión no corresponde a una solicitud activa.");
    }
    return buildAdminReviewPage_(getLeadRecord_(sheet, row), cleanToken, config, null);
  } catch (error) {
    console.error(error);
    return buildWorkflowMessagePage_("No pudimos cargar la solicitud", "Inténtalo de nuevo en unos minutos.");
  }
}

function handleAdminDecision_(token, decision) {
  const cleanToken = requirePrivateToken_(token);
  const config = getConfiguration_();
  const sheet = getLeadsSheet_(config);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const row = findAdminTokenRow_(sheet, hashVerificationToken_(cleanToken));
    if (!row) throw new Error("Invalid admin token");
    const record = getLeadRecord_(sheet, row);
    if (!record.emailVerifiedAt) throw new Error("Email has not been verified");
    let statusKey = getRequestStatusKey_(record.status);
    let notice = null;

    if (decision === "approve") {
      if (!config.calendarFollowupEnabled || !config.calendarId) {
        throw new Error("Google Calendar is not enabled for booking");
      }
      if (statusKey === "processing") {
        deleteLegacyFollowup_(record, config);
        const decidedAt = new Date().toISOString();
        applyLeadUpdates_(sheet, row, record, {
          status: REQUEST_STATUSES.scheduling,
          calendarEventId: "",
          meetingUrl: "",
          appointmentAt: "",
          adminDecisionAt: decidedAt,
          adminDecisionEmailSentAt: "",
          visitorDecisionAt: "",
          appointmentReviewEmailSentAt: "",
          visitorConfirmationSentAt: "",
          finalNotificationSentAt: "",
          statusUpdatedAt: decidedAt
        });
        statusKey = "scheduling";
      }
      if (statusKey !== "scheduling") {
        notice = { text: "La solicitud ya tiene una decisión final y no se ha modificado.", type: "warning" };
      } else if (record.adminDecisionEmailSentAt) {
        notice = { text: "La solicitud ya está aprobada y el correo de horarios ya fue enviado.", type: "success" };
      } else {
        const bookingToken = createVerificationToken_();
        applyLeadUpdates_(sheet, row, record, {
          bookingTokenHash: hashVerificationToken_(bookingToken)
        });
        try {
          sendSchedulingEmail_(record, bookingToken, config);
          const sentAt = new Date().toISOString();
          applyLeadUpdates_(sheet, row, record, { adminDecisionEmailSentAt: sentAt });
          notice = { text: "Solicitud aprobada. El visitante ha recibido el correo para elegir una cita.", type: "success" };
        } catch (emailError) {
          console.error(emailError);
          notice = { text: "La solicitud quedó aprobada, pero el correo no pudo enviarse. Usa Reenviar horarios para intentarlo de nuevo.", type: "warning" };
        }
      }
    } else if (decision === "deny") {
      if (statusKey === "processing" || statusKey === "scheduling") {
        if (statusKey === "processing") deleteLegacyFollowup_(record, config);
        const decidedAt = new Date().toISOString();
        applyLeadUpdates_(sheet, row, record, {
          status: REQUEST_STATUSES.denied,
          calendarEventId: "",
          meetingUrl: "",
          appointmentAt: "",
          adminDecisionAt: decidedAt,
          adminDecisionEmailSentAt: "",
          statusUpdatedAt: decidedAt
        });
        statusKey = "denied";
      }
      if (statusKey !== "denied") {
        notice = { text: "La solicitud ya tiene una decisión final y no se ha modificado.", type: "warning" };
      } else if (record.adminDecisionEmailSentAt) {
        notice = { text: "La denegación ya fue comunicada al visitante.", type: "success" };
      } else {
        try {
          sendVisitorDenialEmail_(record, config);
          const sentAt = new Date().toISOString();
          applyLeadUpdates_(sheet, row, record, { adminDecisionEmailSentAt: sentAt });
          notice = { text: "Solicitud denegada. El visitante ha recibido la notificación.", type: "success" };
        } catch (emailError) {
          console.error(emailError);
          notice = { text: "La solicitud quedó denegada, pero el correo no pudo enviarse. Puedes reintentar desde esta página.", type: "warning" };
        }
      }
    } else if (decision === "confirmAppointment") {
      if (statusKey === "awaiting") {
        if (!isSelectedAppointmentAvailable_(record, config, sheet)) {
          notice = { text: "La hora seleccionada ya no está disponible. Deniega la cita para que el cliente reciba el aviso.", type: "warning" };
        } else {
          const event = createBookingEvent_(record, new Date(String(record.appointmentAt)), config);
          const confirmedAt = new Date().toISOString();
          try {
            applyLeadUpdates_(sheet, row, record, {
              calendarEventId: event.id,
              meetingUrl: event.meetingUrl,
              status: REQUEST_STATUSES.confirmed,
              adminDecisionAt: confirmedAt,
              visitorConfirmationSentAt: "",
              finalNotificationSentAt: "",
              statusUpdatedAt: confirmedAt
            });
          } catch (sheetError) {
            deleteBookingEvent_(event, config);
            throw sheetError;
          }
          statusKey = "confirmed";
        }
      }
      if (statusKey !== "confirmed") {
        if (!notice) notice = { text: "La cita no está pendiente de confirmación y no se ha modificado.", type: "warning" };
      } else {
        deliverFinalNotifications_(sheet, row, record, "confirmed", config);
        notice = record.visitorConfirmationSentAt
          ? { text: "Cita confirmada. Se creó Calendar con Google Meet y el cliente recibió el aviso final.", type: "success" }
          : { text: "La cita se creó, pero el correo final no pudo enviarse. Usa Reenviar confirmación.", type: "warning" };
      }
    } else if (decision === "denyAppointment") {
      const canDenyAppointment = statusKey === "awaiting" ||
        (statusKey === "denied" && Boolean(record.appointmentAt));
      if (statusKey === "awaiting") {
        const deniedAt = new Date().toISOString();
        applyLeadUpdates_(sheet, row, record, {
          status: REQUEST_STATUSES.denied,
          calendarEventId: "",
          meetingUrl: "",
          adminDecisionAt: deniedAt,
          visitorConfirmationSentAt: "",
          finalNotificationSentAt: "",
          statusUpdatedAt: deniedAt
        });
        statusKey = "denied";
      }
      if (!canDenyAppointment) {
        notice = { text: "La cita no está pendiente de confirmación y no se ha modificado.", type: "warning" };
      } else if (record.visitorConfirmationSentAt) {
        notice = { text: "La denegación de la cita ya fue comunicada al cliente.", type: "success" };
      } else {
        try {
          sendVisitorAppointmentDenialEmail_(record, config);
          const sentAt = new Date().toISOString();
          applyLeadUpdates_(sheet, row, record, {
            visitorConfirmationSentAt: sentAt,
            finalNotificationSentAt: sentAt
          });
          notice = { text: "Cita denegada. El cliente ha recibido el aviso final.", type: "success" };
        } catch (emailError) {
          console.error(emailError);
          notice = { text: "La cita quedó denegada, pero el correo no pudo enviarse. Puedes reintentar desde esta página.", type: "warning" };
        }
      }
    } else {
      throw new Error("Invalid admin decision");
    }
    return buildAdminReviewPage_(record, cleanToken, config, notice);
  } finally {
    lock.releaseLock();
  }
}

function handleVisitorDecision_(token, action, slotValue) {
  const cleanToken = requirePrivateToken_(token);
  const config = getConfiguration_();
  const sheet = getLeadsSheet_(config);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const row = findRequestTokenRow_(sheet, hashVerificationToken_(cleanToken));
    if (!row) throw new Error("Invalid request token");
    const record = getLeadRecord_(sheet, row);
    let statusKey = getRequestStatusKey_(record.status);
    let notice = null;

    if (action === "book") {
      if (statusKey !== "scheduling" && statusKey !== "awaiting") {
        return buildRequestStatusPage_(record, cleanToken, config, null, sheet);
      }
      if (statusKey === "scheduling") {
        if (!config.calendarFollowupEnabled || !config.calendarId) {
          throw new Error("Google Calendar is not enabled for booking");
        }
        const requestedStart = new Date(String(slotValue || ""));
        if (Number.isNaN(requestedStart.getTime())) throw new Error("Invalid booking date");
        const availableSlot = getAvailableBookingSlots_(config, sheet).some(function (slot) {
          return slot.getTime() === requestedStart.getTime();
        });
        if (!availableSlot) {
          return buildRequestStatusPage_(
            record,
            cleanToken,
            config,
            getVerificationCopy_(record.language).slotUnavailable,
            sheet
          );
        }

        const decidedAt = new Date().toISOString();
        applyLeadUpdates_(sheet, row, record, {
          calendarEventId: "",
          meetingUrl: "",
          status: REQUEST_STATUSES.awaitingConfirmation,
          appointmentAt: requestedStart.toISOString(),
          visitorDecisionAt: decidedAt,
          appointmentReviewEmailSentAt: "",
          visitorConfirmationSentAt: "",
          finalNotificationSentAt: "",
          statusUpdatedAt: decidedAt
        });
        statusKey = "awaiting";
      }
      if (!record.appointmentReviewEmailSentAt) {
        const adminToken = createVerificationToken_();
        const previousAdminTokenHash = record.adminTokenHash;
        applyLeadUpdates_(sheet, row, record, {
          adminTokenHash: hashVerificationToken_(adminToken)
        });
        try {
          sendAppointmentReviewEmail_(record, adminToken, config);
        } catch (emailError) {
          console.error(emailError);
          try {
            applyLeadUpdates_(sheet, row, record, {
              adminTokenHash: previousAdminTokenHash
            });
          } catch (restoreError) {
            console.error(restoreError);
          }
          notice = "La fecha quedó seleccionada, pero no pudimos avisar al equipo. Escribe a direccion@hhosthospitality.com.";
        }
        if (!notice) {
          try {
            applyLeadUpdates_(sheet, row, record, {
              appointmentReviewEmailSentAt: new Date().toISOString()
            });
          } catch (markerError) {
            console.error(markerError);
          }
        }
      }
    } else if (action === "decline") {
      if (statusKey !== "scheduling" && statusKey !== "awaiting" && statusKey !== "declined") {
        return buildRequestStatusPage_(record, cleanToken, config, null, sheet);
      }
      if (statusKey === "scheduling" || statusKey === "awaiting") {
        const decidedAt = new Date().toISOString();
        applyLeadUpdates_(sheet, row, record, {
          status: REQUEST_STATUSES.declined,
          appointmentAt: "",
          appointmentReviewEmailSentAt: "",
          visitorDecisionAt: decidedAt,
          visitorConfirmationSentAt: "",
          finalNotificationSentAt: "",
          statusUpdatedAt: decidedAt
        });
        statusKey = "declined";
      }
      deliverFinalNotifications_(sheet, row, record, "declined", config);
    } else {
      throw new Error("Invalid visitor decision");
    }
    return buildRequestStatusPage_(record, cleanToken, config, notice, sheet);
  } finally {
    lock.releaseLock();
  }
}

function deliverFinalNotifications_(sheet, row, record, outcome, config) {
  if (!record.visitorConfirmationSentAt) {
    try {
      if (outcome === "confirmed") {
        sendVisitorBookingConfirmation_(record, config);
      } else {
        sendVisitorDeclineAcknowledgement_(record, config);
      }
      const sentAt = new Date().toISOString();
      applyLeadUpdates_(sheet, row, record, { visitorConfirmationSentAt: sentAt });
    } catch (visitorEmailError) {
      console.error(visitorEmailError);
    }
  }
  if (!record.finalNotificationSentAt) {
    try {
      if (sendFinalAdminNotification_(record, outcome, config)) {
        const sentAt = new Date().toISOString();
        applyLeadUpdates_(sheet, row, record, { finalNotificationSentAt: sentAt });
      }
    } catch (adminEmailError) {
      console.error(adminEmailError);
    }
  }
}

function applyLeadUpdates_(sheet, row, record, updates) {
  updateLeadFields_(sheet, row, updates);
  Object.keys(updates).forEach(function (key) {
    record[key] = updates[key];
  });
}

function requirePrivateToken_(token) {
  const cleanToken = String(token || "").trim();
  if (!/^[a-f0-9]{64}$/i.test(cleanToken)) throw new Error("Invalid private token");
  return cleanToken;
}

function buildAdminReviewPage_(record, token, config, notice) {
  const actionUrl = getWebAppUrl_(config);
  const statusKey = getRequestStatusKey_(record.status);
  const hasSelectedAppointment = Boolean(record.appointmentAt);
  const canApprove = statusKey === "processing" ||
    (statusKey === "scheduling" && !record.adminDecisionEmailSentAt);
  const canDeny = statusKey === "processing" || statusKey === "scheduling" ||
    (statusKey === "denied" && !hasSelectedAppointment && !record.adminDecisionEmailSentAt);
  const canConfirmAppointment = statusKey === "awaiting" ||
    (statusKey === "confirmed" && !record.visitorConfirmationSentAt);
  const canDenyAppointment = statusKey === "awaiting" ||
    (statusKey === "denied" && hasSelectedAppointment && !record.visitorConfirmationSentAt);
  const approveLabel = statusKey === "scheduling" ? "Reenviar horarios" : "Aprobar y enviar horarios";
  const denyLabel = statusKey === "denied" ? "Reenviar denegación" : "Denegar solicitud";
  const confirmAppointmentLabel = statusKey === "confirmed" ? "Reenviar confirmación" : "Confirmar cita definitivamente";
  const denyAppointmentLabel = statusKey === "denied" ? "Reenviar denegación de cita" : "Denegar cita";
  const appointment = hasSelectedAppointment ? formatAppointment_(record.appointmentAt) : "";
  const details = [
    { label: "Referencia", value: record.submissionId, wide: false },
    { label: "Estado", value: record.status, wide: false },
    { label: "Nombre", value: record.name, wide: false },
    { label: "Email", value: record.email, wide: false },
    { label: "Teléfono", value: record.phone, wide: false },
    { label: "Relación", value: record.relationship, wide: false },
    { label: "Propiedad", value: record.propertyType, wide: false },
    { label: "Ubicación", value: [record.street, record.postalCode, record.city, record.country].filter(Boolean).join(", "), wide: true },
    { label: "Anuncio", value: record.listingUrl, wide: true },
    { label: "Fotos", value: record.photosUrl || record.driveFolderUrl, wide: true },
    { label: "Comentarios", value: record.comments, wide: true },
    { label: "Cita seleccionada", value: appointment, wide: true },
    { label: "Google Meet", value: record.meetingUrl, wide: true }
  ];
  const detailsHtml = details.filter(function (detail) {
    return detail.value !== undefined && detail.value !== null && String(detail.value).trim();
  }).map(function (detail) {
    return '<div class="detail' + (detail.wide ? ' wide' : '') + '"><span>' +
      escapeHtml_(detail.label) + '</span><strong>' + escapeHtml_(detail.value) + '</strong></div>';
  }).join("");
  const approveForm = canApprove
    ? buildAdminActionForm_(actionUrl, token, "admin-approve", approveLabel, "")
    : "";
  const denyForm = canDeny
    ? buildAdminActionForm_(actionUrl, token, "admin-deny", denyLabel, "danger")
    : "";
  const confirmAppointmentForm = canConfirmAppointment
    ? buildAdminActionForm_(actionUrl, token, "admin-confirm-appointment", confirmAppointmentLabel, "")
    : "";
  const denyAppointmentForm = canDenyAppointment
    ? buildAdminActionForm_(actionUrl, token, "admin-deny-appointment", denyAppointmentLabel, "danger")
    : "";
  const noticeHtml = notice
    ? '<p class="notice' + (notice.type === "warning" ? ' warning' : '') + '">' + escapeHtml_(notice.text) + '</p>'
    : "";
  const actionForms = approveForm + denyForm + confirmAppointmentForm + denyAppointmentForm;
  const actionsHtml = actionForms
    ? '<div class="admin-actions">' + actionForms + '</div>'
    : '<p class="notice">La solicitud ya tiene una decisión final. No hay acciones pendientes.</p>';
  const pageTitle = statusKey === "awaiting" ? "Confirmar cita" : "Revisar solicitud";
  const pageLead = statusKey === "awaiting"
    ? "El cliente eligió esta fecha. Confírmala para crear Calendar con Google Meet o deniégala para cerrar la solicitud."
    : "Aprueba la solicitud para enviar los horarios libres o deniégala para cerrar el proceso.";
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Revisar solicitud - Hot Host Hospitality</title>' +
    requestPageStyles_() + workflowPageStyles_() + '</head><body><main class="card"><div class="brand"><strong>HOT HOST</strong><span>HOSPITALITY</span></div><div class="verified">Revisión privada</div><h1>' + escapeHtml_(pageTitle) + '</h1><p class="lead">' + escapeHtml_(pageLead) + '</p><section class="status"><span>Estado actual</span><strong class="pill ' +
    escapeHtml_(statusKey) + '">' + escapeHtml_(record.status) + '</strong></section>' + noticeHtml +
    '<section class="admin-details">' + detailsHtml + '</section>' + actionsHtml +
    '<p class="reference">Este enlace es privado. No lo compartas.</p></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle("Revisar solicitud - Hot Host Hospitality");
}

function buildAdminActionForm_(actionUrl, token, action, label, buttonClass) {
  return '<form method="post" target="_top" action="' + escapeHtml_(actionUrl) + '"><input type="hidden" name="action" value="' +
    escapeHtml_(action) + '"><input type="hidden" name="admin" value="' + escapeHtml_(token) +
    '"><button class="' + escapeHtml_(buttonClass) + '" type="submit">' + escapeHtml_(label) + '</button></form>';
}

function buildWorkflowMessagePage_(title, text) {
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' +
    escapeHtml_(title) + '</title>' + requestPageStyles_() + workflowPageStyles_() + '</head><body><main class="card"><div class="brand"><strong>HOT HOST</strong><span>HOSPITALITY</span></div><h1>' +
    escapeHtml_(title) + '</h1><p class="lead">' + escapeHtml_(text) + '</p></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title);
}

function requestPageStyles_() {
  return '<style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at top,#fff8e7,#eee4d2 70%);color:#241d14;font-family:Arial,sans-serif}.card{width:min(680px,calc(100vw - 32px));padding:38px;border:1px solid #dfd0b6;border-radius:26px;background:#fffdf9;box-shadow:0 24px 70px rgba(62,43,17,.16)}.brand{margin:-38px -38px 32px;padding:25px 38px;border-radius:26px 26px 0 0;background:#131313;color:#fff}.brand strong{display:block;font-size:22px;letter-spacing:.14em}.brand span{display:block;margin-top:4px;color:#e1aa3f;font-size:11px;font-weight:800;letter-spacing:.24em}.verified{display:inline-flex;gap:8px;align-items:center;padding:8px 13px;border-radius:999px;background:#e6f5eb;color:#126c3e;font-size:13px;font-weight:800}h1{margin:18px 0 12px;font:700 clamp(32px,7vw,52px)/1.05 Georgia,serif}.lead{margin:0;color:#685c49;font-size:17px;line-height:1.65}.status,.appointment{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:28px;padding:18px 20px;border:1px solid #eadfcf;border-radius:16px;background:#faf6ed}.status>span,.appointment span{color:#776a57;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.pill{padding:8px 13px;border-radius:999px;font-size:14px}.pill.pending{background:#fff2c7;color:#725200}.pill.processing{background:#e8f0ff;color:#254d91}.pill.confirmed{background:#e6f5eb;color:#126c3e}.pill.denied{background:#fbe8e8;color:#963535}.appointment strong{text-align:right}.reference{margin:22px 0 0;color:#817563;font-size:13px;overflow-wrap:anywhere}button{margin-top:28px;padding:13px 21px;border:0;border-radius:999px;background:#198754;color:#fff;font-size:15px;font-weight:800;cursor:pointer}@media(max-width:520px){.card{padding:26px}.brand{margin:-26px -26px 26px;padding:22px 26px}.status,.appointment{align-items:flex-start;flex-direction:column}.appointment strong{text-align:left}}</style>';
}

function workflowPageStyles_() {
  return '<style>.pill.scheduling,.pill.awaiting{background:#fff2c7;color:#725200}.pill.declined{background:#fbe8e8;color:#963535}.scheduler{margin-top:24px;padding-top:4px}.schedule-window,.no-slots{padding:15px 17px;border-left:4px solid #e1aa3f;border-radius:8px;background:#faf5e9;color:#665943;line-height:1.55}.booking-form fieldset{margin:24px 0 0;padding:0;border:0}.booking-form legend{margin-bottom:12px;font-weight:800}.slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.slot{display:block;cursor:pointer}.slot input{position:absolute;opacity:0;pointer-events:none}.slot span{display:flex;min-height:74px;flex-direction:column;justify-content:center;padding:13px 15px;border:1px solid #dfd3bd;border-radius:13px;background:#fff;transition:.15s ease}.slot strong{font-size:14px}.slot small{margin-top:5px;color:#776a57;font-size:13px}.slot input:checked+span{border-color:#198754;background:#eaf7ef;box-shadow:0 0 0 2px rgba(25,135,84,.15)}.slot input:focus-visible+span{outline:3px solid rgba(25,135,84,.25);outline-offset:2px}.decline-form{margin-top:14px;border-top:1px solid #eadfcf}.decline-form .danger{margin-top:18px;background:#fff;color:#963535;box-shadow:inset 0 0 0 1px #debaba}.no-slots{margin-top:22px;border-left-color:#963535;background:#fbeeee}.admin-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:24px}.detail{padding:14px 16px;border:1px solid #eadfcf;border-radius:13px;background:#faf6ed}.detail.wide{grid-column:1/-1}.detail span{display:block;color:#776a57;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.detail strong,.detail a{display:block;margin-top:6px;color:#241d14;overflow-wrap:anywhere}.admin-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.admin-actions form{flex:1}.admin-actions button{width:100%;margin-top:0}.admin-actions .danger{background:#a13d3d}.notice{margin-top:22px;padding:14px 16px;border-radius:12px;background:#eaf7ef;color:#126c3e;font-weight:700}.notice.warning{background:#fff2c7;color:#725200}@media(max-width:520px){.slots,.admin-details{grid-template-columns:1fr}.admin-actions{flex-direction:column}}</style>';
}

function escapeHtml_(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAvailableBookingSlots_(config, sheet) {
  if (!config.calendarFollowupEnabled || !config.calendarId) return [];
  if (config.bookingEndHour <= config.bookingStartHour) {
    throw new Error("The booking hours are not valid");
  }
  const calendar = getCalendar_(config);
  const now = new Date();
  const timeZone = Session.getScriptTimeZone();
  const earliest = new Date(now.getTime() + config.bookingMinLeadHours * 60 * 60 * 1000);
  const today = Utilities.formatDate(now, timeZone, "yyyy-MM-dd").split("-").map(Number);
  const dayAnchor = new Date(Date.UTC(today[0], today[1] - 1, today[2]));
  const horizonDay = new Date(dayAnchor.getTime() + config.bookingDaysAhead * 24 * 60 * 60 * 1000);
  const horizonDate = Utilities.formatDate(horizonDay, "UTC", "yyyy-MM-dd");
  const horizon = Utilities.parseDate(
    horizonDate + " " + formatClockMinutes_(config.bookingEndHour * 60),
    timeZone,
    "yyyy-MM-dd HH:mm"
  );
  const intervalMinutes = config.eventDurationMinutes + config.bookingBufferMinutes;
  const firstMinute = config.bookingStartHour * 60;
  const lastMinute = config.bookingEndHour * 60;
  const slots = [];
  const bufferMilliseconds = config.bookingBufferMinutes * 60 * 1000;
  const events = calendar.getEvents(
    new Date(now.getTime() - bufferMilliseconds),
    new Date(horizon.getTime() + bufferMilliseconds)
  );
  const pendingTimes = getPendingAppointmentTimes_(sheet, "");

  for (let dayOffset = 0; dayOffset <= config.bookingDaysAhead; dayOffset += 1) {
    const day = new Date(dayAnchor.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    if (config.bookingWeekdays.indexOf(day.getUTCDay()) === -1) continue;
    const localDate = Utilities.formatDate(day, "UTC", "yyyy-MM-dd");

    for (
      let minute = firstMinute;
      minute + config.eventDurationMinutes <= lastMinute;
      minute += intervalMinutes
    ) {
      const start = Utilities.parseDate(
        localDate + " " + formatClockMinutes_(minute),
        timeZone,
        "yyyy-MM-dd HH:mm"
      );
      const end = new Date(start.getTime() + config.eventDurationMinutes * 60 * 1000);
      if (start < earliest || end > horizon) continue;
      if (
        pendingTimes.indexOf(start.getTime()) === -1 &&
        isBookingWindowFree_(events, start, end, config.bookingBufferMinutes)
      ) {
        slots.push(start);
      }
    }
  }
  return slots;
}

function getPendingAppointmentTimes_(sheet, excludedSubmissionId) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = ensureLeadHeaders_(sheet);
  const submissionIndex = headers.indexOf("submissionId");
  const statusIndex = headers.indexOf("status");
  const appointmentIndex = headers.indexOf("appointmentAt");
  if (statusIndex === -1 || appointmentIndex === -1) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .filter(function (values) {
      return getRequestStatusKey_(values[statusIndex]) === "awaiting" &&
        String(values[submissionIndex] || "") !== String(excludedSubmissionId || "");
    })
    .map(function (values) {
      const value = values[appointmentIndex];
      const date = value instanceof Date ? value : new Date(String(value || ""));
      return date.getTime();
    })
    .filter(function (timestamp) { return !Number.isNaN(timestamp); });
}

function isSelectedAppointmentAvailable_(record, config, sheet) {
  const start = new Date(String(record.appointmentAt || ""));
  if (Number.isNaN(start.getTime()) || start <= new Date()) return false;
  const timeZone = Session.getScriptTimeZone();
  const localDate = Utilities.formatDate(start, timeZone, "yyyy-MM-dd").split("-").map(Number);
  const day = new Date(Date.UTC(localDate[0], localDate[1] - 1, localDate[2])).getUTCDay();
  if (config.bookingWeekdays.indexOf(day) === -1) return false;
  const localTime = Utilities.formatDate(start, timeZone, "HH:mm").split(":").map(Number);
  const minute = localTime[0] * 60 + localTime[1];
  const firstMinute = config.bookingStartHour * 60;
  const lastMinute = config.bookingEndHour * 60;
  const intervalMinutes = config.eventDurationMinutes + config.bookingBufferMinutes;
  if (
    minute < firstMinute ||
    minute + config.eventDurationMinutes > lastMinute ||
    (minute - firstMinute) % intervalMinutes !== 0
  ) {
    return false;
  }
  if (getPendingAppointmentTimes_(sheet, record.submissionId).indexOf(start.getTime()) !== -1) {
    return false;
  }
  const end = new Date(start.getTime() + config.eventDurationMinutes * 60 * 1000);
  const bufferMilliseconds = config.bookingBufferMinutes * 60 * 1000;
  const events = getCalendar_(config).getEvents(
    new Date(start.getTime() - bufferMilliseconds),
    new Date(end.getTime() + bufferMilliseconds)
  );
  return isBookingWindowFree_(events, start, end, config.bookingBufferMinutes);
}

function isBookingWindowFree_(events, start, end, bufferMinutes) {
  const bufferMilliseconds = bufferMinutes * 60 * 1000;
  const windowStart = start.getTime() - bufferMilliseconds;
  const windowEnd = end.getTime() + bufferMilliseconds;
  return !events.some(function (event) {
    return event.getStartTime().getTime() < windowEnd && event.getEndTime().getTime() > windowStart;
  });
}

function formatClockMinutes_(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function createBookingEvent_(record, start, config) {
  const end = new Date(start.getTime() + config.eventDurationMinutes * 60 * 1000);
  const title = "Cita Hot Host - " + sanitiseText_(record.name, "Contacto", 60);
  const calendarId = config.calendarId === "primary" ? "primary" : config.calendarId;
  const resource = {
    summary: title,
    description: getMeetingDescription_(record),
    start: { dateTime: start.toISOString(), timeZone: Session.getScriptTimeZone() },
    end: { dateTime: end.toISOString(), timeZone: Session.getScriptTimeZone() },
    conferenceData: {
      createRequest: {
        requestId: ("hot-host-" + record.submissionId + "-" + Date.now()).replace(/[^a-z0-9-]/gi, "").slice(0, 120),
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    },
    extendedProperties: {
      private: { hotHostSubmissionId: String(record.submissionId || "") }
    }
  };
  let event = null;
  try {
    event = Calendar.Events.insert(resource, calendarId, {
      conferenceDataVersion: 1,
      sendUpdates: "none"
    });
    let meetingUrl = getMeetingUrl_(event);
    for (let attempt = 0; !meetingUrl && attempt < 10; attempt += 1) {
      Utilities.sleep(500);
      event = Calendar.Events.get(calendarId, event.id);
      meetingUrl = getMeetingUrl_(event);
    }
    if (!meetingUrl) throw new Error("Google Meet link could not be created");
    return { id: event.id, meetingUrl: meetingUrl, htmlLink: event.htmlLink || "" };
  } catch (error) {
    deleteBookingEvent_(event, config);
    throw error;
  }
}

function getMeetingUrl_(event) {
  if (event && event.hangoutLink) return String(event.hangoutLink);
  const entryPoints = event && event.conferenceData && event.conferenceData.entryPoints;
  if (!Array.isArray(entryPoints)) return "";
  const videoEntry = entryPoints.find(function (entry) { return entry.entryPointType === "video"; });
  return videoEntry ? String(videoEntry.uri || "") : "";
}

function deleteBookingEvent_(event, config) {
  if (!event || !event.id) return;
  try {
    Calendar.Events.remove(config.calendarId === "primary" ? "primary" : config.calendarId, event.id, {
      sendUpdates: "none"
    });
  } catch (error) {
    console.error(error);
  }
}

function getMeetingDescription_(record) {
  const isSpanish = String(record.language || "").toLowerCase() === "es";
  const property = [record.propertyType, record.city, record.country].filter(Boolean).join(" · ");
  return [
    isSpanish
      ? "Reunión inicial de auditoría de rentabilidad y operación con Hot Host Hospitality."
      : "Initial profitability and operations audit meeting with Hot Host Hospitality.",
    "",
    (isSpanish ? "Referencia: " : "Reference: ") + record.submissionId,
    property ? (isSpanish ? "Propiedad: " : "Property: ") + property : ""
  ].filter(Boolean).join("\n");
}

function deleteLegacyFollowup_(record, config) {
  if (!record.calendarEventId || record.appointmentAt || !config.calendarId) return;
  try {
    const event = getCalendar_(config).getEventById(String(record.calendarEventId));
    if (event) event.deleteEvent();
  } catch (error) {
    console.error(error);
  }
}

function getCalendar_(config) {
  if (!config.calendarId) throw new Error("Google Calendar is not configured");
  const calendar = config.calendarId === "primary"
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(config.calendarId);
  if (!calendar) throw new Error("The configured Google Calendar is unavailable");
  return calendar;
}

function sendLeadNotification_(payload, record, adminToken, config) {
  if (!config.gmailNotificationEnabled) return false;
  if (!config.notificationEmail) throw new Error("Gmail notification address is not configured");

  const reviewUrl = buildAdminReviewUrl_(adminToken, config);
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
    payload.property.comments ? "Comentarios: " + payload.property.comments : "",
    "",
    "Revisar y decidir: " + reviewUrl
  ].filter(function (line) { return line !== ""; }).join("\n");
  const htmlBody = buildBrandedEmailHtml_(
    "Solicitud verificada",
    "Revisa los datos y decide si el visitante puede elegir una cita.",
    [
      { label: "Referencia", value: payload.submissionId },
      { label: "Nombre", value: payload.contact.name },
      { label: "Email", value: payload.contact.email },
      { label: "Teléfono", value: payload.contact.phone },
      { label: "Propiedad", value: [payload.property.type, payload.property.city, payload.property.country].filter(Boolean).join(" · ") },
      { label: "Comentarios", value: payload.property.comments }
    ],
    "Revisar y decidir",
    reviewUrl,
    "El enlace solo abre la revisión. Aprobar o denegar requiere una segunda pulsación explícita."
  );

  MailApp.sendEmail({
    to: config.notificationEmail,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    replyTo: payload.contact.email,
    name: "Hot Host Web"
  });
  return true;
}

function sendSchedulingEmail_(record, bookingToken, config) {
  const copy = getVerificationCopy_(record.language);
  const schedulingUrl = buildVerificationUrl_(bookingToken, config);
  const name = sanitiseText_(record.name, "", 80);
  const greeting = name ? copy.greeting + " " + name + "," : copy.greeting + ",";
  const body = [
    greeting,
    "",
    copy.schedulingEmailIntro,
    "",
    copy.schedulingButton + ": " + schedulingUrl,
    "",
    copy.schedulingEmailNote,
    copy.emailNote
  ].join("\n");
  const message = {
    to: String(record.email || ""),
    subject: copy.schedulingEmailSubject,
    body: body,
    htmlBody: buildBrandedEmailHtml_(
      copy.schedulingEmailTitle,
      greeting + " " + copy.schedulingEmailIntro,
      [{ label: copy.reference, value: record.submissionId }],
      copy.schedulingButton,
      schedulingUrl,
      copy.schedulingEmailNote + " " + copy.emailNote
    ),
    name: "Hot Host Hospitality"
  };
  if (config.notificationEmail) message.replyTo = config.notificationEmail;
  MailApp.sendEmail(message);
  return true;
}

function sendAppointmentReviewEmail_(record, adminToken, config) {
  if (!config.gmailNotificationEnabled || !config.notificationEmail) {
    throw new Error("Gmail notification address is not configured");
  }
  const reviewUrl = buildAdminReviewUrl_(adminToken, config);
  const appointment = formatAppointment_(record.appointmentAt);
  const subject = "Confirmación final de cita - " + sanitiseText_(record.name, "Contacto", 60);
  const intro = "El cliente ha elegido una fecha. Confírmala o deniégala antes de crear el evento de Calendar.";
  const details = [
    { label: "Referencia", value: record.submissionId },
    { label: "Cliente", value: record.name },
    { label: "Email", value: record.email },
    { label: "Cita seleccionada", value: appointment }
  ];
  MailApp.sendEmail({
    to: config.notificationEmail,
    subject: subject,
    body: [
      intro,
      "",
      "Referencia: " + record.submissionId,
      "Cliente: " + record.name,
      "Email: " + record.email,
      "Cita seleccionada: " + appointment,
      "",
      "Revisar y decidir: " + reviewUrl
    ].join("\n"),
    htmlBody: buildBrandedEmailHtml_(
      "Confirmar cita",
      intro,
      details,
      "Revisar y decidir",
      reviewUrl,
      "Calendar y Google Meet solo se crearán después de tu confirmación final."
    ),
    replyTo: String(record.email || ""),
    name: "Hot Host Web"
  });
  return true;
}

function sendVisitorDenialEmail_(record, config) {
  const copy = getVerificationCopy_(record.language);
  const name = sanitiseText_(record.name, "", 80);
  const greeting = name ? copy.greeting + " " + name + "," : copy.greeting + ",";
  const body = [
    greeting,
    "",
    copy.denialEmailText,
    "",
    copy.reference + ": " + record.submissionId
  ].join("\n");
  const message = {
    to: String(record.email || ""),
    subject: copy.denialEmailSubject,
    body: body,
    htmlBody: buildBrandedEmailHtml_(
      copy.denialEmailTitle,
      copy.denialEmailText,
      [{ label: copy.reference, value: record.submissionId }],
      "",
      "",
      ""
    ),
    name: "Hot Host Hospitality"
  };
  if (config.notificationEmail) message.replyTo = config.notificationEmail;
  MailApp.sendEmail(message);
  return true;
}

function sendVisitorAppointmentDenialEmail_(record, config) {
  const copy = getVerificationCopy_(record.language);
  const appointment = formatAppointment_(record.appointmentAt);
  const message = {
    to: String(record.email || ""),
    subject: copy.appointmentDeniedEmailSubject,
    body: [
      copy.appointmentDeniedEmailText,
      "",
      copy.appointment + ": " + appointment,
      copy.reference + ": " + record.submissionId
    ].join("\n"),
    htmlBody: buildBrandedEmailHtml_(
      copy.appointmentDeniedEmailTitle,
      copy.appointmentDeniedEmailText,
      [
        { label: copy.appointment, value: appointment },
        { label: copy.reference, value: record.submissionId }
      ],
      "",
      "",
      ""
    ),
    name: "Hot Host Hospitality"
  };
  if (config.notificationEmail) message.replyTo = config.notificationEmail;
  MailApp.sendEmail(message);
  return true;
}

function sendVisitorBookingConfirmation_(record, config) {
  const copy = getVerificationCopy_(record.language);
  const appointment = formatAppointment_(record.appointmentAt);
  const meetingDescription = getMeetingDescription_(record);
  const addCalendarUrl = buildGoogleCalendarAddUrl_(record, config);
  const body = [
    copy.confirmationEmailText,
    "",
    copy.appointment + ": " + appointment,
    "Google Meet: " + record.meetingUrl,
    copy.addCalendarButton + ": " + addCalendarUrl,
    copy.meetingDescriptionLabel + ": " + meetingDescription,
    copy.reference + ": " + record.submissionId
  ].join("\n");
  const message = {
    to: String(record.email || ""),
    subject: copy.confirmationEmailSubject,
    body: body,
    htmlBody: buildBrandedEmailHtml_(
      copy.confirmationEmailTitle,
      copy.confirmationEmailText,
      [
        { label: copy.appointment, value: appointment },
        { label: "Google Meet", value: record.meetingUrl },
        { label: copy.meetingDescriptionLabel, value: meetingDescription },
        { label: copy.reference, value: record.submissionId }
      ],
      copy.addCalendarButton,
      addCalendarUrl,
      "",
      copy.joinMeetButton,
      record.meetingUrl
    ),
    name: "Hot Host Hospitality"
  };
  if (config.notificationEmail) message.replyTo = config.notificationEmail;
  MailApp.sendEmail(message);
  return true;
}

function buildGoogleCalendarAddUrl_(record, config) {
  const start = new Date(String(record.appointmentAt || ""));
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + config.eventDurationMinutes * 60 * 1000);
  const title = "Cita Hot Host - " + sanitiseText_(record.name, "Auditoría", 60);
  const details = getMeetingDescription_(record) + "\n\nGoogle Meet: " + String(record.meetingUrl || "");
  const dates = Utilities.formatDate(start, "UTC", "yyyyMMdd'T'HHmmss'Z'") + "/" +
    Utilities.formatDate(end, "UTC", "yyyyMMdd'T'HHmmss'Z'");
  return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(title) +
    "&dates=" + encodeURIComponent(dates) +
    "&details=" + encodeURIComponent(details) +
    "&location=" + encodeURIComponent(String(record.meetingUrl || "")) +
    "&ctz=" + encodeURIComponent(Session.getScriptTimeZone());
}

function sendVisitorDeclineAcknowledgement_(record, config) {
  const copy = getVerificationCopy_(record.language);
  const message = {
    to: String(record.email || ""),
    subject: copy.declineEmailSubject,
    body: copy.declineEmailText + "\n\n" + copy.reference + ": " + record.submissionId,
    htmlBody: buildBrandedEmailHtml_(
      copy.declineEmailTitle,
      copy.declineEmailText,
      [{ label: copy.reference, value: record.submissionId }],
      "",
      "",
      ""
    ),
    name: "Hot Host Hospitality"
  };
  if (config.notificationEmail) message.replyTo = config.notificationEmail;
  MailApp.sendEmail(message);
  return true;
}

function sendFinalAdminNotification_(record, outcome, config) {
  if (!config.gmailNotificationEnabled || !config.notificationEmail) return false;
  const confirmed = outcome === "confirmed";
  const appointment = confirmed ? formatAppointment_(record.appointmentAt) : "";
  const subject = confirmed
    ? "Cita confirmada - " + sanitiseText_(record.name, "Contacto", 60)
    : "Cita rechazada por el solicitante - " + sanitiseText_(record.name, "Contacto", 60);
  const intro = confirmed
    ? "La cita ha quedado confirmada y se creó la reunión de Google Meet."
    : "El visitante ha rechazado continuar con la cita.";
  const details = [
    { label: "Referencia", value: record.submissionId },
    { label: "Nombre", value: record.name },
    { label: "Email", value: record.email },
    { label: "Teléfono", value: record.phone },
    { label: "Cita", value: appointment },
    { label: "Google Meet", value: confirmed ? record.meetingUrl : "" }
  ];
  const body = details.filter(function (item) { return item.value; }).map(function (item) {
    return item.label + ": " + item.value;
  });
  body.unshift(intro, "");
  MailApp.sendEmail({
    to: config.notificationEmail,
    subject: subject,
    body: body.join("\n"),
    htmlBody: buildBrandedEmailHtml_(subject, intro, details, "", "", ""),
    replyTo: String(record.email || ""),
    name: "Hot Host Web"
  });
  return true;
}

function buildBrandedEmailHtml_(title, intro, details, buttonLabel, buttonUrl, note, secondaryButtonLabel, secondaryButtonUrl) {
  const detailsHtml = (details || []).filter(function (item) {
    return item && item.value !== undefined && item.value !== null && String(item.value).trim();
  }).map(function (item) {
    return '<div style="padding:12px 0;border-bottom:1px solid #eee5d6"><div style="color:#8a7e6c;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">' +
      escapeHtml_(item.label) + '</div><div style="margin-top:5px;color:#201a12;font-size:15px;line-height:1.45;white-space:pre-line">' +
      escapeHtml_(item.value) + '</div></div>';
  }).join("");
  const buttonHtml = buttonLabel && buttonUrl
    ? '<p style="margin:28px 0;text-align:center"><a href="' + escapeHtml_(buttonUrl) +
      '" style="display:inline-block;padding:15px 26px;border-radius:999px;background:#198754;color:#fff;font-size:16px;font-weight:800;text-decoration:none">' +
      escapeHtml_(buttonLabel) + '</a></p>'
    : "";
  const secondaryButtonHtml = secondaryButtonLabel && secondaryButtonUrl
    ? '<p style="margin:12px 0 28px;text-align:center"><a href="' + escapeHtml_(secondaryButtonUrl) +
      '" style="display:inline-block;padding:14px 24px;border:1px solid #198754;border-radius:999px;background:#fff;color:#126c3e;font-size:15px;font-weight:800;text-decoration:none">' +
      escapeHtml_(secondaryButtonLabel) + '</a></p>'
    : "";
  const noteHtml = note
    ? '<div style="margin-top:22px;padding:15px 17px;border-left:4px solid #e1aa3f;border-radius:8px;background:#faf5e9;color:#665943;font-size:13px;line-height:1.55">' +
      escapeHtml_(note) + '</div>'
    : "";
  return '<div style="margin:0;padding:32px 16px;background:#f5f1e8;color:#201a12;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;overflow:hidden;border:1px solid #dfd3bd;border-radius:20px;background:#fffdf9"><div style="padding:24px 30px;background:#131313;color:#fff"><div style="font-size:22px;font-weight:800;letter-spacing:.14em">HOT HOST</div><div style="margin-top:4px;color:#e1aa3f;font-size:11px;font-weight:700;letter-spacing:.24em">HOSPITALITY</div></div><div style="padding:34px 30px 30px"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15">' +
    escapeHtml_(title) + '</h1><p style="margin:0 0 20px;color:#645846;font-size:16px;line-height:1.65">' +
    escapeHtml_(intro) + '</p>' + detailsHtml + buttonHtml + secondaryButtonHtml + noteHtml + '</div></div></div>';
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
  setIfMissing("GOOGLE_CALENDAR_FOLLOWUP_ENABLED", "true");
  setIfMissing("GOOGLE_CALENDAR_FOLLOWUP_DELAY_HOURS", INTEGRATION_DEFAULTS.followupDelayHours);
  setIfMissing("GOOGLE_CALENDAR_EVENT_DURATION_MINUTES", INTEGRATION_DEFAULTS.eventDurationMinutes);
  setIfMissing("GOOGLE_CALENDAR_BOOKING_DAYS_AHEAD", INTEGRATION_DEFAULTS.bookingDaysAhead);
  setIfMissing("GOOGLE_CALENDAR_BOOKING_MIN_LEAD_HOURS", INTEGRATION_DEFAULTS.bookingMinLeadHours);
  setIfMissing("GOOGLE_CALENDAR_BOOKING_START_HOUR", INTEGRATION_DEFAULTS.bookingStartHour);
  setIfMissing("GOOGLE_CALENDAR_BOOKING_END_HOUR", INTEGRATION_DEFAULTS.bookingEndHour);
  setIfMissing("GOOGLE_CALENDAR_BOOKING_BUFFER_MINUTES", INTEGRATION_DEFAULTS.bookingBufferMinutes);
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
    booking: {
      weekdays: "1,2,3,4",
      hours: formatClockMinutes_(config.bookingStartHour * 60) + "-" +
        formatClockMinutes_(config.bookingEndHour * 60),
      durationMinutes: config.eventDurationMinutes,
      bufferMinutes: config.bookingBufferMinutes,
      daysAhead: config.bookingDaysAhead,
      minLeadHours: config.bookingMinLeadHours
    },
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
    const slots = getAvailableBookingSlots_(config, sheet);
    result.booking.availableSlots = slots.length;
    result.booking.nextAvailableAt = slots.length ? slots[0].toISOString() : null;
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

function sendPendingAdminReviewEmails() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const config = getConfiguration_();
  if (!config.gmailNotificationEnabled || !config.notificationEmail) {
    throw new Error("Gmail notifications are not configured");
  }
  const sheet = getLeadsSheet_(config);
  const result = { reviewed: 0, sent: 0, errors: 0 };
  if (sheet.getLastRow() < 2) return result;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    for (let row = 2; row <= sheet.getLastRow(); row += 1) {
      const record = getLeadRecord_(sheet, row);
      if (!record.emailVerifiedAt || getRequestStatusKey_(record.status) !== "processing") continue;
      result.reviewed += 1;
      if (record.adminTokenHash) continue;

      const adminToken = createVerificationToken_();
      try {
        applyLeadUpdates_(sheet, row, record, {
          adminTokenHash: hashVerificationToken_(adminToken)
        });
        if (sendLeadNotification_(buildPayloadFromLeadRecord_(record), record, adminToken, config)) {
          applyLeadUpdates_(sheet, row, record, {
            internalNotificationSentAt: new Date().toISOString()
          });
          result.sent += 1;
        }
      } catch (error) {
        applyLeadUpdates_(sheet, row, record, { adminTokenHash: "" });
        result.errors += 1;
        console.error(error);
      }
    }
  } finally {
    lock.releaseLock();
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

  const result = { ok: true, sheets: true, drive: false, calendar: false, googleMeet: false };
  if (config.driveFolderId) {
    const file = getRootFolder_(config).createFile(testId + ".txt", "Hot Host write test", MimeType.PLAIN_TEXT);
    file.setTrashed(true);
    result.drive = true;
  }
  if (config.calendarFollowupEnabled) {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const event = createBookingEvent_({
      submissionId: testId,
      language: "es",
      name: "Prueba de integración",
      email: config.notificationEmail,
      phone: "",
      propertyType: "Prueba",
      city: "",
      country: ""
    }, start, config);
    result.googleMeet = Boolean(event.meetingUrl);
    deleteBookingEvent_(event, config);
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
          let deleted = false;
          try {
            Calendar.Events.remove(
              config.calendarId === "primary" ? "primary" : config.calendarId,
              values[index][calendarEventIndex],
              { sendUpdates: "none" }
            );
            deleted = true;
          } catch (advancedCalendarError) {
            try {
              const event = getCalendar_(config).getEventById(values[index][calendarEventIndex]);
              if (event) {
                event.deleteEvent();
                deleted = true;
              }
            } catch (calendarError) {
              console.error(calendarError);
            }
          }
          if (deleted) result.calendarEvents += 1;
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
