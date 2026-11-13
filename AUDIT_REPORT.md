# AudioLift — Kod Sağlığı Denetim Raporu

**Tarih:** 2026-09-02 · **Sürüm:** 2.2.1 · **Kapsam:** `src/`, `manifest.json`, build/config, dokümantasyon, git durumu
**Mercek:** code-health (bug, kopukluk, ölü kod odaklı) · **Mod:** salt-okunur, hiçbir kaynak dosyaya dokunulmadı

## Stack özeti

- Chrome MV3 extension; TypeScript + React 18 + Vite 5 + `@crxjs/vite-plugin` + Tailwind v3.
- Üç giriş noktası: `src/background/index.ts` (service worker), `src/content/index.ts` (Web Audio graph, her frame'e `document_start`'ta enjekte), `src/popup/` (React UI; hem action popup hem side panel olarak aynı HTML).
- Ayarlar `chrome.storage.local`'da `globalSettings`, `domainSettings_<host>`, `domainPreset_<host>`, `themePreference` anahtarlarıyla tutuluyor. Popup → content script iletişimi `chrome.tabs.sendMessage` ile.
- Teşhis araçları: `tsc --noEmit` temiz (0 hata). `npm audit --omit=dev` 0 açık; devDependency tarafında yalnızca `undici` (transitif, build aracı) 11 uyarı — runtime'a girmiyor.
- Git: 2026-01-01'den beri commit yok; çalışma ağacında 17 `legacy-extension/*` silmesi, ikon değişiklikleri, `scripts/` ve `package.json` değişikliği unstaged duruyor.

---

## 1. Hata & bug riskleri

### [KRİTİK · Kesin] `src/background/index.ts:180` — Her service-worker uyanışında tüm sekmelere yeniden enjeksiyon → çalan medya sessizleşiyor
**Sorun:** `injectContentScripts()` dosyanın en üst seviyesinde koşulsuz çağrılıyor. MV3'te service worker ~30 sn boşta kalınca ölür ve herhangi bir olayda (sekme değişimi, `onUpdated`, kısayol) yeniden başlar; her başlangıçta bu fonksiyon tüm http/https sekmelerine `executeScript` ile content script'i **tekrar** basıyor. `src/content/index.ts:16-22` yeni kopya yüklenince eski instance'ın `cleanup()`'ını çağırıyor, o da `audioContext.close()` yapıyor (`:63-66`). `createMediaElementSource` ile bir kez bağlanmış `<video>/<audio>` elementi kalıcı olarak o context'e bağlıdır; context kapanınca elementin sesi gider ve yeni instance aynı elementi bağlamaya çalışınca `InvalidStateError` alıp atlıyor (`:241-246`).
**Etki:** Kullanıcı başka sekmeye geçip geri geldiğinde YouTube/Netflix sekmesi sessizleşebilir; sayfa yenilenene kadar ses dönmez. Ayrıca eski `chrome.runtime.onMessage` dinleyicisi hiç kaldırılmadığından her uyanışta bir dinleyici daha birikiyor.
**Not:** `onInstalled` içindeki `// await injectContentScripts();` satırı (`:149`) yorumda; doğru yer orasıydı (yalnızca ilk kurulumda, mevcut sekmelere bir kez). Kopukluk tam burada.

### [YÜKSEK · Kesin] `src/popup/hooks/useAudioSettings.ts:85-89` — Her site-özel değişiklik `globalSettings`'i de eziyor
**Sorun:** `updateSettings` hem `domainSettings_<host>` hem `globalSettings`'e aynı objeyi yazıyor (yorum bile "decide if global should track local" diyor). Sonuç: hiç ziyaret edilmemiş bir site, en son düzenlenen sitenin tüm ayarlarını (EQ, enabled, mono…) miras alıyor.
**Etki:** README/Store'daki "Per-Site Memory + Global Defaults" vaadi fiilen çalışmıyor; kullanıcı bir sitede Bass+ yapınca her yeni site Bass+ açılıyor. Klavye kısayolu (`background/index.ts:36-38`) ise yalnızca domain'e yazıyor → iki yol tutarsız.

### [YÜKSEK · Kesin] `src/content/index.ts:103` + `:127-129` — Extension kapalıyken bile medya Web Audio graph'ına alınıyor
**Sorun:** `start()` ayarları yüklemeden `scanForMedia()` çağırıyor; `loadSettings` içindeki `if (this.settings.enabled)` koşulu bu yüzden anlamsız. `enabled=false` olsa da her medya elementi `createMediaElementSource` ile yakalanıyor.
**Etki:** (a) CORS başlığı göndermeyen cross-origin kaynaklarda Web Audio çıktısı sessizdir → extension "kapalı" görünürken bazı siteleri susturabilir. (b) Kullanıcı jesti olmadan oluşturulan `AudioContext` `suspended` başlar; `resume()` jest olmadan reddedilebilir, medya ilk etkileşime kadar sessiz kalabilir (Şüpheli kısım). (c) `all_frames: true` ile her iframe'de ayrı context açılıyor.

### [YÜKSEK · Kesin] `src/content/index.ts:213-229` — "CORS fix" bloğu etkisiz, yanıltıcı
**Sorun:** `crossOrigin = "anonymous"` ancak `src` yeniden atanırsa yeni fetch'i etkiler; `setupAudio` ise `loadedmetadata` sonrasında (medya zaten CORS'suz yüklenmişken) çalışıyor. `wasPaused` okunuyor, içi boş `if` ve yorum satırına alınmış `load()`/`currentTime` var. Blok fiilen no-op; yorumdaki "usually setting the attribute is enough" iddiası doğru değil.
**Etki:** Ölü kod + yanlış güven. Gerçek CORS sorunu (yukarıdaki madde) çözülmüyor.

### [YÜKSEK · Kesin] `src/popup/components/Header.tsx:38` + `tailwind.config.js` — Logo `dark:` variant'ı manuel temayı takip etmiyor
**Sorun:** `tailwind.config.js`'de `darkMode` tanımsız → varsayılan `media`. `dark:brightness-0 dark:invert` yalnızca OS temasına bakıyor; kullanıcı ☀️/🌙 ile `body.light-mode`/`body.dark-mode` seçince CSS değişkenleri değişiyor ama logo filtresi değişmiyor.
**Etki:** OS koyu + kullanıcı "light" seçti → beyaz zemin üzerinde beyaza çevrilmiş logo (görünmez). Tersi durumda koyu zeminde koyu logo. Çözüm yönü: `darkMode: ['class', 'body.dark-mode']` ya da logo filtresini CSS değişkenine bağlamak (Faz 5'te).

### [ORTA · Kesin] `src/popup/hooks/useAudioSettings.ts:81-103` — Yan etkiler `setState` updater'ının içinde
**Sorun:** Storage yazma ve `sendMessage`, `setSettings(prev => …)` callback'i içinde. React StrictMode (dev) updater'ı iki kez çalıştırır → çift yazma/çift mesaj; prod'da da "updater saf olmalı" kuralı ihlali, ileride concurrent render'da sürpriz üretir.

### [ORTA · Kesin] `src/popup/hooks/useAudioSettings.ts:107-113` — Manuel slider değişikliği `activePreset`'i temizlemiyor
**Sorun:** Preset seçildikten sonra EQ/kompresör elle değiştirilince preset butonu vurgulu kalıyor ve `domainPreset_<host>` storage'da o preset olarak yazılı kalıyor.
**Etki:** UI "Rock" diyor, gerçek ayar bambaşka.

### [ORTA · Kesin] Popup ve content script `chrome.storage.onChanged` dinlemiyor
- `src/popup/hooks/useAudioSettings.ts` — Side panel açıkken `Cmd+Shift+A` ile toggle yapılırsa panel eski `enabled` durumunu gösteriyor.
- `src/content/index.ts` — Aynı domain'in diğer sekmeleri, popup'tan yapılan değişikliği sayfa yenilenene kadar almıyor (yalnızca aktif sekmeye `sendMessage` gidiyor).
**Etki:** "Settings auto-saved per site" vaadi çoklu sekmede tutmuyor.

### [ORTA · Şüpheli] `manifest.json:33-36` + `src/background/index.ts:143,184` — Hem `default_popup` hem `openPanelOnActionClick: true`
**Sorun:** Action'a hem popup atanmış hem de ikon tıklamasında side panel açılması isteniyor. Chrome'da popup tanımlıysa tıklama popup'ı açar; `setPanelBehavior` etkisiz kalır. Commit geçmişinde ("fix: ensure side panel opens on icon click") bu konuda gidip gelme var.
**Neden şüpheli:** Hangi davranışın istendiği koddan anlaşılmıyor; ürün kararı gerekiyor. Ayrıca aynı `setPanelBehavior` çağrısı hem `onInstalled` içinde hem üst seviyede tekrarlanıyor (DRY).

### [ORTA · Şüpheli] `src/content/index.ts:360-369` — DOM'dan ayrılıp geri eklenen medya elementi kalıcı olarak "yetim" kalıyor
**Sorun:** `updateAllSources` `isConnected=false` olan elementi `audioSources`'tan siliyor ama `processedElements` WeakSet'te bırakıyor ve node'ları disconnect etmiyor. Element tekrar DOM'a eklenince (SPA'larda video elementi taşıma/yeniden kullanma yaygın) `processMediaElement` onu "işlenmiş" sayıp atlıyor; graph'a bağlı kalıyor ama artık ayar güncellemesi almıyor.
**Neden şüpheli:** Tam zamanlama (mesaj tam ayrık anda gelmeli) gerekiyor; senkron `appendChild` taşımalarında tetiklenmez.

### [ORTA · Kesin] `src/content/index.ts:394-397` — Audio Info her zaman DOM'daki *ilk* medya elementini raporluyor
**Sorun:** Sayfada birden fazla `<video>/<audio>` varsa (reklam player'ı, önizleme thumbnail'ları) çalan yerine ilk bulunan gösteriliyor. `bitrate` alanına yazılan `'Streaming' / 'Buffered' / 'No Source'` değerleri de bitrate değil, networkState.

### [DÜŞÜK · Şüpheli] `src/index.css:112-120` — `-webkit-appearance: slider-vertical` deprecated, `writing-mode: bt-lr` geçersiz
**Sorun:** `bt-lr` geçerli bir `writing-mode` değeri değil (yok sayılır). Chrome 124+ dikey range için `writing-mode: vertical-lr; direction: rtl` öneriyor, `slider-vertical` deprecation uyarısı veriyor. `Slider.tsx:25`'teki `orient` attribute'u yalnızca Firefox'ta anlamlı. Görsel olarak şu an çalışıyor olabilir; Chrome kaldırdığında EQ slider'ları yatay düşer.

---

## 2. Ölü kod & kopukluklar

| Konum | Ne | Açıklama |
|---|---|---|
| `src/background/index.ts:63-68` | `getTabId` mesaj handler'ı | Hiçbir yerden `getTabId` gönderilmiyor. `return true` her mesajda kanalı açık tutuyor. Tamamen ölü. |
| `src/content/index.ts:97-99` | `getStatus` mesaj handler'ı | Gönderen yok. Ölü. |
| `src/background/index.ts:149` | `// await injectContentScripts();` | Yorumda bırakılmış doğru çağrı; aktif olan üst-seviye çağrı ise Kritik bug'ın kaynağı. |
| `src/background/index.ts:158` | `chrome://`, `edge://`, `about:` filtresi | `tabs.query` zaten `http/https` ile sınırlı; koşul asla true olmaz. |
| `src/content/index.ts:213-229` | CORS bloğu, `wasPaused`, boş `if`, yorumlu `load()` | Yukarıda açıklandı; no-op. |
| `src/content/index.ts:127-129` | `if (this.settings.enabled) this.scanForMedia()` | `start()` zaten koşulsuz taramış; ikinci tarama her elementi `processedElements` yüzünden atlıyor. Etkisiz. |
| `src/types.ts:17-18`, `content/index.ts:355-356` | `compressionAttack`, `compressionRelease` | Ayar olarak var, content'te uygulanıyor, ama UI'da slider yok ve hiçbir preset set etmiyor → her zaman default. Yarım özellik. |
| `src/popup/hooks/useAudioSettings.ts:142` | `domain` return değeri | `App.tsx` destructure etmiyor; kullanılmıyor. |
| `src/popup/App.tsx:25` | `scrollbar-thin` | Tailwind core'da yok (plugin gerektirir), `index.css`'de tanımı yok → no-op class. |
| `src/popup/components/Compressor.tsx:66` | `animate-[modalSlide_0.2s_ease]` | `modalSlide` keyframe hiçbir yerde tanımlı değil → animasyon çalışmıyor. |
| `Compressor/Equalizer/PresetGrid/QuickTools/Header/Slider.tsx` | `section-title`, `preset-btn`, `tool-btn`, `toggle-switch`, `slider` class'ları | Vanilla JS sürümünden kalan isimler; CSS tanımı yok. Zararsız ama gürültü. |
| `src/vite-env.d.ts:3-6` | `'*?script'` modül deklarasyonu | crxjs zaten kendi tipini sağlıyor; muhtemelen gereksiz (Şüpheli). |
| `manifest.json:8` | `activeTab` izni | `<all_urls>` host permission varken işlevsiz; Store incelemesinde "gereksiz izin" olarak sorulabilir. |
| `src/popup/components/Header.tsx:9` | `theme` state tipi `'light' \| 'dark' \| 'auto'` ama `applyTheme(newTheme: string)` | Tip daralması kaybediliyor; küçük tutarsızlık. |

---

## 3. Yapısal / kalite

- **[ORTA · Kesin] `src/content/index.ts:286-358` — `applySettingsToNodes` içinde 10 bandın dört ayrı yerde tek tek elle yazılması.** Aynı `eq32…eq16k` listesi `createAudioChain`, `applySettingsToNodes` (2 blok), `Equalizer.tsx:11`, `presets.ts` ve `types.ts`'de tekrar ediyor. Tek bir `BANDS` sabiti + döngü olsa 60+ satır düşer ve bant eklemek tek yer olur.
- **[DÜŞÜK · Kesin] `src/popup/components/Slider.tsx:24` — `disabled` prop'u `opacity + pointer-events` ile taklit ediliyor**, gerçek `disabled` attribute'u yok → klavye ile odaklanıp değer değiştirilebilir (Loudness açıkken EQ değişir).
- **[DÜŞÜK · Kesin] Production'da 6 adet `console.log`** (`content/index.ts:85,91,206,232`, `background/index.ts:49,144,185`). Her medya elementi için DOM referansı loglanıyor; site konsolunu kirletiyor.
- **[DÜŞÜK · Kesin] `src/popup/components/Footer.tsx:10-14`** — `target="_blank"` linklerde `rel="noopener noreferrer"` yok; URL'ler (`daiquiri.dev`, `github.daiquiri.dev`, `bmc.daiquiri.dev`) hardcoded. BRIEF.md'deki "marka değişebilir" kuralı site için geçerli ama bu linkler de rebrand'da elle değişmek zorunda.
- **[DÜŞÜK · Kesin] `tsconfig.json:11`** — `allowImportingTsExtensions` açık ama kodda `.ts` uzantılı import yok; `resolveJsonModule` gerekli (manifest importu), diğeri gereksiz.

---

## 4. Dokümantasyon & Store tutarsızlığı

### [YÜKSEK · Kesin] `README.md`, `CHANGELOG.md`, `chrome-web-store/STORE_DESCRIPTION_EN.md` — Var olmayan özellikler anlatılıyor
TypeScript/React yeniden yazımı (commit `a90911f`) şu özellikleri **düşürdü** ama dokümanlar hâlâ vaat ediyor:
- **Spectrum Analyzer** (README:15, CHANGELOG 2.2.0, STORE_DESCRIPTION:4,20,92,111) — `src/`'de `createAnalyser` yok, v2.2.1 zip'inde de yok. Store'daki `screenshot-4-spectrum.png` ekran görüntüsü artık olmayan bir özelliği gösteriyor. **Chrome Web Store politikası açısından risk** (yanıltıcı listeleme).
- **Custom preset save/load**, **Advanced (⚙️) panel**, **"Save for this Site" / "Save as Default" butonları**, **"Tab-Specific settings"**, **Badge indicator** — hiçbiri kodda yok (badge özellikle `''` olarak temizleniyor).
- README "Project Structure" hâlâ `extension/popup.js` vanilla yapısını, "No build process required" diyor; kurulum "Select the `extension` folder" diyor — artık `dist/`.
- `CHANGELOG.md` 2.2.0'da bitiyor; 2.2.1 ve TS/React migrasyonu (breaking: spectrum kaldırıldı) kayıtsız.
- `PRIVACY.md` "Scripting: inject into existing tabs without refresh" diyor — davranış doğru ama yukarıdaki Kritik bug'ın gerekçesi burada.

### [ORTA · Kesin] `CLAUDE.md` (çatı) — AudioLift için `briefs/` altında brief yok
Çatı CLAUDE.md zaten bunu not ediyor; Polar lineup'ında olup olmadığı, ücretli/ücretsiz kararı ve side panel vs popup kararı yazılı değil. Yukarıdaki "Şüpheli" ürün kararları buraya bağlı.

---

## 5. Bağımlılık & yapılandırma

- **[DÜŞÜK · Kesin] `package.json:17`** — `@crxjs/vite-plugin` `^2.0.0-beta.23` (kurulu 2.3.0, güncel 2.7.1). Beta pin'i güncellenmeli; MV3 SW/loader üretiminde düzeltmeler var.
- **[DÜŞÜK · Kesin] `npm audit`** — Yalnızca devDependency zincirinde `undici` (11 uyarı). Runtime paketi etkilenmiyor; `npm audit fix` yeterli.
- **[DÜŞÜK · Kesin] `package.json:2`** — `name: "audio-lift-modern"`; geçici migrasyon adı kalmış.
- **[DÜŞÜK · Kesin] Tailwind v3 + `@apply` ile Chrome CSS değişkenleri** — `index.css:5-65` aynı 12 değişken üç kez (`:root`, `@media dark`, `body.dark-mode`) kopyalanmış; `light-mode` bloğu `:root` ile birebir aynı. Tek kaynak + `darkMode: 'class'` ile 40 satır düşer.

---

## 6. Git / versiyon kontrol

- **[ORTA · Kesin]** Son commit 2026-01-01. Çalışma ağacında: 17 `legacy-extension/*` silmesi (unstaged), 6 ikon PNG değişikliği, `scripts/build.js` (untracked), `package.json` `package` script'i. `.gitignore` `legacy-extension/`'ı zaten ignore ediyor ama dosyalar tracked olduğundan silme commit edilmeli. Çatı CLAUDE.md'deki "push edilmemiş WIP" bu.
- **[DÜŞÜK · Kesin]** `dist/`, `releases/`, `chrome-web-store/` ignore'da (doğru) — ama `chrome-web-store/node_modules/` (puppeteer, ~300 KB listing) proje ağacında duruyor; ayrı bir `package.json`'ı var, ana `package.json`'dan bağımsız. Kasıtlıysa sorun değil.

---

## ÖZET

| Önem | Adet |
|---|---|
| Kritik | 1 |
| Yüksek | 5 |
| Orta | 9 |
| Düşük | 11 |
| **Toplam** | **26** (+ ölü kod tablosunda 14 kalem) |

### En acil 5
1. **`background/index.ts:180`** — Üst-seviye `injectContentScripts()` çağrısını kaldır, yalnızca `onInstalled` (reason === 'install') içinde çalıştır; enjeksiyon öncesi "zaten var mı" ping'i ekle. Medya sessizleşme bug'ının kökü.
2. **`content/index.ts:103` + `:127`** — `enabled=false` iken medyayı graph'a alma; graph'ı ilk açılışta lazy kur.
3. **`useAudioSettings.ts:85-89`** — `globalSettings` yazımını kaldır (ya da açık bir "Save as default" aksiyonuna bağla); yan etkileri updater dışına taşı.
4. **Store listing / README / CHANGELOG** — Spectrum Analyzer, custom preset, advanced panel iddialarını ve `screenshot-4-spectrum.png`'yi kaldır ya da özelliği geri getir. Store politikası riski.
5. **`Header.tsx:38` + `tailwind.config.js`** — `darkMode: ['class', 'body.dark-mode']` ekle; manuel tema seçiminde logo görünmez kalıyor.

### Hızlı kazanımlar (düşük efor – yüksek etki)
- `activeTab` iznini manifest'ten çıkar (Store inceleme sürtünmesi azalır).
- Ölü handler'ları sil: `getTabId` (background), `getStatus` (content), redundant `chrome://` filtresi, CORS no-op bloğu.
- `console.log`'ları kaldır ya da `import.meta.env.DEV` arkasına al.
- `activePreset`'i manuel değişiklikte `null`'a çek (3 satır).
- `chrome.storage.onChanged` dinleyicisi ekle (popup + content) → side panel ve çoklu sekme senkronu.
- `.gitignore`'a rağmen tracked kalan `legacy-extension/` silmesini + `scripts/` + `package.json`'ı commit et.
- `@crxjs/vite-plugin`'i 2.7.x'e çek, `npm audit fix`.
- `index.css`'teki üç kopya tema bloğunu tek `dark` bloğuna indir.
