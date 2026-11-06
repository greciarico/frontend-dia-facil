import { useAppTheme } from '@/theme/use-theme';
import { Pressable, StyleSheet } from 'react-native';
import { shadows, sizes, spacing } from '@/theme/tokens';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';

export const activityFabSize = sizes.touchTarget + spacing.sm;
export function CreateActivityButton({ id, onCreateActivity, floating = false }: { id: number; onCreateActivity?: (id: number) => void; floating?: boolean }) {
  const { colors } = useAppTheme();
  if (floating) return <Pressable accessibilityRole="button" accessibilityLabel="Nueva actividad"
    disabled={!onCreateActivity} accessibilityState={{ disabled: !onCreateActivity }}
    onPress={onCreateActivity ? () => onCreateActivity(id) : undefined}
    style={({ pressed }) => [styles.fab, { backgroundColor: !onCreateActivity ? colors.action.disabled : pressed ? colors.action.pressed : colors.action.primary,
      shadowColor: colors.shadow }]}>
    <AreaIcon name="plus" color={onCreateActivity ? colors.action.onPrimary : colors.text.secondary} />
  </Pressable>;
  return <ContinueButton label="Nueva actividad" disabled={!onCreateActivity}
    onPress={onCreateActivity ? () => onCreateActivity(id) : undefined}
    leadingIcon={<AreaIcon name="plus" color={onCreateActivity ? colors.action.onPrimary : colors.text.secondary} />} />;
}
const styles = StyleSheet.create({
  fab: { width: activityFabSize, height: activityFabSize, borderRadius: activityFabSize / 2, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: shadows.card.offsetY }, shadowOpacity: shadows.card.opacity,
    shadowRadius: shadows.card.radius, elevation: shadows.card.elevation },
});
