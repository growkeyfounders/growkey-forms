export type FieldType =
  | "text"
  | "textarea"
  | "currency"
  | "singleSelect"
  | "multiSelect"
  | "rating";

export type FieldDefinition = {
  id: string;
  label: string;
  prompt: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  span?: "half" | "full";
};

export type SectionDefinition = {
  id: string;
  step: string;
  title: string;
  eyebrow?: string;
  fields: FieldDefinition[];
};

export type FormConfig = {
  slug: string;
  path: string;
  adminPath: string;
  title: string;
  shortTitle: string;
  railKicker: string;
  railTitle: string;
  introEyebrow: string;
  introTitle: string;
  introCopy: string;
  submitLabel: string;
  thanksTitle: string;
  thanksCopy: string;
  sections: SectionDefinition[];
};

export type FormValues = Record<string, string | string[] | number>;

export const ONBOARDING_SLUG = "growkey-onboarding-v1";
export const OFFER_SLUG = "growkey-offer-v1";

const onboardingSections: SectionDefinition[] = [
  {
    id: "start",
    step: "00",
    title: "Datos iniciales",
    fields: [
      {
        id: "client",
        label: "Nombre",
        prompt: "Nombre completo de la persona que inicia el programa.",
        type: "text",
        required: true,
        span: "half",
      },
      {
        id: "email",
        label: "Email",
        prompt: "Correo principal para seguimiento.",
        type: "text",
        required: true,
        span: "half",
      },
      {
        id: "business",
        label: "Marca / negocio",
        prompt: "Nombre de tu marca, negocio o proyecto personal.",
        type: "text",
        required: true,
        span: "half",
      },
      {
        id: "mainProfile",
        label: "Red principal",
        prompt: "Link o usuario de la red social donde quieres crecer primero.",
        type: "text",
        required: true,
        span: "half",
      },
    ],
  },
  {
    id: "discovery",
    step: "01",
    title: "Descubrimiento",
    fields: [
      {
        id: "niche",
        label: "Sector o nicho",
        prompt: "¿En qué industria, tema o especialidad tienes experiencia?",
        type: "multiSelect",
        required: true,
        options: [
          "Legal",
          "Salud",
          "Finanzas",
          "Negocios",
          "Marketing",
          "Educación",
          "Productividad",
          "Relaciones",
          "Bienestar",
          "Espiritualidad",
          "Otro",
        ],
        span: "half",
      },
      {
        id: "channel",
        label: "Canal",
        prompt: "¿Cómo nos conociste por primera vez?",
        type: "singleSelect",
        required: true,
        options: [
          "Instagram Reel",
          "Instagram Post",
          "YouTube",
          "Entrevista",
          "Referido",
          "LinkedIn",
          "Otro",
        ],
        span: "half",
      },
      {
        id: "decisionFit",
        label: "Qué te hizo avanzar",
        prompt:
          "De todo lo que viste, ¿qué sentiste que encajaba mejor con lo que estabas buscando?",
        type: "multiSelect",
        required: true,
        options: [
          "La posibilidad de crear ingresos más predecibles",
          "La idea de monetizar lo que ya sé o hago bien",
          "La claridad de seguir una estrategia paso a paso",
          "Crear una comunidad en vez de depender solo de asesorías 1 a 1",
          "Mi situación actual me generó urgencia",
          "Otro",
        ],
        span: "half",
      },
      {
        id: "clarity",
        label: "Claridad",
        prompt:
          "Para acompañarte mejor, ¿en qué temas sientes que todavía te falta claridad?",
        type: "multiSelect",
        required: true,
        options: [
          "Qué oferta debería crear",
          "Cómo convertir contenido en una comunidad",
          "Cómo funciona un modelo de suscripción",
          "Qué contenido debería publicar",
          "Cómo vender sin depender solo de mensajes manuales",
          "Cómo organizar mi tiempo y ejecución",
          "Otro",
        ],
        span: "half",
      },
    ],
  },
  {
    id: "current",
    step: "02",
    title: "Situación actual",
    eyebrow:
      "Cuanta mayor claridad nos brindes sobre tu punto de partida, mejor podremos ayudarte a llegar a la situación deseada.",
    fields: [
      {
        id: "doubts",
        label: "Dudas",
        prompt:
          "Antes de empezar, ¿qué era lo que más te preocupaba o te generaba dudas sobre el proceso?",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "expectation",
        label: "Expectativa",
        prompt:
          "Si logramos una única cosa importante que haga que este acompañamiento sea un éxito, ¿qué sería?",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "programDecision",
        label: "Decisión",
        prompt: "¿Por qué decidiste iniciar este proceso y no seguir intentando por tu cuenta?",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "purpose",
        label: "Propósito",
        prompt: "¿Por qué quieres crear una comunidad o monetizar mejor tus redes?",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "problem",
        label: "Problema principal",
        prompt:
          "¿Cuál crees que es el problema #1 que está frenando actualmente tu crecimiento o monetización?",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "solution",
        label: "Lo que necesitas",
        prompt:
          "¿Qué consideras que te está haciendo falta para resolver ese problema?",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "context",
        label: "Contexto",
        prompt:
          "¿Qué cosas ya has intentado y por qué sientes que no funcionaron como esperabas?",
        type: "textarea",
        span: "half",
      },
      {
        id: "goals",
        label: "Objetivos",
        prompt:
          "¿Cuáles son tus 3 objetivos principales durante los próximos meses?",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "challenges",
        label: "Desafíos",
        prompt: "¿Con cuáles de estos desafíos te identificas hoy?",
        type: "multiSelect",
        required: true,
        options: [
          "He probado muchas estrategias sin resultados claros",
          "No tengo una oferta clara",
          "Dependo demasiado de mi presencia o tiempo",
          "Mis ingresos son impredecibles",
          "Tengo audiencia pero no veo suficiente retorno",
          "No sé qué publicar de forma consistente",
          "Otro",
        ],
        span: "full",
      },
    ],
  },
  {
    id: "finance",
    step: "03",
    title: "Finanzas",
    fields: [
      {
        id: "annualRevenue",
        label: "Ingreso anual",
        prompt: "¿Cuál fue tu ingreso aproximado en los últimos 12 meses? (USD)",
        type: "currency",
        required: true,
        span: "half",
      },
      {
        id: "quarterRevenue",
        label: "Ingreso promedio trimestral",
        prompt: "¿Cuál fue tu ingreso promedio en los últimos 3 meses? (USD)",
        type: "currency",
        required: true,
        span: "half",
      },
      {
        id: "lastMonthRevenue",
        label: "Ingreso último mes",
        prompt: "¿Cuál fue tu facturación o ingreso el último mes?",
        type: "currency",
        required: true,
        span: "half",
      },
      {
        id: "ticket",
        label: "Ticket actual",
        prompt: "Si ya vendes algo, ¿cuál es el valor promedio de tu oferta actual?",
        type: "currency",
        required: true,
        span: "half",
      },
    ],
  },
  {
    id: "offer",
    step: "04",
    title: "Oferta y comunidad",
    fields: [
      {
        id: "elevatorPitch",
        label: "Elevator pitch",
        prompt:
          "¿Tienes claro a quién ayudas, qué resultado prometes y a través de qué método? Escríbelo como lo explicarías en una frase.",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "problemClarity",
        label: "Claridad del dolor",
        prompt:
          "¿Qué tan claro tienes el problema/dolor principal que resuelve tu oferta o futura comunidad?",
        type: "rating",
        required: true,
        span: "half",
      },
      {
        id: "differentiator",
        label: "Factor diferencial",
        prompt:
          "¿Sientes que tu oferta, enfoque o experiencia se diferencia claramente de otras opciones del mercado?",
        type: "singleSelect",
        required: true,
        options: ["Sí", "No", "No estoy seguro/a", "Otro"],
        span: "full",
      },
    ],
  },
];

const competitorPrompt = "Pon el link a su Instagram, TikTok, YouTube o web. Cuantos más referentes, mejor.";

const offerSections: SectionDefinition[] = [
  {
    id: "start",
    step: "00",
    title: "Datos iniciales",
    eyebrow:
      "Este ejercicio lleva tiempo. Te recomendamos hacerlo con calma para que podamos ayudarte con mucha más precisión.",
    fields: [
      {
        id: "client",
        label: "Nombre y apellido",
        prompt: "Escribe tu nombre completo.",
        type: "text",
        required: true,
        span: "half",
      },
      {
        id: "avatarNiche",
        label: "Avatar / nicho",
        prompt:
          "Describe a quién quieres ayudar. Ejemplo: personas espirituales, abogados, coaches, emprendedores, médicos, artistas o cualquier industria.",
        type: "textarea",
        required: true,
        placeholder: "Personas espirituales",
        span: "full",
      },
    ],
  },
  {
    id: "offer",
    step: "01",
    title: "Oferta",
    fields: [
      {
        id: "newOpportunity",
        label: "Nueva oportunidad (efecto wow)",
        prompt:
          'Ejemplo: "Consigue libertad de tiempo y financiera creando una marca familiar".',
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "uniqueMechanism",
        label: "Mecanismo único (tu comunidad)",
        prompt:
          "Ejemplo: A través de [NOMBRE DE TU COMUNIDAD]. Escribe el mecanismo, comunidad o método que hará posible la transformación.",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "avatarDesires",
        label: "Principales deseos de tu avatar",
        prompt:
          "Pon la mayor cantidad de deseos posibles.\nEnuméralos de mayor a menor importancia.\nEjemplo: 1. Quieren ganar más dinero.",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "avatarProblems",
        label: "Principales problemas de tu avatar",
        prompt:
          "Pon la mayor cantidad de problemas posibles.\nEnuméralos y asocia el problema respectivo al deseo.\nEjemplo: 1. No ganan suficiente dinero.",
        type: "textarea",
        required: true,
        span: "half",
      },
      {
        id: "offerStatement",
        label: "Oferta",
        prompt:
          "Que cualquier persona que lo lea lo entienda.\nUsa esta plantilla: Comunidad para [NICHO] que quieren [NUEVA OPORTUNIDAD].",
        type: "textarea",
        required: true,
        span: "full",
      },
      {
        id: "differentiation",
        label: "Diferenciación",
        prompt:
          "¿Cuál es tu ventaja competitiva en tu industria? ¿Qué te hace diferente de los demás?",
        type: "textarea",
        required: true,
        span: "full",
      },
    ],
  },
  {
    id: "competitors",
    step: "02",
    title: "Competidores y referentes",
    eyebrow:
      "Pon aquí competidores o referentes de los cuales haya cosas que te gustaría hacer como ellos. No necesariamente tienen que tener una comunidad, ser de tu nicho o vender algo como tú. Es más fácil replicar lo que ya funciona que crear todo desde cero.",
    fields: Array.from({ length: 10 }, (_, index) => ({
      id: `competitor${index + 1}`,
      label: `Competidor / Referente #${index + 1}`,
      prompt: competitorPrompt,
      type: "text" as const,
      required: index < 3,
      span: "half" as const,
    })),
  },
  {
    id: "questions",
    step: "03",
    title: "Dudas o bloqueos",
    eyebrow:
      "Déjalo por aquí. Todo lo que compartas nos servirá para darte feedback más personalizado.",
    fields: [
      {
        id: "questions",
        label: "Preguntas",
        prompt: "La calidad de tus preguntas determinará la calidad de nuestras respuestas.",
        type: "textarea",
        span: "full",
      },
    ],
  },
];

export const onboardingForm: FormConfig = {
  slug: ONBOARDING_SLUG,
  path: "/onboarding",
  adminPath: "/admin/onboarding",
  title: "Onboarding inicial",
  shortTitle: "Onboarding",
  railKicker: "Onboarding inicial",
  railTitle: "Mapa inicial del cliente",
  introEyebrow: "Inicio del acompañamiento",
  introTitle: "Diagnóstico de entrada",
  introCopy:
    "Completa esta información con la mayor claridad posible. La usaremos para entender tu punto de partida y acompañarte mejor durante el proceso.",
  submitLabel: "Enviar diagnóstico",
  thanksTitle: "Gracias. Ya tenemos tu diagnóstico inicial.",
  thanksCopy:
    "Nuestro equipo revisará tus respuestas antes de la siguiente sesión para preparar mejor tu acompañamiento.",
  sections: onboardingSections,
};

export const offerForm: FormConfig = {
  slug: OFFER_SLUG,
  path: "/offer",
  adminPath: "/admin/offer",
  title: "Ejercicio de oferta",
  shortTitle: "Oferta",
  railKicker: "Ejercicio de oferta",
  railTitle: "Mapa de avatar, oferta y referentes",
  introEyebrow: "Panel de cliente",
  introTitle: "Ejercicio de oferta",
  introCopy:
    "Completa este formulario sin perder la información: todo quedará guardado para revisar tu oferta, crear contenido y preparar una estrategia más clara.",
  submitLabel: "Enviar ejercicio",
  thanksTitle: "Gracias. Ya tenemos tu ejercicio de oferta.",
  thanksCopy:
    "Nuestro equipo revisará tus respuestas para darte feedback más personalizado y usar esta información en tu panel de cliente.",
  sections: offerSections,
};

export const formConfigs = [onboardingForm, offerForm];

export const sections = offerForm.sections;
export const allFields = sections.flatMap((section) => section.fields);

export function getFormBySlug(slug: string | null | undefined): FormConfig {
  return formConfigs.find((form) => form.slug === slug) ?? offerForm;
}

export function inferFormSlug(values: FormValues): string {
  if (values.formSlug === ONBOARDING_SLUG || values.business || values.mainProfile || values.email) {
    return ONBOARDING_SLUG;
  }
  return OFFER_SLUG;
}

export function createEmptyValues(targetSections: SectionDefinition[] = sections): FormValues {
  return targetSections.flatMap((section) => section.fields).reduce<FormValues>((values, field) => {
    if (field.type === "multiSelect") values[field.id] = [];
    else if (field.type === "rating") values[field.id] = 0;
    else values[field.id] = "";
    return values;
  }, {});
}
