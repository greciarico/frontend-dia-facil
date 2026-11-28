import type { CarerSupportGuide } from '@/constants/carer-support-guides';

export const carerUnderstandingTopics: CarerSupportGuide[] = [
  { id: 'routines', title: 'Importancia de las rutinas', summary: 'Una rutina clara puede dar orden y previsibilidad.', icon: 'clock', tone: 'yellow', steps: [
    'Mantener horarios parecidos puede ayudar a saber qué viene después.',
    'Usar los mismos pasos puede facilitar seguir la actividad.',
    'Avisar antes de un cambio puede hacerlo más comprensible.',
  ] },
  { id: 'visual-supports', title: 'Apoyos visuales y pictogramas', summary: 'Las imágenes pueden complementar las palabras.', icon: 'imagePlus', tone: 'turquoise', steps: [
    'Elige un pictograma que represente la acción de forma clara.',
    'Coloca la imagen cerca del momento en que se usa.',
    'Revisa si la persona la reconoce y ajústala si hace falta.',
  ] },
  { id: 'anticipation', title: 'Anticipación de actividades', summary: 'Explicar lo que viene puede reducir la incertidumbre.', icon: 'info', tone: 'coral', steps: [
    'Antes de empezar, muestra el nombre y el pictograma de la actividad.',
    'Cuenta cuántos pasos tiene y qué pasará al terminar.',
    'Si hay un cambio, explícalo con palabras sencillas y calma.',
  ] },
  { id: 'autonomy', title: 'Desarrollo de la autonomía', summary: 'Dar espacio para participar puede favorecer la confianza.', icon: 'heartHandshake', tone: 'green', steps: [
    'Ofrece opciones sencillas cuando sea posible.',
    'Deja que la persona intente el paso antes de ayudar.',
    'Reconoce el esfuerzo y respeta su ritmo.',
  ] },
  { id: 'individual', title: 'Adaptación a las necesidades individuales', summary: 'Cada persona puede necesitar apoyos distintos.', icon: 'accessibilityPerson', tone: 'lavender', steps: [
    'Observa qué le resulta fácil y qué le cuesta.',
    'Ajusta pasos, tiempos o imágenes según su respuesta.',
    'Escucha sus preferencias y revisa los ajustes con el tiempo.',
  ] },
];
