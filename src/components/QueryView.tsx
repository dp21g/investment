import React, { useState } from 'react';
import { TVChart } from './TVChart';
import { X } from 'lucide-react';

interface QueryViewProps {
    tickers: string[];
    selectedTickers: string[];
}

export default function QueryView({ tickers, selectedTickers }: QueryViewProps) {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedTicker, setSelectedTicker] = useState<string>('');
    const [chartLoading, setChartLoading] = useState(false);

    const [viewMode, setViewMode] = useState<'DIP' | 'DURATION'>('DIP');

    // Sync view mode with URL
    React.useEffect(() => {
        const path = window.location.pathname;
        if (path.includes('analyze-duration')) {
            setViewMode('DURATION');
        } else if (path.includes('analyze-max-dips')) {
            setViewMode('DIP');
        }
    }, []);

    const runAnalysis = async (mode: 'DIP' | 'DURATION') => {
        setViewMode(mode);
        // Update URL
        const newPath = mode === 'DURATION' ? '/query/analyze-duration' : '/query/analyze-max-dips';
        window.history.pushState({}, '', newPath);
        
        setLoading(true);
        try {
            const res = await fetch('/api/query/dip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tickers: selectedTickers
                })
            });
            const data: any = await res.json();
            setResults(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Query failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = async (ticker: string, year: number) => {
        setSelectedTicker(ticker);
        setSelectedYear(year);
        setModalOpen(true);
        setChartLoading(true);

        try {
            const res = await fetch('/api/query/candles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, year })
            });
            const data = await res.json();
            if (data.data) {
                setChartData(data.data);
            }
        } catch (e) {
            console.error("Failed to load chart data", e);
        } finally {
            setChartLoading(false);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setChartData([]);
    };

    return (
        <div style={{ paddingBottom: '80px' }}>
            <h1 className="comparison-h1">Market Dip Analysis</h1>
            <p className="comparison-subtitle">
                Analyze historical price action to find "Safe" Dip levels and <strong>duration of accumulated opportunities</strong> below the Yearly Open.
                <br />
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Click on any year to view the daily price chart.</span>
            </p>

            <div style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button 
                    onClick={() => runAnalysis('DIP')}
                    className="run-query-btn"
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.1rem',
                        background: viewMode === 'DIP' ? '#8b5cf6' : '#475569',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading && viewMode === 'DIP' ? 'Analyzing...' : '📉 Analyze Max Dips'}
                </button>
                <button 
                    onClick={() => runAnalysis('DURATION')}
                    className="run-query-btn"
                    style={{
                        padding: '12px 24px',
                        fontSize: '1.1rem',
                        background: viewMode === 'DURATION' ? '#f43f5e' : '#475569', // Rose-500
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                     {loading && viewMode === 'DURATION' ? 'Analyzing...' : '⏱️ Analyze Duration'}
                </button>
            </div>

            {results.length > 0 && (
                <div className="ticker-grid">
                    {results.map((r) => {
                        // Ensure unique rows by year to fix potential duplication issues
                        const uniqueDetails = Array.from(new Map(r.details.map((item: any) => [item.year, item])).values()).sort((a: any, b: any) => a.year - b.year);
                        const totalDays = uniqueDetails.reduce((sum: number, d: any) => sum + (d.daysBelowOpen || 0), 0);
                        const avgDays = r.yearsAnalyzed > 0 ? Math.round(totalDays / r.yearsAnalyzed) : 0;
                        
                        return (
                        <div key={r.ticker} className="ticker-section" style={{marginBottom: '1.5rem'}}>
                            <div className="ticker-header" style={{ background: '#475569' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div className="ticker-name">{r.name}</div>
                                        <div className="ticker-description">{r.yearsAnalyzed} years analyzed</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                                        {viewMode === 'DURATION' && (
                                            <div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Avg Days &lt; Open</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fca5a5' }}>
                                                    {avgDays} <span style={{fontSize: '0.8rem', opacity: 0.8}}>days/yr</span>
                                                </div>
                                            </div>
                                        )}
                                        {viewMode === 'DIP' && (
                                            <div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>"Safe" Dip</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#86efac' }}>
                                                    {r.safeDipPct.toFixed(2)}%
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ padding: '1rem', overflowX: 'auto' }}>
                                <table className="comparison-table">
                                    <thead>
                                        <tr>
                                            <th>Year</th>
                                            <th>Open</th>
                                            <th>Year Low</th>
                                            {viewMode === 'DIP' && <th>Max Drawdown</th>}
                                            {viewMode === 'DURATION' && <th>Days &lt; Open</th>}
                                            {viewMode === 'DIP' && <th>% Dip</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uniqueDetails.map((d: any) => (
                                            <tr 
                                                key={d.year} 
                                                className="clickable-row"
                                                onClick={() => handleRowClick(r.ticker, d.year)}
                                                title="Click to view chart"
                                            >
                                                <td><strong>{d.year}</strong></td>
                                                <td>{d.open.toFixed(2)}</td>
                                                <td>{d.low.toFixed(2)}</td>
                                                
                                                {viewMode === 'DIP' && (
                                                     <td className="negative">{d.diffVal.toFixed(2)}</td>
                                                )}

                                                {viewMode === 'DURATION' && (
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: (d.daysBelowOpen > 0) ? '#ef4444' : '#64748b' }}>
                                                        {d.daysBelowOpen}
                                                    </td>
                                                )}

                                                {viewMode === 'DIP' && (
                                                    <td className="negative" style={{ fontWeight: d.diffPct === r.safeDipPct ? 'bold' : 'normal', border: d.diffPct === r.safeDipPct ? '2px solid #86efac' : 'none' }}>
                                                        {d.diffPct.toFixed(2)}%
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem' }}>
                                    * Click on any row to see the price action for that year.
                                </div>
                            </div>
                        </div>
                    );})}
                </div>
            )}

            {/* CHART MODAL */}
            {modalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">{selectedTicker} - {selectedYear} Price Action</div>
                            <button className="modal-close-btn" onClick={closeModal}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ flex: 1, minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {chartLoading ? (
                                <div style={{ color: '#94a3b8' }}>Loading Chart Data...</div>
                            ) : (
                                <TVChart 
                                    data={chartData} 
                                    colors={{
                                        backgroundColor: '#1e293b', // Match card bg
                                        lineColor: '#3b82f6',
                                        areaTopColor: 'rgba(59, 130, 246, 0.3)',
                                        areaBottomColor: 'rgba(59, 130, 246, 0.0)',
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
