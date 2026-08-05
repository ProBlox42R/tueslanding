<div align="center">

<img src="packages/shared/assets/logo.svg" width="88" alt="Билети лого" />

# 🎟️ Билети

**Система за продажба и управление на билети — събития, места на седалки в реално време, PDF билети с QR код и админ табло, всичко на български.**

[![Node](https://img.shields.io/badge/Node.js-20%2B-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)](https://react.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#)

</div>

---

## ✨ Какво прави

| | |
|---|---|
| 🔐 **Автентикация** | регистрация с потвърждение по имейл, вход/изход, забравена парола — Argon2id, rate limiting |
| 🏟️ **Зали** | визуален редактор — редове, коридори, VIP/блокирани места, drag-free click-to-edit |
| 🎫 **Събития** | създаване → публикуване → спиране на продажби → архивиране |
| 💺 **Избор на места** | схема в реално време през SSE — никой друг не вижда свободно място, което току-що си избрал |
| 🔒 **Без overselling** | MySQL row-locking — при паралелни заявки за едно и също място печели само първата |
| 🧾 **Checkout** | отделна стъпка само с име на билета — без карта, без чувствителни данни |
| 📄 **PDF билети** | чист, разпечатваем дизайн с QR код и лого — виж [пример по-долу](#-как-изглежда) |
| ☁️ **Съхранение** | локален диск "из кутията" или Cloudflare R2 с една променлива в `.env` |
| 📷 **Сканиране** | камера на телефон/лаптоп (или ръчно въвеждане) — атомна защита от двойно сканиране |
| 📊 **Админ табло** | статистики, поръчки с филтри, refund, управление на администратори |
| 🚦 **Queue** | автоматична "чакалня" само при >50 едновременни купувачи |
| 🌗 **Тема** | светла/тъмна — брандовият цвят `#ED6C66` остава same и в двете |
| 📱 **Mobile-first** | пълноценно от телефон — включително seat map и сканиране |

---

## 🚀 Бърз старт

Едно приложение, един порт, три команди:

```bash
npm run setup        # install + migrate + seed (demo зала, събитие, акаунти)
npm run build        # компилира и фронтенда, и бекенда
npm start             # едно приложение на http://localhost:3000
```

Преди това само трябва `.env`:

```bash
cp .env.example .env
openssl rand -hex 32   # → постави в SESSION_SECRET
docker compose up -d mysql
```

Готово — влез с демо акаунт `user@example.com` / `Parola123!`, купи билет от демо събитието, и виж как изглежда в „Моите билети“. За админ достъп: `admin@example.com` / `Admin123!` (виж 🎛️ [Табло](#🎛️-админ-табло) по-долу).

> **Активна разработка с hot-reload?** `npm run dev` стартира сървъра и Vite едновременно (два процеса, но една команда) — само за докато пишеш код. За нормално ползване, `npm start` е едно приложение, една врата.

---

## 🧱 Технологичен стек

```
Backend    Node.js · TypeScript (strict) · Express · MySQL 8
Frontend   React 18 · Vite · Tailwind CSS · Material 3 принципи
Realtime   Server-Sent Events
PDF/QR     PDFKit + DejaVu Sans (пълна кирилица) · qrcode
Email      Resend, тъмен "glass" дизайн (виж по-долу)
Storage    Локален диск ⇄ Cloudflare R2 — превключва се с 1 ред в .env
```

---

## 💳 Плащане — фиктивно/вътрешно (умишлено)

Няма поле за карта никъде в приложението. Потокът е:

```
избор на места → резервация (10 мин, row-locked)
   → checkout страница (само име за билета)
      → "Купи" → поръчката е PAID моментално
         → PDF + QR се генерират → имейл през Resend
```

Backend-ът винаги изчислява крайната цена от базата — checkout endpoint-ът никога не приема цена от клиента. Плащането и генерирането на PDF/имейл са **нарочно разделени**: ако PDF/имейл стъпката се провали временно, покупката остава валидна, а билетът се генерира лениво при следващо отваряне — вместо потребителят да вижда грешка за нещо, което вече е платено.

Искаш ли реален Stripe по-късно? Смени тялото на `ordersService.checkout()` в `apps/server/src/modules/orders/orders.service.ts` — state machine-ът (`UNPAID → PAID → REFUNDED`, идемпотентност) е нарочно същият, за да е смяната минимална.

---

## ☁️ Съхранение на PDF билетите

```env
# .env
R2_ENABLED=false   # → локален диск, apps/server/storage/tickets/, нулева настройка
R2_ENABLED=true    # → Cloudflare R2 (S3-съвместимо), изисква R2_* по-долу
```

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

PDF-ата винаги се сервират през защитен backend endpoint (проверка на собственост/роля) — никога директно публично от R2.

---

## 🖼️ Как изглежда

**PDF билет** — бял фон (разпечатва се евтино и четливо), брандова акцентна лента, карта с детайли, голям QR код:

```
┌──────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← брандова лента
│ 🎟 Билети                ЕЛЕКТРОНЕН БИЛЕТ │
│ ──────────────────────────────────────── │
│ Демо концерт — Билети Live                │
│ Голяма зала · 14 август 2026 в 20:00      │
│ ┌────────────────────────────────────┐   │
│ │ РЕД        А    МЯСТО         6    │   │
│ │ ТИП       VIP   ЦЕНА     60.00 лв. │   │
│ │ ПРИТЕЖАТЕЛ      Иван Иванов         │   │
│ └────────────────────────────────────┘   │
│              [ QR КОД ]                   │
└──────────────────────────────────────────┘
```

**Имейли** — тъмна "glass" тема, консистентна за verification/reset/purchase/refund.

---

## 🎛️ Админ табло

Едно администраторско ниво (`ADMIN`) — без отделно "super admin", всеки админ може:

- да управлява зали, събития, поръчки, refund-и
- да сканира билети
- да създава/деактивира други администраторски акаунти
  (с една защита: не можеш да деактивираш собствения си акаунт)

---

## 📁 Структура

```
bileti/
├── apps/
│   ├── server/     Express API — модулна архитектура (routes → service → repository)
│   │   └── src/modules/   auth · venues · events · reservations · orders ·
│   │                       tickets · scanner · queue · admin · realtime · email · storage
│   └── web/        React + Vite + Tailwind, обслужва се от Express в production
├── database/migrations/   SQL, прилагани последователно и идемпотентно
├── docs/ROADMAP.md        история на фазовата разработка
└── docker-compose.yml     локален MySQL
```

---

## ⚙️ Настройка стъпка по стъпка

<details>
<summary><strong>1. Изисквания</strong></summary>

- Node.js 20+
- Docker + Docker Compose (за локален MySQL)

</details>

<details>
<summary><strong>2. Environment variables</strong></summary>

```bash
cp .env.example .env
openssl rand -hex 32   # → SESSION_SECRET
```

Всичко останало (Stripe, R2, Resend) е опционално за локална разработка — виж коментарите в `.env.example`.

</details>

<details>
<summary><strong>3. База данни</strong></summary>

```bash
docker compose up -d mysql
npm run migrate
npm run seed   # само за development — демо акаунти + зала + публикувано събитие
```

`npm run seed` отказва да се изпълни при `NODE_ENV=production` (пази те от demo пароли на реален сървър). За реален първи администраторски акаунт:

```bash
npm run create-admin --workspace=apps/server -- \
  --username=admin --email=admin@yourdomain.com --password='ИзбериСигурнаПарола123!'
```

Работи безопасно във всякакъв `NODE_ENV`, отхвърля дублиращ се email/username, паролата се хешира както при обикновена регистрация.

</details>

<details>
<summary><strong>4. Стартиране</strong></summary>

Production-стил (едно приложение, препоръчително по подразбиране):

```bash
npm run build
npm start
```

Разработка с hot-reload (два процеса зад кулисите, но една команда):

```bash
npm run dev
```

</details>

<details>
<summary><strong>5. Resend (email)</strong></summary>

1. Акаунт в [resend.com](https://resend.com)
2. Верифицирай sending domain
3. `RESEND_API_KEY` + `RESEND_FROM_EMAIL="Билети <tickets@yourdomain.com>"` в `.env`

Без `RESEND_API_KEY` системата само логва имейла вместо да го изпраща — удобно за разработка.

</details>

<details>
<summary><strong>6. Cloudflare R2 (по избор)</strong></summary>

1. Cloudflare Dashboard → R2 → нов **private** bucket
2. Account → R2 → Manage API Tokens → нов token (само за този bucket)
3. `.env`: `R2_ENABLED=true` + `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`

</details>

<details>
<summary><strong>7. Production deployment</strong></summary>

- `NODE_ENV=production`
- `npm run build && npm start` — сервира API + фронтенд на един порт
- HTTPS задължителен (session cookie-тата стават `secure` автоматично)
- Всички secrets само през environment variables на хостинг платформата

</details>

---

## 🗺️ Known trade-offs (прозрачност)

- **Плащане**: фиктивно вместо Stripe (виж по-горе) — умишлено, лесно за upgrade
- **Queue**: in-memory на един Node процес — достатъчно за десетки едновременни потребители; за multi-instance трябва споделено хранилище (Redis)
- **PDF генериране**: чист PDFKit (vector drawing), не headless browser — по-лек setup, без Chromium/Puppeteer зависимост
- **QR сканиране от камера**: нативен браузърен `BarcodeDetector` API (Chrome/Android); ръчно въвеждане като fallback навсякъде другаде
- Автоматизирани тестове и финален формален security review — виж `docs/ROADMAP.md`

---

<div align="center">

Направено с 🎟️ и много кирилица.

</div>
