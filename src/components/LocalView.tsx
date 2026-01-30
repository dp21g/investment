import { useState, useEffect } from 'react';
import CandleDetailView from './CandleDetailView';

interface Breach {
    type: 'HIGH' | 'LOW';
    date: string;
    price: number;
    candle: any;
}

interface InsideCandle {
    candle: any;
    prevCandle: any;
    breachHigh: Breach | null;
    breachLow: Breach | null;
    firstBreachType: 'HIGH' | 'LOW' | null;
    timeToSecondBreach: number | null;
    fibProjectionRatio: number | null;
    excursionPrice: number | null;
}

export default function LocalView() {
    // Helper for Sticky State
    const useStickyState = (key: string, defaultValue: string | (() => string)) => {
        const [value, setValue] = useState(() => {
            const stickyValue = localStorage.getItem(key);
            if (stickyValue !== null) return stickyValue;
            return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        });

        useEffect(() => {
            localStorage.setItem(key, value);
        }, [key, value]);

        return [value, setValue] as const;
    };

    const [ticker, setTicker] = useStickyState('localView_ticker', 'NQ=F');
    const [data, setData] = useState<{ candles20m: any[], insideCandles: InsideCandle[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Default range: last 60 days
    const [startDate, setStartDate] = useStickyState('localView_startDate', () => {
        const d = new Date();
        d.setDate(d.getDate() - 60);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useStickyState('localView_endDate', () => new Date().toISOString().split('T')[0]);

    // Time Filtering
    const [filterHour, setFilterHour] = useStickyState('localView_filterHour', '');
    const [filterMinute, setFilterMinute] = useStickyState('localView_filterMinute', '');

    // Breach Time Filtering
    const [filterHighBreachHour, setFilterHighBreachHour] = useStickyState('localView_highBreachHour', '');
    const [filterHighBreachMin, setFilterHighBreachMin] = useStickyState('localView_highBreachMin', '');
    const [filterLowBreachHour, setFilterLowBreachHour] = useStickyState('localView_lowBreachHour', '');
    const [filterLowBreachMin, setFilterLowBreachMin] = useStickyState('localView_lowBreachMin', '');

    // Detail View
    const [selectedCandle, setSelectedCandle] = useState<InsideCandle | null>(null);

    useEffect(() => {
        fetchData();
    }, [ticker, startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/local/data?ticker=${encodeURIComponent(ticker)}&startDate=${startDate}&endDate=${endDate}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    };

    // Helper for US Holidays
    const isUSHoliday = (date: Date): string | null => {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        const d = date.getDate();
        const day = date.getDay(); // 0 = Sun, 1 = Mon, ...

        // Helper to check for Nth occurrence of weekday in month
        const isNthWeekday = (nth: number, weekday: number) => {
             // Logic: Check if current day matches weekday. 
             // Then check if it is within the nth range (e.g. 1st Mon is 1-7, 2nd is 8-14, etc.)
             if (day !== weekday) return false;
             return Math.ceil(d / 7) === nth;
        };

        // Last Monday of May
        const isLastMondayKey = () => {
             if (day !== 1) return false;
             // Check if next Monday is in next month
             const nextMon = new Date(year, month, d + 7);
             return nextMon.getMonth() !== month;
        };

        // New Year's Day (Jan 1)
        if (month === 0 && d === 1) return "New Year's Day";
        
        // MLK Jr. Day (3rd Mon in Jan)
        if (month === 0 && isNthWeekday(3, 1)) return "MLK Jr. Day";

        // Presidents' Day (3rd Mon in Feb)
        if (month === 1 && isNthWeekday(3, 1)) return "Presidents' Day";

        // Memorial Day (Last Mon in May)
        if (month === 4 && isLastMondayKey()) return "Memorial Day";

        // Juneteenth (June 19)
        if (month === 5 && d === 19) return "Juneteenth";

        // Independence Day (July 4)
        if (month === 6 && d === 4) return "Independence Day";

        // Labor Day (1st Mon in Sep)
        if (month === 8 && isNthWeekday(1, 1)) return "Labor Day";

        // Columbus Day (2nd Mon in Oct) - often bond market holiday but let's include it
        if (month === 9 && isNthWeekday(2, 1)) return "Columbus Day";

        // Veterans Day (Nov 11)
        if (month === 10 && d === 11) return "Veterans Day";

        // Thanksgiving (4th Thu in Nov)
        if (month === 10 && isNthWeekday(4, 4)) return "Thanksgiving";

        // Christmas Day (Dec 25)
        if (month === 11 && d === 25) return "Christmas Day";

        return null;
    };

    // Filter Logic
    const filteredInsideCandles = data?.insideCandles.filter(ic => {
        // ... (existing filter checks) ...
        // 1. Filter by 20m Candle Time
        if (filterHour || filterMinute) {
             const date = new Date(ic.candle.date);
             const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            }).formatToParts(date);
            const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
            const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

            if (filterHour && h !== parseInt(filterHour)) return false;
            if (filterMinute && m !== parseInt(filterMinute)) return false;
        }

        // 2. Filter by High Breach Time
        if (filterHighBreachHour || filterHighBreachMin) {
            if (!ic.breachHigh) return false; 
            
            const date = new Date(ic.breachHigh.date);
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            }).formatToParts(date);
            const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
            const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

            if (filterHighBreachHour && h !== parseInt(filterHighBreachHour)) return false;
            if (filterHighBreachMin && m !== parseInt(filterHighBreachMin)) return false;
        }

        // 3. Filter by Low Breach Time
        if (filterLowBreachHour || filterLowBreachMin) {
            if (!ic.breachLow) return false; 
            
            const date = new Date(ic.breachLow.date);
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            }).formatToParts(date);
            const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
            const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

            if (filterLowBreachHour && h !== parseInt(filterLowBreachHour)) return false;
            if (filterLowBreachMin && m !== parseInt(filterLowBreachMin)) return false;
        }
        
        return true;
    }) || [];

    // Helper for NY format
    const formatNY = (dateStr: string | Date) => {
        const d = new Date(dateStr);
        const datePart = d.toLocaleString('en-US', { 
            timeZone: 'America/New_York', 
            weekday: 'short', // Mon, Tue
            month: 'numeric', 
            day: 'numeric',
            year: 'numeric'
        });
        const timePart = d.toLocaleString('en-US', { 
            timeZone: 'America/New_York', 
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        const holiday = isUSHoliday(d);
        if (holiday) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{datePart}, {timePart}</span>
                    <span style={{ fontSize: '0.8rem', color: '#ff9800' }}>Wait: {holiday}</span>
                </div>
            );
        }

        return `${datePart}, ${timePart}`;
    };
    
    // Helper for NY Time only
    const formatNYTime = (dateStr: string | Date) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { 
            timeZone: 'America/New_York', 
            hour12: false 
        });
    };

    const formatDuration = (ms: number, secondBreachDateStr: string) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const remHours = hours % 24;
        const remMinutes = minutes % 60;

        let str = '';
        if (days > 0) {
            str += `${days}d `;
        }
        if (remHours > 0 || days > 0) {
            str += `${remHours}h `;
        }
        str += `${remMinutes}m`;
        
        if (days > 0) {
            // If it's days later, show the date too
            const d = new Date(secondBreachDateStr);
            const datePart = d.toLocaleDateString('en-US', { 
                timeZone: 'America/New_York', 
                weekday: 'short', 
                month: 'numeric', 
                day: 'numeric' 
            });
            return `${str} later (${datePart})`;
        }

        return `${str} later`;
    };

    const formatPeakTime = (peakDateStr: string, breachDateStr: string) => {
        const timePart = formatNYTime(peakDateStr);
        
        const d1 = new Date(peakDateStr);
        const d2 = new Date(breachDateStr);
        
        // Calculate difference in full days roughly, or just check "day" boundaries?
        // User said "(2d)".
        // Let's use difference in milliseconds converted to days roughly
        const diffTime = Math.abs(d1.getTime() - d2.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays > 0) {
            return `${timePart} (${diffDays}d)`;
        }
        return timePart;
    };

    const clearFilters = (type: '20m' | 'high' | 'low') => {
        if (type === '20m') {
            setFilterHour('');
            setFilterMinute('');
        } else if (type === 'high') {
            setFilterHighBreachHour('');
            setFilterHighBreachMin('');
        } else if (type === 'low') {
            setFilterLowBreachHour('');
            setFilterLowBreachMin('');
        }
    };

    return (
        <div className="view-container strategies-view">
            <div className="section-header">
                <h2>Local Futures Analysis (NY Time)</h2>
                    <div className="controls-row" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={ticker} onChange={e => setTicker(e.target.value)} className="strategy-select" style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}>
                            <option value="NQ=F">NQ (Nasdaq Futures)</option>
                            <option value="ES=F">ES (S&P Futures)</option>
                        </select>
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Start Date</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)}
                                className="date-input"
                                style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                             <span style={{ fontSize: '0.8rem', color: '#aaa' }}>End Date</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)}
                                className="date-input"
                                style={{ padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                            />
                        </div>

                        <div style={{ width: '1px', height: '40px', backgroundColor: '#444', margin: '0 10px' }}></div>
                        
                        {/* Time Filters */}
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', border: '1px solid #444', padding: '5px', borderRadius: '5px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column' }}>
                                 <span style={{ fontSize: '0.8rem', color: '#aaa' }}>20m Hour</span>
                                <input 
                                    type="number" 
                                    placeholder="HH"
                                    value={filterHour} 
                                    onChange={e => setFilterHour(e.target.value)}
                                    style={{ width: '50px', padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                 <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Min</span>
                                <input 
                                    type="number" 
                                    placeholder="MM"
                                    value={filterMinute} 
                                    onChange={e => setFilterMinute(e.target.value)}
                                    style={{ width: '50px', padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                                />
                            </div>
                            <button onClick={() => clearFilters('20m')} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}>&times;</button>
                        </div>

                         {/* High Breach Filters */}
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', border: '1px solid #444', padding: '5px', borderRadius: '5px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column' }}>
                                 <span style={{ fontSize: '0.8rem', color: '#aaa' }}>High Br. H</span>
                                <input 
                                    type="number" 
                                    placeholder="HH"
                                    value={filterHighBreachHour} 
                                    onChange={e => setFilterHighBreachHour(e.target.value)}
                                    style={{ width: '50px', padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                 <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Min</span>
                                <input 
                                    type="number" 
                                    placeholder="MM"
                                    value={filterHighBreachMin} 
                                    onChange={e => setFilterHighBreachMin(e.target.value)}
                                    style={{ width: '50px', padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                                />
                            </div>
                            <button onClick={() => clearFilters('high')} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}>&times;</button>
                        </div>

                        {/* Low Breach Filters */}
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', border: '1px solid #444', padding: '5px', borderRadius: '5px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column' }}>
                                 <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Low Br. H</span>
                                <input 
                                    type="number" 
                                    placeholder="HH"
                                    value={filterLowBreachHour} 
                                    onChange={e => setFilterLowBreachHour(e.target.value)}
                                    style={{ width: '50px', padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                 <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Min</span>
                                <input 
                                    type="number" 
                                    placeholder="MM"
                                    value={filterLowBreachMin} 
                                    onChange={e => setFilterLowBreachMin(e.target.value)}
                                    style={{ width: '50px', padding: '8px', borderRadius: '5px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                                />
                            </div>
                            <button onClick={() => clearFilters('low')} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}>&times;</button>
                        </div>


                        <button onClick={fetchData} className="run-btn" style={{ padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', backgroundColor: '#4caf50', color: 'white', border: 'none', height: '40px', marginTop: 'auto', marginLeft: 'auto' }}>Refresh</button>
                    </div>
                </div>

                {loading && <div className="loading" style={{ padding: '20px', textAlign: 'center' }}>Loading local data...</div>}
                {error && <div className="error-msg" style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}

                {data && (
                    <div className="results-container" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                        
                        <div className="stats-card" style={{ padding: '20px', backgroundColor: '#1e1e1e', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <h3>Data Overview</h3>
                                <p>Total 20m Candles in Range: {data.candles20m.length}</p>
                            </div>
                            <div>
                                <h3>Filtered Results</h3>
                                <p>Matching Inside Candles: {filteredInsideCandles.length}</p>
                            </div>
                        </div>

                        <div className="table-container" style={{ overflowX: 'auto' }}>
                            <h3>Inside Candle Monitor (20m) - NY Time</h3>
                            <p className="subtitle" style={{ color: '#aaa', marginBottom: '15px' }}>Showing 20m candles that did not breach previous candle's High/Low. <strong>Click row for charts.</strong></p>
                            
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #444' }}>
                                        <th style={{ padding: '10px' }}>Date (20m NY)</th>
                                        <th style={{ padding: '10px' }}>Inside Range (H/L)</th>
                                        <th style={{ padding: '10px' }}>High Breach (NY)</th>
                                        <th style={{ padding: '10px' }}>Low Breach (NY)</th>
                                        <th style={{ padding: '10px' }}>Fib Proj</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInsideCandles.map((ic, idx) => {
                                        const date = formatNY(ic.candle.date);
                                        const breachedHigh = !!ic.breachHigh;
                                        const breachedLow = !!ic.breachLow;
                                        
                                        const rowStyle = { borderBottom: '1px solid #333', cursor: 'pointer' };
                                        
                                        // Color logic: 
                                        // If both: maybe purple? 
                                        // If High: Light Green
                                        // If Low: Light Red
                                        let statusColor = 'transparent';
                                        if (breachedHigh && breachedLow) statusColor = 'rgba(156, 39, 176, 0.1)';
                                        else if (breachedHigh) statusColor = 'rgba(76, 175, 80, 0.1)';
                                        else if (breachedLow) statusColor = 'rgba(244, 67, 54, 0.1)';

                                        return (
                                            <tr 
                                                key={idx} 
                                                style={{ ...rowStyle, backgroundColor: statusColor }}
                                                onClick={() => setSelectedCandle(ic)}
                                                className="hover-row"
                                            >
                                                <td style={{ padding: '10px' }}>{date}</td>
                                                <td style={{ padding: '10px' }}>{ic.candle.high.toFixed(2)} / {ic.candle.low.toFixed(2)}</td>
                                                
                                                {/* High Breach Column */}
                                                <td style={{ padding: '10px' }}>
                                                    {ic.breachHigh ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{ic.breachHigh.price.toFixed(2)}</span>
                                                            <span style={{ fontSize: '0.75rem', color: '#e91e63', fontWeight: 'bold' }}>Breach: {formatNYTime(ic.breachHigh.date)}</span>
                                                            
                                                            {/* If High was First, show Peak Time here */}
                                                            {ic.firstBreachType === 'HIGH' && ic.peakTime && (
                                                                <span style={{ fontSize: '0.75rem', color: '#2196f3', fontWeight: 'bold' }}>
                                                                    Peak: {formatPeakTime(ic.peakTime, ic.breachHigh.date)}
                                                                </span>
                                                            )}

                                                            {/* If Low was First, then this High breach is the Second breach. Show Duration */}
                                                            {ic.breachLow && ic.firstBreachType === 'LOW' && ic.timeToSecondBreach && (
                                                                <span style={{ fontSize: '0.75rem', color: '#ff9800', fontStyle: 'italic', marginTop: '4px' }}>
                                                                    {formatDuration(ic.timeToSecondBreach, ic.breachHigh.date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* No High Breach yet. If Low was first, then this is "In Progress" */
                                                        ic.firstBreachType === 'LOW' ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                 <span style={{ color: '#aaa', fontStyle: 'italic' }}>In Progress</span>
                                                            </div>
                                                        ) : '-'
                                                    )}
                                                </td>

                                                {/* Low Breach Column */}
                                                <td style={{ padding: '10px' }}>
                                                    {ic.breachLow ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ color: '#f44336', fontWeight: 'bold' }}>{ic.breachLow.price.toFixed(2)}</span>
                                                            <span style={{ fontSize: '0.75rem', color: '#e91e63', fontWeight: 'bold' }}>Breach: {formatNYTime(ic.breachLow.date)}</span>

                                                             {/* If Low was First, show Peak Time here */}
                                                             {ic.firstBreachType === 'LOW' && ic.peakTime && (
                                                                <span style={{ fontSize: '0.75rem', color: '#2196f3', fontWeight: 'bold' }}>
                                                                    Peak: {formatPeakTime(ic.peakTime, ic.breachLow.date)}
                                                                </span>
                                                            )}

                                                            {/* If High was First, then this Low breach is the Second breach. Show Duration */}
                                                            {ic.breachHigh && ic.firstBreachType === 'HIGH' && ic.timeToSecondBreach && (
                                                                <span style={{ fontSize: '0.75rem', color: '#ff9800', fontStyle: 'italic', marginTop: '4px' }}>
                                                                    {formatDuration(ic.timeToSecondBreach, ic.breachLow.date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* No Low Breach yet. If High was first, then this is "In Progress" */
                                                        ic.firstBreachType === 'HIGH' ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                 <span style={{ color: '#aaa', fontStyle: 'italic' }}>In Progress</span>
                                                            </div>
                                                        ) : '-'
                                                    )}
                                                </td>

                                                {/* Fib Projection Column */}
                                                <td style={{ padding: '10px' }}>
                                                    {ic.fibProjectionRatio ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ 
                                                                color: ic.fibProjectionRatio >= 2 ? '#4caf50' : '#fff', 
                                                                fontWeight: 'bold' 
                                                            }}>
                                                                {ic.fibProjectionRatio.toFixed(2)}
                                                            </span>
                                                            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                                                {ic.firstBreachType}: {ic.excursionPrice?.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredInsideCandles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>No candles match the filter.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                    </div>
                </div>
            )}

            {selectedCandle && (
                <CandleDetailView 
                    ticker={ticker} 
                    insideCandle={selectedCandle} 
                    onClose={() => setSelectedCandle(null)} 
                />
            )}
        </div>
    );
}
