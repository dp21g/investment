'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Activity, Calendar, Settings, Trash2, DownloadCloud,
  ChevronDown, ChevronUp, BarChart2, LineChart as LineChartIcon, X, Crown
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';

import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ChartDataLabels);

// --- COMPONENTS ---

const DateRangePicker = ({ startYear, endYear, onChange }: { startYear: number, endYear: number, onChange: (t: 'start'|'end', v: number) => void }) => {
  const years = Array.from({ length: 15 }, (_, i) => 2015 + i);
  return (
    <div className="flex items-center gap-1 bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700">
      <Calendar className="w-3.5 h-3.5 text-slate-400" />
      <select 
        value={startYear} 
        onChange={(e) => onChange('start', Number((e.target as HTMLSelectElement).value))}
        className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
      >
        {years.map(y => <option key={`start-${y}`} value={y}>{y}</option>)}
      </select>
      <span className="text-slate-500 text-xs">-</span>
      <select 
        value={endYear} 
        onChange={(e) => onChange('end', Number((e.target as HTMLSelectElement).value))}
        className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
      >
        {years.filter(y => y >= startYear).map(y => <option key={`end-${y}`} value={y}>{y}</option>)}
      </select>
    </div>
  );
};

// Adapted YearlyPerformanceChart using Chart.js simply because we have it, 
// or implementing the custom SVG one. The user liked the example UI, so let's try to mimic the SVG one 
// but mapped to our data structure.
const YearlyPerformanceChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;

  const chartData = {
    labels: data.map(d => d.year.toString()),
    datasets: [
      {
        label: 'Strategy',
        data: data.map(d => d.yearReturn),
        backgroundColor: (ctx: any) => ctx.raw >= 0 ? '#10b981' : '#ef4444',
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      },
      {
        label: 'Buy & Hold',
        data: data.map(d => d.marketReturn),
        backgroundColor: '#64748b',
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
        hidden: false // Show by default
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
        padding: { top: 20 }
    },
    plugins: {
      legend: { 
          display: true, 
          position: 'top' as const, 
          labels: { 
              color: '#94a3b8', 
              font: { size: 10 },
              usePointStyle: true,
              boxWidth: 6
          } 
      },
      tooltip: {
         enabled: false // Disable tooltips as per request since labels are shown
      },
      datalabels: {
          display: true,
          color: '#cbd5e1',
          anchor: 'end' as const,
          align: 'end' as const,
          offset: -2,
          font: { weight: 'bold' as const, size: 9 },
          formatter: (value: number) => value.toFixed(1) + '%'
      }
    },
    scales: {
      y: { 
        display: true,
        grid: { color: '#334155', drawBorder: false },
        ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v: any) => v + '%' } 
      },
      x: { 
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } } 
      }
    }
  };

  return (
    <div className="w-full h-32 mt-2">
       <Bar data={chartData} options={options} />
    </div>
  );
};

const TickerCard = ({ strategies, onShowDetails }: { strategies: any[], onShowDetails: (s: any) => void }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedStratId, setSelectedStratId] = useState(strategies[0].id);

  const activeStrategy = strategies.find(s => s.id === selectedStratId) || strategies[0];
  const summary = activeStrategy.summary; 
  const yearlyStats = activeStrategy.yearlyStats;

  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className={`bg-slate-900 rounded-xl border ${activeStrategy.isGlobalWinner ? 'border-yellow-500/50' : 'border-slate-800'} shadow-lg overflow-hidden transition-all duration-200 hover:border-slate-700 relative`}>
      {activeStrategy.isGlobalWinner && (
        <div className="absolute top-0 right-0 p-2 z-20">
            <div className="bg-yellow-500/10 p-1.5 rounded-full border border-yellow-500/30 flex items-center justify-center animate-pulse">
                <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
        </div>
      )}
      <div className={`h-1 w-full ${activeStrategy.color}`}></div>
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-[150px]">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg bg-slate-800 ${activeStrategy.textColor} border border-slate-700`}>
              {activeStrategy.ticker}
            </div>
            <div>
              {strategies.length > 1 ? (
                <div className="flex flex-wrap items-center gap-1 mb-1 max-w-[200px] md:max-w-none">
                    {strategies.map(s => (
                        <button
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedStratId(s.id); }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all border ${
                                selectedStratId === s.id 
                                ? 'bg-slate-700 text-white border-slate-600' 
                                : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800'
                            }`}
                        >
                            {s.strategyName}
                        </button>
                    ))}
                </div>
              ) : (
                <div className="font-bold text-white leading-tight text-sm mb-0.5">{activeStrategy.strategyName}</div>
              )}
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{activeStrategy.ticker} Analysis</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-8 items-center bg-slate-950/30 p-3 rounded-lg border border-slate-800/50">
            <div className="flex flex-col">
               <span className="text-[10px] text-slate-500 uppercase font-bold">Total Invested</span>
               <span className="text-slate-300 font-mono font-medium">{formatMoney(summary.totalInvested)}</span>
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] text-emerald-600 uppercase font-bold">Net Profit</span>
               <span className="text-emerald-400 font-mono font-bold">+{formatMoney(summary.finalValue - summary.totalInvested)}</span>
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] text-slate-400 uppercase font-bold">Final Value</span>
               <span className="text-white font-mono font-bold text-lg">{formatMoney(summary.finalValue)}</span>
            </div>
            <div className="flex items-center justify-end">
               <div className={`px-2 py-1 rounded font-bold text-sm border flex items-center gap-1
                  ${activeStrategy.isGlobalWinner ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
               `}>
                 {activeStrategy.isGlobalWinner && <Crown className="w-3 h-3 fill-yellow-400" />}
                 +{summary.totalReturnPct.toFixed(1)}%
               </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
                onClick={(e) => { e.stopPropagation(); onShowDetails(activeStrategy); }}
                className="hidden md:flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500 transition-all"
                title="View Chart"
            >
                <LineChartIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setIsExpanded(!isExpanded)} className="hidden md:flex text-slate-500 hover:text-white p-2">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2 pt-4 border-t border-slate-800/50">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Yearly Return % ({activeStrategy.strategyName})</span>
              </div>
            </div>
            <div className="px-2">
              <YearlyPerformanceChart data={yearlyStats} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import dynamic from 'next/dynamic';

const TVChart = dynamic(() => import('@/components/TVChart').then(mod => mod.TVChart), { 
    ssr: false,
    loading: () => <div className="h-[400px] w-full flex items-center justify-center text-slate-500 bg-slate-900">Loading Chart...</div>
});

const DetailedView = ({ result, onClose }: { result: any, onClose: () => void }) => {
  
  const chartProps = useMemo(() => {
     if (!result || !result.priceHistory) return null;

     // Transform data for lightweight-charts
     // distinct, sorted by time
     const data = result.priceHistory.map((p: any) => ({
         time: new Date(p.date).toISOString().split('T')[0],
         value: p.close
     })).sort((a: any, b: any) => (new Date(a.time).getTime() - new Date(b.time).getTime()));
     
     // Transform markers
     const markers = result.history
        .filter((h: any) => h.action === 'BUY')
        .map((h: any) => ({
             time: new Date(h.date).toISOString().split('T')[0],
             position: 'belowBar',
             color: '#10b981', // emerald-500
             shape: 'arrowUp',
             text: `Buy @ $${h.price.toFixed(0)}`
        }));

     return { data, markers };
  }, [result]);

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-slate-950/90 backdrop-blur pb-4 pt-2 border-b border-slate-800 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700">
                        <ChevronUp className="w-5 h-5 rotate-[-90deg]" /> Back
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{result.ticker} - {result.strategyName}</h2>
                        <p className="text-slate-400 text-sm">Detailed Trade Analysis {chartProps ? `(${chartProps.data.length} days)` : ''}</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-xl overflow-hidden">
                <div className="h-[400px] w-full">
                    {chartProps && (
                        <TVChart 
                            data={chartProps.data} 
                            markers={chartProps.markers}
                            colors={{
                                backgroundColor: '#0f172a', // slate-900
                                lineColor: '#38bdf8', // sky-400
                                areaTopColor: 'rgba(56, 189, 248, 0.2)', // sky-400/20
                                areaBottomColor: 'rgba(56, 189, 248, 0.0)',
                            }}
                        /> 
                    )}
                </div>
            </div>

            {/* Stats Table */}
             <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                 <div className="p-4 border-b border-slate-800">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" /> Trade History
                    </h3>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left text-slate-400">
                         <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                             <tr>
                                 <th className="px-6 py-3">Date</th>
                                 <th className="px-6 py-3">Action</th>
                                 <th className="px-6 py-3 text-right">Price</th>
                                 <th className="px-6 py-3 text-right">Invested</th>
                                 <th className="px-6 py-3 text-right">Shares</th>
                                 <th className="px-6 py-3 text-right">Value</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                             {result.history.slice().reverse().map((trade: any, i: number) => (
                                 <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                     <td className="px-6 py-3 font-mono">{new Date(trade.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                     <td className="px-6 py-3">
                                         <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                                            {trade.action}
                                         </span>
                                     </td>
                                     <td className="px-6 py-3 text-right font-mono text-white">${trade.price.toFixed(2)}</td>
                                     <td className="px-6 py-3 text-right font-mono">${trade.investedAmount.toFixed(0)}</td>
                                     <td className="px-6 py-3 text-right font-mono text-slate-300">{trade.shares.toFixed(4)}</td>
                                     <td className="px-6 py-3 text-right font-mono text-indigo-300">${trade.portfolioValue.toFixed(2)}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        </div>
    </div>
  );
};

export default function StrategyAnalyzer() {
  const [selectedResult, setSelectedResult] = useState<any>(null); // New state for modal

  const [monthlyAmount, setMonthlyAmount] = useState(1000);
  const [dateRange, setDateRange] = useState({ start: 2020, end: 2025 });
  const [showConfig, setShowConfig] = useState(false);
  const [myTickers, setMyTickers] = useState<string[]>(['QQQ', 'VOO', 'VTI']);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [newTickerInput, setNewTickerInput] = useState('');

  // Initial load
  useEffect(() => {
    runSimulation();
  }, []); // Run once on mount

  // Watch for criteria changes to auto-run? Or manual run?
  // User flow: Updates inputs -> Clicks Run? 
  // Example UI is auto-reactive? Let's make it manual for now or debounced.
  useEffect(() => {
      const timer = setTimeout(() => {
          runSimulation();
      }, 800);
      return () => clearTimeout(timer);
  }, [monthlyAmount, dateRange, myTickers]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: myTickers,
          monthlyAmount,
          startYear: dateRange.start,
          endYear: dateRange.end
        })
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Simulation failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncLog([]);
    // ... (Sync logic same as before, but maybe moved to ConfigModal)
    // For brevity, using simplified sync here used in ConfigModal
    try {
        for (const ticker of myTickers) {
             setSyncLog(prev => [...prev, `Syncing ${ticker}...`]);
             await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickers: [ticker], startYear: dateRange.start }) // Sync from start date
             });
             setSyncLog(prev => [...prev, `✓ ${ticker} Done`]);
        }
    } catch(e) { console.error(e); }
    setSyncing(false);
  };

  const handleAddTicker = () => {
      if (newTickerInput && !myTickers.includes(newTickerInput.toUpperCase())) {
          setMyTickers([...myTickers, newTickerInput.toUpperCase()]);
          setNewTickerInput('');
      }
  };

  const tickerGroups = useMemo(() => {
    if (!results.length) return {};
    
    // Find global max return
    let globalMaxReturn = -Infinity;
    results.forEach((r: any) => {
        if (r.totalReturnPct > globalMaxReturn) globalMaxReturn = r.totalReturnPct;
    });

    const groups: Record<string, any[]> = {};
    results.forEach((r: any) => {
        const enhanced = {
            ...r,
            id: `${r.ticker}-${r.strategyName}`,
            summary: {
                totalInvested: r.totalInvested,
                finalValue: r.finalValue,
                totalReturnPct: r.totalReturnPct
            },
            isGlobalWinner: r.totalReturnPct === globalMaxReturn,
            color: r.ticker === 'QQQ' ? 'bg-emerald-500' : r.ticker === 'VOO' ? 'bg-indigo-500' : 'bg-purple-500',
            textColor: r.ticker === 'QQQ' ? 'text-emerald-400' : r.ticker === 'VOO' ? 'text-indigo-400' : 'text-purple-400',
        };

        if (!groups[r.ticker]) groups[r.ticker] = [];
        groups[r.ticker].push(enhanced);
    });
    
    // Sort
    Object.keys(groups).forEach(k => {
        groups[k].sort((a, b) => b.totalReturnPct - a.totalReturnPct);
    });

    return groups;
  }, [results]);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-3 md:p-6" suppressHydrationWarning>
       {/* DETAILED VIEW MODAL */}
       {selectedResult && (
         <DetailedView result={selectedResult} onClose={() => setSelectedResult(null)} />
       )}
       {/* CONFIG MODAL */}
       {showConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" /> Configuration
              </h2>
              <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white text-sm">Close</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Add Ticker</label>
                <div className="flex gap-2">
                  <input 
                    value={newTickerInput}
                    onChange={(e) => setNewTickerInput((e.target as HTMLInputElement).value)}
                    placeholder="e.g. MSFT"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none uppercase"
                  />
                  <button onClick={handleAddTicker} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold">Add</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                    <span>Active Tickers</span>
                    <button onClick={handleSync} disabled={syncing} className="text-blue-400 hover:underline">{syncing ? 'Syncing...' : 'Sync All Data'}</button>
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {myTickers.map(t => (
                    <div key={t} className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                      <span className="font-bold text-white text-sm">{t}</span>
                      <button onClick={() => setMyTickers(prev => prev.filter(x => x !== t))} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Log */}
                <div className="text-[10px] font-mono text-green-400 mt-2 h-20 overflow-y-auto bg-black p-2 rounded">
                    {syncLog.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
       )}

      <div className="max-w-4xl mx-auto space-y-4">
        {/* HEADER */}
        <div className="bg-slate-900 rounded-xl p-3 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3 sticky top-0 z-40 backdrop-blur-md bg-slate-900/90">
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="bg-indigo-500/10 p-2 rounded-lg">
                 <TrendingUp className="w-6 h-6 text-indigo-500" />
               </div>
               <div>
                 <h1 className="text-xl font-bold text-white leading-tight">Strategy Analyzer</h1>
                 <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                   {(dateRange.end - dateRange.start) * 12} MONTHS ({dateRange.start}-{dateRange.end})
                 </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
               <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monthly</span>
                  <div className="flex items-center text-emerald-400 font-bold font-mono text-lg">
                     <span className="mr-1">$</span>
                     <input 
                       type="number" 
                       min="0" step="50"
                       value={monthlyAmount}
                       onChange={(e) => setMonthlyAmount(Number((e.target as HTMLInputElement).value))}
                       className="bg-transparent w-16 focus:outline-none text-right placeholder-emerald-700"
                     />
                  </div>
               </div>
              <DateRangePicker startYear={dateRange.start} endYear={dateRange.end} onChange={(t, val) => setDateRange(prev => ({ ...prev, [t]: val }))} />
              <button onClick={() => setShowConfig(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg border border-slate-700 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
           </div>
        </div>

        {/* TICKER CARDS LIST */}
        <div className="space-y-4">
          {Object.keys(tickerGroups).length === 0 && !loading && (
             <div className="text-center text-slate-500 py-10">No data found. Check configuration or run Sync.</div>
          )}
          {Object.keys(tickerGroups).map(ticker => (
            <TickerCard 
              key={ticker} 
              strategies={tickerGroups[ticker]} 
              onShowDetails={(strat) => setSelectedResult(strat)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
