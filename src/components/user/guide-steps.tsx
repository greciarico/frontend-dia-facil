import { useEffect, useRef } from 'react';
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GuideStep } from '@/utils/user-execution';
import { sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';

export function GuideSteps({ steps, current, disabled, onSelect, consultation = false }: { steps: GuideStep[]; current: number; disabled: boolean; onSelect: (id: number) => void; consultation?: boolean }) {
  const { colors } = useAppTheme(); const list = useRef<FlatList<GuideStep>>(null);
  useEffect(() => {
    list.current?.scrollToIndex({ index: current, animated: false, viewPosition: 0.5 });
    AccessibilityInfo.announceForAccessibility(`Paso ${current + 1} de ${steps.length}. ${steps[current].descripcion}`);
  }, [current, steps]);
  return <View>
    <Text style={[styles.label, { color: colors.text.secondary }]}>Paso {current + 1} de {steps.length}</Text>
    <FlatList ref={list} horizontal data={steps} keyExtractor={step => String(step.idPasoActividad)} showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list} getItemLayout={(_, index) => ({ length: sizes.touchTarget, offset: index * sizes.touchTarget, index })}
      renderItem={({ item, index }) => <Pressable accessibilityRole="button" accessibilityLabel={`Paso ${index + 1}: ${item.descripcion}`}
        accessibilityState={{ selected: index === current, disabled: disabled || !consultation && !item.alcanzado }} disabled={disabled || !consultation && !item.alcanzado}
        accessibilityHint={!consultation && !item.alcanzado ? 'Avanza con Siguiente paso para llegar aquí.' : undefined} onPress={() => onSelect(item.idPasoActividad)} style={styles.target}>
        <View style={[styles.mark, { backgroundColor: index === current ? colors.action.primary : consultation || item.alcanzado ? colors.welcome.iconSurface : colors.action.disabled }]} />
      </Pressable>} />
  </View>;
}
const styles = StyleSheet.create({
  label: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, textAlign: 'center' },
  list: { flexGrow: 1, justifyContent: 'center' }, target: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  mark: { width: sizes.icon, height: spacing.sm, borderRadius: spacing.xs },
});
