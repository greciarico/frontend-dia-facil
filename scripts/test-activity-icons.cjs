const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sql = read('documentacion-dia-facil/scrip_diafacil_v7.sql');
const base = JSON.parse(read('backend_dia_facil/src/main/resources/db/datos-base.json'));
const source = read('frontend_dia_facil/src/constants/activity-icons.ts');
const exportsUnderTest = {};
const required = [];
new Function('require', 'exports', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(file => { required.push(file); return file; }, exportsUnderTest);
const { activityIcons, resolveActivityIcon } = exportsUnderTest;
const codes = Object.keys(activityIcons).sort();
const table = name => {
  const result = sql.match(new RegExp(`CREATE TABLE ${name} \\([\\s\\S]*?\\) ENGINE=InnoDB;`));
  assert.ok(result, name); return result[0];
};

test('all current functional icon codes match real PNGs and explicit static requires', () => {
  const files = fs.readdirSync(path.join(root, 'frontend_dia_facil/assets/activity-icons')).sort();
  assert.equal(files.length, base.iconos.length); assert.equal(codes.length, base.iconos.length);
  assert.deepEqual(base.iconos.map(icon => icon.codigo).sort(), codes);
  assert.deepEqual(codes.map(code => code + '.png').sort(), files);
  assert.equal(required.length, base.iconos.length);
  for (const code of codes) {
    assert.equal(resolveActivityIcon(code), `@/assets/activity-icons/${code}.png`);
    assert.match(source, new RegExp(`'${code}': require\\('@/assets/activity-icons/${code}\\.png'\\)`));
    const image = fs.readFileSync(path.join(root, 'frontend_dia_facil/assets/activity-icons', code + '.png'));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});

test('unknown codes never become paths, network requests or inherited object properties', () => {
  for (const code of [null, undefined, '', 'books', 'constructor', '__proto__', '../bread', 'bread.png',
    '/assets/activity-icons/bread.png', 'https://example.invalid/bread.png']) assert.equal(resolveActivityIcon(code), undefined);
});

test('historical SQL references remain consistent without becoming the initializer source', () => {
  const catalog = sql.match(/-- BEGIN DIAFACIL_ACTIVITY_ICON_CATALOG([\s\S]*?)-- END DIAFACIL_ACTIVITY_ICON_CATALOG/)[1];
  const rows = [...catalog.matchAll(/\('([^']+)', '([^']+)'\)/g)].map(m => [m[1], m[2]]);
  assert.equal(rows.length, 52); assert.ok(rows.every(([code]) => codes.includes(code)));
  const incremental = read('backend_dia_facil/docs/sql/seed-iconos-actividad.sql');
  const pairs = [...incremental.split('INSERT INTO palabra_clave_icono_actividad')[0]
    .matchAll(/SELECT '([^']+)'(?: AS codigo)?, '([^']+)'(?: AS nombre)?/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(pairs, rows);
  const freshWords = [...sql.match(/INSERT INTO palabra_clave_icono_actividad \([\s\S]*?;/)[0]
    .matchAll(/WHERE codigo = '([^']+)'\), '([^']+)'/g)].map(m => [m[1], m[2]]);
  const incrementalWords = [...incremental.split('INSERT INTO palabra_clave_icono_actividad')[1]
    .matchAll(/SELECT '([^']+)'(?: AS codigo)?, '([^']+)'(?: AS palabra)?/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(incrementalWords, freshWords);
  assert.ok(rows.every(([code, name]) => code.length <= 60 && name.trim() && name.length <= 80));
  assert.ok(!catalog.includes('/assets/') && !catalog.includes('.png'));
});

test('only activity/template representative images switch to icons; step pictogram relations remain', () => {
  for (const name of ['actividad', 'plantilla_actividad']) {
    const ddl = table(name);
    assert.ok(ddl.includes('id_icono_actividad INT NULL'));
    assert.ok(ddl.includes('REFERENCES icono_actividad (id_icono_actividad)'));
    assert.ok(ddl.includes('ON DELETE SET NULL')); assert.ok(!ddl.includes('id_pictograma'));
  }
  for (const name of ['paso_actividad', 'plantilla_paso']) {
    assert.ok(table(name).includes('REFERENCES pictograma (id_pictograma)'));
    assert.ok(!table(name).includes('id_icono_actividad'));
  }
  assert.ok(table('palabra_clave_actividad').includes('REFERENCES plantilla_actividad'));
  assert.ok(table('palabra_clave_pictograma').includes('REFERENCES pictograma'));
  assert.ok(table('palabra_clave_icono_actividad').includes('UNIQUE KEY uq_palabra_icono_actividad (id_icono_actividad, palabra)'));
});

test('Desayunar, all five ordered steps and action keywords survive the seed separation', () => {
  const pictures = sql.match(/INSERT INTO pictograma \([\s\S]*?;/)[0];
  const expected = ['enjabonar las manos', 'poner la mesa', 'servir', 'comer', 'secar'];
  const arasaacIds = [2443, 5549, 36965, 2349, 8688];
  assert.deepEqual([...pictures.matchAll(/\('([^']+)',/g)].map(m => m[1]), expected);
  const template = sql.match(/INSERT INTO plantilla_actividad \([\s\S]*?;/)[0];
  assert.ok(template.includes("'Desayunar'")); assert.ok(template.includes("WHERE codigo = 'bread'"));
  const steps = sql.match(/INSERT INTO plantilla_paso \([\s\S]*?;/)[0];
  const rows = [...steps.matchAll(/WHERE id_arasaac = (\d+)\s*\)\s*,\s*(\d+)\s*,\s*'([^']+)'/g)].map(m => [Number(m[1]), Number(m[2]), m[3]]);
  assert.deepEqual(rows, arasaacIds.map((id, index) => [id, index + 1,
    ['Lávate las manos', 'Prepara la mesa', 'Sirve la comida', 'Come', 'Limpia y recoge'][index]]));
  const actionWords = sql.match(/INSERT INTO palabra_clave_pictograma \([\s\S]*?;/)[0];
  for (const id of arasaacIds) assert.ok(actionWords.includes(`WHERE id_arasaac = ${id}`));
  for (const name of ['Pan', 'Libros', 'Almuerzo', 'Caminar', 'Dormir']) assert.ok(!actionWords.includes(`WHERE nombre = '${name}'`));
  const templateWords = sql.match(/INSERT INTO palabra_clave_actividad \([\s\S]*?;/)[0];
  for (const word of ['desayuno', 'desayunar', 'desayunando']) assert.ok(templateWords.includes(`'${word}'`));
  const iconWords = sql.match(/INSERT INTO palabra_clave_icono_actividad \([\s\S]*?;/)[0];
  for (const word of ['cenar', 'cena', 'colegio', 'descansar', 'desayunar']) assert.ok(iconWords.includes(`'${word}'`));
});
