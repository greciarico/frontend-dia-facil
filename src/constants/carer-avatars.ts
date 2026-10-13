/** Local originals. IDs are persisted by the backend, never file paths. */
export const carerAvatars = {
  'person-01': require('@/assets/avatars/person-01.svg'),
  'person-02': require('@/assets/avatars/person-02.svg'),
  'person-03': require('@/assets/avatars/person-03.svg'),
  'person-04': require('@/assets/avatars/person-04.svg'),
  'person-05': require('@/assets/avatars/person-05.svg'),
  'person-06': require('@/assets/avatars/person-06.svg'),
  'person-07': require('@/assets/avatars/person-07.svg'),
  'person-08': require('@/assets/avatars/person-08.svg'),
  'person-09': require('@/assets/avatars/person-09.svg'),
  'person-10': require('@/assets/avatars/person-10.svg'),
  'animal-01': require('@/assets/avatars/animal-01.svg'),
  'animal-02': require('@/assets/avatars/animal-02.svg'),
  'animal-03': require('@/assets/avatars/animal-03.svg'),
  'animal-04': require('@/assets/avatars/animal-04.svg'),
  'animal-05': require('@/assets/avatars/animal-05.svg'),
  'animal-06': require('@/assets/avatars/animal-06.svg'),
  'animal-07': require('@/assets/avatars/animal-07.svg'),
  'animal-08': require('@/assets/avatars/animal-08.svg'),
  'animal-09': require('@/assets/avatars/animal-09.svg'),
  'animal-10': require('@/assets/avatars/animal-10.svg'),
} as const;
export type CarerAvatarId = keyof typeof carerAvatars;
export const carerAvatarIds = Object.keys(carerAvatars) as CarerAvatarId[];
export const quickCarerAvatars: CarerAvatarId[] = ['person-01', 'person-02', 'animal-01', 'animal-02'];
const labels: Record<CarerAvatarId, string> = {
  'person-01': 'Persona de cabello corto y gafas redondas',
  'person-02': 'Persona de cabello largo y gafas',
  'person-03': 'Persona de cabello oscuro y gafas rectangulares',
  'person-04': 'Persona de cabello rojo sonriendo',
  'person-05': 'Persona con gorro gris',
  'person-06': 'Persona con boina gris',
  'person-07': 'Persona de cabello corto guiñando un ojo',
  'person-08': 'Persona de cabello rizado y gorro rosa',
  'person-09': 'Persona con barba y gorro azul',
  'person-10': 'Persona de cabello violeta haciendo señal de victoria',
  'animal-01': 'Perezoso con camiseta blanca',
  'animal-02': 'Oveja con jersey rosa',
  'animal-03': 'Cocodrilo con sombrero',
  'animal-04': 'Conejo con vestido azul',
  'animal-05': 'Panda con chaqueta roja',
  'animal-06': 'Grupo de oso, gato, hámster y pato',
  'animal-07': 'Grupo de zorro, panda, pingüino y elefante',
  'animal-08': 'Jirafa con pañuelo verde',
  'animal-09': 'León con pañuelo azul',
  'animal-10': 'Grupo de cuatro animales con pañuelos',
};
export function avatarLabel(id: CarerAvatarId): string { return labels[id]; }
