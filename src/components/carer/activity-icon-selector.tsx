import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, FlatList, findNodeHandle, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveActivityIcon } from '@/constants/activity-icons';
import type { IconOptionsState } from '@/hooks/use-activity-icons';
import type { ActivityIconOption } from '@/utils/activity-icon-options';
import { borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { AreaIcon } from './area-icon';

export function ActivityIconOptionButton({ icon, selected, onSelect, compact = false, readOnly = false }: {
  icon: ActivityIconOption; selected: boolean; onSelect: (icon: ActivityIconOption) => void; compact?: boolean; readOnly?: boolean;
}) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const source = resolveActivityIcon(icon.codigo);
  const unavailable = !source || failed;
  const tileStyle = [styles.tile, compact && styles.compactTile, { borderColor: selected ? colors.border.selected : colors.border.decorative,
      borderWidth: selected ? borders.selected : borders.default,
      backgroundColor: selected ? colors.welcome.intro : colors.surface.default }];
  const content = <>
    {unavailable ? <Text style={[accountStyles.small, styles.center, { color: colors.text.secondary }]}>No disponible</Text>
      : <Image source={source} contentFit="contain" accessible={false} style={[styles.image, compact && styles.compactImage]} onError={() => setFailed(true)} />}
    {selected && <View accessible={false} importantForAccessibility="no-hide-descendants"
      style={[styles.check, { backgroundColor: colors.action.primary }]}>
      <AreaIcon name="check" color={colors.action.onPrimary} size={sizes.iconSmall - spacing.xs} />
    </View>}
  </>;
  if (readOnly) return <View accessible accessibilityLabel={`${icon.nombre}, icono seleccionado${unavailable ? ', imagen no disponible' : ''}`}
    accessibilityState={{ selected }} style={styles.retained}>
    <View style={tileStyle}>{content}</View>
    <Text style={[accountStyles.small, styles.center, { color: colors.text.primary }]}>{icon.nombre}</Text>
  </View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${icon.nombre}${unavailable ? ', imagen no disponible' : ''}`}
    accessibilityState={{ selected, disabled: unavailable }} disabled={unavailable} onPress={() => onSelect(icon)} style={tileStyle}>
    {content}
  </Pressable>;
}

function Feedback({ state, retry }: { state: IconOptionsState; retry: () => void }) {
  const { colors } = useAppTheme();
  if (state.status === 'loading') return <View style={styles.feedback} accessibilityState={{ busy: true }}>
    <ActivityIndicator color={colors.action.primary} /><Text style={[accountStyles.small, { color: colors.text.secondary }]}>Cargando iconos…</Text>
  </View>;
  if (state.status === 'error' || state.status === 'invalid-response') return <View style={styles.feedback}>
    <Text accessibilityRole="alert" style={[accountStyles.small, { color: colors.status.error }]}>
      {state.status === 'invalid-response' ? 'No pudimos mostrar los iconos recibidos.' : 'No pudimos cargar los iconos.'}
    </Text>
    <Pressable accessibilityRole="button" onPress={retry} style={styles.action}>
      <Text style={[accountStyles.small, { color: colors.action.primary }]}>Reintentar</Text>
    </Pressable>
  </View>;
  return null;
}

export function ActivityIconSelector({ catalogue, suggestions, query, value, onChange, retryCatalogue, retrySuggestions }: {
  catalogue: IconOptionsState; suggestions: IconOptionsState; query: string;
  value: ActivityIconOption | null; onChange: (icon: ActivityIconOption) => void;
  retryCatalogue: () => void; retrySuggestions: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const heading = useRef<Text>(null);
  const trigger = useRef<View>(null);
  const columns = Math.max(1, Math.min(4, Math.floor((width - spacing['3xl']) / (layout.activities.iconTileSize + spacing.sm))));
  function close() {
    setOpen(false);
    const target = findNodeHandle(trigger.current); if (target) AccessibilityInfo.setAccessibilityFocus(target);
  }
  const choose = (icon: ActivityIconOption) => { onChange(icon); if (open) close(); };
  return <>
    {suggestions.status === 'ready' ? <View style={styles.feedback}>
        {suggestions.icons.length ? <>
          <View style={[styles.query, { backgroundColor: colors.welcome.intro }]}>
            <AreaIcon name="sparkles" color={colors.action.primary} size={sizes.iconSmall} />
            <Text accessibilityLiveRegion="polite" style={[accountStyles.small, styles.queryText, { color: colors.action.primary }]}>
              Sugerencias para “<Text style={[styles.queryName, { color: colors.action.primary }]}>{query}</Text>”
            </Text>
          </View>
          <View style={styles.row}>{suggestions.icons.map(icon => <ActivityIconOptionButton key={icon.codigo} icon={icon}
            selected={value?.codigo === icon.codigo} onSelect={choose} compact />)}</View>
        </> : <Text accessibilityLiveRegion="polite" style={[accountStyles.small, { color: colors.text.secondary }]}>No encontramos sugerencias. Puedes elegir cualquier icono en el catálogo.</Text>}
      </View> : <Feedback state={suggestions} retry={retrySuggestions} />}
    {value && !(suggestions.status === 'ready' && suggestions.icons.some(icon => icon.codigo === value.codigo)) &&
      <View style={styles.feedback}>
        <Text style={[accountStyles.small, { color: colors.text.secondary }]}>Tu selección</Text>
        <ActivityIconOptionButton key={value.codigo} icon={value} selected compact readOnly onSelect={onChange} />
      </View>}
    <Pressable ref={trigger} accessibilityRole="button" onPress={() => setOpen(true)}
      style={[styles.more, { borderColor: colors.border.control }]}>
      <AreaIcon name="grid" color={colors.action.primary} size={sizes.iconSmall} />
      <Text style={[accountStyles.small, styles.moreText, { color: colors.action.primary }]}>Ver más íconos</Text>
    </Pressable>
    <Modal visible={open} animationType="none" onRequestClose={close}
      onShow={() => { const target = findNodeHandle(heading.current); if (target) AccessibilityInfo.setAccessibilityFocus(target); }}>
      <View accessibilityViewIsModal style={[styles.modal, { backgroundColor: colors.background.primary,
        paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg,
        paddingLeft: Math.max(insets.left, spacing.lg), paddingRight: Math.max(insets.right, spacing.lg) }]}>
        <Text ref={heading} accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>Elige un icono</Text>
        <Feedback state={catalogue} retry={retryCatalogue} />
        {catalogue.status === 'ready' && catalogue.icons.length === 0 && <Text style={[accountStyles.body, { color: colors.text.secondary }]}>No hay iconos disponibles.</Text>}
        <FlatList key={columns} data={catalogue.status === 'ready' ? catalogue.icons : []} numColumns={columns}
          keyExtractor={icon => icon.codigo} contentContainerStyle={styles.list} initialNumToRender={12}
          renderItem={({ item }) => <View style={styles.cell}><ActivityIconOptionButton icon={item}
            selected={value?.codigo === item.codigo} onSelect={choose} /></View>} />
        <Pressable accessibilityRole="button" onPress={close} style={styles.action}>
          <Text style={[accountStyles.body, { color: colors.action.primary }]}>Cerrar</Text>
        </Pressable>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  retained: { alignSelf: 'flex-start', width: layout.activities.suggestionTileSize, maxWidth: '100%', gap: spacing.sm, alignItems: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingVertical: spacing.xs },
  tile: { width: layout.activities.iconTileSize, minHeight: layout.activities.iconTileSize, borderRadius: radii.control,
    padding: spacing.sm, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  compactTile: { width: layout.activities.suggestionTileSize, minHeight: layout.activities.suggestionTileSize,
    borderRadius: layout.activities.sectionIconRadius },
  image: { width: layout.activities.iconSize, height: layout.activities.iconSize },
  compactImage: { width: sizes.touchTarget, height: sizes.touchTarget },
  check: { position: 'absolute', top: -spacing.xs, right: -spacing.xs, width: sizes.iconSmall,
    height: sizes.iconSmall, borderRadius: sizes.iconSmall / 2, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  feedback: { gap: spacing.md },
  query: { padding: spacing.md, borderRadius: radii.control, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    justifyContent: 'center' },
  queryText: { flexShrink: 1 },
  queryName: { fontFamily: typography.family.bold },
  action: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  more: { borderWidth: borders.default, borderStyle: 'dashed', borderRadius: radii.control, padding: spacing.md,
    minHeight: sizes.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  moreText: { flexShrink: 1, textAlign: 'center', fontFamily: typography.family.semibold },
  modal: { flex: 1, gap: spacing.lg },
  list: { paddingVertical: spacing.sm },
  cell: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
});
