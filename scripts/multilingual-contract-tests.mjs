import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalogSource=read('lib/i18n/catalog.js');
const i18n=await import(`data:text/javascript;base64,${Buffer.from(catalogSource).toString('base64')}`);
const runtime=read('app/components/LanguageRuntime.js');
const layout=read('app/layout.js');
const home=read('app/page.js');
const auth=read('app/auth/page.js');
const templates=read('app/templates/page.js');

const {
  I18N_STORAGE_KEY,LANGUAGE_DEFINITIONS,SUPPORTED_LANGUAGE_CODES,UI_TRANSLATIONS,
  HERO_TRANSLATIONS,ATTRIBUTE_TRANSLATIONS,CRITICAL_UI_PHRASES,CRITICAL_ATTRIBUTE_PHRASES,
  normalizeLanguage,languageDirection,translateUiText,translateAttribute,heroForLanguage,
}=i18n;

assert.equal(I18N_STORAGE_KEY,'laneriq-language');
assert.equal(LANGUAGE_DEFINITIONS.length,10);
assert.equal(new Set(SUPPORTED_LANGUAGE_CODES).size,10);
assert.deepEqual(SUPPORTED_LANGUAGE_CODES,['en','zh-CN','zh-TW','ms','id','ja','ko','th','vi','es']);
for(const language of LANGUAGE_DEFINITIONS){
  assert.ok(language.code&&language.short&&language.label);
  assert.ok(['ltr','rtl'].includes(language.dir));
  assert.equal(languageDirection(language.code),language.dir);
}

// Every declared core UI key is 100% populated across every supported locale.
assert.ok(CRITICAL_UI_PHRASES.length>=60,'Core UI catalog must cover the LIUI Builder/Auth/Templates chrome.');
for(const phrase of CRITICAL_UI_PHRASES){
  const translations=UI_TRANSLATIONS[phrase];
  assert.ok(translations,`Missing UI phrase: ${phrase}`);
  assert.deepEqual(Object.keys(translations).sort(),[...SUPPORTED_LANGUAGE_CODES].sort(),`Locale coverage mismatch for: ${phrase}`);
  for(const code of SUPPORTED_LANGUAGE_CODES){
    assert.ok(String(translations[code]||'').trim(),`Empty ${code} translation for: ${phrase}`);
  }
}

for(const code of SUPPORTED_LANGUAGE_CODES){
  const hero=HERO_TRANSLATIONS[code];
  assert.ok(Array.isArray(hero)&&hero.length===4,`Hero coverage missing for ${code}`);
  assert.ok(hero.every(value=>String(value).trim().length>0));
}
for(const phrase of CRITICAL_ATTRIBUTE_PHRASES){
  const translations=ATTRIBUTE_TRANSLATIONS[phrase];
  assert.deepEqual(Object.keys(translations).sort(),[...SUPPORTED_LANGUAGE_CODES].sort(),`Attribute locale coverage mismatch: ${phrase}`);
  assert.ok(SUPPORTED_LANGUAGE_CODES.every(code=>String(translations[code]||'').trim()));
}

// Locale normalization is deterministic and unsupported locales fail safely to English.
assert.equal(normalizeLanguage('zh-Hant-HK'),'zh-TW');
assert.equal(normalizeLanguage('zh-SG'),'zh-CN');
assert.equal(normalizeLanguage('ms-MY'),'ms');
assert.equal(normalizeLanguage('es-MX'),'es');
assert.equal(normalizeLanguage('fr-FR'),'en');
assert.equal(normalizeLanguage(''),'en');
assert.equal(translateUiText('Dashboard','zh-CN'),'控制台');
assert.equal(translateUiText('Build','ms'),'Bina');
assert.equal(translateUiText('Templates','es'),'Plantillas');
assert.equal(translateUiText('Home','zh-CN'),'首页');
assert.equal(translateUiText('BUILD APP • GAME • WEB','ms'),'BINA APP • GAME • WEB');
assert.equal(translateUiText('Create Image','ja'),'画像を生成');
assert.equal(translateUiText('Unknown customer text','zh-CN'),'Unknown customer text');
assert.notEqual(translateUiText('Resend in 37s','zh-CN'),'Resend in 37s');
assert.notEqual(translateUiText('Resend in 37s','ms'),'Resend in 37s');
assert.equal(translateAttribute('Unknown placeholder','ja'),'Unknown placeholder');
assert.equal(heroForLanguage('zh-HK'),HERO_TRANSLATIONS['zh-TW']);

// Runtime must use the canonical catalog, persist locale, set semantic document metadata and handle dynamic DOM updates/attributes.
assert.match(runtime,/lib\/i18n\/catalog\.js/);
assert.doesNotMatch(runtime,/const PHRASES\s*=|const HERO\s*=/);
assert.match(runtime,/localStorage\.setItem\(I18N_STORAGE_KEY, language\)/);
assert.match(runtime,/navigator\.languages\?\.\[0\]/);
assert.match(runtime,/root\.lang = language/);
assert.match(runtime,/root\.dir = languageDirection\(language\)/);
assert.match(runtime,/dataset\.laneriqLang/);
assert.match(runtime,/dataset\.laneriqDir/);
assert.match(runtime,/characterData: true/);
assert.match(runtime,/attributes: true/);
assert.match(runtime,/attributeFilter: TRANSLATABLE_ATTRIBUTES/);
assert.match(runtime,/\["placeholder", "aria-label", "title"\]/);
assert.match(runtime,/window\.__LANERIQ_LANGUAGE__/);
assert.match(runtime,/laneriq-language-change/);
assert.match(runtime,/translateTree\(document\.body, language\)/);
assert.match(layout,/<LanguageRuntime \/>/);
assert.match(layout,/<html lang="en">/);

// Critical source surfaces must map stable visible English chrome into the complete catalog.
// Page 1 follows LIUI-2026.2 only; retired homepage copy must not be required by i18n.
// WhatsApp-specific phone auth labels are separately locked below so the retired SMS label cannot return.
const requiredSurfacePhrases=[
  [home,[
    'Build App • Game • Web','Tell LANERIQ AI what you want to create.','Powered by',
    'Tell LANERIQ AI what you want to build','✦ Improve Prompt','Ṫ Text Idea','▧ Upload Ref','◉ Voice Idea','↗ Photo / Video',
    'Create Image','Turn ideas into visuals with AI','Design UI','Craft layouts and visuals with AI',
    'Choose a Style','Customer colors can change later','Choose a Template','View All ›','BUILD APP • GAME • WEB',
    '✦ Credits','My projects','Home','Projects','Create','Templates','More'
  ]],
  [auth,['Checking your session…','Secure sign in','CREATE WITHOUT LIMITS','One code.','Your whole studio.','SECURE VERIFICATION','Enter Your Email','Check Your Email','A BRIGHTER TOMORROW TOGETHER','Email Code','Email address','Verify','Resend Code','Encrypted session','One-time code','Rate-limit aware','Private project access · passwordless verification','No paid SMS fallback is used.']],
  [templates,['Templates','✦ Build From Scratch','Trending','All Templates','All industries','All styles','Choose a Style','View details →','Use Template →','AI Reimagine','No template matched these filters. Try a broader search.']],
];
for(const [source,phrases] of requiredSurfacePhrases){
  for(const phrase of phrases){
    assert.ok(source.includes(phrase),`Expected source phrase not found: ${phrase}`);
    assert.ok(UI_TRANSLATIONS[phrase],`Critical surface phrase is not in canonical i18n catalog: ${phrase}`);
  }
}
assert.doesNotMatch(home,/Describe the App & Website you want to build|BUILD APP \+ WEBSITE|My Creations/,'Retired Page 1 copy must not return just to satisfy multilingual tests');

assert.match(auth,/WhatsApp Code/,'WhatsApp Code must remain the only phone verification label');
assert.match(auth,/WhatsApp number/,'WhatsApp phone input must remain explicit');
assert.doesNotMatch(auth,/<strong>SMS Code<\/strong>/,'Retired SMS verification label must not return');
assert.doesNotMatch(auth,/switchMethod\("sms"\)/,'Retired SMS verification method must not return');

// Main Builder and Templates searchable placeholders are also complete across all locales.
for(const phrase of CRITICAL_ATTRIBUTE_PHRASES){
  assert.ok(home.includes(phrase)||templates.includes(phrase),`Tracked placeholder no longer exists on a critical surface: ${phrase}`);
}

console.log('✓ Multilingual catalog has complete 10/10 locale coverage for every declared core UI key');
console.log('✓ LIUI-2026.2 Page 1 critical chrome is translated through the canonical catalog in all 10 locales');
console.log('✓ Hero and critical placeholder catalogs have complete 10/10 coverage with deterministic English fallback');
console.log('✓ Runtime persists language, sets html lang/dir, translates dynamic React text and key accessibility attributes');
console.log('✓ LIUI Builder, stable Auth chrome and Templates critical chrome remain locked to the canonical translation catalog');
console.log('✓ Auth phone verification is explicitly WhatsApp-only; retired SMS labels and methods are blocked');
console.log('✓ Unsupported locales fail safely and no legacy duplicate PHRASES/HERO dictionary remains in the runtime');