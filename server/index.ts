import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import syncRouter from './routes/sync.js';
import simulateRouter from './routes/simulate.js';
import queryRouter from './routes/query.js';
import tickersRouter from './routes/tickers.js';
import strategiesRouter from './routes/strategies.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/sync', syncRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/query', queryRouter);
app.use('/api/tickers', tickersRouter);
app.use('/api/strategies', strategiesRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Only listen locally. Vercel handles this automatically for serverless functions.
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;
