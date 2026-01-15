import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface DataRange {
    ticker: string;
    interval: string;
    minDate: string | null;
    maxDate: string | null;
    count: number;
}

export default function StrategiesView() {
    const [ranges, setRanges] = useState<DataRange[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkRanges = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/strategies/ranges');
            if (!res.ok) throw new Error('Failed to fetch ranges');
            const data = await res.json();
            setRanges(data.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkRanges();
    }, []);

    return (
        <div className="view-container strategies-view">
             <div className="view-header">
                <h2>Strategies & Data Analysis</h2>
            </div>
            
            <div className="card">
                <div className="card-header">
                    <h3>Data Availability</h3>
                    <button 
                        onClick={checkRanges} 
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Check Data Ranges
                    </button>
                </div>
                
                {error && (
                    <div className="error-message" style={{ color: 'red', marginTop: '1rem' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="table-container" style={{ marginTop: '1rem' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #444' }}>
                                <th style={{ padding: '8px' }}>Ticker</th>
                                <th style={{ padding: '8px' }}>Interval</th>
                                <th style={{ padding: '8px' }}>Count</th>
                                <th style={{ padding: '8px' }}>Min Date</th>
                                <th style={{ padding: '8px' }}>Max Date</th>
                                <th style={{ padding: '8px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranges.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '8px' }}>{r.ticker}</td>
                                    <td style={{ padding: '8px' }}>{r.interval}</td>
                                    <td style={{ padding: '8px' }}>{r.count.toLocaleString()}</td>
                                    <td style={{ padding: '8px' }}>{r.minDate ? new Date(r.minDate).toLocaleString() : '-'}</td>
                                    <td style={{ padding: '8px' }}>{r.maxDate ? new Date(r.maxDate).toLocaleString() : '-'}</td>
                                    <td style={{ padding: '8px' }}>
                                        {r.count > 0 ? (
                                            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle size={14} /> Ready
                                            </span>
                                        ) : (
                                            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <AlertCircle size={14} /> Empty
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {ranges.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
                                        No data found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
