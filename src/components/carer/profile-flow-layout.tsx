import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, sizes, spacing } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { AreaIcon } from './area-icon';

export function ProfileFlowLayout({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  const { colors } = useAppTheme();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {onBack && <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver a Mis perfiles" style={styles.back}>
            <AreaIcon name="back" color={colors.text.primary} />
          </Pressable>}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ scroll: { flexGrow: 1, paddingBottom: spacing['3xl'] },
  content: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: spacing['3xl'] },
  back: { minHeight: sizes.touchTarget, width: sizes.touchTarget, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg } });
