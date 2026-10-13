/** Original Figma primitives: docs/design-system.md is the source of truth. */
export const colors = {
  success: '#56AF4E', bug: '#D92A16',
  blue: { hover: '#E2EFFA', light: '#F2F8FC', default: '#498FCF', stroke: '#EAF1F9' },
  orange: { light: '#FEF6F2', hover: '#FEE8D9', default: '#E78F4C', stroke: '#FDEDE5' },
  green: { light: '#F6FAF3', hover: '#E6F2DF', default: '#71BA47', stroke: '#E5EFE0' },
  yellow: { light: '#FEFDF6', hover: '#FEF3D4', default: '#FDCA2D', stroke: '#FDF0CF' },
  purple: { default: '#6552B7', light: '#F8F3FA', hoverLight: '#EAE3F4', dark: '#4E438D', stroke: '#EAE6F4' },
  greenDark: { default: '#31B079', light: '#E4F7EC' },
  text: { primary: '#0A0B0A', secondary: '#686E7F', disabled: '#BBBDC6' },
  background: { primary: '#FFFFFF', yellow: '#FEFDF6', purple: '#EAE3F4' },
} as const;

/** Derived colors are separate from the original Figma palette. */
export const derivedColors = {
  light: { successText: '#2C6E28' },
  dark: {
    background: '#121116', surface: '#1C1A23', elevated: '#272332',
    text: '#F6F3FB', secondaryText: '#C4BDCF', disabledText: '#908799',
    primary: '#B9A7EF', primaryPressed: '#CBBBF5', onPrimary: '#19132B',
    controlBorder: '#8B829B', decorativeBorder: '#3D3749',
    error: '#FF8F83', errorSurface: '#3A1D20', success: '#8EDC83', successSurface: '#183321',
  },
} as const;

export const typography = {
  family: { regular: 'Nunito_400Regular', medium: 'Nunito_500Medium', semibold: 'Nunito_600SemiBold', bold: 'Nunito_700Bold' },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 32 },
  lineHeight: { xs: 18, sm: 20, md: 24, lg: 26, xl: 28, '2xl': 32, '3xl': 36, '4xl': 40 },
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48 } as const;
export const radii = { control: 16, card: 20 } as const;
export const sizes = { touchTarget: 48, icon: 24, iconSmall: 20, stroke: 2 } as const;
export const borders = { default: 1, selected: 2 } as const;
export const shadows = { card: { offsetY: 3, opacity: 0.12, radius: 3, elevation: 3 } } as const;
export const motion = { carerSuccessDuration: 700, carerTiltDuration: 175, carerTiltDegrees: 4 } as const;
export const layout = {
  contentMaxWidth: 480,
  carer: { accountHeroHeight: 314, codeHeroHeight: 396, illustrationWidth: 248,
    profileHeroHeight: 336, avatarSize: 152, avatarOptionSize: 56,
    accountIllustrationRatio: 250 / 183, codeIllustrationRatio: 240 / 190,
    curveHeight: 32, stepDot: 12, stepGap: 28, codeCellHeight: 60 },
  welcome: { heroHeight: 280, illustrationWidth: 248, illustrationRatio: 234 / 197, curveHeight: 32,
    roleIllustrationHeight: 96, roleMinHeight: 216, stackBelowWidth: 340, stackAboveFontScale: 1.35 },
} as const;

export type SemanticColors = {
  background: { primary: string; yellow: string; purple: string };
  surface: { default: string; elevated: string };
  text: { primary: string; secondary: string; disabled: string };
  action: { primary: string; pressed: string; onPrimary: string; disabled: string };
  border: { decorative: string; control: string; selected: string };
  status: { error: string; errorSurface: string; success: string; successSurface: string };
  welcome: { hero: string; body: string; intro: string; iconSurface: string; userAction: string; carerAction: string };
  shadow: string;
  overlay: { scrim: string };
};
export type AppTheme = { scheme: 'light' | 'dark'; colors: SemanticColors };
const d = derivedColors.dark;
export const themes: Record<'light' | 'dark', AppTheme> = {
  light: {
    scheme: 'light',
    colors: {
      background: colors.background,
      surface: { default: colors.background.primary, elevated: colors.background.primary },
      text: colors.text,
      action: { primary: colors.purple.default, pressed: colors.purple.dark, onPrimary: colors.background.primary, disabled: colors.purple.stroke },
      border: { decorative: colors.purple.stroke, control: colors.purple.default, selected: colors.purple.default },
      status: { error: colors.bug, errorSurface: colors.orange.light, success: derivedColors.light.successText, successSurface: colors.green.hover },
      welcome: { hero: colors.purple.light, body: colors.background.yellow, intro: colors.purple.light,
        iconSurface: colors.background.purple, userAction: colors.purple.light, carerAction: colors.orange.light },
      shadow: colors.text.primary,
      overlay: { scrim: 'rgba(10, 11, 10, 0.55)' },
    },
  },
  dark: {
    scheme: 'dark',
    colors: {
      background: { primary: d.background, yellow: d.surface, purple: d.elevated },
      surface: { default: d.surface, elevated: d.elevated },
      text: { primary: d.text, secondary: d.secondaryText, disabled: d.disabledText },
      action: { primary: d.primary, pressed: d.primaryPressed, onPrimary: d.onPrimary, disabled: d.decorativeBorder },
      border: { decorative: d.decorativeBorder, control: d.controlBorder, selected: d.primary },
      status: { error: d.error, errorSurface: d.errorSurface, success: d.success, successSurface: d.successSurface },
      welcome: { hero: d.surface, body: d.background, intro: d.elevated, iconSurface: d.surface,
        userAction: d.elevated, carerAction: d.elevated },
      shadow: d.background,
      overlay: { scrim: 'rgba(10, 11, 10, 0.75)' },
    },
  },
};
