const UPLOAD_CONFIG = Object.freeze({
  rootFolderId: "1sxrelfXdz9Sm3e-JF9gHmPocHS2Fnw42",
  rootFolderName: "Solicitudes_Web_Hot_Host",
  maxRequestCharacters: 30 * 1024 * 1024,
  maxMetadataCharacters: 64 * 1024,
  maxFiles: 10,
  maxFileBytes: 4 * 1024 * 1024,
  maxUploadsPerEmail: 5,
  rateLimitSeconds: 6 * 60 * 60,
  maxUploadsGlobally: 30,
  globalRateLimitSeconds: 60 * 60,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
});

function doGet() {
  try {
    const folder = getRootFolder_();
    return jsonResponse_({
      ok: true,
      configured: true,
      service: "Hot Host property photo upload",
      destination: folder.getName()
    });
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      ok: false,
      configured: false,
      service: "Hot Host property photo upload",
      error: String(error.message || error)
    });
  }
}

function doPost(event) {
  let requestFolder = null;
  try {
    if (!event) throw new Error("Empty request");

    const formPayload = event.parameter && event.parameter.payload;
    const rawPayload = formPayload || (event.postData && event.postData.contents);
    if (!rawPayload) throw new Error("Empty request");
    if (rawPayload.length > UPLOAD_CONFIG.maxRequestCharacters) {
      throw new Error("Request is too large");
    }

    const payload = JSON.parse(rawPayload);
    if (payload.website) return jsonResponse_({ ok: true });
    validatePayload_(payload);
    enforceRateLimit_(payload.contact.email);

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const rootFolder = getRootFolder_();
      requestFolder = rootFolder.createFolder(buildFolderName_(payload));
    } finally {
      lock.releaseLock();
    }

    const storedPhotos = payload.photos.map(function (photo, index) {
      if (photo.data.length > Math.ceil(UPLOAD_CONFIG.maxFileBytes * 4 / 3) + 4) {
        throw new Error("An optimised image exceeds the allowed size");
      }
      const bytes = Utilities.base64Decode(photo.data);
      if (bytes.length > UPLOAD_CONFIG.maxFileBytes) {
        throw new Error("An optimised image exceeds the allowed size");
      }
      if (!hasValidImageSignature_(bytes, photo.mimeType)) {
        throw new Error("Image content does not match its declared type");
      }
      const fileName = sanitiseFileName_(photo.name, index, photo.mimeType);
      requestFolder.createFile(Utilities.newBlob(bytes, photo.mimeType, fileName));
      return { name: fileName, mimeType: photo.mimeType, bytes: bytes.length };
    });

    const metadata = {
      submissionId: payload.submissionId,
      submittedAt: payload.submittedAt,
      receivedAt: new Date().toISOString(),
      language: payload.language,
      sourceUrl: payload.sourceUrl,
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

    return jsonResponse_({
      ok: true,
      submissionId: payload.submissionId,
      filesStored: storedPhotos.length,
      folderUrl: requestFolder.getUrl()
    });
  } catch (error) {
    if (requestFolder) {
      try {
        requestFolder.setTrashed(true);
      } catch (cleanupError) {
        console.error(cleanupError);
      }
    }
    console.error(error);
    return jsonResponse_({ ok: false, error: String(error.message || error) });
  }
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
  if (!/^[a-z0-9-]{8,80}$/i.test(String(payload.submissionId || ""))) {
    throw new Error("Invalid submission reference");
  }
  if (!payload.contact || !payload.property) throw new Error("Missing request data");
  if (!payload.consent || payload.consent.accepted !== true) throw new Error("Consent is required");
  if (!String(payload.contact.name || "").trim()) throw new Error("Missing contact name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.contact.email || "").trim())) {
    throw new Error("Invalid contact email");
  }
  if (!Array.isArray(payload.photos) || !payload.photos.length) {
    throw new Error("No photos received");
  }
  const metadataLength = JSON.stringify({
    submissionId: payload.submissionId,
    submittedAt: payload.submittedAt,
    language: payload.language,
    sourceUrl: payload.sourceUrl,
    consent: payload.consent,
    contact: payload.contact,
    property: payload.property
  }).length;
  if (metadataLength > UPLOAD_CONFIG.maxMetadataCharacters) throw new Error("Request metadata is too large");
  if (payload.photos.length > UPLOAD_CONFIG.maxFiles) throw new Error("Too many photos");
  payload.photos.forEach(function (photo) {
    if (!photo || !UPLOAD_CONFIG.allowedMimeTypes.includes(photo.mimeType)) {
      throw new Error("Unsupported image type");
    }
    if (!photo.data || typeof photo.data !== "string") throw new Error("Invalid image data");
  });
}

function enforceRateLimit_(email) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(email).trim().toLowerCase(),
    Utilities.Charset.UTF_8
  );
  const key = "upload-" + digest.map(function (value) {
    return (value + 256).toString(16).slice(-2);
  }).join("").slice(0, 40);
  const cache = CacheService.getScriptCache();
  const globalKey = "upload-global";
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const currentCount = Number(cache.get(key) || 0);
    const globalCount = Number(cache.get(globalKey) || 0);
    if (currentCount >= UPLOAD_CONFIG.maxUploadsPerEmail || globalCount >= UPLOAD_CONFIG.maxUploadsGlobally) {
      throw new Error("Upload rate limit reached");
    }
    cache.put(key, String(currentCount + 1), UPLOAD_CONFIG.rateLimitSeconds);
    cache.put(globalKey, String(globalCount + 1), UPLOAD_CONFIG.globalRateLimitSeconds);
  } finally {
    lock.releaseLock();
  }
}

function getRootFolder_() {
  if (!UPLOAD_CONFIG.rootFolderId) {
    throw new Error("Drive destination folder is not configured");
  }
  try {
    const folder = DriveApp.getFolderById(UPLOAD_CONFIG.rootFolderId);
    folder.getName();
    return folder;
  } catch (error) {
    throw new Error(
      `The configured Drive folder (${UPLOAD_CONFIG.rootFolderName}) is unavailable. ` +
      "Verify that the Apps Script project is owned by the same Google account that can access the folder."
    );
  }
}

function testConfiguration() {
  const folder = getRootFolder_();
  const result = {
    ok: true,
    folderName: folder.getName(),
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    timeZone: Session.getScriptTimeZone()
  };
  console.log(JSON.stringify(result));
  return result;
}

function buildFolderName_(payload) {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmmss");
  const contactName = sanitiseText_(payload.contact.name, "Contacto", 50);
  const city = sanitiseText_(payload.property.city, "Sin ciudad", 40);
  return `${timestamp} - ${contactName} - ${city} - ${payload.submissionId.slice(0, 8)}`;
}

function sanitiseText_(value, fallback, maxLength) {
  const cleanValue = String(value || "")
    .replace(/[\\/:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleanValue || fallback).slice(0, maxLength);
}

function sanitiseFileName_(value, index, mimeType) {
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mimeType];
  const withoutExtension = String(value || "").replace(/\.[^.]+$/, "");
  const cleanName = sanitiseText_(withoutExtension, `photo-${index + 1}`, 80);
  return `${cleanName}.${extension}`;
}

function hasValidImageSignature_(bytes, mimeType) {
  function byteAt(index) {
    return (Number(bytes[index]) + 256) % 256;
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && byteAt(0) === 0xff && byteAt(1) === 0xd8 && byteAt(2) === 0xff;
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every(function (value, index) {
      return byteAt(index) === value;
    });
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12
      && byteAt(0) === 0x52 && byteAt(1) === 0x49 && byteAt(2) === 0x46 && byteAt(3) === 0x46
      && byteAt(8) === 0x57 && byteAt(9) === 0x45 && byteAt(10) === 0x42 && byteAt(11) === 0x50;
  }
  return false;
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
