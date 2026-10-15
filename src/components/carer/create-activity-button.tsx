import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';

export function CreateActivityButton({ id, onCreateActivity }: { id: number; onCreateActivity?: (id: number) => void }) {
  const { colors } = useAppTheme();
  return <ContinueButton label="Nueva actividad" disabled={!onCreateActivity}
    onPress={onCreateActivity ? () => onCreateActivity(id) : undefined}
    leadingIcon={<AreaIcon name="plus" color={onCreateActivity ? colors.action.onPrimary : colors.text.secondary} />} />;
}
