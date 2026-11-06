import { createUserHttpClient, deviceAccess, HelpHttpError } from './device-access';
import { DeviceFailure } from './device-access-manager';
import { parseHelpRequest, type HelpContext } from '@/utils/help-notifications';
import { operationKey } from '@/utils/operation-key';

let client: ReturnType<typeof createUserHttpClient> | undefined;
export class UnconfirmedHelp extends Error {}
export function helpOperation(context?: HelpContext) {
  const key = operationKey(), revision = deviceAccess.revision();
  const snapshot = context ? { ...context } : undefined;
  const check = () => { if (revision !== deviceAccess.revision()) throw new DeviceFailure('canceled'); };
  const recover = async () => {
    check(); client ??= createUserHttpClient();
    const response = await client.get(`/api/usuario/solicitudes-ayuda/por-clave/${key}`);
    check(); return parseHelpRequest(response.data, key, snapshot);
  };
  return { key, recover, write: async () => {
    check(); client ??= createUserHttpClient();
    try {
      const response = await client.post('/api/usuario/solicitudes-ayuda', { claveOperacion: key, ...snapshot });
      check(); return parseHelpRequest(response.data, key, snapshot);
    } catch (error) {
      check();
      if (error instanceof DeviceFailure || error instanceof HelpHttpError && error.status && error.status < 500) throw error;
      try { return await recover(); }
      catch { check(); throw new UnconfirmedHelp(); }
    }
  } };
}
