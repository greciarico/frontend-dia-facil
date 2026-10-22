import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { layout, spacing } from '@/theme/tokens';
import { ContinueButton } from './continue-button';

export function StepDialogActions({ label, onConfirm, onCancel, disabled = false, destructive = false, secondaryLabel = 'Cancelar' }: {
  label: string; onConfirm: () => void; onCancel: () => void; disabled?: boolean; destructive?: boolean; secondaryLabel?: string;
}) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < layout.welcome.stackBelowWidth || fontScale > layout.welcome.stackAboveFontScale;
  return <View style={[styles.actions, stacked && styles.stacked]}>
    <View style={[styles.action, stacked && styles.stackedAction]}><ContinueButton size="modal" label={secondaryLabel} variant={destructive ? 'destructive-outline' : 'secondary'} onPress={onCancel} /></View>
    <View style={[styles.action, stacked && styles.stackedAction]}><ContinueButton size="modal" label={label} variant={destructive ? 'destructive' : 'primary'} disabled={disabled} onPress={onConfirm} /></View>
  </View>;
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: spacing.md },
  stacked: { flexDirection: 'column' },
  action: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' },
  stackedAction: { flexGrow: 0, flexBasis: 'auto' },
});
