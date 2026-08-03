# MTGO Collection Price Tracker & Trend Analyzer 🃏📈

A modern full-stack web application designed to automatically track the value in **Event Tickets (TIX)** of your **Magic The Gathering Online (MTGO)** card collection, monitor price history, calculate Profit & Loss (P&L) against Time 0 baseline, and highlight real-time **Trading Signals (Buy / Sell / Take Profit)**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Vite](https://img.shields.io/badge/vite-6-purple.svg)
![Docker Ready](https://img.shields.io/badge/docker-ready-cyan.svg)

---

## 🌟 Key Features

- 📤 **Drag-and-Drop `.dek` Upload**: Upload or update your MTGO collection file directly in the web UI.
- ⚡ **Dedicated MTGO Price Sources**: Native integration with **Scryfall API** (official MTGO TIX prices and high-res artwork) and price estimation for **GoatBots Market** and **Cardhoarder**.
- ⏱️ **Automatic Schedulable Price Check**: Background scheduler with customizable intervals (e.g. every 15m, 30m, 1h, 6h, 24h) or manual *"Sync Now"*.
- 🚀 **Time 0 Baseline & P&L Tracking**: Tracks portfolio growth and individual card performance relative to the **Time 0 initial import**.
- 💰 **Trading Decision Signals**:
  - **`💰 SELL (Take Profit)`**: Highlights cards with significant price gains ($\ge +35\%$ or $+0.75\text{ TIX}$) recommending when to sell on bot vendors.
  - **`⚠️ NEAR ALL-TIME HIGH`**: Highlights cards trading within 5% of their peak recorded price.
  - **`📉 HIGH LOSS ALERT`**: Warns when a card has dropped significantly from Time 0.
- 📊 **Interactive Portfolio History Chart**: Monitor total portfolio value over time with **click-to-delete snapshot management** to remove unwanted data points directly from the chart.
- 🔗 **3-Tier Card Resolution Engine**:
  - *Tier 1*: MTGO Catalog ID (`CatID`) batch lookup.
  - *Tier 2*: Automatic card name fallback for MTGO digital variants & promos (including Double-Faced Cards / DFC).
  - *Tier 3*: Manual Scryfall URL link override to attach any specific printing URL directly from the card detail modal.
- 🌐 **Multi-Language Support**: **English (Default)** and **Italian**, toggleable with 1-click in the UI and persisted in settings.
- 💾 **1-Click CSV Export**: Export your complete valued collection report with all metadata, P&L, and trading signals.
- 🐳 **Docker & Docker Compose Ready**: Plug-and-play deployment on any operating system.
  
<img width="1900" height="903" alt="image" src="https://github.com/user-attachments/assets/dd12c673-d773-4f40-9a88-0b5a6858134a" />

<img width="1903" height="905" alt="image" src="https://github.com/user-attachments/assets/b7e2f41b-5482-4f3e-8599-2d88a7ac6307" />

<img width="1903" height="906" alt="image" src="https://github.com/user-attachments/assets/45cacd6b-afe8-41b7-91a6-a2101734ff1a" />

---

## 💡 How to Export Your Collection from MTGO

1. Open the official **Magic The Gathering Online (MTGO)** client.
2. Go to the **Collection** tab.
3. Right-click inside your cards list on the bottom left and click **Select All**.
4. Click **Export** on the bottom right and save as **DEK File (.dek)**.
5. Drag and drop the `.dek` file into MTGO Card Tracker!

---

## 🚀 Quick Start Guide

### Option A: Running with Node.js (Local)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/mtgo-collection-tracker.git
   cd mtgo-collection-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build frontend and start server**:
   ```bash
   npm run build
   npm start
   ```

4. Open your browser at [http://localhost:3001](http://localhost:3001).

---

### Option B: Running with Docker (Recommended)

No local Node.js installation required. Run:

```bash
docker-compose up -d
```

Access the app at [http://localhost:3001](http://localhost:3001).

---

## 🛠️ Built With

- **Backend**: Node.js, Express, Axios, `xml2js`, `node-cron`.
- **Frontend**: React 18, Vite 6, Chart.js, Lucide Icons, Vanilla CSS (MTGO Dark & Glassmorphism Design System).
- **APIs & Data**: Scryfall API (`mtgo_id` collection & named search endpoints), GoatBots, Cardhoarder.

---

## 📄 License

Released under the MIT License.
