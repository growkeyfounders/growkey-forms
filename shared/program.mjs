// Config del programa Agentic Skool + helpers puros de fechas.
// Sin dependencias. Compartido entre server.mjs y la SPA.
// Editar este archivo = editar el programa (fases, hitos, clases, checklists).

export const MS_DAY = 86_400_000;

export const PROGRAM = {
  "totalDays": 112,
  "goal": "Construye tu marca personal, valida tu oferta y consigue tus primeras ventas",
  "phases": [
    {
      "id": 1,
      "name": "Oferta y Contenido",
      "headline": "Defines tu nicho, tu oferta espejo y montas tu sistema de contenido",
      "startDay": 0,
      "endDay": 21,
      "milestones": [
        {
          "day": 1,
          "title": "Llamada 1 — Onboarding",
          "type": "call"
        },
        {
          "day": 19,
          "title": "Oferta lista y validada",
          "type": "hero"
        },
        {
          "day": 20,
          "title": "Llamada 2 — Weekly 1",
          "type": "call"
        }
      ],
      "classes": [
        {
          "id": "c1-compendio-fundacional-1",
          "title": "Compendio Fundacional: la tríada Nicho-Servicio-Oferta y la tubería Atracción→Nutrición→Conversión→Onboarding→Servicio→Offboarding",
          "url": ""
        },
        {
          "id": "c1-onboarding-del-program-2",
          "title": "Onboarding del programa: cómo funcionan las 16 semanas, fases y criterios de salida",
          "url": ""
        },
        {
          "id": "c1-nicho-en-profundidad-p-3",
          "title": "Nicho en profundidad: Paradigma del Arca, Especialista vs Generalista, falacia de las 7 fuentes",
          "url": ""
        },
        {
          "id": "c1-remando-el-bote-buffet-4",
          "title": "Remando el Bote (Buffett): elegir bien el negocio antes de remar",
          "url": ""
        },
        {
          "id": "c1-checklist-de-selecci-n-5",
          "title": "Checklist de Selección de Nicho (12 criterios: 5 condicionales + 7 generales)",
          "url": ""
        },
        {
          "id": "c1-ciclos-viciosos-vs-vir-6",
          "title": "Ciclos viciosos vs virtuosos de precio-percepción",
          "url": ""
        },
        {
          "id": "c1-ndice-de-complejidad-o-7",
          "title": "Índice de Complejidad Operativa (ICO) e Índice de Eficiencia (IEN): menos es más",
          "url": ""
        },
        {
          "id": "c1-selecci-n-de-nicho-err-8",
          "title": "Selección de nicho: errores comunes (competencia, saturación, objeto brillante)",
          "url": ""
        },
        {
          "id": "c1-investigaci-n-del-nich-9",
          "title": "Investigación del Nicho de Mercado: cómo entrevistar y construir el Avatar",
          "url": ""
        },
        {
          "id": "c1-m-todos-de-aceleraci-n-10",
          "title": "Métodos de aceleración: llamadas al nicho, grupos/foros, escuchar objeciones",
          "url": ""
        },
        {
          "id": "c1-cierre-del-avatar-comp-11",
          "title": "Cierre del Avatar: compilar patrones de las 10 entrevistas en un cliente ideal",
          "url": ""
        },
        {
          "id": "c1-condiciones-latentes-e-12",
          "title": "Condiciones latentes: el modelo del pozo petrolero (perforar bolsas de presión)",
          "url": ""
        },
        {
          "id": "c1-estaciones-de-radio-ps-13",
          "title": "Estaciones de radio psicológicas y frecuencia: mapear emociones/palabras que disparan reacción",
          "url": ""
        },
        {
          "id": "c1-palabras-pozo-c-mo-art-14",
          "title": "Palabras-pozo: cómo articular lo que el nicho siente pero no dice",
          "url": ""
        },
        {
          "id": "c1-arquitectura-de-conten-15",
          "title": "Arquitectura de contenido: los 3 pilares (Valor / Autoridad / Nicho) + historias",
          "url": ""
        },
        {
          "id": "c1-corto-vs-largo-cu-ndo-16",
          "title": "Corto vs largo: cuándo usar cada formato y cómo medir por leads/agendas",
          "url": ""
        },
        {
          "id": "c1-estructura-de-comunica-17",
          "title": "Estructura de comunicación resonante: Quién soy + A quién ayudo + Qué resuelvo + Diferencial + CTA",
          "url": ""
        },
        {
          "id": "c1-an-lisis-de-bios-ejemp-18",
          "title": "Análisis de bios ejemplares (Matías Sánchez / Ramiro Cubría)",
          "url": ""
        },
        {
          "id": "c1-c-mo-grabar-editar-con-19",
          "title": "Cómo grabar/editar contenido nativo de plataforma sin fricción (corto + historia)",
          "url": ""
        },
        {
          "id": "c1-calendario-editorial-c-20",
          "title": "Calendario editorial: cadencia 4-5 cortos/sem + historia diaria + 1 largo/sem",
          "url": ""
        },
        {
          "id": "c1-la-oferta-como-motor-c-21",
          "title": "La Oferta como motor cardinal: 6 pilares (Impulso>Meta>Problema>Dolor>Acción>Confianza)",
          "url": ""
        },
        {
          "id": "c1-las-3-fuentes-de-confi-22",
          "title": "Las 3 fuentes de confianza (oferta 80% / convicción / clientes)",
          "url": ""
        },
        {
          "id": "c1-5-fuentes-de-dolor-y-a-23",
          "title": "5 fuentes de dolor y amplificación indirecta (preguntas retóricas, consecuencias, seriedad)",
          "url": ""
        },
        {
          "id": "c1-umbral-de-acci-n-dolor-24",
          "title": "Umbral de acción: (Dolor%+Confianza%)/2",
          "url": ""
        },
        {
          "id": "c1-composici-n-de-la-ofer-25",
          "title": "Composición de la oferta: 7 elementos (Resultado, Tiempo, Método, Secretos, Seguro, Polarizar, Precio)",
          "url": ""
        },
        {
          "id": "c1-3-formatos-mensaje-cor-26",
          "title": "3 formatos: mensaje corto, mensaje largo, pitch",
          "url": ""
        },
        {
          "id": "c1-desajuste-valor-precio-27",
          "title": "Desajuste valor-precio: el precio comunica valor (3-10x)",
          "url": ""
        },
        {
          "id": "c1-estructuras-de-oferta-28",
          "title": "Estructuras de oferta: Escalera vs Cebolla vs Única — cuál usar al inicio",
          "url": ""
        },
        {
          "id": "c1-resonancia-redactar-la-29",
          "title": "Resonancia: redactar la BIO resonante (fórmula completa) y desplegarla en todos los canales",
          "url": ""
        },
        {
          "id": "c1-coherencia-multicanal-30",
          "title": "Coherencia multicanal (IG/LinkedIn/web/email)",
          "url": ""
        },
        {
          "id": "c1-mindset-ciclo-paradigm-31",
          "title": "Mindset: ciclo Paradigma→Resultado y cambio de lentes (incomodidad necesaria)",
          "url": ""
        },
        {
          "id": "c1-precio-10x-valor-10x-c-32",
          "title": "Precio 10x = valor 10x como comunicación",
          "url": ""
        },
        {
          "id": "c1-oferta-espejo-alinear-33",
          "title": "Oferta Espejo: alinear incentivos (ganas solo si el cliente gana)",
          "url": ""
        },
        {
          "id": "c1-garant-as-temporal-vs-34",
          "title": "Garantías: temporal vs monetaria, reversión de riesgo",
          "url": ""
        },
        {
          "id": "c1-validaci-n-de-resonanc-35",
          "title": "Validación de resonancia: cómo mostrar la bio/oferta al nicho y leer reacción real",
          "url": ""
        },
        {
          "id": "c1-escala-1-10-de-resonan-36",
          "title": "Escala 1-10 de resonancia",
          "url": ""
        },
        {
          "id": "c1-checklist-pre-launch-d-37",
          "title": "Checklist Pre-Launch de Oferta (15 items: problema validado, servicio, precio, garantía, casos)",
          "url": ""
        },
        {
          "id": "c1-auditor-a-de-tuber-a-d-38",
          "title": "Auditoría de tubería: dónde caen los leads",
          "url": ""
        },
        {
          "id": "c1-repaso-de-fase-1-y-pre-39",
          "title": "Repaso de Fase 1 y preparación para outbound: qué necesita estar listo antes del primer DM",
          "url": ""
        },
        {
          "id": "c1-c-mo-el-contenido-sube-40",
          "title": "Cómo el contenido sube PRR/ABR del DM en frío",
          "url": ""
        }
      ],
      "baseTasks": [
        {
          "id": "t1-d1",
          "title": "Responder Por Qué (propósito) / Cómo (vehículo) / Qué (resultado) en 1 página + Asistir a la llamada de Onboarding y recopilar todos los accesos → Documento de fundaciones (Por qué/Cómo/Qué) + accesos confirmados",
          "mission": "Define tu propósito y vehículo",
          "week": 1,
          "suggestedDay": 1,
          "classId": "c1-compendio-fundacional-1"
        },
        {
          "id": "t1-d2",
          "title": "Ejercicio del Bote: describir tu bote actual, fallas de fábrica, bote ideal + Elegir 1 nicho específico candidato (rol + reto, no 'coaching general') → Análisis del Bote (1 pág) + nicho candidato escrito",
          "mission": "Elige tu nicho",
          "week": 1,
          "suggestedDay": 2,
          "classId": "c1-nicho-en-profundidad-p-3"
        },
        {
          "id": "t1-d3",
          "title": "Completar el Checklist de Selección de Nicho (Google Sheets) y mapear el ciclo de precio → veredicto GO/NO-GO + diagnóstico de ciclo + Calcular ICO base (<1.5) e IEN con la calculadora e identificar 1 multiplicador a reducir → Checklist con GO/NO-GO + ICO/IEN calculados con diagnóstico y reducción propuesta",
          "mission": "Valida tu nicho: GO/NO-GO",
          "week": 1,
          "suggestedDay": 3,
          "classId": "c1-checklist-de-selecci-n-5"
        },
        {
          "id": "t1-d4",
          "title": "Agendar y arrancar 10 entrevistas (15-20 min) con personas del nicho; pregunta gatillo: '¿Cuál es tu problema más doloroso en [área]?' + Llenar tabla de respuestas (problema, gasto actual, soluciones probadas, por qué fallan) → Mínimo 3-5 entrevistas hechas el primer día + tabla de respuestas iniciada",
          "mission": "Arranca 10 entrevistas",
          "week": 1,
          "suggestedDay": 4,
          "classId": "c1-investigaci-n-del-nich-9"
        },
        {
          "id": "t1-d5",
          "title": "Acelerar entrevistas con llamadas al nicho, grupos/foros y escucha de objeciones + Listar 5-10 condiciones latentes con citas textuales del nicho → Avance hacia las 10 entrevistas + lista preliminar de 5-10 condiciones latentes con citas",
          "mission": "Escucha dolores y objeciones",
          "week": 1,
          "suggestedDay": 5,
          "classId": "c1-condiciones-latentes-e-12"
        },
        {
          "id": "t1-d8",
          "title": "Completar las 10 entrevistas y documentar el Avatar (nombre, edad, ingresos, problema #1/#2/#3, lenguaje, dónde encontrarlo) + Consolidar las condiciones latentes con sus citas → Avatar de Cliente Ideal (1 pág) + lista de 5-10 condiciones latentes cerrada",
          "mission": "Construye tu Avatar",
          "week": 2,
          "suggestedDay": 8,
          "classId": "c1-cierre-del-avatar-comp-11"
        },
        {
          "id": "t1-d9",
          "title": "Agrupar las condiciones latentes por tema y priorizar las 3 principales + Extraer 10-15 palabras/frases exactas del nicho (keywords resonantes) → Matriz de condiciones latentes (Condición→Emoción→Síntoma→Palabra resonante)",
          "mission": "Mapea condiciones latentes",
          "week": 2,
          "suggestedDay": 9,
          "classId": "c1-estaciones-de-radio-ps-13"
        },
        {
          "id": "t1-d10",
          "title": "Definir tus 3 pilares editoriales con 2 ejemplos cada uno y construir banco de 15-20 ideas derivadas de condiciones latentes/palabras-pozo + Analizar 5-10 bios reales del nicho línea por línea (¿condición latente? ¿prueba social? ¿CTA?) → Documento de pilares + banco de 15-20 ideas etiquetadas + análisis de bios",
          "mission": "Define tus 3 pilares",
          "week": 2,
          "suggestedDay": 10,
          "classId": "c1-arquitectura-de-conten-15"
        },
        {
          "id": "t1-d11",
          "title": "Redactar 3 borradores de pieza corta (1 por pilar) usando palabras-pozo + Publicar las 2 primeras piezas reales, armar el calendario editorial de 4 semanas y configurar sistema de medición de leads/agendas por pieza (etiqueta en sheet) → 3 borradores + 2 piezas publicadas + calendario editorial + sheet de medición",
          "mission": "Publica tus 2 piezas",
          "week": 2,
          "suggestedDay": 11,
          "classId": "c1-c-mo-grabar-editar-con-19"
        },
        {
          "id": "t1-d12",
          "title": "Mapear los 6 pilares en tu oferta (cuantificar confianza: oferta% / fe% / casos%) + Publicar pieza de Valor del día → 6 pilares mapeados (1 pág) + 1 pieza Valor publicada",
          "mission": "Mapea tu oferta",
          "week": 2,
          "suggestedDay": 12,
          "classId": "c1-la-oferta-como-motor-c-21"
        },
        {
          "id": "t1-d15",
          "title": "Escribir 5 preguntas retóricas que amplifiquen el dolor sin decir 'sufres' + Redactar los 7 elementos de tu oferta en mensaje corto / largo / pitch + Publicar pieza de Nicho del día (usar 1 pregunta de dolor como hook) → Script de 5 preguntas de dolor + Oferta de 7 elementos en 3 formatos + 1 pieza Nicho publicada",
          "mission": "Escribe tu oferta",
          "week": 3,
          "suggestedDay": 15,
          "classId": "c1-composici-n-de-la-ofer-25"
        },
        {
          "id": "t1-d16",
          "title": "Calcular valor generado y definir precio con ratio 3-10x + Diseñar tu oferta en los 3 formatos (escalera/cebolla/única) y elegir el de tu etapa + Publicar pieza de Autoridad del día → Análisis valor-precio + decisión de estructura de oferta justificada + 1 pieza Autoridad publicada",
          "mission": "Pon precio a tu oferta",
          "week": 3,
          "suggestedDay": 16,
          "classId": "c1-desajuste-valor-precio-27"
        },
        {
          "id": "t1-d17",
          "title": "Redactar bio resonante (máx 3 líneas: público+descriptor+condición latente+diferencial+prueba social+CTA) + Publicar primera pieza LARGA de la semana y desplegar la bio en todos los perfiles → Bio resonante desplegada en todos los canales + 1 pieza larga publicada",
          "mission": "Lanza tu bio resonante",
          "week": 3,
          "suggestedDay": 17,
          "classId": "c1-resonancia-redactar-la-29"
        },
        {
          "id": "t1-d18",
          "title": "Carta de compromiso de cambio de lentes (paradigma viejo→nuevo + 3 acciones incómodas) + Diseñar el Canvas de Oferta Espejo (qué logra el cliente / tu riesgo / precio / bolsa de presión / diferenciador) + Publicar pieza del día → Carta de compromiso firmada + Canvas de Oferta Espejo (1 pág) + 1 pieza publicada",
          "mission": "Diseña tu Oferta Espejo",
          "week": 3,
          "suggestedDay": 18,
          "classId": "c1-oferta-espejo-alinear-33"
        },
        {
          "id": "t1-d19",
          "title": "Mostrar bio + oferta a 3-5 personas del nicho (no amigos); registrar reacción buscando '¡esto es para mí!' + Completar el Checklist Pre-Launch, cerrar gaps y mapear la tubería ideal con 3 cuellos de botella + Publicar pieza larga y preparar checklist de salida para la Weekly 1:1 → Fase 1 cerrada: oferta validada (3-5 reacciones) + Checklist Pre-Launch completo + tubería con 3 cuellos; avatar+bio+contenido listos para la Weekly 1:1",
          "mission": "Oferta validada",
          "week": 3,
          "suggestedDay": 19,
          "classId": "c1-validaci-n-de-resonanc-35"
        }
      ],
      "requiredForms": []
    },
    {
      "id": 2,
      "name": "Primeras Ventas",
      "headline": "Tu motor de DM en frío trae las primeras llamadas y tus primeras ventas",
      "startDay": 21,
      "endDay": 49,
      "milestones": [
        {
          "day": 36,
          "title": "Llamada 3 — Weekly / Feedback de sistema",
          "type": "call"
        },
        {
          "day": 46,
          "title": "Tu primera venta",
          "type": "hero"
        },
        {
          "day": 47,
          "title": "Llamada 4 — Mensual (balance)",
          "type": "call"
        }
      ],
      "classes": [
        {
          "id": "c2-el-sistema-de-dm-en-fr-1",
          "title": "El Sistema de DM en frío: Flow de 4 estados [A→B→C→D] y los 3 carriles de follow-up",
          "url": ""
        },
        {
          "id": "c2-visi-n-de-sistema-entr-2",
          "title": "Visión de sistema entrada-proceso-salida (leads→agendas) con retroalimentación de métricas",
          "url": ""
        },
        {
          "id": "c2-setup-del-tracker-goog-3",
          "title": "Setup del Tracker (Google Sheets) y hoja de Leads (nombre|URL|usado)",
          "url": ""
        },
        {
          "id": "c2-l-mites-por-plataforma-4",
          "title": "Límites por plataforma (IG 30 DMs, etc.) y salud de cuenta",
          "url": ""
        },
        {
          "id": "c2-scraping-de-leads-b-sq-5",
          "title": "Scraping de leads: búsqueda IG, sugeridos, grupos de Facebook, amigos de influencers",
          "url": ""
        },
        {
          "id": "c2-copy-url-extension-cha-6",
          "title": "Copy URL extension + ChatGPT para organizar/deduplicar",
          "url": ""
        },
        {
          "id": "c2-caballo-de-troya-video-7",
          "title": "Caballo de Troya: video/audio 20s personalizado (nombre + honestidad desarmante + permiso)",
          "url": ""
        },
        {
          "id": "c2-ruptura-de-patr-n-vs-l-8",
          "title": "Ruptura de patrón vs la competencia",
          "url": ""
        },
        {
          "id": "c2-daily-workflow-am-pm-1-9",
          "title": "Daily Workflow AM/PM (10 min c/u): revisar respuestas, mover estados, FUP1",
          "url": ""
        },
        {
          "id": "c2-primeros-env-os-10-30-10",
          "title": "Primeros envíos: 10-30 Caballos de Troya respetando límites",
          "url": ""
        },
        {
          "id": "c2-vsl-evergreen-nativo-9-11",
          "title": "VSL Evergreen nativo (90s): intro + social proof + oferta simple + CTA",
          "url": ""
        },
        {
          "id": "c2-permiso-para-vsl-y-tra-12",
          "title": "Permiso para VSL y transición A→B",
          "url": ""
        },
        {
          "id": "c2-loom-personalizado-4-s-13",
          "title": "Loom personalizado (4 secciones: Presentación + Puntos de mejora + Solución/Puente + CTA)",
          "url": ""
        },
        {
          "id": "c2-tono-amigable-no-cr-ti-14",
          "title": "Tono amigable no-crítico; vender la LLAMADA no el servicio",
          "url": ""
        },
        {
          "id": "c2-cadenas-de-follow-up-7-15",
          "title": "Cadenas de follow-up: 7 mensajes Carril B (post-VSL) + 7 Carril C (post-Calendly)",
          "url": ""
        },
        {
          "id": "c2-mezcla-de-preguntas-gi-16",
          "title": "Mezcla de preguntas, GIFs, memes, valor; <100 caracteres",
          "url": ""
        },
        {
          "id": "c2-calendly-y-raz-n-para-17",
          "title": "Calendly y razón para agendar: transición C→D",
          "url": ""
        },
        {
          "id": "c2-doctor-dm-rbol-de-diag-18",
          "title": "Doctor DM: árbol de diagnóstico por métrica antes de cambiar nada",
          "url": ""
        },
        {
          "id": "c2-lectura-de-m-tricas-y-19",
          "title": "Lectura de métricas y escalado seguro (duplicar mensajes > forzar MSR)",
          "url": ""
        },
        {
          "id": "c2-preparaci-n-de-la-week-20",
          "title": "Preparación de la Weekly de feedback de sistema",
          "url": ""
        },
        {
          "id": "c2-arquitectura-de-ventas-21",
          "title": "Arquitectura de ventas: la gente compra para SALIR del dolor A; vender CAMBIO no features",
          "url": ""
        },
        {
          "id": "c2-las-5-etapas-de-la-lla-22",
          "title": "Las 5 etapas de la llamada (Diagnóstico→Pitch→Preguntas→Objeciones→Cierre)",
          "url": ""
        },
        {
          "id": "c2-5-principios-de-persua-23",
          "title": "5 principios de persuasión (Energía/Ethos, Authority, Scarcity, Takeaway, Reciprocidad, Contraste)",
          "url": ""
        },
        {
          "id": "c2-el-silencio-y-la-calma-24",
          "title": "El silencio y la calma como herramientas",
          "url": ""
        },
        {
          "id": "c2-las-10-armas-de-cierre-25",
          "title": "Las 10 armas de cierre (silencio, no juzgar, peso del problema, reencuadre, socrático, diagnóstico, OK...)",
          "url": ""
        },
        {
          "id": "c2-diagn-stico-antes-que-26",
          "title": "Diagnóstico antes que cierre",
          "url": ""
        },
        {
          "id": "c2-pre-call-confirmaci-n-27",
          "title": "Pre-call: confirmación WhatsApp, recordatorios, show-up rate",
          "url": ""
        },
        {
          "id": "c2-ejecutar-la-primera-ll-28",
          "title": "Ejecutar la primera llamada de venta real",
          "url": ""
        },
        {
          "id": "c2-auto-revisi-n-de-llama-29",
          "title": "Auto-revisión de llamadas: dónde falló el diagnóstico/brecha/objeción",
          "url": ""
        },
        {
          "id": "c2-glosario-de-ventas-lea-30",
          "title": "Glosario de ventas (lead, AOV, LTV, CAC, show-up)",
          "url": ""
        },
        {
          "id": "c2-la-tuber-a-de-ventas-c-31",
          "title": "La tubería de ventas completa y las 25+ métricas por etapa",
          "url": ""
        },
        {
          "id": "c2-d-nde-apunta-cada-m-tr-32",
          "title": "Dónde apunta cada métrica caída (volumen=marketing, agenda%=setting, show-up=precall, cierre=vendedor)",
          "url": ""
        },
        {
          "id": "c2-doctor-dm-aplicado-dia-33",
          "title": "Doctor DM aplicado: diagnóstico completo de MSR/PRR/CSR/ABR tras 100+ Caballos",
          "url": ""
        },
        {
          "id": "c2-a-b-test-en-cuenta-sep-34",
          "title": "A/B test en cuenta separada (no en el sistema ganador)",
          "url": ""
        },
        {
          "id": "c2-manejo-de-objeciones-e-35",
          "title": "Manejo de objeciones en vivo: reencuadre + socrático + takeaway",
          "url": ""
        },
        {
          "id": "c2-negociaci-n-y-t-rminos-36",
          "title": "Negociación y términos de pago",
          "url": ""
        },
        {
          "id": "c2-cierre-y-primeros-cobr-37",
          "title": "Cierre y primeros cobros: AOV día 1, cash collect",
          "url": ""
        },
        {
          "id": "c2-selecci-n-de-piezas-ga-38",
          "title": "Selección de piezas ganadoras para Follow-Me Ads (criterio: trajeron lead/agenda)",
          "url": ""
        },
        {
          "id": "c2-cierre-de-fase-2-qu-de-39",
          "title": "Cierre de Fase 2: qué debe estar probado antes de amplificar y entregar",
          "url": ""
        },
        {
          "id": "c2-preparaci-n-del-monthl-40",
          "title": "Preparación del Monthly",
          "url": ""
        }
      ],
      "baseTasks": [
        {
          "id": "t2-d22",
          "title": "Estudiar el Flow y dibujar tu propio diagrama de 4 estados para tu plataforma + Elegir plataforma(s) y optimizar el perfil (foto, feed, destacados) → Diagrama de 4 estados propio + perfil optimizado",
          "mission": "Monta tu sistema de DM",
          "week": 4,
          "suggestedDay": 22,
          "classId": "c2-el-sistema-de-dm-en-fr-1"
        },
        {
          "id": "t2-d23",
          "title": "Copiar y personalizar el Tracker por plataforma (columnas A/B/C/D + fórmulas MSR/PRR/CSR/ABR) + Configurar Calendly con enlace único y disponibilidad → Tracker funcional + Calendly configurado",
          "mission": "Arma tu tracker y Calendly",
          "week": 4,
          "suggestedDay": 23,
          "classId": "c2-setup-del-tracker-goog-3"
        },
        {
          "id": "t2-d24",
          "title": "Scrapear 30 leads del nicho y cargarlos en el Tracker como 'Iniciado (A)' + Deduplicar con ChatGPT → 30 leads cargados en estado A + evidencia de deduplicación",
          "mission": "Consigue tus primeros 30 leads",
          "week": 4,
          "suggestedDay": 24,
          "classId": "c2-scraping-de-leads-b-sq-5"
        },
        {
          "id": "t2-d25",
          "title": "Mapear 3 competidores y crear 3 variantes de Caballo de Troya que rompan el patrón + Grabar tu Caballo de Troya → Análisis de competencia + 3 scripts + 1 Caballo de Troya grabado",
          "mission": "Graba tu Caballo de Troya",
          "week": 4,
          "suggestedDay": 25,
          "classId": "c2-caballo-de-troya-video-7"
        },
        {
          "id": "t2-d26",
          "title": "Enviar los primeros 10-30 Caballos de Troya y registrarlos en el Tracker + Publicar pieza larga de la semana → Primeros 10-30 Caballos enviados y trackeados + 1 pieza larga",
          "mission": "Lanza tus primeros mensajes",
          "week": 4,
          "suggestedDay": 26,
          "classId": "c2-daily-workflow-am-pm-1-9"
        },
        {
          "id": "t2-d29",
          "title": "Grabar el VSL evergreen de 90s nativo de plataforma + Enviar VSL a los leads que dieron permiso (mover a estado B) → VSL evergreen grabado + primeros leads movidos a B",
          "mission": "Graba tu VSL de 90s",
          "week": 5,
          "suggestedDay": 29,
          "classId": "c2-vsl-evergreen-nativo-9-11"
        },
        {
          "id": "t2-d30",
          "title": "Crear 1 Loom personalizado para un lead de alto potencial (con visuals en Miro/Canva) + Documentar las 2-3 ineficiencias encontradas y cómo las presentaste → 1 Loom personalizado + guion desglosado por sección",
          "mission": "Crea tu primer Loom",
          "week": 5,
          "suggestedDay": 30,
          "classId": "c2-loom-personalizado-4-s-13"
        },
        {
          "id": "t2-d31",
          "title": "Escribir las 14 piezas de follow-up (7B + 7C) con objetivo de cada una + Aplicar FUPs a los leads pendientes según su estado → 14 mensajes de follow-up listos + FUPs aplicados en el Tracker",
          "mission": "Escribe tus 14 follow-ups",
          "week": 5,
          "suggestedDay": 31,
          "classId": "c2-cadenas-de-follow-up-7-15"
        },
        {
          "id": "t2-d32",
          "title": "Enviar Calendly a los leads interesados (mover a estado C) + Correr Daily Workflow AM/PM a volumen (objetivo acumulado 100+ Caballos) → Leads en estado C + acumulado de envíos hacia 100 Caballos",
          "mission": "Empuja a 100 mensajes",
          "week": 5,
          "suggestedDay": 32,
          "classId": "c2-calendly-y-raz-n-para-17"
        },
        {
          "id": "t2-d33",
          "title": "Generar reporte de métricas del Tracker (MSR/PRR/CSR/ABR) para la Weekly + Publicar pieza larga + marcar 2-3 piezas ganadoras de contenido → Reporte de métricas + primeras agendas registradas + 2-3 piezas ganadoras marcadas",
          "mission": "Lee tus primeras métricas",
          "week": 5,
          "suggestedDay": 33,
          "classId": "c2-lectura-de-m-tricas-y-19"
        },
        {
          "id": "t2-d36",
          "title": "Armar tu Script de 5 etapas con tiempos (Diag 30-40min, Pitch 5-10, etc.) + Continuar Daily Workflow + publicar pieza del día → Script de llamada de 5 etapas personalizado",
          "mission": "Arma tu script de venta",
          "week": 6,
          "suggestedDay": 36,
          "classId": "c2-arquitectura-de-ventas-21"
        },
        {
          "id": "t2-d37",
          "title": "Grabar 3 pitches SIN mencionar características (solo A→B→puente) + Enviar Calendly/FUPs del día → 3 pitches de transformación grabados (2 min c/u)",
          "mission": "Graba tus 3 pitches",
          "week": 6,
          "suggestedDay": 37,
          "classId": "c2-5-principios-de-persua-23"
        },
        {
          "id": "t2-d38",
          "title": "Documentar 10 objeciones reales con redireccionamiento + pregunta socrática + Role-play de objeciones con un par (grabado) → Arsenal de 10 objeciones + video de role-play",
          "mission": "Domina las objeciones",
          "week": 6,
          "suggestedDay": 38,
          "classId": "c2-las-10-armas-de-cierre-25"
        },
        {
          "id": "t2-d39",
          "title": "Tomar la primera llamada de venta agendada y grabarla + Aplicar diagnóstico profundo (lead habla 80%) → 1 llamada de venta real ejecutada y grabada",
          "mission": "Toma tu primera llamada",
          "week": 6,
          "suggestedDay": 39,
          "classId": "c2-pre-call-confirmaci-n-27"
        },
        {
          "id": "t2-d40",
          "title": "Escuchar tu llamada grabada y anotar 3 ajustes + Publicar pieza larga + seguir DM a volumen → Auto-análisis de llamada (3 ajustes) + pieza larga publicada",
          "mission": "Analiza tu llamada grabada",
          "week": 6,
          "suggestedDay": 40,
          "classId": "c2-auto-revisi-n-de-llama-29"
        },
        {
          "id": "t2-d43",
          "title": "Medir tu tubería de la semana (conversaciones, calendarios, agendadas, presentadas, cerradas) + Identificar tu cuello de botella principal → Spreadsheet de tubería de 7 días + cuello identificado",
          "mission": "Mide tu tubería de ventas",
          "week": 7,
          "suggestedDay": 43,
          "classId": "c2-la-tuber-a-de-ventas-c-31"
        },
        {
          "id": "t2-d44",
          "title": "Correr Doctor DM sobre tus métricas y documentar causa+ajuste + Si aplica, montar A/B test de Caballo de Troya en cuenta nueva → Diagnóstico Doctor DM documentado + plan de ajuste",
          "mission": "Diagnostica con Doctor DM",
          "week": 7,
          "suggestedDay": 44,
          "classId": "c2-doctor-dm-aplicado-dia-33"
        },
        {
          "id": "t2-d45",
          "title": "Tomar 2da/3ra llamada de venta y aplicar el arsenal + Role-play socrático+reencuadre con 'no tengo plata' (grabado) → Llamadas adicionales ejecutadas + video role-play de cierre",
          "mission": "Cierra más llamadas",
          "week": 7,
          "suggestedDay": 45,
          "classId": "c2-manejo-de-objeciones-e-35"
        },
        {
          "id": "t2-d46",
          "title": "Cerrar/avanzar las agendas activas + Elegir 2-3 piezas ganadoras y documentar por qué (leads/agendas generadas) → Estado de cierres + lista de 2-3 piezas ganadoras justificadas",
          "mission": "Tu primera venta",
          "week": 7,
          "suggestedDay": 46,
          "classId": "c2-cierre-y-primeros-cobr-37"
        },
        {
          "id": "t2-d47",
          "title": "Consolidar reporte mensual (agendas, llamadas, cierres, métricas DM) + Publicar pieza larga + preparar criterio de salida Fase 2 → Reporte mensual consolidado; Fase 2 validada en el Monthly",
          "mission": "Cierra tu primer mes",
          "week": 7,
          "suggestedDay": 47,
          "classId": "c2-cierre-de-fase-2-qu-de-39"
        }
      ],
      "requiredForms": []
    },
    {
      "id": 3,
      "name": "Validar",
      "headline": "Entregas a tus clientes, obtienen resultados (oferta probada) y amplificas con Follow-Me Ads",
      "startDay": 49,
      "endDay": 84,
      "milestones": [
        {
          "day": 81,
          "title": "5 clientes validados",
          "type": "hero"
        },
        {
          "day": 82,
          "title": "Llamada 5 — Mensual (balance)",
          "type": "call"
        }
      ],
      "classes": [
        {
          "id": "c3-customer-journey-de-6-1",
          "title": "Customer Journey de 6 etapas (Onboarding→Uso Activo→Retención→Expansión→Fidelización→Optimización)",
          "url": ""
        },
        {
          "id": "c3-entregables-y-accionab-2",
          "title": "Entregables y accionables por etapa",
          "url": ""
        },
        {
          "id": "c3-onboarding-del-cliente-3",
          "title": "Onboarding del cliente: bienvenida, contrato (PandaDoc), accesos, kickoff, roadmap visual",
          "url": ""
        },
        {
          "id": "c3-la-entrega-empieza-en-4",
          "title": "La entrega empieza en el pago (48h críticas)",
          "url": ""
        },
        {
          "id": "c3-el-trafficker-y-meta-a-5",
          "title": "El Trafficker y Meta Ads: Business Manager, jerarquía Campaña>Conjunto>Anuncio",
          "url": ""
        },
        {
          "id": "c3-p-blicos-fr-o-tibio-ca-6",
          "title": "Públicos frío/tibio/caliente — para Follow-Me Ads el core es tibio/caliente",
          "url": ""
        },
        {
          "id": "c3-follow-me-ads-amplific-7",
          "title": "Follow-Me Ads: amplificar SOLO contenido validado con 'Crear' (no 'Promocionar')",
          "url": ""
        },
        {
          "id": "c3-objetivo-interacci-n-t-8",
          "title": "Objetivo interacción/tráfico al perfil; públicos avatar + lookalike + retargeting",
          "url": ""
        },
        {
          "id": "c3-comunicaci-n-multicana-9",
          "title": "Comunicación multicanal: Discord (canales por tema, sección pesadilla arriba), Looms, reportes",
          "url": ""
        },
        {
          "id": "c3-academia-virtual-en-sk-10",
          "title": "Academia virtual en Skool: estructura programa>curso>módulo>video",
          "url": ""
        },
        {
          "id": "c3-automatizaci-n-de-onbo-11",
          "title": "Automatización de onboarding con Zapier (Form→CRM+Contrato; Contrato firmado→Skool+Discord)",
          "url": ""
        },
        {
          "id": "c3-crm-en-airtable-leads-12",
          "title": "CRM en Airtable: leads + clientes + estados",
          "url": ""
        },
        {
          "id": "c3-lanzamiento-de-follow-13",
          "title": "Lanzamiento de Follow-Me Ad: presupuesto bajo (5-10 USD/día), tope de presupuesto",
          "url": ""
        },
        {
          "id": "c3-disciplina-cpm-ctr-lee-14",
          "title": "Disciplina: CPM↓/CTR↑, leer 3-5 días antes de tocar",
          "url": ""
        },
        {
          "id": "c3-uso-activo-sem-2-10-de-15",
          "title": "Uso Activo (sem 2-10 del cliente): seguimiento semanal, sesiones 1:1, check-in mensual",
          "url": ""
        },
        {
          "id": "c3-roadmap-tabla-de-accio-16",
          "title": "Roadmap + tabla de accionables específicos (no vagos)",
          "url": ""
        },
        {
          "id": "c3-m-tricas-de-follow-me-17",
          "title": "Métricas de Follow-Me Ads: CPL, CPM, CTR, ROAS, CPR y umbral de escalado",
          "url": ""
        },
        {
          "id": "c3-cu-ndo-escalar-20-2-d-18",
          "title": "Cuándo escalar 20%/2 días y cuándo apagar conjuntos",
          "url": ""
        },
        {
          "id": "c3-loom-de-feedback-perso-19",
          "title": "Loom de feedback personalizado al cliente (resumen + 3 accionables + próximo check-in)",
          "url": ""
        },
        {
          "id": "c3-reportes-y-comunicaci-20",
          "title": "Reportes y comunicación asincrónica",
          "url": ""
        },
        {
          "id": "c3-triada-de-lo-delicado-21",
          "title": "Triada de lo delicado y clientes pesadilla (ID temprana, transparencia, acción proactiva)",
          "url": ""
        },
        {
          "id": "c3-mindset-todo-es-tu-cul-22",
          "title": "Mindset 'todo es tu culpa' + Discord sección pesadilla",
          "url": ""
        },
        {
          "id": "c3-optimizaci-n-de-follow-23",
          "title": "Optimización de Follow-Me Ads: apagar conjuntos sobre CPR, escalar lo sano 20%/2 días",
          "url": ""
        },
        {
          "id": "c3-retargeting-con-p-xel-24",
          "title": "Retargeting con píxel a visualizadores",
          "url": ""
        },
        {
          "id": "c3-cierre-de-m-s-ventas-s-25",
          "title": "Cierre de más ventas: seguir tubería DM→llamada→cierre",
          "url": ""
        },
        {
          "id": "c3-show-up-y-rescate-de-n-26",
          "title": "Show-up y rescate de no-shows",
          "url": ""
        },
        {
          "id": "c3-m-tricas-de-servicio-t-27",
          "title": "Métricas de servicio: tasa de reembolso <5%, pesadilla <10%, éxito 30% DWY, recompra >10%, NPS",
          "url": ""
        },
        {
          "id": "c3-documentar-primeros-re-28",
          "title": "Documentar primeros resultados de clientes",
          "url": ""
        },
        {
          "id": "c3-contrataci-n-inicial-d-29",
          "title": "Contratación inicial de equipo ($10k+): Inbound Setter (responde DMs, agenda)",
          "url": ""
        },
        {
          "id": "c3-sops-para-delegar-sin-30",
          "title": "SOPs para delegar sin perder calidad",
          "url": ""
        },
        {
          "id": "c3-retenci-n-sem-10-12-de-31",
          "title": "Retención (sem 10-12 del cliente): feedback, análisis de comportamiento, propuesta de renovación",
          "url": ""
        },
        {
          "id": "c3-offboarding-estrat-gic-32",
          "title": "Offboarding estratégico: upsell/resell/crosssell/downsell",
          "url": ""
        },
        {
          "id": "c3-mejora-continua-pdca-k-33",
          "title": "Mejora continua PDCA + Kaizen aplicados al servicio",
          "url": ""
        },
        {
          "id": "c3-c-mo-cada-caso-de-xito-34",
          "title": "Cómo cada caso de éxito retroalimenta contenido y oferta",
          "url": ""
        },
        {
          "id": "c3-consolidaci-n-de-follo-35",
          "title": "Consolidación de Follow-Me Ads: qué conjunto/creativo gana, plan de escalado",
          "url": ""
        },
        {
          "id": "c3-an-lisis-competitivo-d-36",
          "title": "Análisis competitivo de Follow-Me Ads del nicho",
          "url": ""
        },
        {
          "id": "c3-validaci-n-de-oferta-c-37",
          "title": "Validación de oferta con ~5 clientes: criterios de 'cliente validado' (cerrado+onboardeado+primer resultado)",
          "url": ""
        },
        {
          "id": "c3-preparaci-n-del-monthl-38",
          "title": "Preparación del Monthly y de la luz verde al Webinar",
          "url": ""
        },
        {
          "id": "c3-cierre-de-fase-3-tuber-39",
          "title": "Cierre de Fase 3: tubería completa medida (DM+Ads), entrega operando",
          "url": ""
        },
        {
          "id": "c3-qu-necesita-el-webinar-40",
          "title": "Qué necesita el Webinar para encenderse",
          "url": ""
        }
      ],
      "baseTasks": [
        {
          "id": "t3-d50",
          "title": "Seguir tubería DM→llamada→cierre con foco en llegar a 5 clientes (scrapear nuevos leads, FUPs, agendar) + Medir cuántos clientes cerrados/onboardeados llevas vs la meta de 5 → Pipeline de cierre actualizado + conteo de clientes hacia la meta de 5",
          "mission": "Avanza hacia 5 clientes",
          "week": 8,
          "suggestedDay": 50,
          "classId": "c3-cierre-de-m-s-ventas-s-25"
        },
        {
          "id": "t3-d51",
          "title": "Leer la campaña Follow-Me Ads tras el ciclo de aprendizaje de 3-5 días sin tocar nada antes de tiempo (CPM↓/CTR↑) + Anotar qué conjunto/creativo respira mejor → Lectura disciplinada de la campaña (3-5 días) + diagnóstico inicial CPM/CTR",
          "mission": "Lee tu campaña con calma",
          "week": 8,
          "suggestedDay": 51,
          "classId": "c3-disciplina-cpm-ctr-lee-14"
        },
        {
          "id": "t3-d52",
          "title": "Dar seguimiento 1:1 a los clientes activos en Uso Activo (check-in semanal, revisar accionables del roadmap, desbloquear) + Confirmar que cada cliente avanza hacia su primer resultado → Seguimiento 1:1 de clientes activos (notas por cliente) + estado de avance hacia primer resultado",
          "mission": "Acompaña a tus clientes 1:1",
          "week": 8,
          "suggestedDay": 52,
          "classId": "c3-uso-activo-sem-2-10-de-15"
        },
        {
          "id": "t3-d53",
          "title": "Documentar los primeros resultados que van apareciendo en clientes (métrica antes→después, cita textual) + Capturar evidencia (capturas, mensajes) para futuros casos → Bitácora de resultados emergentes por cliente + evidencia capturada",
          "mission": "Documenta primeros resultados",
          "week": 8,
          "suggestedDay": 53,
          "classId": "c3-documentar-primeros-re-28"
        },
        {
          "id": "t3-d54",
          "title": "Ajustar la entrega según lo aprendido en el seguimiento (afinar entregables/accionables por etapa del Journey) + Continuar tubería de cierre hacia los 5 clientes + publicar pieza larga → Entrega ajustada (entregables/accionables refinados) + pipeline de cierre al día",
          "mission": "Afina tu entrega",
          "week": 8,
          "suggestedDay": 54,
          "classId": "c3-entregables-y-accionab-2"
        },
        {
          "id": "t3-d57",
          "title": "Mapear tu Customer Journey con entregables + accionables + deadlines por etapa + Continuar DM + contenido → Customer Journey documentado (tabla por etapa)",
          "mission": "Mapea el viaje del cliente",
          "week": 9,
          "suggestedDay": 57,
          "classId": "c3-customer-journey-de-6-1"
        },
        {
          "id": "t3-d58",
          "title": "Crear documento de onboarding (flujo 48h) + template de email de bienvenida + Armar roadmap visual del cliente (Miro) → Flujo de onboarding 48h + roadmap visual del cliente",
          "mission": "Diseña tu onboarding 48h",
          "week": 9,
          "suggestedDay": 58,
          "classId": "c3-onboarding-del-cliente-3"
        },
        {
          "id": "t3-d59",
          "title": "Configurar Business Manager (página, IG, píxel) + Instalar y validar píxel con Pixel Helper → Business Manager configurado + píxel validado (captura de eventos)",
          "mission": "Configura tu píxel de Meta",
          "week": 9,
          "suggestedDay": 59,
          "classId": "c3-el-trafficker-y-meta-a-5"
        },
        {
          "id": "t3-d60",
          "title": "Crear públicos: avatar (intereses), lookalike y retargeting (visualizadores/visitantes) + Preparar la 1ª pieza ganadora como creativo de Follow-Me Ad → Públicos creados + 1ª pieza ganadora lista para amplificar",
          "mission": "Prepara tu pieza ganadora",
          "week": 9,
          "suggestedDay": 60,
          "classId": "c3-follow-me-ads-amplific-7"
        },
        {
          "id": "t3-d61",
          "title": "Montar servidor Discord con canales + reglas + sección pesadilla + Crear estructura base de Skool (1 curso, 2-3 módulos) → Discord estructurado + Skool con curso base + pieza larga publicada",
          "mission": "Monta Discord y Skool",
          "week": 9,
          "suggestedDay": 61,
          "classId": "c3-comunicaci-n-multicana-9"
        },
        {
          "id": "t3-d64",
          "title": "Montar el Zap Form→Airtable+PandaDoc y testearlo end-to-end + Continuar DM + contenido → Zaps de onboarding funcionando (test documentado)",
          "mission": "Automatiza el onboarding",
          "week": 10,
          "suggestedDay": 64,
          "classId": "c3-automatizaci-n-de-onbo-11"
        },
        {
          "id": "t3-d65",
          "title": "Lanzar 1ª campaña Follow-Me Ads (creativo = pieza ganadora, público tibio+avatar) + Configurar tope de presupuesto → 1ª campaña Follow-Me Ads en vivo con tope de presupuesto",
          "mission": "Lanza tu primer anuncio",
          "week": 10,
          "suggestedDay": 65,
          "classId": "c3-lanzamiento-de-follow-13"
        },
        {
          "id": "t3-d66",
          "title": "Ejecutar 1ª sesión 1:1/Gameplan con un cliente real (o test-client) usando el roadmap + Entregar tabla de accionables al cliente → Sesión 1:1 ejecutada (Loom resumen) + Gameplan entregado",
          "mission": "Da tu primera sesión 1:1",
          "week": 10,
          "suggestedDay": 66,
          "classId": "c3-uso-activo-sem-2-10-de-15"
        },
        {
          "id": "t3-d67",
          "title": "Montar la matriz CPL/CPR/ROAS con fórmulas y umbral ROAS>3 + Revisar métricas de la campaña y decidir mantener/ajustar → Matriz de métricas de ads + primera lectura de la campaña",
          "mission": "Mide tus métricas de ads",
          "week": 10,
          "suggestedDay": 67,
          "classId": "c3-m-tricas-de-follow-me-17"
        },
        {
          "id": "t3-d68",
          "title": "Grabar 1 Loom de feedback a un cliente + Publicar pieza larga + seguir DM → Loom de feedback enviado + pieza larga + estado de ads",
          "mission": "Graba un Loom de feedback",
          "week": 10,
          "suggestedDay": 68,
          "classId": "c3-loom-de-feedback-perso-19"
        },
        {
          "id": "t3-d71",
          "title": "Definir protocolo de cliente pesadilla (CRM mark + Discord + 1:1 extra) + Aplicar a un caso real o ficticio → Protocolo de pesadilla + caso documentado",
          "mission": "Maneja al cliente pesadilla",
          "week": 11,
          "suggestedDay": 71,
          "classId": "c3-triada-de-lo-delicado-21"
        },
        {
          "id": "t3-d72",
          "title": "Optimizar la campaña: apagar/escalar según métricas + Crear 1 conjunto de retargeting → Campaña optimizada + conjunto de retargeting activo",
          "mission": "Optimiza tu campaña",
          "week": 11,
          "suggestedDay": 72,
          "classId": "c3-optimizaci-n-de-follow-23"
        },
        {
          "id": "t3-d73",
          "title": "Ejecutar llamadas de venta de la semana + Aplicar checklist pre-call y rescate de no-shows → Llamadas ejecutadas + estado de cierres hacia 5 clientes",
          "mission": "Cierra llamadas de venta",
          "week": 11,
          "suggestedDay": 73,
          "classId": "c3-cierre-de-m-s-ventas-s-25"
        },
        {
          "id": "t3-d74",
          "title": "Montar dashboard de métricas de servicio con targets + Documentar primeros resultados de tus clientes (caso de éxito) → Dashboard de métricas de servicio + 1 caso de éxito documentado",
          "mission": "Arma tu primer caso de éxito",
          "week": 11,
          "suggestedDay": 74,
          "classId": "c3-m-tricas-de-servicio-t-27"
        },
        {
          "id": "t3-d75",
          "title": "Escribir 1 SOP (atención de leads o seguimiento) + JD de Setter + Publicar pieza larga + seguir DM/ads → 1 SOP + JD de Setter + pieza larga",
          "mission": "Escribe tu primer SOP",
          "week": 11,
          "suggestedDay": 75,
          "classId": "c3-contrataci-n-inicial-d-29"
        },
        {
          "id": "t3-d78",
          "title": "Pedir feedback estructurado a clientes + preparar 1 propuesta de renovación + Seguir tubería de cierre hacia 5 clientes → Feedback recogido + 1 propuesta de renovación",
          "mission": "Pide feedback y renueva",
          "week": 12,
          "suggestedDay": 78,
          "classId": "c3-retenci-n-sem-10-12-de-31"
        },
        {
          "id": "t3-d79",
          "title": "Correr 1 ciclo PDCA sobre una métrica de servicio + Convertir 2 casos de éxito en piezas de contenido → 1 ciclo PDCA documentado + 2 piezas de caso de éxito publicadas",
          "mission": "Convierte casos en contenido",
          "week": 12,
          "suggestedDay": 79,
          "classId": "c3-mejora-continua-pdca-k-33"
        },
        {
          "id": "t3-d80",
          "title": "Documentar el creativo/público ganador y su ROAS/CPL + Analizar 3 competidores que usan follow-me ads → Reporte de ads ganadores + análisis competitivo",
          "mission": "Documenta tu anuncio ganador",
          "week": 12,
          "suggestedDay": 80,
          "classId": "c3-consolidaci-n-de-follo-35"
        },
        {
          "id": "t3-d81",
          "title": "Verificar el estado de los ~5 clientes y documentar primeros resultados + Consolidar batería de casos de éxito para el Webinar → Estado de ~5 clientes validados + batería de casos de éxito",
          "mission": "5 clientes validados",
          "week": 12,
          "suggestedDay": 81,
          "classId": "c3-validaci-n-de-oferta-c-37"
        },
        {
          "id": "t3-d82",
          "title": "Consolidar reporte mensual (clientes, entrega, ads) + Publicar pieza larga + preparar criterio de salida Fase 3 → Reporte mensual + Fase 3 validada en Monthly = luz verde Webinar",
          "mission": "Cierra la Fase 3",
          "week": 12,
          "suggestedDay": 82,
          "classId": "c3-cierre-de-fase-3-tuber-39"
        }
      ],
      "requiredForms": []
    },
    {
      "id": 4,
      "name": "Escalar",
      "headline": "Lanzas tu webinar y el sistema corre para crecer sin freno",
      "startDay": 84,
      "endDay": 112,
      "milestones": [
        {
          "day": 93,
          "title": "Tu primer webinar en vivo",
          "type": "hero"
        },
        {
          "day": 110,
          "title": "Llamada 6 — Cierre / Mejora continua",
          "type": "call"
        }
      ],
      "classes": [
        {
          "id": "c4-modelo-de-webinar-del-1",
          "title": "Modelo de Webinar del dueño: Contenido→Grupo WhatsApp→Valor→Clase→Cierre urgencia→Llamadas 20min→Ingreso",
          "url": ""
        },
        {
          "id": "c4-por-qu-el-webinar-es-l-2",
          "title": "Por qué el webinar es la capa de ESCALA (tras validar con 5 clientes)",
          "url": ""
        },
        {
          "id": "c4-cta-a-grupo-de-whatsap-3",
          "title": "CTA a grupo de WhatsApp: cómo convertir contenido en captación al grupo",
          "url": ""
        },
        {
          "id": "c4-estructura-de-valor-de-4",
          "title": "Estructura de valor dentro del grupo (qué se comparte, cadencia)",
          "url": ""
        },
        {
          "id": "c4-contenido-de-precalent-5",
          "title": "Contenido de precalentamiento dentro del grupo (mucho valor antes de la clase)",
          "url": ""
        },
        {
          "id": "c4-c-mo-el-grupo-eleva-la-6",
          "title": "Cómo el grupo eleva la confianza antes del cierre",
          "url": ""
        },
        {
          "id": "c4-estructurar-la-clase-m-7",
          "title": "Estructurar la CLASE: mostrar el método paso a paso a profundidad",
          "url": ""
        },
        {
          "id": "c4-c-mo-demostrar-autorid-8",
          "title": "Cómo demostrar autoridad sin saturar (caso, método, transformación)",
          "url": ""
        },
        {
          "id": "c4-calendly-para-webinar-9",
          "title": "Calendly para webinar: pocas plazas/día y llamadas de 20 min",
          "url": ""
        },
        {
          "id": "c4-diferencia-entre-llama-10",
          "title": "Diferencia entre llamada de 20min (webinar) y llamada larga (DM frío)",
          "url": ""
        },
        {
          "id": "c4-log-stica-de-la-clase-11",
          "title": "Logística de la clase en vivo (plataforma, recordatorios, asistencia)",
          "url": ""
        },
        {
          "id": "c4-precalentamiento-final-12",
          "title": "Precalentamiento final en el grupo",
          "url": ""
        },
        {
          "id": "c4-dictado-de-la-clase-m-13",
          "title": "Dictado de la CLASE: método paso a paso + cierre con urgencia",
          "url": ""
        },
        {
          "id": "c4-cta-final-agendar-llam-14",
          "title": "CTA final: agendar llamada de 20min (plazas limitadas)",
          "url": ""
        },
        {
          "id": "c4-llamada-de-cierre-de-2-15",
          "title": "Llamada de cierre de 20min: versión comprimida de las 5 etapas para leads ya calientes",
          "url": ""
        },
        {
          "id": "c4-por-qu-el-lead-del-web-16",
          "title": "Por qué el lead del webinar llega más caliente que el de DM",
          "url": ""
        },
        {
          "id": "c4-integraci-n-de-las-3-f-17",
          "title": "Integración de las 3 fuentes de agenda (DM + Follow-Me Ads + Webinar) en una sola tubería",
          "url": ""
        },
        {
          "id": "c4-medir-de-d-nde-viene-c-18",
          "title": "Medir de dónde viene cada agenda/cierre",
          "url": ""
        },
        {
          "id": "c4-onboarding-de-los-clie-19",
          "title": "Onboarding de los clientes que entran por webinar (mismo sistema de entrega)",
          "url": ""
        },
        {
          "id": "c4-retroalimentaci-n-del-20",
          "title": "Retroalimentación del webinar al contenido y a la oferta",
          "url": ""
        },
        {
          "id": "c4-optimizaci-n-del-webin-21",
          "title": "Optimización del webinar: dónde se cae (captación grupo / asistencia clase / agenda / cierre)",
          "url": ""
        },
        {
          "id": "c4-mejorar-la-conversi-n-22",
          "title": "Mejorar la conversión de cada tramo del embudo de webinar",
          "url": ""
        },
        {
          "id": "c4-escalado-del-sistema-c-23",
          "title": "Escalado del sistema completo: cuándo y cómo aumentar volumen en cada fuente",
          "url": ""
        },
        {
          "id": "c4-equipo-setter-closer-c-24",
          "title": "Equipo: Setter→Closer→CSM según facturación",
          "url": ""
        },
        {
          "id": "c4-calendario-operativo-c-25",
          "title": "Calendario operativo completo (5 llamadas cliente + cadencia interna del equipo)",
          "url": ""
        },
        {
          "id": "c4-apalancamiento-con-mat-26",
          "title": "Apalancamiento con material pregrabado en Skool para bajar ICO",
          "url": ""
        },
        {
          "id": "c4-mejora-continua-revisi-27",
          "title": "Mejora continua: revisión semanal de métricas + Kaizen diario",
          "url": ""
        },
        {
          "id": "c4-filtro-de-1-1-calendly-28",
          "title": "Filtro de 1:1 (Calendly con problema concreto + Loom) para no romper ritmo",
          "url": ""
        },
        {
          "id": "c4-expansi-n-y-fidelizaci-29",
          "title": "Expansión y fidelización del cliente (sem 12-16): referidos, casos, evangelistas",
          "url": ""
        },
        {
          "id": "c4-programa-de-referidos-30",
          "title": "Programa de referidos",
          "url": ""
        },
        {
          "id": "c4-auditor-a-final-de-la-31",
          "title": "Auditoría final de la tubería completa: dónde se pierde agua en todo el sistema",
          "url": ""
        },
        {
          "id": "c4-lectura-conjunta-de-la-32",
          "title": "Lectura conjunta de las 3 fuentes + entrega + métricas de servicio",
          "url": ""
        },
        {
          "id": "c4-2do-webinar-iteraci-n-33",
          "title": "2do webinar / iteración del webinar con las mejoras de la sem 15",
          "url": ""
        },
        {
          "id": "c4-evergreen-del-webinar-34",
          "title": "Evergreen del webinar para escalar sin estar siempre en vivo",
          "url": ""
        },
        {
          "id": "c4-m-tricas-finales-ltv-c-35",
          "title": "Métricas finales: LTV/CAC, ROAS, tasa de éxito, recompra, NPS",
          "url": ""
        },
        {
          "id": "c4-salud-del-negocio-ico-36",
          "title": "Salud del negocio: ICO/IEN tras 4 meses",
          "url": ""
        },
        {
          "id": "c4-plan-de-mejora-continu-37",
          "title": "Plan de mejora continua de 90 días (PDCA por trimestre + Kaizen diario)",
          "url": ""
        },
        {
          "id": "c4-roadmap-de-escalado-qu-38",
          "title": "Roadmap de escalado: qué fuente escalar, qué rol contratar",
          "url": ""
        },
        {
          "id": "c4-cierre-del-programa-re-39",
          "title": "Cierre del programa: revisión del journey completo A→B del alumno",
          "url": ""
        },
        {
          "id": "c4-transici-n-a-mejora-co-40",
          "title": "Transición a mejora continua autónoma y opciones de renovación/escala",
          "url": ""
        }
      ],
      "baseTasks": [
        {
          "id": "t4-d85",
          "title": "Diseñar el flujo completo de tu webinar (cada etapa con su objetivo) + Definir la promesa/tema de la clase → Flujo de webinar documentado + promesa de la clase",
          "mission": "Diseña tu webinar",
          "week": 13,
          "suggestedDay": 85,
          "classId": "c4-modelo-de-webinar-del-1"
        },
        {
          "id": "t4-d86",
          "title": "Crear el grupo de WhatsApp + reglas + mensaje de bienvenida + Diseñar 3 hooks de contenido que lleven al grupo → Grupo de WhatsApp creado + 3 hooks de captación",
          "mission": "Crea tu grupo de WhatsApp",
          "week": 13,
          "suggestedDay": 86,
          "classId": "c4-cta-a-grupo-de-whatsap-3"
        },
        {
          "id": "t4-d87",
          "title": "Publicar contenido de captación al grupo en todos los canales + Cargar 2-3 piezas de valor en el grupo → Campaña de captación al grupo activa + valor inicial en el grupo",
          "mission": "Llena tu grupo de valor",
          "week": 13,
          "suggestedDay": 87,
          "classId": "c4-contenido-de-precalent-5"
        },
        {
          "id": "t4-d88",
          "title": "Armar el guion/slides de la clase (método paso a paso) + Definir la oferta y la urgencia (pocas plazas/día en Calendly) → Guion/slides de la clase + oferta con urgencia definida",
          "mission": "Arma tu clase",
          "week": 13,
          "suggestedDay": 88,
          "classId": "c4-estructurar-la-clase-m-7"
        },
        {
          "id": "t4-d89",
          "title": "Configurar Calendly de webinar (plazas limitadas/día, 20min) + Publicar pieza larga + seguir poblando el grupo → Calendly de webinar configurado + grupo creciendo",
          "mission": "Configura tu Calendly",
          "week": 13,
          "suggestedDay": 89,
          "classId": "c4-calendly-para-webinar-9"
        },
        {
          "id": "t4-d92",
          "title": "Enviar recordatorios e invitaciones a la clase a todo el grupo + Ensayar la clase (1 pasada cronometrada) → Clase agendada + grupo recordado + ensayo hecho",
          "mission": "Ensaya tu clase",
          "week": 14,
          "suggestedDay": 92,
          "classId": "c4-log-stica-de-la-clase-11"
        },
        {
          "id": "t4-d93",
          "title": "Dictar la clase en vivo (o grabada evergreen) y abrir agendas de 20min + Registrar asistentes y agendas generadas → Clase dictada + agendas de 20min generadas",
          "mission": "Tu primer webinar en vivo",
          "week": 14,
          "suggestedDay": 93,
          "classId": "c4-dictado-de-la-clase-m-13"
        },
        {
          "id": "t4-d94",
          "title": "Tomar las primeras llamadas de 20min y cerrar + Aplicar arsenal de objeciones comprimido → Primeras llamadas de 20min ejecutadas + cierres",
          "mission": "Cierra tus llamadas de 20min",
          "week": 14,
          "suggestedDay": 94,
          "classId": "c4-llamada-de-cierre-de-2-15"
        },
        {
          "id": "t4-d95",
          "title": "Actualizar el Tracker/tubería con la fuente de cada agenda + Comparar CPR/calidad de lead por fuente → Tubería integrada con fuente por agenda + comparativa de fuentes",
          "mission": "Integra tus 3 fuentes",
          "week": 14,
          "suggestedDay": 95,
          "classId": "c4-integraci-n-de-las-3-f-17"
        },
        {
          "id": "t4-d96",
          "title": "Onboardear a los clientes cerrados por webinar + Publicar pieza larga + sacar aprendizajes del 1er webinar → Clientes de webinar onboardeados + aprendizajes documentados",
          "mission": "Onboardea tus clientes nuevos",
          "week": 14,
          "suggestedDay": 96,
          "classId": "c4-onboarding-de-los-clie-19"
        },
        {
          "id": "t4-d99",
          "title": "Auditar el embudo del webinar tramo por tramo e identificar el cuello + Diseñar 2 mejoras a testear en el próximo ciclo → Auditoría del embudo de webinar + 2 mejoras",
          "mission": "Audita tu embudo",
          "week": 15,
          "suggestedDay": 99,
          "classId": "c4-optimizaci-n-del-webin-21"
        },
        {
          "id": "t4-d100",
          "title": "Definir plan de escalado por fuente (DM, Ads, Webinar) + Escribir 2 SOPs adicionales (webinar + entrega) → Plan de escalado + 2 SOPs nuevos",
          "mission": "Define tu plan de escala",
          "week": 15,
          "suggestedDay": 100,
          "classId": "c4-escalado-del-sistema-c-23"
        },
        {
          "id": "t4-d101",
          "title": "Montar tu calendario operativo (Onboarding/1:1/Weekly/Monthly/Cierre) + Grabar 3 videos de coaching pregrabado para Skool (dudas repetidas) → Calendario operativo + 3 videos pregrabados en Skool",
          "mission": "Monta tu calendario operativo",
          "week": 15,
          "suggestedDay": 101,
          "classId": "c4-calendario-operativo-c-25"
        },
        {
          "id": "t4-d102",
          "title": "Instalar el sistema de revisión semanal de métricas (las 8 de servicio + tubería) + Iniciar log Kaizen diario (1-3 mejoras/día) → Sistema de revisión semanal + log Kaizen iniciado",
          "mission": "Instala tu revisión semanal",
          "week": 15,
          "suggestedDay": 102,
          "classId": "c4-mejora-continua-revisi-27"
        },
        {
          "id": "t4-d103",
          "title": "Diseñar 1 propuesta de upsell + programa de referidos + Publicar pieza larga + correr 2do ciclo de captación al grupo → Propuesta de upsell + programa de referidos + 2do grupo poblándose",
          "mission": "Lanza tu programa de referidos",
          "week": 15,
          "suggestedDay": 103,
          "classId": "c4-expansi-n-y-fidelizaci-29"
        },
        {
          "id": "t4-d106",
          "title": "Auditar la tubería end-to-end e identificar los 3 cuellos prioritarios + Priorizar qué optimizar primero en los próximos 90 días → Auditoría final de tubería + top 3 cuellos priorizados",
          "mission": "Audita toda tu tubería",
          "week": 16,
          "suggestedDay": 106,
          "classId": "c4-auditor-a-final-de-la-31"
        },
        {
          "id": "t4-d107",
          "title": "Correr o dejar programado el 2do ciclo de webinar con mejoras + Dejar el grupo y la clase listos para evergreen → 2do webinar corrido/programado + assets evergreen listos",
          "mission": "Corre tu segundo webinar",
          "week": 16,
          "suggestedDay": 107,
          "classId": "c4-2do-webinar-iteraci-n-33"
        },
        {
          "id": "t4-d108",
          "title": "Calcular métricas finales y comparar contra inicio + Recalcular ICO/IEN del negocio → Reporte de métricas finales + ICO/IEN actualizado",
          "mission": "Mide tus resultados finales",
          "week": 16,
          "suggestedDay": 108,
          "classId": "c4-m-tricas-finales-ltv-c-35"
        },
        {
          "id": "t4-d109",
          "title": "Redactar el plan de los próximos 90 días (qué optimizar, qué escalar, qué delegar) + Definir las métricas que vas a vigilar autónomamente → Plan de mejora continua de 90 días",
          "mission": "Escribe tu plan de 90 días",
          "week": 16,
          "suggestedDay": 109,
          "classId": "c4-plan-de-mejora-continu-37"
        },
        {
          "id": "t4-d110",
          "title": "Consolidar el reporte final de los 4 meses + Asistir a la llamada de Cierre y definir el camino (renovar/escalar o transición) → Reporte final de 4 meses + camino definido; sistema completo corriendo y medido",
          "mission": "Cierra tu programa",
          "week": 16,
          "suggestedDay": 110,
          "classId": "c4-cierre-del-programa-re-39"
        }
      ],
      "requiredForms": []
    }
  ]
};

function toUtc(dateIso) {
  const [y, m, d] = dateIso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Valida una fecha YYYY-MM-DD real: el formato correcto no basta ("2026-99-99"
// pasa el regex), así que exigimos round-trip UTC exacto contra el input.
export function isValidDateIso(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function programDay(startDateIso, todayIso) {
  return Math.max(0, Math.round((toUtc(todayIso) - toUtc(startDateIso)) / MS_DAY));
}

export function currentWeek(day) {
  return Math.floor(day / 7) + 1;
}

export function addDays(dateIso, days) {
  return fromUtc(toUtc(dateIso) + days * MS_DAY);
}

export function milestoneDate(startDateIso, milestoneDay) {
  return addDays(startDateIso, milestoneDay);
}

export function weekRange(startDateIso, week) {
  const from = addDays(startDateIso, (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

export function phaseById(id) {
  const phase = PROGRAM.phases.find((p) => p.id === id);
  if (!phase) throw new Error(`Fase desconocida: ${id}`);
  return phase;
}

export function expectedPhaseForDay(day) {
  return (
    PROGRAM.phases.find((phase) => day >= phase.startDay && day < phase.endDay) ??
    PROGRAM.phases[PROGRAM.phases.length - 1]
  );
}

export function isLate(currentPhaseId, day) {
  return day > phaseById(currentPhaseId).endDay;
}
