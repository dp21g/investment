import React, { useState, useEffect } from 'react';
import ComparisonView from '@/components/ComparisonView';
import QueryView from '@/components/QueryView';
import StrategiesView from '@/components/StrategiesView';
import { Home, Search, BarChart2 } from 'lucide-react';

export default function App() {
    const [mounted, setMounted] = useState(false);
    const [currentView, setCurrentView] = useState<'home' | 'query' | 'strategies'>('home');
    
    // URL State Sync
    useEffect(() => {
        setMounted(true);
        const handlePath = () => {
             const path = window.location.pathname;
             if (path.startsWith('/query')) {
                 setCurrentView('query');
             } else if (path.startsWith('/strategies')) {
                 setCurrentView('strategies');
             } else {
                 setCurrentView('home');
             }
        };

        handlePath();
        window.addEventListener('popstate', handlePath);
        return () => window.removeEventListener('popstate', handlePath);
    }, []);

    const updateView = (view: 'home' | 'query' | 'strategies') => {
        setCurrentView(view);
        if (view === 'home') {
            window.history.pushState({}, '', '/');
        } else if (view === 'query') {
            window.history.pushState({}, '', '/query');
        } else {
            window.history.pushState({}, '', '/strategies');
        }
    };

    const [tickers] = useState(['QQQ', 'VOO', 'VWRL.L', 'SGLN.L', 'SWDA.L']);
    const [selectedTickers, setSelectedTickers] = useState<string[]>(['QQQ', 'VOO', 'VWRL.L', 'SGLN.L', 'SWDA.L']); // Default all on
    
    // ... existing logs/sync state ... 
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
    const [syncing, setSyncing] = useState(false);

    // ... existing handlers ...
    const toggleTicker = (ticker: string) => {
        setSelectedTickers(prev => 
            prev.includes(ticker) 
                ? prev.filter(t => t !== ticker)
                : [...prev, ticker]
        );
    };

    const toggleAllTickers = (enable: boolean) => {
        setSelectedTickers(enable ? [...tickers] : []);
    };

    const addLog = (msg: string) => {
        setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleSync = async () => {
        setSyncing(true);
        setConsoleLogs([]); // Clear logs
        addLog("🚀 Initializing Sync Process...");
        addLog(`Target Tickers: ${tickers.join(', ')}`);
        
        try {
             // Sync one by one to show progress
             for (const ticker of tickers) {
                 addLog(`⏳ Syncing ${ticker} from Yahoo Finance...`);
                 try {
                     const res = await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tickers: [ticker], startYear: 2000 }) // Deep sync from 2000
                     });
                     
                     const data: any = await res.json();
                     if (data.results && data.results[0]) {
                         const r = data.results[0];
                         if (r.status === 'success') {
                             addLog(`✅ ${ticker}: Successfully synced. Saved/Updated ${r.savedCount} candles.`);
                         } else {
                             addLog(`❌ ${ticker}: Error - ${r.error || r.message}`);
                         }
                     } else {
                         addLog(`⚠️ ${ticker}: No response data.`);
                     }
                 } catch (err) {
                     addLog(`❌ ${ticker}: Network Request Failed.`);
                 }
             }

             addLog("🏁 Sync Complete for all tickers.");
             addLog("🔄 Data refreshed.");
             
        } catch(e) { 
            console.error("Sync failed", e); 
            addLog(`💥 FATAL ERROR: ${String(e)}`);
        } finally {
            setSyncing(false);
        }
    };

    // Don't render anything until mounted to avoid hydration issues
    if (!mounted) return null;

    return (
        <div className="comparison-container">
            {/* Active Tickers Control - Global Wrapper */}
             <div className="comparison-controls active-tickers-container">
                <div className="active-tickers-label">🎯 Active Tickers</div>
                <div className="active-tickers-list">
                    {tickers.map(t => (
                        <label 
                            key={t} 
                            className={`ticker-toggle-label ${selectedTickers.includes(t) ? 'active' : ''}`}
                        >
                            <input 
                                type="checkbox" 
                                checked={selectedTickers.includes(t)} 
                                onChange={() => toggleTicker(t)}
                            />
                            {t.replace('.L', '')}
                        </label>
                    ))}
                    <div className="ticker-toggle-actions">
                        <button onClick={() => toggleAllTickers(true)} className="ticker-action-btn">All</button>
                        <button onClick={() => toggleAllTickers(false)} className="ticker-action-btn">None</button>
                    </div>
                </div>
            </div>

            {/* View Render */}
            {currentView === 'home' ? (
                <ComparisonView 
                    tickers={tickers} 
                    selectedTickers={selectedTickers}
                    consoleLogs={consoleLogs}
                    syncing={syncing}
                    onSync={handleSync}
                />
            ) : currentView === 'query' ? (
                <QueryView 
                    tickers={tickers}
                    selectedTickers={selectedTickers}
                />
            ) : (
                <StrategiesView />
            )}

            {/* Bottom Navigation */}
            <div className="nav-bar">
                <button 
                    onClick={() => updateView('home')}
                    className={`nav-btn ${currentView === 'home' ? 'active-home' : ''}`}
                >
                    <Home size={24} />
                    <span>Comparison</span>
                </button>
                <button 
                    onClick={() => updateView('query')}
                    className={`nav-btn ${currentView === 'query' ? 'active-query' : ''}`}
                >
                    <Search size={24} />
                    <span>Dip Query</span>
                </button>
                <button 
                    onClick={() => updateView('strategies')}
                    className={`nav-btn ${currentView === 'strategies' ? 'active-strategies' : ''}`}
                >
                    <BarChart2 size={24} />
                    <span>Strategies</span>
                </button>
            </div>
        </div>
    );
}
