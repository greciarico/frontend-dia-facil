import { router, usePathname } from 'expo-router';
import { BottomNavigation } from '@/components/bottom-navigation';
import { AreaIcon } from '@/components/carer/area-icon';

export function UserAreaNavigation() {
  const pathname = usePathname();
  return <BottomNavigation appearance="user" items={[
    { id: 'agenda', label: 'Agenda', selected: pathname !== '/apoyo', onPress: () => router.dismissTo('/mi-agenda'), icon: color => <AreaIcon name="activities" color={color} /> },
    { id: 'support', label: 'Apoyo', selected: pathname === '/apoyo', onPress: () => { if (pathname !== '/apoyo') router.push('/apoyo'); }, icon: color => <AreaIcon name="support" color={color} /> },
  ]} />;
}
