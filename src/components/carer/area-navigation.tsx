import { router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { carerDestinations } from '@/constants/carer-navigation';
import { useSession } from '@/context/session';
import { sizes } from '@/theme/tokens';
import { isProfilesDestination } from '@/utils/profile-navigation';
import { BottomNavigation } from '@/components/bottom-navigation';
import { AccountAvatar } from './account-avatar';
import { AreaIcon } from './area-icon';

export function AreaNavigation() {
  const pathname = usePathname();
  const { caregiver } = useSession();
  return <BottomNavigation items={carerDestinations.map(item => ({
    id: item.id, label: item.label,
    selected: item.href === pathname || item.id === 'profiles' && isProfilesDestination(pathname)
      || item.id === 'account' && pathname.startsWith('/mi-perfil/'),
    onPress: item.href ? () => { if (item.href && item.href !== pathname) router.dismissTo(item.href); } : undefined,
    icon: color => item.icon === 'account' ? <View importantForAccessibility="no-hide-descendants"><AccountAvatar
      name={caregiver?.nombre || ''} avatarId={caregiver?.avatarId || null} size={sizes.icon} /></View>
      : <AreaIcon name={item.icon} color={color} />,
  }))} />;
}
