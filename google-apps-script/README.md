# Conexion de Hot Host con Google Workspace

La web se publica en GitHub Pages y no dispone de un servidor privado. Por eso no se deben colocar credenciales OAuth, claves de API ni cuentas de servicio en JavaScript. La integracion usa una Web App de Google Apps Script que se ejecuta con la cuenta empresarial propietaria.

## Servicios que hay que conectar

1. **Google Apps Script (obligatorio):** recibe de forma segura las solicitudes del formulario y actua como backend.
2. **Google Sheets (obligatorio):** registra una fila por solicitud con contacto, propiedad, consentimiento, canal, referencias de Drive y estado.
3. **Google Drive (recomendado):** guarda las fotografias y el archivo `solicitud.json` en una carpeta privada por solicitud.
4. **Google Calendar y Google Meet (recomendado):** publica los huecos libres; cuando el visitante selecciona uno, espera la confirmacion final del administrador y solo entonces crea el evento con Meet.
5. **Gmail mediante MailApp (recomendado):** envia la revision al administrador, la decision al visitante y la confirmacion final sin abrir Gmail ni WhatsApp.
6. **GitHub Pages (obligatorio para activar la web):** expone unicamente la URL publica `/exec` mediante una variable del repositorio.

Google Sheets sustituye a lo que normalmente se llama "Excel" dentro de Google Workspace y permite descargar o exportar el registro como `.xlsx`. Una sincronizacion bidireccional con Microsoft Excel o Microsoft 365 no pertenece a Google API y requeriria una integracion separada con Microsoft Graph.

## Servicios que la web no requiere ahora

- **Google Analytics y Tag Manager:** no se conectan porque la politica publicada indica que no hay analitica ni seguimiento comercial.
- **Google Maps:** el formulario ya registra la direccion escrita y no muestra mapas ni autocompletado.
- **Google Contacts:** Sheets funciona como registro operativo sin llenar automaticamente la agenda de la cuenta.
- **Calendarios de Airbnb o Booking:** la agenda incluida es solo para citas comerciales. La sincronizacion iCal de alojamientos sigue siendo una fase separada.
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
3. Para ofrecer citas, crea un calendario dedicado y copia su **ID del calendario** desde **Configuracion > Integrar el calendario**. Tambien puedes usar `primary`.
4. Anade en ese calendario los eventos y bloqueos del administrador. Cualquier evento que coincida con un hueco, incluido el margen de separacion, hace que ese horario no se muestre.
5. Conserva estos valores en `.env` solo como referencia local.

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

El manifiesto habilita el servicio avanzado **Calendar API v3**, necesario para generar Google Meet. Si el proyecto usa un proyecto de Google Cloud estandar, comprueba tambien que **Google Calendar API** este habilitada en Google Cloud Console.

## 3. Configurar propiedades privadas

Abre **Configuracion del proyecto > Propiedades del script** y copia las variables privadas de `.env`.

| Propiedad | Obligatoria | Uso |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | Si | URL base autorizada de la web. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Si | Documento donde se registran las solicitudes. |
| `GOOGLE_SHEETS_LEADS_SHEET` | Si | Nombre de la pestana; por defecto `Solicitudes web`. |
| `GOOGLE_DRIVE_FOLDER_ID` | Para fotos | Carpeta privada raiz de solicitudes. |
| `GOOGLE_CALENDAR_ID` | Si activas Calendar | Calendario dedicado o `primary`. |
| `GOOGLE_CALENDAR_FOLLOWUP_ENABLED` | Si | `true` activa la agenda y `false` la desactiva; se conserva el nombre por compatibilidad. |
| `GOOGLE_CALENDAR_FOLLOWUP_DELAY_HOURS` | No | Propiedad antigua; solo se usa como respaldo de la antelacion minima. |
| `GOOGLE_CALENDAR_EVENT_DURATION_MINUTES` | Si activas Calendar | Duracion de cada cita; `30`. |
| `GOOGLE_CALENDAR_BOOKING_DAYS_AHEAD` | Si activas Calendar | Horizonte de reserva; `14`. |
| `GOOGLE_CALENDAR_BOOKING_MIN_LEAD_HOURS` | Si activas Calendar | Antelacion minima; `24`. |
| `GOOGLE_CALENDAR_BOOKING_START_HOUR` | Si activas Calendar | Primera hora disponible; `11`. |
| `GOOGLE_CALENDAR_BOOKING_END_HOUR` | Si activas Calendar | Fin de la ventana diaria; `14`. |
| `GOOGLE_CALENDAR_BOOKING_BUFFER_MINUTES` | Si activas Calendar | Separacion antes y despues de otros eventos; `30`. |
| `GOOGLE_GMAIL_NOTIFICATION_ENABLED` | Si | `true` o `false`. |
| `GOOGLE_GMAIL_NOTIFICATION_TO` | Si activas Gmail | Destinatario interno del aviso. |
| `GOOGLE_APPS_SCRIPT_WEB_APP_URL` | Si | URL publica `/exec` usada por el boton privado de verificacion y estado. |
| `GOOGLE_DATA_RETENTION_DAYS` | Si | Retencion; por defecto `365`. |

`GOOGLE_APPS_SCRIPT_WEB_APP_URL` es publica, no una credencial. Guardala tambien como propiedad del script para abrir el backend desde los enlaces privados. Los correos enlazan primero a `solicitud.html` en el dominio del negocio; el token viaja en el fragmento `#`, que no se envia al hosting estatico, y el navegador lo redirige a Apps Script. Los tokens de visitante, agenda y administrador no se guardan en texto legible, solo sus hashes.

La disponibilidad acordada esta fijada de lunes a jueves. Dentro de 11:00-14:00 se ofrecen citas de 30 minutos a las 11:00, 12:00 y 13:00, dejando 30 minutos entre ellas. Los valores horarios, margen, duracion y horizonte se pueden cambiar mediante propiedades; para cambiar los dias hay que actualizar `bookingWeekdays` en `Code.gs`.

## 4. Autorizar y probar

Ejecuta en este orden desde el editor:

1. `recoverWorkspaceConfiguration`: conserva los recursos existentes y completa las nuevas propiedades de agenda con sus valores predeterminados.
2. `getConfigurationChecklist`: muestra que propiedades estan presentes.
3. `testConfiguration`: comprueba acceso de lectura, configuracion y cantidad de huecos disponibles.
4. `testWriteAccess`: crea y elimina datos de prueba y comprueba que Calendar puede generar un enlace de Google Meet.
5. `sendPendingAdminReviewEmails`: envia el nuevo enlace de revision a solicitudes verificadas antiguas que sigan `En proceso`; se ejecuta una sola vez tras migrar esta version.
6. `installRetentionCleanupTrigger`: instala una limpieza diaria de filas, eventos y carpetas que superen la retencion configurada.

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
6. Comprueba que la pagina privada muestra `En proceso` y que la empresa recibe el correo **Revisar y decidir**. Verificar el email ya no crea un evento de Calendar.
7. Abre el enlace interno. La pagina privada del administrador debe mostrar **Aprobar y enviar horarios** y **Denegar solicitud**.
8. Prueba **Denegar**: el visitante recibe el aviso y la fila pasa a `Denegada`.
9. Con otra solicitud, prueba **Aprobar**: el visitante recibe **Elegir cita** y la fila pasa a `Pendiente de cita`.
10. Abre el enlace del visitante. Solo deben aparecer huecos libres de lunes a jueves, 11:00-14:00, durante los proximos 14 dias.
11. Selecciona una hora. La fila pasa a `Cita pendiente de confirmación`, Sheets guarda `appointmentAt`, Calendar sigue vacio y el administrador recibe un segundo correo.
12. Abre ese correo y pulsa **Confirmar cita definitivamente**. Calendar crea el evento con Google Meet, la fila pasa a `Confirmada` y el cliente recibe el correo final con **Añadir a Google Calendar** y **Unirse a Google Meet**.
13. Con otra cita seleccionada, prueba **Denegar cita**. No debe crearse ningun evento y el cliente recibe el aviso de denegacion.
14. Con otra solicitud aprobada, prueba **Rechazar y cerrar solicitud** desde la pagina del visitante. La fila pasa a `Cita rechazada por el solicitante` y el administrador recibe el aviso.

## Estados de una solicitud

- `Pendiente de verificación`: datos y fotografias guardados; falta validar el correo del visitante.
- `En proceso`: correo validado y solicitud notificada al negocio.
- `Pendiente de cita`: el administrador aprobo la solicitud y el visitante puede elegir un hueco libre.
- `Cita pendiente de confirmación`: el visitante eligio una hora, que queda retenida en Sheets hasta la decision final del administrador.
- `Confirmada`: el administrador confirmo la hora; Calendar contiene el evento con Meet y `appointmentAt` contiene la cita.
- `Denegada`: la pagina privada conserva y muestra la denegacion; cambiar el estado no elimina la fila ni sus archivos.
- `Cita rechazada por el solicitante`: el visitante decidio no reservar y el administrador fue avisado.

Las dos decisiones administrativas se realizan desde paginas privadas enlazadas en los correos internos. El administrador no necesita editar `status` ni `appointmentAt` en Sheets. El enlace del visitante consulta la fila y el calendario en cada apertura.

La peticion usa un `POST` de formulario dirigido a un marco oculto, porque GitHub Pages y Apps Script no comparten origen. Apps Script responde con una pagina HTML minima que autoriza el marco y comunica el resultado mediante `postMessage` exclusivamente al origen configurado en `PUBLIC_SITE_URL`. Durante las primeras pruebas revisa tambien **Ejecuciones** y usa `submissionId` para localizar cada registro.

## Seguridad y limites

- `.env` esta ignorado por Git y no se publica.
- No pegues secretos ni JSON de credenciales en `assets/config.js`.
- El endpoint valida consentimiento, origen declarado, tipos de imagen, firmas de archivo, tamanos, referencias duplicadas y limites por correo y globales.
- Maximo de 10 fotografias JPG, PNG o WebP, 20 MB antes de optimizar y 4 MB despues de optimizar.
- Maximo aproximado de 30 MB por peticion.
- Maximo de 5 solicitudes por correo cada 6 horas y 30 solicitudes globales por hora.
- La Web App es publica y sus limites son una proteccion basica. Antes de recibir trafico elevado, anade un desafio anti-bot validado en el backend y actualiza la politica de privacidad correspondiente.
- Los enlaces privados solo abren paginas de revision. Aprobar, denegar, seleccionar o confirmar requiere un `POST` explicito. La hora elegida se retiene en Sheets y, antes de crear Calendar y Meet, un bloqueo vuelve a comprobar Calendar y las selecciones pendientes para evitar dobles citas.
- Las carpetas de Drive y los documentos permanecen privados salvo que cambies sus permisos.
- El trigger elimina filas de Sheets, eventos de Calendar y carpetas de Drive. Configura en Google Workspace/Vault una retencion equivalente para los avisos de Gmail; los mensajes de WhatsApp se gestionan con la politica de Meta y deben revisarse por separado.
- Revisa las cuotas de Apps Script, Gmail, Calendar y Drive de la cuenta empresarial.
- Para trafico elevado, autenticacion de propietarios o sincronizacion de reservas de Airbnb/Booking, migra esta capa a un backend dedicado y no expongas credenciales en GitHub Pages.
