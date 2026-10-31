import { useEffect, useRef, useState } from 'react';
import { AppText } from '@/components/app-text';
import { useSession } from '@/context/session';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { ActivityDialog } from './activity-dialog';
import { StepDialogActions } from './step-dialog-actions';

/** Only UI confirmation; all credential cleanup/revocation stays in the existing manager. */
export function LogoutDialog({ onClose }: { onClose: () => void }) {
  const { manager } = useSession(), { colors } = useAppTheme();
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const active = useRef(false), pending = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const close = () => { if (!pending.current) onClose(); };
  async function confirm() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(false);
    try { await manager.logout(); }
    catch { if (active.current) setError(true); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }
  return <ActivityDialog title="¿Cerrar sesión?" description="Podrás volver a entrar cuando lo necesites."
    centered compact showClose respectSafeArea closeLabel="Cancelar cierre de sesión" onClose={close}>
    {error && <AppText accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>No pudimos guardar el cierre de sesión. Inténtalo de nuevo.</AppText>}
    <StepDialogActions label={busy ? 'Cerrando sesión…' : 'Cerrar sesión'} onCancel={close} onConfirm={() => void confirm()} disabled={busy} />
  </ActivityDialog>;
}
