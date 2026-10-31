import { AppText as Text } from '@/components/app-text';
import { StyleSheet, View } from 'react-native';
import { sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { ActivityDialog } from './activity-dialog';
import { AreaIcon } from './area-icon';
import { StepDialogActions } from './step-dialog-actions';

export function DeleteStepsDialog({ count, onConfirm, onClose }: { count: number; onConfirm: () => void; onClose: () => void }) {
  const { colors } = useAppTheme();
  const single = count === 1;
  return <ActivityDialog centered showClose compact onClose={onClose}
    title={single ? '¿Estás seguro de que quieres eliminar este paso?' : `¿Estás seguro de que quieres eliminar estos ${count} pasos?`}
    decoration={<View accessible={false} importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { backgroundColor: colors.destructive.surface }]}>
      <AreaIcon name="trash" color={colors.destructive.default} size={sizes.touchTarget} />
    </View>}>
    <Text style={[accountStyles.small, styles.description, { color: colors.text.secondary }]}>
      {single ? 'Este paso se eliminará de la actividad y ya no se mostrará en los pasos a seguir de la agenda.'
        : 'Estos pasos se eliminarán de la actividad y ya no se mostrarán en los pasos a seguir de la agenda.'}
    </Text>
    <StepDialogActions label="Eliminar" destructive onConfirm={onConfirm} onCancel={onClose} />
  </ActivityDialog>;
}
const styles = StyleSheet.create({
  circle: { width: sizes.touchTarget + spacing['3xl'], height: sizes.touchTarget + spacing['3xl'], borderRadius: sizes.touchTarget,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  description: { textAlign: 'center' },
});
