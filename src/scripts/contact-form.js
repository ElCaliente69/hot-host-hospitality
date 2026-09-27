/**
 * Formulario "Analizar mi propiedad".
 *
 * Portado tal cual de la web anterior (hhosthospitality.com/assets/app.js?v=20260727-5):
 * mismos campos, mismas validaciones, mismo payload (version 3) y mismo envío por
 * formulario nativo + iframe oculto al Web App de Apps Script "Hot Host - Integración web",
 * que responde con postMessage. El backend no se ha tocado.
 *
 * Cambios respecto al original:
 *  - Solo español (la web nueva no tiene selector de idioma) y sin restaurar estado entre idiomas.
 *  - El endpoint llega por data-endpoint desde src/config.ts en vez de window.HOT_HOST_CONFIG.
 *  - Protección nueva: fuera de https://hhosthospitality.com no se envía nada. El backend
 *    rechazaría el sourceUrl y solo responde por postMessage a ese origen, así que en local
 *    o en previews el envío fallaría tras 6 minutos de espera; aquí se valida y se avisa.
 */
import { COUNTRIES } from './countries.js';

const LANGUAGE = 'es';
const CONTACT_EMAIL = 'direccion@hhosthospitality.com';
const MIN_PROPERTY_PHOTOS = 10;
const MAX_PROPERTY_PHOTOS = 60;
const MAX_PROPERTY_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_OPTIMISED_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_UPLOAD_REQUEST_CHARACTERS = 30 * 1024 * 1024;
const MAX_PROPERTY_PHOTO_DIMENSION = 1920;
const PHOTO_PROCESS_TIMEOUT_MS = 30000;
const PHOTO_UPLOAD_TIMEOUT_MS = 6 * 60 * 1000;
// Deben coincidir con INTEGRATION_DEFAULTS del Apps Script (booking*).
const APPOINTMENT_TIME_ZONE = 'Europe/Madrid';
const APPOINTMENT_DAYS_AHEAD = 14;
const APPOINTMENT_MIN_LEAD_HOURS = 24;
const APPOINTMENT_WEEKDAYS = [1, 2, 3, 4];
const APPOINTMENT_TIMES = ['11:00', '12:00', '13:00'];

// Textos del formulario (locales.es.form + getFormEnhancements('es') del original).
const FORM = {
  roles: [['owner', 'Propietario/a'], ['representative', 'Representante'], ['agency', 'Agencia o inmobiliaria']],
  propertyTypes: [['villa', 'Villa'], ['studio', 'Estudio'], ['flat', 'Piso'], ['house', 'Casa'], ['chalet', 'Chalet'], ['other', 'Otro']],
  rentalOptions: [['yes', 'Sí'], ['no', 'No']],
  appointmentTimePlaceholder: 'Elige una hora',
  appointmentNoSlots: 'No hay fechas que cumplan la antelación mínima de 24 horas. Inténtalo de nuevo más tarde.',
  photosSelected: 'Fotografías seleccionadas: {count}',
  removePhoto: 'Eliminar {name}',
  photosRequired: 'Sube un mínimo de 10 fotografías o añade un enlace donde podamos verlas.',
  photosTooMany: 'Puedes subir un máximo de 60 fotografías.',
  photosTooLarge: 'Cada fotografía debe pesar menos de 20 MB.',
  photosInvalidType: 'Solo se admiten imágenes JPG, PNG o WebP.',
  driveUploading:
    'Optimizando y enviando las fotografías a Google Drive… No cierres esta página; con muchos archivos puede tardar varios minutos.',
  driveNotConfigured: 'La subida directa no está disponible ahora. Añade un enlace compartido a las fotografías.',
  driveUploadError: 'No se pudieron enviar las fotografías a Google Drive. Inténtalo de nuevo o añade un enlace.',
  privacyConsent:
    'Autorizo a Hot Host Hospitality a utilizar los datos y fotografías enviados únicamente para evaluar esta solicitud.',
  validation: {
    required: 'Este campo es obligatorio.',
    email: 'Introduce una dirección de correo válida.',
    url: 'Introduce una URL completa y válida, por ejemplo https://…',
    phoneNoPrefix: 'No incluyas el signo + ni el prefijo internacional en este campo.',
    phone: 'Introduce un número nacional válido de entre 4 y 15 dígitos.',
    number: 'Introduce un número válido.',
    minimum: 'El valor debe ser 1 o superior.',
    floorMinimum: 'La planta debe ser 0 o superior.',
    tooShort: 'Completa este campo con más detalle.',
    generic: 'Revisa el valor introducido.',
    review: 'Revisa los campos indicados antes de enviar la consulta.',
  },
  status: {
    submissionError: `No se pudo registrar la solicitud. Recarga la página e inténtalo de nuevo; si continúa, escribe a ${CONTACT_EMAIL}.`,
    submissionSending: 'Enviando la solicitud de forma segura...',
    submissionSent:
      'Solicitud guardada. Revisa tu email y también SPAM o correo no deseado; pulsa «Verificar email» para activarla.',
    previewOnly:
      'Vista previa: la solicitud es válida, pero los envíos reales solo funcionan en https://hhosthospitality.com/contacto. No se ha enviado nada.',
  },
};

let selectedPropertyPhotos = [];

function getLocalizedCountries(language) {
  let displayNames = null;
  try {
    if (typeof Intl.DisplayNames === 'function') {
      displayNames = new Intl.DisplayNames([language], { type: 'region' });
    }
  } catch (error) {
    displayNames = null;
  }

  const countries = COUNTRIES.map(function (country) {
    let name = country[2];
    if (displayNames) {
      try {
        const localizedName = displayNames.of(country[0]);
        if (localizedName && localizedName !== country[0]) name = localizedName;
      } catch (error) {
        name = country[2];
      }
    }
    return { iso: country[0], dialCode: country[1], name: name };
  });

  try {
    const collator = new Intl.Collator(language, { sensitivity: 'base' });
    countries.sort(function (first, second) { return collator.compare(first.name, second.name); });
  } catch (error) {
    countries.sort(function (first, second) { return first.name.localeCompare(second.name); });
  }
  return countries;
}

function populateCountrySelects() {
  const propertyCountry = document.querySelector('#propertyCountry');
  const phoneCountry = document.querySelector('#phoneCountry');
  if (!propertyCountry || !phoneCountry) return;

  const countries = getLocalizedCountries(LANGUAGE);
  const propertyFragment = document.createDocumentFragment();
  const phoneFragment = document.createDocumentFragment();
  countries.forEach(function (country) {
    const propertyOption = document.createElement('option');
    propertyOption.value = country.iso;
    propertyOption.textContent = country.name;
    propertyFragment.appendChild(propertyOption);

    const phoneOption = document.createElement('option');
    phoneOption.value = country.iso;
    phoneOption.textContent = `${country.name} (+${country.dialCode})`;
    phoneFragment.appendChild(phoneOption);
  });
  propertyCountry.appendChild(propertyFragment);
  phoneCountry.appendChild(phoneFragment);

  propertyCountry.value = '';
  phoneCountry.value = 'ES';
}

function getOptionLabel(options, value) {
  const option = options.find(function (item) { return item[0] === value; });
  return option ? option[1] : value;
}

function getCountry(iso) {
  const country = COUNTRIES.find(function (item) { return item[0] === iso; });
  return country || [iso, '', iso];
}

function getCountryName(iso) {
  const countries = getLocalizedCountries(LANGUAGE);
  const country = countries.find(function (item) { return item.iso === iso; });
  return country ? country.name : iso;
}

function formatFormMessage(template, replacements) {
  return Object.keys(replacements).reduce(function (message, key) {
    const placeholder = `{${key}}`;
    const value = String(replacements[key]);
    return message.includes(placeholder) ? message.replace(placeholder, value) : message;
  }, template);
}

function createSubmissionId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getGoogleAppsScriptEndpoint(configuredEndpoint) {
  if (!configuredEndpoint) return '';
  try {
    const endpoint = new URL(String(configuredEndpoint).trim());
    const validPath = /^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname);
    return endpoint.protocol === 'https:' && endpoint.hostname === 'script.google.com' && validPath
      ? endpoint.href
      : '';
  } catch (error) {
    return '';
  }
}

function optimisePropertyPhoto(file, index, targetBytes) {
  return new Promise(function (resolve, reject) {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    const safeTargetBytes = Math.max(
      220 * 1024,
      Math.min(MAX_OPTIMISED_PHOTO_BYTES, Number(targetBytes) || MAX_OPTIMISED_PHOTO_BYTES)
    );
    let settled = false;
    let sourceRevoked = false;
    const timeout = window.setTimeout(function () {
      finish(reject, new Error('Image processing timed out'));
    }, PHOTO_PROCESS_TIMEOUT_MS);

    function revokeSource() {
      if (sourceRevoked) return;
      sourceRevoked = true;
      URL.revokeObjectURL(sourceUrl);
    }

    function finish(callback, value) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      revokeSource();
      callback(value);
    }

    image.onload = function () {
      revokeSource();
      const scale = Math.min(1, MAX_PROPERTY_PHOTO_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
      let width = Math.max(1, Math.round(image.naturalWidth * scale));
      let height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        finish(reject, new Error('Canvas is unavailable'));
        return;
      }

      const baseName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || `photo-${index + 1}`;

      function readOptimisedPhoto(blob) {
        const reader = new FileReader();
        reader.onload = function () {
          finish(resolve, {
            name: `${String(index + 1).padStart(2, '0')}-${baseName}.jpg`,
            mimeType: 'image/jpeg',
            size: blob.size,
            data: String(reader.result).split(',')[1],
          });
        };
        reader.onerror = function () { finish(reject, new Error('Image could not be read')); };
        reader.readAsDataURL(blob);
      }

      function encodePhoto(quality) {
        if (settled) return;
        canvas.width = width;
        canvas.height = height;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(function (blob) {
          if (settled) return;
          if (!blob) {
            finish(reject, new Error('Image optimisation failed'));
            return;
          }
          if (blob.size <= safeTargetBytes) {
            readOptimisedPhoto(blob);
            return;
          }
          if (quality > .52) {
            encodePhoto(Math.max(.52, quality - .1));
            return;
          }

          const longestSide = Math.max(width, height);
          if (longestSide <= 900) {
            finish(reject, new Error('Optimised image is too large'));
            return;
          }
          const resizeScale = Math.max(900 / longestSide, .82);
          width = Math.max(1, Math.round(width * resizeScale));
          height = Math.max(1, Math.round(height * resizeScale));
          encodePhoto(.78);
        }, 'image/jpeg', quality);
      }

      encodePhoto(.82);
    };
    image.onerror = function () {
      finish(reject, new Error('Image could not be decoded'));
    };
    image.src = sourceUrl;
  });
}

async function submitWorkspaceRequest(endpoint, files, metadata) {
  const photos = [];
  // Reserve space for base64, form encoding and request metadata when a batch approaches 60 files.
  const availablePhotoBytes = Math.floor((MAX_UPLOAD_REQUEST_CHARACTERS - 512 * 1024) * .66);
  const targetPhotoBytes = Math.min(
    MAX_OPTIMISED_PHOTO_BYTES,
    Math.floor(availablePhotoBytes / Math.max(files.length, 1))
  );
  for (let index = 0; index < files.length; index += 1) {
    photos.push(await optimisePropertyPhoto(files[index], index, targetPhotoBytes));
  }
  const payload = Object.assign({ version: 3, photos: photos }, metadata);
  const payloadBody = JSON.stringify(payload);
  if (payloadBody.length > MAX_UPLOAD_REQUEST_CHARACTERS) {
    throw new Error('Workspace request is too large');
  }
  // A native form POST reaches Apps Script without requiring a CORS response.
  return new Promise(function (resolve, reject) {
    const targetName = `workspace-submit-${payload.submissionId}`;
    const targetFrame = document.createElement('iframe');
    const requestForm = document.createElement('form');
    const payloadInput = document.createElement('input');
    let submitted = false;
    let settled = false;
    let timeout;

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleResponse);
      targetFrame.remove();
      requestForm.remove();
    }

    function finish(callback, value) {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    }

    function submitRequest() {
      if (submitted) return;
      submitted = true;
      try {
        requestForm.submit();
      } catch (error) {
        finish(reject, error);
      }
    }

    function handleResponse(event) {
      const trustedGoogleOrigin = /^https:\/\/(?:[a-z0-9-]+\.)*googleusercontent\.com$/i.test(event.origin)
        || event.origin === 'https://script.google.com';
      if (event.source !== targetFrame.contentWindow && !trustedGoogleOrigin) return;
      const message = event.data;
      if (!message || message.source !== 'hot-host-workspace' || !message.result) return;
      const result = message.result;
      if (result.submissionId && result.submissionId !== payload.submissionId) return;
      if (result.ok) finish(resolve, result);
      else finish(reject, new Error(result.error || 'Workspace request failed'));
    }

    targetFrame.name = targetName;
    targetFrame.title = '';
    targetFrame.srcdoc = '<!doctype html><title></title>';
    targetFrame.tabIndex = -1;
    targetFrame.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;border:0;overflow:hidden';
    targetFrame.setAttribute('aria-hidden', 'true');
    targetFrame.addEventListener('load', function () {
      if (!submitted) {
        submitRequest();
      }
    });

    requestForm.method = 'POST';
    requestForm.action = endpoint;
    requestForm.target = targetName;
    requestForm.enctype = 'application/x-www-form-urlencoded';
    requestForm.acceptCharset = 'UTF-8';
    requestForm.hidden = true;

    payloadInput.type = 'hidden';
    payloadInput.name = 'payload';
    payloadInput.value = payloadBody;
    requestForm.appendChild(payloadInput);
    window.addEventListener('message', handleResponse);
    timeout = window.setTimeout(function () {
      finish(reject, new Error('Workspace request timed out'));
    }, PHOTO_UPLOAD_TIMEOUT_MS);
    document.body.append(targetFrame, requestForm);
  });
}

function setConditionalField(field, control, visible) {
  field.hidden = !visible;
  control.required = visible;
  if (!visible) {
    control.value = '';
    control.setCustomValidity('');
    control.removeAttribute('aria-invalid');
  }
}

function getZonedDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return parts.reduce(function (result, part) {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});
}

function zonedAppointmentDate(dateValue, timeValue) {
  const dateParts = dateValue.split('-').map(Number);
  const timeParts = timeValue.split(':').map(Number);
  const desiredUtc = Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
  let candidate = desiredUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedDateParts(new Date(candidate), APPOINTMENT_TIME_ZONE);
    const representedUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    candidate += desiredUtc - representedUtc;
  }
  return new Date(candidate);
}

function getAppointmentPreferences(language) {
  const now = new Date();
  const current = getZonedDateParts(now, APPOINTMENT_TIME_ZONE);
  const dayAnchor = Date.UTC(current.year, current.month - 1, current.day);
  const earliest = now.getTime() + APPOINTMENT_MIN_LEAD_HOURS * 60 * 60 * 1000;
  const formatter = new Intl.DateTimeFormat(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const preferences = [];

  for (let offset = 0; offset <= APPOINTMENT_DAYS_AHEAD; offset += 1) {
    const day = new Date(dayAnchor + offset * 24 * 60 * 60 * 1000);
    if (!APPOINTMENT_WEEKDAYS.includes(day.getUTCDay())) continue;
    const dateValue = day.toISOString().slice(0, 10);
    const times = APPOINTMENT_TIMES.filter(function (timeValue) {
      return zonedAppointmentDate(dateValue, timeValue).getTime() >= earliest;
    });
    if (!times.length) continue;
    const dateLabel = formatter.format(day);
    preferences.push({
      value: dateValue,
      label: dateLabel.charAt(0).toLocaleUpperCase(language) + dateLabel.slice(1),
      times: times,
    });
  }
  return preferences;
}

function setupContactForm() {
  const form = document.querySelector('#contactForm');
  if (!form) return;

  populateCountrySelects();

  const propertyType = form.querySelector('#propertyType');
  const touristRental = form.querySelector('#touristRental');
  const bedroomsField = form.querySelector('#bedroomsField');
  const bedrooms = form.querySelector('#bedrooms');
  const propertyPhotosField = form.querySelector('#propertyPhotosField');
  const propertyPhotos = form.querySelector('#propertyPhotos');
  const photosUrl = form.querySelector('#photosUrl');
  const photosStatus = form.querySelector('#propertyPhotosStatus');
  const photoPreviews = form.querySelector('#propertyPhotoPreviews');
  const photoDropzone = form.querySelector('[data-photo-dropzone]');
  const appointmentDate = form.querySelector('#appointmentDate');
  const appointmentTime = form.querySelector('#appointmentTime');
  const appointmentStatus = form.querySelector('#appointmentPreferenceStatus');
  const workspaceEndpoint = getGoogleAppsScriptEndpoint(form.dataset.endpoint);
  const driveUploadAvailable = Boolean(workspaceEndpoint);
  const isProductionOrigin = window.location.origin === form.dataset.productionOrigin;
  const appointmentPreferences = getAppointmentPreferences(LANGUAGE);

  // Sin endpoint válido, el original ocultaba la subida directa y pedía un enlace.
  if (!driveUploadAvailable) {
    photoDropzone.hidden = true;
    propertyPhotos.disabled = true;
  }

  appointmentPreferences.forEach(function (preference) {
    const option = document.createElement('option');
    option.value = preference.value;
    option.textContent = preference.label;
    appointmentDate.appendChild(option);
  });
  if (!appointmentPreferences.length) {
    appointmentDate.dataset.noSlots = 'true';
    appointmentDate.setCustomValidity(FORM.appointmentNoSlots);
    appointmentStatus.textContent = FORM.appointmentNoSlots;
    appointmentStatus.dataset.kind = 'warning';
  }

  function updateAppointmentTimes(preferredTime) {
    const preference = appointmentPreferences.find(function (item) {
      return item.value === appointmentDate.value;
    });
    appointmentTime.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = FORM.appointmentTimePlaceholder;
    appointmentTime.appendChild(placeholder);
    (preference ? preference.times : []).forEach(function (timeValue) {
      const option = document.createElement('option');
      option.value = timeValue;
      option.textContent = timeValue;
      appointmentTime.appendChild(option);
    });
    appointmentTime.disabled = !preference;
    if (preferredTime && preference && preference.times.includes(preferredTime)) {
      appointmentTime.value = preferredTime;
    }
  }

  updateAppointmentTimes('');
  appointmentDate.addEventListener('change', function () {
    updateAppointmentTimes('');
    appointmentTime.setCustomValidity('');
  });

  function setPhotoStatus(message, kind) {
    photosStatus.textContent = message;
    if (kind) photosStatus.dataset.kind = kind;
    else delete photosStatus.dataset.kind;
  }

  function validatePhotoRequirement() {
    const requiresPhotos = touristRental.value === 'no';
    const photosLink = String(photosUrl.value || '').trim();
    const hasPhotos = selectedPropertyPhotos.length >= MIN_PROPERTY_PHOTOS || photosLink;
    const validationMessage = requiresPhotos && !hasPhotos ? FORM.photosRequired : '';
    propertyPhotos.setCustomValidity(driveUploadAvailable ? validationMessage : '');
    photosUrl.setCustomValidity(driveUploadAvailable ? '' : validationMessage);
    if (validationMessage && selectedPropertyPhotos.length) {
      setPhotoStatus(validationMessage, 'error');
    } else if (!validationMessage && selectedPropertyPhotos.length && photosStatus.dataset.kind === 'error') {
      setPhotoStatus(
        formatFormMessage(FORM.photosSelected, { count: selectedPropertyPhotos.length }),
        'selected'
      );
    }
    if (driveUploadAvailable && propertyPhotos.validationMessage) {
      propertyPhotos.setAttribute('aria-invalid', 'true');
      photoDropzone.classList.add('invalid');
    } else {
      propertyPhotos.removeAttribute('aria-invalid');
      photoDropzone.classList.remove('invalid');
    }
    if (!driveUploadAvailable && photosUrl.validationMessage) photosUrl.setAttribute('aria-invalid', 'true');
    else if (!photosUrl.validity.typeMismatch) photosUrl.removeAttribute('aria-invalid');
    return driveUploadAvailable ? !propertyPhotos.validationMessage : !photosUrl.validationMessage;
  }

  function renderPhotoPreviews() {
    photoPreviews.querySelectorAll('img[data-object-url]').forEach(function (image) {
      URL.revokeObjectURL(image.dataset.objectUrl);
    });
    photoPreviews.replaceChildren();
    selectedPropertyPhotos.forEach(function (file, index) {
      const preview = document.createElement('figure');
      preview.className = 'property-photo-preview';
      const image = document.createElement('img');
      const imageUrl = URL.createObjectURL(file);
      image.src = imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.dataset.objectUrl = imageUrl;
      const revokePreviewUrl = function () {
        URL.revokeObjectURL(imageUrl);
        delete image.dataset.objectUrl;
      };
      image.onload = revokePreviewUrl;
      image.onerror = revokePreviewUrl;
      const caption = document.createElement('figcaption');
      caption.textContent = file.name;
      const removeButton = document.createElement('button');
      const removeLabel = formatFormMessage(FORM.removePhoto, { name: file.name });
      removeButton.type = 'button';
      removeButton.textContent = '×';
      removeButton.title = FORM.removePhoto.includes('{name}') ? removeLabel : `${removeLabel}: ${file.name}`;
      removeButton.setAttribute('aria-label', removeButton.title);
      removeButton.addEventListener('click', function () {
        selectedPropertyPhotos.splice(index, 1);
        renderPhotoPreviews();
        validatePhotoRequirement();
      });
      preview.append(image, caption, removeButton);
      photoPreviews.appendChild(preview);
    });

    if (selectedPropertyPhotos.length) {
      const countMessage = formatFormMessage(FORM.photosSelected, { count: selectedPropertyPhotos.length });
      setPhotoStatus(
        FORM.photosSelected.includes('{count}')
          ? countMessage
          : `${countMessage}: ${selectedPropertyPhotos.length}`,
        'selected'
      );
    } else {
      setPhotoStatus(driveUploadAvailable ? '' : FORM.driveNotConfigured, driveUploadAvailable ? '' : 'warning');
    }
  }

  function addPropertyPhotos(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.some(function (file) { return !['image/jpeg', 'image/png', 'image/webp'].includes(file.type); })) {
      setPhotoStatus(FORM.photosInvalidType, 'error');
      return;
    }
    if (files.some(function (file) { return file.size > MAX_PROPERTY_PHOTO_BYTES; })) {
      setPhotoStatus(FORM.photosTooLarge, 'error');
      return;
    }

    const nextPhotos = selectedPropertyPhotos.slice();
    files.forEach(function (file) {
      const isDuplicate = nextPhotos.some(function (selectedFile) {
        return selectedFile.name === file.name
          && selectedFile.size === file.size
          && selectedFile.lastModified === file.lastModified;
      });
      if (!isDuplicate) nextPhotos.push(file);
    });
    if (nextPhotos.length > MAX_PROPERTY_PHOTOS) {
      setPhotoStatus(FORM.photosTooMany, 'error');
      return;
    }
    selectedPropertyPhotos = nextPhotos;
    propertyPhotos.value = '';
    renderPhotoPreviews();
    validatePhotoRequirement();
  }

  function updatePropertyFields() {
    const type = propertyType.value;
    const isStudio = type === 'studio';
    const wasStudio = bedroomsField.hidden;
    setConditionalField(form.querySelector('#otherTypeField'), form.querySelector('#otherType'), type === 'other');
    setConditionalField(form.querySelector('#floorField'), form.querySelector('#floor'), type === 'flat' || isStudio || type === 'other');
    setConditionalField(form.querySelector('#totalFloorsField'), form.querySelector('#totalFloors'), ['villa', 'house', 'chalet'].includes(type));
    bedroomsField.hidden = isStudio;
    bedrooms.required = !isStudio;
    if (isStudio) bedrooms.value = '1';
    else if (wasStudio) bedrooms.value = '';
  }

  function updateRentalFields() {
    setConditionalField(form.querySelector('#listingUrlField'), form.querySelector('#listingUrl'), touristRental.value === 'yes');
    const showPhotos = touristRental.value === 'no';
    propertyPhotosField.hidden = !showPhotos;
    photosUrl.required = showPhotos && !driveUploadAvailable;
    if (!showPhotos) {
      photosUrl.value = '';
      propertyPhotos.value = '';
      selectedPropertyPhotos = [];
      renderPhotoPreviews();
    }
    validatePhotoRequirement();
  }

  function validateControl(control) {
    if (!control || !control.willValidate) return true;
    if (control === propertyPhotos) return validatePhotoRequirement();
    const messages = FORM.validation;
    control.setCustomValidity('');
    const value = String(control.value || '').trim();

    if (control === appointmentDate && control.dataset.noSlots === 'true') {
      control.setCustomValidity(FORM.appointmentNoSlots);
    } else if (control.type === 'checkbox' && control.required && !control.checked) {
      control.setCustomValidity(messages.required);
    } else if (control.required && !value) {
      control.setCustomValidity(messages.required);
    } else if (control.id === 'phone' && value.includes('+')) {
      control.setCustomValidity(messages.phoneNoPrefix);
    } else if (control.id === 'phone' && value) {
      const digits = value.replace(/\D/g, '');
      if (!/^[-0-9 ()./]+$/.test(value) || digits.length < 4 || digits.length > 15) {
        control.setCustomValidity(messages.phone);
      }
    } else if (control.validity.typeMismatch && control.type === 'email') {
      control.setCustomValidity(messages.email);
    } else if (control.validity.typeMismatch && control.type === 'url') {
      control.setCustomValidity(messages.url);
    } else if (control.validity.badInput || control.validity.stepMismatch) {
      control.setCustomValidity(messages.number);
    } else if (control.validity.rangeUnderflow) {
      control.setCustomValidity(control.id === 'floor' ? messages.floorMinimum : messages.minimum);
    } else if (control.validity.tooShort) {
      control.setCustomValidity(messages.tooShort);
    } else if (control.validity.patternMismatch) {
      control.setCustomValidity(control.id === 'phone' ? messages.phone : messages.generic);
    }

    if (control.validationMessage) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
    return !control.validationMessage;
  }

  propertyType.addEventListener('change', updatePropertyFields);
  touristRental.addEventListener('change', updateRentalFields);
  propertyPhotos.addEventListener('change', function () { addPropertyPhotos(propertyPhotos.files); });
  photosUrl.addEventListener('input', validatePhotoRequirement);
  ['dragenter', 'dragover'].forEach(function (eventName) {
    photoDropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      photoDropzone.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (eventName) {
    photoDropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      photoDropzone.classList.remove('dragging');
      if (eventName === 'drop') addPropertyPhotos(event.dataTransfer.files);
    });
  });
  form.addEventListener('input', function (event) {
    validateControl(event.target);
    if (event.target === photosUrl) validatePhotoRequirement();
    const status = form.querySelector('#formStatus');
    if (status.dataset.kind === 'validation') {
      status.textContent = '';
      delete status.dataset.kind;
    }
  });
  form.addEventListener('change', function (event) {
    validateControl(event.target);
  });

  updatePropertyFields();
  updateRentalFields();
  renderPhotoPreviews();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const controls = Array.from(form.elements).filter(function (control) { return control.willValidate; });
    const isValid = controls.map(validateControl).every(Boolean);
    const status = form.querySelector('#formStatus');
    if (!isValid) {
      status.textContent = FORM.validation.review;
      status.dataset.kind = 'validation';
      form.reportValidity();
      form.dispatchEvent(new CustomEvent('hot-host-submission-result', {
        detail: { ok: false, reason: 'validation' },
      }));
      return;
    }

    const data = new FormData(form);
    const typeCode = String(data.get('propertyType'));
    const role = getOptionLabel(FORM.roles, String(data.get('contactRole')));
    const rental = getOptionLabel(FORM.rentalOptions, String(data.get('touristRental')));
    let propertyTypeLabel = getOptionLabel(FORM.propertyTypes, typeCode);
    if (typeCode === 'other') {
      propertyTypeLabel = `${propertyTypeLabel}: ${String(data.get('otherType')).trim()}`;
    }

    const phoneCountry = getCountry(String(data.get('phoneCountry')));
    const internationalPhone = `+${phoneCountry[1]} ${String(data.get('phone')).trim()}`;
    const selectedPhotos = touristRental.value === 'no' ? selectedPropertyPhotos.slice() : [];
    const photosLink = String(data.get('photosUrl') || '').trim();
    const submissionId = createSubmissionId();

    if (!workspaceEndpoint) {
      status.textContent = FORM.status.submissionError;
      status.dataset.kind = 'validation';
      form.dispatchEvent(new CustomEvent('hot-host-submission-result', {
        detail: { ok: false, reason: 'configuration' },
      }));
      return;
    }

    const metadata = {
      submissionId: submissionId,
      submittedAt: new Date().toISOString(),
      language: LANGUAGE,
      sourceUrl: window.location.href.split(/[?#]/, 1)[0],
      deliveryMethod: 'email',
      website: '',
      consent: {
        accepted: Boolean(data.get('privacyConsent')),
        text: FORM.privacyConsent,
      },
      contact: {
        relationship: role,
        name: String(data.get('name')).trim(),
        email: String(data.get('email')).trim(),
        phone: internationalPhone,
      },
      appointment: {
        date: String(data.get('appointmentDate') || ''),
        time: String(data.get('appointmentTime') || ''),
      },
      property: {
        street: String(data.get('streetAddress')).trim(),
        postalCode: String(data.get('postalCode')).trim(),
        city: String(data.get('city')).trim(),
        country: getCountryName(String(data.get('propertyCountry'))),
        type: propertyTypeLabel,
        bedrooms: String(data.get('bedrooms')).trim(),
        bathrooms: String(data.get('bathrooms')).trim(),
        floor: String(data.get('floor') || '').trim(),
        totalFloors: String(data.get('totalFloors') || '').trim(),
        touristRental: rental,
        listingUrl: String(data.get('listingUrl') || '').trim(),
        photosUrl: photosLink,
        comments: String(data.get('message') || '').trim(),
      },
    };

    // Nuevo: fuera de producción no se envía nada real (ver cabecera del archivo).
    if (!isProductionOrigin) {
      console.info('[Hot Host] Vista previa: payload que se enviaría (sin fotos):', Object.assign({ version: 3, photos: selectedPhotos.length }, metadata));
      status.textContent = FORM.status.previewOnly;
      status.dataset.kind = 'warning';
      form.dispatchEvent(new CustomEvent('hot-host-submission-result', {
        detail: { ok: false, reason: 'preview', payload: metadata },
      }));
      return;
    }

    const submitButtons = Array.from(form.querySelectorAll("button[type='submit']"));
    submitButtons.forEach(function (button) { button.disabled = true; });
    status.textContent = selectedPhotos.length
      ? FORM.driveUploading
      : FORM.status.submissionSending;
    status.dataset.kind = 'uploading';
    if (selectedPhotos.length) setPhotoStatus(FORM.driveUploading, 'uploading');

    let workspaceResult;
    try {
      workspaceResult = await submitWorkspaceRequest(workspaceEndpoint, selectedPhotos, metadata);
    } catch (error) {
      console.error(error);
      if (selectedPhotos.length) setPhotoStatus(FORM.driveUploadError, 'error');
      status.textContent = FORM.status.submissionError;
      status.dataset.kind = 'validation';
      submitButtons.forEach(function (button) { button.disabled = false; });
      form.dispatchEvent(new CustomEvent('hot-host-submission-result', {
        detail: { ok: false, reason: 'submission', error: String(error.message || error) },
      }));
      return;
    }

    submitButtons.forEach(function (button) { button.disabled = false; });
    status.textContent = FORM.status.submissionSent;
    status.dataset.kind = 'success';
    form.reset();
    phoneCountryReset(form);
    updateAppointmentTimes('');
    selectedPropertyPhotos = [];
    updatePropertyFields();
    updateRentalFields();
    form.dispatchEvent(new CustomEvent('hot-host-submission-result', {
      detail: { ok: true, result: workspaceResult },
    }));
  });
}

// Tras form.reset() el prefijo vuelve a la primera opción; el original lo repoblaba al re-renderizar.
function phoneCountryReset(form) {
  const phoneCountry = form.querySelector('#phoneCountry');
  if (phoneCountry) phoneCountry.value = 'ES';
}

/** Herramienta interna de pruebas (?test=1), igual que en la web anterior. */
function setupContactTestTool() {
  const tool = document.querySelector('.contact-test-tool');
  if (!tool) return;
  let isTestMode = false;
  try {
    isTestMode = new URL(window.location.href).searchParams.get('test') === '1';
  } catch (error) {
    isTestMode = false;
  }
  if (!isTestMode) return;
  tool.hidden = false;

  const emailInput = tool.querySelector('#contactTestEmail');
  const sendButton = tool.querySelector('#contactTestSend');
  const status = tool.querySelector('#contactTestStatus');
  const contactForm = document.querySelector('#contactForm');
  const workspaceEndpoint = getGoogleAppsScriptEndpoint(contactForm.dataset.endpoint);
  const storageKey = 'hotHostContactTestCount';
  const emailStorageKey = 'hotHostContactTestEmail';
  const readStorage = function (key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  };
  const writeStorage = function (key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* almacenamiento bloqueado */ }
  };
  let testCount = Number.parseInt(readStorage(storageKey) || '0', 10);
  if (!Number.isFinite(testCount) || testCount < 0) testCount = 0;
  const privateParameters = new URLSearchParams(window.location.hash.slice(1));
  emailInput.value = privateParameters.get('testEmail') || readStorage(emailStorageKey) || '';

  function updateButtonLabel() {
    sendButton.textContent = `Enviar Test - test ${testCount + 1}`;
  }

  updateButtonLabel();
  const canSubmitTests = window.location.protocol === 'https:' && window.location.hostname === 'hhosthospitality.com';
  if (!canSubmitTests) {
    status.textContent = 'El envío de pruebas solo está habilitado en https://hhosthospitality.com/contacto?test=1';
    status.dataset.kind = 'warning';
  }

  let testPending = false;
  contactForm.addEventListener('hot-host-submission-result', function (event) {
    if (!testPending) return;
    testPending = false;
    const detail = event.detail || {};
    const testNumber = testCount + 1;
    const testName = `Test - test ${testNumber}`;
    if (detail.ok) {
      testCount = testNumber;
      writeStorage(storageKey, String(testCount));
      writeStorage(emailStorageKey, emailInput.value);
      updateButtonLabel();
      if (detail.result && detail.result.verificationSent === false) {
        status.textContent = `${testName} se guardó, pero Google no aceptó el correo de verificación.`;
        status.dataset.kind = 'warning';
      } else {
        status.textContent = `${testName} enviado a ${emailInput.value}.`;
        status.dataset.kind = 'success';
      }
    } else {
      status.textContent = `No se pudo enviar ${testName}. Revisa el límite de pruebas o la ejecución de Apps Script.`;
      status.dataset.kind = 'error';
    }
    sendButton.disabled = false;
    emailInput.disabled = false;
  });

  sendButton.addEventListener('click', function () {
    emailInput.value = String(emailInput.value || '').trim();
    if (!emailInput.reportValidity()) return;
    if (!workspaceEndpoint) {
      status.textContent = 'La integración de Google Workspace no está configurada.';
      status.dataset.kind = 'error';
      return;
    }

    const testNumber = testCount + 1;
    const testName = `Test - test ${testNumber}`;
    const recipient = emailInput.value;
    const setValue = function (selector, value) {
      const control = contactForm.querySelector(selector);
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    };

    selectedPropertyPhotos = [];
    contactForm.reset();
    setValue('#contactRole', 'owner');
    setValue('#name', testName);
    setValue('#email', recipient);
    setValue('#phoneCountry', 'ES');
    setValue('#phone', '600000000');
    setValue('#streetAddress', `Calle Test ${testNumber}`);
    setValue('#postalCode', '41001');
    setValue('#city', 'Sevilla');
    setValue('#propertyCountry', 'ES');
    setValue('#propertyType', 'flat');
    setValue('#bedrooms', '1');
    setValue('#bathrooms', '1');
    setValue('#floor', '1');
    setValue('#touristRental', 'yes');
    setValue('#listingUrl', 'https://hhosthospitality.com/');
    setValue('#photosUrl', '');
    setValue('#message', testName);
    const firstAppointmentDate = Array.from(contactForm.querySelector('#appointmentDate').options)
      .find(function (option) { return option.value; });
    if (firstAppointmentDate) {
      setValue('#appointmentDate', firstAppointmentDate.value);
      const firstAppointmentTime = Array.from(contactForm.querySelector('#appointmentTime').options)
        .find(function (option) { return option.value; });
      if (firstAppointmentTime) setValue('#appointmentTime', firstAppointmentTime.value);
    }
    const consent = contactForm.querySelector('#privacyConsent');
    consent.checked = true;
    consent.dispatchEvent(new Event('change', { bubbles: true }));

    if (!canSubmitTests) {
      status.textContent = `${testName} preparado en el formulario. El envío real solo está habilitado en hhosthospitality.com.`;
      status.dataset.kind = 'warning';
      contactForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    testPending = true;
    sendButton.disabled = true;
    emailInput.disabled = true;
    status.textContent = `Enviando ${testName}...`;
    status.dataset.kind = 'sending';
    contactForm.requestSubmit(contactForm.querySelector("button[type='submit']"));
  });
}

setupContactForm();
setupContactTestTool();
