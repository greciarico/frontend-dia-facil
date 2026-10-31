import { AppText as Text } from '@/components/app-text';
import { Image } from 'expo-image';
import { StyleSheet, } from 'react-native';
import { layout, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { ActivityDialog } from './activity-dialog';
import { StepDialogActions } from './step-dialog-actions';

export function ActivityCreatedModal({ profileName, onCreateAnother, onViewActivities }: {
  profileName: string; onCreateAnother: () => void; onViewActivities: () => void;
}) {
  const { colors } = useAppTheme();
  return <ActivityDialog centered showClose onClose={onViewActivities} closeLabel="Ver actividades y cerrar"
    title={<Text style={styles.title}>¡Actividad creada{'\n'}<Text style={{ color: colors.action.primary }}>con éxito!</Text></Text>}
    decoration={<Image source={require('@/assets/illustrations/carer-success.png')} contentFit="contain"
      accessible={false} style={styles.illustration} />}
    description={`La actividad se ha agregado a la agenda de ${profileName}.`}>
    <StepDialogActions secondaryLabel="Crear otra" label="Ver actividades" onCancel={onCreateAnother} onConfirm={onViewActivities} />
  </ActivityDialog>;
}
const styles = StyleSheet.create({
  illustration: { width: '100%', maxWidth: layout.carer.illustrationWidth, aspectRatio: 1536 / 1024, alignSelf: 'center' },
  title: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'] },
});
