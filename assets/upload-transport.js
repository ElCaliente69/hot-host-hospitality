(function () {
  "use strict";

  const FALLBACK_ENDPOINT = "https://script.google.com/macros/s/AKfycbytLhgU__o7swaSgg0kJy429VLfH_kiUbGHIroO5MiPFY7OyLuIHYqYA-zOanl9cHSX1g/exec";
  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;

  function getEndpoint() {
    const configured = window.HOT_HOST_CONFIG && window.HOT_HOST_CONFIG.driveUploadEndpoint;
    return String(configured || FALLBACK_ENDPOINT).trim();
  }

  function isUploadRequest(input, init) {
    const url = typeof input === "string" ? input : input && input.url;
    const method = String(init && init.method || "GET").toUpperCase();
    return method === "POST" && url === getEndpoint() && typeof (init && init.body) === "string";
  }

  function submitThroughHiddenForm(endpoint, payload) {
    return new Promise(function (resolve, reject) {
      const token = "hot-host-upload-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      const iframe = document.createElement("iframe");
      const form = document.createElement("form");
      const payloadField = document.createElement("input");
      let settled = false;
      let submitted = false;

      function cleanup() {
        window.setTimeout(function () {
          iframe.remove();
          form.remove();
        }, 15000);
      }

      function finish(callback, value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        cleanup();
        callback(value);
      }

      iframe.name = token;
      iframe.hidden = true;
      iframe.setAttribute("aria-hidden", "true");

      form.method = "POST";
      form.action = endpoint;
      form.target = token;
      form.enctype = "multipart/form-data";
      form.acceptCharset = "UTF-8";
      form.hidden = true;

      payloadField.type = "hidden";
      payloadField.name = "payload";
      payloadField.value = payload;
      form.appendChild(payloadField);

      iframe.addEventListener("load", function () {
        if (!submitted) return;
        finish(resolve, { ok: true, type: "opaque-form-response" });
      });

      iframe.addEventListener("error", function () {
        finish(reject, new Error("Google Apps Script could not receive the upload"));
      });

      const timeout = window.setTimeout(function () {
        finish(reject, new Error("Google Apps Script upload timed out"));
      }, 45000);

      document.body.appendChild(iframe);
      document.body.appendChild(form);

      window.setTimeout(function () {
        try {
          submitted = true;
          form.submit();
        } catch (error) {
          finish(reject, error);
        }
      }, 0);
    });
  }

  window.fetch = function (input, init) {
    if (isUploadRequest(input, init)) {
      return submitThroughHiddenForm(getEndpoint(), init.body);
    }
    if (!nativeFetch) return Promise.reject(new Error("Fetch is unavailable"));
    return nativeFetch(input, init);
  };
})();
