# Conexion de Hot Host con Google Workspace

La web se publica en GitHub Pages y no dispone de un servidor privado. Por eso no se deben colocar credenciales OAuth, claves de API ni cuentas de servicio en JavaScript. La integracion usa una Web App de Google Apps Script que se ejecuta con la cuenta empresarial propietaria.

## Servicios que hay que conectar

1. **Google Apps Script (obligatorio):** recibe de forma segura las solicitudes del formulario y actua como backend.
2. **Google Sheets (obligatorio):** registra una fila por solicitud con contacto, propiedad, consentimiento, canal, referencias de Drive y estado.
3. **Google Drive (recomendado):** guarda las fotografias y el archivo `solicitud.json` en una carpeta privada por solicitud.
4. **Google Calendar (opcional):** crea un evento de seguimiento tras cada solicitud. Esta desactivado por defecto.
5. **Gmail mediante MailApp (recomendado):** envia directamente una notificacion interna a la cuenta indicada; el visitante no necesita abrir Gmail ni WhatsApp.
6. **GitHub Pages (obligatorio para activar la web):** expone unicamente la URL publica `/exec` mediante una variable del repositorio.

Google Sheets sustituye a lo que normalmente se llama "Excel" dentro de Google Workspace y permite descargar o exportar el registro como `.xlsx`. Una sincronizacion bidireccional con Microsoft Excel o Microsoft 365 no pertenece a Google API y requeriria una integracion separada con Microsoft Graph.

## Servicios que la web no requiere ahora

- **Google Analytics y Tag Manager:** no se conectan porque la politica publicada indica que no hay analitica ni seguimiento comercial.
- **Google Maps:** el formulario ya registra la direccion escrita y no muestra mapas ni autocompletado.
- **Google Contacts:** Sheets funciona como registro operativo sin llenar automaticamente la agenda de la cuenta.
- **Calendarios de Airbnb o Booking:** la web actual no tiene motor de reservas ni panel de propietarios. La sincronizacion iCal de alojamientos seria una fase separada del evento de seguimiento comercial incluido aqui.
- **Microsoft Excel / Microsoft 365:** requiere Microsoft Graph y credenciales propias de Microsoft, no Google Workspace.

## No hace falta crear

- Una API key de Google en la web.
- Un `GOOGLE_CLIENT_SECRET` en GitHub Pages.
- Una cuenta de servicio o su JSON.
- Un flujo OAuth para los visitantes.

Apps Script solicita los permisos de Drive, Sheets, Calendar y envio de correo al propietario cuando se ejecutan las funciones de configuracion. Si Google Workspace restringe aplicaciones o permisos, el administrador del dominio debe autorizar estos ambitos.

## 1. Preparar los recursos

Puedes crearlos manualmente o dejar que Apps Script los cree.

### Opcion A: recursos existentes

1. Crea o elige una carpeta privada en Google Drive y copia el ID que aparece entre `/folders/` y el final de su URL.
2. Crea una hoja de calculo y copia el ID que aparece entre `/d/` y `/edit`.
3. Si quieres seguimiento automatico, crea un calendario dedicado y copia su **ID del calendario** desde **Configuracion > Integrar el calendario**. Tambien puedes usar `primary`.
4. Conserva estos valores en `.env` solo como referencia local.

### Opcion B: creacion automatica

1. Configura primero las opciones booleanas en las propiedades del script.
2. Ejecuta una vez `createWorkspaceResources` desde Apps Script.
3. La funcion crea los recursos que falten y guarda sus IDs en las propiedades del script.
4. Revisa en Drive, Sheets y Calendar que los recursos se crearon en la cuenta empresarial correcta.

No ejecutes esta opcion si ya tienes recursos y aun no has guardado sus IDs, porque crearia otros nuevos.

Si los recursos ya existen pero faltan sus propiedades, ejecuta `recoverWorkspaceConfiguration`. La funcion busca la hoja, carpeta y calendario existentes por nombre, elige la hoja `Hot Host - Solicitudes web` con mas filas y restaura los IDs sin crear recursos nuevos.

## 2. Crear el proyecto Apps Script

1. Inicia sesion con la cuenta empresarial y abre <https://script.google.com/>.
2. Crea un proyecto llamado `Hot Host - Integracion web`.
3. Sustituye `Code.gs` por el archivo de este directorio.
4. Activa la visualizacion del archivo de manifiesto en **Configuracion del proyecto**.
5. Sustituye el manifiesto por `appsscript.json`.
6. Confirma que la zona horaria es `Europe/Madrid` o la que corresponda al negocio.

## 3. Configurar propiedades privadas

Abre **Configuracion del proyecto > Propiedades del script** y copia las variables privadas de `.env`.

| Propiedad | Obligatoria | Uso |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | Si | URL base autorizada de la web. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Si | Documento donde se registran las solicitudes. |
| `GOOGLE_SHEETS_LEADS_SHEET` | Si | Nombre de la pestana; por defecto `Solicitudes web`. |
| `GOOGLE_DRIVE_FOLDER_ID` | Para fotos | Carpeta privada raiz de solicitudes. |
| `GOOGLE_CALENDAR_ID` | Si activas Calendar | Calendario dedicado o `primary`. |
| `GOOGLE_CALENDAR_FOLLOWUP_ENABLED` | Si | `true` o `false`. |
| `GOOGLE_CALENDAR_FOLLOWUP_DELAY_HOURS` | Si activas Calendar | Horas hasta el evento; por defecto `24`. |
| `GOOGLE_CALENDAR_EVENT_DURATION_MINUTES` | Si activas Calendar | Duracion; por defecto `30`. |
| `GOOGLE_GMAIL_NOTIFICATION_ENABLED` | Si | `true` o `false`. |
| `GOOGLE_GMAIL_NOTIFICATION_TO` | Si activas Gmail | Destinatario interno del aviso. |
| `GOOGLE_APPS_SCRIPT_WEB_APP_URL` | Si | URL publica `/exec` usada por el boton privado de verificacion y estado. |
| `GOOGLE_DATA_RETENTION_DAYS` | Si | Retencion; por defecto `365`. |

`GOOGLE_APPS_SCRIPT_WEB_APP_URL` es publica, no una credencial. Guardala tambien como propiedad del script para construir los enlaces privados con token; el token no se guarda en texto legible, solo su hash.

## 4. Autorizar y probar

Ejecuta en este orden desde el editor:

1. `getConfigurationChecklist`: muestra que propiedades estan presentes.
2. `testConfiguration`: comprueba acceso de lectura y configuracion.
3. `testWriteAccess`: crea y elimina datos de prueba en los servicios habilitados.
4. `installRetentionCleanupTrigger`: instala una limpieza diaria de filas, eventos y carpetas que superen la retencion configurada.

Google solicitara autorizacion para los ambitos declarados en `appsscript.json`. Comprueba que la cuenta mostrada sea la cuenta empresarial propietaria.

## 5. Desplegar la Web App

1. Pulsa **Implementar > Nueva implementacion**.
2. Elige **Aplicacion web**.
3. En **Ejecutar como**, selecciona **Yo**.
4. En **Quien tiene acceso**, selecciona **Cualquier usuario**.
5. Implementa y copia la URL que termina en `/exec`.
6. Guarda esa misma URL en la propiedad `GOOGLE_APPS_SCRIPT_WEB_APP_URL`.
7. Abre la URL en una ventana privada. Debe devolver JSON con `sheets: true`, `verification: true` y los servicios habilitados.

Cada cambio posterior en `Code.gs` o `appsscript.json` requiere editar la implementacion y crear una version nueva. Conservando la misma implementacion, la URL no cambia.

## 6. Conectar local y GitHub Pages

### Local

1. Pega la URL `/exec` en `GOOGLE_APPS_SCRIPT_WEB_APP_URL` dentro de `.env`.
2. Ejecuta:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\generate-google-config.ps1
```

El script solo copia la URL publica a `assets/config.js`. Nunca copia IDs privados.

### GitHub Pages

La URL publica puede permanecer en `assets/config.js`. Si quieres sustituirla sin cambiar el repositorio, crea la variable `GOOGLE_APPS_SCRIPT_WEB_APP_URL` en **GitHub > Settings > Secrets and variables > Actions > Variables**. El workflow solo genera `assets/config.js` cuando esa variable existe.

## 7. Prueba de extremo a extremo

1. Abre `contacto.html` en el sitio publicado.
2. Completa una solicitud de prueba y acepta la politica de privacidad.
3. Comprueba que Sheets contiene una fila con estado `Pendiente de verificación`.
4. Si adjuntaste fotos, comprueba la carpeta privada de Drive y `solicitud.json`.
5. Abre el correo del visitante y pulsa el boton verde **Verificar email**.
6. Comprueba que la pagina privada muestra `En proceso`, Calendar crea el seguimiento y llega el aviso interno a la empresa.
7. Cambia en Sheets el estado a `Confirmada` o `Denegada` y vuelve a abrir el mismo enlace privado.
8. Para `Confirmada`, escribe la cita en `appointmentAt`, preferiblemente como `dd/mm/aaaa hh:mm`.

## Estados de una solicitud

- `Pendiente de verificación`: datos y fotografias guardados; falta validar el correo del visitante.
- `En proceso`: correo validado y solicitud notificada al negocio.
- `Confirmada`: la pagina privada muestra tambien el valor de `appointmentAt`.
- `Denegada`: la pagina privada conserva y muestra la denegacion; cambiar el estado no elimina la fila ni sus archivos.

El equipo actualiza `status` y `appointmentAt` directamente en Sheets. El enlace del email consulta la fila en cada apertura, por lo que no hace falta generar otro enlace cuando cambia el estado.

La peticion usa un `POST` de formulario dirigido a un marco oculto, porque GitHub Pages y Apps Script no comparten origen. Apps Script responde con una pagina HTML minima que autoriza el marco y comunica el resultado mediante `postMessage` exclusivamente al origen configurado en `PUBLIC_SITE_URL`. Durante las primeras pruebas revisa tambien **Ejecuciones** y usa `submissionId` para localizar cada registro.

## Seguridad y limites

- `.env` esta ignorado por Git y no se publica.
- No pegues secretos ni JSON de credenciales en `assets/config.js`.
- El endpoint valida consentimiento, origen declarado, tipos de imagen, firmas de archivo, tamanos, referencias duplicadas y limites por correo y globales.
- Maximo de 10 fotografias JPG, PNG o WebP, 20 MB antes de optimizar y 4 MB despues de optimizar.
- Maximo aproximado de 30 MB por peticion.
- Maximo de 5 solicitudes por correo cada 6 horas y 30 solicitudes globales por hora.
- La Web App es publica y sus limites son una proteccion basica. Antes de recibir trafico elevado, anade un desafio anti-bot validado en el backend y actualiza la politica de privacidad correspondiente.
- Las carpetas de Drive y los documentos permanecen privados salvo que cambies sus permisos.
- El trigger elimina filas de Sheets, eventos de Calendar y carpetas de Drive. Configura en Google Workspace/Vault una retencion equivalente para los avisos de Gmail; los mensajes de WhatsApp se gestionan con la politica de Meta y deben revisarse por separado.
- Revisa las cuotas de Apps Script, Gmail, Calendar y Drive de la cuenta empresarial.
- Para trafico elevado, autenticacion de propietarios o sincronizacion de reservas de Airbnb/Booking, migra esta capa a un backend dedicado y no expongas credenciales en GitHub Pages.
