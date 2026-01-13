-- CreateTable
CREATE TABLE "Candle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticker" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" BIGINT NOT NULL,
    "rsi" REAL,
    "ema20" REAL,
    "macd" REAL,
    "macdSignal" REAL,
    "macdHistogram" REAL
);

-- CreateIndex
CREATE INDEX "Candle_ticker_date_idx" ON "Candle"("ticker", "date");

-- CreateIndex
CREATE INDEX "Candle_rsi_idx" ON "Candle"("rsi");

-- CreateIndex
CREATE UNIQUE INDEX "Candle_ticker_date_key" ON "Candle"("ticker", "date");
