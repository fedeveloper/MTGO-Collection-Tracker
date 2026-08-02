export const translations = {
  en: {
    // Brand & Header
    brandTitle: "MTGO Card Tracker",
    brandSubtitle: "Collection Price & Trend Analyzer",
    lastSync: "Last sync:",
    never: "Never",
    uploadDek: "Upload .dek",
    exportCsv: "Export CSV",
    scheduler: "Scheduler",
    syncNow: "Sync Now",
    updating: "Updating...",
    
    // Stats
    totalValue: "Total Collection Value",
    uniqueCards: "Unique Cards",
    totalCards: "total",
    gainersCount: "Price Gainers",
    losersCount: "Price Losers",
    bestGainer: "Best",
    worstLoser: "Worst",
    noGainers: "No price increases",
    noLosers: "No price drops",

    // Portfolio Chart
    chartTitle: "Collection Value Over Time",
    savedSnapshots: "Saved snapshots:",
    chartPlaceholder: "Historical portfolio data will appear after scheduled price checks.",

    // Filters & Sorting
    allCards: "All Cards",
    gainersTab: "Gainers",
    losersTab: "Losers",
    valuableTab: "Value ≥ 1 TIX",
    searchPlaceholder: "Search card or set...",
    sortPriceDesc: "Price: High to Low",
    sortPriceAsc: "Price: Low to High",
    sortGainers: "Top Gainers (+%)",
    sortLosers: "Top Losers (-%)",
    sortQuantity: "Quantity Owned",
    sortName: "Name (A-Z)",
    emptyFilter: "No cards match the current filters.",
    resetFilters: "Reset Filters",

    // Table
    thCard: "Card",
    thCatId: "CatID",
    thSet: "Set",
    thQuantity: "Quantity",
    thPriceTix: "Unit Price (TIX)",
    thTotalValue: "Total Value",
    thMovement: "Price Movement",
    badgeStable: "Stable",

    // Card Detail Modal
    currentPrice: "Current Price (TIX)",
    lastCheckChange: "Change Since Last Check",
    quantityOwned: "Quantity Owned",
    collectionValue: "Collection Value",

    // Scheduler Modal
    schedulerTitle: "Scheduler & Settings",
    schedulerSubtitle: "Configure automatic MTGO price check interval",
    autoSyncTitle: "Automatic Price Check",
    autoSyncSub: "Periodically check MTGO ticket prices",
    updateFrequency: "Update Frequency",
    every15m: "Every 15 minutes (Ultra fast)",
    every30m: "Every 30 minutes",
    every1h: "Every 1 hour (Recommended)",
    every6h: "Every 6 hours",
    every12h: "Every 12 hours",
    every24h: "Every 24 hours (Daily)",
    priceSource: "MTGO Price Source",
    interfaceLanguage: "Interface Language",
    cancel: "Cancel",
    saveSettings: "Save Settings",
    saving: "Saving...",

    // Upload Modal
    uploadTitle: "Upload MTGO Collection",
    uploadSubtitle: "Select or drop your exported Collection.dek file from Magic Online.",
    dropzoneText: "Drag and drop your file here or click to browse",
    supportedFormats: "Supports MTGO .dek or .xml files",
    uploadButton: "Upload & Sync",
    analyzing: "Analyzing...",
    invalidFileError: "Please select a valid .dek or .xml file exported from MTGO.",

    // Onboarding
    welcomeTitle: "Welcome to MTGO Tracker!",
    welcomeSubtitle: "Track your Magic Online card collection value in real time, discover price gainers & losers, and export detailed reports.",
    uploadCollectionBtn: "Upload Your Collection (.dek)",
    howToExport: "💡 How to export your collection from MTGO:",
    step1: "Open Magic The Gathering Online (MTGO) client and go to the Collection tab.",
    step2: "Right-click inside your cards list on the bottom left and click Select All.",
    step3: "Click Export and save the file selecting DEK File (.dek).",
    step4: "Click the button above to upload the exported file into the app!",

    // General
    loadingCollection: "Loading MTGO collection..."
  },
  it: {
    // Brand & Header
    brandTitle: "MTGO Card Tracker",
    brandSubtitle: "Monitoraggio Prezzi Collezione & Trend",
    lastSync: "Ultimo sync:",
    never: "Mai",
    uploadDek: "Carica .dek",
    exportCsv: "Esporta CSV",
    scheduler: "Schedulazione",
    syncNow: "Aggiorna Ora",
    updating: "Aggiornamento...",
    
    // Stats
    totalValue: "Valore Totale Collezione",
    uniqueCards: "Carte Uniche",
    totalCards: "totali",
    gainersCount: "Carte in Salita (Gainers)",
    losersCount: "Carte in Discesa (Losers)",
    bestGainer: "Best",
    worstLoser: "Worst",
    noGainers: "Nessuna variazione in aumento",
    noLosers: "Nessuna variazione in calo",

    // Portfolio Chart
    chartTitle: "Andamento Valore Collezione nel Tempo",
    savedSnapshots: "Snapshots salvati:",
    chartPlaceholder: "I dati storici del portafoglio verranno visualizzati dopo i primi controlli schedulati dei prezzi.",

    // Filters & Sorting
    allCards: "Tutte le carte",
    gainersTab: "In Salita",
    losersTab: "In Discesa",
    valuableTab: "Valore ≥ 1 TIX",
    searchPlaceholder: "Cerca carta o set...",
    sortPriceDesc: "Prezzo: Più Alto",
    sortPriceAsc: "Prezzo: Più Basso",
    sortGainers: "Maggior Rialzo (+%)",
    sortLosers: "Maggior Ribasso (-%)",
    sortQuantity: "Quantità Posseduta",
    sortName: "Nome (A-Z)",
    emptyFilter: "Nessuna carta trovata con i filtri attuali.",
    resetFilters: "Reimposta Filtri",

    // Table
    thCard: "Carta",
    thCatId: "CatID",
    thSet: "Set",
    thQuantity: "Quantità",
    thPriceTix: "Prezzo TIX",
    thTotalValue: "Valore Totale",
    thMovement: "Variazione",
    badgeStable: "Stabile",

    // Card Detail Modal
    currentPrice: "Prezzo Attuale (TIX)",
    lastCheckChange: "Variazione Ultimo Controllo",
    quantityOwned: "Quantità Posseduta",
    collectionValue: "Valore Collezione",

    // Scheduler Modal
    schedulerTitle: "Impostazioni Schedulazione",
    schedulerSubtitle: "Configura l'intervallo automatico di controllo prezzi",
    autoSyncTitle: "Controllo Automatico",
    autoSyncSub: "Aggiorna periodicamente i prezzi MTGO",
    updateFrequency: "Frequenza di Aggiornamento",
    every15m: "Ogni 15 minuti (Ultra rapido)",
    every30m: "Ogni 30 minuti",
    every1h: "Ogni 1 ora (Consigliato)",
    every6h: "Ogni 6 ore",
    every12h: "Ogni 12 ore",
    every24h: "Ogni 24 ore (1 volta al giorno)",
    priceSource: "Fonte Prezzi MTGO",
    interfaceLanguage: "Lingua Interfaccia",
    cancel: "Annulla",
    saveSettings: "Salva Impostazioni",
    saving: "Salvataggio...",

    // Upload Modal
    uploadTitle: "Carica Collezione MTGO",
    uploadSubtitle: "Seleziona o trascina il tuo file Collection.dek esportato da Magic Online.",
    dropzoneText: "Trascina il file qui o clicca per sfogliare",
    supportedFormats: "Supporta file .dek o .xml di MTGO",
    uploadButton: "Carica & Sincronizza",
    analyzing: "Analisi in corso...",
    invalidFileError: "Si prega di selezionare un file .dek o .xml esportato da MTGO.",

    // Onboarding
    welcomeTitle: "Benvenuto in MTGO Tracker!",
    welcomeSubtitle: "Monitora in tempo reale il valore della tua collezione di carte Magic Online, scopri le carte in rialzo ed esporta report dettagliati.",
    uploadCollectionBtn: "Carica la tua Collezione (.dek)",
    howToExport: "💡 Come esportare la collezione da MTGO:",
    step1: "Apri il client di Magic The Gathering Online (MTGO) e vai alla scheda Collection.",
    step2: "In basso a sinistra, fai clic con il tasto destro nell'elenco delle carte e seleziona Select All.",
    step3: "Fai clic su Export e salva il file scegliendo il formato DEK File (.dek).",
    step4: "Fai clic sul pulsante in alto per caricare il file esportato nell'applicazione!",

    // General
    loadingCollection: "Caricamento collezione MTGO in corso..."
  }
};
