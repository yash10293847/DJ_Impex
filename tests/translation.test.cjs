const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createLoader } = require('./load-typescript.cjs');

function browser({ saved, cookies = [], blockedStorage = false } = {}) {
  let preference = saved ?? null;
  let reloads = 0;
  const jar = new Map(cookies.map(({ domain, value }) => [`${domain}:googtrans`, value]));
  const document = { documentElement: { lang: 'en', dir: 'ltr' } };
  Object.defineProperty(document, 'cookie', {
    get: () => [...jar.values()].map((value) => `googtrans=${value}`).join('; '),
    set: (cookie) => {
      const domain = /domain=([^;]+)/.exec(cookie)?.[1] ?? 'www.djimpex.in';
      const key = `${domain.replace(/^\./, '')}:googtrans`;
      if (cookie.includes('Max-Age=0')) jar.delete(key);
      else jar.set(key, cookie.split(';')[0].slice('googtrans='.length));
    },
  });
  const window = new EventTarget();
  window.location = { hostname: 'www.djimpex.in', protocol: 'https:', reload: () => { reloads++; } };
  const localStorage = {
    getItem: () => { if (blockedStorage) throw new Error('Unavailable'); return preference; },
    setItem: (_key, value) => { if (blockedStorage) throw new Error('Unavailable'); preference = value; },
  };
  const module = { exports: {} };
  const languages = createLoader().load('src/lib/languages.ts');
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/translation.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require: () => languages, window, document, localStorage, Event });
  return { api: module.exports, jar, document, reloads: () => reloads };
}

test('repeated language cycles leave one consistent cookie and return fully to English', () => {
  const state = browser({ saved: 'fr', cookies: [{ domain: 'djimpex.in', value: '/auto/zu' }, { domain: 'www.djimpex.in', value: '/en/fr' }] });
  const cycle = ['fr', 'zu', 'hi', 'ar', 'en', 'fr', 'en'];
  for (const language of cycle) {
    state.api.selectLanguage(language);
    assert.equal(state.api.readLanguage(), language);
    assert.equal(state.document.documentElement.lang, language);
    assert.equal(state.document.documentElement.dir, 'ltr');
    assert.deepEqual([...state.jar.values()], language === 'en' ? [] : [`/en/${language}`]);
  }
  assert.equal(state.reloads(), cycle.length);
});

test('existing translation cookie supplies the preference when storage is empty', () => {
  const state = browser({ cookies: [{ domain: 'djimpex.in', value: '/auto/fr' }] });
  assert.equal(state.api.readLanguage(), 'fr');
  state.api.applyLanguage(state.api.readLanguage());
  assert.equal(state.api.readLanguage(), 'fr');
  assert.deepEqual([...state.jar.values()], ['/en/fr']);
});

test('saved English clears inherited translation cookies, including the parent domain', () => {
  const state = browser({ saved: 'en', cookies: [{ domain: 'djimpex.in', value: '/en/zu' }] });
  state.api.applyLanguage(state.api.readLanguage());
  assert.equal(state.jar.size, 0);
});

test('switching and resetting work when localStorage is blocked', () => {
  const state = browser({ blockedStorage: true });
  state.api.selectLanguage('hi');
  assert.equal(state.api.readLanguage(), 'hi');
  state.api.selectLanguage('en');
  assert.equal(state.api.readLanguage(), 'en');
  assert.equal(state.jar.size, 0);
});

test('selecting the active language repairs stale content; invalid codes do nothing', () => {
  const state = browser({ saved: 'en', cookies: [{ domain: 'djimpex.in', value: '/auto/fr' }] });
  state.api.selectLanguage('en');
  assert.equal(state.reloads(), 1);
  assert.equal(state.jar.size, 0);
  state.api.selectLanguage('invalid;cookie');
  assert.equal(state.reloads(), 1);
});

test('Hebrew uses the widget language code while keeping the standard page language', () => {
  const state = browser({ blockedStorage: true });
  state.api.selectLanguage('he');
  assert.deepEqual([...state.jar.values()], ['/en/iw']);
  assert.equal(state.api.readLanguage(), 'he');
  assert.equal(state.document.documentElement.lang, 'he');
  assert.equal(state.document.documentElement.dir, 'ltr');
});
