# Генератор PDF «Технологический стек»

Собирает `docs/Единое окно — технологический стек.pdf` в фирменном стиле РСО:
шрифты Actay Wide / Stolzl / Onest встраиваются в документ как base64,
рендер — Puppeteer (тот же, что генерирует заявления в `apps/api`).

```bash
node docs/stack-pdf/render.mjs
```

Требуется скачанный браузер Puppeteer:

```bash
pnpm --filter @edinoe-okno/api exec puppeteer browsers install chrome-headless-shell
```

| Файл | Что |
|---|---|
| `style.css` | Вёрстка и токены брендбука: A4, палитра, типографика, контурные карточки |
| `body1.html` | Обложка и архитектура |
| `body2.html` | Бэкенд и клиенты |
| `body3.html` | Функционал, репозиторий и готовность |
| `render.mjs` | Встраивание шрифтов, склейка, рендер в PDF |
