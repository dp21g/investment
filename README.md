# 🚀 Monthly Investment Strategy Analyzer

A powerful **Next.js Web Application** for simulating and comparing different monthly investment timing strategies across multiple years.

![App Screenshot](https://via.placeholder.com/800x400?text=Strategy+Analyzer+Dashboard) *(Replace with actual screenshot)*

## 📋 What This Does

This tool allows you to backtest 4 core investment strategies using **real historical market data** (via Yahoo Finance) to determine the best day of the month to invest your money.

### Supported Strategies
1.  **DCA (Dollar Cost Averaging):** Buy on the 1st of every month (or first trading day).
2.  **RSI < 40:** Buy when the Relative Strength Index (14) drops below 40 (Oversold).
3.  **Below 20-EMA:** Buy when price drops below the 20-day Exponential Moving Average.
4.  **FVG (Fair Value Gap):** Buy when price enters a bullish Fair Value Gap order block.

### Key Features
*   **Real-time Data:** Syncs daily OHLCV data from Yahoo Finance.
*   **Interactive Charts:** Zoomable/Scrollable TradingView charts (using `lightweight-charts`).
*   **Yearly Comparison:** Compare your strategy's isolated annual return vs. a simple "Buy & Hold" (Market) return for each year.
*   **Visual Buy Markers:** See exactly when buys occurred on the chart.
*   **Dark Mode UI:** Premium, responsive design built with Tailwind CSS.

## 🛠️ Tech Stack

*   **Framework:** Next.js 16 (App Router, Turbopack)
*   **Language:** TypeScript
*   **Database:** SQLite (via Prisma ORM)
*   **Styling:** Tailwind CSS
*   **Charts:** TradingView Lightweight Charts
*   **Data Source:** Yahoo Finance (`yahoo-finance2`)

## 🚀 Quick Start

### Prerequisites
*   Node.js 18+
*   npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/dp21g/investment.git
    cd investment
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Initialize Database:**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

### Running the App

1.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

2.  **Sync Market Data:**
    You can sync data directly from the UI or run the CLI command:
    ```bash
    # Sync specific tickers (e.g., SPY, QQQ) starting from 2015
    npm run sync SPY QQQ
    ```

## 📊 How IT Works

1.  **Select a Ticker:** Choose from synchronized assets (e.g., QQQ, VOO, SPY).
2.  **Set Parameters:** Choose your Simulation Range (e.g., 2015-2025) and Monthly Investment Amount.
3.  **Analyze:** The engine simulates investing that amount every month based on the strategy rules.
4.  **Compare:**
    *   **Net Profit:** Total gain over the period.
    *   **Strategy Return:** Your personal return on invested capital.
    *   **Vs Market:** Compare against buying and holding the asset for the same year.

## 📉 Local Futures Analysis (New)

A dedicated module for analyzing intraday price action on **Futures (NQ, ES)** using a high-frequency (5m/20m) local database.

### Features
*   **Inside Candle Monitor:** Identifies 20m candles that are "Inside" (High < PrevHigh && Low > PrevLow).
*   **Breach Detection:** Monitors subsequent 5m candles to detect when the Inside Candle's range is breached (High or Low).
*   **Local Postgres:** Uses a Dockerized local Postgres instance to store millions of candle rows without Vercel limits.

### Setup for Local Analysis
1.  **Start Local DB:**
    ```bash
    docker-compose up -d
    ```
2.  **Seed Futures Data:**
    ```bash
    npm run download:futures
    ```
    *Note: The script now supports **incremental fetching**. It check the database for existing data and only downloads new candles to save time.*

3.  **View Analysis:**
    Navigate to the "Local" tab in the application.

## 📄 License

This project is for **educational purposes only**. Past performance is not indicative of future results. Not financial advice.
