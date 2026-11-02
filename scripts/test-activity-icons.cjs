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

test('functional icon catalogue matches the historical incremental seed', () => {
  const incremental = read('backend_dia_facil/docs/sql/seed-iconos-actividad.sql');
  const pairs = [...incremental.split('INSERT INTO palabra_clave_icono_actividad')[0]
    .matchAll(/SELECT '([^']+)'(?: AS codigo)?, '([^']+)'(?: AS nombre)?/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(pairs, base.iconos.map(icon => [icon.codigo, icon.nombre]));
  assert.ok(pairs.every(([code, name]) => code.length <= 60 && name.trim() && name.length <= 80));
  assert.ok(!pairs.some(([code]) => code.includes('/') || code.includes('.png')));
});

test('current JPA separates activity icons from step pictograms while SQL v7 remains historical', () => {
  const entity = name => read('backend_dia_facil/src/main/java/dia_facil/backend/persistence/entity/' + name + '.java');
  for (const name of ['Actividad', 'PlantillaActividad']) {
    assert.match(entity(name), /name\s*=\s*"id_icono_actividad"/);
    assert.match(entity(name), /IconoActividad\s+iconoActividad/);
  }
  for (const name of ['PasoActividad', 'PlantillaPaso']) {
    assert.match(entity(name), /name\s*=\s*"id_pictograma"/);
    assert.ok(!entity(name).includes('id_icono_actividad'));
  }
  // The original SQL snapshot predates the documented icon/ARASAAC transitions.
  assert.ok(table('paso_actividad').includes('REFERENCES pictograma'));
  assert.ok(table('plantilla_paso').includes('REFERENCES pictograma'));
});

test('executable Desayunar data keeps approved ARASAAC IDs, order, instructions and keywords', () => {
  const expected = ['enjabonar las manos', 'poner la mesa', 'servir', 'comer', 'secar'];
  const ids = [2443, 5549, 36965, 2349, 8688];
  assert.deepEqual(ids.map(id => base.pictogramas.find(p => p.idArasaac === id)?.nombre), expected);
  const templatePictogramIds = ids.filter(id => base.pictogramas.some(p => p.idArasaac === id));
  assert.deepEqual(templatePictogramIds, ids);
  const template = base.plantillas.find(p => p.nombre === 'Desayunar');
  assert.ok(template); assert.equal(template.icono, 'bread');
  assert.deepEqual(template.pasos.map(p => p.orden), [1, 2, 3, 4, 5]);
  assert.deepEqual(template.pasos.map(p => p.pictograma), ids.map(id => 'arasaac:' + id));
  assert.deepEqual(template.pasos.map(p => p.descripcion), ['L\u00e1vate las manos', 'Prepara la mesa', 'Sirve la comida', 'Come', 'Limpia y recoge']);
  assert.deepEqual(template.palabras, ['desayuno', 'desayunar', 'desayunando']);
  assert.ok(ids.every(id => {
    const pictogram = base.pictogramas.find(p => p.idArasaac === id);
    return pictogram.palabras.length > 0 && pictogram.palabras.every(w => w.trim());
  }));
});
