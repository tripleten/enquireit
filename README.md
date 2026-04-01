# Enquiry Modal — Shopify App

A Shopify app that lets shoppers submit product enquiries from any page on your storefront. Built with Remix, Polaris, and a Theme App Extension.

## Features

- Floating enquiry modal triggered by `data-enquiry-trigger` on any element
- Product autocomplete using Shopify's native search API
- Pre-fill and lock product field from the trigger attribute
- Email notifications via configurable SMTP settings
- Conversion tracking with configurable GTag / analytics code
- Full enquiries management dashboard in the Shopify admin

---

## Prerequisites

- Node.js 18.20.0 or later
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli) (`npm install -g @shopify/cli`)
- A [Shopify Partners account](https://partners.shopify.com/)
- A development store

---

## Setup

### 1. Create a Shopify Partner Account and App

1. Go to [partners.shopify.com](https://partners.shopify.com/) and sign up or log in.
2. Navigate to **Apps** → **Create app** → **Create app manually**.
3. Give your app a name (e.g. "Enquiry Modal").
4. Note the **API key** and **API secret key** from the app credentials page.

### 2. Clone and Install Dependencies

```bash
git clone <your-repo>
cd shopify-app
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-ngrok-or-deployed-url.example.com
SCOPES=read_products
DATABASE_URL="file:./dev.db"
```

### 4. Set Up the Database

```bash
npx prisma migrate dev --name init
```

This creates the SQLite database at `prisma/dev.db` with all required tables.

### 5. Run Locally

```bash
shopify app dev
```

The Shopify CLI will:
- Start the Remix dev server
- Create an ngrok tunnel
- Update your app's redirect URLs automatically
- Open a browser for you to install the app on your dev store

---

## App Structure

```
shopify-app/
├── app/
│   ├── routes/
│   │   ├── app.tsx                    # Layout with App Bridge + NavMenu
│   │   ├── app._index.tsx             # Dashboard
│   │   ├── app.enquiries.tsx          # Enquiries list
│   │   ├── app.settings.tsx           # Settings form
│   │   ├── api.enquiry.tsx            # Public POST: save enquiry + send email
│   │   └── api.public.settings.tsx   # Public GET: return gtag config
│   ├── db.server.ts                   # Prisma client singleton
│   ├── shopify.server.ts              # Shopify auth configuration
│   └── root.tsx                       # Remix root with Polaris provider
├── extensions/
│   └── enquiry-modal/
│       ├── assets/
│       │   ├── enquiry-modal.css      # Modal styles
│       │   └── enquiry-modal.js       # Modal logic (vanilla JS)
│       ├── blocks/
│       │   └── app-embed.liquid       # Theme app embed block
│       └── shopify.extension.toml
├── prisma/
│   └── schema.prisma
├── shopify.app.toml
└── vite.config.ts
```

---

## Adding the Enquiry Button to Your Theme

After installing and enabling the Theme App Extension in your theme editor:

### Option 1: Any product enquiry button

Add `data-enquiry-trigger` to any element — button, link, div, etc.:

```html
<button data-enquiry-trigger>Ask a Question</button>
```

### Option 2: Pre-fill a specific product

```html
<button data-enquiry-trigger="my-product-handle">Enquire About This Product</button>
```

Replace `my-product-handle` with the product's URL handle (the part after `/products/` in the URL).

### Option 3: Via JavaScript

```javascript
// Open modal (empty)
window.EnquiryModal.open();

// Open modal pre-filled with a product
window.EnquiryModal.open('my-product-handle');
```

---

## Configuring Settings

In the Shopify admin, navigate to **Apps** → **Enquiry Modal** → **Settings**:

- **Notification Email**: Where enquiry emails are sent
- **SMTP Settings**: Your email server credentials
  - Gmail: `smtp.gmail.com`, port `587`, with an [App Password](https://support.google.com/accounts/answer/185833)
  - SendGrid: `smtp.sendgrid.net`, port `587`, user `apikey`
- **GTag Code**: Raw JavaScript to fire on successful submission, e.g.:

```javascript
gtag('event', 'enquiry_submitted', {
  event_category: 'engagement',
  event_label: 'product_enquiry'
});
```

---

## Deploying to Production

### Deploy with Fly.io

```bash
# Install Fly CLI
brew install flyctl

# Login and create app
fly auth login
fly launch

# Set environment variables
fly secrets set SHOPIFY_API_KEY=xxx
fly secrets set SHOPIFY_API_SECRET=xxx
fly secrets set SHOPIFY_APP_URL=https://your-app.fly.dev
fly secrets set DATABASE_URL="file:./prisma/dev.db"

# Deploy
fly deploy
```

### Deploy with Railway

1. Connect your GitHub repo at [railway.app](https://railway.app)
2. Add a SQLite volume or switch to PostgreSQL
3. Set environment variables in the Railway dashboard
4. Deploy

### Update shopify.app.toml

After deployment, update `shopify.app.toml` with your production URL:

```toml
application_url = "https://your-production-app.example.com"

[auth]
redirect_urls = [
  "https://your-production-app.example.com/auth/callback",
  "https://your-production-app.example.com/auth/shopify/callback"
]
```

Then push to Shopify:

```bash
shopify app deploy
```

---

## Database

The app uses **SQLite** in development. For production, consider switching to PostgreSQL by updating `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Run migrations after changing the provider:

```bash
npx prisma migrate deploy
```

---

## API Endpoints

### POST `/api/enquiry`

Public endpoint (no auth). Accepts JSON:

```json
{
  "shop": "your-store.myshopify.com",
  "productHandle": "my-product",
  "productTitle": "My Product",
  "quantity": 2,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+61 400 000 000",
  "comments": "I would like to know more about..."
}
```

Returns:

```json
{ "success": true, "enquiryId": "clxxx..." }
```

### GET `/api/public/settings?shop=your-store.myshopify.com`

Public endpoint. Returns:

```json
{ "gtagCode": "gtag('event', 'enquiry_submitted', {...});" }
```

---

## Tech Stack

- **[Remix](https://remix.run/)** — Full-stack React framework
- **[@shopify/shopify-app-remix](https://github.com/Shopify/shopify-app-js)** — Shopify auth + session management
- **[@shopify/polaris](https://polaris.shopify.com/)** — Shopify admin UI components
- **[Prisma](https://www.prisma.io/)** — Database ORM
- **[Nodemailer](https://nodemailer.com/)** — Email sending
- **Vanilla JS** — No-framework storefront modal
