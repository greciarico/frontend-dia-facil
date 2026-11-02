import type { ConfigContext, ExpoConfig } from 'expo/config';
import { existsSync } from 'node:fs';

/** No project IDs or credentials are invented. EAS supplies real values per environment. */
export default function configure({ config }: ConfigContext): ExpoConfig {
  const projectId = process.env.EAS_PROJECT_ID?.trim() || config.extra?.eas?.projectId;
  const enabled = process.env.EXPO_PUBLIC_PUSH_ENABLED === 'true';
  const development = process.env.EAS_BUILD_PROFILE === 'development';
  const googleFile = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
  if (projectId && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('EAS_PROJECT_ID debe ser el UUID real de tu proyecto EAS.');
  }
  if (enabled && !projectId) throw new Error('Configura EAS_PROJECT_ID antes de activar push.');
  if (enabled && process.env.EAS_BUILD_PROFILE && !existsSync(googleFile)) {
    throw new Error('Configura el archivo GOOGLE_SERVICES_JSON de tu Firebase antes del build push.');
  }
  if (config.android?.package && config.android.package !== 'com.diafacil.app') {
    throw new Error('El identificador Android existente difiere de com.diafacil.app; revisa antes de cambiarlo.');
  }
  const plugins = config.plugins ?? [];
  const pluginName = (p: NonNullable<ExpoConfig['plugins']>[number]) => typeof p === 'string' ? p : p[0] ?? '';
  const previousBuild = plugins.find(p => pluginName(p) === 'expo-build-properties');
  const previousOptions = Array.isArray(previousBuild) ? previousBuild[1] ?? {} : {};
  return {
    ...config,
    name: config.name ?? 'diafacil', slug: config.slug ?? 'diafacil',
    android: { ...config.android, package: 'com.diafacil.app',
      ...(existsSync(googleFile) ? { googleServicesFile: googleFile } : {}) },
    extra: { ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
      push: { enabled, androidChannelId: 'diafacil-cuidador-v1' } },
    plugins: [
      ...plugins.filter(p => !['expo-build-properties', 'expo-notifications'].includes(pluginName(p))),
      ['expo-build-properties', { ...previousOptions, android: { ...previousOptions.android, usesCleartextTraffic: development } }],
      ['expo-notifications', { icon: './assets/notifications/notification-icon.png', color: '#6850BA', defaultChannel: 'diafacil-cuidador-v1' }],
    ],
  };
}
