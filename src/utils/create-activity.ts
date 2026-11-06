import { activityNameError, type ActivityIconOption } from './activity-icon-options';
import { stepDescriptionError, type DraftStep } from './activity-draft';

export type ActivityInput = { nombre: string; hora: string; codigoIcono: string;
  pasos: { descripcion: string; idArasaac: number | null }[] };
export function activityInputError(name: string, time: number | null, icon: ActivityIconOption | null, steps: DraftStep[]) {
  if (activityNameError(name)) return activityNameError(name);
  if (time === null || !Number.isInteger(time) || time < 0 || time >= 24 * 60) return 'Selecciona una hora.';
  if (!icon || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(icon.codigo) || icon.codigo.length > 60) return 'Selecciona un ícono.';
  if (!steps.length) return 'Agrega al menos un paso.';
  for (const step of steps) {
    if (stepDescriptionError(step.descripcion)) return 'Revisa los pasos: cada uno necesita una descripción de hasta 120 caracteres.';
    if (step.pictograma && (step.pictograma.fuente !== 'ARASAAC' || !Number.isInteger(step.pictograma.idArasaac)
      || step.pictograma.idArasaac! <= 0 || step.pictograma.idArasaac! > 2147483647)) return 'Cambia el pictograma no compatible o deja ese paso sin imagen.';
  }
}
export function createActivityInput(name: string, time: number | null, icon: ActivityIconOption | null, steps: DraftStep[]): ActivityInput {
  const error = activityInputError(name, time, icon, steps);
  if (error) throw new Error(error);
  return { nombre: name.trim(), hora: `${String(Math.floor(time! / 60)).padStart(2, '0')}:${String(time! % 60).padStart(2, '0')}`,
    codigoIcono: icon!.codigo, pasos: steps.map(step => ({ descripcion: step.descripcion, idArasaac: step.pictograma?.idArasaac ?? null })) };
}
