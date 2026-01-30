import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, Time } from 'lightweight-charts';

interface CandleData {
    time: number; // Unix timestamp in seconds
    open: number;
    high: number;
    low: number;
    close: number;
}

interface DetailProps {
    ticker: string;
    insideCandle: any;
    onClose: () => void;
}

export default function CandleDetailView({ ticker, insideCandle, onClose }: DetailProps) {
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<{ candles20m: any[], candles5m: any[] } | null>(null);
    const [error, setError] = useState('');

    const chartContainer20mRef = useRef<HTMLDivElement>(null);
    const chartContainer5mRef = useRef<HTMLDivElement>(null);
    
    // Refs to keep track of chart instances to cleanup
    const chart20mInstance = useRef<IChartApi | null>(null);
    const chart5mInstance = useRef<IChartApi | null>(null);

    const series5mRef = useRef<any>(null);

    // --- Drawing State ---
    const [drawings, setDrawings] = useState<any[]>([]);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [currentPoints, setCurrentPoints] = useState<{ time: number, price: number }[]>([]);
    // We need to trigger re-renders for the overlay when chart scrolls/zooms
    const [chartVersion, setChartVersion] = useState(0); 

    // Fetch Drawings on Load
    useEffect(() => {
        fetchDrawings();
    }, [insideCandle]);

    const fetchDrawings = async () => {
        try {
            const dateStr = insideCandle.candle.date;
            const res = await fetch(`/api/local/drawings?ticker=${encodeURIComponent(ticker)}&date=${dateStr}`);
            if (res.ok) {
                const json = await res.json();
                setDrawings(json);
            }
        } catch (e) {
            console.error("Failed to load drawings", e);
        }
    };

    const saveDrawing = async (type: string, points: { time: number, price: number }[]) => {
        try {
            const res = await fetch('/api/local/drawings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    contextDate: insideCandle.candle.date,
                    type,
                    points,
                    properties: { color: 'white' } // Default props
                })
            });
            if (res.ok) {
                fetchDrawings();
                setCurrentPoints([]);
                setActiveTool(null);
            }
        } catch (e) {
            console.error("Failed to save drawing", e);
        }
    };

    const deleteDrawing = async (id: number) => {
        if (!confirm('Delete drawing?')) return;
        try {
            await fetch(`/api/local/drawings/${id}`, { method: 'DELETE' });
            setDrawings(prev => prev.filter(d => d.id !== id));
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    // --- Chart Logic ---
    useEffect(() => {
        fetchContextData();
    }, [insideCandle]);

    const fetchContextData = async () => {
        setLoading(true);
        try {
            const dateStr = insideCandle.candle.date;
            const res = await fetch(`/api/local/context?ticker=${encodeURIComponent(ticker)}&date=${dateStr}`);
            if (!res.ok) throw new Error('Failed to fetch context');
            const json = await res.json();
            setChartData(json);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!chartData || !chartContainer20mRef.current || !chartContainer5mRef.current) return;

        // Cleanup previous instances
        [chart20mInstance, chart5mInstance].forEach(ref => {
            if (ref.current) {
                try { ref.current.remove(); } catch (e) {}
                ref.current = null;
            }
        });

    // Common Chart Options
        const chartOptions = {
            layout: { background: { type: ColorType.Solid, color: '#1e1e1e' }, textColor: 'white' },
            grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
            timeScale: { 
                timeVisible: true, 
                secondsVisible: false,
                tickMarkFormatter: (time: Time) => {
                    const date = new Date(Number(time) * 1000);
                    return date.toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: false
                    });
                }
            },
            localization: {
                timeFormatter: (time: Time) => {
                    const date = new Date(Number(time) * 1000);
                    return date.toLocaleString('en-US', {
                        timeZone: 'America/New_York',
                        dateStyle: 'short',
                        timeStyle: 'short',
                        hour12: false
                    });
                }
            },
            crosshair: { mode: CrosshairMode.Normal },
        };

        // --- 20m Chart ---
        const chart20m = createChart(chartContainer20mRef.current, { ...chartOptions, width: chartContainer20mRef.current.clientWidth, height: 400 });
        chart20mInstance.current = chart20m;
        const series20m = chart20m.addCandlestickSeries();
        series20m.setData(chartData.candles20m.map((c: any) => ({
            time: (new Date(c.date).getTime() / 1000) as Time,
            open: c.open, high: c.high, low: c.low, close: c.close,
        })));

        // --- 5m Chart ---
        const chart5m = createChart(chartContainer5mRef.current, { ...chartOptions, width: chartContainer5mRef.current.clientWidth, height: 400 });
        chart5mInstance.current = chart5m;
        const series5m = chart5m.addCandlestickSeries();
        series5mRef.current = series5m;
        series5m.setData(chartData.candles5m.map((c: any) => ({
            time: (new Date(c.date).getTime() / 1000) as Time,
            open: c.open, high: c.high, low: c.low, close: c.close,
        })));


        // --- MARKERS & LINES ---
        try {
            const insideTime = (new Date(insideCandle.candle.date).getTime() / 1000) as Time;
            const rangeHigh = insideCandle.candle.high;
            const rangeLow = insideCandle.candle.low;

            // 1. Highlight Inside Candle on 20m
            series20m.setMarkers([{ time: insideTime, position: 'aboveBar', color: 'orange', shape: 'arrowDown', text: 'Inside Candle' }]);

            // 2. Vertical Line (Start Time) on ALL charts - Using Histogram Overlay
            const verticalLineData = [{ time: insideTime, value: 1, color: 'rgba(255, 255, 255, 0.15)' }];
            
            const addVerticalLine = (chart: IChartApi) => {
                const hist = chart.addHistogramSeries({ 
                    priceScaleId: 'overlay', 
                    priceFormat: { type: 'volume' },
                    color: 'rgba(255, 255, 255, 0.15)' 
                });
                hist.setData(verticalLineData);
                // Force overlay to scale such that the bar covers the height roughly
                chart.priceScale('overlay').applyOptions({
                     scaleMargins: { top: 0, bottom: 0 },
                });
            };

            addVerticalLine(chart20m);
            addVerticalLine(chart5m);


            // 3. Price Lines (Range High/Low) on 5m
            const addPriceLines = (series: any) => {
                series.createPriceLine({ price: rangeHigh, color: 'orange', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'Inside High' });
                series.createPriceLine({ price: rangeLow, color: 'orange', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'Inside Low' });
            };

            addPriceLines(series5m);

        } catch(e) { console.error("Error setting markers", e); }


        // --- FITTING ---
        chart20m.timeScale().fitContent();
        chart5m.timeScale().fitContent();


        // Cleanup
        return () => {
             [chart20mInstance, chart5mInstance].forEach(ref => {
                if (ref.current) {
                    try { ref.current.remove(); } catch (e) {}
                    ref.current = null;
                }
            });
        };

    }, [chartData]);

    useEffect(() => {
        if (!chart5mInstance.current) return;
        
        const handleTimeRangeChange = () => {
            setChartVersion(v => v + 1);
        };

        chart5mInstance.current.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);
        
        return () => {
             chart5mInstance.current?.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
        };
    }, [chartData, chart5mInstance.current]);


    // --- Interaction Handlers (Attached to 5m Chart Overlay) ---
    // We only allow drawing on the 5m chart for now as it's the "Breach Monitor"
    
    // Better approach: Overlay div handles native mouse events, we convert to Chart coordinates.
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!activeTool || !chart5mInstance.current || !series5mRef.current) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const time = chart5mInstance.current.timeScale().coordinateToTime(x) as number;
        // @ts-ignore - coordinateToPrice is on the series
        const price = series5mRef.current.coordinateToPrice(y);

        if (time === null || price === null) return;

        const newPoints = [...currentPoints, { time, price }];
        
        // Check if drawing is complete
        if (activeTool === 'line' || activeTool === 'box' || activeTool === 'fib') {
            if (newPoints.length === 2) {
                saveDrawing(activeTool, newPoints);
            } else {
                setCurrentPoints(newPoints);
            }
        }
    };

    const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!activeTool || currentPoints.length === 0) return;
        // Update a "preview" point state if we want to show the line being drawn
        // For now, simple click-click implementation.
    };

    // --- Ref for Series to access coordinate conversion ---
    // series5mRef is declared at the top of the component



    // --- Render Helpers ---
    const renderDrawings = () => {
        if (!chart5mInstance.current || !series5mRef.current) return null;

        const api = chart5mInstance.current;
        const series = series5mRef.current;

        return drawings.map(d => {
            const pts = d.points.map((p: any) => {
                const x = api.timeScale().timeToCoordinate(p.time);
                const y = series.priceToCoordinate(p.price);
                return { x, y };
            });

            // Skip if off screen (coords are null)
            if (pts.some((p: any) => p.x === null || p.y === null)) return null;

            if (d.type === 'line') {
                return (
                    <g key={d.id} onClick={() => deleteDrawing(d.id)} style={{ cursor: 'pointer' }}>
                        <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke="cyan" strokeWidth="2" />
                        <circle cx={pts[0].x} cy={pts[0].y} r="3" fill="cyan" />
                        <circle cx={pts[1].x} cy={pts[1].y} r="3" fill="cyan" />
                    </g>
                );
            }
            if (d.type === 'box') {
                const x = Math.min(pts[0].x, pts[1].x);
                const y = Math.min(pts[0].y, pts[1].y);
                const w = Math.abs(pts[0].x - pts[1].x);
                const h = Math.abs(pts[0].y - pts[1].y);
                return (
                    <g key={d.id} onClick={() => deleteDrawing(d.id)} style={{ cursor: 'pointer' }}>
                        <rect x={x} y={y} width={w} height={h} stroke="yellow" strokeWidth="2" fill="rgba(255, 255, 0, 0.1)" />
                    </g>
                );
            }
            if (d.type === 'fib') {
                // Simple Fib Retracement
                const y1 = pts[0].y;
                const y2 = pts[1].y;
                const height = y2 - y1;
                const levels = [0, 0.382, 0.5, 0.618, 1];
                
                return (
                    <g key={d.id} onClick={() => deleteDrawing(d.id)} style={{ cursor: 'pointer' }}>
                        {/* Trend Line */}
                         <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke="gray" strokeDasharray="4" />
                        {levels.map(l => {
                            const levelY = y1 + height * l;
                            return (
                                <line key={l} x1={pts[0].x} y1={levelY} x2={pts[1].x} y2={levelY} stroke={l === 0.5 || l === 0.618 ? 'lime' : 'white'} strokeWidth="1" />
                            );
                        })}
                    </g>
                );
            }
            return null;
        });
    };


    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h2 style={{color: 'white', margin: 0}}>Details: {new Date(insideCandle.candle.date).toLocaleString('en-US', { timeZone: 'America/New_York' })} (NY)</h2>
                    
                    {/* Toolbar */}
                    <div style={{ display: 'flex', gap: '10px', backgroundColor: '#333', padding: '5px', borderRadius: '5px' }}>
                         <button 
                            onClick={() => setActiveTool('line')} 
                            style={{ padding: '5px 10px', background: activeTool === 'line' ? '#3b82f6' : 'transparent', color: 'white', border: '1px solid #555', borderRadius: '3px', cursor: 'pointer' }}
                        >
                            Line
                        </button>
                        <button 
                            onClick={() => setActiveTool('box')} 
                            style={{ padding: '5px 10px', background: activeTool === 'box' ? '#3b82f6' : 'transparent', color: 'white', border: '1px solid #555', borderRadius: '3px', cursor: 'pointer' }}
                        >
                            Box
                        </button>
                         <button 
                            onClick={() => setActiveTool('fib')} 
                            style={{ padding: '5px 10px', background: activeTool === 'fib' ? '#3b82f6' : 'transparent', color: 'white', border: '1px solid #555', borderRadius: '3px', cursor: 'pointer' }}
                        >
                            Fib
                        </button>
                         <button 
                            onClick={() => { setActiveTool(null); setCurrentPoints([]); }} 
                            style={{ padding: '5px 10px', background: '#f44336', color: 'white', border: '1px solid #555', borderRadius: '3px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>

                    <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Close</button>
                </div>

                {loading && <div style={{ color: 'white' }}>Loading charts...</div>}
                {error && <div style={{ color: 'red' }}>{error}</div>}

                <div style={{ display: 'flex', gap: '10px', height: '600px' }}>
                    
                    {/* 20m Chart */}
                    <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ color: '#aaa', marginTop: 0 }}>20m Context</h3>
                        <div ref={chartContainer20mRef} style={{ flex: 1, width: '100%' }}></div>
                    </div>

                    {/* 5m Chart (With Drawing Overlay) */}
                    <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                         <h3 style={{ color: '#aaa', marginTop: 0 }}>5m Monitor</h3>
                         
                         <div style={{ position: 'relative', flex: 1, width: '100%' }}>
                             {/* Chart Container */}
                             <div ref={chartContainer5mRef} style={{ width: '100%', height: '100%' }}></div>
                             
                             {/* Drawing Overlay */}
                             <div 
                                style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    width: '100%', 
                                    height: '100%', 
                                    pointerEvents: activeTool ? 'auto' : 'none',
                                    zIndex: 2,
                                    cursor: activeTool ? 'crosshair' : 'default'
                                }}
                                onClick={handleOverlayClick}
                                onMouseMove={handleOverlayMouseMove}
                            >
                                <svg width="100%" height="100%" style={{ pointerEvents: 'none' }}> 
                                    <g style={{ pointerEvents: 'auto' }}>
                                        {renderDrawings()}
                                    </g>
                                    {currentPoints.length === 1 && chart5mInstance.current && series5mRef.current && (
                                        (() => {
                                            const p1 = currentPoints[0];
                                            const api = chart5mInstance.current;
                                            const series = series5mRef.current;
                                            const x = api.timeScale().timeToCoordinate(p1.time as Time);
                                            const y = series.priceToCoordinate(p1.price);
                                            if (x === null || y === null) return null;
                                            return <circle cx={x} cy={y} r="4" fill="yellow" stroke="white" />;
                                        })()
                                    )}
                                </svg>
                            </div>
                         </div>
                    </div>

                </div>
                
                <div style={{ marginTop: '20px', backgroundColor: '#333', padding: '15px', borderRadius: '8px', color: 'white' }}>
                    <h4>Candle Details</h4>
                    <pre>{JSON.stringify(insideCandle, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
