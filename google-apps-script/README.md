# Subida de fotografias a Google Drive

El sitio comprime las fotografias en el navegador y las envia a una Web App de Google Apps Script. La Web App se ejecuta con la cuenta propietaria y guarda cada solicitud en una carpeta privada de su Drive.

## Desplegar el receptor

1. Inicia sesion con la cuenta de Google propietaria del Drive y abre https://script.google.com/.
2. Crea un proyecto nuevo con un nombre como `Hot Host - Fotos web`.
3. Sustituye el contenido de `Code.gs` por el de este directorio.
4. En la configuracion del proyecto, selecciona la zona horaria que corresponda al negocio.
5. Pulsa **Implementar > Nueva implementacion**.
6. Elige **Aplicacion web** como tipo de implementacion.
7. En **Ejecutar como**, selecciona **Yo**.
8. En **Quien tiene acceso**, selecciona **Cualquier usuario**. No elijas una opcion que obligue al visitante a iniciar sesion.
9. Autoriza el acceso a Google Drive cuando Google lo solicite.
10. Copia la URL de la aplicacion web. Debe empezar por `https://script.google.com/macros/s/` y terminar en `/exec`.

## Conectar el sitio

Pega la URL en `assets/config.js`:

```js
window.HOT_HOST_CONFIG = Object.freeze({
  driveUploadEndpoint: "https://script.google.com/macros/s/TU_IMPLEMENTACION/exec"
});
```

No pegues claves OAuth, contrasenas ni secretos en `config.js`: GitHub Pages publica ese archivo.

Mientras el endpoint permanezca vacio, el selector de archivos no se muestra y el formulario solicita un enlace compartido. Antes de activarlo, publica la informacion legal y de privacidad aplicable al tratamiento de datos y fotografias.

## Probar

1. Abre `contacto.html` desde el sitio publicado.
2. Selecciona **No** en la pregunta sobre alquiler turistico.
3. Completa el formulario, selecciona una imagen pequena y envia la consulta.
4. Comprueba que Drive contiene la carpeta `Hot Host - Solicitudes web`.
5. Comprueba que dentro hay una subcarpeta con la foto y `solicitud.json`.
6. Verifica que la referencia mostrada en el correo o WhatsApp coincide con los primeros caracteres del nombre de esa subcarpeta.

La respuesta de Apps Script se solicita en modo `no-cors`, una limitacion de los sitios estaticos. El navegador solo puede confirmar que envio la peticion para su procesamiento, no que Drive la guardo correctamente. Revisa Drive y **Ejecuciones** en Apps Script durante la primera prueba y utiliza la referencia incluida en la consulta para localizarla.

## Actualizar o reparar

- Para publicar cambios posteriores en `Code.gs`, edita la implementacion existente y crea una version nueva. No hace falta cambiar la URL si conservas la misma implementacion.
- La carpeta raiz se crea automaticamente y su ID queda guardado en las propiedades del script.
- Si eliminas la carpeta raiz, ejecuta una vez `resetRootFolderReference` desde el editor y vuelve a probar.
- Las carpetas y fotografias permanecen privadas salvo que cambies manualmente sus permisos en Drive.

## Limites y seguridad

- Maximo de 10 fotografias JPG, PNG o WebP por solicitud.
- Maximo de 20 MB por archivo antes de comprimir y 4 MB despues de comprimir.
- Maximo aproximado de 30 MB para la solicitud completa despues de codificar las imagenes.
- Maximo de 5 solicitudes por correo cada 6 horas.
- Maximo global de 30 solicitudes por hora como proteccion adicional de cuota.
- El endpoint es publico por necesidad tecnica. Incluye validacion de contenido, controles basicos contra abuso y consentimiento obligatorio, pero conviene revisar periodicamente las ejecuciones y cuotas de Apps Script.
- Antes de exponer el endpoint a trafico publico, integra un desafio anti-bot verificado en el servidor y guarda su secreto en las propiedades de Apps Script, nunca en `assets/config.js`.
- El formulario limita el uso declarado de los datos a la evaluacion de la solicitud y ofrece una via para pedir su eliminacion. Antes de activar el endpoint, incorpora tambien la politica de privacidad y el plazo de conservacion que correspondan legalmente.
