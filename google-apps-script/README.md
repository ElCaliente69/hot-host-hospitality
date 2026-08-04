# Conexion de Hot Host con Google Workspace

La web se publica en GitHub Pages y no dispone de un servidor privado. Por eso no se deben colocar credenciales OAuth, claves de API ni cuentas de servicio en JavaScript. La integracion usa una Web App de Google Apps Script que se ejecuta con la cuenta empresarial propietaria.

## Servicios que hay que conectar

1. **Google Apps Script (obligatorio):** recibe de forma segura las solicitudes del formulario y actua como backend.
2. **Google Sheets (obligatorio):** registra una fila por solicitud con contacto, propiedad, consentimiento, canal, referencias de Drive y estado.
3. **Google Drive (recomendado):** guarda las fotografias y el archivo `solicitud.json` en una carpeta privada por solicitud.
4. **Google Calendar y Google Meet (recomendado):** valida la preferencia inicial, publica huecos reales si el administrador solicita un cambio y solo crea el evento con Meet tras la confirmacion final.
5. **Gmail API con permiso `gmail.send` (recomendado):** envia la verificacion, la revision al administrador, los cambios de cita, las denegaciones motivadas y la confirmacion final sin permitir lectura ni borrado del correo.
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

El manifiesto habilita los servicios avanzados **Calendar API v3**, necesario para generar Google Meet, y **Gmail API v1**, usada solo con el permiso `gmail.send` para entregar mensajes sin conceder lectura ni borrado del correo. Si el proyecto usa un proyecto de Google Cloud estandar, comprueba tambien que **Google Calendar API** y **Gmail API** esten habilitadas en Google Cloud Console.

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
| `GOOGLE_GMAIL_NOTIFICATION_TO` | Si activas Gmail | Destinatario interno y direccion remitente; la cuenta que despliega debe poder enviar como esta direccion. |
| `GOOGLE_APPS_SCRIPT_WEB_APP_URL` | Si | URL publica `/exec` usada por el boton privado de verificacion y estado. |
| `GOOGLE_DATA_RETENTION_DAYS` | Si | Retencion; por defecto `365`. |

`GOOGLE_APPS_SCRIPT_WEB_APP_URL` es publica, no una credencial. Guardala tambien como propiedad del script para abrir el backend desde los enlaces privados. Los correos enlazan primero a `solicitud.html` en el dominio del negocio; el token viaja en el fragmento `#`, que no se envia al hosting estatico, y el navegador lo redirige a Apps Script. Los tokens de visitante, agenda y administrador no se guardan en texto legible, solo sus hashes.

La disponibilidad acordada esta fijada de lunes a jueves. Dentro de 11:00-14:00 se ofrecen citas de 30 minutos a las 11:00, 12:00 y 13:00, dejando 30 minutos entre ellas. Los valores horarios, margen, duracion y horizonte se pueden cambiar mediante propiedades; para cambiar los dias hay que actualizar `bookingWeekdays` en `Code.gs`.

El formulario pide una fecha y una hora preferidas antes de verificar el email. Esa preferencia se guarda en `preferredAppointmentAt`, pero no bloquea Calendar ni otros registros. Tras verificar el correo, las solicitudes con evidencia suficiente pasan a revision final de la cita: el administrador puede confirmar la preferencia si sigue libre, pedir al cliente que elija otro hueco real o denegar indicando un motivo.

`appointmentAt` contiene la fecha que esta revisando el administrador. Una preferencia inicial no se considera retenida porque todavia no tiene `visitorDecisionAt`. Si el administrador pulsa **Cambiar cita**, el cliente recibe la agenda que consulta Calendar; su nueva seleccion si queda retenida en Sheets hasta la decision final. Calendar y Google Meet solo se crean al pulsar **Confirmar cita definitivamente**.

## 4. Autorizar y probar

Ejecuta en este orden desde el editor:

1. `recoverWorkspaceConfiguration`: conserva los recursos existentes y completa las nuevas propiedades de agenda con sus valores predeterminados.
2. `getConfigurationChecklist`: muestra que propiedades estan presentes.
3. `testConfiguration`: comprueba acceso de lectura, configuracion y cantidad de huecos disponibles.
4. `testGmailSendAccess`: solicita el permiso limitado `gmail.send` y envia a la cuenta administrativa un mensaje de prueba mediante Gmail API.
5. `testWriteAccess`: crea y elimina datos de prueba y comprueba que Calendar puede generar un enlace de Google Meet.
6. `sendPendingAdminReviewEmails`: envia el nuevo enlace de revision a solicitudes verificadas antiguas que sigan `En proceso`; se ejecuta una sola vez tras migrar esta version.
7. `installRetentionCleanupTrigger`: instala una limpieza diaria de filas, eventos y carpetas que superen la retencion configurada.

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
2. Completa una solicitud de prueba, elige una preferencia de cita y acepta la politica de privacidad. Antes del boton debe aparecer el aviso para revisar el email y SPAM.
3. Comprueba que Sheets contiene una fila con estado `Pendiente de verificación` y `preferredAppointmentAt`, mientras `appointmentAt` sigue vacio.
4. Si adjuntaste fotos, comprueba la carpeta privada de Drive y que `solicitud.json` incluye `appointment`.
5. Abre el correo del visitante y pulsa el boton verde **Verificar email**. Verificar no debe crear un evento de Calendar.
6. Con 10-60 fotos, un enlace compartido de fotos o una URL de anuncio, la fila pasa a `Cita pendiente de confirmación`: `appointmentAt` copia la preferencia, pero `visitorDecisionAt` sigue vacio para indicar que el hueco no esta retenido.
7. Comprueba que la empresa recibe **Revisar preferencia de cita** y abre el panel privado. Debe mostrar **Confirmar preferencia definitivamente**, **Cambiar cita** y **Denegar cita**.
8. Prueba **Confirmar preferencia definitivamente**. El backend vuelve a comprobar reglas, selecciones retenidas y Calendar; si sigue libre, crea Calendar con Google Meet, cambia a `Confirmada` y envia al cliente **Añadir a Google Calendar** y **Unirse a Google Meet**.
9. Con otra solicitud, pulsa **Cambiar cita**. Puedes incluir un mensaje. La fila pasa a `Pendiente de cita`, se vacia `appointmentAt` y el cliente recibe un enlace para elegir otro horario realmente disponible.
10. Abre ese enlace y comprueba que los desplegables solo muestran huecos libres de lunes a jueves, 11:00-14:00, durante los proximos 14 dias.
11. Elige otra hora. La fila vuelve a `Cita pendiente de confirmación`, guarda `appointmentAt` y `visitorDecisionAt`, Calendar sigue vacio y la hora queda retenida frente a otras selecciones pendientes.
12. Abre el nuevo correo administrativo y confirma para terminar el flujo.
13. Prueba **Denegar solicitud** desde un registro `En proceso` o `Pendiente de cita`: el formulario no permite enviar sin motivo y el cliente recibe ese texto.
14. Prueba **Denegar cita** desde una cita pendiente: tambien exige motivo, no crea Calendar y envia la explicacion al cliente.
15. Desde una agenda enviada al cliente, prueba **Rechazar y cerrar solicitud**. La fila pasa a `Cita rechazada por el solicitante` y el administrador recibe el aviso.

## Estados de una solicitud

- `Pendiente de verificación`: datos, fotografias y preferencia no retenida guardados; falta validar el correo del visitante.
- `En proceso`: estado compatible para solicitudes antiguas o revisiones manuales que todavia requieren una decision inicial.
- `Pendiente de cita`: el administrador pidio un cambio o una solicitud antigua fue aprobada; el visitante debe elegir un hueco libre desde la agenda privada.
- `Cita pendiente de confirmación`: el administrador revisa `appointmentAt`. Si procede del formulario inicial y `visitorDecisionAt` esta vacio, es una preferencia no retenida. Si el cliente la eligio desde la agenda, queda retenida en Sheets hasta la decision final.
- `Confirmada`: el administrador confirmo la hora; Calendar contiene el evento con Meet y `appointmentAt` contiene la cita.
- `Denegada`: la pagina privada conserva y muestra la denegacion y `adminDecisionReason`; cambiar el estado no elimina la fila ni sus archivos.
- `Cita rechazada por el solicitante`: el visitante decidio no reservar y el administrador fue avisado.

Las decisiones administrativas se realizan desde paginas privadas enlazadas en los correos internos. El administrador no necesita editar `status`, `appointmentAt` ni los motivos en Sheets. Las denegaciones exigen un texto de 3-1200 caracteres. El enlace del visitante consulta la fila y el calendario en cada apertura.

La peticion usa un `POST` de formulario dirigido a un marco oculto, porque GitHub Pages y Apps Script no comparten origen. Apps Script responde con una pagina HTML minima que autoriza el marco y comunica el resultado mediante `postMessage` exclusivamente al origen configurado en `PUBLIC_SITE_URL`. Durante las primeras pruebas revisa tambien **Ejecuciones** y usa `submissionId` para localizar cada registro.

## Seguridad y limites

- `.env` esta ignorado por Git y no se publica.
- No pegues secretos ni JSON de credenciales en `assets/config.js`.
- El endpoint valida consentimiento, origen declarado, tipos de imagen, firmas de archivo, tamanos, referencias duplicadas y limites por correo y globales.
- Entre 10 y 60 fotografias JPG, PNG o WebP, o un enlace que permita consultarlas. Cada original puede pesar hasta 20 MB.
- La web adapta la compresion de las copias al numero de fotos para mantener la peticion completa por debajo de 30 MB; el limite tecnico del backend sigue siendo 4 MB por copia optimizada.
- El navegador espera hasta 6 minutos la respuesta de Apps Script. Una carga cercana a 60 fotos puede tardar varios minutos y no se debe cerrar la pagina mientras se procesa.
- Maximo aproximado de 30 MB por peticion.
- Maximo de 5 solicitudes por correo cada 6 horas y 30 solicitudes globales por hora.
- La Web App es publica y sus limites son una proteccion basica. Antes de recibir trafico elevado, anade un desafio anti-bot validado en el backend y actualiza la politica de privacidad correspondiente.
- Los enlaces privados solo abren paginas de revision. Aprobar, cambiar, denegar, seleccionar o confirmar requiere un `POST` explicito. La preferencia inicial no bloquea horarios; solo una reeleccion desde la agenda queda retenida. Antes de crear Calendar y Meet, un bloqueo vuelve a comprobar reglas, Calendar y selecciones retenidas para evitar dobles citas.
- Las carpetas de Drive y los documentos permanecen privados salvo que cambies sus permisos.
- El trigger elimina filas de Sheets, eventos de Calendar y carpetas de Drive. Configura en Google Workspace/Vault una retencion equivalente para los avisos de Gmail; los mensajes de WhatsApp se gestionan con la politica de Meta y deben revisarse por separado.
- Revisa las cuotas de Apps Script, Gmail, Calendar y Drive de la cuenta empresarial.
- Para trafico elevado, autenticacion de propietarios o sincronizacion de reservas de Airbnb/Booking, migra esta capa a un backend dedicado y no expongas credenciales en GitHub Pages.
