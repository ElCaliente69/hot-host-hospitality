(function () {
  "use strict";

  const LANGUAGE_STORAGE_KEY = "hotHostLanguage";
  const SUPPORTED_LANGUAGES = ["es", "en", "fr", "it"];
  const WHATSAPP_NUMBER = "34600907716";
  const CONTACT_EMAIL = "direccion@hhosthospitality.com";

  const SERVICE_DEFINITIONS = [
    { key: "gestion-integral", path: "gestion-integral.html", icon: "⌂" },
    { key: "guest-experience", path: "guest-experience.html", icon: "✦" },
    { key: "revenue-management", path: "revenue-management.html", icon: "↗" },
    { key: "check-in-operaciones", path: "check-in-operaciones.html", icon: "⌁" },
    { key: "limpieza-lavanderia", path: "limpieza-lavanderia.html", icon: "◇" },
    { key: "fotografia-profesional", path: "fotografia-profesional.html", icon: "◉" },
    { key: "auditoria-rentabilidad", path: "auditoria-rentabilidad.html", icon: "◎" }
  ];

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
          contact: "Descubre cuánto potencial tiene tu alojamiento con una primera valoración de Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Inicio", services: "Servicios", about: "Sobre Hot Host", contact: "Contacto" },
        assess: "Valorar propiedad",
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
        requestAssessment: "Solicitar valoración",
        ctaEyebrow: "Hablemos claro, sin compromiso",
        ctaTitle: "¿Tu alojamiento podría ganar más y darte bastante menos trabajo?",
        ctaButton: "Vamos a verlo →"
      },
      home: {
        eyebrow: "Gestión hotelera para alojamientos que quieren crecer",
        title: "Más rentabilidad.",
        titleAccent: "Mejores estancias. Menos líos.",
        lead: "Hot Host convierte alojamientos con potencial en operaciones más rentables, memorables y fáciles de llevar, estén donde estén. Nosotros cuidamos el detalle; tú recuperas tiempo y control.",
        discover: "Ver cómo lo hacemos →",
        analyse: "Descubrir mi potencial",
        years: "Años en hospitalidad",
        support: "Atención al huésped",
        starsLabel: "Cinco estrellas",
        experiences: "Experiencias que dejan huella",
        logoAlt: "Logotipo de Hot Host Hospitality con tres haches",
        badge: "Premium con personalidad",
        servicesEyebrow: "Estrategia, operación y hospitalidad",
        servicesTitle: "Todo lo que hace que un alojamiento funcione de verdad.",
        servicesLead: "Hot Host es capaz de vender hielo a una vaca o leche a un esquimal. Pero preferimos vender mejor tu alojamiento: con estrategia, servicio y cero humo.",
        allServices: "Ver todos los servicios",
        methodEyebrow: "Método Hot Host",
        methodTitle: ["La magia existe.", "Pero lleva checklist."],
        methodLead: "Combinamos empatía, tecnología, operación y medición. El huésped siente cercanía; tú conservas el control y recibes bastantes menos mensajes a deshoras.",
        steps: [
          ["Diagnóstico", "Analizamos propiedad, posicionamiento y potencial."],
          ["Diseño", "Definimos operación, estándares y experiencia."],
          ["Ejecución", "Coordinamos huéspedes, calendario y proveedores."],
          ["Optimización", "Medimos, aprendemos y mejoramos continuamente."]
        ]
      },
      servicesPage: {
        eyebrow: "Una solución para cada dolor de cabeza",
        title: ["Gestión que se nota.", "Problemas que dejan de notarse."],
        lead: "Cuidamos la estrategia, la operación y cada detalle de la estancia. Porque publicar un anuncio y cruzar los dedos no cuenta como Revenue Management.",
        stages: ["Atraer", "Convertir", "Cuidar", "Fidelizar"]
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
        credentialsTitle: "Credenciales",
        credentials: [
          "Más de 10 años en hospitalidad",
          "Recepción y operaciones hoteleras",
          "Experiencia entre América y Europa: Caribe y Mediterráneo",
          "Atención en español, inglés, francés e italiano",
          "Booking, Airbnb y pricing dinámico"
        ],
        pillarsEyebrow: "Nuestros pilares",
        pillarsTitle: "Premium, pero humano.",
        pillars: [
          ["♟", "Profesionalidad", "Protocolos claros, comunicación transparente y responsabilidad real."],
          ["♡", "Hospitalidad", "Escuchar, anticipar y resolver con empatía."],
          ["↗", "Rentabilidad", "Cada decisión operativa debe aportar valor sostenible."],
          ["✦", "Personalidad", "Experiencias con chispa, sin convertir el alojamiento en un circo."]
        ],
        voicesEyebrow: "Así debería sentirse",
        voicesTitle: "Voces de la experiencia.",
        voicesLead: "Escenarios ilustrativos del tipo de experiencia que diseñamos; no son reseñas verificadas de clientes.",
        exampleLabel: "Ejemplo ilustrativo",
        quotes: [
          ["“Llegamos tarde y aun así todo fue fácil. Las recomendaciones parecían hechas para nosotros.”", "— Perfil de huésped internacional"],
          ["“El piso estaba impecable y la atención fue mucho más cercana que en otros alojamientos.”", "— Perfil de viaje en pareja"],
          ["“Cuando surgió una incidencia, la resolvieron rápido y sin dramas. Eso también es lujo.”", "— Perfil de viaje familiar"]
        ]
      },
      contact: {
        breadcrumb: "Contacto",
        eyebrow: "Cuéntanos qué tienes entre manos",
        title: "Tu alojamiento puede dar más. Empecemos por entenderlo.",
        heading: "Hablemos de tu propiedad",
        lead: "Cuéntanos lo esencial y prepararemos una valoración clara y concreta. No hace falta una presentación de 40 diapositivas; con datos honestos nos basta.",
        serviceAreaLabel: "Área de servicio",
        serviceArea: "Gestión presencial según proyecto · Coordinación remota internacional",
        emailLabel: "Correo",
        hoursLabel: "Horario comercial",
        hours: "Lunes a viernes · 09:00–19:00"
      },
      form: {
        title: "Solicita una primera valoración",
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
        comments: "Comentarios adicionales",
        optional: "(opcional)",
        commentsPlaceholder: "Objetivos, dudas o cualquier dato relevante...",
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
          comments: "Comentarios"
        }
      },
      services: {
        "gestion-integral": {
          title: "Gestión integral",
          summary: "Tu alojamiento, gestionado de principio a fin con visión hotelera, control operativo y comunicación transparente.",
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
          summary: "Diseñamos estancias memorables, resolvemos necesidades y convertimos pequeños detalles en grandes reseñas.",
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
          summary: "Precios dinámicos basados en demanda, eventos, competencia, ocupación y objetivos reales de rentabilidad.",
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
          summary: "Llegadas fluidas, salidas controladas, coordinación diaria y respuesta rápida ante incidencias.",
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
          summary: "Estándares verificables, coordinación profesional y una presentación impecable entre reservas.",
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
          summary: "Una puesta en escena visual que aumenta el atractivo del anuncio y comunica el valor de la propiedad.",
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
          summary: "Diagnóstico comercial y operativo para detectar fugas, oportunidades y prioridades de mejora.",
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
          contact: "Discover your accommodation's potential with an initial assessment from Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Home", services: "Services", about: "About Hot Host", contact: "Contact" },
        assess: "Assess property",
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
        requestAssessment: "Request an assessment",
        ctaEyebrow: "A straight conversation, no commitment",
        ctaTitle: "Could your accommodation earn more while giving you far less work?",
        ctaButton: "Let's find out →"
      },
      home: {
        eyebrow: "Hotel management for accommodation ready to grow",
        title: "More profit.",
        titleAccent: "Better stays. Fewer headaches.",
        lead: "Hot Host turns promising accommodation into operations that are more profitable, memorable and easier to run, wherever they are. We handle the details; you regain time and control.",
        discover: "See how we do it →",
        analyse: "Discover my potential",
        years: "Years in hospitality",
        support: "Guest support",
        starsLabel: "Five stars",
        experiences: "Experiences that leave a mark",
        logoAlt: "Hot Host Hospitality logo with three letter Hs",
        badge: "Premium with personality",
        servicesEyebrow: "Strategy, operations and hospitality",
        servicesTitle: "Everything that makes accommodation work properly.",
        servicesLead: "Hot Host could sell ice to a cow or milk to an Eskimo. We would rather sell your accommodation better: with strategy, service and no hot air.",
        allServices: "View all services",
        methodEyebrow: "The Hot Host method",
        methodTitle: ["Magic exists.", "But it comes with a checklist."],
        methodLead: "We combine empathy, technology, operations and measurement. Guests feel the personal touch; you stay in control and receive far fewer late-night messages.",
        steps: [
          ["Diagnosis", "We analyse the property, its positioning and its potential."],
          ["Design", "We define operations, standards and the guest experience."],
          ["Delivery", "We coordinate guests, calendars and suppliers."],
          ["Optimisation", "We measure, learn and improve continuously."]
        ]
      },
      servicesPage: {
        eyebrow: "A solution for every operational headache",
        title: ["Management you notice.", "Problems you stop noticing."],
        lead: "We handle strategy, operations and every detail of the stay. Posting a listing and crossing your fingers does not count as Revenue Management.",
        stages: ["Attract", "Convert", "Care", "Build loyalty"]
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
        credentialsTitle: "Credentials",
        credentials: [
          "More than 10 years in hospitality",
          "Hotel reception and operations",
          "Experience across the Americas and Europe: Caribbean and Mediterranean",
          "Service in Spanish, English, French and Italian",
          "Booking, Airbnb and dynamic pricing"
        ],
        pillarsEyebrow: "Our pillars",
        pillarsTitle: "Premium, yet human.",
        pillars: [
          ["♟", "Professionalism", "Clear protocols, transparent communication and genuine accountability."],
          ["♡", "Hospitality", "Listen, anticipate and solve with empathy."],
          ["↗", "Profitability", "Every operational decision should create sustainable value."],
          ["✦", "Personality", "Experiences with a spark, without turning the accommodation into a circus."]
        ],
        voicesEyebrow: "How it should feel",
        voicesTitle: "Voices of the experience.",
        voicesLead: "Illustrative scenarios showing the kind of experience we design; these are not verified customer reviews.",
        exampleLabel: "Illustrative example",
        quotes: [
          ["“We arrived late and everything was still easy. The recommendations felt as though they had been made just for us.”", "— International guest profile"],
          ["“The apartment was spotless and the service felt far more personal than at other accommodation.”", "— Couple travel profile"],
          ["“When an issue came up, they solved it quickly and without drama. That is also luxury.”", "— Family travel profile"]
        ]
      },
      contact: {
        breadcrumb: "Contact",
        eyebrow: "Tell us what you have in mind",
        title: "Your accommodation can do more. Let's understand how.",
        heading: "Let's talk about your property",
        lead: "Share the essentials and we will prepare a clear, focused assessment. No 40-slide presentation required; honest information will do nicely.",
        serviceAreaLabel: "Service area",
        serviceArea: "On-site management by project · International remote coordination",
        emailLabel: "Email",
        hoursLabel: "Business hours",
        hours: "Monday to Friday · 09:00–19:00"
      },
      form: {
        title: "Request an initial assessment",
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
        comments: "Additional comments",
        optional: "(optional)",
        commentsPlaceholder: "Goals, questions or any other relevant information...",
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
          comments: "Comments"
        }
      },
      services: {
        "gestion-integral": {
          title: "Full management",
          summary: "Your accommodation managed from start to finish with hotel expertise, operational control and transparent communication.",
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
          summary: "We design memorable stays, solve needs and turn small details into excellent reviews.",
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
          summary: "Dynamic pricing based on demand, events, competition, occupancy and real profitability targets.",
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
          summary: "Smooth arrivals, controlled departures, daily coordination and a rapid response to issues.",
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
          summary: "Verifiable standards, professional coordination and immaculate presentation between bookings.",
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
          summary: "Visual staging that makes the listing more appealing and communicates the property's value.",
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
          summary: "A commercial and operational diagnosis to identify leakage, opportunities and improvement priorities.",
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
          contact: "Découvrez le potentiel de votre hébergement avec une première évaluation de Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Accueil", services: "Services", about: "À propos de Hot Host", contact: "Contact" },
        assess: "Évaluer le bien",
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
        requestAssessment: "Demander une évaluation",
        ctaEyebrow: "Parlons franchement, sans engagement",
        ctaTitle: "Votre hébergement pourrait-il rapporter plus tout en vous donnant bien moins de travail ?",
        ctaButton: "Vérifions-le →"
      },
      home: {
        eyebrow: "Une gestion hôtelière pour les hébergements qui veulent grandir",
        title: "Plus de rentabilité.",
        titleAccent: "De meilleurs séjours. Moins de tracas.",
        lead: "Hot Host transforme les hébergements prometteurs en opérations plus rentables, mémorables et simples à piloter, où qu’ils se trouvent. Nous soignons les détails ; vous retrouvez du temps et du contrôle.",
        discover: "Voir notre méthode →",
        analyse: "Découvrir mon potentiel",
        years: "Années dans l’hospitalité",
        support: "Assistance voyageurs",
        starsLabel: "Cinq étoiles",
        experiences: "Des expériences qui marquent",
        logoAlt: "Logo Hot Host Hospitality composé de trois lettres H",
        badge: "Premium avec personnalité",
        servicesEyebrow: "Stratégie, opérations et hospitalité",
        servicesTitle: "Tout ce qui fait vraiment fonctionner un hébergement.",
        servicesLead: "Hot Host pourrait vendre de la glace à une vache ou du lait à un Esquimau. Nous préférons mieux vendre votre hébergement : avec stratégie, service et sans poudre aux yeux.",
        allServices: "Voir tous les services",
        methodEyebrow: "Méthode Hot Host",
        methodTitle: ["La magie existe.", "Mais elle suit une checklist."],
        methodLead: "Nous combinons empathie, technologie, opérations et mesure. Le voyageur ressent la proximité ; vous gardez le contrôle et recevez beaucoup moins de messages tard le soir.",
        steps: [
          ["Diagnostic", "Nous analysons le bien, son positionnement et son potentiel."],
          ["Conception", "Nous définissons les opérations, les standards et l’expérience."],
          ["Exécution", "Nous coordonnons voyageurs, calendrier et prestataires."],
          ["Optimisation", "Nous mesurons, apprenons et améliorons en continu."]
        ]
      },
      servicesPage: {
        eyebrow: "Une solution pour chaque casse-tête opérationnel",
        title: ["Une gestion qui se remarque.", "Des problèmes que l’on ne remarque plus."],
        lead: "Nous gérons la stratégie, les opérations et chaque détail du séjour. Publier une annonce et croiser les doigts ne compte pas comme Revenue Management.",
        stages: ["Attirer", "Convertir", "Prendre soin", "Fidéliser"]
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
        credentialsTitle: "Références",
        credentials: [
          "Plus de 10 ans dans l’hospitalité",
          "Réception et opérations hôtelières",
          "Expérience entre les Amériques et l’Europe : Caraïbes et Méditerranée",
          "Service en espagnol, anglais, français et italien",
          "Booking, Airbnb et tarification dynamique"
        ],
        pillarsEyebrow: "Nos piliers",
        pillarsTitle: "Premium, mais humain.",
        pillars: [
          ["♟", "Professionnalisme", "Des protocoles clairs, une communication transparente et une responsabilité réelle."],
          ["♡", "Hospitalité", "Écouter, anticiper et résoudre avec empathie."],
          ["↗", "Rentabilité", "Chaque décision opérationnelle doit créer une valeur durable."],
          ["✦", "Personnalité", "Des expériences pétillantes, sans transformer l’hébergement en cirque."]
        ],
        voicesEyebrow: "Voilà ce que l’on devrait ressentir",
        voicesTitle: "Les voix de l’expérience.",
        voicesLead: "Scénarios illustratifs du type d’expérience que nous concevons ; il ne s’agit pas d’avis clients vérifiés.",
        exampleLabel: "Exemple illustratif",
        quotes: [
          ["« Nous sommes arrivés tard et pourtant tout a été simple. Les recommandations semblaient faites pour nous. »", "— Profil de voyageur international"],
          ["« L’appartement était impeccable et l’accueil bien plus chaleureux que dans d’autres hébergements. »", "— Profil de voyage en couple"],
          ["« Lorsqu’un problème est survenu, il a été résolu vite et sans drame. C’est aussi cela, le luxe. »", "— Profil de voyage en famille"]
        ]
      },
      contact: {
        breadcrumb: "Contact",
        eyebrow: "Dites-nous ce que vous avez entre les mains",
        title: "Votre hébergement peut faire mieux. Commençons par le comprendre.",
        heading: "Parlons de votre bien",
        lead: "Donnez-nous l’essentiel et nous préparerons une évaluation claire et précise. Inutile de prévoir une présentation de 40 diapositives ; des informations sincères nous suffisent.",
        serviceAreaLabel: "Zone de service",
        serviceArea: "Gestion sur place selon le projet · Coordination internationale à distance",
        emailLabel: "E-mail",
        hoursLabel: "Horaires commerciaux",
        hours: "Du lundi au vendredi · 09:00–19:00"
      },
      form: {
        title: "Demandez une première évaluation",
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
        comments: "Commentaires complémentaires",
        optional: "(facultatif)",
        commentsPlaceholder: "Objectifs, questions ou toute autre information utile...",
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
          comments: "Commentaires"
        }
      },
      services: {
        "gestion-integral": {
          title: "Gestion intégrale",
          summary: "Votre hébergement géré de bout en bout avec une vision hôtelière, un contrôle opérationnel et une communication transparente.",
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
          summary: "Nous concevons des séjours mémorables, répondons aux besoins et transformons les petits détails en excellents avis.",
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
          summary: "Tarification dynamique fondée sur la demande, les événements, la concurrence, l’occupation et de vrais objectifs de rentabilité.",
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
          summary: "Des arrivées fluides, des départs maîtrisés, une coordination quotidienne et une réponse rapide aux incidents.",
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
          summary: "Des standards vérifiables, une coordination professionnelle et une présentation impeccable entre les réservations.",
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
          summary: "Une mise en scène visuelle qui renforce l’attrait de l’annonce et communique la valeur du bien.",
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
          summary: "Un diagnostic commercial et opérationnel pour détecter les fuites, les opportunités et les priorités d’amélioration.",
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
          contact: "Scopri il potenziale del tuo alloggio con una prima valutazione di Hot Host Hospitality."
        }
      },
      shell: {
        nav: { home: "Home", services: "Servizi", about: "Chi è Hot Host", contact: "Contatti" },
        assess: "Valuta la proprietà",
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
        requestAssessment: "Richiedi una valutazione",
        ctaEyebrow: "Parliamone con chiarezza, senza impegno",
        ctaTitle: "Il tuo alloggio potrebbe rendere di più e darti molto meno lavoro?",
        ctaButton: "Scopriamolo →"
      },
      home: {
        eyebrow: "Gestione alberghiera per alloggi che vogliono crescere",
        title: "Più redditività.",
        titleAccent: "Soggiorni migliori. Meno pensieri.",
        lead: "Hot Host trasforma gli alloggi con potenziale in operazioni più redditizie, memorabili e facili da gestire, ovunque si trovino. Noi curiamo i dettagli; tu recuperi tempo e controllo.",
        discover: "Scopri come lavoriamo →",
        analyse: "Scopri il mio potenziale",
        years: "Anni nell’ospitalità",
        support: "Assistenza agli ospiti",
        starsLabel: "Cinque stelle",
        experiences: "Esperienze che lasciano il segno",
        logoAlt: "Logo Hot Host Hospitality con tre lettere H",
        badge: "Premium con personalità",
        servicesEyebrow: "Strategia, operazioni e ospitalità",
        servicesTitle: "Tutto ciò che fa funzionare davvero un alloggio.",
        servicesLead: "Hot Host saprebbe vendere ghiaccio a una mucca o latte a un eschimese. Preferiamo vendere meglio il tuo alloggio: con strategia, servizio e zero fumo.",
        allServices: "Vedi tutti i servizi",
        methodEyebrow: "Metodo Hot Host",
        methodTitle: ["La magia esiste.", "Ma richiede una checklist."],
        methodLead: "Uniamo empatia, tecnologia, operazioni e misurazione. L’ospite percepisce vicinanza; tu mantieni il controllo e ricevi molti meno messaggi a tarda notte.",
        steps: [
          ["Diagnosi", "Analizziamo proprietà, posizionamento e potenziale."],
          ["Progettazione", "Definiamo operazioni, standard ed esperienza."],
          ["Esecuzione", "Coordiniamo ospiti, calendario e fornitori."],
          ["Ottimizzazione", "Misuriamo, impariamo e miglioriamo continuamente."]
        ]
      },
      servicesPage: {
        eyebrow: "Una soluzione per ogni grattacapo operativo",
        title: ["Una gestione che si nota.", "Problemi che smetti di notare."],
        lead: "Curiamo strategia, operazioni e ogni dettaglio del soggiorno. Pubblicare un annuncio e incrociare le dita non è Revenue Management.",
        stages: ["Attrarre", "Convertire", "Prendersi cura", "Fidelizzare"]
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
        credentialsTitle: "Credenziali",
        credentials: [
          "Oltre 10 anni nell’ospitalità",
          "Reception e operazioni alberghiere",
          "Esperienza tra le Americhe e l’Europa: Caraibi e Mediterraneo",
          "Assistenza in spagnolo, inglese, francese e italiano",
          "Booking, Airbnb e pricing dinamico"
        ],
        pillarsEyebrow: "I nostri pilastri",
        pillarsTitle: "Premium, ma umano.",
        pillars: [
          ["♟", "Professionalità", "Protocolli chiari, comunicazione trasparente e responsabilità reale."],
          ["♡", "Ospitalità", "Ascoltare, anticipare e risolvere con empatia."],
          ["↗", "Redditività", "Ogni decisione operativa deve creare valore sostenibile."],
          ["✦", "Personalità", "Esperienze vivaci, senza trasformare l’alloggio in un circo."]
        ],
        voicesEyebrow: "Ecco come dovrebbe sentirsi",
        voicesTitle: "Voci dell’esperienza.",
        voicesLead: "Scenari illustrativi del tipo di esperienza che progettiamo; non sono recensioni verificate di clienti.",
        exampleLabel: "Esempio illustrativo",
        quotes: [
          ["«Siamo arrivati tardi, eppure è stato tutto semplice. I consigli sembravano pensati apposta per noi.»", "— Profilo di ospite internazionale"],
          ["«L’appartamento era impeccabile e l’assistenza molto più personale rispetto ad altri alloggi.»", "— Profilo di viaggio in coppia"],
          ["«Quando si è verificato un problema, lo hanno risolto rapidamente e senza drammi. Anche questo è lusso.»", "— Profilo di viaggio in famiglia"]
        ]
      },
      contact: {
        breadcrumb: "Contatti",
        eyebrow: "Raccontaci cosa hai tra le mani",
        title: "Il tuo alloggio può dare di più. Iniziamo a capirlo.",
        heading: "Parliamo della tua proprietà",
        lead: "Raccontaci l’essenziale e prepareremo una valutazione chiara e concreta. Non servono 40 slide; bastano informazioni sincere.",
        serviceAreaLabel: "Area di servizio",
        serviceArea: "Gestione in loco in base al progetto · Coordinamento internazionale da remoto",
        emailLabel: "E-mail",
        hoursLabel: "Orario commerciale",
        hours: "Da lunedì a venerdì · 09:00–19:00"
      },
      form: {
        title: "Richiedi una prima valutazione",
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
        comments: "Commenti aggiuntivi",
        optional: "(facoltativo)",
        commentsPlaceholder: "Obiettivi, domande o qualsiasi altra informazione utile...",
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
          comments: "Commenti"
        }
      },
      services: {
        "gestion-integral": {
          title: "Gestione completa",
          summary: "Il tuo alloggio gestito dall’inizio alla fine con visione alberghiera, controllo operativo e comunicazione trasparente.",
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
          summary: "Progettiamo soggiorni memorabili, rispondiamo alle esigenze e trasformiamo piccoli dettagli in ottime recensioni.",
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
          summary: "Prezzi dinamici basati su domanda, eventi, concorrenza, occupazione e obiettivi reali di redditività.",
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
          summary: "Arrivi fluidi, partenze controllate, coordinamento quotidiano e risposta rapida ai problemi.",
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
          summary: "Standard verificabili, coordinamento professionale e presentazione impeccabile tra una prenotazione e l’altra.",
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
          summary: "Una presentazione visiva che aumenta l’attrattiva dell’annuncio e comunica il valore della proprietà.",
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
          summary: "Una diagnosi commerciale e operativa per individuare perdite, opportunità e priorità di miglioramento.",
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

  const HTML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  let activeLanguage = getInitialLanguage();
  let revealObserver = null;
  let scrollHandler = null;

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

  function renderLines(lines) {
    return lines.map(escapeHtml).join("<br>");
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

  function renderServiceCard(service, locale) {
    return `<article class="card reveal"><div class="icon">${escapeHtml(service.icon)}</div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.summary)}</p><a class="card-link" href="${escapeHtml(service.path)}">${escapeHtml(locale.common.exploreService)}</a></article>`;
  }

  function renderServiceRow(service, locale) {
    return `<article class="service-row reveal"><div class="icon">${escapeHtml(service.icon)}</div><div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.summary)}</p></div><a class="btn ghost" href="${escapeHtml(service.path)}">${escapeHtml(locale.common.viewDetail)}</a></article>`;
  }

  function renderCta(locale) {
    return `<section class="section"><div class="wrap"><div class="cta"><div><div class="eyebrow">${escapeHtml(locale.common.ctaEyebrow)}</div><h2>${escapeHtml(locale.common.ctaTitle)}</h2></div><a class="btn primary" style="background:#e7c46a;color:#171717;border-color:#e7c46a" href="contacto.html">${escapeHtml(locale.common.ctaButton)}</a></div></div></section>`;
  }

  function renderHome(locale, services) {
    const home = locale.home;
    const steps = home.steps.map(function (step, index) {
      return `<article class="step"><span class="step-num">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(step[0])}</h3><p>${escapeHtml(step[1])}</p></article>`;
    }).join("");

    return `<main class="home-page">
      <section class="hero hero-luxe"><div class="wrap hero-luxe-grid"><div class="hero-copy"><div class="eyebrow">${escapeHtml(home.eyebrow)}</div><h1>${escapeHtml(home.title)}<span>${escapeHtml(home.titleAccent)}</span></h1><p class="lead">${escapeHtml(home.lead)}</p><div class="hero-actions"><a class="btn primary" href="servicios.html">${escapeHtml(home.discover)}</a><a class="btn ghost" href="contacto.html">${escapeHtml(home.analyse)}</a></div><div class="hero-proof"><div><strong>10+</strong><span>${escapeHtml(home.years)}</span></div><div><strong>24/7</strong><span>${escapeHtml(home.support)}</span></div><div class="hero-rating"><strong aria-label="${escapeHtml(home.starsLabel)}">★★★★★</strong><span>${escapeHtml(home.experiences)}</span></div></div></div><div class="hero-brand-visual"><img src="assets/logo-3h.png" alt="${escapeHtml(home.logoAlt)}" width="1254" height="1254" fetchpriority="high"><div class="visual-badge">${escapeHtml(home.badge)}</div></div></div></section>
      <section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(home.servicesEyebrow)}</div><h2>${escapeHtml(home.servicesTitle)}</h2></div><p>${escapeHtml(home.servicesLead)}</p></div><div class="grid grid-3">${services.map(function (service) { return renderServiceCard(service, locale); }).join("")}</div><div style="text-align:center;margin-top:34px"><a class="btn ghost" href="servicios.html">${escapeHtml(home.allServices)}</a></div></div></section>
      <section class="section soft"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(home.methodEyebrow)}</div><h2>${renderLines(home.methodTitle)}</h2></div><p>${escapeHtml(home.methodLead)}</p></div><div class="grid grid-4">${steps}</div></div></section>
      ${renderCta(locale)}
    </main>`;
  }

  function renderServices(locale, services) {
    const page = locale.servicesPage;
    const stages = page.stages.map(function (stage, index) {
      return `<div class="info-node"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(stage)}</div>`;
    }).join("");
    return `<main><section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / ${escapeHtml(locale.common.services)}</div><div class="eyebrow">${escapeHtml(page.eyebrow)}</div><h1>${renderLines(page.title)}</h1><p class="lead">${escapeHtml(page.lead)}</p><div class="infographic">${stages}</div></div></section><section class="section"><div class="wrap">${services.map(function (service) { return renderServiceRow(service, locale); }).join("")}</div></section>${renderCta(locale)}</main>`;
  }

  function renderAbout(locale) {
    const about = locale.about;
    const prose = about.prose.map(function (section) {
      return `<h2>${escapeHtml(section.title)}</h2>${section.paragraphs.map(function (paragraph) { return `<p>${escapeHtml(paragraph)}</p>`; }).join("")}`;
    }).join("");
    const credentials = about.credentials.map(function (credential) {
      return `<li>${escapeHtml(credential)}</li>`;
    }).join("");
    const pillars = about.pillars.map(function (pillar) {
      return `<article class="card"><div class="icon">${escapeHtml(pillar[0])}</div><h3>${escapeHtml(pillar[1])}</h3><p>${escapeHtml(pillar[2])}</p></article>`;
    }).join("");
    const quotes = about.quotes.map(function (quote) {
      return `<article class="quote"><span class="label-demo">${escapeHtml(about.exampleLabel)}</span><blockquote>${escapeHtml(quote[0])}</blockquote><small>${escapeHtml(quote[1])}</small></article>`;
    }).join("");

    return `<main>
      <section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / ${escapeHtml(about.breadcrumb)}</div><div class="eyebrow">${escapeHtml(about.eyebrow)}</div><h1>${renderLines(about.title)}</h1><p class="lead">${escapeHtml(about.lead)}</p></div></section>
      <section class="section"><div class="wrap service-detail"><div class="prose">${prose}</div><aside class="side-panel"><h3>${escapeHtml(about.credentialsTitle)}</h3><ul>${credentials}</ul></aside></div></section>
      <section class="section soft"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(about.pillarsEyebrow)}</div><h2>${escapeHtml(about.pillarsTitle)}</h2></div></div><div class="grid grid-4">${pillars}</div></div></section>
      <section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">${escapeHtml(about.voicesEyebrow)}</div><h2>${escapeHtml(about.voicesTitle)}</h2></div><p>${escapeHtml(about.voicesLead)}</p></div><div class="grid grid-3">${quotes}</div></div></section>
      ${renderCta(locale)}
    </main>`;
  }

  function renderContact(locale) {
    const contact = locale.contact;
    const form = locale.form;
    return `<main>
      <section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / ${escapeHtml(contact.breadcrumb)}</div><div class="eyebrow">${escapeHtml(contact.eyebrow)}</div><h1>${escapeHtml(contact.title)}</h1></div></section>
      <section class="section"><div class="wrap contact-grid"><div><h2>${escapeHtml(contact.heading)}</h2><p class="lead">${escapeHtml(contact.lead)}</p><div class="contact-item"><small>${escapeHtml(contact.serviceAreaLabel)}</small><strong>${escapeHtml(contact.serviceArea)}</strong></div><div class="contact-item"><small>${escapeHtml(contact.emailLabel)}</small><strong>${escapeHtml(CONTACT_EMAIL)}</strong></div><div class="contact-item"><small>WhatsApp</small><strong>+34 600 907 716</strong></div><div class="contact-item"><small>${escapeHtml(contact.hoursLabel)}</small><strong>${escapeHtml(contact.hours)}</strong></div></div>
      <form class="contact-form" id="contactForm" novalidate><h3>${escapeHtml(form.title)}</h3>
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
        <div class="field" id="photosUrlField" hidden><label for="photosUrl">${escapeHtml(form.photosUrl)}</label><input id="photosUrl" name="photosUrl" type="url" placeholder="${escapeHtml(form.photosPlaceholder)}" aria-describedby="photosHelp"><small class="field-help" id="photosHelp">${escapeHtml(form.photosHelp)}</small></div>
        <div class="field"><label for="message">${escapeHtml(form.comments)} <span style="font-weight:400">${escapeHtml(form.optional)}</span></label><textarea id="message" name="message" placeholder="${escapeHtml(form.commentsPlaceholder)}"></textarea></div>
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
    const benefits = service.benefits.map(function (benefit) {
      return `<li>✓ ${escapeHtml(benefit)}</li>`;
    }).join("");
    return `<main><section class="page-hero"><div class="wrap"><div class="breadcrumb"><a href="index.html">${escapeHtml(locale.common.home)}</a> / <a href="servicios.html">${escapeHtml(locale.common.services)}</a> / ${escapeHtml(service.title)}</div><div class="eyebrow">${escapeHtml(service.tag)}</div><h1>${escapeHtml(service.title)}</h1><p class="lead">${escapeHtml(service.intro)}</p></div></section><section class="section"><div class="wrap service-detail"><article class="prose">${renderServiceContent(service.content)}</article><aside class="side-panel"><div class="icon">${escapeHtml(definition.icon)}</div><h3>${escapeHtml(locale.common.includes)}</h3><ul>${benefits}</ul><a class="btn primary" style="margin-top:18px;width:100%;background:#e7c46a;color:#171717" href="contacto.html">${escapeHtml(locale.common.requestAssessment)}</a></aside></div></section>${renderCta(locale)}</main>`;
  }

  function renderBrand() {
    return `<a class="brand" href="index.html"><span class="brand-mark">HHH</span><span>HOT HOST<small>HOSPITALITY</small></span></a>`;
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
    const nav = navItems.map(function (item) {
      return `<a href="${item[0]}"${currentPage === item[2] ? " aria-current=\"page\"" : ""}>${escapeHtml(item[1])}</a>`;
    }).join("");
    const services = getServices(locale);

    document.body.innerHTML = `<header class="site-header"><nav class="wrap nav">${renderBrand()}<div class="nav-links">${nav}</div><div class="nav-controls"><div class="language-switcher"><select id="languageSelect" class="language-select" aria-label="${escapeHtml(locale.shell.languageLabel)}">${languageOptions}</select></div><button class="menu-btn" type="button" aria-label="${escapeHtml(locale.shell.openMenu)}" aria-expanded="false">☰</button></div><a class="nav-cta" href="contacto.html">${escapeHtml(locale.shell.assess)}</a></nav></header>${content}<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div>${renderBrand()}<p style="max-width:420px;color:#999;margin-top:18px">${escapeHtml(locale.shell.footerText)}</p></div><div><h3>${escapeHtml(locale.shell.explore)}</h3><a href="servicios.html">${escapeHtml(locale.shell.nav.services)}</a><a href="sobre-hot-host.html">${escapeHtml(locale.shell.nav.about)}</a><a href="contacto.html">${escapeHtml(locale.shell.nav.contact)}</a></div><div><h3>${escapeHtml(locale.shell.services)}</h3><a href="${services[0].path}">${escapeHtml(services[0].title)}</a><a href="${services[1].path}">${escapeHtml(services[1].title)}</a><a href="${services[2].path}">${escapeHtml(services[2].title)}</a></div></div><div class="copyright"><span>© 2026 Hot Host Hospitality</span><span>${escapeHtml(locale.shell.location)}</span></div></div></footer>`;
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
    new FormData(form).forEach(function (value, key) {
      state[key] = String(value);
    });
    return state;
  }

  function restoreFormState(form, state) {
    if (!state) return;
    Object.keys(state).forEach(function (name) {
      const control = form.elements.namedItem(name);
      if (control && typeof control.value === "string") control.value = state[name];
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
      setConditionalField(form.querySelector("#photosUrlField"), form.querySelector("#photosUrl"), touristRental.value === "no");
    }

    function validateControl(control) {
      if (!control || !control.willValidate) return true;
      const messages = locale.form.validation;
      control.setCustomValidity("");
      const value = String(control.value || "").trim();

      if (control.required && !value) {
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
    form.addEventListener("input", function (event) {
      validateControl(event.target);
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

    form.addEventListener("submit", function (event) {
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
        data.get("photosUrl") ? `${labels.photosUrl}: ${String(data.get("photosUrl")).trim()}` : "",
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
      const messageWindow = window.open("about:blank", "_blank");
      delete status.dataset.kind;

      if (messageWindow) {
        messageWindow.opener = null;
        messageWindow.location.replace(targetUrl);
        status.textContent = openedMessage;
      } else {
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
    menuButton.addEventListener("click", function () {
      const isOpen = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? locale.shell.closeMenu : locale.shell.openMenu);
    });

    document.querySelector("#languageSelect").addEventListener("change", function (event) {
      const nextLanguage = normalizeLanguage(event.target.value);
      if (!nextLanguage || nextLanguage === activeLanguage) return;
      const formState = captureFormState();
      activeLanguage = nextLanguage;
      saveLanguage(activeLanguage);
      renderApp(formState);
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
    setupContactForm(locale, formState);
    setupRevealAnimations();
    setupScrollHeader();
  }

  renderApp(null);
})();
