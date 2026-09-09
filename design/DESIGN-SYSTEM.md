# РСО — дизайн-система

A code design system built from **«Брендбук РСО 2025 I Версия 1.10»** (Figma file, mounted read-only for this build) plus the font and logo files supplied alongside it.

**Российские студенческие отряды (МООО «РСО»)** describe themselves in the book as *«молодёжная организация, деятельность которой направлена на повышение трудовой активности молодёжи и улучшение имиджа труда для школьников и студентов»* — a nationwide organisation that helps school, college and university students find paid work outside term time. Members join one of eight направления (work streams), each with its own pictogram and colour.

## Sources

| Source | What was taken from it |
| --- | --- |
| Figma: «Брендбук РСО 2025 I Версия 1.10» (16 pages, ~42 400 nodes) | Colour specs (HEX/RGB/CMYK/Pantone), типометрия, typesetting rules, logo rules and clear space, знак, направления pictograms, основной паттерн, slide layouts, banner/poster artboards, the embedded Solar icon set |
| Uploaded font files | Stolzl (6 weights), Actay / Actay Wide / Actay Condensed, Onest (9 weights + variable) |
| Uploaded logo SVGs | 9 logo variants + 3 «Логотип I основной I White» files |

No public Figma URL or repository was provided; if you have access to the original file, the page index is /page … /page14 with the icon library on /page10.

There is **no separate wordmark or alternate mark** in the sources beyond the nine logo lockups and the знак — nothing here was drawn from memory.

## Index

- `styles.css` — the single entry point consumers link. `@import` lines only.
- `tokens/` — `fonts.css`, `colors.css`, `directions.css`, `typography.css`, `spacing.css`, `effects.css`
- `assets/fonts/` — the real webfont binaries
- `assets/logo/` — 9 logo lockups, знак artwork (`mark-circle.svg`, `mark-trudkrut.svg`)
- `assets/directions/` — the eight направления pictograms
- `assets/brand/` — фирменная стрелка, `brand-svg.js` (inline SVG data for the pictograms)
- `assets/icons/` — Solar icon data + `Icon` component
- `components/brand/`, `components/layout/` — the reusable primitives
- `guidelines/` — foundation specimen cards
- `ui_kits/brandbook_slides/` — the 1920 × 1080 slide system
- `ui_kits/campaign/` — banner, social post and A3 poster per направление
- `templates/brandbook-slide/`, `templates/direction-campaign/` — starting-point templates consuming projects can copy
- `SKILL.md` — Agent Skills wrapper

## Components

| Component | What it is |
| --- | --- |
| `Logo` | Логотип — 9 variants (horizontal / vertical / international × color / white / black) |
| `LogoClearSpace` | Логотип с охранным полем — the logo inside its protected area |
| `Mark` | Знак / эмблема — circle + «Труд Крут», no descriptor |
| `DirectionMark` | Иконка направления — one of the eight pictograms, in its own colour |
| `BrandArrow` | Фирменная стрелка — the heavy square-shouldered arrow |
| `SpecCard` | The outlined content card the book is built from |
| `SlideLabel` | The uppercase chapter caption in a slide corner |
| `PatternGrid` | Основной паттерн — the square-module pattern |
| `Icon` | Wrapper over the Solar glyph set embedded in the book |

The source file defines four component families (Логотип ×2 sets, Вертикальный логотип, Логотип с охранным полем) plus the знак and the Solar icon library. Those are all represented above.

### Intentional additions

- **`Icon`** — a wrapper so the Solar glyph data has a component API. The glyph artwork is the file's own.
- **`SpecCard`, `SlideLabel`, `PatternGrid`, `BrandArrow`, `DirectionMark`** — these are not Figma *components* in the source, but they are recurring, specified artefacts of the brandbook (the outlined card, the corner caption, the pattern, the arrow, the направления pictograms). They are componentised here so layouts can be built without re-deriving them.

---

## Content fundamentals

**Language is Russian.** Copy is written in the second person and speaks to a student directly: *«Если ты учишься в школе, колледже или университете и хочешь поработать в разных сферах экономики, мы здесь, чтобы поддержать тебя!»* The organisation says «мы»; the reader is «ты».

**Casing carries meaning.**

- Chapter captions and small labels are set **lowercase in the source** and uppercased by CSS: «типометрия», «основной паттерн», «работа со шрифтом», «титульный шрифт».
- Headlines are usually **lowercase**: «впереди лучшее лето», «на стройке», «логотип Российских студенческих отрядов».
- All-caps is reserved for statement slides over imagery: «БУКВЫ — БОЛЬШАЯ СИЛА, КОТОРОЙ НАДО ПРАВИЛЬНО ПОЛЬЗОВАТЬСЯ».

**Tone is plain, instructional and slightly wry.** Rules are stated as rules, then softened with a line of humour — a whole section on typesetting mistakes is titled «кто не ошибается, тот не пишет», and a page of over-decorated examples is captioned «это уже лишнее».

**Instructions are imperative and specific.** «Трекинг всегда должен быть равен 0%». «Никогда не выравнивайте все строки абзаца по ширине». «использование других цветов недопустимо». «нарушать расположение элементов внутри логотипа нельзя».

**Punctuation.** «Ёлочки» only; “лапки” are allowed solely for nested quotes — «Название “Афродита”». Em dashes are used for definitions. Ё is written out.

**Emoji: none.** The brandbook contains no emoji, and none should be used.

**Direction phrases** are a fixed set of eight and should be quoted verbatim: на стройке · в лагере · в медицине · в сервисе · на производстве · в поезде · в агрокомплексе · в отряде подростков.

---

## Visual foundations

### Colour

The core palette is four values and nothing else: **синий #0804FF** (Pantone Blue 072 C, CMYK 100 75 0 0), **белый #FFFFFF**, **серый #EEEEEE**, **чёрный #000000**. The book states plainly that using a colour that is not in the brandbook requires sign-off from PR РСО.

Blue is not an accent — it is a ground. Covers, chapter openers and campaign formats are full-bleed blue with white type. On white slides, blue is the headline colour.

Each направление owns one hue, in three values: a digital base, a light tint, and a stronger print value. Use a направление palette only when the core palette is not appropriate for the material, and never mix two направления in one composition.

### Type

Four roles, all specified in the book:

| Role | Face | Rule |
| --- | --- | --- |
| Титульный | **Actay Wide Bold** | Largest exceptional headlines, no more than 4 words. Sets «труд крут» in the logo. |
| Основной | **Stolzl** Regular / Medium / Bold | Headings and subheads, no more than 5 lines. Sets «Российские студенческие отряды» in the logo. |
| Текст | **Onest** Regular | Large bodies of copy. |
| Числа | **Stolzl Light** | Numeric values only — never lettered text. |

Manrope appears on the cover lead paragraph in the source file and is kept where that layout is reproduced.

**Типометрия** — five levels, each derived from the previous by dividing by 1.618 (the book's «коэффициент Фибоначчи»): Титул 84 · Заголовок 52 · Подзаголовок 32 · Текст 20 · Подстрочник 12 pt.

**Интерлиньяж** — bigger type, tighter leading. Average is 115% of the size; the book demonstrates 110 / 130 / 140 / 150% for progressively smaller blocks. Display headlines run at 0.9–0.94. **Tracking is always 0.**

**Setting rules** — ragged right, never justified; no widows or orphans; left alignment preferred, centre or right only in special formats.

### Layout

The whole book is authored on a **1920 × 1080** canvas with a **34px margin** on all four sides. The chapter caption sits at exactly 34 / 34, top-left, uppercase Stolzl Medium 16px at 0.86 leading. Campaign formats are built on a square module — 413.106px on the 2526px banner — flush to each other and to the edge.

### Backgrounds

Three treatments, no fourth: flat colour (blue, white, #F5F5F5 section bands, #F9F9F9 footers); the square-module pattern running off the edge of the format; and full-bleed photography under a flat **40% black scrim** — never a gradient, never a blur. Photography is documentary: crowds, work sites, students in uniform, warm and unfiltered, no grain treatment or duotone.

### Cards, borders and shadows

Cards are **outlined, never lifted**. A 1px inset hairline (`#CCCCCC`, sometimes `#C5C5C5`) and a 32px radius; 20px for inline chips and inset panels; 16px for icon buttons; 6.667px for icon inner shapes. **There is not a single drop shadow in the source** — do not add one. Guides and construction lines are dashed `#A8A8A8`.

### Transparency and blur

Used once, deliberately: the 40% black scrim over photography so white type stays readable. No frosted glass, no translucent panels, no blur.

### Motion, hover and press

The brandbook is a print/deck document and specifies no motion. The convention adopted here — and the one to follow in new work — is restrained: 120–200ms, `cubic-bezier(0.22, 0.61, 0.36, 1)`, opacity and background-colour changes only. Hover lightens a neutral surface one step (`#F5F5F5` → `#EEEEEE`); press darkens rather than shrinks. No bounces, no scale transforms on interactive elements.

### The logo

Nine lockups. The horizontal colour version is the default and should be the first choice. The vertical version exists only for cases where the horizontal lockup cannot hold its clear space or minimum width, or where the format is tall. The international lockup is for foreign-language materials.

**Охранное поле** — measure X as the width of the circle in the знак, then keep 0.25x above and below and 1x to the sides clear. The space exists so the logo stays self-sufficient and does not get mixed into surrounding graphics.

**Нельзя** (verbatim from the book): change the spacing between the descriptor and the знак when the logo is used as a single element · change the text inside the знак · change the original proportions of the descriptor and the знак · place the logo at an angle · use the знак without the descriptor outside a РСО context · use harsh shadows or other effects that hurt legibility · use the logo on a low-contrast background · use an outline version · use fonts other than the brand fonts in the logo · use a colour that is not in the brandbook without PR РСО approval.

Contrast against the background is the governing rule: *«Главное — соблюдать цветовой контраст к фону, чтобы не терялась узнаваемость бренда РСО»*.

---

## Iconography

**Two distinct icon systems, used for different jobs.**

1. **Иконки направлений** — eight bespoke pictograms, one per направление, drawn as solid single-colour silhouettes with no stroke and no detail: a triangle-and-stem for ССО, and equivalents for СПО, СМО, ССервО, СПрО, СОП, ССХО and ТОП. They are the brand's own artwork and live in `assets/directions/`. They are always set in one flat colour — white on a coloured ground, or the направление's own hue on white — and placed large. Also available as inline SVG data in `assets/brand/brand-svg.js` and through `<DirectionMark />`.

2. **The Solar icon set** — the brandbook embeds the Solar library (~7 400 glyphs across six styles: Linear, Bold, Broken, Outline, Line Duotone, Bold Duotone) as its UI icon system. 24×24 grid, ~1.5px stroke in the Linear styles. The book uses Linear for interface affordances (download, share, menu) and Bold for small filled accents, at 14–38px.

**No icon font, no PNG icons, no emoji, and no unicode characters used as icons anywhere in the source.** The only non-icon glyph pressed into service is the фирменная стрелка — a heavy, square-shouldered arrow that acts as a "back"/"next" affordance and as a corner accent on covers.

⚠️ **Icon coverage caveat.** 116 Solar glyphs — the ones the brandbook itself uses, plus a working UI set — are bundled in `assets/icons/icon-data.js` and typed in `Icon.d.ts`. The remaining ~7 300 were **not** extracted: enumerating every glyph name out of the source file was not feasible within one build. Solar is a free, public set; for a glyph that is not bundled, pull it from Iconify (`https://api.iconify.design/solar/<name>.svg`, or the `@iconify-json/solar` package) and keep the style consistent with the surrounding surface. See "Caveats" below.

---

## Caveats

- **Icons:** 116 of ~7 471 glyphs bundled (see above). The брендбук's own направления pictograms are complete.
- **Fonts:** all four families were supplied as real binaries — no substitutions were made. Manrope, Roboto, Inter, Cal Sans, VK Sans Display and Akzidenz-Grotesk appear in the source file as incidental faces inside example screenshots and third-party mockups; only Manrope is referenced in this system, on the cover layout that uses it.
- **Token collections / text styles:** the source file declares no Figma Variable collections and no named text styles. Every token here is derived from the values written on the brandbook pages themselves.
- **Photography:** one photograph was copied from the source (`assets/img/typography-hero.png`). The brandbook's other imagery is large campaign photography that was not needed for these kits.
