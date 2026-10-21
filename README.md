# MTGO Collection Price Tracker & Trend Analyzer 🃏📈

A modern full-stack web application designed to automatically track the value in **Event Tickets (TIX)** of your **Magic The Gathering Online (MTGO)** card collection, monitor price history, calculate Profit & Loss (P&L) against Time 0 baseline, track cost basis & realized sales profits, and highlight real-time **Trading Signals (Buy / Sell / Take Profit)**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Vite](https://img.shields.io/badge/vite-6-purple.svg)
![Docker Ready](https://img.shields.io/badge/docker-ready-cyan.svg)

---

## 🌟 Key Features

- 📤 **Drag-and-Drop `.dek` Upload**: Upload or update your MTGO collection file directly in the web UI with automatic Time 0 baseline reset.
- 🏷️ **Custom Purchase Price Basis (Cost Basis)**: Input custom unit buy costs in TIX for any card to track exact **Unrealized P&L (% and TIX)** against your actual investment cost.
- 💰 **Card Sale Tracking & Realized P&L**: Record card sales with quantity sold and unit sell price. Sold quantities are automatically excluded from your active portfolio, while calculating your **Total Realized Profit (TIX)**. A newly uploaded `.dek` is assumed to already reflect earlier sales, so only sales recorded after the upload are subtracted from its cards (manually added cards keep subtracting every sale).
- 📜 **Dedicated "Sold / Transactions" Ledger Tab**: View all completed card sales with sale dates, unit buy/sell prices, net realized gain/loss, and 1-click **Undo Sale** transaction restore.
- ➕ **Manual Card Additions**: Add new MTGO cards directly inside the web UI by CatID or Card Name without requiring `.dek` file re-exports.
- 🏷️ **Purchase Price Benchmark (`🏷️ Prezzo d'Acquisto`)**: Dedicated benchmark filter to analyze gain/loss percentage exclusively for cards with a set purchase price.
- ⚡ **Native GoatBots Daily Price Integration**: Direct integration with **GoatBots Market** by fetching and unzipping their official daily price archive (`price-history.zip`) updated every day at 5:30 AM CET, backed by smart HTTP `HEAD` revalidation (`Last-Modified`) to avoid redundant downloads.
- 📱 **Responsive Mobile & iPad Design**: Optimized UI layout for smartphones (< 640px) and tablets (< 1024px) with compact 2-column card grids and touch-friendly controls.
- 🎯 **Global `VALUE ≥ 1 TIX` Toggle Filter**: Exclude low-value/penny cards across all views, gainers/losers lists, and KPI summary counters with a single click.
- ⚡ **Scryfall & Vendor Multi-Source Pricing**: Native support for **Scryfall API** (official MTGO TIX prices and high-res artwork) and **GoatBots Market**.
- ⏱️ **Automatic Schedulable Price Check**: Background scheduler with customizable intervals (e.g. every 15m, 30m, 1h, 6h, 24h) or manual *"Sync Now"*.
- 🚀 **Time 0 Baseline & P&L Tracking**: Tracks portfolio growth and individual card performance relative to the **Time 0 initial import**.
- 💰 **Trading Decision Signals**:
  - **`💰 SELL (Take Profit)`**: Highlights cards with significant price gains ($\ge +35\%$ or $+0.75\text{ TIX}$) recommending when to sell on bot vendors.
  - **`⚠️ NEAR ALL-TIME HIGH`**: Highlights cards trading within 5% of their peak recorded price.
  - **`📉 HIGH LOSS ALERT`**: Warns when a card has dropped significantly from Time 0.
- 📊 **Interactive Portfolio History Chart**: Monitor total portfolio value over time with **click-to-delete snapshot management** to remove unwanted data points directly from the chart.
- 🔗 **3-Tier Card Resolution Engine**:
  - *Tier 0*: Custom Scryfall URL overrides with rate-limiting protection.
  - *Tier 1*: MTGO Catalog ID (`CatID`) batch lookup.
  - *Tier 2*: Automatic card name fallback for MTGO digital variants & promos (including Double-Faced Cards / DFC).
  - *Tier 3*: Default stub for unmapped entries.
- 🧩 **Resilient `.dek` XML Parser**: Order-independent XML tag attribute parser with XML entity unescaping (`&amp;`, `&lt;`, `&gt;`).
- 🔒 **Atomic Data Storage**: Safe JSON filesystem persistence (`writeJsonAtomic`) via temporary file swap to prevent data corruption during unexpected shutdowns.
- 🌐 **Multi-Language Support**: **English (Default)** and **Italian**, toggleable with 1-click in the UI and persisted in settings.
- 💾 **1-Click CSV Export**: Export your complete valued collection report with language-aware column headers, metadata, P&L, purchase cost, and trading signals.
- 🐳 **Docker & Docker Compose Ready**: Plug-and-play deployment on any operating system (including Raspberry Pi 64-bit).
  
<img width="1902" height="906" alt="image" src="https://github.com/user-attachments/assets/5851f1de-e6ac-4bb1-b751-5b3233c829fd" />

<img width="1902" height="908" alt="image" src="https://github.com/user-attachments/assets/18b9da58-edfd-4d81-8db4-a659c57a8b73" />

<img width="1903" height="911" alt="image" src="https://github.com/user-attachments/assets/039f75f2-cdb4-46ff-a267-895faa4a5215" />

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

- **Backend**: Node.js, Express, Axios.
- **Frontend**: React 18, Vite 6, Chart.js, Lucide Icons, Vanilla CSS (MTGO Dark & Glassmorphism Design System).
- **APIs & Data**: Scryfall API (`mtgo_id` collection & named search endpoints), GoatBots Daily Price Archives (`price-history.zip`).

---

## 📄 License

Released under the MIT License.
