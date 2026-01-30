# Changes Log

## Local Database Support & Futures Data
**Date:** 2026-01-17

### Motivation
The user requested a local development environment that does not rely on Vercel's Postgres, specifically for analyzing Futures data (NQ, ES) without polluting the production DB or hitting limits.

### Changes
1.  **Database Schema (`prisma/schema.prisma`)**:
    - Added `Candle20m` model for storing 20-minute aggregated candles.
    - Added `Candle5m` model for storing 5-minute candles (source data).
2.  **Environment**:
    - Introduced support for local Postgres connection string via `.env`.
3.  **Data Seeding (`src/index.ts`, `src/lib/yahoo.ts`)**:
    - Updated fetch logic to retrieve 5m data for NQ/ES.
    - Implemented `aggregate5mTo20m` logic.
    - **Incremental Fetching**: The logic now checks the database for the last stored candle and only fetches new data, preventing redundant API calls and processing.
4.  **Backend API (`server/routes/local.ts`)**:
    - **New Endpoint**: `/api/local/data` to serve filtered candle data.
    - **Logic**: Server-side filtering for "Inside Candles" (current candle within previous candle's range).
5.  **Frontend (`src/App.tsx`, `src/components/LocalView.tsx`)**:
    - **New Tab**: "Local" added to bottom navigation.
    - **New View**: `LocalView` to visualize inside candles and breach monitoring.
    - **Breach Monitor**: Tracks when an inside candle's High/Low is breached by subsequent 5m candles.

### Impacts
-   **Local Development**: Developers can now run a full analysis stack locally with Dockerized Postgres.
-   **Performance**: Incremental fetching significantly speeds up the seeding process on subsequent runs.
-   **Data Content**: Local DB accumulates data over time, maintaining a broader history than the fetch limit.
