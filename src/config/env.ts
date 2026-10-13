/** EXPO_PUBLIC values are bundled with the app: never store secrets here. */
export function getApiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) throw new Error('Configura EXPO_PUBLIC_API_URL antes de utilizar la API.');
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error();
    }
    if (!__DEV__ && url.protocol !== 'https:') throw new Error();
    return value.replace(/\/+$/, '');
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL debe ser una URL HTTP o HTTPS sin credenciales.');
  }
}
