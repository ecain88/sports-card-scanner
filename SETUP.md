# Sports Card Scanner — Setup Guide

## What you need (all free tiers available)

| Service | Purpose | Cost |
|---------|---------|------|
| [Supabase](https://supabase.com) | Auth + Database + File Storage | Free |
| [OpenAI](https://platform.openai.com) | GPT-4o Vision — card recognition | Pay-per-use |
| [eBay Developer](https://developer.ebay.com) | Completed sales data | Free |
| [Expo](https://expo.dev) | Build + distribute the mobile app | Free |

---

## Step 1 — Supabase

1. Go to https://supabase.com → **New Project**
2. Copy your **Project URL** and **anon public key** from Settings → API
3. In the SQL Editor, paste and run `supabase/migrations/001_initial_schema.sql`
4. In Authentication → Settings:
   - Enable **Email confirmations** (required)
   - Set Site URL to `cardscanner://` (deep link for mobile)

---

## Step 2 — OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Add $5–10 in credits (each card scan costs ~$0.01–0.03)

---

## Step 3 — eBay Developer Account

1. Go to https://developer.ebay.com → Sign in → **Create App**
2. Get your **App ID (Client ID)** from My Account → Application Keys
3. Use the **Production** key (Sandbox won't return real sold data)

---

## Step 4 — Backend Setup

```bash
cd sports-card-scanner/backend
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=3001
OPENAI_API_KEY=sk-your-key-here
EBAY_APP_ID=YourEbayAppID
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Start the backend:
```bash
npm run dev
```

For production, deploy to **Railway**, **Render**, or **Fly.io** (all have free tiers).

---

## Step 5 — Mobile App Setup

```bash
cd sports-card-scanner/mobile
npm install
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
EXPO_PUBLIC_API_URL=http://YOUR-COMPUTER-IP:3001
```

> **Important**: Use your computer's local IP (e.g. `192.168.1.5`), not `localhost`,
> when testing on a physical phone. Run `ipconfig` (Windows) to find your IP.

---

## Step 6 — Run on your phone

```bash
cd mobile
npm start
```

1. Install **Expo Go** on your iPhone or Android
2. Scan the QR code that appears in the terminal
3. The app will load on your phone

---

## Step 7 — Build for App Stores (optional)

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # or android
eas submit --platform ios     # submit to App Store
```

---

## App Flow

```
Register → Email verification → Sign in
    ↓
Scan Tab → Take photo / Choose from library
    ↓
GPT-4o identifies: player, year, brand, set, card #, variation
    ↓
eBay API fetches last 20 completed sales
    ↓
Display: avg price, low, high + individual listings
    ↓
Save to Collection → view anytime, refresh sales data
```

---

## Pricing Estimates

- **100 card scans/month**: ~$0.30–$3.00 (OpenAI)
- **eBay API**: Free, 5,000 calls/day
- **Supabase**: Free up to 50,000 rows, 1GB storage
- **Backend hosting**: Free on Railway/Render starter plans
