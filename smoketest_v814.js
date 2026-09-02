// smoketest_v814.js — run before deploying lining-wang.com v8.1.4+
//   node smoketest_v814.js [path/to/index.html]
// v80 plus the almost assertions; 'Now has three lines' becomes four.
// Needs: npm i jsdom. og.png and shots/ are checked relative to the html file.
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const file = process.argv[2] || path.join(__dirname, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, '');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const d = dom.window.document;
let pass = 0, fail = 0;
function t(name, ok, note) {
  if (ok) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (note ? '  (' + note + ')' : '')); }
}
const $ = (s) => d.querySelector(s);
const $$ = (s) => Array.from(d.querySelectorAll(s));

// 1. no overlay machinery
t('no <dialog>', $$('dialog').length === 0);
t('no [data-open]', $$('[data-open]').length === 0);
t('no .mark arrows', $$('.mark').length === 0);
t('no .tag pills', $$('.tag').length === 0);

// 2. i18n completeness
const dict = JSON.parse($('#i18n').textContent);
const zh = dict.zh;
const keys = $$('[data-i18n]').map((n) => n.dataset.i18n);
const labels = $$('[data-i18n-label]').map((n) => n.dataset.i18nLabel);
const missing = keys.concat(labels).filter((k) => !(k in zh));
t('every data-i18n key has a zh string (' + keys.length + ' keys, ' + labels.length + ' labels)', missing.length === 0, missing.join(','));
const dupIds = keys.filter((k, i) => keys.indexOf(k) !== i);
t('no data-i18n key used twice', dupIds.length === 0, dupIds.join(','));
const stale = ['pwb2', 'nralt', 'lfalt', 'lflede', 'lfb', 'pwlede', 'pwlinks', 'news', 'n1', 'n2', 'n3', 'n5', 'n6', 'now4', 's_next', 'k_next', 'v_imnext'].filter((k) => k in zh);
t('dropped v7/v8.0 strings are not in the zh table', stale.length === 0, stale.join(','));

// 3. old ids survive
const ids = ['self-report', 'compliance-gap', 'interaction-conditions', 'state-descriptions', 'source-attribution', 'self-report-instrument', 'lucidfield', 'othermode', 'niaur', 'now', 'work', 'writing', 'about'];
const lost = ids.filter((id) => !d.getElementById(id));
t('all v7 block ids and the four section ids resolve', lost.length === 0, lost.join(','));
const allIds = $$('[id]').map((n) => n.id);
const dup = allIds.filter((k, i) => allIds.indexOf(k) !== i);
t('ids are unique', dup.length === 0, dup.join(','));
t('six articles carry an id', $$('article[id]').length === 6);

// 4. links and pictures
const hrefs = $$('a[href]').map((a) => a.getAttribute('href'));
const bad = hrefs.filter((h) => !(/^https:\/\//.test(h) || /^mailto:/.test(h) || /^\//.test(h) || /^#/.test(h)));
t('every href is https, mailto, site-relative or a hash', bad.length === 0, bad.join(','));
t('niaur.webp is not referenced', !/niaur\.webp/.test(htmlNoComments));
t('lucidfield.webp is not referenced', !/lucidfield\.webp/.test(htmlNoComments));
const imgs = $$('img');
t('exactly two images: portrait + the wall', imgs.length === 2, String(imgs.length));
const wall = imgs.find((im) => /imagery-wall/.test(im.getAttribute('src') || ''));
t('wall shot present with declared size 1100x640', !!wall && fs.existsSync(path.join(path.dirname(file), wall.getAttribute('src'))) && +wall.getAttribute('width') === 1100 && +wall.getAttribute('height') === 640);

// 5. copy rules
const bodyClone = d.body.cloneNode(true);
Array.from(bodyClone.querySelectorAll('.specimen')).forEach((n) => n.remove());
t('no em dash outside the specimen transcript', !/\u2014/.test(bodyClone.textContent));
t('specimen transcript is verbatim data (keeps its em dash)', /through\u2014except/.test(d.body.textContent));
const zhText = Object.values(zh).join('\n');
t('no em dash in zh table', !/\u2014/.test(zhText));
t('no stale "26 August" octopus sentence', !/26 August/.test(d.body.textContent) && !/8 月 26 日/.test(zhText));
t('octopus date appears as 2026.09.16 in the imagery line', /2026\.09\.16/.test($('#self-report-instrument').textContent));
t('Now does not carry the octopus date', !/octopus/i.test($('dl.now').textContent) && !/章魚/.test(zh.now1 + zh.now2 + zh.nowam + zh.now3));

// 5b. v8.1.3: the almost piece
const nowamDd = $('[data-i18n="nowam"]');
t('nowam Now line exists and links othermode.ai/almost', !!nowamDd && !!nowamDd.querySelector('a[href="https://othermode.ai/almost"]'));
t('nowam names the AI series, EN and zh', /first piece of its AI series/.test(nowamDd.textContent) && /AI 系列的第一件/.test(zh.nowam));
t('nowam sits between the wall line and the paper line', (() => { const dds = $$('dl.now dd').map((n) => n.dataset.i18n); return dds.join(',') === 'now1,now2,nowam,now3'; })());
t('s_demo status reads "Live demo" with the live dot', (() => { const dt = $('[data-i18n="s_demo"]'); return !!dt && dt.classList.contains('live') && /Live demo/.test(dt.textContent); })());
t('zh has s_demo + nowam, nowam links almost and says 合成', 's_demo' in zh && 'nowam' in zh && /othermode\.ai\/almost/.test(zh.nowam) && /合成/.test(zh.nowam) && /示範/.test(zh.s_demo));
const imlistEl = $('[data-i18n="imlist"]');
t('imlist has three items in EN', !!imlistEl && imlistEl.querySelectorAll('li').length === 3);
t('imlist item 3 opens the AI line, EN and zh', (() => { const li = imlistEl && imlistEl.querySelectorAll('li')[2]; return !!li && /AI-themed line/.test(li.textContent) && /that line's first piece/.test(li.textContent) && /AI 主題的一條線/.test(zh.imlist) && /第一件/.test(zh.imlist); })());
t('no leftover third-piece ordinal', !/third piece/i.test(imlistEl.textContent) && !/第三件/.test(zh.imlist));
t('imlist third item links almost and says synthetic', (() => { const li = imlistEl && imlistEl.querySelectorAll('li')[2]; return !!li && !!li.querySelector('a[href="https://othermode.ai/almost"]') && /synthetic/.test(li.textContent); })());
t('zh imlist has three items, third links almost and says 合成', (zh.imlist.match(/<li>/g) || []).length === 3 && /othermode\.ai\/almost/.test(zh.imlist) && /合成/.test(zh.imlist));
t('the octopus sentence is untouched, EN and zh', /The octopus dive is the second piece\. It is still being built, and is expected to be live by 2026\.09\.16\./.test(imlistEl.textContent) && /章魚下潛是第二件，還在做，預計 2026\.09\.16 前上線。/.test(zh.imlist));
t('every mention of the demo carries the synthetic label, EN', $$('[data-i18n="nowam"]').every((n) => /synthetic/.test(n.textContent)));
t('no banned metaphor characters in the new zh copy', (() => { const s = zh.nowam + zh.s_demo + zh.imlist.split('前上線。</li>')[1]; return !/[刀槍砍切劈尖撕釘撬]/.test(s); })());
t('pwb is untouched (her ratified copy)', /^Interactive pieces about modes other than your own/.test(($('[data-i18n="pwb"]') || { textContent: '' }).textContent));

// 6. type rules
const css = $$('style').map((x) => x.textContent).join('\n');
t('zh voice rule cancels italic', /html:lang\(zh-Hant\) \.claim[\s\S]*?font-style: normal/.test(css));
t('ptitle is italic in English only', /\.ptitle \{[^}]*font-style: italic/.test(css));
t('zh measure narrows to 30rem', /html:lang\(zh-Hant\) p[^{]*\{ max-width: 30rem/.test(css));
t('zh line rules: strict + hanging punctuation', /html:lang\(zh-Hant\) \{ line-break: strict; hanging-punctuation: allow-end; \}/.test(css));
t('no uppercase tracked labels', !/text-transform: uppercase/.test(css));
t('Google Fonts request includes Plex Serif', /IBM\+Plex\+Serif/.test(html));

// 7. figure and specimen
const fig = $('#interaction-conditions figure.fig');
t('paired-bar figure exists', !!fig);
t('paired-bar figure is outside <details>', fig && !fig.closest('details'));
t('scope paragraph (r2b5) is outside <details>', !$('[data-i18n="r2b5"]').closest('details'));
const spec = $('#interaction-conditions figure.specimen');
t('specimen exists in the LucidField line', !!spec);
t('specimen has two panes and a caption', spec && spec.querySelectorAll('.spec-pane').length === 2 && !!spec.querySelector('figcaption[data-i18n="speccap"]'));
t('specimen vote pills are depictions, not buttons', spec && spec.querySelectorAll('button, a').length === (spec.querySelector('figcaption a') ? 1 : 0) && spec.querySelectorAll('.spec-vote').length === 2);

// 8. structure
t('claim is the display line', !!$('.claim[data-i18n="claim"]'));
t('Now has four lines', $$('dl.now dt').length === 4 && $$('dl.now dd').length === 4);
t('three main lines carry status strips', $$('article.line dl.strip').length === 3);
t('three minor lines under Also running', $$('.also article.minor').length === 3);
t('every details has a summary with closed/opened labels', $$('details.more').every((x) => x.querySelector('summary .closed') && x.querySelector('summary .opened')));
t('write-ups: 5 (r2, im, three minor)', $$('details.more').length === 5);
t('Writing: negative-result note precedes the paper', (() => { const e = $$('#writing article.entry'); return e.length === 2 && /Open-ended/.test(e[0].textContent) && /Behavioral measurement/.test(e[1].textContent); })());
t('footer says Sep 2026', /Sep 2026/.test($('footer').textContent) && /2026 年 9 月/.test(zh.updated));

// 9. v8.1: og card, print, provenance, favicon
t('og:image meta points at /og.png', ($('meta[property="og:image"]') || {}).content === 'https://lining-wang.com/og.png');
t('og image dimensions + alt + twitter card set', !!$('meta[property="og:image:width"]') && !!$('meta[property="og:image:height"]') && !!$('meta[property="og:image:alt"]') && ($('meta[name="twitter:card"]') || {}).content === 'summary_large_image');
t('og.png sits next to index.html', fs.existsSync(path.join(path.dirname(file), 'og.png')));
t('print stylesheet present', /@media print/.test(css) && /@page \{ margin: 18mm; \}/.test(css));
t('beforeprint opens the write-ups, afterprint restores', /beforeprint/.test(html) && /afterprint/.test(html));
t('external links print their address', /a\[href\^="https:\/\/"\]::after \{ content: " \(" attr\(href\) "\)"/.test(css));
t('favicon is the paired-bars mark, not the wave', !/M12 38c8-9/.test(html) && /rect x='18' y='37'/.test(html));
t('footer carries the provenance line', /Single file/.test($('footer .prov').textContent) && /單一檔案/.test(zh.prov));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
