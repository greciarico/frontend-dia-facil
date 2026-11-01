/** Informational copy only. No profile preferences, provider requests or feature actions. */
export const accessibilityCapabilities = [
  {
    id: 'visual', title: 'Apoyo visual', category: 'Comprensión', icon: 'imagePlus',
    summary: 'Reconoce las actividades y las acciones con apoyo de imágenes.',
    headline: 'Comprender también puede ser visual',
    description: 'Los iconos permiten reconocer las actividades. Los pictogramas representan las acciones de sus pasos. Las imágenes acompañan al texto y no lo sustituyen.',
    benefits: ['Una identidad visual para cada actividad.', 'Pictogramas junto a las instrucciones de los pasos.', 'Información centrada en la acción del momento.'],
    planned: false,
  },
  {
    id: 'steps', title: 'Paso a paso', category: 'Comprensión', icon: 'steps',
    summary: 'Una acción a la vez, en una secuencia clara.', headline: 'Una acción a la vez',
    description: 'La guía muestra los pasos reales de la actividad en el orden preparado por el cuidador. Permite avanzar y volver a consultar las instrucciones.',
    benefits: ['Una secuencia preparada para la actividad.', 'Avance mediante Siguiente paso.', 'Posibilidad de recordar los pasos después de completar la actividad.'],
    planned: false,
  },
  {
    id: 'voice', title: 'Lectura de voz', category: 'Apoyo auditivo', icon: 'audio',
    summary: 'Escucha la instrucción y vuelve a escucharla cuando lo necesites.', headline: 'Un apoyo para escuchar las instrucciones',
    description: 'Cuando está activada para la persona usuaria, DiaFácil lee el mensaje del detalle y la instrucción del paso visible. El icono de voz permite repetir esa misma lectura.',
    benefits: ['Lectura del mensaje «Es hora de…».', 'Lectura del paso que se está mostrando.', 'El cuidador decide si esta ayuda se utiliza en cada PerfilUsuario. No incluye lectura de voz en el área del Cuidador.'],
    planned: false,
  },
  {
    id: 'text', title: 'Texto adaptable', category: 'Visual', icon: 'textSize',
    summary: 'Elige un tamaño de texto que resulte más cómodo.', headline: 'Una lectura más cómoda',
    description: 'Pequeño, Mediano y Grande adaptan la presentación del texto y conservan el escalado del sistema. Los ajustes del Cuidador y los de cada PerfilUsuario son independientes.',
    benefits: ['Tres tamaños para distintas necesidades.', 'Contenido que puede crecer y ocupar varias líneas.', 'Preferencias propias de cada cuenta o perfil.'],
    planned: false,
  },
  {
    id: 'contrast', title: 'Alto contraste', category: 'Visual', icon: 'contrast',
    summary: 'Una apariencia oscura de alta legibilidad y menor luminosidad.', headline: 'Distingue lo importante con mayor claridad',
    description: 'Alto contraste ofrece superficies oscuras y textos y controles diferenciados. Los pictogramas y los iconos conservan sus colores originales.',
    benefits: ['Menor luminosidad en la presentación.', 'Acciones y contenido claramente diferenciados.', 'Estados que combinan texto e iconos, además del color.'],
    planned: false,
  },
  {
    id: 'help', title: 'Solicitar ayuda', category: 'Acompañamiento', icon: 'support',
    summary: 'Permite que la persona usuaria te avise cuando necesita ayuda durante una actividad.', headline: 'Acompañar cuando hace falta',
    description: 'Esta función está prevista para un próximo incremento. La persona usuaria podrá avisarte cuando necesite ayuda. Podrás saber en qué actividad y paso necesita acompañamiento.',
    benefits: ['La persona usuaria podrá solicitarte ayuda sin redactar mensajes.', 'Podrás conocer la actividad y el paso en los que necesita acompañamiento.', 'El envío de solicitudes y las notificaciones al cuidador todavía no están disponibles.'],
    planned: true,
  },
] as const;

export type AccessibilityCapability = (typeof accessibilityCapabilities)[number];
