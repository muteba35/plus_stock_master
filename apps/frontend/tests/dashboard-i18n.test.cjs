const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const filename = path.join(root, 'src/i18n/catalog.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { dashboardUi: ui, setDashboardLanguage, dashboardLocale } = loaded.exports;
const fr = require('../src/i18n/locales/fr/common.json').dashboard;
const en = require('../src/i18n/locales/en/common.json').dashboard;

test('FR and EN contain the same non-empty messages and placeholders', () => {
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  for (const key of Object.keys(fr)) {
    assert.ok(en[key].trim(), key);
    const placeholders = (s) => [...s.matchAll(/\{p\d+\}/g)].map((m) => m[0]).sort();
    assert.deepEqual(placeholders(fr[key]), placeholders(en[key]), key);
  }
});

test('language can switch from French to English and back', () => {
  setDashboardLanguage('fr');
  assert.equal(ui('Enregistrer'), 'Enregistrer');
  assert.equal(dashboardLocale(), 'fr-FR');
  setDashboardLanguage('en');
  assert.equal(ui('Enregistrer'), 'Save');
  assert.equal(dashboardLocale(), 'en-GB');
  setDashboardLanguage('fr');
  assert.equal(ui('Enregistrer'), 'Enregistrer');
});

test('explicit language and interpolation preserve names, numbers and codes', () => {
  assert.equal(ui('Stock disponible : {p0}', { p0: 40 }, 'en'), 'Available stock: 40');
  assert.equal(ui('Aucun produit trouvé pour le code {p0}.', { p0: 'BLEU-001' }, 'en'), 'No product found for code BLEU-001.');
  assert.equal(ui('Stock disponible pour Boutique Bleue : 12.', undefined, 'en'), 'Available stock for Boutique Bleue: 12.');
  assert.equal(ui('Boutique Bleue', undefined, 'en'), 'Boutique Bleue');
  assert.equal(ui(150, undefined, 'en'), 150);
  assert.equal(ui(null, undefined, 'en'), null);
});

test('unknown messages are preserved instead of translated word by word', () => {
  const custom = 'Mon produit vente avec description personnelle';
  assert.equal(ui(custom, undefined, 'en'), custom);
});

test('permission labels translate without changing permission codes', () => {
  const code = 'VOIR_MES_VENTES';
  assert.equal(ui(code, undefined, 'fr'), code);
  assert.equal(ui(code, undefined, 'en'), 'View only your own sales');
});

test('all explicit dashboard message keys exist', () => {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!/\.tsx?$/.test(file)) continue;
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bdu\("(m[0-9a-f]{12})"/g)) {
        assert.ok(Object.hasOwn(fr, match[1]), `${file}: ${match[1]}`);
      }
    }
  }
  walk(path.join(root, 'app/dashboard'));
});

test('dashboard translations contain no corrupted UTF-8 or literal HTML entities', () => {
  for (const messages of [fr, en]) for (const [key, value] of Object.entries(messages)) {
    assert.equal(/\uFFFD|\u00c3[\u0080-\u00bf]|\u00e2\u20ac|&(?:apos|quot|amp);/.test(value), false, key);
  }
});

test('dashboard pages server-render in FR and EN without unresolved translation keys', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const originalLoad = Module._load;
  const previousTs = require.extensions['.ts'];
  const previousTsx = require.extensions['.tsx'];
  const previousStorage = global.localStorage;
  // These pages normally mount inside the authenticated client layout.
  global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  let language = 'fr';
  const compile = (target, file) => target._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  }).outputText, file);
  require.extensions['.ts'] = compile;
  require.extensions['.tsx'] = compile;
  Module._load = function (request, parent, main) {
    if (request.endsWith('/LanguageRuntime')) return { useLanguage: () => ({
      language, locale: language === 'fr' ? 'fr-FR' : 'en-GB', setLanguage: () => {},
      ui: (value, params) => ui(value, params, language), translate: (value) => ui(value, undefined, language),
      t: (key) => key,
    }) };
    if (request.endsWith('/i18n/catalog')) return loaded.exports;
    if (request === 'next/navigation') return {
      useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {} }),
      usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams(),
    };
    if (request === 'next/link') return ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children);
    if (request.startsWith('@/')) request = path.join(root, request.slice(2));
    return originalLoad.call(this, request, parent, main);
  };
  const pages = [];
  function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) walk(file); else if (e.name === 'page.tsx') pages.push(file);
  } }
  try {
    walk(path.join(root, 'app/dashboard'));
    for (language of ['fr', 'en']) {
      setDashboardLanguage(language);
      for (const file of pages) {
        const Page = require(file).default;
        const html = renderToStaticMarkup(React.createElement(Page));
        assert.ok(!/>m[0-9a-f]{12}</.test(html), `${language}: ${file}`);
      }
    }
    console.log(`Server-rendered ${pages.length} dashboard pages in both languages; not a browser interaction test.`);
  } finally {
    Module._load = originalLoad;
    if (previousTs) require.extensions['.ts'] = previousTs; else delete require.extensions['.ts'];
    if (previousTsx) require.extensions['.tsx'] = previousTsx; else delete require.extensions['.tsx'];
    setDashboardLanguage('fr');
    if (previousStorage) global.localStorage = previousStorage; else delete global.localStorage;
  }
});
