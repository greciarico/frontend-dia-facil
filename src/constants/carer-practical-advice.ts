import type { CarerSupportGuide } from '@/constants/carer-support-guides';

export const carerPracticalAdvice: CarerSupportGuide[] = [
  { id: 'positive', title: 'Acompañar de forma positiva', summary: 'Prueba palabras y gestos que transmitan calma y confianza.', icon: 'support', tone: 'lavender', steps: [
    'Usa un tono tranquilo y palabras sencillas.',
    'Nombre lo que hizo bien antes de dar una indicación.',
    'Si algo no sale como esperabas, vuelve a explicar con calma.',
  ] },
  { id: 'instructions', title: 'Dar instrucciones claras', summary: 'Una indicación corta es más fácil de seguir.', icon: 'audio', tone: 'blue', steps: [
    'Di una acción cada vez: «Toma la taza».',
    'Usa palabras concretas y evita frases largas.',
    'Pregunta con una frase corta si hace falta repetirla.',
  ] },
  { id: 'pace', title: 'Respetar el ritmo de cada persona', summary: 'El tiempo de la persona también es parte de la actividad.', icon: 'clock', tone: 'yellow', steps: [
    'Espera unos segundos antes de repetir una indicación.',
    'Ayuda solo con la parte que pide.',
    'Propón un descanso si lo necesita.',
  ] },
  { id: 'achievements', title: 'Celebrar pequeños logros', summary: 'Mencionar avances concretos puede mantener el interés.', icon: 'sparkles', tone: 'coral', steps: [
    'Di el paso terminado: «Has guardado la cuchara».',
    'Usa elogios breves y específicos.',
    'Al terminar, cuenta qué salió bien.',
  ] },
  { id: 'agenda', title: 'Evitar sobrecargar la agenda', summary: 'Menos actividades bien elegidas pueden ser más cómodas.', icon: 'activities', tone: 'green', steps: [
    'Revisa la rutina antes de añadir otra actividad.',
    'Deja espacios sin actividad entre rutinas.',
    'Si hay mucho que hacer, prioriza lo necesario para ese día.',
  ] },
  { id: 'changes', title: 'Introducir cambios gradualmente', summary: 'Cambiar un detalle a la vez puede ser más fácil.', icon: 'refresh', tone: 'turquoise', steps: [
    'Modifica primero la hora o el orden de un paso.',
    'Mantén estable el resto de la rutina mientras se acostumbra.',
    'Observa la respuesta antes de probar otro cambio.',
  ] },
  { id: 'independence', title: 'Fomentar la independencia', summary: 'Pequeñas decisiones pueden aumentar la participación.', icon: 'steps', tone: 'blue', steps: [
    'Prepara el material al alcance de la persona.',
    'Haz una sola pregunta para saber qué prefiere.',
    'Reduce la ayuda poco a poco cuando ya realiza el paso.',
  ] },
];
