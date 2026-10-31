import type { Href } from 'expo-router';

export type CarerDestination = { id: string; label: string; icon: 'profiles' | 'support' | 'bell' | 'account'; href?: Href };
/** Only implemented modules have a destination. No placeholder routes. */
export const carerDestinations: CarerDestination[] = [
  { id: 'profiles', label: 'Perfiles', icon: 'profiles', href: '/perfiles' },
  { id: 'support', label: 'Apoyo', icon: 'support' },
  { id: 'notifications', label: 'Notificación', icon: 'bell' },
  { id: 'account', label: 'Mi perfil', icon: 'account', href: '/mi-perfil' },
];
