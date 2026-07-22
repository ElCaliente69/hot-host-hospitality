(function () {
  "use strict";

  const LANGUAGE_STORAGE_KEY = "hotHostLanguage";
  const THEME_STORAGE_KEY = "hotHostTheme";
  const SUPPORTED_LANGUAGES = ["es", "en", "fr", "it", "de", "pl", "nl", "pt", "el"];
  const LANGUAGE_NAMES = { es: "Español", en: "English", fr: "Français", it: "Italiano", de: "Deutsch", pl: "Polski", nl: "Nederlands", pt: "Português", el: "Ελληνικά" };
  const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "PLN"];
  const CURRENCY_SYMBOLS = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF", PLN: "zł" };
  const EXCHANGE_RATES_ENDPOINT = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,CHF,PLN";
  // ECB reference fallback from 2026-07-21; live public rates replace it when available.
  const FALLBACK_RATES_PER_EUR = { EUR: 1, USD: 1.1418, GBP: 0.85205, CHF: 0.9259, PLN: 4.3305 };
  const MAX_EARNINGS_SCALE = 100;
  const WHATSAPP_NUMBER = "34600907716";
  const CONTACT_EMAIL = "direccion@hhosthospitality.com";
  const MAX_PROPERTY_PHOTOS = 10;
  const MAX_PROPERTY_PHOTO_BYTES = 20 * 1024 * 1024;
  const MAX_OPTIMISED_PHOTO_BYTES = 4 * 1024 * 1024;
  const MAX_UPLOAD_REQUEST_CHARACTERS = 30 * 1024 * 1024;
  const MAX_PROPERTY_PHOTO_DIMENSION = 1920;
  const PHOTO_PROCESS_TIMEOUT_MS = 20000;
  const PHOTO_UPLOAD_TIMEOUT_MS = 45000;
  const AUDIT_OFFER_END = Date.parse("2026-09-30T23:59:59+02:00");
  const MARKET_OCCUPANCY = 63;
  const HOT_HOST_OCCUPANCY = 72;
  const HOT_HOST_RATE_MULTIPLIER = 1.17;
  const DEFAULT_EARNINGS = {
    rentalModel: "traditional",
    currency: "EUR",
    traditionalRent: 1200,
    touristRate: 110,
    touristOccupancy: MARKET_OCCUPANCY,
    hotHostRate: 110 * HOT_HOST_RATE_MULTIPLIER,
    hotHostOccupancy: HOT_HOST_OCCUPANCY
  };
  let exchangeRatesPerEur = Object.assign({}, FALLBACK_RATES_PER_EUR);
  let exchangeRatesRequest = null;

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/svg+xml";
  favicon.href = "assets/logo-mark.svg";
  document.head.appendChild(favicon);

  const HERO_IMAGES = [
    { id: "photo-1600573472592-401b489a3cdc", position: "center" },
    { id: "photo-1600585154340-be6161a56a0c", position: "center" },
    { id: "photo-1600596542815-ffad4c1539a9", position: "center" }
  ];

  const PROCESS_IMAGES = {
    journey: [
      { id: "photo-1600596542815-ffad4c1539a9", position: "center" },
      { id: "photo-1460925895917-afdab827c52f", position: "center" },
      { id: "photo-1618773928121-c32242e63f39", position: "center" },
      { id: "photo-1600210492486-724fe5c67fb0", position: "center" }
    ],
    method: [
      { id: "photo-1762427354397-854a52e0ded7", position: "center" },
      { id: "photo-1600566753051-f0b89df2dd90", position: "center" },
      { id: "photo-1741156386380-0236c72eb6f9", position: "center" },
      { id: "photo-1556155092-490a1ba16284", position: "center" }
    ]
  };

  const PILLAR_IMAGES = [
    { id: "photo-1521737711867-e3b97375f902", position: "center" },
    { id: "photo-1542314831-068cd1dbfeeb", position: "center" },
    { id: "photo-1554224155-8d04cb21cd6c", position: "center" },
    { id: "photo-1618221195710-dd6b41faaea6", position: "center" }
  ];

  const SERVICE_DEFINITIONS = [
    { key: "gestion-integral", path: "gestion-integral.html", icon: "⌂", imageId: "photo-1484480974693-6ca0a78fb36b", imagePosition: "center" },
    { key: "guest-experience", path: "guest-experience.html", icon: "✦", imageId: "photo-1600210492486-724fe5c67fb0", imagePosition: "center" },
    { key: "revenue-management", path: "revenue-management.html", icon: "↗", imageId: "photo-1551288049-bebda4e38f71", imagePosition: "center" },
    { key: "check-in-operaciones", path: "check-in-operaciones.html", icon: "⌁", imageId: "photo-1741156386380-0236c72eb6f9", imagePosition: "center" },
    { key: "limpieza-lavanderia", path: "limpieza-lavanderia.html", icon: "◇", imageId: "photo-1618773928121-c32242e63f39", imagePosition: "center" },
    {
      key: "fotografia-profesional",
      path: "fotografia-profesional.html",
      icon: "◉",
      imageId: "photo-1726713356854-182a8a52f8f0",
      imagePosition: "center",
      gallery: [
        { id: "photo-1600596542815-ffad4c1539a9", position: "center" },
        { id: "photo-1600210492486-724fe5c67fb0", position: "center" },
        { id: "photo-1600607687920-4e2a09cf159d", position: "center" },
        { id: "photo-1600566753051-f0b89df2dd90", position: "center" },
        { id: "photo-1600607688066-890987f18a86", position: "center" }
      ]
    },
    { key: "auditoria-rentabilidad", path: "auditoria-rentabilidad.html", icon: "◎", imageId: "photo-1762427354397-854a52e0ded7", imagePosition: "center" }
  ];

  function imageUrl(photoId, width, height) {
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=85`;
  }

  function loadExchangeRates() {
    if (exchangeRatesRequest) return exchangeRatesRequest;
    if (!window.fetch) return Promise.resolve(exchangeRatesPerEur);

    exchangeRatesRequest = window.fetch(EXCHANGE_RATES_ENDPOINT, { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("Exchange-rate request failed");
        return response.json();
      })
      .then(function (data) {
        const nextRates = { EUR: 1 };
        SUPPORTED_CURRENCIES.slice(1).forEach(function (currency) {
          const rate = Number(data && data.rates && data.rates[currency]);
          if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid exchange rate");
          nextRates[currency] = rate;
        });
        exchangeRatesPerEur = nextRates;
        return exchangeRatesPerEur;
      })
      .catch(function () {
        exchangeRatesRequest = null;
        return exchangeRatesPerEur;
      });

    return exchangeRatesRequest;
  }

  function isAuditOfferActive() {
    return Date.now() <= AUDIT_OFFER_END;
  }

  // ISO 3166-1 coverage plus Kosovo, with local fallback names and international dialling codes.
  const COUNTRIES = [
    ["AD", "376", "Andorra"],
    ["AE", "971", "United Arab Emirates"],
    ["AF", "93", "Afghanistan"],
    ["AG", "1", "Antigua and Barbuda"],
    ["AI", "1", "Anguilla"],
    ["AL", "355", "Albania"],
    ["AM", "374", "Armenia"],
    ["AO", "244", "Angola"],
    ["AQ", "672", "Antarctica"],
    ["AR", "54", "Argentina"],
    ["AS", "1", "American Samoa"],
    ["AT", "43", "Austria"],
    ["AU", "61", "Australia"],
    ["AW", "297", "Aruba"],
    ["AX", "358", "Åland Islands"],
    ["AZ", "994", "Azerbaijan"],
    ["BA", "387", "Bosnia and Herzegovina"],
    ["BB", "1", "Barbados"],
    ["BD", "880", "Bangladesh"],
    ["BE", "32", "Belgium"],
    ["BF", "226", "Burkina Faso"],
    ["BG", "359", "Bulgaria"],
    ["BH", "973", "Bahrain"],
    ["BI", "257", "Burundi"],
    ["BJ", "229", "Benin"],
    ["BL", "590", "Saint Barthélemy"],
    ["BM", "1", "Bermuda"],
    ["BN", "673", "Brunei"],
    ["BO", "591", "Bolivia"],
    ["BQ", "599", "Caribbean Netherlands"],
    ["BR", "55", "Brazil"],
    ["BS", "1", "Bahamas"],
    ["BT", "975", "Bhutan"],
    ["BV", "47", "Bouvet Island"],
    ["BW", "267", "Botswana"],
    ["BY", "375", "Belarus"],
    ["BZ", "501", "Belize"],
    ["CA", "1", "Canada"],
    ["CC", "61", "Cocos (Keeling) Islands"],
    ["CD", "243", "Democratic Republic of the Congo"],
    ["CF", "236", "Central African Republic"],
    ["CG", "242", "Republic of the Congo"],
    ["CH", "41", "Switzerland"],
    ["CI", "225", "Côte d’Ivoire"],
    ["CK", "682", "Cook Islands"],
    ["CL", "56", "Chile"],
    ["CM", "237", "Cameroon"],
    ["CN", "86", "China"],
    ["CO", "57", "Colombia"],
    ["CR", "506", "Costa Rica"],
    ["CU", "53", "Cuba"],
    ["CV", "238", "Cape Verde"],
    ["CW", "599", "Curaçao"],
    ["CX", "61", "Christmas Island"],
    ["CY", "357", "Cyprus"],
    ["CZ", "420", "Czechia"],
    ["DE", "49", "Germany"],
    ["DJ", "253", "Djibouti"],
    ["DK", "45", "Denmark"],
    ["DM", "1", "Dominica"],
    ["DO", "1", "Dominican Republic"],
    ["DZ", "213", "Algeria"],
    ["EC", "593", "Ecuador"],
    ["EE", "372", "Estonia"],
    ["EG", "20", "Egypt"],
    ["EH", "212", "Western Sahara"],
    ["ER", "291", "Eritrea"],
    ["ES", "34", "Spain"],
    ["ET", "251", "Ethiopia"],
    ["FI", "358", "Finland"],
    ["FJ", "679", "Fiji"],
    ["FK", "500", "Falkland Islands"],
    ["FM", "691", "Micronesia"],
    ["FO", "298", "Faroe Islands"],
    ["FR", "33", "France"],
    ["GA", "241", "Gabon"],
    ["GB", "44", "United Kingdom"],
    ["GD", "1", "Grenada"],
    ["GE", "995", "Georgia"],
    ["GF", "594", "French Guiana"],
    ["GG", "44", "Guernsey"],
    ["GH", "233", "Ghana"],
    ["GI", "350", "Gibraltar"],
    ["GL", "299", "Greenland"],
    ["GM", "220", "Gambia"],
    ["GN", "224", "Guinea"],
    ["GP", "590", "Guadeloupe"],
    ["GQ", "240", "Equatorial Guinea"],
    ["GR", "30", "Greece"],
    ["GS", "500", "South Georgia and the South Sandwich Islands"],
    ["GT", "502", "Guatemala"],
    ["GU", "1", "Guam"],
    ["GW", "245", "Guinea-Bissau"],
    ["GY", "592", "Guyana"],
    ["HK", "852", "Hong Kong"],
    ["HM", "672", "Heard Island and McDonald Islands"],
    ["HN", "504", "Honduras"],
    ["HR", "385", "Croatia"],
    ["HT", "509", "Haiti"],
    ["HU", "36", "Hungary"],
    ["ID", "62", "Indonesia"],
    ["IE", "353", "Ireland"],
    ["IL", "972", "Israel"],
    ["IM", "44", "Isle of Man"],
    ["IN", "91", "India"],
    ["IO", "246", "British Indian Ocean Territory"],
    ["IQ", "964", "Iraq"],
    ["IR", "98", "Iran"],
    ["IS", "354", "Iceland"],
    ["IT", "39", "Italy"],
    ["JE", "44", "Jersey"],
    ["JM", "1", "Jamaica"],
    ["JO", "962", "Jordan"],
    ["JP", "81", "Japan"],
    ["KE", "254", "Kenya"],
    ["KG", "996", "Kyrgyzstan"],
    ["KH", "855", "Cambodia"],
    ["KI", "686", "Kiribati"],
    ["KM", "269", "Comoros"],
    ["KN", "1", "Saint Kitts and Nevis"],
    ["KP", "850", "North Korea"],
    ["KR", "82", "South Korea"],
    ["KW", "965", "Kuwait"],
    ["KY", "1", "Cayman Islands"],
    ["KZ", "7", "Kazakhstan"],
    ["LA", "856", "Laos"],
    ["LB", "961", "Lebanon"],
    ["LC", "1", "Saint Lucia"],
    ["LI", "423", "Liechtenstein"],
    ["LK", "94", "Sri Lanka"],
    ["LR", "231", "Liberia"],
    ["LS", "266", "Lesotho"],
    ["LT", "370", "Lithuania"],
    ["LU", "352", "Luxembourg"],
    ["LV", "371", "Latvia"],
    ["LY", "218", "Libya"],
    ["MA", "212", "Morocco"],
    ["MC", "377", "Monaco"],
    ["MD", "373", "Moldova"],
    ["ME", "382", "Montenegro"],
    ["MF", "590", "Saint Martin"],
    ["MG", "261", "Madagascar"],
    ["MH", "692", "Marshall Islands"],
    ["MK", "389", "North Macedonia"],
    ["ML", "223", "Mali"],
    ["MM", "95", "Myanmar"],
    ["MN", "976", "Mongolia"],
    ["MO", "853", "Macao"],
    ["MP", "1", "Northern Mariana Islands"],
    ["MQ", "596", "Martinique"],
    ["MR", "222", "Mauritania"],
    ["MS", "1", "Montserrat"],
    ["MT", "356", "Malta"],
    ["MU", "230", "Mauritius"],
    ["MV", "960", "Maldives"],
    ["MW", "265", "Malawi"],
    ["MX", "52", "Mexico"],
    ["MY", "60", "Malaysia"],
    ["MZ", "258", "Mozambique"],
    ["NA", "264", "Namibia"],
    ["NC", "687", "New Caledonia"],
    ["NE", "227", "Niger"],
    ["NF", "672", "Norfolk Island"],
    ["NG", "234", "Nigeria"],
    ["NI", "505", "Nicaragua"],
    ["NL", "31", "Netherlands"],
    ["NO", "47", "Norway"],
    ["NP", "977", "Nepal"],
    ["NR", "674", "Nauru"],
    ["NU", "683", "Niue"],
    ["NZ", "64", "New Zealand"],
    ["OM", "968", "Oman"],
    ["PA", "507", "Panama"],
    ["PE", "51", "Peru"],
    ["PF", "689", "French Polynesia"],
    ["PG", "675", "Papua New Guinea"],
    ["PH", "63", "Philippines"],
    ["PK", "92", "Pakistan"],
    ["PL", "48", "Poland"],
    ["PM", "508", "Saint Pierre and Miquelon"],
    ["PN", "64", "Pitcairn Islands"],
    ["PR", "1", "Puerto Rico"],
    ["PS", "970", "Palestine"],
    ["PT", "351", "Portugal"],
    ["PW", "680", "Palau"],
    ["PY", "595", "Paraguay"],
    ["QA", "974", "Qatar"],
    ["RE", "262", "Réunion"],
    ["RO", "40", "Romania"],
    ["RS", "381", "Serbia"],
    ["RU", "7", "Russia"],
    ["RW", "250", "Rwanda"],
    ["SA", "966", "Saudi Arabia"],
    ["SB", "677", "Solomon Islands"],
    ["SC", "248", "Seychelles"],
    ["SD", "249", "Sudan"],
    ["SE", "46", "Sweden"],
    ["SG", "65", "Singapore"],
    ["SH", "290", "Saint Helena, Ascension and Tristan da Cunha"],
    ["SI", "386", "Slovenia"],
    ["SJ", "47", "Svalbard and Jan Mayen"],
    ["SK", "421", "Slovakia"],
    ["SL", "232", "Sierra Leone"],
    ["SM", "378", "San Marino"],
    ["SN", "221", "Senegal"],
    ["SO", "252", "Somalia"],
    ["SR", "597", "Suriname"],
    ["SS", "211", "South Sudan"],
    ["ST", "239", "São Tomé and Príncipe"],
    ["SV", "503", "El Salvador"],
    ["SX", "1", "Sint Maarten"],
    ["SY", "963", "Syria"],
    ["SZ", "268", "Eswatini"],
    ["TC", "1", "Turks and Caicos Islands"],
    ["TD", "235", "Chad"],
    ["TF", "262", "French Southern Territories"],
    ["TG", "228", "Togo"],
    ["TH", "66", "Thailand"],
    ["TJ", "992", "Tajikistan"],
    ["TK", "690", "Tokelau"],
    ["TL", "670", "Timor-Leste"],
    ["TM", "993", "Turkmenistan"],
    ["TN", "216", "Tunisia"],
    ["TO", "676", "Tonga"],
    ["TR", "90", "Türkiye"],
    ["TT", "1", "Trinidad and Tobago"],
    ["TV", "688", "Tuvalu"],
    ["TW", "886", "Taiwan"],
    ["TZ", "255", "Tanzania"],
    ["UA", "380", "Ukraine"],
    ["UG", "256", "Uganda"],
    ["UM", "1", "United States Minor Outlying Islands"],
    ["US", "1", "United States"],
    ["UY", "598", "Uruguay"],
    ["UZ", "998", "Uzbekistan"],
    ["VA", "39", "Vatican City"],
    ["VC", "1", "Saint Vincent and the Grenadines"],
    ["VE", "58", "Venezuela"],
    ["VG", "1", "British Virgin Islands"],
    ["VI", "1", "U.S. Virgin Islands"],
    ["VN", "84", "Vietnam"],
    ["VU", "678", "Vanuatu"],
    ["WF", "681", "Wallis and Futuna"],
    ["WS", "685", "Samoa"],
    ["XK", "383", "Kosovo"],
    ["YE", "967", "Yemen"],
    ["YT", "262", "Mayotte"],
    ["ZA", "27", "South Africa"],
    ["ZM", "260", "Zambia"],
    ["ZW", "263", "Zimbabwe"]
  ];

  const locales = {
    es: {
      meta: {
        titles: {
          home: "Hot Host Hospitality · Gestión premium de alojamientos",
          services: "Servicios · Hot Host Hospitality",
          about: "Sobre Hot Host · Hot Host Hospitality",
          contact: "Contacto · Hot Host Hospitality"
        },
        descriptions: {
          home: "Gestión premium para alojamientos turísticos más rentables, memorables y fáciles de operar.",
          services: "Servicios de gestión, operaciones, experiencia del huésped y rentabilidad para alojamientos turísticos.",
          about: "Más de una década de experiencia hotelera entre América y Europa al servicio de tu alojamiento.",
          contact: "Descubre el potencial de tu alojamiento con una primera auditoría de rentabilidad y operación de Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Inicio", services: "Servicios", about: "Sobre Hot Host", contact: "Contacto" },
        assess: "Auditar mi propiedad",
        openMenu: "Abrir menú",
        closeMenu: "Cerrar menú",
        languageLabel: "Seleccionar idioma del sitio",
        footerText: "Hacemos que los alojamientos funcionen mejor, rindan más y se recuerden de verdad.",
        explore: "Explorar",
        services: "Servicios",
        location: "Europa y América · Hospitalidad sin fronteras"
      },
      common: {
        home: "Inicio",
        services: "Servicios",
        exploreService: "Explorar servicio →",
        viewDetail: "Ver detalle →",
        includes: "Incluye",
        requestAssessment: "Solicitar auditoría",
        priceDisclaimer: "Los precios no incluyen impuestos ni costes de terceros.",
        ctaEyebrow: "Hablemos claro, sin compromiso",
        ctaTitle: "¿Tu alojamiento podría ganar más y darte bastante menos trabajo?",
        ctaButton: "Solicitar auditoría →",
        offerKicker: "Oferta por tiempo limitado",
        offerTitle: "Auditoría de rentabilidad gratis",
        offerDeadline: "Gratis hasta 30 de septiembre",
        navOffer: "Gratis hasta 30 de septiembre",
        carouselRole: "carrusel",
        previousImage: "Imagen anterior",
        nextImage: "Imagen siguiente",
        imageCounter: "Imagen {current} de {total}",
        previousServices: "Servicios anteriores",
        nextServices: "Servicios siguientes",
        serviceCounter: "Servicios {first}–{last} de {total}",
        viewStep: "Ver paso",
        closeStep: "Cerrar explicación",
        processImageAlt: "Imagen del paso {step}",
        enableDarkMode: "Activar modo oscuro",
        enableLightMode: "Activar modo claro"
      },
      home: {
        eyebrow: "Gestión hotelera para alojamientos que quieren crecer",
        title: "Más rentabilidad.",
        titleAccent: "Mejores estancias. Menos líos.",
        lead: "Hot Host convierte alojamientos con potencial en operaciones más rentables, memorables y fáciles de llevar, estén donde estén. Nosotros cuidamos el detalle; tú recuperas tiempo y control.",
        discover: "Ver cómo lo hacemos →",
        analyse: "Solicitar auditoría",
        years: "Años en hospitalidad",
        support: "Atención al huésped",
        starsLabel: "Cinco estrellas",
        experiences: "Experiencias que dejan huella",
        logoAlt: "Logotipo de Hot Host Hospitality con tres haches",
        heroPropertyAlts: [
          "Terraza de una vivienda moderna con piscina y cielo abierto",
          "Casa contemporánea iluminada al atardecer entre árboles",
          "Villa blanca contemporánea con piscina exterior"
        ],
        badge: "Premium con personalidad",
        auditPromptLead: "Descubre cuánto podría rendir tu propiedad con una revisión clara de precio, ocupación y oportunidades. Gratis y sin compromiso.",
        auditPromptButton: "Quiero mi auditoría gratis →",
        auditPromptClose: "Cerrar esta oferta",
        servicesEyebrow: "Estrategia, operación y hospitalidad",
        servicesTitle: "Todo lo que hace que un alojamiento funcione de verdad.",
        servicesLead: "Hot Host es capaz de vender hielo a un esquimal o leche a una vaca. Pero preferimos vender mejor tu alojamiento: con estrategia, servicio y cero humo.",
        allServices: "Ver todos los servicios",
        comparison: {
          eyebrow: "Comparador de ingresos",
          title: "Tres formas de rentabilizar la misma propiedad.",
          lead: "Selecciona tu modelo de alquiler actual e introduce solo el precio que cobras. El resto de los supuestos se calcula automáticamente.",
          inputsTitle: "Tu situación actual",
          modelLabel: "¿Cómo alquilas actualmente la propiedad?",
          currencyLabel: "Seleccionar moneda",
          assumptionsTitle: "Supuestos calculados",
          traditionalRent: "Alquiler tradicional al mes",
          touristRate: "Tarifa turística media por noche",
          touristOccupancy: "Ocupación media de otra agencia",
          hotHostRate: "Tarifa por noche con Hot Host",
          hotHostOccupancy: "Ocupación con Hot Host",
          metric: "Indicador",
          traditional: "Alquiler tradicional",
          tourist: "Otra agencia turística",
          hotHost: "Gestión Hot Host",
          monthlyIncome: "Ingreso bruto mensual",
          annualIncome: "Ingreso bruto anual",
          occupiedNights: "Noches ocupadas al año",
          averageRate: "Precio medio por noche",
          ownerTime: "Dedicación del propietario",
          pricing: "Estrategia de precios",
          guestCare: "Atención al huésped",
          traditionalNights: "100% de ocupación",
          traditionalRate: "Renta fija",
          ownerTimeHigh: "Baja",
          ownerTimeLow: "Muy baja",
          pricingFixed: "Fija",
          pricingManual: "Gestionada por la agencia",
          pricingDynamic: "Dinámica y supervisada",
          guestCareTenant: "Relación con el inquilino",
          guestCareOwner: "Coordinada por la agencia",
          guestCareHotHost: "Coordinada por Hot Host",
          resultLabel: "Ingreso bruto anual estimado con Hot Host",
          versusTraditional: "frente al alquiler tradicional",
          versusTourist: "frente a otra agencia turística",
          disclaimer: "Estimación orientativa de ingresos brutos a partir de los datos introducidos y criterios internos de rendimiento. Valores antes de impuestos, financiación, mantenimiento, plataformas y honorarios; no constituyen una garantía."
        },
        methodEyebrow: "Método Hot Host",
        methodTitle: ["La magia existe.", "Pero lleva checklist."],
        methodLead: "Combinamos empatía, tecnología, operación y medición. El huésped siente cercanía; tú conservas el control y recibes bastantes menos mensajes a deshoras.",
        steps: [
          ["Diagnóstico", "Analizamos propiedad, posicionamiento y potencial.", "Revisamos el anuncio, la demanda, la competencia, los costes y la experiencia actual para separar intuiciones de oportunidades reales."],
          ["Diseño", "Definimos operación, estándares y experiencia.", "Convertimos el diagnóstico en estándares, mensajes, precios, automatizaciones y una experiencia coherente con la identidad del alojamiento."],
          ["Ejecución", "Coordinamos huéspedes, calendario y proveedores.", "Ponemos el plan en marcha y conectamos calendario, huéspedes y proveedores para que cada tarea tenga responsable y momento."],
          ["Optimización", "Medimos, aprendemos y mejoramos continuamente.", "Leemos resultados, detectamos desvíos y ajustamos la estrategia. Lo que funciona se potencia; lo que no, se corrige sin drama."]
        ]
      },
      servicesPage: {
        eyebrow: "Una solución para cada dolor de cabeza",
        title: ["Gestión que se nota.", "Problemas que dejan de notarse."],
        lead: "Cuidamos la estrategia, la operación y cada detalle de la estancia. Porque publicar un anuncio y cruzar los dedos no cuenta como Revenue Management.",
        processLabel: "Del primer clic a la próxima reserva",
        stages: [
          ["Atraer", "Ponemos tu alojamiento delante del huésped adecuado.", "Combinamos fotografía, contenido y posicionamiento para destacar donde tu público busca, compara y empieza a imaginar su estancia."],
          ["Convertir", "Convertimos interés en reservas rentables.", "Afinamos propuesta de valor, precio, canales y reserva directa para reducir fricción y proteger el margen sin competir solo por precio."],
          ["Cuidar", "Cuidamos cada momento de la estancia.", "Diseñamos comunicaciones y estándares operativos que anticipan necesidades, coordinan al equipo y hacen que todo parezca fácil."],
          ["Fidelizar", "Hacemos que una buena estancia siga trabajando.", "Activamos reputación, recomendación y recurrencia para convertir huéspedes satisfechos en reseñas, embajadores y próximas reservas."]
        ]
      },
      about: {
        breadcrumb: "Sobre Hot Host",
        eyebrow: "Hospitalidad aprendida en primera línea",
        title: ["Hospitalidad real.", "Estándares ★★★★★"],
        lead: "Hot Host lleva la disciplina de un gran hotel a cada alojamiento, con la cercanía de quien sabe que detrás de cada reserva hay una persona y detrás de cada propiedad, alguien que quiere dormir tranquilo.",
        prose: [
          {
            title: "Experiencia en primera línea",
            paragraphs: [
              "Más de una década trabajando entre recepción, operaciones, servicio, atención al cliente y animación turística nos enseñó algo esencial: una estancia excelente no ocurre por casualidad. Se diseña, se coordina y se cuida.",
              "Nuestra trayectoria une hoteles vacacionales de gran volumen en el Caribe con hotelería urbana y de costa en el Mediterráneo. Es experiencia entre América y Europa, con la exigencia operativa y el componente humano que convierten una reserva en un recuerdo."
            ]
          },
          {
            title: "El método Hot Host",
            paragraphs: [
              "Tratamos cada propiedad como un pequeño hotel con identidad propia. Partimos del diagnóstico, diseñamos estándares, documentamos procesos y medimos resultados. La improvisación queda reservada para el humor con el huésped, no para la operación."
            ]
          }
        ],
        credentialsTitle: "Experiencia que se convierte en resultados",
        credentialsLead: "Experiencia hotelera real, visión comercial y ejecución diaria: la combinación que convierte potencial en reservas, reputación y tranquilidad para el propietario.",
        credentials: [
          ["Más de una década en hospitalidad", "Experiencia operativa real en recepción, servicio, coordinación y resolución de incidencias. No teoría de manual: criterio probado frente al huésped."],
          ["Visión 360° del alojamiento", "Conectamos experiencia, costes, procesos, reputación y rentabilidad para que cada decisión sume y ninguna oportunidad se pierda entre departamentos."],
          ["Criterio internacional, atención cercana", "Trayectoria entre Caribe y Mediterráneo, Europa y América, adaptada al mercado, al entorno y a la personalidad de cada propiedad."],
          ["Nueve idiomas, una comunicación impecable", "Reducimos malentendidos y acompañamos a propietarios y huéspedes con mensajes claros antes, durante y después de cada estancia."],
          ["Booking, Airbnb y revenue con intención", "Optimizamos anuncios, precios y calendario para competir por valor y rentabilidad, no simplemente por ser la opción más barata."],
          ["Conversión y reputación que se impulsan", "Alineamos fotografía, texto del anuncio, experiencia y reseñas para que cada estancia excelente ayude a conseguir la siguiente reserva."],
          ["Operación documentada, control visible", "Protocolos, responsables claros, proveedores coordinados y seguimiento de incidencias dan al propietario visibilidad sin devolverle la carga diaria."],
          ["Decisiones con datos, hospitalidad con personas", "Medimos precios, ocupación, conversión y feedback para actuar con criterio y empatía. La tecnología apoya el cuidado; nunca lo sustituye."]
        ],
        credentialsCta: "Quiero saber cuánto puede rendir mi propiedad →",
        credentialsExpand: "Ver todas las credenciales",
        credentialsCollapse: "Ocultar credenciales",
        pillarsEyebrow: "Nuestros pilares",
        pillarsTitle: "Premium, pero humano.",
        pillars: [
          ["♟", "Profesionalidad", "Protocolos claros, comunicación transparente y responsabilidad real.", "Convertimos la gestión diaria en un sistema ordenado: responsabilidades definidas, incidencias documentadas, proveedores coordinados y decisiones que el propietario puede entender. La profesionalidad no consiste en sonar serio, sino en cumplir, informar a tiempo y responder por cada resultado."],
          ["♡", "Hospitalidad", "Escuchar, anticipar y resolver con empatía.", "Diseñamos cada contacto pensando en la persona que llega cansada, celebra algo importante o necesita ayuda sin saber cómo pedirla. Anticipamos preguntas, personalizamos la bienvenida y resolvemos los imprevistos con cercanía para que el huésped se sienta atendido, nunca procesado."],
          ["↗", "Rentabilidad", "Cada decisión operativa debe aportar valor sostenible.", "Analizamos precio, ocupación, costes, conversión y reputación como partes de una misma ecuación. Buscamos mejorar el beneficio sin deteriorar el activo ni la experiencia: vender mejor, evitar fugas operativas e invertir solo donde el retorno puede medirse."],
          ["✦", "Personalidad", "Experiencias con chispa, sin convertir el alojamiento en un circo.", "Encontramos aquello que hace reconocible a cada propiedad y lo convertimos en una experiencia coherente: tono, detalles, recomendaciones y pequeños gestos memorables. La personalidad diferencia el alojamiento sin artificios y ayuda a atraer al huésped que realmente encaja con él."]
        ],
        voicesEyebrow: "Lo cuentan nuestros clientes",
        voicesTitle: "La tranquilidad también se nota.",
        voicesLead: "Propietarios que recuperaron tiempo, control y confianza en su alojamiento.",
        quotes: [
          ["Desde que Hot Host se ocupa de la gestión, ya no vivo pendiente del teléfono. La ocupación ha mejorado, los huéspedes llegan mejor informados y la propiedad vuelve a sentirse como una inversión, no como un segundo trabajo.", "Laura Benítez", "Propietaria de dos apartamentos · Sevilla"],
          ["Cuidaron detalles que nunca habíamos considerado: el tono de los mensajes, la llegada y las recomendaciones del barrio. Las últimas reseñas mencionan justo eso y la diferencia se nota en cada estancia.", "Daniel Ferrer", "Anfitrión de vivienda turística · Valencia"],
          ["Tuvimos una incidencia un sábado por la noche y la resolvieron antes de que afectara al huésped. Recibimos información clara, una solución y seguimiento. Ese nivel de tranquilidad era exactamente lo que buscábamos.", "Marta Rossi", "Propietaria internacional · Madrid / Milán"]
        ]
      },
      contact: {
        breadcrumb: "Contacto",
        eyebrow: "Cuéntanos qué tienes entre manos",
        title: "Tu alojamiento puede dar más. Empecemos por entenderlo.",
        heading: "Hablemos de tu propiedad",
        lead: "Cuéntanos lo esencial y realizaremos una primera auditoría clara y concreta de rentabilidad y operación. No hace falta una presentación de 40 diapositivas; con datos honestos nos basta.",
        serviceAreaLabel: "Área de servicio",
        serviceArea: "Gestión presencial según proyecto · Coordinación remota internacional",
        emailLabel: "Correo",
        hoursLabel: "Horario comercial",
        hours: "Lunes a viernes · 09:00–19:00"
      },
      form: {
        title: "Solicita una primera auditoría de rentabilidad y operación",
        selectOption: "Selecciona una opción",
        selectCountry: "Selecciona un país o territorio",
        contactRole: "Relación con la propiedad",
        roles: [["owner", "Propietario/a"], ["representative", "Representante"], ["agency", "Agencia o inmobiliaria"]],
        fullName: "Nombre completo",
        email: "Correo electrónico",
        phoneCountry: "País o territorio del teléfono",
        phone: "Número de teléfono nacional",
        phoneHelp: "Escribe solo el número nacional, sin prefijo internacional ni signo +.",
        phonePlaceholder: "Ej.: 600 000 000",
        addressGroup: "Dirección exacta de la propiedad",
        streetAddress: "Calle y número",
        streetHelp: "Incluye tipo de vía, nombre, número y, si corresponde, portal o puerta.",
        streetPlaceholder: "Ej.: Calle Feria, 12, 2º B",
        postalCode: "Código postal",
        postalHelp: "Introduce el código postal exacto de la propiedad.",
        postalPlaceholder: "Ej.: 41003",
        city: "Ciudad o municipio",
        cityPlaceholder: "Ej.: Málaga",
        propertyCountry: "País o territorio de la propiedad",
        propertyType: "Tipo de propiedad",
        propertyTypes: [["villa", "Villa"], ["studio", "Estudio"], ["flat", "Piso"], ["house", "Casa"], ["chalet", "Chalet"], ["other", "Otro"]],
        otherType: "Especifica el tipo de propiedad",
        otherTypePlaceholder: "Describe brevemente la propiedad",
        bedrooms: "Cantidad de habitaciones",
        bathrooms: "Cantidad de baños",
        floor: "Planta en la que se encuentra",
        floorHelp: "Introduce 0 para planta baja.",
        totalFloors: "Número total de plantas de la propiedad",
        touristRental: "¿Está actualmente en alquiler turístico?",
        rentalOptions: [["yes", "Sí"], ["no", "No"]],
        listingUrl: "URL del anuncio turístico",
        listingPlaceholder: "Airbnb o Booking preferiblemente",
        photosUrl: "Enlace a las fotografías",
        photosPlaceholder: "Enlace de Google Drive o Dropbox",
        photosHelp: "Asegúrate de que el enlace permita ver las fotografías.",
        photosUpload: "Subir fotografías de la propiedad",
        photosUploadHelp: "Hasta 10 imágenes JPG, PNG o WebP, de menos de 20 MB cada una. Se optimizarán antes de enviarse.",
        photosSelected: "Fotografías seleccionadas: {count}",
        removePhoto: "Eliminar {name}",
        photosRequired: "Sube al menos una fotografía o añade un enlace donde podamos verlas.",
        photosTooMany: "Puedes subir un máximo de 10 fotografías.",
        photosTooLarge: "Cada fotografía debe pesar menos de 20 MB.",
        photosInvalidType: "Solo se admiten imágenes JPG, PNG o WebP.",
        driveUploading: "Optimizando y enviando las fotografías a Google Drive…",
        driveUploaded: "{count} fotografías enviadas a Drive para su procesamiento.",
        driveNotConfigured: "La subida directa no está disponible ahora. Añade un enlace compartido a las fotografías.",
        driveUploadError: "No se pudieron enviar las fotografías a Google Drive. Inténtalo de nuevo o añade un enlace.",
        comments: "Comentarios adicionales",
        optional: "(opcional)",
        commentsPlaceholder: "Objetivos, dudas o cualquier dato relevante...",
        privacyConsent: "Autorizo a Hot Host Hospitality a utilizar los datos y fotografías enviados únicamente para evaluar esta solicitud.",
        privacyNote: "No incluyas personas ni documentos sensibles. Puedes solicitar la eliminación de la información escribiendo a direccion@hhosthospitality.com.",
        actionsLabel: "Elige cómo quieres enviar la consulta",
        sendEmail: "Enviar por correo →",
        sendWhatsapp: "Enviar por WhatsApp ↗",
        validation: {
          required: "Este campo es obligatorio.",
          email: "Introduce una dirección de correo válida.",
          url: "Introduce una URL completa y válida, por ejemplo https://…",
          phoneNoPrefix: "No incluyas el signo + ni el prefijo internacional en este campo.",
          phone: "Introduce un número nacional válido de entre 4 y 15 dígitos.",
          number: "Introduce un número válido.",
          minimum: "El valor debe ser 1 o superior.",
          floorMinimum: "La planta debe ser 0 o superior.",
          tooShort: "Completa este campo con más detalle.",
          generic: "Revisa el valor introducido.",
          review: "Revisa los campos indicados antes de enviar la consulta."
        },
        status: {
          emailOpened: "Se ha abierto Gmail con la consulta preparada. Revísala y pulsa Enviar.",
          whatsappOpened: "Se ha abierto WhatsApp con la consulta preparada. Revísala y pulsa Enviar.",
          blockedBefore: "El navegador bloqueó la ventana. ",
          blockedEmailLink: "Abrir el correo aquí",
          blockedWhatsappLink: "Abrir WhatsApp aquí",
          blockedAfter: "."
        },
        emailBody: {
          subject: "Nueva propiedad",
          relationship: "Relación",
          name: "Nombre",
          email: "Correo electrónico",
          phone: "Teléfono internacional",
          address: "Dirección de la propiedad",
          street: "Calle y número",
          postalCode: "Código postal",
          city: "Ciudad o municipio",
          country: "País o territorio",
          propertyType: "Tipo de propiedad",
          bedrooms: "Habitaciones",
          bathrooms: "Baños",
          floor: "Planta",
          totalFloors: "Número total de plantas",
          rental: "En alquiler turístico",
          listingUrl: "URL del anuncio",
          photosUrl: "Fotografías",
          photosUploaded: "Referencia de envío a Drive",
          consent: "Consentimiento de uso de datos",
          comments: "Comentarios"
        }
      },
      services: {
        "gestion-integral": {
          title: "Gestión integral",
          imageAlt: "Checklist de gestión operativa preparado sobre una mesa",
          summary: "Tu alojamiento, gestionado de principio a fin con visión hotelera, control operativo y comunicación transparente.",
          price: ["18% de los ingresos del alojamiento", "Mínimo 220 €/mes · Incluye Guest Experience, Revenue Management y coordinación operativa remota"],
          tag: "Control total, tranquilidad real",
          intro: "Centralizamos la operación del alojamiento para que el propietario conserve visibilidad sin cargar con la gestión diaria.",
          benefits: ["Configuración y optimización de anuncios", "Gestión de reservas y calendario", "Comunicación con huéspedes antes, durante y después", "Coordinación de limpieza, lavandería y mantenimiento", "Seguimiento operativo e informes al propietario"],
          content: [
            { title: "Una operación, un responsable", paragraphs: ["La gestión integral conecta comercialización, experiencia del huésped y mantenimiento del activo. Evita que cada área funcione como una isla y permite tomar decisiones con información completa."] },
            { title: "Qué hacemos", paragraphs: ["Definimos estándares, coordinamos proveedores, gestionamos comunicaciones y supervisamos cada estancia. Adaptamos el alcance a la propiedad: desde apoyo híbrido hasta delegación completa."] },
            { title: "Transparencia para el propietario", paragraphs: ["Recibirás información clara sobre reservas, incidencias y oportunidades. No se trata de desaparecer de tu propiedad, sino de dejar de perseguir tareas pequeñas todo el día."] }
          ]
        },
        "guest-experience": {
          title: "Guest Experience",
          imageAlt: "Salón luminoso preparado para recibir a los huéspedes",
          summary: "Diseñamos estancias memorables, resolvemos necesidades y convertimos pequeños detalles en grandes reseñas.",
          price: ["129 €/mes + 12 €/reserva", "Configuración inicial: 190 € en un único pago"],
          tag: "Estancias que generan recuerdo",
          intro: "Diseñamos cada punto de contacto para que el huésped se sienta esperado, atendido y genuinamente bienvenido.",
          benefits: ["Comunicación personalizada", "Guía local y recomendaciones segmentadas", "Detalles de bienvenida con identidad", "Seguimiento durante la estancia", "Gestión empática de incidencias"],
          content: [
            { title: "De alojamiento a experiencia", paragraphs: ["Una cama limpia es el mínimo. La diferencia aparece cuando la información llega antes de que se pida, las recomendaciones encajan con el viajero y cualquier imprevisto se resuelve con humanidad."] },
            { feature: true, title: "🦆 Operación Patito", paragraphs: ["Si un huésped viaja con niños, podemos convertir la llegada en una pequeña misión: un patito de goma recibe a la familia con una pista hacia una guía de planes infantiles, un detalle local o el rincón favorito de la casa. Es simple, fotografiable y memorable.", { strong: "El principio:", text: " un gesto inesperado, de bajo coste y coherente con el perfil del huésped puede generar conversación, emoción y mejores recuerdos. El patito es el gancho; detrás hay segmentación, timing y criterio hotelero." }] },
            { title: "Personalización escalable", paragraphs: ["No todo huésped quiere lo mismo. Diseñamos variantes para parejas, familias, viajeros de negocios y estancias largas, manteniendo procesos eficientes."] },
            { title: "Reputación que se trabaja", paragraphs: ["La mejor reseña empieza mucho antes del check-out. Monitorizamos señales de satisfacción y actuamos durante la estancia, cuando todavía se puede mejorar la experiencia."] }
          ]
        },
        "revenue-management": {
          title: "Revenue Management",
          imageAlt: "Panel de analítica con gráficos de rendimiento",
          summary: "Precios dinámicos basados en demanda, eventos, competencia, ocupación y objetivos reales de rentabilidad.",
          price: ["179 €/mes", "Por propiedad"],
          tag: "Precio correcto, en el momento correcto",
          intro: "Transformamos datos de mercado en una estrategia de precios dinámica, coherente con tu posicionamiento y tus objetivos.",
          benefits: ["Análisis de competencia", "Demanda y calendario de eventos", "Reglas por anticipación y duración", "Control de ocupación y ADR", "Revisión periódica de estrategia"],
          content: [
            { title: "Más que subir y bajar precios", paragraphs: ["Revenue Management significa vender cada noche con la mejor combinación posible de precio, ocupación y margen. Analizamos mercado, eventos, estacionalidad, ritmo de reservas y comportamiento del anuncio."] },
            { title: "Estrategia con contexto", paragraphs: ["Una feria, un puente o una cancelación de última hora exigen respuestas distintas. Configuramos reglas y hacemos seguimiento para evitar tanto noches vacías como ventas prematuras por debajo del potencial."] },
            { title: "Decisiones explicables", paragraphs: ["La automatización ayuda, pero no sustituye el criterio. Cada ajuste debe responder a una hipótesis de demanda y a un objetivo medible."] }
          ]
        },
        "check-in-operaciones": {
          title: "Check-in & operaciones",
          imageAlt: "Entrega de llaves en la entrada de una vivienda",
          summary: "Llegadas fluidas, salidas controladas, coordinación diaria y respuesta rápida ante incidencias.",
          price: ["Desde 39 €/estancia", "Check-in presencial desde 59 € · Suplemento nocturno de 20 €"],
          tag: "Llegadas fluidas, control diario",
          intro: "Coordinamos los momentos críticos de cada estancia y mantenemos la operación en movimiento, incluso cuando aparece un imprevisto.",
          benefits: ["Instrucciones pre-llegada", "Check-in presencial o autónomo", "Verificación de identidad y normas", "Coordinación de check-out", "Gestión y escalado de incidencias"],
          content: [
            { title: "La primera impresión no tiene botón de reinicio", paragraphs: ["Preparamos al huésped antes de llegar, confirmamos información crítica y reducimos fricciones. Cuando el servicio es presencial, añadimos bienvenida y orientación; cuando es autónomo, diseñamos instrucciones imposibles de malinterpretar."] },
            { title: "Operación conectada", paragraphs: ["Check-out, limpieza, mantenimiento y próxima llegada comparten el mismo reloj. Coordinamos ventanas, prioridades y confirmaciones para evitar sorpresas."] },
            { title: "Incidencias con protocolo", paragraphs: ["Clasificamos cada caso por urgencia e impacto, comunicamos con claridad y dejamos registro. Resolver rápido importa; aprender para que no se repita, aún más."] }
          ]
        },
        "limpieza-lavanderia": {
          title: "Limpieza & lavandería",
          imageAlt: "Dormitorio prístino con una cama impecable y luz cálida",
          summary: "Estándares verificables, coordinación profesional y una presentación impecable entre reservas.",
          price: ["Desde 65 €/servicio", "+18 € por habitación adicional · Lavandería aparte"],
          tag: "Calidad visible en cada detalle",
          intro: "Coordinamos una preparación consistente del alojamiento, con estándares claros y controles antes de cada llegada.",
          benefits: ["Checklist por estancia", "Coordinación de equipos", "Gestión de lencería y amenities", "Control visual de calidad", "Reporte de daños o faltantes"],
          content: [
            { title: "Limpieza no es solo limpieza", paragraphs: ["Es presentación, conservación y confianza. Definimos un estándar específico para la propiedad, incluyendo puntos de alto contacto, montaje, reposición y revisión final."] },
            { title: "Control de calidad", paragraphs: ["Un checklist reduce olvidos; la evidencia visual y el seguimiento permiten corregir desviaciones. También detectamos daños, consumos anómalos y necesidades de mantenimiento."] },
            { title: "Una experiencia coherente", paragraphs: ["El huésped debe encontrar el mismo nivel de preparación cualquier día del año. Coordinamos tiempos y stock para que la calidad no dependa de la improvisación."] }
          ]
        },
        "fotografia-profesional": {
          title: "Fotografía profesional",
          imageAlt: "Cámara profesional sobre trípode fotografiando un interior",
          galleryEyebrow: "Una imagen vende antes de que leas una palabra",
          galleryTitle: "Propiedades que entran por los ojos.",
          galleryLead: "Una buena sesión no enseña habitaciones sueltas: cuenta cómo se sentiría una estancia completa.",
          galleryAlts: [
            "Villa blanca contemporánea con piscina exterior",
            "Salón luminoso con mobiliario cálido y plantas",
            "Comedor contemporáneo abierto hacia la cocina",
            "Dormitorio moderno con madera y abundante luz natural",
            "Baño contemporáneo de mármol con mueble de madera"
          ],
          summary: "Una puesta en escena visual que aumenta el atractivo del anuncio y comunica el valor de la propiedad.",
          price: ["295 €/sesión fotográfica", "Propiedades de gran tamaño desde 390 €"],
          tag: "Haz visible el valor",
          intro: "Planificamos la imagen del alojamiento para atraer al huésped adecuado, elevar la percepción de calidad y mejorar la conversión.",
          benefits: ["Dirección visual y estilismo", "Selección de encuadres", "Secuencia narrativa del anuncio", "Optimización para plataformas", "Recomendaciones de puesta en escena"],
          content: [
            { title: "La reserva empieza por los ojos", paragraphs: ["Las fotografías no solo enseñan metros cuadrados: comunican luz, amplitud, atmósfera y tipo de estancia. Preparamos el espacio y construimos una secuencia que responde las dudas del viajero."] },
            { title: "Vender sin maquillar", paragraphs: ["Buscamos una presentación atractiva y fiel. Una expectativa inflada puede conseguir el clic, pero también una mala reseña. La confianza convierte mejor a largo plazo."] },
            { title: "Contenido útil en varios canales", paragraphs: ["Organizamos versiones adaptadas a portales, web y comunicación comercial para aprovechar cada sesión."] }
          ]
        },
        "auditoria-rentabilidad": {
          title: "Auditoría de rentabilidad",
          imageAlt: "Gráficos, calculadora y lápiz sobre una mesa de análisis",
          summary: "Diagnóstico comercial y operativo para detectar fugas, oportunidades y prioridades de mejora.",
          price: ["249 €", "Gratis hasta el 30 de septiembre"],
          tag: "Primero entender, luego mejorar",
          intro: "Analizamos el alojamiento como producto, operación y activo para identificar las acciones con mayor impacto potencial.",
          benefits: ["Diagnóstico del anuncio", "Benchmark competitivo", "Revisión de costes y procesos", "Mapa de oportunidades", "Plan priorizado de 30–90 días"],
          content: [
            { title: "Una radiografía del negocio", paragraphs: ["Revisamos posicionamiento, precios, calendario, contenido, reputación, experiencia y costes operativos. El objetivo es separar síntomas de causas."] },
            { title: "Priorizar con criterio", paragraphs: ["No toda mejora merece la misma inversión. Clasificamos oportunidades por impacto, esfuerzo, urgencia y dependencia, creando una hoja de ruta ejecutable."] },
            { title: "Recomendaciones accionables", paragraphs: ["Entregamos observaciones concretas, responsables sugeridos y métricas de seguimiento. Una auditoría sin implementación es solo un documento bonito."] }
          ]
        }
      }
    },

    en: {
      meta: {
        titles: {
          home: "Hot Host Hospitality · Premium accommodation management",
          services: "Services · Hot Host Hospitality",
          about: "About Hot Host · Hot Host Hospitality",
          contact: "Contact · Hot Host Hospitality"
        },
        descriptions: {
          home: "Premium management for more profitable, memorable and easier-to-run tourist accommodation.",
          services: "Management, operations, guest experience and profitability services for tourist accommodation.",
          about: "More than a decade of hotel experience across the Americas and Europe, working for your accommodation.",
          contact: "Discover your accommodation's potential with an initial profitability and operations audit from Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Home", services: "Services", about: "About Hot Host", contact: "Contact" },
        assess: "Audit my property",
        openMenu: "Open menu",
        closeMenu: "Close menu",
        languageLabel: "Select site language",
        footerText: "We make accommodation run better, earn more and become genuinely memorable.",
        explore: "Explore",
        services: "Services",
        location: "Europe and the Americas · Hospitality without borders"
      },
      common: {
        home: "Home",
        services: "Services",
        exploreService: "Explore service →",
        viewDetail: "View details →",
        includes: "Includes",
        requestAssessment: "Request an audit",
        priceDisclaimer: "Prices exclude taxes and third-party costs.",
        ctaEyebrow: "A straight conversation, no commitment",
        ctaTitle: "Could your accommodation earn more while giving you far less work?",
        ctaButton: "Request an audit →",
        offerKicker: "Limited-time offer",
        offerTitle: "Free profitability audit",
        offerDeadline: "Free until 30 September",
        navOffer: "Free until 30 September",
        carouselRole: "carousel",
        previousImage: "Previous image",
        nextImage: "Next image",
        imageCounter: "Image {current} of {total}",
        previousServices: "Previous services",
        nextServices: "Next services",
        serviceCounter: "Services {first}–{last} of {total}",
        viewStep: "View step",
        closeStep: "Close explanation",
        processImageAlt: "Image for the {step} step",
        enableDarkMode: "Enable dark mode",
        enableLightMode: "Enable light mode"
      },
      home: {
        eyebrow: "Hotel management for accommodation ready to grow",
        title: "More profit.",
        titleAccent: "Better stays. Fewer headaches.",
        lead: "Hot Host turns promising accommodation into operations that are more profitable, memorable and easier to run, wherever they are. We handle the details; you regain time and control.",
        discover: "See how we do it →",
        analyse: "Request an audit",
        years: "Years in hospitality",
        support: "Guest support",
        starsLabel: "Five stars",
        experiences: "Experiences that leave a mark",
        logoAlt: "Hot Host Hospitality logo with three letter Hs",
        heroPropertyAlts: [
          "Modern home terrace with a pool and open sky",
          "Contemporary house illuminated at dusk among trees",
          "Contemporary white villa with an outdoor pool"
        ],
        badge: "Premium with personality",
        auditPromptLead: "Discover how much your property could earn with a clear review of pricing, occupancy and opportunities. Free and with no obligation.",
        auditPromptButton: "I want my free audit →",
        auditPromptClose: "Close this offer",
        servicesEyebrow: "Strategy, operations and hospitality",
        servicesTitle: "Everything that makes accommodation work properly.",
        servicesLead: "Hot Host could sell ice to an Eskimo or milk to a cow. We would rather sell your accommodation better: with strategy, service and no hot air.",
        allServices: "View all services",
        comparison: {
          eyebrow: "Income comparison",
          title: "Three ways to earn from the same property.",
          lead: "Select your current rental model and enter only the price you charge. All remaining assumptions are calculated automatically.",
          inputsTitle: "Your current situation",
          modelLabel: "How do you currently rent the property?",
          currencyLabel: "Select currency",
          assumptionsTitle: "Calculated assumptions",
          traditionalRent: "Traditional monthly rent",
          touristRate: "Average tourist nightly rate",
          touristOccupancy: "Other-agency market occupancy",
          hotHostRate: "Nightly rate with Hot Host",
          hotHostOccupancy: "Occupancy with Hot Host",
          metric: "Metric",
          traditional: "Traditional rental",
          tourist: "Other tourist agency",
          hotHost: "Hot Host management",
          monthlyIncome: "Gross monthly income",
          annualIncome: "Gross annual income",
          occupiedNights: "Occupied nights per year",
          averageRate: "Average nightly rate",
          ownerTime: "Owner involvement",
          pricing: "Pricing strategy",
          guestCare: "Guest support",
          traditionalNights: "100% occupancy",
          traditionalRate: "Fixed rent",
          ownerTimeHigh: "Low",
          ownerTimeLow: "Very low",
          pricingFixed: "Fixed",
          pricingManual: "Managed by the agency",
          pricingDynamic: "Dynamic and supervised",
          guestCareTenant: "Tenant relationship",
          guestCareOwner: "Coordinated by the agency",
          guestCareHotHost: "Coordinated by Hot Host",
          resultLabel: "Estimated annual gross income with Hot Host",
          versusTraditional: "versus traditional rental",
          versusTourist: "versus another tourist agency",
          disclaimer: "Illustrative gross-income estimate based on the information entered and internal performance criteria. Figures are before taxes, financing, maintenance, platform costs and management fees and do not guarantee results."
        },
        methodEyebrow: "The Hot Host method",
        methodTitle: ["Magic exists.", "But it comes with a checklist."],
        methodLead: "We combine empathy, technology, operations and measurement. Guests feel the personal touch; you stay in control and receive far fewer late-night messages.",
        steps: [
          ["Diagnosis", "We analyse the property, its positioning and its potential.", "We review the listing, demand, competitors, costs and the current guest journey to separate assumptions from genuine opportunities."],
          ["Design", "We define operations, standards and the guest experience.", "We turn the diagnosis into standards, messaging, pricing, automations and an experience consistent with the property's identity."],
          ["Delivery", "We coordinate guests, calendars and suppliers.", "We put the plan into action and connect calendars, guests and suppliers so every task has an owner and a moment."],
          ["Optimisation", "We measure, learn and improve continuously.", "We read the results, spot deviations and adjust the strategy. What works is strengthened; what does not is corrected without drama."]
        ]
      },
      servicesPage: {
        eyebrow: "A solution for every operational headache",
        title: ["Management you notice.", "Problems you stop noticing."],
        lead: "We handle strategy, operations and every detail of the stay. Posting a listing and crossing your fingers does not count as Revenue Management.",
        processLabel: "From first click to the next booking",
        stages: [
          ["Attract", "We put your accommodation in front of the right guest.", "We combine photography, content and positioning to stand out wherever your audience searches, compares and begins to picture their stay."],
          ["Convert", "We turn interest into profitable bookings.", "We refine value proposition, pricing, channels and direct booking to reduce friction and protect margin without competing on price alone."],
          ["Care", "We look after every moment of the stay.", "We design communications and operating standards that anticipate needs, coordinate the team and make everything feel effortless."],
          ["Build loyalty", "We make a great stay keep working.", "We activate reputation, recommendations and repeat business to turn satisfied guests into reviews, advocates and future bookings."]
        ]
      },
      about: {
        breadcrumb: "About Hot Host",
        eyebrow: "Hospitality learned on the front line",
        title: ["Genuine hospitality.", "Hotel standards ★★★★★"],
        lead: "Hot Host brings the discipline of a great hotel to every accommodation, with the warmth of people who know that every booking has a guest behind it and every property has an owner who would quite like to sleep well.",
        prose: [
          {
            title: "Front-line experience",
            paragraphs: [
              "More than a decade working across reception, operations, service, customer care and resort entertainment taught us something essential: an excellent stay does not happen by chance. It is designed, coordinated and cared for.",
              "Our background combines high-volume Caribbean resorts with urban and coastal hospitality around the Mediterranean. It is experience across the Americas and Europe, blending operational discipline with the human touch that turns a booking into a memory."
            ]
          },
          {
            title: "The Hot Host method",
            paragraphs: [
              "We treat every property as a small hotel with its own identity. We begin with a diagnosis, design standards, document processes and measure results. Improvisation is reserved for sharing a joke with a guest, not for running the operation."
            ]
          }
        ],
        credentialsTitle: "Experience that turns into results",
        credentialsLead: "Real hotel expertise, commercial judgement and consistent daily execution: the combination that turns potential into bookings, reputation and owner peace of mind.",
        credentials: [
          ["More than a decade in hospitality", "Hands-on experience across reception, service, coordination and incident resolution. Not textbook theory, but judgement tested in front of real guests."],
          ["A 360° view of every accommodation", "We connect guest experience, costs, operations, reputation and profitability so every decision adds value and no opportunity is lost between teams."],
          ["International judgement, genuinely local care", "Experience spanning the Caribbean and Mediterranean, Europe and the Americas, adapted to each market, setting and property's personality."],
          ["Nine languages, one clear standard", "We reduce misunderstandings and guide owners and guests with clear communication before, during and after every stay."],
          ["Booking, Airbnb and revenue with purpose", "We optimise listings, pricing and calendars to compete on value and profitability, not simply by being the cheapest option."],
          ["Conversion and reputation that reinforce each other", "We align photography, listing copy, guest experience and reviews so every excellent stay helps secure the next booking."],
          ["Documented operations, visible control", "Protocols, clear ownership, coordinated suppliers and incident follow-up give owners clarity without handing the daily workload back to them."],
          ["Decisions with data, hospitality with people", "We track pricing, occupancy, conversion and feedback, then act with judgement and empathy. Technology supports care; it never replaces it."]
        ],
        credentialsCta: "Show me how much my property could earn →",
        credentialsExpand: "View all credentials",
        credentialsCollapse: "Hide credentials",
        pillarsEyebrow: "Our pillars",
        pillarsTitle: "Premium, yet human.",
        pillars: [
          ["♟", "Professionalism", "Clear protocols, transparent communication and genuine accountability.", "We turn day-to-day management into an orderly system: clear ownership, documented incidents, coordinated suppliers and decisions the property owner can understand. Professionalism is not about sounding serious; it is about delivering, communicating on time and taking responsibility for every outcome."],
          ["♡", "Hospitality", "Listen, anticipate and solve with empathy.", "We design every interaction around the person arriving tired, celebrating something important or needing help without knowing how to ask. We anticipate questions, personalise the welcome and handle surprises with warmth so guests feel genuinely cared for, never processed."],
          ["↗", "Profitability", "Every operational decision should create sustainable value.", "We treat pricing, occupancy, costs, conversion and reputation as parts of the same equation. The aim is to improve profit without weakening the asset or the experience: sell better, remove operational leakage and invest only where the return can be measured."],
          ["✦", "Personality", "Experiences with a spark, without turning the accommodation into a circus.", "We uncover what makes each property recognisable and turn it into a coherent experience through tone, details, recommendations and small memorable gestures. Personality sets an accommodation apart without gimmicks and attracts the guests who truly fit it."]
        ],
        voicesEyebrow: "In our clients' words",
        voicesTitle: "Peace of mind you can feel.",
        voicesLead: "Property owners who regained time, control and confidence in their accommodation.",
        quotes: [
          ["Since Hot Host took over the management, I no longer live by my phone. Occupancy has improved, guests arrive better informed and the property feels like an investment again, rather than a second job.", "Laura Benítez", "Owner of two apartments · Seville"],
          ["They refined details we had never considered: the tone of each message, the arrival and the neighbourhood recommendations. Our latest reviews mention exactly those things, and the difference shows in every stay.", "Daniel Ferrer", "Holiday-home host · Valencia"],
          ["We had an issue on a Saturday night and they solved it before it affected the guest. We received clear information, a solution and proper follow-up. That level of peace of mind was exactly what we wanted.", "Marta Rossi", "International property owner · Madrid / Milan"]
        ]
      },
      contact: {
        breadcrumb: "Contact",
        eyebrow: "Tell us what you have in mind",
        title: "Your accommodation can do more. Let's understand how.",
        heading: "Let's talk about your property",
        lead: "Share the essentials and we will conduct a clear, focused initial profitability and operations audit. No 40-slide presentation required; honest information will do nicely.",
        serviceAreaLabel: "Service area",
        serviceArea: "On-site management by project · International remote coordination",
        emailLabel: "Email",
        hoursLabel: "Business hours",
        hours: "Monday to Friday · 09:00–19:00"
      },
      form: {
        title: "Request an initial profitability and operations audit",
        selectOption: "Select an option",
        selectCountry: "Select a country or territory",
        contactRole: "Relationship to the property",
        roles: [["owner", "Owner"], ["representative", "Representative"], ["agency", "Agency or estate agent"]],
        fullName: "Full name",
        email: "Email address",
        phoneCountry: "Phone country or territory",
        phone: "National phone number",
        phoneHelp: "Enter only the national number, without the international prefix or + sign.",
        phonePlaceholder: "E.g. 600 000 000",
        addressGroup: "Exact property address",
        streetAddress: "Street and number",
        streetHelp: "Include the street type and name, number and, where relevant, building or unit.",
        streetPlaceholder: "E.g. 12 Feria Street, Apt 2B",
        postalCode: "Postcode",
        postalHelp: "Enter the property's exact postcode.",
        postalPlaceholder: "E.g. 41003",
        city: "City or municipality",
        cityPlaceholder: "E.g. London",
        propertyCountry: "Property country or territory",
        propertyType: "Property type",
        propertyTypes: [["villa", "Villa"], ["studio", "Studio"], ["flat", "Flat / apartment"], ["house", "House"], ["chalet", "Chalet"], ["other", "Other"]],
        otherType: "Specify the property type",
        otherTypePlaceholder: "Briefly describe the property",
        bedrooms: "Number of bedrooms",
        bathrooms: "Number of bathrooms",
        floor: "Floor number",
        floorHelp: "Enter 0 for the ground floor.",
        totalFloors: "Total number of floors in the property",
        touristRental: "Is it currently offered as a tourist rental?",
        rentalOptions: [["yes", "Yes"], ["no", "No"]],
        listingUrl: "Tourist listing URL",
        listingPlaceholder: "Preferably Airbnb or Booking",
        photosUrl: "Link to photographs",
        photosPlaceholder: "Google Drive or Dropbox link",
        photosHelp: "Make sure the link allows the photographs to be viewed.",
        photosUpload: "Upload property photographs",
        photosUploadHelp: "Up to 10 JPG, PNG or WebP images, each smaller than 20 MB. They will be optimised before sending.",
        photosSelected: "Photographs selected: {count}",
        removePhoto: "Remove {name}",
        photosRequired: "Upload at least one photograph or add a link where we can view them.",
        photosTooMany: "You can upload a maximum of 10 photographs.",
        photosTooLarge: "Each photograph must be smaller than 20 MB.",
        photosInvalidType: "Only JPG, PNG or WebP images are accepted.",
        driveUploading: "Optimising and sending photographs to Google Drive…",
        driveUploaded: "{count} photographs sent to Drive for processing.",
        driveNotConfigured: "Direct upload is not available right now. Add a shared link to the photographs.",
        driveUploadError: "The photographs could not be sent to Google Drive. Try again or add a link.",
        comments: "Additional comments",
        optional: "(optional)",
        commentsPlaceholder: "Goals, questions or any other relevant information...",
        privacyConsent: "I authorise Hot Host Hospitality to use the submitted details and photographs solely to assess this enquiry.",
        privacyNote: "Do not include people or sensitive documents. You may request deletion by emailing direccion@hhosthospitality.com.",
        actionsLabel: "Choose how you want to send the enquiry",
        sendEmail: "Send by email →",
        sendWhatsapp: "Send by WhatsApp ↗",
        validation: {
          required: "This field is required.",
          email: "Enter a valid email address.",
          url: "Enter a complete, valid URL, for example https://…",
          phoneNoPrefix: "Do not include the + sign or international prefix in this field.",
          phone: "Enter a valid national number containing between 4 and 15 digits.",
          number: "Enter a valid number.",
          minimum: "The value must be 1 or greater.",
          floorMinimum: "The floor number must be 0 or greater.",
          tooShort: "Complete this field with more detail.",
          generic: "Check the value entered.",
          review: "Check the indicated fields before sending your enquiry."
        },
        status: {
          emailOpened: "Gmail has opened with your enquiry ready. Review it and click Send.",
          whatsappOpened: "WhatsApp has opened with your enquiry ready. Review it and click Send.",
          blockedBefore: "The browser blocked the window. ",
          blockedEmailLink: "Open the email here",
          blockedWhatsappLink: "Open WhatsApp here",
          blockedAfter: "."
        },
        emailBody: {
          subject: "New property",
          relationship: "Relationship",
          name: "Name",
          email: "Email address",
          phone: "International phone number",
          address: "Property address",
          street: "Street and number",
          postalCode: "Postcode",
          city: "City or municipality",
          country: "Country or territory",
          propertyType: "Property type",
          bedrooms: "Bedrooms",
          bathrooms: "Bathrooms",
          floor: "Floor",
          totalFloors: "Total number of floors",
          rental: "Currently a tourist rental",
          listingUrl: "Listing URL",
          photosUrl: "Photographs",
          photosUploaded: "Drive submission reference",
          consent: "Data-use consent",
          comments: "Comments"
        }
      },
      services: {
        "gestion-integral": {
          title: "Full management",
          imageAlt: "Operational management checklist laid out on a desk",
          summary: "Your accommodation managed from start to finish with hotel expertise, operational control and transparent communication.",
          price: ["18% of accommodation revenue", "Minimum €220/month · Includes Guest Experience, Revenue Management and remote operational coordination"],
          tag: "Total control, genuine peace of mind",
          intro: "We centralise accommodation operations so owners retain visibility without carrying the burden of day-to-day management.",
          benefits: ["Listing setup and optimisation", "Booking and calendar management", "Guest communication before, during and after each stay", "Cleaning, laundry and maintenance coordination", "Operational monitoring and owner reports"],
          content: [
            { title: "One operation, one accountable partner", paragraphs: ["Full management connects marketing, guest experience and asset maintenance. It prevents each area from operating in isolation and enables decisions based on complete information."] },
            { title: "What we do", paragraphs: ["We define standards, coordinate suppliers, manage communications and oversee every stay. We tailor the scope to the property, from hybrid support to complete delegation."] },
            { title: "Transparency for owners", paragraphs: ["You receive clear information about bookings, issues and opportunities. The aim is not to lose touch with your property, but to stop chasing small tasks all day."] }
          ]
        },
        "guest-experience": {
          title: "Guest Experience",
          imageAlt: "Bright living room prepared to welcome guests",
          summary: "We design memorable stays, solve needs and turn small details into excellent reviews.",
          price: ["€129/month + €12/booking", "One-time setup: €190"],
          tag: "Stays worth remembering",
          intro: "We design every touchpoint so guests feel expected, looked after and genuinely welcome.",
          benefits: ["Personalised communication", "Local guide and tailored recommendations", "Welcome touches with identity", "Support throughout the stay", "Empathetic issue management"],
          content: [
            { title: "From accommodation to experience", paragraphs: ["A clean bed is the minimum. The difference appears when information arrives before it is requested, recommendations fit the traveller and any unexpected issue is solved with humanity."] },
            { feature: true, title: "🦆 Operation Duckling", paragraphs: ["When guests travel with children, we can turn arrival into a small mission: a rubber duck welcomes the family with a clue leading to a guide to child-friendly activities, a local treat or the home's favourite corner. It is simple, photogenic and memorable.", { strong: "The principle:", text: " an unexpected, low-cost gesture that fits the guest profile can spark conversation, emotion and better memories. The duck is the hook; behind it are segmentation, timing and hotel expertise." }] },
            { title: "Scalable personalisation", paragraphs: ["Not every guest wants the same thing. We design variants for couples, families, business travellers and long stays while keeping processes efficient."] },
            { title: "A reputation built deliberately", paragraphs: ["The best review starts long before check-out. We monitor signs of satisfaction and act during the stay, while there is still time to improve the experience."] }
          ]
        },
        "revenue-management": {
          title: "Revenue Management",
          imageAlt: "Analytics dashboard displaying performance charts",
          summary: "Dynamic pricing based on demand, events, competition, occupancy and real profitability targets.",
          price: ["€179/month", "Per property"],
          tag: "The right price at the right time",
          intro: "We turn market data into a dynamic pricing strategy aligned with your positioning and objectives.",
          benefits: ["Competitor analysis", "Demand and event calendar", "Lead-time and length-of-stay rules", "Occupancy and ADR control", "Regular strategy reviews"],
          content: [
            { title: "More than raising and lowering prices", paragraphs: ["Revenue Management means selling each night with the best possible balance of price, occupancy and margin. We analyse the market, events, seasonality, booking pace and listing performance."] },
            { title: "Strategy with context", paragraphs: ["A trade fair, a holiday weekend or a last-minute cancellation each require a different response. We configure rules and monitor them to prevent both empty nights and premature sales below their potential."] },
            { title: "Explainable decisions", paragraphs: ["Automation helps, but it does not replace judgement. Every adjustment should answer a demand hypothesis and a measurable objective."] }
          ]
        },
        "check-in-operaciones": {
          title: "Check-in & operations",
          imageAlt: "Keys being handed over at the entrance to a home",
          summary: "Smooth arrivals, controlled departures, daily coordination and a rapid response to issues.",
          price: ["From €39/stay", "In-person check-in from €59 · €20 night surcharge"],
          tag: "Smooth arrivals, daily control",
          intro: "We coordinate the critical moments of every stay and keep operations moving, even when something unexpected happens.",
          benefits: ["Pre-arrival instructions", "In-person or self check-in", "Identity and house-rule verification", "Check-out coordination", "Issue management and escalation"],
          content: [
            { title: "First impressions have no reset button", paragraphs: ["We prepare guests before arrival, confirm critical information and reduce friction. For in-person service, we add a welcome and orientation; for self check-in, we design instructions that cannot be misunderstood."] },
            { title: "Connected operations", paragraphs: ["Check-out, cleaning, maintenance and the next arrival all run on the same clock. We coordinate windows, priorities and confirmations to avoid surprises."] },
            { title: "Issues handled by protocol", paragraphs: ["We classify every case by urgency and impact, communicate clearly and keep a record. Solving it quickly matters; learning how to prevent a repeat matters even more."] }
          ]
        },
        "limpieza-lavanderia": {
          title: "Cleaning & laundry",
          imageAlt: "Pristine bedroom with an immaculate bed and warm light",
          summary: "Verifiable standards, professional coordination and immaculate presentation between bookings.",
          price: ["From €65/service", "+€18 per additional bedroom · Laundry charged separately"],
          tag: "Quality visible in every detail",
          intro: "We coordinate consistent accommodation preparation, with clear standards and checks before every arrival.",
          benefits: ["Checklist for every stay", "Team coordination", "Linen and amenities management", "Visual quality control", "Damage or missing-item reports"],
          content: [
            { title: "Cleaning is more than cleaning", paragraphs: ["It is presentation, preservation and trust. We define a property-specific standard covering high-touch points, staging, replenishment and the final inspection."] },
            { title: "Quality control", paragraphs: ["A checklist reduces omissions; visual evidence and follow-up allow deviations to be corrected. We also detect damage, unusual consumption and maintenance needs."] },
            { title: "A consistent experience", paragraphs: ["Guests should find the same preparation standard every day of the year. We coordinate timing and stock so quality never depends on improvisation."] }
          ]
        },
        "fotografia-profesional": {
          title: "Professional photography",
          imageAlt: "Professional camera on a tripod photographing an interior",
          galleryEyebrow: "An image sells before a word is read",
          galleryTitle: "Properties that catch the eye.",
          galleryLead: "A strong shoot does not show isolated rooms; it tells the story of an entire stay.",
          galleryAlts: [
            "Contemporary white villa with an outdoor pool",
            "Bright living room with warm furniture and plants",
            "Contemporary dining room opening onto the kitchen",
            "Modern bedroom with wood finishes and abundant natural light",
            "Contemporary marble bathroom with a wooden vanity"
          ],
          summary: "Visual staging that makes the listing more appealing and communicates the property's value.",
          price: ["€295/photo session", "Large properties from €390"],
          tag: "Make the value visible",
          intro: "We plan the accommodation's imagery to attract the right guest, raise perceived quality and improve conversion.",
          benefits: ["Visual direction and styling", "Shot selection", "Narrative listing sequence", "Platform optimisation", "Staging recommendations"],
          content: [
            { title: "Bookings begin with the eyes", paragraphs: ["Photographs do more than show square metres: they communicate light, space, atmosphere and the kind of stay on offer. We prepare the space and build a sequence that answers travellers' questions."] },
            { title: "Selling without disguising", paragraphs: ["We seek an appealing and faithful presentation. Inflated expectations may win a click, but they can also cause a poor review. Trust converts better in the long term."] },
            { title: "Useful content across channels", paragraphs: ["We organise versions adapted to portals, websites and commercial communications so every shoot delivers maximum value."] }
          ]
        },
        "auditoria-rentabilidad": {
          title: "Profitability audit",
          imageAlt: "Charts, calculator and pencil on an analysis desk",
          summary: "A commercial and operational diagnosis to identify leakage, opportunities and improvement priorities.",
          price: ["€249", "Free until 30 September"],
          tag: "Understand first, then improve",
          intro: "We analyse the accommodation as a product, an operation and an asset to identify the actions with the greatest potential impact.",
          benefits: ["Listing diagnosis", "Competitive benchmarking", "Cost and process review", "Opportunity map", "Prioritised 30–90 day plan"],
          content: [
            { title: "A full business scan", paragraphs: ["We review positioning, prices, calendar, content, reputation, experience and operating costs. The goal is to distinguish symptoms from causes."] },
            { title: "Prioritising with judgement", paragraphs: ["Not every improvement deserves the same investment. We classify opportunities by impact, effort, urgency and dependency to create an executable roadmap."] },
            { title: "Actionable recommendations", paragraphs: ["We deliver specific observations, suggested owners and monitoring metrics. An audit without implementation is only a beautiful document."] }
          ]
        }
      }
    },

    fr: {
      meta: {
        titles: {
          home: "Hot Host Hospitality · Gestion premium d’hébergements",
          services: "Services · Hot Host Hospitality",
          about: "À propos de Hot Host · Hot Host Hospitality",
          contact: "Contact · Hot Host Hospitality"
        },
        descriptions: {
          home: "Gestion premium pour des hébergements touristiques plus rentables, mémorables et simples à piloter.",
          services: "Services de gestion, opérations, expérience client et rentabilité pour hébergements touristiques.",
          about: "Plus de dix ans d’expérience hôtelière entre les Amériques et l’Europe au service de votre hébergement.",
          contact: "Découvrez le potentiel de votre hébergement grâce à un premier audit de rentabilité et d’exploitation par Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Accueil", services: "Services", about: "À propos de Hot Host", contact: "Contact" },
        assess: "Auditer mon bien",
        openMenu: "Ouvrir le menu",
        closeMenu: "Fermer le menu",
        languageLabel: "Sélectionner la langue du site",
        footerText: "Nous rendons les hébergements plus performants, plus rentables et vraiment mémorables.",
        explore: "Explorer",
        services: "Services",
        location: "Europe et Amériques · Une hospitalité sans frontières"
      },
      common: {
        home: "Accueil",
        services: "Services",
        exploreService: "Découvrir le service →",
        viewDetail: "Voir le détail →",
        includes: "Inclus",
        requestAssessment: "Demander un audit",
        priceDisclaimer: "Les prix n’incluent ni les taxes ni les frais de tiers.",
        ctaEyebrow: "Parlons franchement, sans engagement",
        ctaTitle: "Votre hébergement pourrait-il rapporter plus tout en vous donnant bien moins de travail ?",
        ctaButton: "Demander un audit →",
        offerKicker: "Offre à durée limitée",
        offerTitle: "Audit de rentabilité offert",
        offerDeadline: "Offert jusqu’au 30 septembre",
        navOffer: "Offert jusqu’au 30 septembre",
        carouselRole: "carrousel",
        previousImage: "Image précédente",
        nextImage: "Image suivante",
        imageCounter: "Image {current} sur {total}",
        previousServices: "Services précédents",
        nextServices: "Services suivants",
        serviceCounter: "Services {first}–{last} sur {total}",
        viewStep: "Voir l’étape",
        closeStep: "Fermer l’explication",
        processImageAlt: "Image de l’étape {step}",
        enableDarkMode: "Activer le mode sombre",
        enableLightMode: "Activer le mode clair"
      },
      home: {
        eyebrow: "Une gestion hôtelière pour les hébergements qui veulent grandir",
        title: "Plus de rentabilité.",
        titleAccent: "De meilleurs séjours. Moins de tracas.",
        lead: "Hot Host transforme les hébergements prometteurs en opérations plus rentables, mémorables et simples à piloter, où qu’ils se trouvent. Nous soignons les détails ; vous retrouvez du temps et du contrôle.",
        discover: "Voir notre méthode →",
        analyse: "Demander un audit",
        years: "Années dans l’hospitalité",
        support: "Assistance voyageurs",
        starsLabel: "Cinq étoiles",
        experiences: "Des expériences qui marquent",
        logoAlt: "Logo Hot Host Hospitality composé de trois lettres H",
        heroPropertyAlts: [
          "Terrasse d’une maison moderne avec piscine et ciel dégagé",
          "Maison contemporaine éclairée au crépuscule parmi les arbres",
          "Villa blanche contemporaine avec piscine extérieure"
        ],
        badge: "Premium avec personnalité",
        auditPromptLead: "Découvrez le potentiel de votre bien grâce à une analyse claire des tarifs, de l’occupation et des opportunités. Offerte et sans engagement.",
        auditPromptButton: "Je veux mon audit offert →",
        auditPromptClose: "Fermer cette offre",
        servicesEyebrow: "Stratégie, opérations et hospitalité",
        servicesTitle: "Tout ce qui fait vraiment fonctionner un hébergement.",
        servicesLead: "Hot Host pourrait vendre de la glace à un Esquimau ou du lait à une vache. Nous préférons mieux vendre votre hébergement : avec stratégie, service et sans poudre aux yeux.",
        allServices: "Voir tous les services",
        comparison: {
          eyebrow: "Comparaison des revenus",
          title: "Trois façons de rentabiliser le même bien.",
          lead: "Sélectionnez votre modèle de location actuel et indiquez uniquement le prix pratiqué. Les autres hypothèses sont calculées automatiquement.",
          inputsTitle: "Votre situation actuelle",
          modelLabel: "Comment louez-vous actuellement le bien ?",
          currencyLabel: "Sélectionner la devise",
          assumptionsTitle: "Hypothèses calculées",
          traditionalRent: "Loyer traditionnel mensuel",
          touristRate: "Tarif touristique moyen par nuit",
          touristOccupancy: "Occupation du marché / d’une autre agence",
          hotHostRate: "Prix par nuit avec Hot Host",
          hotHostOccupancy: "Occupation avec Hot Host",
          metric: "Indicateur",
          traditional: "Location traditionnelle",
          tourist: "Autre agence touristique",
          hotHost: "Gestion Hot Host",
          monthlyIncome: "Revenu brut mensuel",
          annualIncome: "Revenu brut annuel",
          occupiedNights: "Nuits occupées par an",
          averageRate: "Prix moyen par nuit",
          ownerTime: "Implication du propriétaire",
          pricing: "Stratégie tarifaire",
          guestCare: "Assistance voyageur",
          traditionalNights: "100 % d’occupation",
          traditionalRate: "Loyer fixe",
          ownerTimeHigh: "Faible",
          ownerTimeLow: "Très faible",
          pricingFixed: "Fixe",
          pricingManual: "Gérée par l’agence",
          pricingDynamic: "Dynamique et supervisée",
          guestCareTenant: "Relation avec le locataire",
          guestCareOwner: "Coordonnée par l’agence",
          guestCareHotHost: "Coordonnée par Hot Host",
          resultLabel: "Revenu brut annuel estimé avec Hot Host",
          versusTraditional: "par rapport à la location traditionnelle",
          versusTourist: "par rapport à une autre agence touristique",
          disclaimer: "Estimation indicative des revenus bruts fondée sur les informations saisies et des critères de performance internes. Montants avant impôts, financement, entretien, plateformes et honoraires, sans garantie de résultat."
        },
        methodEyebrow: "Méthode Hot Host",
        methodTitle: ["La magie existe.", "Mais elle suit une checklist."],
        methodLead: "Nous combinons empathie, technologie, opérations et mesure. Le voyageur ressent la proximité ; vous gardez le contrôle et recevez beaucoup moins de messages tard le soir.",
        steps: [
          ["Diagnostic", "Nous analysons le bien, son positionnement et son potentiel.", "Nous étudions l’annonce, la demande, la concurrence, les coûts et le parcours actuel pour distinguer les intuitions des véritables opportunités."],
          ["Conception", "Nous définissons les opérations, les standards et l’expérience.", "Nous transformons le diagnostic en standards, messages, prix, automatisations et en une expérience cohérente avec l’identité de l’hébergement."],
          ["Exécution", "Nous coordonnons voyageurs, calendrier et prestataires.", "Nous déployons le plan et relions calendrier, voyageurs et prestataires afin que chaque tâche ait un responsable et un moment précis."],
          ["Optimisation", "Nous mesurons, apprenons et améliorons en continu.", "Nous lisons les résultats, repérons les écarts et ajustons la stratégie. Ce qui fonctionne est renforcé ; le reste est corrigé sans drame."]
        ]
      },
      servicesPage: {
        eyebrow: "Une solution pour chaque casse-tête opérationnel",
        title: ["Une gestion qui se remarque.", "Des problèmes que l’on ne remarque plus."],
        lead: "Nous gérons la stratégie, les opérations et chaque détail du séjour. Publier une annonce et croiser les doigts ne compte pas comme Revenue Management.",
        processLabel: "Du premier clic à la prochaine réservation",
        stages: [
          ["Attirer", "Nous plaçons votre hébergement devant le bon voyageur.", "Nous combinons photographie, contenu et positionnement pour émerger là où votre public cherche, compare et commence à imaginer son séjour."],
          ["Convertir", "Nous transformons l’intérêt en réservations rentables.", "Nous affinons la proposition de valeur, les prix, les canaux et la réservation directe pour réduire les frictions et protéger la marge."],
          ["Prendre soin", "Nous soignons chaque moment du séjour.", "Nous concevons des communications et standards opérationnels qui anticipent les besoins, coordonnent l’équipe et rendent tout fluide."],
          ["Fidéliser", "Nous faisons travailler chaque excellent séjour dans la durée.", "Nous activons réputation, recommandation et récurrence pour transformer les voyageurs satisfaits en avis, ambassadeurs et futures réservations."]
        ]
      },
      about: {
        breadcrumb: "À propos de Hot Host",
        eyebrow: "L’hospitalité apprise sur le terrain",
        title: ["Une hospitalité authentique.", "Des standards ★★★★★"],
        lead: "Hot Host apporte la discipline d’un grand hôtel à chaque hébergement, avec la proximité de ceux qui savent que derrière chaque réservation se trouve un voyageur et derrière chaque bien, un propriétaire qui aimerait dormir tranquille.",
        prose: [
          {
            title: "Une expérience de terrain",
            paragraphs: [
              "Plus de dix ans passés entre réception, opérations, service, relation client et animation touristique nous ont appris une chose essentielle : un excellent séjour ne doit rien au hasard. Il se conçoit, se coordonne et se soigne.",
              "Notre parcours associe de grands resorts des Caraïbes à l’hôtellerie urbaine et balnéaire en Méditerranée. C’est une expérience entre les Amériques et l’Europe, alliant exigence opérationnelle et dimension humaine pour transformer une réservation en souvenir."
            ]
          },
          {
            title: "La méthode Hot Host",
            paragraphs: [
              "Nous traitons chaque bien comme un petit hôtel doté de sa propre identité. Nous partons d’un diagnostic, concevons les standards, documentons les processus et mesurons les résultats. L’improvisation est réservée à l’humour avec le voyageur, jamais aux opérations."
            ]
          }
        ],
        credentialsTitle: "Une expérience qui se transforme en résultats",
        credentialsLead: "Une vraie expertise hôtelière, une vision commerciale et une exécution rigoureuse au quotidien : la combinaison qui transforme le potentiel en réservations, réputation et sérénité.",
        credentials: [
          ["Plus de dix ans dans l’hospitalité", "Une expérience concrète en réception, service, coordination et gestion des incidents. Pas de théorie abstraite, mais un jugement éprouvé face aux voyageurs."],
          ["Une vision à 360° de l’hébergement", "Nous relions expérience voyageur, coûts, opérations, réputation et rentabilité afin que chaque décision crée de la valeur."],
          ["Une expertise internationale, une attention de proximité", "Un parcours entre Caraïbes et Méditerranée, Europe et Amériques, adapté au marché, à l’environnement et à la personnalité de chaque bien."],
          ["Neuf langues, un même niveau de clarté", "Nous limitons les malentendus et accompagnons propriétaires et voyageurs avant, pendant et après chaque séjour."],
          ["Booking, Airbnb et revenue avec intention", "Nous optimisons annonces, tarifs et calendrier pour gagner par la valeur et la rentabilité, jamais seulement par le prix le plus bas."],
          ["Conversion et réputation qui se renforcent", "Nous alignons photographie, texte de l’annonce, expérience et avis afin que chaque excellent séjour facilite la réservation suivante."],
          ["Des opérations documentées, un contrôle visible", "Protocoles, responsabilités claires, prestataires coordonnés et suivi des incidents offrent de la visibilité sans rendre au propriétaire la charge quotidienne."],
          ["Des décisions guidées par les données, une hospitalité humaine", "Nous suivons tarifs, occupation, conversion et retours, puis agissons avec discernement et empathie. La technologie soutient l’attention, sans jamais la remplacer."]
        ],
        credentialsCta: "Je veux connaître le potentiel de mon bien →",
        credentialsExpand: "Voir toutes les références",
        credentialsCollapse: "Masquer les références",
        pillarsEyebrow: "Nos piliers",
        pillarsTitle: "Premium, mais humain.",
        pillars: [
          ["♟", "Professionnalisme", "Des protocoles clairs, une communication transparente et une responsabilité réelle.", "Nous transformons la gestion quotidienne en un système ordonné : responsabilités définies, incidents documentés, prestataires coordonnés et décisions compréhensibles pour le propriétaire. Le professionnalisme ne consiste pas à paraître sérieux, mais à tenir ses engagements, informer à temps et répondre de chaque résultat."],
          ["♡", "Hospitalité", "Écouter, anticiper et résoudre avec empathie.", "Nous concevons chaque contact en pensant à la personne qui arrive fatiguée, célèbre un moment important ou a besoin d’aide sans savoir comment la demander. Nous anticipons les questions, personnalisons l’accueil et gérons les imprévus avec chaleur pour que le voyageur se sente considéré, jamais traité à la chaîne."],
          ["↗", "Rentabilité", "Chaque décision opérationnelle doit créer une valeur durable.", "Nous analysons prix, occupation, coûts, conversion et réputation comme les éléments d’une même équation. Nous cherchons à améliorer le bénéfice sans dégrader le bien ni l’expérience : mieux vendre, supprimer les pertes opérationnelles et investir uniquement là où le retour peut être mesuré."],
          ["✦", "Personnalité", "Des expériences pétillantes, sans transformer l’hébergement en cirque.", "Nous révélons ce qui rend chaque bien reconnaissable et le traduisons en une expérience cohérente : ton, détails, recommandations et petites attentions mémorables. La personnalité différencie l’hébergement sans artifices et attire les voyageurs qui lui correspondent vraiment."]
        ],
        voicesEyebrow: "Nos clients en parlent",
        voicesTitle: "Une tranquillité qui se ressent.",
        voicesLead: "Des propriétaires qui ont retrouvé du temps, du contrôle et de la confiance dans leur hébergement.",
        quotes: [
          ["Depuis que Hot Host gère mes biens, je ne vis plus les yeux rivés sur mon téléphone. Le taux d’occupation a progressé, les voyageurs arrivent mieux informés et la propriété redevient un investissement, pas un second métier.", "Laura Benítez", "Propriétaire de deux appartements · Séville"],
          ["Ils ont soigné des détails auxquels nous n’avions jamais pensé : le ton des messages, l’arrivée et les recommandations du quartier. Nos derniers avis les citent précisément, et la différence se ressent à chaque séjour.", "Daniel Ferrer", "Hôte d’une location saisonnière · Valence"],
          ["Un incident est survenu un samedi soir et ils l’ont résolu avant qu’il n’affecte le voyageur. Nous avons reçu des informations claires, une solution et un vrai suivi. C’est exactement la sérénité que nous recherchions.", "Marta Rossi", "Propriétaire internationale · Madrid / Milan"]
        ]
      },
      contact: {
        breadcrumb: "Contact",
        eyebrow: "Dites-nous ce que vous avez entre les mains",
        title: "Votre hébergement peut faire mieux. Commençons par le comprendre.",
        heading: "Parlons de votre bien",
        lead: "Donnez-nous l’essentiel et nous réaliserons un premier audit clair et précis de rentabilité et d’exploitation. Inutile de prévoir une présentation de 40 diapositives ; des informations sincères nous suffisent.",
        serviceAreaLabel: "Zone de service",
        serviceArea: "Gestion sur place selon le projet · Coordination internationale à distance",
        emailLabel: "E-mail",
        hoursLabel: "Horaires commerciaux",
        hours: "Du lundi au vendredi · 09:00–19:00"
      },
      form: {
        title: "Demandez un premier audit de rentabilité et d’exploitation",
        selectOption: "Sélectionnez une option",
        selectCountry: "Sélectionnez un pays ou territoire",
        contactRole: "Lien avec le bien",
        roles: [["owner", "Propriétaire"], ["representative", "Représentant(e)"], ["agency", "Agence ou agence immobilière"]],
        fullName: "Nom complet",
        email: "Adresse e-mail",
        phoneCountry: "Pays ou territoire du téléphone",
        phone: "Numéro de téléphone national",
        phoneHelp: "Saisissez uniquement le numéro national, sans indicatif international ni signe +.",
        phonePlaceholder: "Ex. : 600 000 000",
        addressGroup: "Adresse exacte du bien",
        streetAddress: "Rue et numéro",
        streetHelp: "Indiquez le type et le nom de la voie, le numéro et, le cas échéant, le bâtiment ou l’appartement.",
        streetPlaceholder: "Ex. : 12 rue Feria, appartement 2B",
        postalCode: "Code postal",
        postalHelp: "Saisissez le code postal exact du bien.",
        postalPlaceholder: "Ex. : 41003",
        city: "Ville ou commune",
        cityPlaceholder: "Ex. : Nice",
        propertyCountry: "Pays ou territoire du bien",
        propertyType: "Type de bien",
        propertyTypes: [["villa", "Villa"], ["studio", "Studio"], ["flat", "Appartement"], ["house", "Maison"], ["chalet", "Chalet"], ["other", "Autre"]],
        otherType: "Précisez le type de bien",
        otherTypePlaceholder: "Décrivez brièvement le bien",
        bedrooms: "Nombre de chambres",
        bathrooms: "Nombre de salles de bains",
        floor: "Numéro de l’étage",
        floorHelp: "Saisissez 0 pour le rez-de-chaussée.",
        totalFloors: "Nombre total d’étages du bien",
        touristRental: "Est-il actuellement proposé en location touristique ?",
        rentalOptions: [["yes", "Oui"], ["no", "Non"]],
        listingUrl: "URL de l’annonce touristique",
        listingPlaceholder: "De préférence Airbnb ou Booking",
        photosUrl: "Lien vers les photographies",
        photosPlaceholder: "Lien Google Drive ou Dropbox",
        photosHelp: "Vérifiez que le lien permet de consulter les photographies.",
        photosUpload: "Importer des photographies du bien",
        photosUploadHelp: "Jusqu’à 10 images JPG, PNG ou WebP de moins de 20 Mo chacune. Elles seront optimisées avant l’envoi.",
        photosSelected: "Photographies sélectionnées : {count}",
        removePhoto: "Supprimer {name}",
        photosRequired: "Importez au moins une photographie ou ajoutez un lien permettant de les consulter.",
        photosTooMany: "Vous pouvez importer jusqu’à 10 photographies.",
        photosTooLarge: "Chaque photographie doit peser moins de 20 Mo.",
        photosInvalidType: "Seules les images JPG, PNG ou WebP sont acceptées.",
        driveUploading: "Optimisation et envoi des photographies vers Google Drive…",
        driveUploaded: "{count} photographies envoyées vers Drive pour traitement.",
        driveNotConfigured: "L’importation directe n’est pas disponible actuellement. Ajoutez un lien partagé vers les photographies.",
        driveUploadError: "Impossible d’envoyer les photographies vers Google Drive. Réessayez ou ajoutez un lien.",
        comments: "Commentaires complémentaires",
        optional: "(facultatif)",
        commentsPlaceholder: "Objectifs, questions ou toute autre information utile...",
        privacyConsent: "J’autorise Hot Host Hospitality à utiliser les informations et photographies transmises uniquement pour évaluer cette demande.",
        privacyNote: "N’incluez ni personnes ni documents sensibles. Vous pouvez demander la suppression des informations à direccion@hhosthospitality.com.",
        actionsLabel: "Choisissez comment envoyer la demande",
        sendEmail: "Envoyer par e-mail →",
        sendWhatsapp: "Envoyer par WhatsApp ↗",
        validation: {
          required: "Ce champ est obligatoire.",
          email: "Saisissez une adresse e-mail valide.",
          url: "Saisissez une URL complète et valide, par exemple https://…",
          phoneNoPrefix: "N’indiquez ni le signe + ni l’indicatif international dans ce champ.",
          phone: "Saisissez un numéro national valide comprenant entre 4 et 15 chiffres.",
          number: "Saisissez un nombre valide.",
          minimum: "La valeur doit être supérieure ou égale à 1.",
          floorMinimum: "Le numéro de l’étage doit être supérieur ou égal à 0.",
          tooShort: "Complétez ce champ avec davantage de détails.",
          generic: "Vérifiez la valeur saisie.",
          review: "Vérifiez les champs indiqués avant d’envoyer votre demande."
        },
        status: {
          emailOpened: "Gmail s’est ouvert avec votre demande prête. Vérifiez-la puis cliquez sur Envoyer.",
          whatsappOpened: "WhatsApp s’est ouvert avec votre demande prête. Vérifiez-la puis cliquez sur Envoyer.",
          blockedBefore: "Le navigateur a bloqué la fenêtre. ",
          blockedEmailLink: "Ouvrir l’e-mail ici",
          blockedWhatsappLink: "Ouvrir WhatsApp ici",
          blockedAfter: "."
        },
        emailBody: {
          subject: "Nouveau bien",
          relationship: "Lien avec le bien",
          name: "Nom",
          email: "Adresse e-mail",
          phone: "Téléphone international",
          address: "Adresse du bien",
          street: "Rue et numéro",
          postalCode: "Code postal",
          city: "Ville ou commune",
          country: "Pays ou territoire",
          propertyType: "Type de bien",
          bedrooms: "Chambres",
          bathrooms: "Salles de bains",
          floor: "Étage",
          totalFloors: "Nombre total d’étages",
          rental: "En location touristique",
          listingUrl: "URL de l’annonce",
          photosUrl: "Photographies",
          photosUploaded: "Référence d’envoi vers Drive",
          consent: "Consentement à l’utilisation des données",
          comments: "Commentaires"
        }
      },
      services: {
        "gestion-integral": {
          title: "Gestion intégrale",
          imageAlt: "Checklist de gestion opérationnelle posée sur un bureau",
          summary: "Votre hébergement géré de bout en bout avec une vision hôtelière, un contrôle opérationnel et une communication transparente.",
          price: ["18 % des revenus de l’hébergement", "Minimum 220 €/mois · Inclut la Guest Experience, le Revenue Management et la coordination opérationnelle à distance"],
          tag: "Contrôle total, sérénité réelle",
          intro: "Nous centralisons les opérations de l’hébergement afin que le propriétaire conserve une visibilité complète sans supporter la gestion quotidienne.",
          benefits: ["Configuration et optimisation des annonces", "Gestion des réservations et du calendrier", "Communication avec les voyageurs avant, pendant et après", "Coordination du nettoyage, de la blanchisserie et de la maintenance", "Suivi opérationnel et rapports au propriétaire"],
          content: [
            { title: "Une opération, un responsable", paragraphs: ["La gestion intégrale relie commercialisation, expérience voyageur et entretien de l’actif. Elle évite que chaque domaine fonctionne en vase clos et permet de décider avec une information complète."] },
            { title: "Ce que nous faisons", paragraphs: ["Nous définissons les standards, coordonnons les prestataires, gérons les communications et supervisons chaque séjour. Nous adaptons le périmètre au bien, de l’accompagnement hybride à la délégation complète."] },
            { title: "Transparence pour le propriétaire", paragraphs: ["Vous recevez des informations claires sur les réservations, les incidents et les opportunités. Il ne s’agit pas de vous éloigner de votre bien, mais de ne plus courir après de petites tâches toute la journée."] }
          ]
        },
        "guest-experience": {
          title: "Guest Experience",
          imageAlt: "Salon lumineux préparé pour accueillir les voyageurs",
          summary: "Nous concevons des séjours mémorables, répondons aux besoins et transformons les petits détails en excellents avis.",
          price: ["129 €/mois + 12 €/réservation", "Frais de mise en place uniques : 190 €"],
          tag: "Des séjours qui restent en mémoire",
          intro: "Nous concevons chaque point de contact pour que le voyageur se sente attendu, accompagné et sincèrement bienvenu.",
          benefits: ["Communication personnalisée", "Guide local et recommandations ciblées", "Attentions de bienvenue identitaires", "Suivi pendant le séjour", "Gestion empathique des incidents"],
          content: [
            { title: "De l’hébergement à l’expérience", paragraphs: ["Un lit propre est le minimum. La différence apparaît lorsque l’information arrive avant d’être demandée, que les recommandations correspondent au voyageur et que chaque imprévu est résolu avec humanité."] },
            { feature: true, title: "🦆 Opération Caneton", paragraphs: ["Lorsqu’une famille voyage avec des enfants, nous pouvons transformer l’arrivée en petite mission : un canard en plastique l’accueille avec un indice menant vers un guide d’activités familiales, une attention locale ou le coin préféré de la maison. C’est simple, photogénique et mémorable.", { strong: "Le principe :", text: " un geste inattendu, peu coûteux et cohérent avec le profil du voyageur peut susciter conversation, émotion et meilleurs souvenirs. Le caneton est l’accroche ; derrière se trouvent segmentation, timing et expertise hôtelière." }] },
            { title: "Une personnalisation évolutive", paragraphs: ["Tous les voyageurs ne veulent pas la même chose. Nous concevons des variantes pour les couples, familles, voyageurs d’affaires et longs séjours tout en maintenant des processus efficaces."] },
            { title: "Une réputation qui se construit", paragraphs: ["Le meilleur avis commence bien avant le check-out. Nous surveillons les signes de satisfaction et agissons pendant le séjour, lorsqu’il est encore possible d’améliorer l’expérience."] }
          ]
        },
        "revenue-management": {
          title: "Revenue Management",
          imageAlt: "Tableau de bord analytique affichant des graphiques de performance",
          summary: "Tarification dynamique fondée sur la demande, les événements, la concurrence, l’occupation et de vrais objectifs de rentabilité.",
          price: ["179 €/mois", "Par bien"],
          tag: "Le bon prix au bon moment",
          intro: "Nous transformons les données du marché en stratégie tarifaire dynamique, cohérente avec votre positionnement et vos objectifs.",
          benefits: ["Analyse de la concurrence", "Demande et calendrier des événements", "Règles d’anticipation et de durée", "Contrôle de l’occupation et de l’ADR", "Révision périodique de la stratégie"],
          content: [
            { title: "Bien plus que monter et baisser les prix", paragraphs: ["Le Revenue Management consiste à vendre chaque nuit avec le meilleur équilibre possible entre prix, occupation et marge. Nous analysons le marché, les événements, la saisonnalité, le rythme des réservations et le comportement de l’annonce."] },
            { title: "Une stratégie contextualisée", paragraphs: ["Un salon, un week-end prolongé ou une annulation de dernière minute exigent des réponses différentes. Nous configurons les règles et les suivons pour éviter aussi bien les nuits vides que les ventes trop précoces sous leur potentiel."] },
            { title: "Des décisions explicables", paragraphs: ["L’automatisation aide, mais ne remplace pas le discernement. Chaque ajustement doit répondre à une hypothèse de demande et à un objectif mesurable."] }
          ]
        },
        "check-in-operaciones": {
          title: "Check-in & opérations",
          imageAlt: "Remise de clés à l’entrée d’un logement",
          summary: "Des arrivées fluides, des départs maîtrisés, une coordination quotidienne et une réponse rapide aux incidents.",
          price: ["À partir de 39 €/séjour", "Check-in en personne à partir de 59 € · Supplément de nuit de 20 €"],
          tag: "Arrivées fluides, contrôle quotidien",
          intro: "Nous coordonnons les moments critiques de chaque séjour et maintenons les opérations en mouvement, même face à un imprévu.",
          benefits: ["Instructions avant l’arrivée", "Check-in en personne ou autonome", "Vérification de l’identité et du règlement", "Coordination du check-out", "Gestion et escalade des incidents"],
          content: [
            { title: "La première impression n’a pas de bouton de réinitialisation", paragraphs: ["Nous préparons le voyageur avant son arrivée, confirmons les informations critiques et réduisons les frictions. En présentiel, nous ajoutons accueil et orientation ; en autonomie, nous créons des instructions impossibles à mal interpréter."] },
            { title: "Des opérations connectées", paragraphs: ["Check-out, nettoyage, maintenance et prochaine arrivée suivent la même horloge. Nous coordonnons les créneaux, priorités et confirmations pour éviter les surprises."] },
            { title: "Des incidents traités selon un protocole", paragraphs: ["Nous classons chaque cas selon son urgence et son impact, communiquons clairement et conservons une trace. Résoudre vite compte ; apprendre pour éviter que cela se reproduise compte encore davantage."] }
          ]
        },
        "limpieza-lavanderia": {
          title: "Nettoyage & blanchisserie",
          imageAlt: "Chambre impeccable avec un lit parfaitement préparé et une lumière chaleureuse",
          summary: "Des standards vérifiables, une coordination professionnelle et une présentation impeccable entre les réservations.",
          price: ["À partir de 65 €/service", "+18 € par chambre supplémentaire · Blanchisserie facturée séparément"],
          tag: "Une qualité visible dans chaque détail",
          intro: "Nous coordonnons une préparation constante de l’hébergement, avec des standards clairs et des contrôles avant chaque arrivée.",
          benefits: ["Checklist à chaque séjour", "Coordination des équipes", "Gestion du linge et des amenities", "Contrôle visuel de la qualité", "Signalement des dommages ou manquants"],
          content: [
            { title: "Le nettoyage ne se limite pas au nettoyage", paragraphs: ["Il touche à la présentation, à la conservation et à la confiance. Nous définissons un standard propre au bien, incluant les points de contact fréquents, la mise en place, le réassort et la vérification finale."] },
            { title: "Contrôle qualité", paragraphs: ["Une checklist limite les oublis ; les preuves visuelles et le suivi permettent de corriger les écarts. Nous détectons aussi les dommages, consommations anormales et besoins de maintenance."] },
            { title: "Une expérience cohérente", paragraphs: ["Le voyageur doit retrouver le même niveau de préparation chaque jour de l’année. Nous coordonnons délais et stocks pour que la qualité ne dépende jamais de l’improvisation."] }
          ]
        },
        "fotografia-profesional": {
          title: "Photographie professionnelle",
          imageAlt: "Appareil photo professionnel sur trépied photographiant un intérieur",
          galleryEyebrow: "Une image vend avant même la première phrase",
          galleryTitle: "Des propriétés qui attirent le regard.",
          galleryLead: "Une bonne séance ne montre pas des pièces isolées ; elle raconte la promesse d’un séjour complet.",
          galleryAlts: [
            "Villa blanche contemporaine avec piscine extérieure",
            "Salon lumineux au mobilier chaleureux et végétalisé",
            "Salle à manger contemporaine ouverte sur la cuisine",
            "Chambre moderne avec bois et abondante lumière naturelle",
            "Salle de bains contemporaine en marbre avec meuble en bois"
          ],
          summary: "Une mise en scène visuelle qui renforce l’attrait de l’annonce et communique la valeur du bien.",
          price: ["295 €/séance photo", "Biens de grande taille à partir de 390 €"],
          tag: "Rendez la valeur visible",
          intro: "Nous planifions l’image de l’hébergement pour attirer le bon voyageur, renforcer la perception de qualité et améliorer la conversion.",
          benefits: ["Direction visuelle et stylisme", "Sélection des cadrages", "Séquence narrative de l’annonce", "Optimisation pour les plateformes", "Recommandations de mise en scène"],
          content: [
            { title: "La réservation commence par le regard", paragraphs: ["Les photographies ne montrent pas seulement des mètres carrés : elles communiquent la lumière, l’espace, l’atmosphère et le type de séjour. Nous préparons le lieu et construisons une séquence qui répond aux questions du voyageur."] },
            { title: "Vendre sans travestir", paragraphs: ["Nous recherchons une présentation attrayante et fidèle. Une attente exagérée peut obtenir un clic, mais aussi provoquer un mauvais avis. La confiance convertit mieux à long terme."] },
            { title: "Un contenu utile sur plusieurs canaux", paragraphs: ["Nous organisons des versions adaptées aux plateformes, au site web et à la communication commerciale afin de valoriser chaque séance."] }
          ]
        },
        "auditoria-rentabilidad": {
          title: "Audit de rentabilité",
          imageAlt: "Graphiques, calculatrice et crayon sur une table d’analyse",
          summary: "Un diagnostic commercial et opérationnel pour détecter les fuites, les opportunités et les priorités d’amélioration.",
          price: ["249 €", "Offert jusqu’au 30 septembre"],
          tag: "Comprendre d’abord, améliorer ensuite",
          intro: "Nous analysons l’hébergement comme produit, opération et actif afin d’identifier les actions au plus fort impact potentiel.",
          benefits: ["Diagnostic de l’annonce", "Benchmark concurrentiel", "Révision des coûts et processus", "Carte des opportunités", "Plan priorisé sur 30 à 90 jours"],
          content: [
            { title: "Une radiographie de l’activité", paragraphs: ["Nous examinons positionnement, prix, calendrier, contenu, réputation, expérience et coûts opérationnels. L’objectif est de distinguer les symptômes des causes."] },
            { title: "Prioriser avec discernement", paragraphs: ["Toutes les améliorations ne méritent pas le même investissement. Nous classons les opportunités selon leur impact, effort, urgence et dépendances pour créer une feuille de route exécutable."] },
            { title: "Des recommandations applicables", paragraphs: ["Nous livrons des observations concrètes, des responsables suggérés et des indicateurs de suivi. Un audit sans mise en œuvre n’est qu’un joli document."] }
          ]
        }
      }
    },

    it: {
      meta: {
        titles: {
          home: "Hot Host Hospitality · Gestione premium di alloggi",
          services: "Servizi · Hot Host Hospitality",
          about: "Chi è Hot Host · Hot Host Hospitality",
          contact: "Contatti · Hot Host Hospitality"
        },
        descriptions: {
          home: "Gestione premium per alloggi turistici più redditizi, memorabili e facili da gestire.",
          services: "Servizi di gestione, operazioni, guest experience e redditività per alloggi turistici.",
          about: "Oltre dieci anni di esperienza alberghiera tra le Americhe e l’Europa al servizio del tuo alloggio.",
          contact: "Scopri il potenziale del tuo alloggio con un primo audit di redditività e operatività di Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Home", services: "Servizi", about: "Chi è Hot Host", contact: "Contatti" },
        assess: "Audit della proprietà",
        openMenu: "Apri menu",
        closeMenu: "Chiudi menu",
        languageLabel: "Seleziona la lingua del sito",
        footerText: "Facciamo funzionare meglio gli alloggi, aumentiamo la redditività e li rendiamo davvero memorabili.",
        explore: "Esplora",
        services: "Servizi",
        location: "Europa e Americhe · Ospitalità senza confini"
      },
      common: {
        home: "Home",
        services: "Servizi",
        exploreService: "Scopri il servizio →",
        viewDetail: "Vedi dettagli →",
        includes: "Include",
        requestAssessment: "Richiedi un audit",
        priceDisclaimer: "I prezzi non includono imposte né costi di terzi.",
        ctaEyebrow: "Parliamone con chiarezza, senza impegno",
        ctaTitle: "Il tuo alloggio potrebbe rendere di più e darti molto meno lavoro?",
        ctaButton: "Richiedi un audit →",
        offerKicker: "Offerta a tempo limitato",
        offerTitle: "Audit di redditività gratuito",
        offerDeadline: "Gratis fino al 30 settembre",
        navOffer: "Gratis fino al 30 settembre",
        carouselRole: "carosello",
        previousImage: "Immagine precedente",
        nextImage: "Immagine successiva",
        imageCounter: "Immagine {current} di {total}",
        previousServices: "Servizi precedenti",
        nextServices: "Servizi successivi",
        serviceCounter: "Servizi {first}–{last} di {total}",
        viewStep: "Vedi fase",
        closeStep: "Chiudi spiegazione",
        processImageAlt: "Immagine della fase {step}",
        enableDarkMode: "Attiva modalità scura",
        enableLightMode: "Attiva modalità chiara"
      },
      home: {
        eyebrow: "Gestione alberghiera per alloggi che vogliono crescere",
        title: "Più redditività.",
        titleAccent: "Soggiorni migliori. Meno pensieri.",
        lead: "Hot Host trasforma gli alloggi con potenziale in operazioni più redditizie, memorabili e facili da gestire, ovunque si trovino. Noi curiamo i dettagli; tu recuperi tempo e controllo.",
        discover: "Scopri come lavoriamo →",
        analyse: "Richiedi un audit",
        years: "Anni nell’ospitalità",
        support: "Assistenza agli ospiti",
        starsLabel: "Cinque stelle",
        experiences: "Esperienze che lasciano il segno",
        logoAlt: "Logo Hot Host Hospitality con tre lettere H",
        heroPropertyAlts: [
          "Terrazza di una casa moderna con piscina e cielo aperto",
          "Casa contemporanea illuminata al tramonto tra gli alberi",
          "Villa bianca contemporanea con piscina esterna"
        ],
        badge: "Premium con personalità",
        auditPromptLead: "Scopri quanto potrebbe rendere la tua proprietà con un’analisi chiara di prezzi, occupazione e opportunità. Gratuita e senza impegno.",
        auditPromptButton: "Voglio il mio audit gratuito →",
        auditPromptClose: "Chiudi questa offerta",
        servicesEyebrow: "Strategia, operazioni e ospitalità",
        servicesTitle: "Tutto ciò che fa funzionare davvero un alloggio.",
        servicesLead: "Hot Host saprebbe vendere ghiaccio a un eschimese o latte a una mucca. Preferiamo vendere meglio il tuo alloggio: con strategia, servizio e zero fumo.",
        allServices: "Vedi tutti i servizi",
        comparison: {
          eyebrow: "Confronto dei ricavi",
          title: "Tre modi per far rendere la stessa proprietà.",
          lead: "Seleziona il modello di affitto attuale e inserisci solo il prezzo applicato. Le altre ipotesi vengono calcolate automaticamente.",
          inputsTitle: "La tua situazione attuale",
          modelLabel: "Come affitti attualmente la proprietà?",
          currencyLabel: "Seleziona valuta",
          assumptionsTitle: "Ipotesi calcolate",
          traditionalRent: "Affitto tradizionale mensile",
          touristRate: "Tariffa turistica media per notte",
          touristOccupancy: "Occupazione di mercato / altra agenzia",
          hotHostRate: "Prezzo per notte con Hot Host",
          hotHostOccupancy: "Occupazione con Hot Host",
          metric: "Indicatore",
          traditional: "Affitto tradizionale",
          tourist: "Altra agenzia turistica",
          hotHost: "Gestione Hot Host",
          monthlyIncome: "Ricavo lordo mensile",
          annualIncome: "Ricavo lordo annuale",
          occupiedNights: "Notti occupate all’anno",
          averageRate: "Prezzo medio per notte",
          ownerTime: "Impegno del proprietario",
          pricing: "Strategia tariffaria",
          guestCare: "Assistenza agli ospiti",
          traditionalNights: "Occupazione al 100%",
          traditionalRate: "Canone fisso",
          ownerTimeHigh: "Basso",
          ownerTimeLow: "Molto basso",
          pricingFixed: "Fissa",
          pricingManual: "Gestita dall’agenzia",
          pricingDynamic: "Dinamica e supervisionata",
          guestCareTenant: "Rapporto con l’inquilino",
          guestCareOwner: "Coordinata dall’agenzia",
          guestCareHotHost: "Coordinata da Hot Host",
          resultLabel: "Ricavo lordo annuale stimato con Hot Host",
          versusTraditional: "rispetto all’affitto tradizionale",
          versusTourist: "rispetto a un’altra agenzia turistica",
          disclaimer: "Stima indicativa dei ricavi lordi basata sui dati inseriti e su criteri interni di rendimento. Valori prima di imposte, finanziamento, manutenzione, piattaforme e commissioni, senza garanzia di risultati."
        },
        methodEyebrow: "Metodo Hot Host",
        methodTitle: ["La magia esiste.", "Ma richiede una checklist."],
        methodLead: "Uniamo empatia, tecnologia, operazioni e misurazione. L’ospite percepisce vicinanza; tu mantieni il controllo e ricevi molti meno messaggi a tarda notte.",
        steps: [
          ["Diagnosi", "Analizziamo proprietà, posizionamento e potenziale.", "Esaminiamo annuncio, domanda, concorrenza, costi ed esperienza attuale per distinguere le intuizioni dalle opportunità concrete."],
          ["Progettazione", "Definiamo operazioni, standard ed esperienza.", "Trasformiamo la diagnosi in standard, messaggi, prezzi, automazioni e un’esperienza coerente con l’identità dell’alloggio."],
          ["Esecuzione", "Coordiniamo ospiti, calendario e fornitori.", "Mettiamo in moto il piano e colleghiamo calendario, ospiti e fornitori affinché ogni attività abbia un responsabile e un momento preciso."],
          ["Ottimizzazione", "Misuriamo, impariamo e miglioriamo continuamente.", "Leggiamo i risultati, individuiamo gli scostamenti e adattiamo la strategia. Potenziamo ciò che funziona e correggiamo il resto senza drammi."]
        ]
      },
      servicesPage: {
        eyebrow: "Una soluzione per ogni grattacapo operativo",
        title: ["Una gestione che si nota.", "Problemi che smetti di notare."],
        lead: "Curiamo strategia, operazioni e ogni dettaglio del soggiorno. Pubblicare un annuncio e incrociare le dita non è Revenue Management.",
        processLabel: "Dal primo clic alla prossima prenotazione",
        stages: [
          ["Attrarre", "Portiamo il tuo alloggio davanti all’ospite giusto.", "Uniamo fotografia, contenuti e posizionamento per emergere dove il tuo pubblico cerca, confronta e comincia a immaginare il soggiorno."],
          ["Convertire", "Trasformiamo l’interesse in prenotazioni redditizie.", "Affiniamo proposta di valore, prezzi, canali e prenotazione diretta per ridurre gli ostacoli e proteggere il margine."],
          ["Prendersi cura", "Curiamo ogni momento del soggiorno.", "Progettiamo comunicazioni e standard operativi che anticipano le esigenze, coordinano il team e fanno sembrare tutto semplice."],
          ["Fidelizzare", "Facciamo sì che un ottimo soggiorno continui a lavorare.", "Attiviamo reputazione, passaparola e ritorno per trasformare ospiti soddisfatti in recensioni, ambasciatori e future prenotazioni."]
        ]
      },
      about: {
        breadcrumb: "Chi è Hot Host",
        eyebrow: "Ospitalità imparata sul campo",
        title: ["Ospitalità autentica.", "Standard ★★★★★"],
        lead: "Hot Host porta la disciplina di un grande hotel in ogni alloggio, con la vicinanza di chi sa che dietro ogni prenotazione c’è un ospite e dietro ogni proprietà, qualcuno che vorrebbe dormire tranquillo.",
        prose: [
          {
            title: "Esperienza in prima linea",
            paragraphs: [
              "Oltre dieci anni tra reception, operazioni, servizio, assistenza clienti e animazione turistica ci hanno insegnato una cosa essenziale: un soggiorno eccellente non nasce per caso. Si progetta, si coordina e si cura.",
              "Il nostro percorso unisce resort caraibici ad alto volume e ospitalità urbana e costiera nel Mediterraneo. È esperienza tra le Americhe e l’Europa, dove rigore operativo e attenzione umana trasformano una prenotazione in un ricordo."
            ]
          },
          {
            title: "Il metodo Hot Host",
            paragraphs: [
              "Trattiamo ogni proprietà come un piccolo hotel con una propria identità. Partiamo dalla diagnosi, definiamo gli standard, documentiamo i processi e misuriamo i risultati. L’improvvisazione resta per una battuta con l’ospite, non per le operazioni."
            ]
          }
        ],
        credentialsTitle: "Esperienza che diventa risultato",
        credentialsLead: "Esperienza alberghiera reale, visione commerciale ed esecuzione quotidiana: la combinazione che trasforma il potenziale in prenotazioni, reputazione e serenità per il proprietario.",
        credentials: [
          ["Oltre dieci anni nell’ospitalità", "Esperienza concreta tra reception, servizio, coordinamento e gestione degli imprevisti. Non teoria da manuale, ma giudizio maturato con ospiti reali."],
          ["Una visione a 360° dell’alloggio", "Colleghiamo esperienza, costi, operazioni, reputazione e redditività affinché ogni decisione generi valore."],
          ["Criterio internazionale, attenzione vicina", "Un percorso tra Caraibi e Mediterraneo, Europa e Americhe, adattato al mercato, al territorio e alla personalità di ogni proprietà."],
          ["Nove lingue, una comunicazione impeccabile", "Riduciamo i malintesi e accompagniamo proprietari e ospiti con messaggi chiari prima, durante e dopo ogni soggiorno."],
          ["Booking, Airbnb e revenue con strategia", "Ottimizziamo annunci, prezzi e calendario per competere sul valore e sulla redditività, non soltanto sul prezzo più basso."],
          ["Conversione e reputazione che si alimentano", "Allineiamo fotografia, testo dell’annuncio, esperienza e recensioni affinché ogni soggiorno eccellente aiuti a conquistare la prenotazione successiva."],
          ["Operazioni documentate, controllo visibile", "Protocolli, responsabilità chiare, fornitori coordinati e monitoraggio degli imprevisti danno visibilità al proprietario senza restituirgli il lavoro quotidiano."],
          ["Decisioni basate sui dati, ospitalità fatta di persone", "Monitoriamo prezzi, occupazione, conversione e feedback, poi agiamo con criterio ed empatia. La tecnologia sostiene la cura, non la sostituisce."]
        ],
        credentialsCta: "Voglio sapere quanto può rendere la mia proprietà →",
        credentialsExpand: "Vedi tutte le credenziali",
        credentialsCollapse: "Nascondi le credenziali",
        pillarsEyebrow: "I nostri pilastri",
        pillarsTitle: "Premium, ma umano.",
        pillars: [
          ["♟", "Professionalità", "Protocolli chiari, comunicazione trasparente e responsabilità reale.", "Trasformiamo la gestione quotidiana in un sistema ordinato: responsabilità definite, problemi documentati, fornitori coordinati e decisioni comprensibili per il proprietario. Essere professionali non significa sembrare seri, ma rispettare gli impegni, informare in tempo e rispondere di ogni risultato."],
          ["♡", "Ospitalità", "Ascoltare, anticipare e risolvere con empatia.", "Progettiamo ogni contatto pensando a chi arriva stanco, festeggia un momento importante o ha bisogno di aiuto senza sapere come chiederlo. Anticipiamo le domande, personalizziamo l’accoglienza e gestiamo gli imprevisti con calore affinché l’ospite si senta seguito, mai trattato come un numero."],
          ["↗", "Redditività", "Ogni decisione operativa deve creare valore sostenibile.", "Analizziamo prezzo, occupazione, costi, conversione e reputazione come parti della stessa equazione. Vogliamo migliorare il profitto senza indebolire l’immobile o l’esperienza: vendere meglio, eliminare le inefficienze e investire solo dove il ritorno è misurabile."],
          ["✦", "Personalità", "Esperienze vivaci, senza trasformare l’alloggio in un circo.", "Individuiamo ciò che rende riconoscibile ogni proprietà e lo trasformiamo in un’esperienza coerente attraverso tono, dettagli, consigli e piccoli gesti memorabili. La personalità differenzia l’alloggio senza artifici e attira gli ospiti davvero adatti."]
        ],
        voicesEyebrow: "Lo raccontano i nostri clienti",
        voicesTitle: "La tranquillità si vede.",
        voicesLead: "Proprietari che hanno ritrovato tempo, controllo e fiducia nel proprio alloggio.",
        quotes: [
          ["Da quando Hot Host si occupa della gestione, non vivo più con il telefono in mano. L’occupazione è migliorata, gli ospiti arrivano più informati e la proprietà è tornata a essere un investimento, non un secondo lavoro.", "Laura Benítez", "Proprietaria di due appartamenti · Siviglia"],
          ["Hanno curato dettagli a cui non avevamo mai pensato: il tono dei messaggi, l’arrivo e i consigli sul quartiere. Le ultime recensioni citano proprio questi aspetti e la differenza si nota in ogni soggiorno.", "Daniel Ferrer", "Host di una casa vacanze · Valencia"],
          ["Abbiamo avuto un problema di sabato sera e lo hanno risolto prima che coinvolgesse l’ospite. Abbiamo ricevuto informazioni chiare, una soluzione e un vero follow-up. Era esattamente la serenità che cercavamo.", "Marta Rossi", "Proprietaria internazionale · Madrid / Milano"]
        ]
      },
      contact: {
        breadcrumb: "Contatti",
        eyebrow: "Raccontaci cosa hai tra le mani",
        title: "Il tuo alloggio può dare di più. Iniziamo a capirlo.",
        heading: "Parliamo della tua proprietà",
        lead: "Raccontaci l’essenziale e svolgeremo un primo audit chiaro e concreto di redditività e operatività. Non servono 40 slide; bastano informazioni sincere.",
        serviceAreaLabel: "Area di servizio",
        serviceArea: "Gestione in loco in base al progetto · Coordinamento internazionale da remoto",
        emailLabel: "E-mail",
        hoursLabel: "Orario commerciale",
        hours: "Da lunedì a venerdì · 09:00–19:00"
      },
      form: {
        title: "Richiedi un primo audit di redditività e operatività",
        selectOption: "Seleziona un’opzione",
        selectCountry: "Seleziona un paese o territorio",
        contactRole: "Rapporto con la proprietà",
        roles: [["owner", "Proprietario/a"], ["representative", "Rappresentante"], ["agency", "Agenzia o immobiliare"]],
        fullName: "Nome completo",
        email: "Indirizzo e-mail",
        phoneCountry: "Paese o territorio del telefono",
        phone: "Numero di telefono nazionale",
        phoneHelp: "Inserisci solo il numero nazionale, senza prefisso internazionale né segno +.",
        phonePlaceholder: "Es.: 600 000 000",
        addressGroup: "Indirizzo esatto della proprietà",
        streetAddress: "Via e numero civico",
        streetHelp: "Includi tipo e nome della via, numero e, se necessario, edificio o interno.",
        streetPlaceholder: "Es.: Calle Feria 12, interno 2B",
        postalCode: "Codice postale",
        postalHelp: "Inserisci il codice postale esatto della proprietà.",
        postalPlaceholder: "Es.: 41003",
        city: "Città o comune",
        cityPlaceholder: "Es.: Roma",
        propertyCountry: "Paese o territorio della proprietà",
        propertyType: "Tipo di proprietà",
        propertyTypes: [["villa", "Villa"], ["studio", "Monolocale"], ["flat", "Appartamento"], ["house", "Casa"], ["chalet", "Chalet"], ["other", "Altro"]],
        otherType: "Specifica il tipo di proprietà",
        otherTypePlaceholder: "Descrivi brevemente la proprietà",
        bedrooms: "Numero di camere",
        bathrooms: "Numero di bagni",
        floor: "Numero del piano",
        floorHelp: "Inserisci 0 per il piano terra.",
        totalFloors: "Numero totale di piani della proprietà",
        touristRental: "È attualmente destinata ad affitto turistico?",
        rentalOptions: [["yes", "Sì"], ["no", "No"]],
        listingUrl: "URL dell’annuncio turistico",
        listingPlaceholder: "Preferibilmente Airbnb o Booking",
        photosUrl: "Link alle fotografie",
        photosPlaceholder: "Link Google Drive o Dropbox",
        photosHelp: "Assicurati che il link consenta di visualizzare le fotografie.",
        photosUpload: "Carica le fotografie della proprietà",
        photosUploadHelp: "Fino a 10 immagini JPG, PNG o WebP, ciascuna inferiore a 20 MB. Verranno ottimizzate prima dell’invio.",
        photosSelected: "Fotografie selezionate: {count}",
        removePhoto: "Rimuovi {name}",
        photosRequired: "Carica almeno una fotografia oppure aggiungi un link da cui possiamo visualizzarle.",
        photosTooMany: "Puoi caricare un massimo di 10 fotografie.",
        photosTooLarge: "Ogni fotografia deve pesare meno di 20 MB.",
        photosInvalidType: "Sono ammesse solo immagini JPG, PNG o WebP.",
        driveUploading: "Ottimizzazione e invio delle fotografie a Google Drive…",
        driveUploaded: "{count} fotografie inviate a Drive per l’elaborazione.",
        driveNotConfigured: "Il caricamento diretto non è disponibile al momento. Aggiungi un link condiviso alle fotografie.",
        driveUploadError: "Non è stato possibile inviare le fotografie a Google Drive. Riprova o aggiungi un link.",
        comments: "Commenti aggiuntivi",
        optional: "(facoltativo)",
        commentsPlaceholder: "Obiettivi, domande o qualsiasi altra informazione utile...",
        privacyConsent: "Autorizzo Hot Host Hospitality a utilizzare i dati e le fotografie inviati esclusivamente per valutare questa richiesta.",
        privacyNote: "Non includere persone o documenti sensibili. Puoi richiedere la cancellazione scrivendo a direccion@hhosthospitality.com.",
        actionsLabel: "Scegli come inviare la richiesta",
        sendEmail: "Invia via e-mail →",
        sendWhatsapp: "Invia via WhatsApp ↗",
        validation: {
          required: "Questo campo è obbligatorio.",
          email: "Inserisci un indirizzo e-mail valido.",
          url: "Inserisci un URL completo e valido, ad esempio https://…",
          phoneNoPrefix: "Non inserire il segno + né il prefisso internazionale in questo campo.",
          phone: "Inserisci un numero nazionale valido composto da 4 a 15 cifre.",
          number: "Inserisci un numero valido.",
          minimum: "Il valore deve essere almeno 1.",
          floorMinimum: "Il numero del piano deve essere almeno 0.",
          tooShort: "Completa questo campo con maggiori dettagli.",
          generic: "Controlla il valore inserito.",
          review: "Controlla i campi indicati prima di inviare la richiesta."
        },
        status: {
          emailOpened: "Gmail si è aperto con la richiesta pronta. Controllala e premi Invia.",
          whatsappOpened: "WhatsApp si è aperto con la richiesta pronta. Controllala e premi Invia.",
          blockedBefore: "Il browser ha bloccato la finestra. ",
          blockedEmailLink: "Apri qui l’e-mail",
          blockedWhatsappLink: "Apri WhatsApp qui",
          blockedAfter: "."
        },
        emailBody: {
          subject: "Nuova proprietà",
          relationship: "Rapporto",
          name: "Nome",
          email: "Indirizzo e-mail",
          phone: "Telefono internazionale",
          address: "Indirizzo della proprietà",
          street: "Via e numero civico",
          postalCode: "Codice postale",
          city: "Città o comune",
          country: "Paese o territorio",
          propertyType: "Tipo di proprietà",
          bedrooms: "Camere",
          bathrooms: "Bagni",
          floor: "Piano",
          totalFloors: "Numero totale di piani",
          rental: "In affitto turistico",
          listingUrl: "URL dell’annuncio",
          photosUrl: "Fotografie",
          photosUploaded: "Riferimento dell’invio a Drive",
          consent: "Consenso all’uso dei dati",
          comments: "Commenti"
        }
      },
      services: {
        "gestion-integral": {
          title: "Gestione completa",
          imageAlt: "Checklist di gestione operativa disposta su una scrivania",
          summary: "Il tuo alloggio gestito dall’inizio alla fine con visione alberghiera, controllo operativo e comunicazione trasparente.",
          price: ["18% dei ricavi dell’alloggio", "Minimo 220 €/mese · Include Guest Experience, Revenue Management e coordinamento operativo da remoto"],
          tag: "Controllo totale, vera serenità",
          intro: "Centralizziamo le operazioni dell’alloggio affinché il proprietario mantenga piena visibilità senza il peso della gestione quotidiana.",
          benefits: ["Configurazione e ottimizzazione degli annunci", "Gestione di prenotazioni e calendario", "Comunicazione con gli ospiti prima, durante e dopo", "Coordinamento di pulizia, lavanderia e manutenzione", "Monitoraggio operativo e report al proprietario"],
          content: [
            { title: "Un’operazione, un responsabile", paragraphs: ["La gestione completa collega commercializzazione, esperienza dell’ospite e manutenzione del bene. Evita che ogni area lavori in isolamento e consente decisioni basate su informazioni complete."] },
            { title: "Cosa facciamo", paragraphs: ["Definiamo gli standard, coordiniamo i fornitori, gestiamo le comunicazioni e supervisioniamo ogni soggiorno. Adattiamo l’ambito alla proprietà, dal supporto ibrido alla delega completa."] },
            { title: "Trasparenza per il proprietario", paragraphs: ["Riceverai informazioni chiare su prenotazioni, problemi e opportunità. Non significa allontanarti dalla tua proprietà, ma smettere di rincorrere piccole attività tutto il giorno."] }
          ]
        },
        "guest-experience": {
          title: "Guest Experience",
          imageAlt: "Soggiorno luminoso preparato per accogliere gli ospiti",
          summary: "Progettiamo soggiorni memorabili, rispondiamo alle esigenze e trasformiamo piccoli dettagli in ottime recensioni.",
          price: ["129 €/mese + 12 €/prenotazione", "Configurazione una tantum: 190 €"],
          tag: "Soggiorni che diventano ricordi",
          intro: "Progettiamo ogni punto di contatto affinché l’ospite si senta atteso, seguito e sinceramente benvenuto.",
          benefits: ["Comunicazione personalizzata", "Guida locale e consigli mirati", "Dettagli di benvenuto con identità", "Assistenza durante il soggiorno", "Gestione empatica dei problemi"],
          content: [
            { title: "Da alloggio a esperienza", paragraphs: ["Un letto pulito è il minimo. La differenza emerge quando le informazioni arrivano prima di essere richieste, i consigli si adattano al viaggiatore e ogni imprevisto viene risolto con umanità."] },
            { feature: true, title: "🦆 Operazione Paperella", paragraphs: ["Se una famiglia viaggia con bambini, possiamo trasformare l’arrivo in una piccola missione: una paperella di gomma accoglie tutti con un indizio verso una guida di attività per bambini, un omaggio locale o l’angolo preferito della casa. È semplice, fotografabile e memorabile.", { strong: "Il principio:", text: " un gesto inatteso, economico e coerente con il profilo dell’ospite può generare conversazione, emozione e ricordi migliori. La paperella è il gancio; dietro ci sono segmentazione, timing e criterio alberghiero." }] },
            { title: "Personalizzazione scalabile", paragraphs: ["Non tutti gli ospiti desiderano la stessa cosa. Progettiamo varianti per coppie, famiglie, viaggiatori d’affari e soggiorni lunghi, mantenendo processi efficienti."] },
            { title: "Una reputazione costruita con cura", paragraphs: ["La recensione migliore comincia molto prima del check-out. Monitoriamo i segnali di soddisfazione e interveniamo durante il soggiorno, quando è ancora possibile migliorare l’esperienza."] }
          ]
        },
        "revenue-management": {
          title: "Revenue Management",
          imageAlt: "Dashboard analitica con grafici delle prestazioni",
          summary: "Prezzi dinamici basati su domanda, eventi, concorrenza, occupazione e obiettivi reali di redditività.",
          price: ["179 €/mese", "Per proprietà"],
          tag: "Il prezzo giusto al momento giusto",
          intro: "Trasformiamo i dati di mercato in una strategia tariffaria dinamica, coerente con il tuo posizionamento e i tuoi obiettivi.",
          benefits: ["Analisi della concorrenza", "Domanda e calendario degli eventi", "Regole per anticipo e durata", "Controllo di occupazione e ADR", "Revisione periodica della strategia"],
          content: [
            { title: "Molto più che alzare e abbassare i prezzi", paragraphs: ["Revenue Management significa vendere ogni notte con la migliore combinazione possibile di prezzo, occupazione e margine. Analizziamo mercato, eventi, stagionalità, ritmo delle prenotazioni e andamento dell’annuncio."] },
            { title: "Strategia con contesto", paragraphs: ["Una fiera, un ponte festivo o una cancellazione dell’ultimo minuto richiedono risposte diverse. Configuriamo regole e monitoraggio per evitare sia notti vuote sia vendite premature al di sotto del potenziale."] },
            { title: "Decisioni spiegabili", paragraphs: ["L’automazione aiuta, ma non sostituisce il criterio. Ogni adeguamento deve rispondere a un’ipotesi di domanda e a un obiettivo misurabile."] }
          ]
        },
        "check-in-operaciones": {
          title: "Check-in & operazioni",
          imageAlt: "Consegna delle chiavi all’ingresso di un’abitazione",
          summary: "Arrivi fluidi, partenze controllate, coordinamento quotidiano e risposta rapida ai problemi.",
          price: ["Da 39 €/soggiorno", "Check-in in presenza da 59 € · Supplemento notturno di 20 €"],
          tag: "Arrivi fluidi, controllo quotidiano",
          intro: "Coordiniamo i momenti critici di ogni soggiorno e manteniamo le operazioni in movimento, anche quando si presenta un imprevisto.",
          benefits: ["Istruzioni prima dell’arrivo", "Check-in in presenza o autonomo", "Verifica dell’identità e delle regole", "Coordinamento del check-out", "Gestione ed escalation dei problemi"],
          content: [
            { title: "La prima impressione non ha un pulsante di reset", paragraphs: ["Prepariamo l’ospite prima dell’arrivo, confermiamo le informazioni critiche e riduciamo gli attriti. In presenza aggiungiamo accoglienza e orientamento; in autonomia creiamo istruzioni impossibili da fraintendere."] },
            { title: "Operazioni connesse", paragraphs: ["Check-out, pulizia, manutenzione e arrivo successivo seguono lo stesso orologio. Coordiniamo finestre temporali, priorità e conferme per evitare sorprese."] },
            { title: "Problemi gestiti con un protocollo", paragraphs: ["Classifichiamo ogni caso per urgenza e impatto, comunichiamo con chiarezza e lasciamo traccia. Risolvere rapidamente è importante; imparare a evitarne la ripetizione lo è ancora di più."] }
          ]
        },
        "limpieza-lavanderia": {
          title: "Pulizia & lavanderia",
          imageAlt: "Camera immacolata con letto perfettamente preparato e luce calda",
          summary: "Standard verificabili, coordinamento professionale e presentazione impeccabile tra una prenotazione e l’altra.",
          price: ["Da 65 €/servizio", "+18 € per camera aggiuntiva · Lavanderia a parte"],
          tag: "Qualità visibile in ogni dettaglio",
          intro: "Coordiniamo una preparazione costante dell’alloggio, con standard chiari e controlli prima di ogni arrivo.",
          benefits: ["Checklist per ogni soggiorno", "Coordinamento dei team", "Gestione di biancheria e amenities", "Controllo visivo della qualità", "Segnalazione di danni o mancanze"],
          content: [
            { title: "Pulire non significa solo pulire", paragraphs: ["Significa presentazione, conservazione e fiducia. Definiamo uno standard specifico per la proprietà, includendo punti ad alto contatto, allestimento, rifornimento e verifica finale."] },
            { title: "Controllo qualità", paragraphs: ["Una checklist riduce le dimenticanze; le prove visive e il monitoraggio consentono di correggere gli scostamenti. Rileviamo anche danni, consumi anomali e necessità di manutenzione."] },
            { title: "Un’esperienza coerente", paragraphs: ["L’ospite deve trovare lo stesso livello di preparazione ogni giorno dell’anno. Coordiniamo tempi e scorte affinché la qualità non dipenda dall’improvvisazione."] }
          ]
        },
        "fotografia-profesional": {
          title: "Fotografia professionale",
          imageAlt: "Fotocamera professionale su treppiede mentre fotografa un interno",
          galleryEyebrow: "Un’immagine vende prima ancora di leggere una parola",
          galleryTitle: "Proprietà che conquistano lo sguardo.",
          galleryLead: "Un buon servizio fotografico non mostra stanze isolate: racconta la promessa di un intero soggiorno.",
          galleryAlts: [
            "Villa bianca contemporanea con piscina esterna",
            "Soggiorno luminoso con arredi caldi e piante",
            "Sala da pranzo contemporanea aperta sulla cucina",
            "Camera moderna con legno e abbondante luce naturale",
            "Bagno contemporaneo in marmo con mobile in legno"
          ],
          summary: "Una presentazione visiva che aumenta l’attrattiva dell’annuncio e comunica il valore della proprietà.",
          price: ["295 €/sessione fotografica", "Proprietà di grandi dimensioni da 390 €"],
          tag: "Rendi visibile il valore",
          intro: "Pianifichiamo l’immagine dell’alloggio per attirare l’ospite giusto, aumentare la qualità percepita e migliorare la conversione.",
          benefits: ["Direzione visiva e styling", "Selezione delle inquadrature", "Sequenza narrativa dell’annuncio", "Ottimizzazione per le piattaforme", "Consigli per l’allestimento"],
          content: [
            { title: "La prenotazione comincia dagli occhi", paragraphs: ["Le fotografie non mostrano soltanto metri quadrati: comunicano luce, ampiezza, atmosfera e tipo di soggiorno. Prepariamo lo spazio e costruiamo una sequenza che risponde alle domande del viaggiatore."] },
            { title: "Vendere senza mascherare", paragraphs: ["Cerchiamo una presentazione attraente e fedele. Aspettative gonfiate possono ottenere un clic, ma anche una recensione negativa. La fiducia converte meglio nel lungo periodo."] },
            { title: "Contenuti utili su più canali", paragraphs: ["Organizziamo versioni adatte a portali, sito web e comunicazione commerciale per sfruttare al massimo ogni sessione."] }
          ]
        },
        "auditoria-rentabilidad": {
          title: "Audit di redditività",
          imageAlt: "Grafici, calcolatrice e matita su un tavolo di analisi",
          summary: "Una diagnosi commerciale e operativa per individuare perdite, opportunità e priorità di miglioramento.",
          price: ["249 €", "Gratis fino al 30 settembre"],
          tag: "Prima capire, poi migliorare",
          intro: "Analizziamo l’alloggio come prodotto, operazione e bene per individuare le azioni con il maggiore impatto potenziale.",
          benefits: ["Diagnosi dell’annuncio", "Benchmark competitivo", "Revisione di costi e processi", "Mappa delle opportunità", "Piano prioritario di 30–90 giorni"],
          content: [
            { title: "Una radiografia dell’attività", paragraphs: ["Esaminiamo posizionamento, prezzi, calendario, contenuti, reputazione, esperienza e costi operativi. L’obiettivo è distinguere i sintomi dalle cause."] },
            { title: "Stabilire le priorità con criterio", paragraphs: ["Non ogni miglioramento merita lo stesso investimento. Classifichiamo le opportunità per impatto, impegno, urgenza e dipendenze, creando una roadmap eseguibile."] },
            { title: "Raccomandazioni attuabili", paragraphs: ["Forniamo osservazioni concrete, responsabili suggeriti e metriche di monitoraggio. Un audit senza implementazione è soltanto un bel documento."] }
          ]
        }
      }
    }
  };

  Object.keys(window.HOT_HOST_LOCALES || {}).forEach(function (language) {
    if (SUPPORTED_LANGUAGES.includes(language)) locales[language] = window.HOT_HOST_LOCALES[language];
  });

  const HTML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  let activeLanguage = getInitialLanguage();
  let activeTheme = getInitialTheme();
  let revealObserver = null;
  let scrollHandler = null;
  let serviceCarouselResizeHandler = null;
  let languageMenuOutsideHandler = null;
  let credentialsEscapeHandler = null;
  let auditPromptScrollHandler = null;
  let auditPromptSeenInMemory = false;
  let earningsCalculatorState = Object.assign({}, DEFAULT_EARNINGS);
  let selectedPropertyPhotos = [];

  applyTheme(activeTheme);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return HTML_ENTITIES[character];
    });
  }

  function normalizeLanguage(value) {
    const language = String(value || "").toLowerCase().split("-")[0];
    return SUPPORTED_LANGUAGES.includes(language) ? language : "";
  }

  function getInitialLanguage() {
    try {
      const savedLanguage = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
      if (savedLanguage) return savedLanguage;
    } catch (error) {
      // Storage can be unavailable in privacy modes; browser language remains a safe fallback.
    }

    const browserLanguage = navigator.language || (
      Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages[0] : ""
    );
    return normalizeLanguage(browserLanguage) || "es";
  }

  function saveLanguage(language) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      // The selector still works for the current page when storage is blocked.
    }
  }

  function getInitialTheme() {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    } catch (error) {
      // System preference remains available when storage is blocked.
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    activeTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.style.colorScheme = activeTheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = activeTheme === "dark" ? "#12100d" : "#fffdf9";
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // The selected theme still applies for the current page when storage is blocked.
    }
  }

  function renderLines(lines) {
    return lines.map(escapeHtml).join("<br>");
  }

  function renderStarredLines(lines, starsLabel) {
    const stars = `<span class="about-stars" aria-label="${escapeHtml(starsLabel)}">★★★★★</span>`;
    return lines.map(function (line) {
      return String(line).split("★★★★★").map(escapeHtml).join(stars);
    }).join("<br>");
  }

  function renderOptions(options, placeholder) {
    const initialOption = placeholder === undefined
      ? ""
      : `<option value="">${escapeHtml(placeholder)}</option>`;
    return initialOption + options.map(function (option) {
      return `<option value="${escapeHtml(option[0])}">${escapeHtml(option[1])}</option>`;
    }).join("");
  }

  function getServices(locale) {
    return SERVICE_DEFINITIONS.map(function (definition) {
      return Object.assign({}, definition, locale.services[definition.key]);
    });
  }

  function renderServicePrice(service, locale, detailed) {
    if (!Array.isArray(service.price) || service.price.length < 2) return "";
    const isAuditPromotion = service.key === "auditoria-rentabilidad" && isAuditOfferActive();
    const promotionClass = isAuditPromotion ? " service-price-promo" : "";
    const detailClass = detailed ? " service-price-detail" : "";
    const priceDetail = service.key === "auditoria-rentabilidad" && !isAuditPromotion
      ? ""
      : `<span>${escapeHtml(service.price[1])}</span>`;
    const disclaimer = detailed
      ? `<small class="service-price-disclaimer">${escapeHtml(locale.common.priceDisclaimer)}</small>`
      : "";
    return `<div class="service-price${promotionClass}${detailClass}"><strong>${escapeHtml(service.price[0])}</strong>${priceDetail}${disclaimer}</div>`;
  }

  function renderHeroVisual(home) {
    const photos = HERO_IMAGES.map(function (photo, index) {
      const isPrimary = index === 0;
      const width = isPrimary ? 900 : 720;
      const height = isPrimary ? 1200 : 600;
      return `<figure class="hero-property-photo hero-property-photo-${index + 1}"><img src="${imageUrl(photo.id, width, height)}" alt="${escapeHtml(home.heroPropertyAlts[index])}" width="${width}" height="${height}" ${isPrimary ? "fetchpriority=\"high\"" : "loading=\"eager\""} decoding="async" style="object-position:${escapeHtml(photo.position)}"></figure>`;
    }).join("");

    return `<div class="hero-brand-visual"><div class="hero-property-collage">${photos}</div><div class="hero-logo-seal"><img class="hero-logo" src="assets/logo-mark.svg" alt="${escapeHtml(home.logoAlt)}" width="180" height="180"></div><div class="visual-badge">${escapeHtml(home.badge)}</div></div>`;
  }

  function renderServiceCard(service, locale) {
    return `<article class="card service-card reveal" data-service-slide aria-label="${escapeHtml(service.title)}"><div class="service-card-media"><img src="${imageUrl(service.imageId, 800, 520)}" alt="${escapeHtml(service.imageAlt)}" width="800" height="520" loading="lazy" decoding="async" style="object-position:${escapeHtml(service.imagePosition)}"><div class="icon" aria-hidden="true">${escapeHtml(service.icon)}</div></div><div class="service-card-body"><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.summary)}</p>${renderServicePrice(service, locale, false)}<a class="card-link" href="${escapeHtml(service.path)}">${escapeHtml(locale.common.exploreService)}</a></div></article>`;
  }

  function renderServiceRow(service, locale) {
    const photo = imageUrl(service.imageId, 900, 520);
    return `<article class="service-row service-row-visual reveal" style="--service-photo:url('${escapeHtml(photo)}')"><div class="service-row-media"><img src="${escapeHtml(photo)}" alt="${escapeHtml(service.imageAlt)}" width="520" height="360" loading="lazy" decoding="async" style="object-position:${escapeHtml(service.imagePosition)}"><div class="icon" aria-hidden="true">${escapeHtml(service.icon)}</div></div><div class="service-row-copy"><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.summary)}</p>${renderServicePrice(service, locale, false)}</div><a class="btn ghost" href="${escapeHtml(service.path)}">${escapeHtml(locale.common.viewDetail)}</a></article>`;
  }

  function renderCounter(template, current, total) {
    return template.replace("{current}", String(current)).replace("{total}", String(total));
  }

  function renderServiceCounter(template, first, last, total) {
    return template
      .replace("{first}", String(first))
      .replace("{last}", String(last))
      .replace("{total}", String(total));
  }

  function renderProcessStep(step, photo, index, variant, eyebrow, locale) {
    const number = String(index + 1).padStart(2, "0");
    const imageAlt = locale.common.processImageAlt.replace("{step}", step[0]);
    const actionLabel = variant === "pillar"
      ? locale.common.viewDetail.replace(/\s*→\s*$/, "")
      : locale.common.viewStep;
    return `<button class="process-card ${variant}-step" type="button" aria-haspopup="dialog" aria-controls="processDialog" data-process-trigger data-process-number="${number}" data-process-eyebrow="${escapeHtml(eyebrow)}" data-process-title="${escapeHtml(step[0])}" data-process-summary="${escapeHtml(step[1])}" data-process-detail="${escapeHtml(step[2])}" data-process-photo="${escapeHtml(photo.id)}" data-process-position="${escapeHtml(photo.position)}" data-process-image-alt="${escapeHtml(imageAlt)}"><span class="process-card-media" aria-hidden="true"><img src="${imageUrl(photo.id, 720, 520)}" alt="" width="720" height="520" loading="lazy" decoding="async" style="object-position:${escapeHtml(photo.position)}"></span><span class="process-card-content"><span class="process-card-kicker"><span class="process-card-number">${number}</span><span class="process-card-action">${escapeHtml(actionLabel)} <span aria-hidden="true">↗</span></span></span><strong class="process-card-title">${escapeHtml(step[0])}</strong><span class="process-card-summary">${escapeHtml(step[1])}</span></span></button>`;
  }

  function renderProcessDialog(locale) {
    return `<dialog class="process-dialog" id="processDialog" aria-labelledby="processDialogTitle"><div class="process-dialog-shell"><button class="process-dialog-close" type="button" data-process-close aria-label="${escapeHtml(locale.common.closeStep)}"><span aria-hidden="true">×</span></button><figure class="process-dialog-media"><img data-process-dialog-image alt="" width="1400" height="1000" decoding="async" hidden></figure><div class="process-dialog-content"><div class="process-dialog-meta"><span class="eyebrow" data-process-dialog-eyebrow></span><span class="process-dialog-number" data-process-dialog-number></span></div><h2 id="processDialogTitle" data-process-dialog-title></h2><p class="process-dialog-summary" data-process-dialog-summary></p><p class="process-dialog-detail" data-process-dialog-detail></p></div></div></dialog>`;
  }

  function renderServiceGallery(definition, service, locale) {
    if (!definition.gallery || !definition.gallery.length) return "";
    const total = definition.gallery.length;
    const slides = definition.gallery.map(function (photo, index) {
      return `<figure class="property-slide" data-slide aria-hidden="${index === 0 ? "false" : "true"}"><img src="${imageUrl(photo.id, 1200, 900)}" alt="${escapeHtml(service.galleryAlts[index])}" width="1200" height="900" loading="lazy" decoding="async" style="object-position:${escapeHtml(photo.position)}"><figcaption>${escapeHtml(service.galleryAlts[index])}</figcaption></figure>`;
    }).join("");

    return `<section class="section service-gallery-section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(service.galleryEyebrow)}</div><h2>${escapeHtml(service.galleryTitle)}</h2></div><p>${escapeHtml(service.galleryLead)}</p></div><div class="property-carousel" data-carousel role="region" aria-roledescription="${escapeHtml(locale.common.carouselRole)}" aria-label="${escapeHtml(service.galleryTitle)}" tabindex="0"><div class="carousel-viewport"><div class="carousel-track">${slides}</div></div><div class="carousel-controls"><button class="carousel-button" type="button" data-carousel-previous aria-label="${escapeHtml(locale.common.previousImage)}">←</button><span class="carousel-status" data-carousel-status aria-live="polite">${escapeHtml(renderCounter(locale.common.imageCounter, 1, total))}</span><button class="carousel-button" type="button" data-carousel-next aria-label="${escapeHtml(locale.common.nextImage)}">→</button></div></div></div></section>`;
  }

  function renderCta(locale) {
    const offer = isAuditOfferActive()
      ? `<div class="cta-offer"><span>${escapeHtml(locale.common.offerKicker)}</span><strong>${escapeHtml(locale.common.offerTitle)}</strong><small>${escapeHtml(locale.common.offerDeadline)}</small></div>`
      : "";
    return `<section class="section"><div class="wrap"><div class="cta"><div class="cta-copy">${offer}<div class="eyebrow">${escapeHtml(locale.common.ctaEyebrow)}</div><h2>${escapeHtml(locale.common.ctaTitle)}</h2></div><a class="btn primary" style="background:#e7c46a;color:#171717;border-color:#e7c46a" href="contacto.html">${escapeHtml(locale.common.ctaButton)}</a></div></div></section>`;
  }

  function renderEarningsComparison(locale) {
    const comparison = locale.home.comparison;
    const values = earningsCalculatorState;
    return `<section class="section earnings-section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(comparison.eyebrow)}</div><h2>${escapeHtml(comparison.title)}</h2></div><p>${escapeHtml(comparison.lead)}</p></div><div class="earnings-layout" data-earnings-calculator><aside class="earnings-inputs" aria-labelledby="earningsInputsTitle"><h3 id="earningsInputsTitle">${escapeHtml(comparison.inputsTitle)}</h3><label>${escapeHtml(comparison.traditionalRent)}<span class="earnings-control"><input data-earnings-input="traditionalRent" type="number" min="0" max="100000" step="50" value="${escapeHtml(values.traditionalRent)}"><span>€</span></span></label><label>${escapeHtml(comparison.touristRate)}<span class="earnings-control"><input data-earnings-input="touristRate" type="number" min="0" max="2000" step="5" value="${escapeHtml(values.touristRate)}"><span>€</span></span></label><label>${escapeHtml(comparison.touristOccupancy)}<span class="earnings-control"><input data-earnings-input="touristOccupancy" type="number" min="0" max="100" step="1" value="${escapeHtml(values.touristOccupancy)}"><span>%</span></span></label><label>${escapeHtml(comparison.hotHostRate)}<span class="earnings-control"><input data-earnings-input="hotHostRate" type="number" min="0" max="2000" step="5" value="${escapeHtml(values.hotHostRate)}"><span>€</span></span></label><label>${escapeHtml(comparison.hotHostOccupancy)}<span class="earnings-control"><input data-earnings-input="hotHostOccupancy" type="number" min="0" max="100" step="1" value="${escapeHtml(values.hotHostOccupancy)}"><span>%</span></span></label></aside><div class="earnings-comparison"><div class="earnings-table-scroll"><table><thead><tr><th scope="col">${escapeHtml(comparison.metric)}</th><th scope="col">${escapeHtml(comparison.traditional)}</th><th scope="col">${escapeHtml(comparison.tourist)}</th><th scope="col" class="hot-host-column">${escapeHtml(comparison.hotHost)}</th></tr></thead><tbody><tr><th scope="row">${escapeHtml(comparison.monthlyIncome)}</th><td data-earnings-output="traditionalMonthly"></td><td data-earnings-output="touristMonthly"></td><td class="hot-host-column" data-earnings-output="hotHostMonthly"></td></tr><tr><th scope="row">${escapeHtml(comparison.annualIncome)}</th><td data-earnings-output="traditionalAnnual"></td><td data-earnings-output="touristAnnual"></td><td class="hot-host-column" data-earnings-output="hotHostAnnual"></td></tr><tr><th scope="row">${escapeHtml(comparison.occupiedNights)}</th><td>${escapeHtml(comparison.traditionalNights)}</td><td data-earnings-output="touristNights"></td><td class="hot-host-column" data-earnings-output="hotHostNights"></td></tr><tr><th scope="row">${escapeHtml(comparison.averageRate)}</th><td>${escapeHtml(comparison.traditionalRate)}</td><td data-earnings-output="touristRate"></td><td class="hot-host-column" data-earnings-output="hotHostRate"></td></tr><tr><th scope="row">${escapeHtml(comparison.ownerTime)}</th><td>${escapeHtml(comparison.ownerTimeLow)}</td><td>${escapeHtml(comparison.ownerTimeHigh)}</td><td class="hot-host-column">${escapeHtml(comparison.ownerTimeLow)}</td></tr><tr><th scope="row">${escapeHtml(comparison.pricing)}</th><td>${escapeHtml(comparison.pricingFixed)}</td><td>${escapeHtml(comparison.pricingManual)}</td><td class="hot-host-column">${escapeHtml(comparison.pricingDynamic)}</td></tr><tr><th scope="row">${escapeHtml(comparison.guestCare)}</th><td>${escapeHtml(comparison.guestCareTenant)}</td><td>${escapeHtml(comparison.guestCareOwner)}</td><td class="hot-host-column">${escapeHtml(comparison.guestCareHotHost)}</td></tr></tbody></table></div><div class="earnings-result" aria-live="polite"><span>${escapeHtml(comparison.resultLabel)}</span><strong data-earnings-output="hotHostResult"></strong><div><b data-earnings-output="versusTraditional"></b> ${escapeHtml(comparison.versusTraditional)} · <b data-earnings-output="versusTourist"></b> ${escapeHtml(comparison.versusTourist)}</div></div><p class="earnings-disclaimer" id="earningsDisclaimer">${escapeHtml(comparison.disclaimer)}</p></div></div></div></section>`;
  }

  function renderHome(locale, services) {
    const home = locale.home;
    const steps = home.steps.map(function (step, index) {
      return renderProcessStep(step, PROCESS_IMAGES.method[index], index, "method", home.methodEyebrow, locale);
    }).join("");
    const serviceCards = services.map(function (service) { return renderServiceCard(service, locale); }).join("");
    const initialVisibleServices = Math.min(3, services.length);

    return `<main class="home-page">
      <section class="hero hero-luxe"><div class="wrap hero-luxe-grid"><div class="hero-copy"><div class="eyebrow">${escapeHtml(home.eyebrow)}</div><h1>${escapeHtml(home.title)}<span>${escapeHtml(home.titleAccent)}</span></h1><p class="lead">${escapeHtml(home.lead)}</p><div class="hero-actions"><a class="btn primary" href="servicios.html">${escapeHtml(home.discover)}</a><a class="btn ghost" href="contacto.html">${escapeHtml(home.analyse)}</a></div><div class="hero-proof"><div><strong>10+</strong><span>${escapeHtml(home.years)}</span></div><div><strong>24/7</strong><span>${escapeHtml(home.support)}</span></div><div class="hero-rating"><strong aria-label="${escapeHtml(home.starsLabel)}">★★★★★</strong><span>${escapeHtml(home.experiences)}</span></div></div></div>${renderHeroVisual(home)}</div></section>
      <section class="section home-services-section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(home.servicesEyebrow)}</div><h2>${escapeHtml(home.servicesTitle)}</h2></div><p>${escapeHtml(home.servicesLead)}</p></div><div class="services-carousel" data-services-carousel role="region" aria-roledescription="${escapeHtml(locale.common.carouselRole)}" aria-label="${escapeHtml(home.servicesTitle)}" tabindex="0"><div class="services-carousel-viewport" data-services-viewport><div class="services-carousel-track">${serviceCards}</div></div><div class="carousel-controls services-carousel-controls"><button class="carousel-button" type="button" data-services-previous aria-label="${escapeHtml(locale.common.previousServices)}">←</button><span class="carousel-status" data-services-status aria-live="polite">${escapeHtml(renderServiceCounter(locale.common.serviceCounter, 1, initialVisibleServices, services.length))}</span><button class="carousel-button" type="button" data-services-next aria-label="${escapeHtml(locale.common.nextServices)}">→</button></div></div><div style="text-align:center;margin-top:26px"><a class="btn ghost" href="servicios.html">${escapeHtml(home.allServices)}</a></div></div></section>
      ${renderEarningsComparison(locale)}
      <section class="section soft"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(home.methodEyebrow)}</div><h2>${renderLines(home.methodTitle)}</h2></div><p>${escapeHtml(home.methodLead)}</p></div><div class="grid grid-4">${steps}</div></div></section>
      ${renderCta(locale)}
    </main>`;
  }

  function renderServices(locale, services) {
    const page = locale.servicesPage;
    const stages = page.stages.map(function (stage, index) {
      return renderProcessStep(stage, PROCESS_IMAGES.journey[index], index, "journey", page.processLabel, locale);
    }).join("");
    return `<main><section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / ${escapeHtml(locale.common.services)}</div><div class="eyebrow">${escapeHtml(page.eyebrow)}</div><h1>${renderLines(page.title)}</h1><p class="lead">${escapeHtml(page.lead)}</p><div class="infographic">${stages}</div></div></section><section class="section"><div class="wrap">${services.map(function (service) { return renderServiceRow(service, locale); }).join("")}</div></section>${renderCta(locale)}</main>`;
  }

  function renderAbout(locale) {
    const about = locale.about;
    const prose = about.prose.map(function (section) {
      return `<h2>${escapeHtml(section.title)}</h2>${section.paragraphs.map(function (paragraph) { return `<p>${escapeHtml(paragraph)}</p>`; }).join("")}`;
    }).join("");
    const credentials = about.credentials.map(function (credential, index) {
      const number = String(index + 1).padStart(2, "0");
      if (!Array.isArray(credential)) return `<li data-number="${number}"><strong>${escapeHtml(credential)}</strong></li>`;
      return `<li data-number="${number}"><strong>${escapeHtml(credential[0])}</strong><span>${escapeHtml(credential[1])}</span></li>`;
    });
    const primaryCredential = credentials.slice(0, 1).join("");
    const extraCredentials = credentials.slice(1).join("");
    const pillars = about.pillars.map(function (pillar, index) {
      return renderProcessStep(
        [pillar[1], pillar[2], pillar[3]],
        PILLAR_IMAGES[index],
        index,
        "pillar",
        about.pillarsEyebrow,
        locale
      );
    }).join("");
    const quotes = about.quotes.map(function (quote) {
      const initials = quote[1].split(/\s+/).map(function (name) { return name.charAt(0); }).slice(0, 2).join("");
      return `<article class="quote client-quote"><span class="client-quote-mark" aria-hidden="true">“</span><blockquote>${escapeHtml(quote[0])}</blockquote><footer class="client-quote-author"><span class="client-initials" aria-hidden="true">${escapeHtml(initials)}</span><span><strong>${escapeHtml(quote[1])}</strong><small>${escapeHtml(quote[2])}</small></span></footer></article>`;
    }).join("");

    return `<main>
      <section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / ${escapeHtml(about.breadcrumb)}</div><div class="eyebrow">${escapeHtml(about.eyebrow)}</div><h1>${renderStarredLines(about.title, locale.home.starsLabel)}</h1><p class="lead">${escapeHtml(about.lead)}</p></div></section>
      <section class="section"><div class="wrap service-detail"><div class="prose">${prose}</div><aside class="side-panel credentials-panel" aria-labelledby="credentialsTitle"><h3 id="credentialsTitle">${escapeHtml(about.credentialsTitle)}</h3><p class="credentials-lead">${escapeHtml(about.credentialsLead)}</p><ul class="credentials-list credentials-primary-list">${primaryCredential}</ul><button class="credentials-toggle" type="button" data-credentials-toggle data-expand-label="${escapeHtml(about.credentialsExpand)}" data-collapse-label="${escapeHtml(about.credentialsCollapse)}" aria-expanded="false" aria-controls="credentialsDetails"><span data-credentials-toggle-label>${escapeHtml(about.credentialsExpand)}</span><span class="credentials-toggle-icon" aria-hidden="true">⌄</span></button><div class="credentials-hover-preview" aria-hidden="true"><ul class="credentials-list credentials-preview-list">${extraCredentials}</ul></div><div class="credentials-details" id="credentialsDetails" aria-hidden="true"><ul class="credentials-list credentials-extra-list">${extraCredentials}</ul></div><a class="credentials-cta" href="contacto.html">${escapeHtml(about.credentialsCta)}</a></aside></div></section>
      <section class="section soft"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(about.pillarsEyebrow)}</div><h2>${escapeHtml(about.pillarsTitle)}</h2></div></div><div class="grid grid-4 pillars-grid">${pillars}</div></div></section>
      <section class="section testimonials-section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(about.voicesEyebrow)}</div><h2>${escapeHtml(about.voicesTitle)}</h2></div><p>${escapeHtml(about.voicesLead)}</p></div><div class="grid grid-3 testimonials-grid">${quotes}</div></div></section>
      ${renderCta(locale)}
    </main>`;
  }

  function renderContact(locale) {
    const contact = locale.contact;
    const form = locale.form;
    const driveUploadAvailable = Boolean(getDriveUploadEndpoint());
    const offer = isAuditOfferActive()
      ? `<div class="contact-offer"><span>${escapeHtml(locale.common.offerKicker)}</span><strong>${escapeHtml(locale.common.offerTitle)}</strong><small>${escapeHtml(locale.common.offerDeadline)}</small></div>`
      : "";
    const optionalPhotosLink = driveUploadAvailable ? ` <span>${escapeHtml(form.optional)}</span>` : "";
    const directUploadLabel = driveUploadAvailable ? `<label for="propertyPhotos">${escapeHtml(form.photosUpload)}</label>` : "";
    return `<main>
      <section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / ${escapeHtml(contact.breadcrumb)}</div><div class="eyebrow">${escapeHtml(contact.eyebrow)}</div><h1>${escapeHtml(contact.title)}</h1></div></section>
      <section class="section"><div class="wrap contact-grid"><div><h2>${escapeHtml(contact.heading)}</h2><p class="lead">${escapeHtml(contact.lead)}</p><div class="contact-item"><small>${escapeHtml(contact.serviceAreaLabel)}</small><strong>${escapeHtml(contact.serviceArea)}</strong></div><div class="contact-item"><small>${escapeHtml(contact.emailLabel)}</small><strong>${escapeHtml(CONTACT_EMAIL)}</strong></div><div class="contact-item"><small>WhatsApp</small><strong>+34 600 907 716</strong></div><div class="contact-item"><small>${escapeHtml(contact.hoursLabel)}</small><strong>${escapeHtml(contact.hours)}</strong></div></div>
      <form class="contact-form" id="contactForm" novalidate>${offer}<h3>${escapeHtml(form.title)}</h3>
        <div class="field"><label for="contactRole">${escapeHtml(form.contactRole)}</label><select id="contactRole" name="contactRole" required>${renderOptions(form.roles, form.selectOption)}</select></div>
        <div class="field"><label for="name">${escapeHtml(form.fullName)}</label><input id="name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="email">${escapeHtml(form.email)}</label><input id="email" name="email" type="email" required autocomplete="email"></div>
        <div class="field-grid phone-grid"><div class="field"><label for="phoneCountry">${escapeHtml(form.phoneCountry)}</label><select id="phoneCountry" name="phoneCountry" required autocomplete="tel-country-code"></select></div><div class="field"><label for="phone">${escapeHtml(form.phone)}</label><input id="phone" name="phone" type="tel" required autocomplete="tel-national" inputmode="tel" maxlength="24" placeholder="${escapeHtml(form.phonePlaceholder)}" aria-describedby="phoneHelp"><small class="field-help" id="phoneHelp">${escapeHtml(form.phoneHelp)}</small></div></div>
        <div class="field"><strong id="addressGroupLabel">${escapeHtml(form.addressGroup)}</strong></div>
        <div class="address-grid" role="group" aria-labelledby="addressGroupLabel"><div class="field"><label for="streetAddress">${escapeHtml(form.streetAddress)}</label><input id="streetAddress" name="streetAddress" required minlength="3" autocomplete="street-address" placeholder="${escapeHtml(form.streetPlaceholder)}" aria-describedby="streetHelp"><small class="field-help" id="streetHelp">${escapeHtml(form.streetHelp)}</small></div><div class="field"><label for="postalCode">${escapeHtml(form.postalCode)}</label><input id="postalCode" name="postalCode" required minlength="2" maxlength="16" autocomplete="postal-code" placeholder="${escapeHtml(form.postalPlaceholder)}" aria-describedby="postalHelp"><small class="field-help" id="postalHelp">${escapeHtml(form.postalHelp)}</small></div><div class="field"><label for="city">${escapeHtml(form.city)}</label><input id="city" name="city" required minlength="2" autocomplete="address-level2" placeholder="${escapeHtml(form.cityPlaceholder)}"></div><div class="field"><label for="propertyCountry">${escapeHtml(form.propertyCountry)}</label><select id="propertyCountry" name="propertyCountry" required autocomplete="country"><option value="">${escapeHtml(form.selectCountry)}</option></select></div></div>
        <div class="field"><label for="propertyType">${escapeHtml(form.propertyType)}</label><select id="propertyType" name="propertyType" required>${renderOptions(form.propertyTypes, form.selectOption)}</select></div>
        <div class="field" id="otherTypeField" hidden><label for="otherType">${escapeHtml(form.otherType)}</label><input id="otherType" name="otherType" placeholder="${escapeHtml(form.otherTypePlaceholder)}"></div>
        <div class="field" id="bedroomsField"><label for="bedrooms">${escapeHtml(form.bedrooms)}</label><input id="bedrooms" name="bedrooms" type="number" min="1" step="1" required inputmode="numeric"></div>
        <div class="field"><label for="bathrooms">${escapeHtml(form.bathrooms)}</label><input id="bathrooms" name="bathrooms" type="number" min="1" step="1" required inputmode="numeric"></div>
        <div class="field" id="floorField" hidden><label for="floor">${escapeHtml(form.floor)}</label><input id="floor" name="floor" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-describedby="floorHelp"><small class="field-help" id="floorHelp">${escapeHtml(form.floorHelp)}</small></div>
        <div class="field" id="totalFloorsField" hidden><label for="totalFloors">${escapeHtml(form.totalFloors)}</label><input id="totalFloors" name="totalFloors" type="number" min="1" step="1" inputmode="numeric"></div>
        <div class="field"><label for="touristRental">${escapeHtml(form.touristRental)}</label><select id="touristRental" name="touristRental" required>${renderOptions(form.rentalOptions, form.selectOption)}</select></div>
        <div class="field" id="listingUrlField" hidden><label for="listingUrl">${escapeHtml(form.listingUrl)}</label><input id="listingUrl" name="listingUrl" type="url" placeholder="${escapeHtml(form.listingPlaceholder)}"></div>
        <div class="field property-photos-field" id="propertyPhotosField" hidden>${directUploadLabel}<div class="property-photo-dropzone" data-photo-dropzone${driveUploadAvailable ? "" : " hidden"}><input id="propertyPhotos" name="propertyPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-describedby="propertyPhotosHelp propertyPhotosStatus"${driveUploadAvailable ? "" : " disabled"}><span class="property-photo-icon" aria-hidden="true">＋</span><strong>${escapeHtml(form.photosUpload)}</strong><small class="field-help" id="propertyPhotosHelp">${escapeHtml(form.photosUploadHelp)}</small></div><p class="property-photos-status" id="propertyPhotosStatus" aria-live="polite"></p><div class="property-photo-previews" id="propertyPhotoPreviews"></div><label class="property-photos-link-label" for="photosUrl">${escapeHtml(form.photosUrl)}${optionalPhotosLink}</label><input id="photosUrl" name="photosUrl" type="url" placeholder="${escapeHtml(form.photosPlaceholder)}" aria-describedby="photosHelp"><small class="field-help" id="photosHelp">${escapeHtml(form.photosHelp)}</small></div>
        <div class="form-trap" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
        <div class="field"><label for="message">${escapeHtml(form.comments)} <span style="font-weight:400">${escapeHtml(form.optional)}</span></label><textarea id="message" name="message" placeholder="${escapeHtml(form.commentsPlaceholder)}"></textarea></div>
        <div class="field consent-field"><label class="consent-control" for="privacyConsent"><input id="privacyConsent" name="privacyConsent" type="checkbox" required><span>${escapeHtml(form.privacyConsent)}</span></label><small class="field-help">${escapeHtml(form.privacyNote)}</small></div>
        <p class="form-actions-label" id="deliveryLabel">${escapeHtml(form.actionsLabel)}</p><div class="form-actions" role="group" aria-labelledby="deliveryLabel"><button class="btn form-action email-action" type="submit" name="deliveryMethod" value="email">${escapeHtml(form.sendEmail)}</button><button class="btn form-action whatsapp-action" type="submit" name="deliveryMethod" value="whatsapp">${escapeHtml(form.sendWhatsapp)}</button></div><p id="formStatus" aria-live="polite"></p>
      </form></div></section>
    </main>`;
  }

  function renderServiceContent(blocks) {
    return blocks.map(function (block) {
      const paragraphs = block.paragraphs.map(function (paragraph) {
        if (typeof paragraph === "string") return `<p>${escapeHtml(paragraph)}</p>`;
        return `<p><strong>${escapeHtml(paragraph.strong)}</strong>${escapeHtml(paragraph.text)}</p>`;
      }).join("");
      if (block.feature) {
        return `<div class="duck"><div class="duck-title">${escapeHtml(block.title)}</div>${paragraphs}</div>`;
      }
      return `<h2>${escapeHtml(block.title)}</h2>${paragraphs}`;
    }).join("");
  }

  function renderServicePage(pageKey, locale) {
    const service = locale.services[pageKey];
    const definition = SERVICE_DEFINITIONS.find(function (item) { return item.key === pageKey; });
    const pricedService = Object.assign({ key: pageKey }, service);
    const benefits = service.benefits.map(function (benefit) {
      return `<li>✓ ${escapeHtml(benefit)}</li>`;
    }).join("");
    const gallery = renderServiceGallery(definition, service, locale);
    const heroPhoto = imageUrl(definition.imageId, 1400, 850);
    return `<main><section class="page-hero service-page-hero" style="--service-hero-background:url('${escapeHtml(heroPhoto)}')"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / <a href="servicios.html">${escapeHtml(locale.common.services)}</a> / ${escapeHtml(service.title)}</div><div class="service-hero-grid"><div class="service-hero-copy"><div class="eyebrow">${escapeHtml(service.tag)}</div><h1>${escapeHtml(service.title)}</h1><p class="lead">${escapeHtml(service.intro)}</p>${renderServicePrice(pricedService, locale, true)}</div><figure class="service-hero-media"><img src="${escapeHtml(heroPhoto)}" alt="${escapeHtml(service.imageAlt)}" width="1400" height="850" fetchpriority="high" decoding="async" style="object-position:${escapeHtml(definition.imagePosition)}"><span class="service-hero-icon" aria-hidden="true">${escapeHtml(definition.icon)}</span></figure></div></div></section>${gallery}<section class="section"><div class="wrap service-detail"><article class="prose">${renderServiceContent(service.content)}</article><aside class="side-panel"><div class="icon">${escapeHtml(definition.icon)}</div><h3>${escapeHtml(locale.common.includes)}</h3><ul>${benefits}</ul><a class="btn primary" style="margin-top:18px;width:100%;background:#e7c46a;color:#171717" href="contacto.html">${escapeHtml(locale.common.requestAssessment)}</a></aside></div></section>${renderCta(locale)}</main>`;
  }

  function renderBrand() {
    return `<a class="brand" href="index.html"><span class="brand-mark"><img src="assets/logo-mark.svg" alt="" width="180" height="180"></span><span>HOT HOST<small>HOSPITALITY</small></span></a>`;
  }

  function renderShell(content, currentPage, locale) {
    const navItems = [
      ["index.html", locale.shell.nav.home, "home"],
      ["servicios.html", locale.shell.nav.services, "services"],
      ["sobre-hot-host.html", locale.shell.nav.about, "about"],
      ["contacto.html", locale.shell.nav.contact, "contact"]
    ];
    const languageOptions = SUPPORTED_LANGUAGES.map(function (language) {
      return `<option value="${language}"${language === activeLanguage ? " selected" : ""}>${language.toUpperCase()}</option>`;
    }).join("");
    const languageMenuOptions = SUPPORTED_LANGUAGES.map(function (language) {
      return `<button class="language-option" type="button" role="option" data-language-option="${language}" aria-selected="${String(language === activeLanguage)}" tabindex="-1"><span class="language-option-flag" data-language="${language}" aria-hidden="true"></span><span>${escapeHtml(LANGUAGE_NAMES[language])}</span><small>${language.toUpperCase()}</small></button>`;
    }).join("");
    const nav = navItems.map(function (item) {
      return `<a href="${item[0]}"${currentPage === item[2] ? " aria-current=\"page\"" : ""}>${escapeHtml(item[1])}</a>`;
    }).join("");
    const services = getServices(locale);
    const isDarkTheme = activeTheme === "dark";
    const themeLabel = isDarkTheme ? locale.common.enableLightMode : locale.common.enableDarkMode;
    const navCta = currentPage === "contact"
      ? ""
      : isAuditOfferActive()
        ? `<a class="nav-cta" href="contacto.html" aria-label="${escapeHtml(`${locale.shell.assess}. ${locale.common.offerTitle}. ${locale.common.offerDeadline}`)}"><span>${escapeHtml(locale.shell.assess)}</span><small>${escapeHtml(locale.common.navOffer)}</small></a>`
        : `<a class="nav-cta" href="contacto.html"><span>${escapeHtml(locale.shell.assess)}</span></a>`;

    document.body.innerHTML = `<header class="site-header"><nav class="wrap nav">${renderBrand()}<div class="nav-links">${nav}</div><div class="nav-controls"><button class="theme-toggle" id="themeToggle" type="button" aria-label="${escapeHtml(themeLabel)}" title="${escapeHtml(themeLabel)}" aria-pressed="${String(isDarkTheme)}"><span aria-hidden="true">${isDarkTheme ? "☀" : "☾"}</span></button><div class="language-switcher" data-language="${activeLanguage}"><select id="languageSelect" class="language-select" aria-label="${escapeHtml(locale.shell.languageLabel)}">${languageOptions}</select></div><button class="menu-btn" type="button" aria-label="${escapeHtml(locale.shell.openMenu)}" aria-expanded="false">☰</button></div>${navCta}</nav></header>${content}<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div>${renderBrand()}<p style="max-width:420px;color:#999;margin-top:18px">${escapeHtml(locale.shell.footerText)}</p></div><div><h3>${escapeHtml(locale.shell.explore)}</h3><a href="servicios.html">${escapeHtml(locale.shell.nav.services)}</a><a href="sobre-hot-host.html">${escapeHtml(locale.shell.nav.about)}</a><a href="contacto.html">${escapeHtml(locale.shell.nav.contact)}</a></div><div><h3>${escapeHtml(locale.shell.services)}</h3><a href="${services[0].path}">${escapeHtml(services[0].title)}</a><a href="${services[1].path}">${escapeHtml(services[1].title)}</a><a href="${services[2].path}">${escapeHtml(services[2].title)}</a></div></div><div class="copyright"><span>© 2026 Hot Host Hospitality</span><span>${escapeHtml(locale.shell.location)}</span></div></div></footer>${renderProcessDialog(locale)}`;
    document.querySelector(".language-switcher").innerHTML = `<button class="language-select" id="languageButton" type="button" aria-label="${escapeHtml(`${locale.shell.languageLabel}: ${LANGUAGE_NAMES[activeLanguage]}`)}" aria-haspopup="listbox" aria-expanded="false" aria-controls="languageMenu"><span class="language-option-flag" data-language="${activeLanguage}" aria-hidden="true"></span><span class="language-current-code">${activeLanguage.toUpperCase()}</span><span class="language-chevron" aria-hidden="true">⌄</span></button><div class="language-menu" id="languageMenu" role="listbox" aria-label="${escapeHtml(locale.shell.languageLabel)}" hidden>${languageMenuOptions}</div>`;
  }

  function getLocalizedCountries(language) {
    let displayNames = null;
    try {
      if (typeof Intl.DisplayNames === "function") {
        displayNames = new Intl.DisplayNames([language], { type: "region" });
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
      const collator = new Intl.Collator(language, { sensitivity: "base" });
      countries.sort(function (first, second) { return collator.compare(first.name, second.name); });
    } catch (error) {
      countries.sort(function (first, second) { return first.name.localeCompare(second.name); });
    }
    return countries;
  }

  function populateCountrySelects(locale, formState) {
    const propertyCountry = document.querySelector("#propertyCountry");
    const phoneCountry = document.querySelector("#phoneCountry");
    if (!propertyCountry || !phoneCountry) return;

    const countries = getLocalizedCountries(activeLanguage);
    const propertyFragment = document.createDocumentFragment();
    const phoneFragment = document.createDocumentFragment();
    countries.forEach(function (country) {
      const propertyOption = document.createElement("option");
      propertyOption.value = country.iso;
      propertyOption.textContent = country.name;
      propertyFragment.appendChild(propertyOption);

      const phoneOption = document.createElement("option");
      phoneOption.value = country.iso;
      phoneOption.textContent = `${country.name} (+${country.dialCode})`;
      phoneFragment.appendChild(phoneOption);
    });
    propertyCountry.appendChild(propertyFragment);
    phoneCountry.appendChild(phoneFragment);

    propertyCountry.value = formState && formState.propertyCountry ? formState.propertyCountry : "";
    phoneCountry.value = formState && formState.phoneCountry ? formState.phoneCountry : "ES";
    if (!phoneCountry.value) phoneCountry.value = "ES";
  }

  function captureFormState() {
    const form = document.querySelector("#contactForm");
    if (!form) return null;
    const state = {};
    Array.from(form.elements).forEach(function (control) {
      if (!control.name || control.type === "file" || control.type === "submit") return;
      state[control.name] = control.type === "checkbox" ? control.checked : control.value;
    });
    return state;
  }

  function restoreFormState(form, state) {
    if (!state) return;
    Object.keys(state).forEach(function (name) {
      const control = form.elements.namedItem(name);
      if (!control) return;
      if (control.type === "checkbox") control.checked = Boolean(state[name]);
      else if (typeof control.value === "string") control.value = state[name];
    });
  }

  function getOptionLabel(options, value) {
    const option = options.find(function (item) { return item[0] === value; });
    return option ? option[1] : value;
  }

  function getCountry(iso) {
    const country = COUNTRIES.find(function (item) { return item[0] === iso; });
    return country || [iso, "", iso];
  }

  function getCountryName(iso) {
    const countries = getLocalizedCountries(activeLanguage);
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
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function getDriveUploadEndpoint() {
    const configuredEndpoint = window.HOT_HOST_CONFIG && window.HOT_HOST_CONFIG.driveUploadEndpoint;
    if (!configuredEndpoint) return "";
    try {
      const endpoint = new URL(String(configuredEndpoint).trim());
      const validPath = /^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname);
      return endpoint.protocol === "https:" && endpoint.hostname === "script.google.com" && validPath
        ? endpoint.href
        : "";
    } catch (error) {
      return "";
    }
  }

  function optimisePropertyPhoto(file, index) {
    return new Promise(function (resolve, reject) {
      const sourceUrl = URL.createObjectURL(file);
      const image = new Image();
      let settled = false;
      let sourceRevoked = false;
      const timeout = window.setTimeout(function () {
        finish(reject, new Error("Image processing timed out"));
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
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          finish(reject, new Error("Canvas is unavailable"));
          return;
        }
        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(function (blob) {
          if (settled) return;
          if (!blob) {
            finish(reject, new Error("Image optimisation failed"));
            return;
          }
          if (blob.size > MAX_OPTIMISED_PHOTO_BYTES) {
            finish(reject, new Error("Optimised image is too large"));
            return;
          }
          const reader = new FileReader();
          reader.onload = function () {
            const baseName = file.name
              .replace(/\.[^.]+$/, "")
              .replace(/[^a-z0-9_-]+/gi, "-")
              .replace(/^-+|-+$/g, "")
              .slice(0, 60) || `photo-${index + 1}`;
            finish(resolve, {
              name: `${String(index + 1).padStart(2, "0")}-${baseName}.jpg`,
              mimeType: "image/jpeg",
              size: blob.size,
              data: String(reader.result).split(",")[1]
            });
          };
          reader.onerror = function () { finish(reject, new Error("Image could not be read")); };
          reader.readAsDataURL(blob);
        }, "image/jpeg", .82);
      };
      image.onerror = function () {
        finish(reject, new Error("Image could not be decoded"));
      };
      image.src = sourceUrl;
    });
  }

  async function uploadPropertyPhotos(endpoint, files, metadata) {
    const photos = [];
    for (let index = 0; index < files.length; index += 1) {
      photos.push(await optimisePropertyPhoto(files[index], index));
    }
    const payload = Object.assign({ version: 1, photos: photos }, metadata);
    const payloadBody = JSON.stringify(payload);
    if (payloadBody.length > MAX_UPLOAD_REQUEST_CHARACTERS) {
      throw new Error("Photo request is too large");
    }
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = window.setTimeout(function () {
      if (controller) controller.abort();
    }, PHOTO_UPLOAD_TIMEOUT_MS);
    try {
      const request = window.fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: payloadBody,
        signal: controller ? controller.signal : undefined
      });
      if (controller) await request;
      else {
        await Promise.race([
          request,
          new Promise(function (_, reject) {
            window.setTimeout(function () { reject(new Error("Photo upload timed out")); }, PHOTO_UPLOAD_TIMEOUT_MS);
          })
        ]);
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function setConditionalField(field, control, visible) {
    field.hidden = !visible;
    control.required = visible;
    if (!visible) {
      control.value = "";
      control.setCustomValidity("");
      control.removeAttribute("aria-invalid");
    }
  }

  function setupContactForm(locale, formState) {
    const form = document.querySelector("#contactForm");
    if (!form) return;

    populateCountrySelects(locale, formState);
    restoreFormState(form, formState);

    const propertyType = form.querySelector("#propertyType");
    const touristRental = form.querySelector("#touristRental");
    const bedroomsField = form.querySelector("#bedroomsField");
    const bedrooms = form.querySelector("#bedrooms");
    const propertyPhotosField = form.querySelector("#propertyPhotosField");
    const propertyPhotos = form.querySelector("#propertyPhotos");
    const photosUrl = form.querySelector("#photosUrl");
    const photosStatus = form.querySelector("#propertyPhotosStatus");
    const photoPreviews = form.querySelector("#propertyPhotoPreviews");
    const photoDropzone = form.querySelector("[data-photo-dropzone]");
    const driveEndpoint = getDriveUploadEndpoint();
    const driveUploadAvailable = Boolean(driveEndpoint);

    function setPhotoStatus(message, kind) {
      photosStatus.textContent = message;
      if (kind) photosStatus.dataset.kind = kind;
      else delete photosStatus.dataset.kind;
    }

    function validatePhotoRequirement() {
      const requiresPhotos = touristRental.value === "no";
      const hasPhotos = selectedPropertyPhotos.length > 0 || String(photosUrl.value || "").trim();
      const validationMessage = requiresPhotos && !hasPhotos ? locale.form.photosRequired : "";
      propertyPhotos.setCustomValidity(driveUploadAvailable ? validationMessage : "");
      photosUrl.setCustomValidity(driveUploadAvailable ? "" : validationMessage);
      if (driveUploadAvailable && propertyPhotos.validationMessage) {
        propertyPhotos.setAttribute("aria-invalid", "true");
        photoDropzone.classList.add("invalid");
      } else {
        propertyPhotos.removeAttribute("aria-invalid");
        photoDropzone.classList.remove("invalid");
      }
      if (!driveUploadAvailable && photosUrl.validationMessage) photosUrl.setAttribute("aria-invalid", "true");
      else if (!photosUrl.validity.typeMismatch) photosUrl.removeAttribute("aria-invalid");
      return driveUploadAvailable ? !propertyPhotos.validationMessage : !photosUrl.validationMessage;
    }

    function renderPhotoPreviews() {
      photoPreviews.replaceChildren();
      selectedPropertyPhotos.forEach(function (file, index) {
        const preview = document.createElement("figure");
        preview.className = "property-photo-preview";
        const image = document.createElement("img");
        const imageUrl = URL.createObjectURL(file);
        image.src = imageUrl;
        image.alt = "";
        image.onload = function () { URL.revokeObjectURL(imageUrl); };
        image.onerror = function () { URL.revokeObjectURL(imageUrl); };
        const caption = document.createElement("figcaption");
        caption.textContent = file.name;
        const removeButton = document.createElement("button");
        const removeLabel = formatFormMessage(locale.form.removePhoto, { name: file.name });
        removeButton.type = "button";
        removeButton.textContent = "×";
        removeButton.title = locale.form.removePhoto.includes("{name}") ? removeLabel : `${removeLabel}: ${file.name}`;
        removeButton.setAttribute("aria-label", removeButton.title);
        removeButton.addEventListener("click", function () {
          selectedPropertyPhotos.splice(index, 1);
          renderPhotoPreviews();
          validatePhotoRequirement();
        });
        preview.append(image, caption, removeButton);
        photoPreviews.appendChild(preview);
      });

      if (selectedPropertyPhotos.length) {
        const countMessage = formatFormMessage(locale.form.photosSelected, { count: selectedPropertyPhotos.length });
        setPhotoStatus(
          locale.form.photosSelected.includes("{count}")
            ? countMessage
            : `${countMessage}: ${selectedPropertyPhotos.length}`,
          "selected"
        );
      } else {
        setPhotoStatus(driveUploadAvailable ? "" : locale.form.driveNotConfigured, driveUploadAvailable ? "" : "warning");
      }
    }

    function addPropertyPhotos(fileList) {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      if (files.some(function (file) { return !["image/jpeg", "image/png", "image/webp"].includes(file.type); })) {
        setPhotoStatus(locale.form.photosInvalidType, "error");
        return;
      }
      if (files.some(function (file) { return file.size > MAX_PROPERTY_PHOTO_BYTES; })) {
        setPhotoStatus(locale.form.photosTooLarge, "error");
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
        setPhotoStatus(locale.form.photosTooMany, "error");
        return;
      }
      selectedPropertyPhotos = nextPhotos;
      propertyPhotos.value = "";
      renderPhotoPreviews();
      validatePhotoRequirement();
    }

    function updatePropertyFields() {
      const type = propertyType.value;
      const isStudio = type === "studio";
      const wasStudio = bedroomsField.hidden;
      setConditionalField(form.querySelector("#otherTypeField"), form.querySelector("#otherType"), type === "other");
      setConditionalField(form.querySelector("#floorField"), form.querySelector("#floor"), type === "flat" || isStudio || type === "other");
      setConditionalField(form.querySelector("#totalFloorsField"), form.querySelector("#totalFloors"), ["villa", "house", "chalet"].includes(type));
      bedroomsField.hidden = isStudio;
      bedrooms.required = !isStudio;
      if (isStudio) bedrooms.value = "1";
      else if (wasStudio) bedrooms.value = "";
    }

    function updateRentalFields() {
      setConditionalField(form.querySelector("#listingUrlField"), form.querySelector("#listingUrl"), touristRental.value === "yes");
      const showPhotos = touristRental.value === "no";
      propertyPhotosField.hidden = !showPhotos;
      photosUrl.required = showPhotos && !driveUploadAvailable;
      if (!showPhotos) {
        photosUrl.value = "";
        propertyPhotos.value = "";
        selectedPropertyPhotos = [];
        renderPhotoPreviews();
      }
      validatePhotoRequirement();
    }

    function validateControl(control) {
      if (!control || !control.willValidate) return true;
      if (control === propertyPhotos) return validatePhotoRequirement();
      const messages = locale.form.validation;
      control.setCustomValidity("");
      const value = String(control.value || "").trim();

      if (control.type === "checkbox" && control.required && !control.checked) {
        control.setCustomValidity(messages.required);
      } else if (control.required && !value) {
        control.setCustomValidity(messages.required);
      } else if (control.id === "phone" && value.includes("+")) {
        control.setCustomValidity(messages.phoneNoPrefix);
      } else if (control.id === "phone" && value) {
        const digits = value.replace(/\D/g, "");
        if (!/^[-0-9 ()./]+$/.test(value) || digits.length < 4 || digits.length > 15) {
          control.setCustomValidity(messages.phone);
        }
      } else if (control.validity.typeMismatch && control.type === "email") {
        control.setCustomValidity(messages.email);
      } else if (control.validity.typeMismatch && control.type === "url") {
        control.setCustomValidity(messages.url);
      } else if (control.validity.badInput || control.validity.stepMismatch) {
        control.setCustomValidity(messages.number);
      } else if (control.validity.rangeUnderflow) {
        control.setCustomValidity(control.id === "floor" ? messages.floorMinimum : messages.minimum);
      } else if (control.validity.tooShort) {
        control.setCustomValidity(messages.tooShort);
      } else if (control.validity.patternMismatch) {
        control.setCustomValidity(control.id === "phone" ? messages.phone : messages.generic);
      }

      if (control.validationMessage) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
      return !control.validationMessage;
    }

    propertyType.addEventListener("change", updatePropertyFields);
    touristRental.addEventListener("change", updateRentalFields);
    propertyPhotos.addEventListener("change", function () { addPropertyPhotos(propertyPhotos.files); });
    photosUrl.addEventListener("input", validatePhotoRequirement);
    ["dragenter", "dragover"].forEach(function (eventName) {
      photoDropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        photoDropzone.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach(function (eventName) {
      photoDropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        photoDropzone.classList.remove("dragging");
        if (eventName === "drop") addPropertyPhotos(event.dataTransfer.files);
      });
    });
    form.addEventListener("input", function (event) {
      validateControl(event.target);
      if (event.target === photosUrl) validatePhotoRequirement();
      const status = form.querySelector("#formStatus");
      if (status.dataset.kind === "validation") {
        status.textContent = "";
        delete status.dataset.kind;
      }
    });
    form.addEventListener("change", function (event) {
      validateControl(event.target);
    });

    updatePropertyFields();
    updateRentalFields();
    renderPhotoPreviews();

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const controls = Array.from(form.elements).filter(function (control) { return control.willValidate; });
      const isValid = controls.map(validateControl).every(Boolean);
      const status = form.querySelector("#formStatus");
      if (!isValid) {
        status.textContent = locale.form.validation.review;
        status.dataset.kind = "validation";
        form.reportValidity();
        return;
      }

      const deliveryMethod = event.submitter && event.submitter.value === "whatsapp" ? "whatsapp" : "email";
      const data = new FormData(form);
      const typeCode = String(data.get("propertyType"));
      const role = getOptionLabel(locale.form.roles, String(data.get("contactRole")));
      const rental = getOptionLabel(locale.form.rentalOptions, String(data.get("touristRental")));
      let propertyTypeLabel = getOptionLabel(locale.form.propertyTypes, typeCode);
      if (typeCode === "other") {
        propertyTypeLabel = `${propertyTypeLabel}: ${String(data.get("otherType")).trim()}`;
      }

      const phoneCountry = getCountry(String(data.get("phoneCountry")));
      const internationalPhone = `+${phoneCountry[1]} ${String(data.get("phone")).trim()}`;
      const labels = locale.form.emailBody;
      const selectedPhotos = touristRental.value === "no" ? selectedPropertyPhotos.slice() : [];
      const photosLink = String(data.get("photosUrl") || "").trim();
      const shouldUploadPhotos = selectedPhotos.length > 0 && Boolean(driveEndpoint) && !photosLink;
      const submissionId = createSubmissionId();
      let photoSubmissionReference = "";
      let messageWindow = null;

      if (selectedPhotos.length && !driveEndpoint) {
        setPhotoStatus(locale.form.driveNotConfigured, photosLink ? "warning" : "error");
        if (!photosLink) {
          status.textContent = locale.form.driveNotConfigured;
          status.dataset.kind = "validation";
          propertyPhotos.focus();
          return;
        }
      }

      if (shouldUploadPhotos) {
        messageWindow = window.open("about:blank", "_blank");
        if (messageWindow) messageWindow.opener = null;
        const submitButtons = Array.from(form.querySelectorAll("button[type='submit']"));
        submitButtons.forEach(function (button) { button.disabled = true; });
        status.textContent = locale.form.driveUploading;
        status.dataset.kind = "uploading";
        setPhotoStatus(locale.form.driveUploading, "uploading");
        try {
          await uploadPropertyPhotos(driveEndpoint, selectedPhotos, {
            submissionId: submissionId,
            submittedAt: new Date().toISOString(),
            language: activeLanguage,
            sourceUrl: window.location.href.split(/[?#]/, 1)[0],
            website: String(data.get("website") || ""),
            consent: {
              accepted: Boolean(data.get("privacyConsent")),
              text: locale.form.privacyConsent
            },
            contact: {
              relationship: role,
              name: String(data.get("name")).trim(),
              email: String(data.get("email")).trim(),
              phone: internationalPhone
            },
            property: {
              street: String(data.get("streetAddress")).trim(),
              postalCode: String(data.get("postalCode")).trim(),
              city: String(data.get("city")).trim(),
              country: getCountryName(String(data.get("propertyCountry"))),
              type: propertyTypeLabel,
              bedrooms: String(data.get("bedrooms")).trim(),
              bathrooms: String(data.get("bathrooms")).trim(),
              floor: String(data.get("floor") || "").trim(),
              totalFloors: String(data.get("totalFloors") || "").trim(),
              touristRental: rental,
              listingUrl: String(data.get("listingUrl") || "").trim(),
              photosUrl: photosLink,
              comments: String(data.get("message") || "").trim()
            }
          });
          photoSubmissionReference = `${selectedPhotos.length} · ${submissionId}`;
          setPhotoStatus(
            formatFormMessage(locale.form.driveUploaded, { count: selectedPhotos.length }),
            "submitted"
          );
        } catch (error) {
          if (messageWindow) messageWindow.close();
          status.textContent = locale.form.driveUploadError;
          status.dataset.kind = "validation";
          setPhotoStatus(locale.form.driveUploadError, "error");
          submitButtons.forEach(function (button) { button.disabled = false; });
          return;
        }
        submitButtons.forEach(function (button) { button.disabled = false; });
      }

      const lines = [
        `${labels.relationship}: ${role}`,
        `${labels.name}: ${String(data.get("name")).trim()}`,
        `${labels.email}: ${String(data.get("email")).trim()}`,
        `${labels.phone}: ${internationalPhone}`,
        "",
        `${labels.address}:`,
        `  ${labels.street}: ${String(data.get("streetAddress")).trim()}`,
        `  ${labels.postalCode}: ${String(data.get("postalCode")).trim()}`,
        `  ${labels.city}: ${String(data.get("city")).trim()}`,
        `  ${labels.country}: ${getCountryName(String(data.get("propertyCountry")))}`,
        "",
        `${labels.propertyType}: ${propertyTypeLabel}`,
        `${labels.bedrooms}: ${String(data.get("bedrooms")).trim()}`,
        `${labels.bathrooms}: ${String(data.get("bathrooms")).trim()}`,
        data.get("floor") ? `${labels.floor}: ${String(data.get("floor")).trim()}` : "",
        data.get("totalFloors") ? `${labels.totalFloors}: ${String(data.get("totalFloors")).trim()}` : "",
        `${labels.rental}: ${rental}`,
        data.get("listingUrl") ? `${labels.listingUrl}: ${String(data.get("listingUrl")).trim()}` : "",
        photosLink ? `${labels.photosUrl}: ${photosLink}` : "",
        photoSubmissionReference ? `${labels.photosUploaded}: ${photoSubmissionReference}` : "",
        `${labels.consent}: ${locale.form.privacyConsent}`,
        data.get("message") ? `${labels.comments}: ${String(data.get("message")).trim()}` : ""
      ].filter(function (line, index, allLines) {
        return line !== "" || (index > 0 && allLines[index - 1] !== "");
      });

      const safeName = String(data.get("name")).replace(/[\r\n]+/g, " ").trim();
      const safePropertyType = propertyTypeLabel.replace(/[\r\n]+/g, " ");
      const subjectText = `${labels.subject} · ${safePropertyType} · ${safeName}`;
      const messageText = lines.join("\n");
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(messageText)}`;
      const whatsappText = `${subjectText}\n\n${messageText}`;
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`;
      const targetUrl = deliveryMethod === "whatsapp" ? whatsappUrl : gmailUrl;
      const openedMessage = deliveryMethod === "whatsapp" ? locale.form.status.whatsappOpened : locale.form.status.emailOpened;
      const blockedLinkText = deliveryMethod === "whatsapp" ? locale.form.status.blockedWhatsappLink : locale.form.status.blockedEmailLink;
      if (!messageWindow || messageWindow.closed) messageWindow = window.open("about:blank", "_blank");
      delete status.dataset.kind;

      if (messageWindow && !messageWindow.closed) {
        try {
          messageWindow.opener = null;
          messageWindow.location.replace(targetUrl);
          status.textContent = openedMessage;
          return;
        } catch (error) {
          messageWindow = null;
        }
      }
      if (!messageWindow) {
        const link = document.createElement("a");
        link.href = targetUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const strong = document.createElement("strong");
        strong.textContent = blockedLinkText;
        link.appendChild(strong);
        status.textContent = locale.form.status.blockedBefore;
        status.appendChild(link);
        status.appendChild(document.createTextNode(locale.form.status.blockedAfter));
      }
    });
  }

  function setupShellInteractions(locale) {
    const menuButton = document.querySelector(".menu-btn");
    const navLinks = document.querySelector(".nav-links");
    const themeButton = document.querySelector("#themeToggle");
    const languageSwitcher = document.querySelector(".language-switcher");
    const languageButton = document.querySelector("#languageButton");
    const languageMenu = document.querySelector("#languageMenu");
    const languageOptions = Array.from(document.querySelectorAll("[data-language-option]"));
    menuButton.addEventListener("click", function () {
      const isOpen = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? locale.shell.closeMenu : locale.shell.openMenu);
    });

    themeButton.addEventListener("click", function () {
      const nextTheme = activeTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      saveTheme(nextTheme);
      const label = nextTheme === "dark" ? locale.common.enableLightMode : locale.common.enableDarkMode;
      themeButton.setAttribute("aria-label", label);
      themeButton.setAttribute("title", label);
      themeButton.setAttribute("aria-pressed", String(nextTheme === "dark"));
      themeButton.querySelector("span").textContent = nextTheme === "dark" ? "☀" : "☾";
    });

    function closeLanguageMenu(restoreFocus) {
      languageMenu.hidden = true;
      languageButton.setAttribute("aria-expanded", "false");
      if (restoreFocus) languageButton.focus();
    }

    function openLanguageMenu(focusLast) {
      languageMenu.hidden = false;
      languageButton.setAttribute("aria-expanded", "true");
      const selectedIndex = languageOptions.findIndex(function (option) {
        return option.getAttribute("aria-selected") === "true";
      });
      const optionIndex = focusLast ? languageOptions.length - 1 : Math.max(0, selectedIndex);
      languageOptions[optionIndex].focus();
    }

    function selectLanguage(language) {
      const nextLanguage = normalizeLanguage(language);
      if (!nextLanguage || nextLanguage === activeLanguage) {
        closeLanguageMenu(true);
        return;
      }
      const formState = captureFormState();
      activeLanguage = nextLanguage;
      saveLanguage(activeLanguage);
      renderApp(formState);
    }

    languageButton.addEventListener("click", function () {
      if (languageMenu.hidden) openLanguageMenu(false);
      else closeLanguageMenu(false);
    });
    languageButton.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openLanguageMenu(event.key === "ArrowUp");
      }
    });
    languageOptions.forEach(function (option) {
      option.addEventListener("click", function () {
        selectLanguage(option.dataset.languageOption);
      });
    });
    languageMenu.addEventListener("keydown", function (event) {
      const currentIndex = languageOptions.indexOf(document.activeElement);
      let nextIndex = currentIndex;
      if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % languageOptions.length;
      else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + languageOptions.length) % languageOptions.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = languageOptions.length - 1;
      else if (event.key === "Escape") {
        event.preventDefault();
        closeLanguageMenu(true);
        return;
      } else return;
      event.preventDefault();
      languageOptions[nextIndex].focus();
    });
    languageSwitcher.addEventListener("focusout", function (event) {
      if (!languageSwitcher.contains(event.relatedTarget)) closeLanguageMenu(false);
    });
    if (languageMenuOutsideHandler) {
      document.removeEventListener("pointerdown", languageMenuOutsideHandler);
    }
    languageMenuOutsideHandler = function (event) {
      if (!languageSwitcher.contains(event.target)) closeLanguageMenu(false);
    };
    document.addEventListener("pointerdown", languageMenuOutsideHandler);

  }

  function setupCredentialsDisclosure() {
    const panel = document.querySelector(".credentials-panel");
    const button = panel && panel.querySelector("[data-credentials-toggle]");
    const details = panel && panel.querySelector("#credentialsDetails");
    const preview = panel && panel.querySelector(".credentials-hover-preview");
    if (!panel || !button || !details || !preview) return;
    const label = button.querySelector("[data-credentials-toggle-label]");
    const hoverMedia = window.matchMedia("(hover: hover) and (min-width: 961px)");

    function closePreview() {
      panel.classList.remove("is-previewing");
    }

    function setExpanded(isExpanded) {
      closePreview();
      panel.classList.toggle("is-expanded", isExpanded);
      button.setAttribute("aria-expanded", String(isExpanded));
      details.setAttribute("aria-hidden", String(!isExpanded));
      label.textContent = isExpanded ? button.dataset.collapseLabel : button.dataset.expandLabel;
    }

    button.addEventListener("click", function () {
      setExpanded(!panel.classList.contains("is-expanded"));
    });
    button.addEventListener("pointerenter", function (event) {
      if (event.pointerType !== "mouse" || !hoverMedia.matches || panel.classList.contains("is-expanded")) return;
      const panelRect = panel.getBoundingClientRect();
      panel.style.setProperty("--credentials-preview-top", `${92 - panelRect.top}px`);
      panel.style.setProperty("--credentials-preview-height", `${Math.max(180, window.innerHeight - 112)}px`);
      panel.classList.add("is-previewing");
    });
    panel.addEventListener("pointerleave", closePreview);
    if (credentialsEscapeHandler) document.removeEventListener("keydown", credentialsEscapeHandler);
    credentialsEscapeHandler = function (event) {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      const isExpanded = panel.classList.contains("is-expanded") && panel.contains(document.activeElement);
      const isPreviewing = panel.classList.contains("is-previewing");
      if (!isExpanded && !isPreviewing) return;
      event.preventDefault();
      if (isExpanded) setExpanded(false);
      else closePreview();
      if (panel.contains(document.activeElement)) button.focus();
    };
    document.addEventListener("keydown", credentialsEscapeHandler);
  }

  function setupProcessDialog() {
    const dialog = document.querySelector("#processDialog");
    const triggers = document.querySelectorAll("[data-process-trigger]");
    if (!dialog || !triggers.length) return;

    const image = dialog.querySelector("[data-process-dialog-image]");
    const eyebrow = dialog.querySelector("[data-process-dialog-eyebrow]");
    const number = dialog.querySelector("[data-process-dialog-number]");
    const title = dialog.querySelector("[data-process-dialog-title]");
    const summary = dialog.querySelector("[data-process-dialog-summary]");
    const detail = dialog.querySelector("[data-process-dialog-detail]");
    const closeButton = dialog.querySelector("[data-process-close]");
    let activeTrigger = null;

    function fitDialogTitle() {
      title.style.removeProperty("font-size");
      title.classList.remove("process-dialog-title-wrap");
      const availableWidth = title.clientWidth;
      let fontSize = parseFloat(window.getComputedStyle(title).fontSize);
      const minimumSize = 30;

      while (title.scrollWidth > availableWidth && fontSize > minimumSize) {
        fontSize -= 1;
        title.style.fontSize = `${fontSize}px`;
      }
      title.classList.toggle("process-dialog-title-wrap", title.scrollWidth > availableWidth);
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        activeTrigger = trigger;
        eyebrow.textContent = trigger.dataset.processEyebrow;
        number.textContent = trigger.dataset.processNumber;
        title.textContent = trigger.dataset.processTitle;
        summary.textContent = trigger.dataset.processSummary;
        detail.textContent = trigger.dataset.processDetail;
        image.src = imageUrl(trigger.dataset.processPhoto, 1400, 1000);
        image.alt = trigger.dataset.processImageAlt;
        image.style.objectPosition = trigger.dataset.processPosition;
        image.hidden = false;
        dialog.showModal();
        fitDialogTitle();
      });
    });

    closeButton.addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", function () {
      const triggerToFocus = activeTrigger;
      image.hidden = true;
      image.removeAttribute("src");
      title.style.removeProperty("font-size");
      title.classList.remove("process-dialog-title-wrap");
      activeTrigger = null;
      if (triggerToFocus) {
        window.setTimeout(function () { triggerToFocus.focus(); }, 0);
      }
    });
  }

  function setupEarningsCalculator(locale) {
    const calculator = document.querySelector("[data-earnings-calculator]");
    if (!calculator) return;
    const comparison = locale.home.comparison;
    const inputsPanel = calculator.querySelector(".earnings-inputs");
    const selectedModel = earningsCalculatorState.rentalModel === "tourist" ? "tourist" : "traditional";
    earningsCalculatorState.rentalModel = selectedModel;
    earningsCalculatorState.currency = SUPPORTED_CURRENCIES.includes(earningsCalculatorState.currency)
      ? earningsCalculatorState.currency
      : "EUR";
    const currencyOptions = SUPPORTED_CURRENCIES.map(function (currency) {
      const symbol = CURRENCY_SYMBOLS[currency];
      const label = symbol === currency ? currency : `${symbol} ${currency}`;
      return `<option value="${currency}">${escapeHtml(label)}</option>`;
    }).join("");
    inputsPanel.innerHTML = `<h3 id="earningsInputsTitle">${escapeHtml(comparison.inputsTitle)}</h3><label class="earnings-model-field" for="earningsRentalModel">${escapeHtml(comparison.modelLabel)}<select id="earningsRentalModel" data-earnings-model><option value="traditional">${escapeHtml(comparison.traditional)}</option><option value="tourist">${escapeHtml(comparison.tourist)}</option></select></label><div class="earnings-value-field"><label for="earningsPropertyValue" data-earnings-value-label></label><span class="earnings-control"><input id="earningsPropertyValue" data-earnings-value type="number" min="0" step="any" inputmode="decimal"><select class="earnings-currency" data-earnings-currency aria-label="${escapeHtml(comparison.currencyLabel)}">${currencyOptions}</select></span></div>`;

    const modelSelect = inputsPanel.querySelector("[data-earnings-model]");
    const valueLabel = inputsPanel.querySelector("[data-earnings-value-label]");
    const valueInput = inputsPanel.querySelector("[data-earnings-value]");
    const currencySelect = inputsPanel.querySelector("[data-earnings-currency]");
    const integer = new Intl.NumberFormat(activeLanguage, { maximumFractionDigits: 0 });
    let inputEdited = false;

    function setOutput(name, value) {
      const output = calculator.querySelector(`[data-earnings-output="${name}"]`);
      if (output) output.textContent = value;
    }

    function getCurrencyRate() {
      const rate = Number(exchangeRatesPerEur[earningsCalculatorState.currency]);
      return Number.isFinite(rate) && rate > 0 ? rate : 1;
    }

    function toDisplayCurrency(eurValue) {
      return eurValue * getCurrencyRate();
    }

    function formatInputValue(eurValue) {
      return String(Number(toDisplayCurrency(eurValue).toFixed(2)));
    }

    function formatDifference(value, formatter) {
      const sign = value >= 0 ? "+" : "−";
      return `${sign}${formatter.format(toDisplayCurrency(Math.abs(value)))}`;
    }

    function syncValueConstraints() {
      const isTourist = earningsCalculatorState.rentalModel === "tourist";
      const key = isTourist ? "touristRate" : "traditionalRent";
      const maximum = DEFAULT_EARNINGS[key] * MAX_EARNINGS_SCALE;
      valueLabel.textContent = isTourist ? comparison.touristRate : comparison.traditionalRent;
      valueInput.max = formatInputValue(maximum);
    }

    function syncValueInput() {
      const key = earningsCalculatorState.rentalModel === "tourist" ? "touristRate" : "traditionalRent";
      syncValueConstraints();
      valueInput.value = formatInputValue(earningsCalculatorState[key]);
    }

    function updateHighlightedModel() {
      calculator.dataset.rentalModel = earningsCalculatorState.rentalModel;
      calculator.querySelectorAll("table tr").forEach(function (row) {
        if (row.cells[1]) row.cells[1].classList.toggle("current-model-column", earningsCalculatorState.rentalModel === "traditional");
        if (row.cells[2]) row.cells[2].classList.toggle("current-model-column", earningsCalculatorState.rentalModel === "tourist");
      });
    }

    function updateSelectedModel() {
      earningsCalculatorState.rentalModel = modelSelect.value === "tourist" ? "tourist" : "traditional";
      updateHighlightedModel();
      syncValueInput();
    }

    function updateComparison() {
      earningsCalculatorState.touristOccupancy = MARKET_OCCUPANCY;
      earningsCalculatorState.hotHostOccupancy = HOT_HOST_OCCUPANCY;
      earningsCalculatorState.hotHostRate = earningsCalculatorState.touristRate * HOT_HOST_RATE_MULTIPLIER;
      const traditionalAnnual = earningsCalculatorState.traditionalRent * 12;
      const touristNights = 365 * MARKET_OCCUPANCY / 100;
      const hotHostNights = 365 * HOT_HOST_OCCUPANCY / 100;
      const touristAnnual = earningsCalculatorState.touristRate * touristNights;
      const hotHostAnnual = earningsCalculatorState.hotHostRate * hotHostNights;
      const currency = new Intl.NumberFormat(activeLanguage, {
        style: "currency",
        currency: earningsCalculatorState.currency,
        maximumFractionDigits: 0
      });

      setOutput("traditionalMonthly", currency.format(toDisplayCurrency(traditionalAnnual / 12)));
      setOutput("touristMonthly", currency.format(toDisplayCurrency(touristAnnual / 12)));
      setOutput("hotHostMonthly", currency.format(toDisplayCurrency(hotHostAnnual / 12)));
      setOutput("traditionalAnnual", currency.format(toDisplayCurrency(traditionalAnnual)));
      setOutput("touristAnnual", currency.format(toDisplayCurrency(touristAnnual)));
      setOutput("hotHostAnnual", currency.format(toDisplayCurrency(hotHostAnnual)));
      setOutput("touristNights", integer.format(touristNights));
      setOutput("hotHostNights", integer.format(hotHostNights));
      setOutput("touristRate", currency.format(toDisplayCurrency(earningsCalculatorState.touristRate)));
      setOutput("hotHostRate", currency.format(toDisplayCurrency(earningsCalculatorState.hotHostRate)));
      setOutput("hotHostResult", currency.format(toDisplayCurrency(hotHostAnnual)));
      setOutput("versusTraditional", formatDifference(hotHostAnnual - traditionalAnnual, currency));
      setOutput("versusTourist", formatDifference(hotHostAnnual - touristAnnual, currency));
    }

    function updatePropertyScale() {
      const isTourist = earningsCalculatorState.rentalModel === "tourist";
      const key = isTourist ? "touristRate" : "traditionalRent";
      const displayValue = Number(valueInput.value);
      const maximumDisplay = DEFAULT_EARNINGS[key] * MAX_EARNINGS_SCALE * getCurrencyRate();
      const clampedDisplay = Number.isFinite(displayValue)
        ? Math.min(maximumDisplay, Math.max(0, displayValue))
        : 0;
      const activeValueEur = clampedDisplay / getCurrencyRate();
      const propertyScale = activeValueEur / DEFAULT_EARNINGS[key];
      earningsCalculatorState.traditionalRent = DEFAULT_EARNINGS.traditionalRent * propertyScale;
      earningsCalculatorState.touristRate = DEFAULT_EARNINGS.touristRate * propertyScale;
      if (clampedDisplay !== displayValue) valueInput.value = formatInputValue(activeValueEur);
      updateComparison();
    }

    modelSelect.value = selectedModel;
    currencySelect.value = earningsCalculatorState.currency;
    modelSelect.addEventListener("change", function () {
      inputEdited = false;
      updateSelectedModel();
      updateComparison();
    });
    valueInput.addEventListener("input", function () {
      inputEdited = true;
      updatePropertyScale();
    });
    currencySelect.addEventListener("change", function () {
      inputEdited = false;
      earningsCalculatorState.currency = SUPPORTED_CURRENCIES.includes(currencySelect.value)
        ? currencySelect.value
        : "EUR";
      currencySelect.value = earningsCalculatorState.currency;
      syncValueInput();
      updateComparison();
    });
    updateSelectedModel();
    updateComparison();
    loadExchangeRates().then(function () {
      if (!calculator.isConnected) return;
      if (inputEdited) {
        syncValueConstraints();
        updatePropertyScale();
      }
      else {
        syncValueInput();
        updateComparison();
      }
    });
  }

  function setupServiceCarousels(locale) {
    if (serviceCarouselResizeHandler) {
      window.removeEventListener("resize", serviceCarouselResizeHandler);
      serviceCarouselResizeHandler = null;
    }

    const carousels = Array.from(document.querySelectorAll("[data-services-carousel]"));
    if (!carousels.length) return;
    const resizeUpdates = [];

    carousels.forEach(function (carousel) {
      const viewport = carousel.querySelector("[data-services-viewport]");
      const slides = Array.from(carousel.querySelectorAll("[data-service-slide]"));
      const previousButton = carousel.querySelector("[data-services-previous]");
      const nextButton = carousel.querySelector("[data-services-next]");
      const status = carousel.querySelector("[data-services-status]");
      const motionReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let currentIndex = 0;
      let scrollFrame = null;

      function getVisibleCount() {
        const value = parseInt(window.getComputedStyle(carousel).getPropertyValue("--services-visible"), 10);
        return Math.min(slides.length, Number.isFinite(value) ? value : 3);
      }

      function getMaximumIndex() {
        return Math.max(0, slides.length - getVisibleCount());
      }

      function updateControls() {
        const visibleCount = getVisibleCount();
        const maximumIndex = getMaximumIndex();
        currentIndex = Math.min(currentIndex, maximumIndex);
        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === maximumIndex;
        status.textContent = renderServiceCounter(
          locale.common.serviceCounter,
          currentIndex + 1,
          Math.min(slides.length, currentIndex + visibleCount),
          slides.length
        );
      }

      function moveTo(index, behavior) {
        currentIndex = Math.max(0, Math.min(index, getMaximumIndex()));
        const firstOffset = slides[0] ? slides[0].offsetLeft : 0;
        const targetOffset = slides[currentIndex] ? slides[currentIndex].offsetLeft - firstOffset : 0;
        viewport.scrollTo({ left: targetOffset, behavior: behavior });
        updateControls();
      }

      previousButton.addEventListener("click", function () {
        moveTo(currentIndex - 1, motionReduced ? "auto" : "smooth");
      });
      nextButton.addEventListener("click", function () {
        moveTo(currentIndex + 1, motionReduced ? "auto" : "smooth");
      });
      carousel.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveTo(currentIndex - 1, motionReduced ? "auto" : "smooth");
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          moveTo(currentIndex + 1, motionReduced ? "auto" : "smooth");
        } else if (event.key === "Home") {
          event.preventDefault();
          moveTo(0, motionReduced ? "auto" : "smooth");
        } else if (event.key === "End") {
          event.preventDefault();
          moveTo(getMaximumIndex(), motionReduced ? "auto" : "smooth");
        }
      });
      viewport.addEventListener("scroll", function () {
        if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
        scrollFrame = window.requestAnimationFrame(function () {
          const firstOffset = slides[0] ? slides[0].offsetLeft : 0;
          const nearestIndex = slides.reduce(function (nearest, slide, index) {
            const currentDistance = Math.abs(slide.offsetLeft - firstOffset - viewport.scrollLeft);
            const nearestDistance = Math.abs(slides[nearest].offsetLeft - firstOffset - viewport.scrollLeft);
            return currentDistance < nearestDistance ? index : nearest;
          }, 0);
          currentIndex = Math.min(nearestIndex, getMaximumIndex());
          updateControls();
        });
      }, { passive: true });

      resizeUpdates.push(function () { moveTo(currentIndex, "auto"); });
      moveTo(0, "auto");
    });

    serviceCarouselResizeHandler = function () {
      resizeUpdates.forEach(function (update) { update(); });
    };
    window.addEventListener("resize", serviceCarouselResizeHandler, { passive: true });
  }

  function setupCarousels(locale) {
    document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
      const track = carousel.querySelector(".carousel-track");
      const slides = Array.from(carousel.querySelectorAll("[data-slide]"));
      const previousButton = carousel.querySelector("[data-carousel-previous]");
      const nextButton = carousel.querySelector("[data-carousel-next]");
      const status = carousel.querySelector("[data-carousel-status]");
      let currentIndex = 0;

      function updateCarousel() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        slides.forEach(function (slide, index) {
          slide.setAttribute("aria-hidden", String(index !== currentIndex));
        });
        previousButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === slides.length - 1;
        status.textContent = renderCounter(locale.common.imageCounter, currentIndex + 1, slides.length);
      }

      function showPrevious() {
        if (currentIndex > 0) {
          currentIndex -= 1;
          updateCarousel();
        }
      }

      function showNext() {
        if (currentIndex < slides.length - 1) {
          currentIndex += 1;
          updateCarousel();
        }
      }

      previousButton.addEventListener("click", showPrevious);
      nextButton.addEventListener("click", showNext);
      carousel.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          showPrevious();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          showNext();
        }
      });
      updateCarousel();
    });
  }

  function setupRevealAnimations() {
    if (revealObserver) revealObserver.disconnect();
    const revealElements = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      revealElements.forEach(function (element) { element.classList.add("visible"); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    }, { threshold: 0.1 });
    revealElements.forEach(function (element) { revealObserver.observe(element); });
  }

  function detachAuditPromptScrollHandler() {
    if (auditPromptScrollHandler) {
      window.removeEventListener("scroll", auditPromptScrollHandler);
      auditPromptScrollHandler = null;
    }
  }

  function resetAuditPromptVisit() {
    detachAuditPromptScrollHandler();
    const prompt = document.querySelector("[data-audit-prompt]");
    if (prompt) prompt.remove();
    auditPromptSeenInMemory = false;
  }

  function setupAuditScrollPrompt(locale, pageKey) {
    detachAuditPromptScrollHandler();
    if (pageKey !== "home" || auditPromptSeenInMemory || !isAuditOfferActive()) return;

    auditPromptScrollHandler = function () {
      if (window.scrollY < 56 || document.querySelector("[data-audit-prompt]")) return;
      detachAuditPromptScrollHandler();
      auditPromptSeenInMemory = true;

      const prompt = document.createElement("aside");
      prompt.className = "audit-scroll-prompt";
      prompt.dataset.auditPrompt = "";
      prompt.setAttribute("role", "region");
      prompt.setAttribute("aria-labelledby", "auditPromptTitle");
      prompt.setAttribute("aria-describedby", "auditPromptDescription");
      prompt.innerHTML = `<button class="audit-prompt-close" type="button" aria-label="${escapeHtml(locale.home.auditPromptClose)}">×</button><div class="audit-prompt-brand"><img src="assets/logo-mark.svg" alt="" width="42" height="42"><span>${escapeHtml(locale.common.offerDeadline)}</span></div><div class="audit-prompt-kicker">${escapeHtml(locale.common.offerKicker)}</div><h2 id="auditPromptTitle">${escapeHtml(locale.common.offerTitle)}</h2><p id="auditPromptDescription">${escapeHtml(locale.home.auditPromptLead)}</p><a class="audit-prompt-action" href="contacto.html">${escapeHtml(locale.home.auditPromptButton)}</a>`;
      document.body.appendChild(prompt);
      window.requestAnimationFrame(function () { prompt.classList.add("visible"); });

      prompt.querySelector(".audit-prompt-close").addEventListener("click", function () {
        prompt.classList.remove("visible");
        prompt.classList.add("closing");
        window.setTimeout(function () { prompt.remove(); }, 240);
      });
    };
    window.addEventListener("scroll", auditPromptScrollHandler, { passive: true });
  }

  function setupScrollHeader() {
    if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
    scrollHandler = function () {
      const header = document.querySelector(".site-header");
      if (header) header.classList.toggle("scrolled", window.scrollY > 24);
    };
    scrollHandler();
    window.addEventListener("scroll", scrollHandler, { passive: true });
  }

  function updateMetadata(locale, pageKey) {
    document.documentElement.lang = activeLanguage;
    const service = locale.services[pageKey];
    document.title = service
      ? `${service.title} · Hot Host Hospitality`
      : (locale.meta.titles[pageKey] || locale.meta.titles.home);
    const description = service
      ? service.intro
      : (locale.meta.descriptions[pageKey] || locale.meta.descriptions.home);
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description;
  }

  function renderApp(formState) {
    const locale = locales[activeLanguage] || locales.es;
    const pageKey = document.body.dataset.page || "home";
    const services = getServices(locale);
    let content;
    let currentPage = pageKey;

    if (pageKey === "home") content = renderHome(locale, services);
    else if (pageKey === "services") content = renderServices(locale, services);
    else if (pageKey === "about") content = renderAbout(locale);
    else if (pageKey === "contact") content = renderContact(locale);
    else if (locale.services[pageKey]) {
      content = renderServicePage(pageKey, locale);
      currentPage = "services";
    } else {
      content = renderHome(locale, services);
      currentPage = "home";
    }

    updateMetadata(locale, pageKey);
    renderShell(content, currentPage, locale);
    setupShellInteractions(locale);
    setupCredentialsDisclosure();
    setupContactForm(locale, formState);
    setupProcessDialog();
    setupEarningsCalculator(locale);
    setupServiceCarousels(locale);
    setupCarousels(locale);
    setupRevealAnimations();
    setupScrollHeader();
    setupAuditScrollPrompt(locale, pageKey);
  }

  window.addEventListener("pagehide", function () {
    if (document.body.dataset.page === "home") resetAuditPromptVisit();
  });

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted || document.body.dataset.page !== "home") return;
    resetAuditPromptVisit();
    setupAuditScrollPrompt(locales[activeLanguage] || locales.es, "home");
  });

  renderApp(null);
})();
