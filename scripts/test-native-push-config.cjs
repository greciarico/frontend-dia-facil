const { Buffer } = require('node:buffer');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');
function config(env = {}, available = false, overrides = {}) {
  const out = {};
  new Function('require', 'exports', 'process', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(
    name => { assert.equal(name, 'node:fs'); return { existsSync: () => available }; }, out, { env });
  const base = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  return out.default({ config: { ...base, ...overrides } });
}
// Synthetic identifiers here are test fixtures only, never application defaults.
const project = '00000000-0000-4000-8000-000000000001';
const plugin = (value, name) => value.plugins.find(p => Array.isArray(p) && p[0] === name)[1];
test('push is disabled without real configuration and existing native options survive', () => {
  const value = config({}, false, { extra: {} });
  assert.equal(value.extra.push.enabled, false);
  assert.equal(value.extra.eas, undefined);
  assert.equal(value.android.package, 'com.diafacil.app');
  assert.equal(value.android.softwareKeyboardLayoutMode, 'resize');
  assert.equal(value.android.googleServicesFile, undefined);
  assert.equal(plugin(value, 'expo-build-properties').android.usesCleartextTraffic, false);
  assert.equal(value.plugins.filter(p => (Array.isArray(p) ? p[0] : p) === 'expo-build-properties').length, 1);
});
test('push fails closed without EAS project or native Firebase file', () => {
  assert.throws(() => config({ EXPO_PUBLIC_PUSH_ENABLED: 'true' }, false, { extra: {} }), /EAS_PROJECT_ID/);
  assert.throws(() => config({ EAS_PROJECT_ID: 'not-a-project' }), /UUID/);
  assert.throws(() => config({ EAS_PROJECT_ID: project, EXPO_PUBLIC_PUSH_ENABLED: 'true', EAS_BUILD_PROFILE: 'development' }), /GOOGLE_SERVICES_JSON/);
  assert.throws(() => config({}, false, { android: { package: 'com.other.app' } }), /identificador/);
});
test('only development native profile permits LAN HTTP and push uses configured channel', () => {
  const value = config({ EAS_PROJECT_ID: project, EXPO_PUBLIC_PUSH_ENABLED: 'true', EAS_BUILD_PROFILE: 'development', GOOGLE_SERVICES_JSON: '/test/firebase.json' }, true);
  assert.equal(value.extra.eas.projectId, project);
  assert.equal(value.extra.push.enabled, true);
  assert.equal(value.android.googleServicesFile, '/test/firebase.json');
  assert.equal(plugin(value, 'expo-build-properties').android.usesCleartextTraffic, true);
  assert.equal(plugin(value, 'expo-notifications').defaultChannel, value.extra.push.androidChannelId);
  const release = config({ EAS_BUILD_PROFILE: 'preview' });
  assert.equal(plugin(release, 'expo-build-properties').android.usesCleartextTraffic, false);
  const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  assert.equal(eas.build.development.developmentClient, true);
  assert.equal(eas.build.development.distribution, 'internal');
  assert.equal(eas.build.development.android.buildType, 'apk');
});
test('notification small icon is 96px white with a transparent background', () => {
  const png = fs.readFileSync(path.join(root, 'assets/notifications/notification-icon.png'));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 96); assert.equal(png.readUInt32BE(20), 96); assert.equal(png[25], 6);
  const chunks = [];
  for (let offset = 8; offset < png.length;) {
    const n = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + n));
    offset += n + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks)); let painted = 0, transparent = 0;
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    const n = y * 385 + 1 + x * 4;
    assert.equal(raw[n], 255); assert.equal(raw[n + 1], 255); assert.equal(raw[n + 2], 255);
    if (raw[n + 3]) painted++; else transparent++;
  }
  assert.ok(painted > 0); assert.ok(transparent > painted);
});


test('existing EAS project and owner survive dynamic configuration with push disabled', () => {
  const value = config({}, false, { owner: 'existing-owner', extra: { eas: { projectId: project }, anotherSetting: 'kept' } });
  assert.equal(value.owner, 'existing-owner');
  assert.equal(value.extra.eas.projectId, project);
  assert.equal(value.extra.anotherSetting, 'kept');
  assert.equal(value.extra.push.enabled, false);
});


test('Android splash generates its referenced logo resource while preserving the background-only design', async () => {
  const os = require('node:os');
  const { getAndroidSplashConfig } = require('../node_modules/expo-splash-screen/plugin/build/getAndroidSplashConfig');
  const { setSplashImageDrawablesAsync } = require('../node_modules/expo-splash-screen/plugin/build/withAndroidSplashImages');
  const { XML } = require('expo/config-plugins');
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  const splash = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];
  const relative = splash.android.drawable.icon;
  assert.equal(relative, './assets/splash/splashscreen_logo.xml');
  assert.equal(splash.backgroundColor, '#FFFFFF'); assert.equal(splash.dark.backgroundColor, '#121116');
  const temporaryBase = fs.realpathSync(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(temporaryBase, 'diafacil-splash-resource-test-'));
  assert.ok(path.resolve(fixture).startsWith(temporaryBase + path.sep));
  assert.ok(path.basename(fixture).startsWith('diafacil-splash-resource-test-'));
  fs.mkdirSync(path.join(fixture, 'android/app/src/main/res'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'assets/splash'), { recursive: true });
  fs.copyFileSync(path.join(root, relative), path.join(fixture, relative));
  await setSplashImageDrawablesAsync(getAndroidSplashConfig(splash), fixture);
  const generated = path.join(fixture, 'android/app/src/main/res/drawable/splashscreen_logo.xml');
  assert.ok(fs.existsSync(generated), 'The native theme references this drawable unconditionally');
  const actual = fs.readFileSync(generated, 'utf8');
  assert.equal(actual, fs.readFileSync(path.join(root, relative), 'utf8'));
  const parsed = await XML.parseXMLAsync(actual);
  assert.equal(parsed.vector.path[0].$['android:fillColor'], '#00000000');
});
