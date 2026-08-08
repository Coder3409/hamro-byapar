# Hamro Byapar

**Hamro Byapar — व्यापार बुझौं | व्यवसाय बढाऔं**

A bilingual, offline-first business intelligence assistant designed for small shops and local businesses in Nepal.

## Highlights

- English and Nepali interface with locally persisted language preference
- Live sales dashboard, sales history, inventory alerts, and product management
- Automatic low-stock and out-of-stock email alerts with duplicate prevention
- Persistent notification bell with unread count and email-delivery status
- Three-tap quick-sale flow with instant stock and profit updates
- Hamro Voice for confirmed English, Nepali, Romanized Nepali, and mixed-language sales
- Permission-aware browser speech recognition with live transcripts and a local manual fallback
- IndexedDB storage with a LocalStorage fallback
- Responsive desktop and mobile UI plus an installable offline PWA shell

## Run locally

Install dependencies and create your private environment file:

```powershell
npm install
Copy-Item .env.example .env
```

Start the email backend in one terminal:

```powershell
npm run dev:server
```

Start the Vite app in another terminal:

```powershell
npm run dev
```

Vite proxies `/api` requests to `http://127.0.0.1:4175`. The business app still records sales and updates inventory if the backend or internet is unavailable; the notification records the email attempt as failed.

## Gmail email setup

Email credentials are read only by the Node backend. Never put them in a `VITE_` variable or commit `.env`.

1. Sign in to the Gmail account that will send alerts (for example, `hbyapar@gmail.com`).
2. Enable Google 2-Step Verification for that account.
3. Open Google Account → Security → App passwords.
4. Create an App Password named `Hamro Byapar` and copy the generated 16-character value.
5. Complete `.env`:

```dotenv
EMAIL_USER=hbyapar@gmail.com
EMAIL_APP_PASSWORD=your_google_app_password
ALERT_EMAIL=hbyapar@gmail.com
EMAIL_SERVER_PORT=4175
APP_ORIGIN=http://localhost:4173,http://localhost:4174
APP_URL=http://localhost:4173
```

Use a Google App Password, not the normal Gmail password. `.env` and `.env.*` are ignored by Git; `.env.example` contains names only.

Verify the backend and send one manual test email:

```powershell
Invoke-RestMethod http://127.0.0.1:4175/api/health
npm run email:test
```

## Alert behavior

- `stock === 0` creates an out-of-stock alert.
- `stock <= lowStock` creates a low-stock alert.
- A product sends only once while it remains in the same alert state.
- Moving from low stock to zero creates the more urgent out-of-stock alert.
- Restocking above the threshold resolves the active alert and resets the cycle.
- Sales, Hamro Voice sales/undo, new products, and manual stock or threshold edits use the same central evaluator.
- In-app notification state is saved with the existing IndexedDB/LocalStorage business state.

The backend also deduplicates a repeated alert ID during its process lifetime. Because Hamro Byapar currently has no server database, alert history and state are per browser/device. Global cross-device deduplication would require shared server-side persistence.

## Production deployment

Deploy the frontend and Node email service together or route `/api/alerts/stock` to the Node service. Set `APP_ORIGIN` to the exact deployed frontend origin and `APP_URL` to the public application URL. Store `EMAIL_USER` and `EMAIL_APP_PASSWORD` in the hosting provider's encrypted environment settings.

## Checks

```powershell
npm test
npm run build
```

## Brand asset

The supplied official logo is stored at `public/assets/hamro-byapar-logo.jpeg`. The exact official slogan used throughout the app is:

> **व्यापार बुझौं | व्यवसाय बढाऔं**
