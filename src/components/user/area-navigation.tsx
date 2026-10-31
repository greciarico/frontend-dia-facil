import { router } from 'expo-router';
import { BottomNavigation } from '@/components/bottom-navigation';
import { AreaIcon } from '@/components/carer/area-icon';

export function UserAreaNavigation() {
  return <BottomNavigation appearance="user" items={[
    { id: 'agenda', label: 'Agenda', selected: true, onPress: () => router.dismissTo('/mi-agenda'), icon: color => <AreaIcon name="activities" color={color} /> },
    { id: 'support', label: 'Apoyo', selected: false, icon: color => <AreaIcon name="support" color={color} /> },
  ]} />;
}
