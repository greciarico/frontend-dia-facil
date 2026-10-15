export function validProfileId(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : undefined;
}

export function profileHref(id: number) {
  return { pathname: '/perfiles/[idPerfilUsuario]' as const, params: { idPerfilUsuario: String(id) } };
}

export function isProfilesDestination(pathname: string) {
  return pathname === '/perfiles' || pathname.startsWith('/perfiles/');
}

export function activitiesHref(id: number) {
  return { pathname: '/perfiles/[idPerfilUsuario]/actividades' as const, params: { idPerfilUsuario: String(id) } };
}
