export const emptyOtp = (): string[] => Array<string>(6).fill('');

export function updateOtp(digits: string[], index: number, text: string): { digits: string[]; focus: number } {
  if (!/^[0-9]{0,6}$/.test(text)) return { digits: [...digits], focus: index };
  if (text.length === 6) return { digits: text.split(''), focus: 5 };
  const next = [...digits];
  if (!text) next[index] = '';
  else for (let offset = 0; offset < text.length && index + offset < 6; offset++) next[index + offset] = text[offset];
  return { digits: next, focus: text ? Math.min(5, index + text.length) : index };
}

export function remainingSeconds(target: number | undefined, now = Date.now()): number {
  return target !== undefined && Number.isFinite(target) ? Math.max(0, Math.ceil((target - now) / 1000)) : 0;
}

export function resendLabel(seconds: number): string {
  if (seconds <= 0) return 'Enviar de nuevo';
  return `Enviar de nuevo (${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')})`;
}
