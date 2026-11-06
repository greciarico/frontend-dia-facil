import { AppText as Text } from '@/components/app-text';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, } from 'react-native';
import { borders, radii, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { formatActivityTime, localTimeDate, localTimeMinutes } from '@/utils/activity-draft';
import { accountStyles } from './account-layout';
import { ActivityDialog } from './activity-dialog';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';

export function ActivityTimeField({ value, onChange }: { value: number | null; onChange: (minutes: number) => void }) {
  const { colors, scheme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(() => localTimeDate(value));
  const active = useRef(false);
  useFocusEffect(useCallback(() => () => {
    if (active.current && Platform.OS === 'android') void DateTimePickerAndroid.dismiss('time').catch(() => undefined);
    active.current = false;
  }, []));
  function choose() {
    if (active.current) return;
    active.current = true;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: localTimeDate(value), mode: 'time', is24Hour: false,
        positiveButton: { label: 'Aceptar' }, negativeButton: { label: 'Cancelar' },
        onValueChange: (_event, date) => { if (active.current) { active.current = false; onChange(localTimeMinutes(date)); } },
        onDismiss: () => { active.current = false; } });
    } else {
      setPending(localTimeDate(value)); setOpen(true);
    }
  }
  function close() { active.current = false; setOpen(false); }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Hora de la actividad. ${formatActivityTime(value)}`}
      accessibilityHint="Abre el selector de hora" onPress={choose} style={[styles.field, { borderColor: colors.border.decorative }]}>
      <Text style={[accountStyles.body, styles.label, { color: value === null ? colors.text.secondary : colors.text.primary }]}>{formatActivityTime(value)}</Text>
      <AreaIcon name="clock" color={colors.text.secondary} size={sizes.iconSmall} />
    </Pressable>
    {open && <ActivityDialog title="Hora de la actividad" onClose={close}>
      <DateTimePicker mode="time" display="spinner" value={pending} themeVariant={scheme}
        accessibilityLabel="Selecciona la hora de la actividad" onValueChange={(_event, date) => setPending(date)} />
      <ContinueButton label="Aceptar" onPress={() => { onChange(localTimeMinutes(pending)); close(); }} />
      <ContinueButton label="Cancelar" onPress={close} />
    </ActivityDialog>}
  </>;
}
const styles = StyleSheet.create({
  field: { minHeight: sizes.touchTarget, borderWidth: borders.default, borderRadius: radii.control, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1, textAlign: 'left' },
});
