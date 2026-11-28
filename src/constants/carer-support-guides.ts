import type { AreaIconName } from '@/components/carer/area-icon';
import type { SupportGuideTone } from '@/theme/tokens';

export type CarerSupportGuide = { id: string; title: string; summary: string; steps: string[]; icon: AreaIconName; tone: SupportGuideTone };

export const carerSupportGuides: CarerSupportGuide[] = [
  { id: 'profiles', title: 'Crear una persona', summary: 'Agrega a la persona que usará la agenda.', icon: 'profiles', tone: 'lavender', steps: [
    'En Personas, pulsa Agregar persona.',
    'Escribe el nombre y elige un avatar.',
    'Pulsa Continuar y luego Comenzar.',
  ] },
  { id: 'device', title: 'Vincular un dispositivo', summary: 'Conecta el celular o la tablet de la persona.', icon: 'device', tone: 'blue', steps: [
    'Abre el perfil de la persona y pulsa Vincular dispositivo.',
    'Muestra el código QR o pulsa Copiar código de vinculación.',
    'En el otro dispositivo, elige Escanear código QR o Ingresar código y pulsa Conectar mi agenda.',
  ] },
  { id: 'activity', title: 'Crear una actividad', summary: 'Agrega una rutina a la agenda de la persona.', icon: 'activities', tone: 'green', steps: [
    'En Rutina, pulsa Nueva actividad.',
    'Escribe el nombre y elige la hora y un ícono.',
    'Agrega al menos un paso y pulsa Crear actividad.',
  ] },
  { id: 'steps', title: 'Agregar pasos y apoyos visuales', summary: 'Explica cada actividad con pasos e imágenes.', icon: 'imagePlus', tone: 'turquoise', steps: [
    'En Paso a paso, pulsa Agregar paso.',
    'Escribe qué debe hacer y elige un pictograma.',
    'Pulsa Guardar. Puedes tener hasta 7 pasos.',
  ] },
  { id: 'manage', title: 'Gestionar actividades', summary: 'Edita o elimina actividades de la rutina.', icon: 'pencil', tone: 'coral', steps: [
    'En Rutina, pulsa Acciones de la actividad.',
    'Elige Editar actividad o Eliminar actividad.',
    'Guarda los cambios o confirma la eliminación.',
  ] },
  { id: 'progress', title: 'Consultar el progreso', summary: 'Revisa qué actividades se completaron.', icon: 'clock', tone: 'yellow', steps: [
    'Abre Seguimiento en el perfil de la persona.',
    'Elige una fecha con Día anterior, Día siguiente o Seleccionar fecha.',
    'Revisa el Progreso diario y pulsa una tarjeta para ver los pasos.',
  ] },
  { id: 'accessibility', title: 'Configurar accesibilidad', summary: 'Ajusta cómo se ve la app para ti.', icon: 'accessibility', tone: 'blue', steps: [
    'En Mi perfil, pulsa Configurar accesibilidad.',
    'Elige el Tamaño del texto y activa Alto contraste si lo necesitas.',
    'Los cambios se guardan automáticamente.',
  ] },
];
