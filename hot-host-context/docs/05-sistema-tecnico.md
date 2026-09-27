# Hot Host — Sistema técnico: lead magnet "Guía de Amenities"

*(Copia local, exportada de Drive el 27 de septiembre de 2026. Fuente de verdad: [Sistema técnico — Lead magnet Amenities](https://docs.google.com/document/d/1u2IgiZZP_ROIVuTJ_H02c1z_9A1exE2wH2-btEenZMk/edit) en Drive, carpeta "03 Web".)*

## Estado

El PDF de la Guía de Amenities ya está diseñado y generado (`assets/guia-amenities.pdf` en este mismo paquete): 7 páginas, portada + intro + 4 categorías con los 23 detalles con icono propio + cierre con el ejemplo del pastel y datos de contacto.

Pendiente (acción humana en Drive, no de código): subir ese PDF a la carpeta "03 Web" de Drive, compartirlo como "cualquiera con el enlace: lector", y pegar su ID real en `AMENITIES_PDF_FILE_ID` en el código de más abajo. El email que recibe cada lead incluye un enlace directo al PDF además del adjunto, y ese enlace solo funciona si el archivo es público-por-enlace.

## Aviso importante

El código de abajo es para el proyecto de **Google Apps Script existente** ("Hot Host - Integración web", fuera de este repo) — no para el sitio del MVP en sí. Se incluye aquí solo como referencia, por si el MVP necesita saber qué backend de leads ya existe y cómo no pisarlo.

Existe ya un flujo de lead "caliente" (formulario "Analizar mi propiedad" → hoja "Solicitudes web", con tokens de verificación, citas de calendario, decisión de admin, etc.). **Ese flujo no se toca.** El lead "frío" (descarga de la guía) usa un flujo nuevo y separado, más ligero, que no interfiere con el existente.

## 1. Por qué un flujo separado

El lead que descarga un PDF está en una fase mucho más fría que quien pide un análisis completo de su propiedad. Mezclarlo en la misma hoja de "Solicitudes web" ensuciaría esos datos y complicaría el seguimiento comercial, que debería ser distinto para cada tipo de lead.

## 2. Hoja de seguimiento

Ya creada en Drive: "Hot Host - Leads Guía Amenities" (`1lpReTWEkFyCTN7u5NoysnOrFyB8TtNr6AuzV5vOKX9A`), en la misma carpeta que Solicitudes_Web_Hot_Host.

Columnas: `submissionId, submittedAt, email, sourceUrl, consentAccepted, pdfSentAt, status`

## 3. Flujo

1. En la subpágina "Motor de Experiencias" (o donde el MVP decida ubicarlo), un formulario embebido pide solo email + consentimiento.
2. El formulario envía los datos a un Web App de Apps Script, con un parámetro `formType=amenities_pdf`.
3. El script guarda la fila en la hoja de leads, envía el PDF por email (adjunto + enlace), y responde con éxito, mostrando "revisa tu email".

## 4. Código de referencia (Apps Script, backend ya existente)

```javascript
// ===== Lead magnet: Guía de Amenities =====

const AMENITIES_SHEET_NAME = 'Leads Guía Amenities';
const AMENITIES_PDF_FILE_ID = 'PEGAR_AQUI_EL_ID_DEL_PDF_EN_DRIVE'; // pendiente — ver "Estado" arriba
const AMENITIES_LEADS_SHEET_ID = '1lpReTWEkFyCTN7u5NoysnOrFyB8TtNr6AuzV5vOKX9A'; // ya confirmado

function handleAmenitiesLeadSubmission(e) {
  const params = e.parameter;
  const email = (params.email || '').trim().toLowerCase();
  const consent = params.consentAccepted === 'true';
  const sourceUrl = params.sourceUrl || '';

  if (!email || !isValidEmail_(email) || !consent) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'invalid_input' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(AMENITIES_LEADS_SHEET_ID);
  let sheet = ss.getSheetByName(AMENITIES_SHEET_NAME) || ss.getSheets()[0];

  const submissionId = Utilities.getUuid();
  const submittedAt = new Date().toISOString();

  sheet.appendRow([submissionId, submittedAt, email, sourceUrl, consent, '', 'Nuevo']);

  try {
    sendAmenitiesPdf_(email);
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 6).setValue(new Date().toISOString()); // pdfSentAt
    sheet.getRange(lastRow, 7).setValue('Enviado'); // status
  } catch (err) {
    Logger.log('Error enviando PDF de amenities: ' + err);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendAmenitiesPdf_(email) {
  const pdfFile = DriveApp.getFileById(AMENITIES_PDF_FILE_ID);
  MailApp.sendEmail({
    to: email,
    subject: 'Tu guía de amenities Hot Host',
    htmlBody:
      '<p>Gracias por tu interés en Hot Host.</p>' +
      '<p>Aquí tienes la guía completa de amenities que usamos para elevar el valor percibido de las propiedades que gestionamos:</p>' +
      '<p><a href="' + pdfFile.getUrl() + '">Descargar guía de amenities (PDF)</a></p>' +
      '<p>Un saludo,<br>Yunior · Hot Host Hospitality</p>',
    attachments: [pdfFile.getAs(MimeType.PDF)]
  });
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

Enrutado en el `doPost` existente (patrón, adaptar a como esté escrito):

```javascript
function doPost(e) {
  if (e.parameter.formType === 'amenities_pdf') {
    return handleAmenitiesLeadSubmission(e);
  }
  // ... aquí sigue la lógica que ya existe para "Analizar mi propiedad"
}
```

## 5. Formulario de referencia (HTML/JS plano)

Esto es el patrón mínimo; el MVP en Claude Code probablemente lo reimplemente como componente del framework elegido, pero la lógica de envío (fetch a la Web App con `formType=amenities_pdf`) debe mantenerse igual para no romper el backend ya existente.

```html
<form id="amenities-form">
  <input type="email" name="email" placeholder="Tu email" required>
  <label>
    <input type="checkbox" name="consentAccepted" value="true" required>
    Acepto recibir la guía y comunicaciones de Hot Host
  </label>
  <button type="submit">Descargar guía de amenities</button>
</form>
<script>
document.getElementById('amenities-form').addEventListener('submit', function (ev) {
  ev.preventDefault();
  const formData = new FormData(this);
  formData.append('formType', 'amenities_pdf');
  formData.append('sourceUrl', window.location.href);
  fetch('URL_DEL_WEB_APP_DE_APPS_SCRIPT', { method: 'POST', body: formData })
    .then(() => {
      document.getElementById('amenities-form').innerHTML =
        '<p>¡Listo! Revisa tu email — te hemos enviado la guía.</p>';
    })
    .catch(() => {
      document.getElementById('amenities-form').innerHTML =
        '<p>Algo falló. Escríbenos a direccion@hhosthospitality.com y te la enviamos a mano.</p>';
    });
});
</script>
```

## 6. Formulario "Analizar mi propiedad" (flujo existente, no tocar)

Ya existe en producción, apuntando a la hoja "Hot Host - Solicitudes web" (`1WYSrXVcnetzYX0n31_AV9p2uW4i-H11fgJBN1_XGgbo`) vía el Apps Script "Hot Host - Integración web". El MVP debe **enlazar/embeber** este formulario (o replicar su contrato de datos si se reconstruye desde cero), no diseñar uno nuevo de cero sin consultar el esquema real de esa hoja primero.

## 7. Pendientes antes de activar el lead magnet de amenities

- Subir `assets/guia-amenities.pdf` a Drive (carpeta "03 Web") y compartirlo como "cualquiera con el enlace: lector".
- Pegar el ID real del PDF en `AMENITIES_PDF_FILE_ID`.
- Pegar la URL real del Web App de Apps Script en el formulario.
- Confirmar con quien tenga acceso al proyecto de Apps Script que el `doPost` se puede enrutar así sin romper el flujo existente.
