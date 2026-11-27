import { parseActivities, type ActivitySummary } from './activities';
import { initialStepsDraft, parseStepPictogram, stepDescriptionError, type DraftStep, type StepPictogram, type StepsDraft } from './activity-draft';
import type { ActivityInput } from './create-activity';

export type EditableActivity = ActivitySummary & {
  revision: number;
  estadoHoy: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
  pasos: { idPasoActividad: number; descripcion: string; pictograma: StepPictogram }[];
};
export type EditStepInput = ActivityInput['pasos'][number] & { conservarPictogramaDePaso?: number };
export type EditActivityInput = Omit<ActivityInput, 'pasos'> & { pasos: EditStepInput[] };

export function parseEditableActivity(raw: unknown, expectedId: number): EditableActivity {
  const summary = parseActivities({ actividades: [raw] }).actividades[0];
  const data = raw as Record<string, unknown>;
  if (summary.idActividad !== expectedId || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1
    || (data.estadoHoy !== 'PENDIENTE' && data.estadoHoy !== 'EN_PROGRESO' && data.estadoHoy !== 'COMPLETADA')
    || !Array.isArray(data.pasos)) throw new Error('Respuesta inválida.');
  const ids = new Set<number>();
  const pasos = data.pasos.map(paso => {
    if (!paso || !Number.isSafeInteger(paso.idPasoActividad) || paso.idPasoActividad < 1 || ids.has(paso.idPasoActividad)
      || typeof paso.descripcion !== 'string' || stepDescriptionError(paso.descripcion)) throw new Error('Paso inválido.');
    ids.add(paso.idPasoActividad);
    return { idPasoActividad: paso.idPasoActividad as number, descripcion: paso.descripcion as string,
      pictograma: parseStepPictogram(paso.pictograma) };
  });
  return { ...summary, revision: Number(data.revision), estadoHoy: data.estadoHoy, pasos };
}

export function initialEditDraft(activity: EditableActivity): StepsDraft {
  return { ...initialStepsDraft, personalized: true, steps: activity.pasos.map((p, index) => ({
    key: `saved-${p.idPasoActividad}`, orden: index + 1, descripcion: p.descripcion, pictograma: p.pictograma,
  })) };
}

export function editSteps(steps: DraftStep[], activity?: EditableActivity): EditStepInput[] {
  return steps.map(step => {
    const original = activity?.pasos.find(p => step.key === `saved-${p.idPasoActividad}`);
    return { descripcion: step.descripcion, idArasaac: step.pictograma?.idArasaac ?? null,
      ...(original && step.pictograma && !step.pictograma.idArasaac
        ? { conservarPictogramaDePaso: original.idPasoActividad } : {}) };
  });
}

export function matchesSaved(input: EditActivityInput, saved: EditableActivity, initial: EditableActivity) {
  return input.nombre === saved.nombre && input.hora === saved.hora && input.codigoIcono === saved.codigoIcono
    && input.pasos.length === saved.pasos.length && input.pasos.every((step, i) => {
      const actual = saved.pasos[i];
      if (step.descripcion !== actual.descripcion) return false;
      if (!step.conservarPictogramaDePaso) return step.idArasaac === (actual.pictograma?.idArasaac ?? null)
        && (!actual.pictograma || !!step.idArasaac);
      const original = initial.pasos.find(p => p.idPasoActividad === step.conservarPictogramaDePaso);
      return !!original?.pictograma && original.pictograma.idPictograma === actual.pictograma?.idPictograma;
    });
}
