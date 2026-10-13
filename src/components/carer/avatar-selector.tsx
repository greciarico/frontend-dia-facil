import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { carerAvatarIds, quickCarerAvatars, type CarerAvatarId } from '@/constants/carer-avatars';
import { layout, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AvatarOption } from './avatar-option';
import { accountStyles } from './account-layout';

export function AvatarSelector({ value, onChange, disabled, name }: {
  value: CarerAvatarId | null; onChange: (id: CarerAvatarId | null) => void; disabled: boolean; name: string;
}) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const columns = Math.max(1, Math.min(4, Math.floor((galleryWidth || width - spacing['5xl']) / (layout.carer.avatarOptionSize + spacing.lg))));
  const diameter = Math.max(0, Math.min(layout.carer.avatarOptionSize,
    (rowWidth || sizes.touchTarget * 5) / 5 - spacing.xs));
  function option(id: CarerAvatarId, quick = false) {
    return <AvatarOption id={id} name={name} selected={value === id} disabled={disabled}
      diameter={quick ? diameter : layout.carer.avatarOptionSize} stretch={quick}
      onSelect={() => { onChange(id); setOpen(false); }} />;
  }
  return <>
    <View style={styles.row} onLayout={({ nativeEvent }) => setRowWidth(nativeEvent.layout.width)}>
      {quickCarerAvatars.map(id => <AvatarOption key={id} id={id} name={name} selected={value === id}
        disabled={disabled} diameter={diameter} stretch onSelect={() => { onChange(id); setOpen(false); }} />)}
      <Pressable accessibilityRole="button" accessibilityLabel="Ver todos los avatares" disabled={disabled}
        accessibilityState={{ disabled }} onPress={() => setOpen(true)}
        style={styles.more}>
        <View style={[styles.plusCircle, { width: diameter, height: diameter, borderRadius: diameter / 2,
          backgroundColor: colors.welcome.intro }]}>
          <Svg width={Math.min(sizes.icon, diameter)} height={Math.min(sizes.icon, diameter)} viewBox="0 0 24 24" accessible={false}>
            <Path d="M12 4v16M4 12h16" fill="none" stroke={colors.action.primary} strokeWidth={sizes.stroke} strokeLinecap="round" />
          </Svg>
        </View>
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }}
      onPress={() => onChange(null)} style={styles.reset}>
      <Text style={[accountStyles.small, { color: colors.action.primary, textDecorationLine: 'underline' }]}>Usar la inicial de mi nombre</Text>
    </Pressable>
    <Modal visible={open} animationType="none" onRequestClose={() => setOpen(false)}>
      <View accessibilityViewIsModal style={[styles.modal, { backgroundColor: colors.background.primary,
        paddingTop: insets.top + spacing['2xl'], paddingBottom: insets.bottom + spacing.lg }]}>
        <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text.primary }]}>Elige tu avatar</Text>
        <FlatList key={columns} data={carerAvatarIds} numColumns={columns} keyExtractor={id => id}
          onLayout={({ nativeEvent }) => setGalleryWidth(nativeEvent.layout.width)}
          initialNumToRender={8} contentContainerStyle={styles.list}
          renderItem={({ item }) => <View style={styles.item}>{option(item)}</View>} />
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.reset}>
          <Text style={[accountStyles.body, { color: colors.action.primary }]}>Cerrar</Text>
        </Pressable>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.touchTarget },
  more: { flex: 1, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  plusCircle: { alignItems: 'center', justifyContent: 'center' },
  reset: { minHeight: sizes.touchTarget, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  modal: { flex: 1, paddingHorizontal: spacing['2xl'], gap: spacing.lg },
  list: { paddingVertical: spacing.lg },
  item: { flex: 1, padding: spacing.sm, alignItems: 'center' },
});
