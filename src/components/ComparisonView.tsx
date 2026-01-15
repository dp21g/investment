import React, { useState, useEffect } from 'react';

// Formatters
const formatCurrency = (value: number) => {
    return '£' + value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const formatPercent = (value: number) => {
    const className = value >= 0 ? 'positive' : 'negative';
    const sign = value >= 0 ? '+' : '';
    return <span className={className}>{sign}{value.toFixed(1)}%</span>;
};

interface ComparisonViewProps {
    tickers: string[];
    selectedTickers: string[];
    consoleLogs: string[];
    syncing: boolean;
    onSync: () => void;
}

export default function ComparisonView({ tickers, selectedTickers, consoleLogs, syncing, onSync }: ComparisonViewProps) {
    const [monthlyAmount, setMonthlyAmount] = useState(2000);
    const [startYear, setStartYear] = useState(2015);
    const [endYear, setEndYear] = useState(2025);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        runSimulation();
    }, [monthlyAmount, startYear, endYear]);

    const runSimulation = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tickers, // Send all, filter locally or backend? Backend logic uses this list.
                    monthlyAmount,
                    startYear,
                    endYear
                })
            });
            const data: any = await res.json();
            setResults(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Simulation failed', error);
        } finally {
            setLoading(false);
        }
    };

    const comparisonSummary = results.map(r => {
        if (!r.dca.yearlyStats.length) return null;
        const lastDca = r.dca.yearlyStats[r.dca.yearlyStats.length - 1];
        const lastLump = r.lump.yearlyStats[r.lump.yearlyStats.length - 1];
        return {
            ticker: r.ticker,
            name: r.name,
            dcaValue: lastDca.value,
            lumpValue: lastLump.value,
            difference: lastDca.value - lastLump.value
        };
    }).filter(Boolean);

    return (
        <div style={{ paddingBottom: '80px' }}> {/* Padding for bottom nav */}
            <h1 className="comparison-h1">DCA vs Lump Sum</h1>
            <p className="comparison-subtitle">
                Compare monthly dollar-cost averaging against annual lump sum investing.
            </p>

            <div className="comparison-controls">
                <div className="comparison-input-group">
                    <label className="comparison-label" htmlFor="monthlyInvestment">💰 Monthly Investment (£)</label>
                    <input 
                        id="monthlyInvestment"
                        type="number" 
                        value={monthlyAmount} 
                        onChange={(e) => setMonthlyAmount(Number((e.target as HTMLInputElement).value))}
                        className="comparison-input"
                    />
                </div>
                
                <div className="comparison-input-group">
                    <label className="comparison-label" htmlFor="startYear">📅 Start Year</label>
                    <input 
                        id="startYear"
                        type="number" 
                        value={startYear} 
                        onChange={(e) => setStartYear(Number((e.target as HTMLInputElement).value))}
                        className="comparison-input"
                        min="2000"
                        max="2025"
                    />
                </div>

                <div className="comparison-input-group">
                    <label className="comparison-label" htmlFor="endYear">🏁 End Year</label>
                    <input 
                        id="endYear"
                        type="number" 
                        value={endYear} 
                        onChange={(e) => setEndYear(Number((e.target as HTMLInputElement).value))}
                        className="comparison-input"
                        min="2000"
                        max="2025"
                    />
                </div>

                <div className="comparison-input-group">
                     <label className="comparison-label">&nbsp;</label>
                     <button 
                        onClick={onSync}
                        disabled={syncing}
                        style={{
                            padding: '8px',
                            background: syncing ? '#cbd5e0' : '#4299e1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: syncing ? 'default' : 'pointer',
                            fontWeight: 'bold'
                        }}
                     >
                        {syncing ? 'Syncing...' : '🔄 Sync Data'}
                     </button>
                </div>
            </div>

            {/* SYNC CONSOLE */}
            {consoleLogs.length > 0 && (
                <div className="console-output">
                    <div className="console-header">🖥️ Sync Console</div>
                    <div className="console-body">
                        {consoleLogs.map((log, i) => (
                            <div key={i} className="console-line">{log}</div>
                        ))}
                         {syncing && <div className="console-line blink">_</div>}
                    </div>
                </div>
            )}

            {loading && <div className="text-center py-10">Loading simulation data...</div>}

            <div className="ticker-grid">
                {results.filter(r => selectedTickers.includes(r.ticker)).map((r) => {
                     // Guard against missing data
                     if (!r.dca || !r.lump) {
                         return (
                             <div key={r.ticker} className="ticker-section" style={{padding: '2rem'}}>
                                <div className="ticker-header">
                                    <div className="ticker-name">{r.ticker}</div>
                                </div>
                                <div style={{padding: '2rem', textAlign: 'center', color: '#666'}}>
                                    ⚠️ Simulation data unavailable. Please ensure data is synced.
                                    {r.error && <div style={{color: 'red', marginTop: '0.5rem'}}>{r.error}</div>}
                                </div>
                             </div>
                         );
                     }

                     // Prepare rows
                     const rows = [];
                     const dcaStats = r.dca.yearlyStats || [];
                     const lumpStats = r.lump.yearlyStats || [];
                     
                     for (let i = 0; i < dcaStats.length; i++) {
                         const d = dcaStats[i];
                         const l = lumpStats.find((x: any) => x.year === d.year);
                         
                         if (l) {
                             const winner = d.value > l.value ? 'DCA' : 'LUMP';
                             rows.push({
                                 year: d.year,
                                 dcaReturn: d.yearReturn,
                                 dcaValue: d.value,
                                 dcaGain: d.profit,
                                 lumpReturn: l.yearReturn,
                                 lumpValue: l.value,
                                 lumpGain: l.profit,
                                 winner,
                                 yahooReturn: d.yahooReturn // Same for both
                             });
                         }
                     }

                     const finalDca = {
                        finalValue: r.dca.finalValue,
                        totalInvested: r.dca.totalInvested,
                        roi: r.dca.totalReturnPct,
                        trades: r.dca.trades
                     };
                     
                     const finalLump = {
                        finalValue: r.lump.finalValue,
                        totalInvested: r.lump.totalInvested,
                        roi: r.lump.totalReturnPct,
                        trades: r.lump.trades
                     };
                     
                     // Calculate wins
                     const yearsWon = rows.filter(row => row.winner === 'DCA').length;
                     const totalYears = rows.length;

                     return (
                        <div key={r.ticker} className="ticker-section">
                            <div className="ticker-header">
                                <div className="ticker-name">{r.name}</div>
                                <div className="ticker-description">{r.description}</div>
                            </div>
                            
                            <div className="strategy-comparison">
                                {/* DCA Column */}
                                <div className="strategy-column dca">
                                    <div className="strategy-title">💵 DCA (£{monthlyAmount.toLocaleString()}/month)</div>
                                    <table className="comparison-table">
                                        <thead>
                                            <tr>
                                                <th>Year</th>
                                                <th>Return</th>
                                                <th>Yahoo (Total)</th>
                                                <th>Value</th>
                                                <th>Gain</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(row => (
                                                <tr key={row.year} className={row.winner === 'DCA' ? 'winner' : 'loser'}>
                                                    <td><strong>{row.year}</strong></td>
                                                    <td>{formatPercent(row.dcaReturn)}</td>
                                                    <td>{formatPercent(row.yahooReturn)}</td>
                                                    <td>{formatCurrency(row.dcaValue)}</td>
                                                    <td>{formatCurrency(row.dcaGain)}</td>
                                                </tr>
                                            ))}
                                            <tr className="total-row">
                                                <td><strong>TOT</strong></td>
                                                <td>-</td>
                                                <td>-</td>
                                                <td>{formatCurrency(finalDca.finalValue)}</td>
                                                <td>{formatCurrency(finalDca.finalValue - finalDca.totalInvested)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    
                                    <div className="summary-cards">
                                        <div className="summary-card dca">
                                            <h3>Final Value</h3>
                                            <div className="value">{formatCurrency(finalDca.finalValue)}</div>
                                        </div>
                                        <div className="summary-card dca">
                                            <h3>ROI</h3>
                                            <div className="value">{finalDca.roi.toFixed(1)}%</div>
                                        </div>
                                         <div className="summary-card dca">
                                            <h3>Years Won</h3>
                                            <div className="value">{yearsWon}/{totalYears}</div>
                                        </div>
                                         <div className="summary-card dca">
                                            <h3>Total Gains</h3>
                                            <div className="value">{formatCurrency(finalDca.finalValue - finalDca.totalInvested)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Lump Sum Column */}
                                <div className="strategy-column lump">
                                    <div className="strategy-title">💰 Lump Sum (£{(monthlyAmount * 12).toLocaleString()} Jan 1)</div>
                                    <table className="comparison-table">
                                        <thead>
                                            <tr>
                                                <th>Year</th>
                                                <th>Return</th>
                                                <th>Yahoo (Total)</th>
                                                <th>Value</th>
                                                <th>Gain</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(row => (
                                                <tr key={row.year} className={row.winner === 'LUMP' ? 'winner' : 'loser'}>
                                                    <td><strong>{row.year}</strong></td>
                                                    <td>{formatPercent(row.lumpReturn)}</td>
                                                    <td>{formatPercent(row.yahooReturn)}</td>
                                                    <td>{formatCurrency(row.lumpValue)}</td>
                                                    <td>{formatCurrency(row.lumpGain)}</td>
                                                </tr>
                                            ))}
                                            <tr className="total-row">
                                                <td><strong>TOT</strong></td>
                                                <td>-</td>
                                                <td>-</td>
                                                <td>{formatCurrency(finalLump.finalValue)}</td>
                                                <td>{formatCurrency(finalLump.finalValue - finalLump.totalInvested)}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                     <div className="summary-cards">
                                        <div className="summary-card lump">
                                            <h3>Final Value</h3>
                                            <div className="value">{formatCurrency(finalLump.finalValue)}</div>
                                        </div>
                                        <div className="summary-card lump">
                                            <h3>ROI</h3>
                                            <div className="value">{finalLump.roi.toFixed(1)}%</div>
                                        </div>
                                         <div className="summary-card lump">
                                            <h3>Years Won</h3>
                                            <div className="value">{totalYears - yearsWon}/{totalYears}</div>
                                        </div>
                                         <div className="summary-card lump">
                                            <h3>Total Gains</h3>
                                            <div className="value">{formatCurrency(finalLump.finalValue - finalLump.totalInvested)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                     );
                })}


                <div className="comparison-section">
                    <h2 className="comparison-section-title">📊 Strategy Leaderboard</h2>
                    <table className="comparison-summary-table">
                         <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>DCA Value</th>
                            <th>Lump Sum Value</th>
                            <th>Advantage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comparisonSummary.filter((item: any) => selectedTickers.includes(item.ticker)).map((item: any) => {
                            const diffPercent = (item.difference / Math.min(item.dcaValue, item.lumpValue)) * 100;
                            return (
                                <tr key={item.ticker}>
                                    <td><strong>{item.ticker.replace('.L', '')}</strong> <span style={{fontSize: '0.8rem', color: '#666'}}>({item.name})</span></td>
                                    <td>{formatCurrency(item.dcaValue)}</td>
                                    <td>{formatCurrency(item.lumpValue)}</td>
                                    <td className={item.difference > 0 ? 'positive' : 'negative'}>
                                        {item.difference > 0 ? 'DCA' : 'Lump Sum'} +{formatCurrency(Math.abs(item.difference))} ({Math.abs(diffPercent).toFixed(1)}%)
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
