import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deviceAccess } from '@/services/device-access';
import { getUserAccessibility } from '@/services/accessibility';
import { ProfileAppearanceContext } from '@/theme/profile-appearance';
import { useAppTheme } from '@/theme/use-theme';
import { spacing, typography } from '@/theme/tokens';
import type { AccessibilityPreferences } from '@/utils/accessibility';
import { AppText } from '@/components/app-text';
import { ContinueButton } from '@/components/carer/continue-button';

const RefreshContext = createContext<() => void>(() => {});
export const useRefreshAccessibility = () => useContext(RefreshContext);

/** One in-memory configuration per linked identity. No credential or preference persistence. */
export function UserAccessibilityProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AccessibilityPreferences>();
  const [error, setError] = useState(false);
  const active = useRef(false), pending = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    if (!active.current || pending.current) return;
    const controller = new AbortController(), revision = deviceAccess.revision(); pending.current = controller;
    const current = () => active.current && !controller.signal.aborted && revision === deviceAccess.revision();
    setError(false);
    void getUserAccessibility(controller.signal).then(result => { if (current()) setValue(result); })
      .catch(() => { if (current()) setError(true); })
      .finally(() => { if (pending.current === controller) pending.current = null; });
  }, []);
  useEffect(() => {
    active.current = true; refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { active.current = false; pending.current?.abort(); pending.current = null; listener.remove(); };
  }, [refresh]);
  return <ProfileAppearanceContext.Provider value={value ?? null}>
    <RefreshContext.Provider value={refresh}>
      <ConfigurationBoundary loaded={!!value} error={error} retry={refresh}>{children}</ConfigurationBoundary>
    </RefreshContext.Provider>
  </ProfileAppearanceContext.Provider>;
}
function ConfigurationBoundary({ loaded, error, retry, children }: { loaded: boolean; error: boolean; retry: () => void; children: ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
    {error && <View style={[styles.feedback, { paddingTop: Math.max(spacing.lg, insets.top), paddingLeft: Math.max(spacing.lg, insets.left), paddingRight: Math.max(spacing.lg, insets.right) }]}>
      <AppText accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>{loaded
        ? 'No pudimos actualizar tus ajustes. Conservamos los últimos disponibles.' : 'No pudimos cargar tus ajustes. Revisa tu conexión.'}</AppText>
      <ContinueButton label="Reintentar" variant="secondary" onPress={retry} />
    </View>}
    {loaded ? children : !error && <View style={[styles.feedback, { flex: 1, justifyContent: 'center' }]}>
      <ActivityIndicator accessibilityLabel="Cargando tus ajustes" color={colors.action.primary} />
    </View>}
  </View>;
}
const styles = StyleSheet.create({ feedback: { padding: spacing.lg, gap: spacing.sm }, copy: {
  fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md,
} });
