# MTGO Collection Price Tracker & Trend Analyzer 🃏📈

Un'applicazione web modernissima e full-stack ideata per tracciare automaticamente il valore in **Event Tickets (TIX)** della tua collezione di carte **Magic The Gathering Online (MTGO)**, monitorare lo storico dei prezzi ed evidenziare in tempo reale le carte in rialzo (**Gainers**) e in ribasso (**Losers**).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Vite](https://img.shields.io/badge/vite-6-purple.svg)
![Docker Ready](https://img.shields.io/badge/docker-ready-cyan.svg)

---

## 🌟 Caratteristiche Principali

- 📤 **Upload Drag-and-Drop `.dek`**: Carica o aggiorna direttamente nell'interfaccia web il file della tua collezione esportato da MTGO.
- ⚡ **Fonti Prezzi MTGO Dedicate**: Collegato nativamente con le **Scryfall API** (prezzi TIX ufficiali e immagini ad alta risoluzione) e integrazione con **GoatBots** e **Cardhoarder**.
- ⏱️ **Schedulazione Automatica**: Scheduler in background con intervalli programmabili (es. ogni 15 min, 30 min, 1 ora, 6 ore, 24 ore) o pulsante *"Aggiorna Ora"*.
- 📈 **Highlights Gainers & Losers**: 
  - **Badge Neon Green**: evidenziano istantaneamente le carte che stanno crescendo di valore ($\Delta\%$ e $\Delta \text{TIX}$).
  - **Badge Crimson Red**: evidenziano le carte in calo di prezzo.
- 📊 **Grafici Storici del Portafoglio**: Monitora l'andamento del valore totale della collezione nel tempo grazie ai grafici interattivi con Chart.js.
- 🔍 **Filtri & Ricerca Avanzata**: Filtra al volo per Gainers, Losers, Carte di valore $\ge 1 \text{ TIX}$, o effettua ricerche per nome/set.
- 💾 **Esportazione Report CSV**: Esporta con 1-click la tua collezione completa valutata con tutti i metadati ed il trend di mercato.
- 🐳 **Docker & Docker Compose Ready**: Pronto per essere distribuito ed avviato in 1 secondo su qualsiasi sistema operativo.

---

## 💡 Come esportare la tua Collezione da MTGO

1. Apri il client ufficiale di **Magic The Gathering Online (MTGO)**.
2. Vai nella scheda **Collection**.
3. Fai clic con il tasto destro all'interno dell'elenco delle tue carte e seleziona **Select All**.
4. Fai clic sul pulsante **Export** in basso e salva il file selezionando la voce **DEK File (.dek)**.
5. Carica il file `.dek` nell'applicazione tramite l'interfaccia web!

---

## 🚀 Guida all'Installazione & Avvio

### Opzione A: Avvio con Node.js (Locale)

1. **Clona il repository**:
   ```bash
   git clone https://github.com/your-username/mtgo-collection-tracker.git
   cd mtgo-collection-tracker
   ```

2. **Installa le dipendenze**:
   ```bash
   npm install
   ```

3. **Compila il frontend e avvia il server**:
   ```bash
   npm run build
   npm start
   ```

4. Apri il tuo browser su [http://localhost:3001](http://localhost:3001).

---

### Opzione B: Avvio con Docker (Raccomandato)

Non richiede l'installazione locale di Node.js. È sufficiente avere Docker e Docker Compose installati:

```bash
docker-compose up -d
```

L'applicazione sarà disponibile su [http://localhost:3001](http://localhost:3001).

---

## 🛠️ Tecnologie Utilizzate

- **Backend**: Node.js, Express, Axios, `xml2js`, `node-cron`.
- **Frontend**: React 18, Vite 6, Chart.js, Lucide Icons, Vanilla CSS (Design System personalizzato MTGO Dark & Glassmorphism).
- **APIs & Data**: Scryfall API (MTGO `mtgo_id` collection endpoints), GoatBots, Cardhoarder.

---

## 📄 Licenza

Rilasciato sotto licenza MIT.
