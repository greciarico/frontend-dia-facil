import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { layout } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { profileAvatar } from '@/utils/profiles';
import { AccountAvatar } from './account-avatar';

export function ProfileAvatar({ name, avatar, size = layout.profiles.avatarSize }: { name: string; avatar: string | null; size?: number }) {
  // Key the renderer so a changed reference resets only its image failure state.
  return <AvatarImage key={avatar || ''} name={name} avatar={avatar} size={size} />;
}
function AvatarImage({ name, avatar, size }: { name: string; avatar: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  const { colors } = useAppTheme();
  const resolved = profileAvatar(avatar);
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background.purple, overflow: 'hidden' }}>
    <AccountAvatar name={name} avatarId={failed ? null : resolved.local} size={size} />
    {!failed && resolved.uri && <Image source={{ uri: resolved.uri }} contentFit="cover" accessible={false}
      onError={() => setFailed(true)} style={StyleSheet.absoluteFill} />}
  </View>;
}
