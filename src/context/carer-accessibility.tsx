import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccessibilityEditor, type AccessibilityEditorState } from '@/services/accessibility-editor';
import { getCarerAccessibility, patchCarerAccessibility, resetCarerAccessibility } from '@/services/carer-accessibility';
import { useSession } from '@/context/session';
import { AppearanceContext } from '@/theme/profile-appearance';
import { useAppTheme } from '@/theme/use-theme';
import { spacing, typography } from '@/theme/tokens';
import type { CarerAccessibilityPreferences } from '@/utils/accessibility';
import { AppText } from '@/components/app-text';
import { ContinueButton } from '@/components/carer/continue-button';
import { LogoutDialog } from '@/components/carer/logout-dialog';

type Value = { editor: AccessibilityEditor<CarerAccessibilityPreferences>; state: AccessibilityEditorState<CarerAccessibilityPreferences>; refresh: () => void };
const Context = createContext<Value | null>(null);
export function useCarerAccessibility() {
  const context = useContext(Context);
  if (!context) throw new Error('Carer accessibility provider is required');
  return context;
}
export function CarerAccessibilityProvider({ children }: { children: ReactNode }) {
  const { manager, caregiver } = useSession();
  return <AccountScope key={`${caregiver?.idCuidador}:${manager.revision()}`}>{children}</AccountScope>;
}
function AccountScope({ children }: { children: ReactNode }) {
  const { manager } = useSession();
  const editor = useMemo(() => new AccessibilityEditor<CarerAccessibilityPreferences>({
    get: getCarerAccessibility, patch: patchCarerAccessibility, reset: resetCarerAccessibility, revision: () => manager.revision(),
  }, 'cuenta'), [manager]);
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const refresh = useCallback(() => { if (!editor.getSnapshot().busy) void editor.load(); }, [editor]);
  useEffect(() => {
    editor.enter();
    const listener = AppState.addEventListener('change', value => { if (value === 'active') refresh(); });
    return () => { listener.remove(); editor.leave(); };
  }, [editor, refresh]);
  return <Context.Provider value={{ state, editor, refresh }}>
    <AppearanceContext.Provider value={state.value ?? null}>
      <Boundary>{children}</Boundary>
    </AppearanceContext.Provider>
  </Context.Provider>;
}
function Boundary({ children }: { children: ReactNode }) {
  const { state, refresh } = useCarerAccessibility(), { colors } = useAppTheme(), insets = useSafeAreaInsets();
  const [logout, setLogout] = useState(false);
  const feedback = <View style={[styles.feedback, { paddingTop: Math.max(spacing.lg, insets.top) }]}>
    {state.busy ? <ActivityIndicator accessibilityLabel="Cargando tus ajustes" color={colors.action.primary} /> : <>
      <AppText accessibilityRole="alert" style={[styles.copy, { color: colors.text.primary }]}>{state.message || 'No pudimos cargar tus ajustes. Revisa tu conexión.'}</AppText>
      <ContinueButton label="Reintentar" variant="secondary" onPress={refresh} />
      {!state.value && <ContinueButton label="Cerrar sesión" variant="secondary" onPress={() => setLogout(true)} />}
    </>}
  </View>;
  return <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
    {state.value ? <>{!!state.message && !state.busy && feedback}{children}</>
      : <ScrollView contentContainerStyle={styles.initial}>{feedback}</ScrollView>}
    {logout && <LogoutDialog onClose={() => setLogout(false)} />}
  </View>;
}
/** Attach to the existing stacks, not to every component. Initial GET already covers first focus. */
export function useCarerAccessibilityFocusListeners() {
  const { refresh } = useCarerAccessibility(), first = useRef(true);
  return useMemo(() => ({ focus: () => { if (first.current) first.current = false; else refresh(); } }), [refresh]);
}
const styles = StyleSheet.create({ initial: { flexGrow: 1, justifyContent: 'center' }, feedback: { padding: spacing.lg, gap: spacing.sm },
  copy: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md } });
