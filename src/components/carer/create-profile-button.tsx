import { AppText as Text } from '@/components/app-text';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { accountStyles } from './account-layout';
import { ContinueButton } from './continue-button';
import { AreaIcon } from './area-icon';

/** Both empty and populated states connect to this one future creation action. */
export function CreateProfileButton({ onCreateProfile }: { onCreateProfile?: () => void }) {
  const { colors } = useAppTheme();
  return <View style={styles.action}>
    <ContinueButton label="Agregar persona" onPress={onCreateProfile} disabled={!onCreateProfile}
      leadingIcon={<AreaIcon name="plus" color={onCreateProfile ? colors.action.onPrimary : colors.text.secondary} />} />
    {!onCreateProfile && <Text style={[accountStyles.small, styles.hint, { color: colors.text.secondary }]}>Podrás agregar personas próximamente.</Text>}
  </View>;
}
const styles = StyleSheet.create({ action: { gap: spacing.sm }, hint: { textAlign: 'center' } });
