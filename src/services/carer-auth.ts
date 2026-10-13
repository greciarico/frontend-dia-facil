import { isAxiosError } from 'axios';

import { getHttpClient } from './http';

/** Response defined by backend_dia_facil/docs/auth-http.md. */
export type RequestedCode = {
  estado: 'CODIGO_SOLICITADO'; mensaje: string; reenvioEnSegundos: number;
};

export class CodeRequestError extends Error {
  constructor(message: string, readonly field: boolean = false,
    readonly codigo?: string, readonly retryAfterSeconds?: number) { super(message); }
}

export type VerifiedCode =
  | { estado: 'AUTENTICADO'; idCuidador: number }
  | { estado: 'REGISTRO_PENDIENTE'; comprobanteRegistro: string };

/** Only safe domain metadata crosses into UI; never carry raw Axios errors. */
function translateError(error: unknown, verification: boolean): never {
  if (error instanceof CodeRequestError) throw error;
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') throw error;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new CodeRequestError(verification
        ? 'La verificación tardó demasiado. Puedes intentarlo de nuevo; si el código ya se utilizó, solicita otro.'
        : 'La solicitud tardó demasiado. Revisa tu correo antes de intentarlo de nuevo.');
    }
    if (!error.response) throw new CodeRequestError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.');
    const codigo: unknown = error.response.data?.codigo;
    switch (codigo) {
      case 'SOLICITUD_INVALIDA':
        throw new CodeRequestError(verification ? 'Revisa el código de seis dígitos ingresado.' : 'Revisa que tu correo electrónico sea válido.', true, codigo);
      case 'CODIGO_INCORRECTO':
        throw new CodeRequestError('El código no es correcto. Revísalo e inténtalo de nuevo.', true, codigo);
      case 'CODIGO_INEXISTENTE':
      case 'CODIGO_VENCIDO':
      case 'CODIGO_USADO':
      case 'LIMITE_INTENTOS': {
        const messages = {
          CODIGO_INEXISTENTE: 'No hay un código disponible. Solicita otro código.',
          CODIGO_VENCIDO: 'El código ha vencido. Solicita otro código.',
          CODIGO_USADO: 'El código ya fue utilizado. Solicita otro código.',
          LIMITE_INTENTOS: 'Alcanzaste el límite de intentos. Solicita otro código.',
        };
        throw new CodeRequestError(messages[codigo], true, codigo);
      }
      case 'CUENTA_INACTIVA':
        throw new CodeRequestError('Tu cuenta está inactiva. No puedes continuar. Puedes volver a la pantalla anterior.', false, codigo);
      case 'REENVIO_PREMATURO': {
        const header = error.response.headers?.['retry-after'];
        const seconds = typeof header === 'string' && /^\d+$/.test(header) ? Number(header) : undefined;
        throw new CodeRequestError('El servidor indica que debes esperar antes de solicitar otro código.', false, codigo,
          seconds !== undefined && Number.isFinite(seconds) && seconds > 0 ? seconds : undefined);
      }
      case 'SERVICIO_NO_DISPONIBLE':
      case 'ERROR_INTERNO':
        throw new CodeRequestError(verification ? 'No pudimos verificar el código. Inténtalo más tarde.' : 'No pudimos enviar el código. Inténtalo de nuevo más tarde.', false, codigo);
      case 'ACCESO_DENEGADO':
        throw new CodeRequestError('No pudimos completar la solicitud. Inténtalo de nuevo más tarde.', false, codigo);
      default:
        throw new CodeRequestError('No pudimos completar la solicitud. Inténtalo de nuevo más tarde.');
    }
  }
  throw new CodeRequestError('El servicio no está disponible en este momento. Inténtalo más tarde.');
}

export async function requestCarerCode(email: string, signal?: AbortSignal): Promise<RequestedCode> {
  try {
    const response = await getHttpClient().post<RequestedCode>(
      '/api/auth/cuidadores/solicitar-codigo', { email }, { signal });
    const data = response.data;
    if (response.status !== 200 || data?.estado !== 'CODIGO_SOLICITADO'
      || typeof data.mensaje !== 'string' || typeof data.reenvioEnSegundos !== 'number'
      || !Number.isFinite(data.reenvioEnSegundos) || data.reenvioEnSegundos < 0) {
      throw new CodeRequestError('No pudimos confirmar el envío del código. Inténtalo de nuevo más tarde.');
    }
    return data;
  } catch (error) {
    return translateError(error, false);
  }
}

export async function verifyCarerCode(email: string, codigo: string, signal?: AbortSignal): Promise<VerifiedCode> {
  if (!/^[0-9]{6}$/.test(codigo)) throw new CodeRequestError('Ingresa un código de seis dígitos.', true, 'SOLICITUD_INVALIDA');
  try {
    const response = await getHttpClient().post('/api/auth/cuidadores/verificar-codigo', { email, codigo }, { signal });
    const data = response.data;
    if (response.status === 200 && data?.estado === 'AUTENTICADO'
      && Number.isInteger(data.idCuidador) && data.idCuidador > 0 && data.comprobanteRegistro === undefined) {
      return { estado: 'AUTENTICADO', idCuidador: data.idCuidador };
    }
    if (response.status === 200 && data?.estado === 'REGISTRO_PENDIENTE'
      && typeof data.comprobanteRegistro === 'string' && data.comprobanteRegistro.trim() && data.idCuidador === undefined) {
      return { estado: 'REGISTRO_PENDIENTE', comprobanteRegistro: data.comprobanteRegistro };
    }
    throw new CodeRequestError('No pudimos confirmar la verificación. Inténtalo de nuevo; si el código ya se utilizó, solicita otro.');
  } catch (error) {
    return translateError(error, true);
  }
}
