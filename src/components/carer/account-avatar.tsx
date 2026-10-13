import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { carerAvatars, type CarerAvatarId } from '@/constants/carer-avatars';
import { layout, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { nameInitial } from '@/utils/carer-registration';

export function AccountAvatar({ name, avatarId, small = false, size: customSize }: {
  name: string; avatarId: CarerAvatarId | null; small?: boolean; size?: number;
}) {
  const { colors } = useAppTheme();
  const size = customSize ?? (small ? layout.carer.avatarOptionSize : layout.carer.avatarSize);
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background.purple }]}>
    {avatarId ? <Image source={carerAvatars[avatarId]} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />
      : <Text style={[styles.initial, { color: colors.action.primary, fontSize: small ? typography.size.xl : typography.size['4xl'] }]}>
        {nameInitial(name)}
      </Text>}
  </View>;
}
const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { fontFamily: typography.family.bold },
});
