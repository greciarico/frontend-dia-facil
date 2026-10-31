import { AppText as Text } from '@/components/app-text';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { ContinueButton } from './continue-button';
import { AreaIcon } from './area-icon';

/** Both empty and populated states connect to this one future creation action. */
export function CreateProfileButton({ first = false, onCreateProfile }: { first?: boolean; onCreateProfile?: () => void }) {
  const { colors } = useAppTheme();
  return <View style={styles.action}>
    <ContinueButton label={first ? 'Crear mi primer perfil' : 'Agregar nuevo perfil'} onPress={onCreateProfile} disabled={!onCreateProfile}
      leadingIcon={<AreaIcon name="plus" color={onCreateProfile ? colors.action.onPrimary : colors.text.secondary} />} />
    {!onCreateProfile && <Text style={[accountStyles.small, styles.hint, { color: colors.text.secondary }]}>La creación de perfiles estará disponible próximamente.</Text>}
  </View>;
}
const styles = StyleSheet.create({ action: { gap: spacing.sm }, hint: { textAlign: 'center' } });
