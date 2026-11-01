import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '@/components/app-text';
import { accessibilityCapabilities, type AccessibilityCapability } from '@/constants/accessibility-information';
import { borders, layout, radii, sizes, spacing, typography } from '@/theme/tokens';
import { useAppTheme } from '@/theme/use-theme';
import { getActivityVisualFamily } from '@/utils/activity-icon-surface';
import { ActivityDialog } from './activity-dialog';
import { AreaIcon } from './area-icon';
import { ContinueButton } from './continue-button';
import { AccessibilityCapabilityDemo } from './accessibility-capability-demo';
import { AccessibilityMediaCarousel, type AccessibilityMediaHandle } from './accessibility-media';

export function AccessibilityInformation() {
  const { colors } = useAppTheme();
  const viewport = useRef<ScrollView>(null), media = useRef<AccessibilityMediaHandle>(null);
  const [modalOpen, setModalOpen] = useState(false);
  return <ScrollView ref={viewport} contentContainerStyle={styles.page} scrollEventThrottle={32}
    onScroll={() => media.current?.measureVisibility()} onLayout={() => media.current?.measureVisibility()}>
    <View style={[styles.hero, { backgroundColor: colors.welcome.hero }]}>
      <Image source={require('@/assets/illustrations/user-account.png')} contentFit="contain" accessible={false}
        style={styles.heroPicture} />
      <AppText accessibilityRole="header" style={[styles.heroTitle, { color: colors.text.primary }]}>Diseñada para acompañarte</AppText>
      <AppText style={[styles.body, styles.centered, { color: colors.text.secondary }]}>Cada persona es diferente. DiaFácil combina apoyos visuales, instrucciones claras y ajustes para facilitar la comprensión y la autonomía.</AppText>
    </View>
    <View style={styles.section}>
      <AppText accessibilityRole="header" style={[styles.heading, { color: colors.text.primary }]}>Accesibilidad en acción</AppText>
      <AppText style={[styles.body, { color: colors.text.secondary }]}>Una experiencia visual puede hacer más sencilla una rutina.</AppText>
      <AccessibilityMediaCarousel ref={media} viewportRef={viewport} blocked={modalOpen} />
    </View>
    <View style={styles.section}>
      <AppText accessibilityRole="header" style={[styles.heading, { color: colors.text.primary }]}>Cómo DiaFácil acompaña</AppText>
      <AppText style={[styles.body, { color: colors.text.secondary }]}>Explora las ayudas de DiaFácil y conoce para qué sirven.</AppText>
      <AccessibilityCapabilitiesCarousel onDetailVisibilityChange={setModalOpen} />
    </View>
    <View style={styles.section}>
      <Image source={require('@/assets/accessibility/images/visual-communication.webp')} contentFit="contain"
        accessibilityLabel="Dos niños observan un tablero de comunicación con imágenes." accessible style={styles.editorialImage} />
      <AppText accessibilityRole="header" style={[styles.heading, { color: colors.text.primary }]}>Lo visual también comunica</AppText>
      <AppText style={[styles.body, { color: colors.text.secondary }]}>Imágenes y pictogramas pueden hacer que una acción, una necesidad o una idea sea más fácil de reconocer y comprender.</AppText>
    </View>
    <View style={[styles.closing, { backgroundColor: colors.profiles.information }]}>
      <AreaIcon name="accessibilityPerson" color={colors.action.primary} />
      <AppText accessibilityRole="header" style={[styles.heading, { color: colors.text.primary }]}>Comprender, avanzar y acompañar</AppText>
      <AppText style={[styles.body, { color: colors.text.secondary }]}>DiaFácil busca ofrecer información clara, respetar el ritmo de cada persona y facilitar el acompañamiento.</AppText>
      <AppText style={[styles.body, { color: colors.text.secondary }]}>Aquí conoces las ayudas. Los ajustes se configuran desde el perfil correspondiente.</AppText>
    </View>
  </ScrollView>;
}

export function AccessibilityCapabilitiesCarousel({ onDetailVisibilityChange }: { onDetailVisibilityChange?: (open: boolean) => void } = {}) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0), [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<AccessibilityCapability | null>(null);
  const list = useRef<ScrollView>(null), triggers = useRef(new Map<string, View>());
  const position = useRef(0), alive = useRef(false), restoreFocus = useRef<string | null>(null);
  useEffect(() => { onDetailVisibilityChange?.(!!selected); return () => onDetailVisibilityChange?.(false); }, [selected, onDetailVisibilityChange]);
  const cardWidth = Math.max(0, width - 2 * spacing.lg), interval = cardWidth + spacing.lg;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // Rotation/viewport changes keep the currently viewed capability, without animation.
  useEffect(() => { if (width > 0) list.current?.scrollTo({ x: position.current * interval, animated: false }); }, [width, interval]);
  useEffect(() => {
    if (!selected && restoreFocus.current) {
      const target = findNodeHandle(triggers.current.get(restoreFocus.current) ?? null);
      restoreFocus.current = null;
      if (alive.current && target) AccessibilityInfo.setAccessibilityFocus(target);
    }
  }, [selected]);
  const move = (index: number) => {
    const next = Math.max(0, Math.min(accessibilityCapabilities.length - 1, index));
    position.current = next; setCurrent(next);
    list.current?.scrollTo({ x: next * interval, animated: false });
  };
  return <View style={styles.section} onLayout={event => {
    const measured = event.nativeEvent.layout.width;
    if (Number.isFinite(measured) && measured > 0) setWidth(measured);
  }}>
    {width > 0 && <ScrollView ref={list} horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled
      snapToInterval={interval} snapToAlignment="start" decelerationRate="fast" scrollEventThrottle={32}
      contentContainerStyle={styles.carousel} onScroll={event => {
        const index = Math.max(0, Math.min(accessibilityCapabilities.length - 1, Math.round(event.nativeEvent.contentOffset.x / interval)));
        position.current = index; setCurrent(previous => previous === index ? previous : index);
      }}>
      {accessibilityCapabilities.map((capability, index) => <CapabilityCard key={capability.id} capability={capability} index={index} width={cardWidth} active={index === current && !selected}
        triggerRef={node => { if (node) triggers.current.set(capability.id, node); else triggers.current.delete(capability.id); }}
        onOpen={() => setSelected(capability)} />)}
    </ScrollView>}
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Capacidad anterior" accessibilityState={{ disabled: current === 0 || width === 0 }}
        disabled={current === 0 || width === 0} onPress={() => move(current - 1)} style={styles.control}>
        <AreaIcon name="back" color={current === 0 ? colors.text.disabled : colors.action.primary} />
      </Pressable>
      <AppText accessibilityLiveRegion="polite" style={[styles.small, styles.position, { color: colors.text.secondary }]}>{current + 1} de {accessibilityCapabilities.length}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Capacidad siguiente" accessibilityState={{ disabled: current === accessibilityCapabilities.length - 1 || width === 0 }}
        disabled={current === accessibilityCapabilities.length - 1 || width === 0} onPress={() => move(current + 1)} style={styles.control}>
        <AreaIcon name="chevron" color={current === accessibilityCapabilities.length - 1 ? colors.text.disabled : colors.action.primary} />
      </Pressable>
    </View>
    <AppText style={[styles.small, styles.centered, { color: colors.text.secondary }]}>Desliza o usa las flechas para descubrir más.</AppText>
    {selected && <CapabilityInformationDialog capability={selected} onClose={() => { restoreFocus.current = selected.id; setSelected(null); }} />}
  </View>;
}

function CapabilityCard({ capability, index, width, active, onOpen, triggerRef }: {
  capability: AccessibilityCapability; index: number; width: number; active: boolean; onOpen: () => void; triggerRef: (node: View | null) => void;
}) {
  const { colors, scheme, highContrast } = useAppTheme();
  const family = getActivityVisualFamily(index, highContrast);
  const familySurface = scheme === 'light' || highContrast;
  return <View style={[styles.card, { width, backgroundColor: familySurface ? family.light : colors.surface.elevated,
    borderColor: familySurface ? family.stroke : colors.border.decorative }]}>
    <View style={[styles.scene, { backgroundColor: familySurface ? family.hover : colors.surface.default }]}>
      <AccessibilityCapabilityDemo capability={capability} active={active} animateText={active} />
    </View>
    <AppText style={[styles.small, { color: colors.text.secondary }]}>{capability.category}</AppText>
    <AppText accessibilityRole="header" style={[styles.cardTitle, { color: colors.text.primary }]}>{capability.title}</AppText>
    {capability.planned && <AppText style={[styles.planned, { color: colors.action.primary }]}>Próximamente</AppText>}
    <AppText style={[styles.body, { color: colors.text.secondary }]}>{capability.summary}</AppText>
    <Pressable ref={triggerRef} accessibilityRole="button" accessibilityLabel={`Más información sobre ${capability.title}`}
      onPress={onOpen} style={({ pressed }) => [styles.plus, { backgroundColor: pressed ? colors.action.pressed : colors.action.primary }]}>
      <AreaIcon name="plus" color={colors.action.onPrimary} />
    </Pressable>
  </View>;
}

export function CapabilityInformationDialog({ capability, onClose }: { capability: AccessibilityCapability; onClose: () => void }) {
  const { colors } = useAppTheme();
  return <ActivityDialog title={capability.title} onClose={onClose} showClose respectSafeArea closeLabel="Cerrar información">
    <AccessibilityCapabilityDemo capability={capability} active />
    {capability.planned && <AppText style={[styles.planned, { color: colors.action.primary }]}>Próximamente</AppText>}
    <AppText accessibilityRole="header" style={[styles.heading, { color: colors.text.primary }]}>{capability.headline}</AppText>
    <AppText style={[styles.body, { color: colors.text.secondary }]}>{capability.description}</AppText>
    <AppText accessibilityRole="header" style={[styles.cardTitle, { color: colors.text.primary }]}>{capability.planned ? 'Qué se busca facilitar' : 'Cómo acompaña'}</AppText>
    {capability.benefits.map(benefit => <View key={benefit} style={styles.benefit}>
      <AreaIcon name={capability.icon} color={colors.action.primary} size={sizes.iconSmall} />
      <AppText style={[styles.body, styles.benefitText, { color: colors.text.secondary }]}>{benefit}</AppText>
    </View>)}
    <ContinueButton size="modal" label="Entendido" onPress={onClose} />
  </ActivityDialog>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.xl, gap: spacing['2xl'] },
  section: { gap: spacing.md }, hero: { padding: spacing.lg, borderRadius: radii.card, alignItems: 'center', gap: spacing.md },
  heroPicture: { width: '100%', maxWidth: layout.welcome.illustrationWidth, aspectRatio: layout.userOnboarding.illustrationRatio },
  heroTitle: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], lineHeight: typography.lineHeight['2xl'], textAlign: 'center' },
  heading: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: typography.lineHeight.xl },
  cardTitle: { fontFamily: typography.family.bold, fontSize: typography.size.lg, lineHeight: typography.lineHeight.lg },
  body: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  small: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: typography.lineHeight.sm },
  planned: { fontFamily: typography.family.semibold, fontSize: typography.size.md, lineHeight: typography.lineHeight.md },
  centered: { textAlign: 'center' }, editorialImage: { width: '100%', aspectRatio: 1949 / 704, borderRadius: radii.card },
  carousel: { gap: spacing.lg, alignItems: 'stretch', paddingRight: 2 * spacing.lg },
  card: { borderWidth: borders.default, borderRadius: radii.card, padding: spacing.lg, gap: spacing.sm },
  scene: { minHeight: layout.activities.emptyIllustrationSize, borderRadius: radii.control, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  plus: { width: sizes.touchTarget, height: sizes.touchTarget, borderRadius: sizes.touchTarget / 2, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  controls: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center' },
  control: { width: sizes.touchTarget, minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  position: { flexShrink: 1, textAlign: 'center' }, closing: { borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  benefit: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }, benefitText: { flex: 1 },
});
