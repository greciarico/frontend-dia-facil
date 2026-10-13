const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Exercise production validation/service with a simulated transport, never SMTP.
function load(relative, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
    return dependencies[name];
  }, exports);
  return exports;
}
const { validateCarerEmail } = load('src/utils/carer-email.ts');
function service(post) {
  return load('src/services/carer-auth.ts', {
    axios: { isAxiosError: error => error?.isAxiosError === true },
    './http': { getHttpClient: () => ({ post }) },
  });
}
test('email rejects empty/invalid/overlong values and accepts surrounding whitespace', () => {
  for (const value of ['', '  ', 'persona', 'a@@example.com', 'a b@example.com', 'a@example', 'a'.repeat(140) + '@example.com']) {
    assert.equal(typeof validateCarerEmail(value), 'string');
  }
  assert.equal(validateCarerEmail('  Persona+agenda@example.com  '), undefined);
});
test('request follows the documented endpoint, JSON body and abort signal', async () => {
  const signal = new AbortController().signal;
  const response = { estado: 'CODIGO_SOLICITADO', mensaje: 'Revisa tu correo para encontrar el código.', reenvioEnSegundos: 45 };
  let calls = 0;
  const api = service(async (url, body, options) => {
    calls++;
    assert.equal(url, '/api/auth/cuidadores/solicitar-codigo');
    assert.deepEqual(body, { email: 'Persona@example.com' });
    assert.equal(options.signal, signal);
    return { status: 200, data: response };
  });
  assert.deepEqual(await api.requestCarerCode('Persona@example.com', signal), response);
  assert.equal(calls, 1);
});
test('unexpected successful responses cannot authorize navigation', async () => {
  for (const response of [{ status: 204 }, { status: 200, data: {} },
    { status: 200, data: { estado: 'AUTENTICADO' } },
    { status: 200, data: { estado: 'CODIGO_SOLICITADO', mensaje: 'ok', reenvioEnSegundos: '45' } }]) {
    const api = service(async () => response);
    await assert.rejects(api.requestCarerCode('a@example.com'), api.CodeRequestError);
  }
});
test('HTTP errors are translated by codigo without revealing technical detail or retrying', async () => {
  for (const codigo of ['SOLICITUD_INVALIDA', 'REENVIO_PREMATURO', 'SERVICIO_NO_DISPONIBLE', 'ERROR_INTERNO', 'ACCESO_DENEGADO', 'UNKNOWN']) {
    let calls = 0;
    const api = service(async () => {
      calls++;
      throw { isAxiosError: true, response: { status: 400, data: { codigo, detail: 'SMTP secret@example.com' } } };
    });
    await assert.rejects(api.requestCarerCode('a@example.com'), error => {
      assert.ok(error instanceof api.CodeRequestError);
      assert.equal(error.field, codigo === 'SOLICITUD_INVALIDA');
      assert.ok(!error.message.includes('SMTP'));
      assert.ok(!error.message.includes('secret@example.com'));
      return true;
    });
    assert.equal(calls, 1);
  }
});
test('timeout, transport failure and configuration failure have safe feedback', async () => {
  for (const failure of [{ isAxiosError: true, code: 'ECONNABORTED' },
    { isAxiosError: true, code: 'ETIMEDOUT' }, { isAxiosError: true, code: 'ERR_NETWORK' }, new Error('EXPO_PUBLIC_API_URL internal')]) {
    const api = service(async () => { throw failure; });
    await assert.rejects(api.requestCarerCode('a@example.com'), error => {
      assert.ok(error instanceof api.CodeRequestError);
      assert.ok(!error.message.includes('EXPO_PUBLIC_API_URL'));
      return true;
    });
  }
});
test('cancellation is preserved so the screen can suppress errors and navigation', async () => {
  const canceled = { isAxiosError: true, code: 'ERR_CANCELED' };
  const api = service(async () => { throw canceled; });
  await assert.rejects(api.requestCarerCode('a@example.com'), error => error === canceled);
});

test('verification preserves leading zeroes and distinguishes both documented successes', async () => {
  for (const response of [{ estado: 'AUTENTICADO', idCuidador: 3 },
    { estado: 'REGISTRO_PENDIENTE', comprobanteRegistro: 'simulated-temporary-proof' }]) {
    let calls = 0;
    const signal = new AbortController().signal;
    const api = service(async (url, body, options) => {
      calls++;
      assert.equal(url, '/api/auth/cuidadores/verificar-codigo');
      assert.deepEqual(body, { email: 'a@example.com', codigo: '000123' });
      assert.equal(options.signal, signal);
      return { status: 200, data: response };
    });
    assert.deepEqual(await api.verifyCarerCode('a@example.com', '000123', signal), response);
    assert.equal(calls, 1);
  }
});
test('verification rejects incomplete/non-ASCII codes before sending and rejects malformed successes', async () => {
  let calls = 0;
  const api = service(async () => { calls++; });
  for (const code of ['', '12345', '1234567', 'abcdef', ' 000123 ', '１２３４５６']) {
    await assert.rejects(api.verifyCarerCode('a@example.com', code), error => error.codigo === 'SOLICITUD_INVALIDA');
  }
  assert.equal(calls, 0);
  for (const data of [{ estado: 'AUTENTICADO', idCuidador: 0 },
    { estado: 'AUTENTICADO', idCuidador: 3, comprobanteRegistro: 'unexpected' },
    { estado: 'REGISTRO_PENDIENTE', comprobanteRegistro: '' }, { estado: 'OTHER' }]) {
    const malformed = service(async () => ({ status: 200, data }));
    await assert.rejects(malformed.verifyCarerCode('a@example.com', '000123'), malformed.CodeRequestError);
  }
});
test('verification exposes safe error codes for recovery without leaking server details', async () => {
  for (const codigo of ['SOLICITUD_INVALIDA', 'CODIGO_INEXISTENTE', 'CODIGO_INCORRECTO',
    'CODIGO_VENCIDO', 'CODIGO_USADO', 'LIMITE_INTENTOS', 'CUENTA_INACTIVA',
    'SERVICIO_NO_DISPONIBLE', 'ERROR_INTERNO', 'ACCESO_DENEGADO']) {
    const api = service(async () => { throw { isAxiosError: true, response: { data: { codigo, detail: 'private backend detail' } } }; });
    await assert.rejects(api.verifyCarerCode('a@example.com', '000123'), error => {
      assert.equal(error.codigo, codigo);
      assert.ok(!error.message.includes('private backend detail'));
      return true;
    });
  }
});
test('server Retry-After governs resend without a frontend duration fallback', async () => {
  for (const header of ['45', '17', undefined, 'invalid', '0', '-1']) {
    const api = service(async () => {
      throw { isAxiosError: true, response: { data: { codigo: 'REENVIO_PREMATURO' }, headers: { 'retry-after': header } } };
    });
    await assert.rejects(api.requestCarerCode('a@example.com'), error => {
      assert.equal(error.codigo, 'REENVIO_PREMATURO');
      assert.equal(error.retryAfterSeconds, header === '45' ? 45 : header === '17' ? 17 : undefined);
      return true;
    });
  }
});
const { emptyOtp, updateOtp, remainingSeconds, resendLabel } = load('src/utils/carer-otp.ts');
test('OTP supports typed digits, replacement, clearing, full paste from any cell, and ASCII only', () => {
  let value = updateOtp(emptyOtp(), 0, '0');
  assert.equal(value.focus, 1);
  assert.equal(value.digits[0], '0');
  value = updateOtp(value.digits, 0, '9');
  assert.equal(value.digits[0], '9');
  value = updateOtp(value.digits, 0, '');
  assert.equal(value.digits[0], '');
  for (const index of [0, 2, 5]) assert.equal(updateOtp(emptyOtp(), index, '000123').digits.join(''), '000123');
  assert.deepEqual(updateOtp(emptyOtp(), 0, '１２３４５６').digits, emptyOtp());
});
test('counter uses deadline, rounds upward, survives skipped intervals and has no fixed duration', () => {
  const receivedAt = 100000;
  for (const duration of [45, 17]) {
    const deadline = receivedAt + duration * 1000;
    assert.equal(remainingSeconds(deadline, receivedAt), duration);
    assert.equal(remainingSeconds(deadline, receivedAt + 1001), duration - 1);
    assert.equal(remainingSeconds(deadline, deadline - 1), 1);
    assert.equal(remainingSeconds(deadline, deadline), 0);
    assert.equal(remainingSeconds(deadline, deadline + 60000), 0);
  }
  assert.equal(remainingSeconds(undefined), 0);
  assert.equal(resendLabel(45), 'Enviar de nuevo (00:45)');
  assert.equal(resendLabel(44), 'Enviar de nuevo (00:44)');
  assert.equal(resendLabel(1), 'Enviar de nuevo (00:01)');
  assert.equal(resendLabel(0), 'Enviar de nuevo');
});
