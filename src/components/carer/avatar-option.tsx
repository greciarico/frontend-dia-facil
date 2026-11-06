import { Pressable, StyleSheet, View } from 'react-native';

import { avatarLabel, type CarerAvatarId } from '@/constants/carer-avatars';
import { borders, sizes } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AccountAvatar } from './account-avatar';

/** Avatar-specific selection ring. Touch area is independent of the artwork. */
export function AvatarOption({ id, name, selected, disabled, diameter, stretch = false, onSelect }: {
  id: CarerAvatarId; name: string; selected: boolean; disabled: boolean;
  diameter: number; stretch?: boolean; onSelect: () => void;
}) {
  const { colors } = useAppTheme();
  return <Pressable accessibilityRole="radio" accessibilityLabel={avatarLabel(id)}
    accessibilityState={{ selected, checked: selected, disabled }} disabled={disabled} onPress={onSelect}
    style={[styles.target, stretch ? styles.stretch : { minWidth: Math.max(diameter, sizes.touchTarget) }]}>
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{
      width: diameter, height: diameter, borderRadius: diameter / 2, borderWidth: borders.selected,
      borderColor: selected ? colors.border.selected : 'transparent', alignItems: 'center', justifyContent: 'center',
    }}>
      <AccountAvatar name={name} avatarId={id} small size={Math.max(0, diameter - borders.selected * 2)} />
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  target: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  stretch: { flex: 1 },
});
