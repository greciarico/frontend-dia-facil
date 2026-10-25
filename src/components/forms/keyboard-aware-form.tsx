import { createContext, forwardRef, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { spacing } from '@/theme/tokens';
import { FormKeyboardController } from '@/utils/form-keyboard';

const KeyboardFormContext = createContext<FormKeyboardController | null>(null);

export function KeyboardAwareForm({ children, style, contentContainerStyle }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const [visible, setVisible] = useState(false);
  const [controller] = useState(() => new FormKeyboardController({
    requestFrame: callback => requestAnimationFrame(callback), cancelFrame: id => cancelAnimationFrame(id), gap: spacing.md,
  }));
  const attachScroll = useCallback((scroll: ScrollView | null) => controller.attachViewport(scroll ? {
    measureViewport: callback => scroll.getNativeScrollRef()?.measureInWindow(callback),
    scrollTo: y => scroll.scrollTo({ y, animated: false }),
  } : null), [controller]);
  useFocusEffect(useCallback(() => {
    let active = true; controller.activate();
    const shown = () => { if (active) { setVisible(true); controller.shown(); } };
    const hidden = () => { if (active) { setVisible(false); controller.hidden(); } };
    const subscriptions = [Keyboard.addListener('keyboardDidShow', shown), Keyboard.addListener('keyboardDidHide', hidden)];
    if (Platform.OS === 'ios') subscriptions.push(Keyboard.addListener('keyboardWillShow', shown),
      Keyboard.addListener('keyboardWillHide', hidden), Keyboard.addListener('keyboardWillChangeFrame', () => { if (active) controller.layoutChanged(); }));
    if (Keyboard.isVisible()) shown(); else hidden();
    return () => { active = false; subscriptions.forEach(listener => listener.remove()); controller.deactivate(); };
  }, [controller]));
  return <KeyboardAvoidingView style={[styles.fill, style]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    <KeyboardFormContext.Provider value={controller}>
      <ScrollView ref={attachScroll} style={styles.fill} contentContainerStyle={[styles.content, contentContainerStyle]}
        automaticallyAdjustKeyboardInsets={false} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false} scrollEventThrottle={16}
        onScroll={event => controller.scrolled(event.nativeEvent.contentOffset.y)} onLayout={() => controller.layoutChanged()}
        onContentSizeChange={(_width, height) => controller.contentChanged(height)}>
        {children}
        <View pointerEvents="none" accessible={false} style={{ height: visible ? spacing.md : 0 }} />
      </ScrollView>
    </KeyboardFormContext.Provider>
  </KeyboardAvoidingView>;
}

/** Preserve the native ref and every input callback; only add focus visibility notifications. */
export const KeyboardAwareTextInput = forwardRef<TextInput, TextInputProps>(function KeyboardAwareTextInput(
  { onFocus, onBlur, onLayout, ...props }, forwardedRef,
) {
  const form = useContext(KeyboardFormContext); const input = useRef<TextInput | null>(null);
  const attach = useCallback((node: TextInput | null) => {
    input.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  return <TextInput {...props} ref={attach} onFocus={event => { form?.focus(input.current); onFocus?.(event); }}
    onBlur={event => { form?.blur(input.current); onBlur?.(event); }}
    onLayout={event => { form?.layoutChanged(); onLayout?.(event); }} />;
});
const styles = StyleSheet.create({ fill: { flex: 1 }, content: { flexGrow: 1 } });
