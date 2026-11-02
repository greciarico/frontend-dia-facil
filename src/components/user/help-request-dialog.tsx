import { Image } from 'expo-image';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/app-text';
import { ActivityDialog } from '@/components/carer/activity-dialog';
import { StepDialogActions } from '@/components/carer/step-dialog-actions';
import { ContinueButton } from '@/components/carer/continue-button';
import { useHelpRequest } from '@/hooks/use-help-request';
import type { HelpContext } from '@/utils/help-notifications';
import { spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function HelpIllustration({ compact = false }: { compact?: boolean }) {
  return <Image source={require('@/assets/illustrations/user-help.png')} accessible={false} contentFit="contain"
    style={{ width: '100%', maxWidth: compact ? 210 : 310, aspectRatio: 1447 / 1087, alignSelf: 'center' }} />;
}
/** Keep mounted when closed so an uncertain request retains its operation key. */
export function HelpRequestDialog({ visible, onClose, context, description }: {
  visible: boolean; onClose: () => void; context?: HelpContext; description?: string;
}) {
  const request = useHelpRequest(context), { colors } = useAppTheme();
  const reopen = request.reopen;
  useEffect(() => { if (visible) reopen(); }, [visible, reopen]);
  if (!visible) return null;
  const close = () => { if (!request.busy) onClose(); };
  return <ActivityDialog title={request.success ? 'Solicitud registrada' : '¿Quieres solicitar ayuda?'} onClose={close}
    centered showClose respectSafeArea closeLabel="Cerrar solicitud de ayuda" decoration={<HelpIllustration compact />}
    description={request.success ? undefined : description ?? 'Se registrará una notificación para que tu cuidador sepa que necesitas ayuda.'}>
    {!!request.message && <AppText accessibilityRole={request.success ? 'text' : 'alert'} accessibilityLiveRegion="polite"
      style={[styles.copy, { color: request.success ? colors.status.success : colors.text.primary }]}>{request.message}</AppText>}
    {request.remaining > 0 && <AppText style={[styles.copy, { color: colors.text.secondary }]}>Puedes volver a pedir ayuda en {request.remaining} segundos.</AppText>}
    {request.busy && <View><ActivityIndicator color={colors.action.primary} accessibilityLabel="Comprobando solicitud de ayuda" /></View>}
    {request.success ? <ContinueButton label="Entendido" size="modal" onPress={close} />
      : <StepDialogActions label={request.busy ? 'Enviando…' : request.uncertain ? 'Consultar resultado' : 'Sí, pedir ayuda'}
        onCancel={close} onConfirm={() => { void (request.uncertain ? request.recover() : request.submit()); }}
        disabled={request.busy || request.remaining > 0} />}
  </ActivityDialog>;
}
const styles = StyleSheet.create({ copy: { fontFamily: typography.family.regular, fontSize: typography.size.md,
  lineHeight: typography.lineHeight.md, textAlign: 'center', marginBottom: spacing.xs } });
