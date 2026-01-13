import { Candle } from '@prisma/client';
import { Strategies } from './strategies';
import { SimulationResult, StrategyConfig } from './types';

export class SimulationEngine {
  static run(
    ticker: string,
    candles: Candle[],
    config: StrategyConfig,
    strategyName: string
  ): SimulationResult {
    const strategyFn = Strategies[strategyName];
    if (!strategyFn) throw new Error(`Strategy ${strategyName} not found`);

    let cash = 0;
    let shares = 0;
    let totalInvested = 0;
    let trades = 0;
    const history = [];
    const yearlyStats: any[] = [];

    // Group candles by month to manage monthly budget
    // But for streaming simulation, we just iterate.
    // We need to know "Is this start of month?" to add funds.
    
    let currentMonth = -1;
    let monthlyBudgetAvailable = false;
    let currentMonthBudget = 0;

    // Annual Return Tracking
    let currentTrackingYear = -1;
    let yearOpenPrice = 0;
    // Isolated Yearly Stats
    let sharesBoughtThisYear = 0;
    let costOfTradesThisYear = 0;
    let allocatedThisYear = 0;

    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        const date = new Date(candle.date);
        const year = date.getFullYear();
        
        // Track Start of Year Data
        if (year !== currentTrackingYear) {
             currentTrackingYear = year;
             yearOpenPrice = candle.open;
             // Reset isolated stats
             sharesBoughtThisYear = 0;
             costOfTradesThisYear = 0;
             allocatedThisYear = 0;
        }

        const month = date.getMonth(); // 0-11

        let isStartOfMonth = false;
        
        // New Month Check
        if (month !== currentMonth) {
            currentMonth = month;
            isStartOfMonth = true;
            
            // Add monthly contribution
            cash += config.monthlyAmount;
            currentMonthBudget = config.monthlyAmount; // Track specific budget for "force buy" logic
            monthlyBudgetAvailable = true;
            totalInvested += config.monthlyAmount;
            allocatedThisYear += config.monthlyAmount;
        }

        // Run Strategy
        // We only buy if we have budget/cash.
        // Strategies like RSI might signal multiple times. 
        // We assume we invest the "monthly budget" once per month when signal hits.
        // OR do we invest ALL available cash? 
        // Standard DCA/Timing comparison usually implies investing the monthly allotment.
        
        if (monthlyBudgetAvailable) {
            const prevCandles = candles.slice(Math.max(0, i - 10), i);
            const result = strategyFn(candle, prevCandles, config, date, isStartOfMonth);

            // Last day of month Force Buy logic for "Timing" strategies
            // If we haven't bought yet and it's the last available candle of the month...
            // Finding last day of month in stream: check if next candle is different month or i is last.
            let isLastDayOfMonth = false;
            if (i === candles.length - 1) {
                isLastDayOfMonth = true;
            } else {
                const nextDate = new Date(candles[i+1].date);
                if (nextDate.getMonth() !== month) {
                    isLastDayOfMonth = true;
                }
            }

            // Execute Trade
            if (result.shouldBuy || (isLastDayOfMonth && monthlyBudgetAvailable && strategyName !== 'DCA')) {
                // Determine price:
                // If forced buy at end of month, usually buy at Close.
                // If signal buy, use signal price (Close or specific level).
                
                let buyPrice = result.price || candle.close;
                let reason = result.reason;

                if (!result.shouldBuy && isLastDayOfMonth) {
                    buyPrice = candle.close;
                    reason = 'End of Month Force Buy';
                }

                const sharesToBuy = currentMonthBudget / buyPrice;
                shares += sharesToBuy;
                cash -= currentMonthBudget; // Deduced specifically what we put in
                monthlyBudgetAvailable = false;
                trades++;
                
                // Track isolated stats
                sharesBoughtThisYear += sharesToBuy;
                costOfTradesThisYear += currentMonthBudget; // Or calculate precise price buy, but currentMonthBudget is accurate for cost basis

                history.push({
                    date: date,
                    action: 'BUY' as const,
                    price: buyPrice,
                    shares: sharesToBuy,
                    investedAmount: currentMonthBudget,
                    portfolioValue: shares * candle.close + cash
                });
            }
        } // End if (monthlyBudgetAvailable)
        
            // --- Calculate Yearly Stats ---
            let isLastDayOfYear = false;
            
            if (i === candles.length - 1) {
                isLastDayOfYear = true;
            } else {
                 const nextDate = new Date(candles[i+1].date);
                 if (nextDate.getFullYear() !== year) {
                     isLastDayOfYear = true;
                 }
            }
    
            if (isLastDayOfYear) {
                const currentVal = shares * candle.close + cash;
                const profit = currentVal - totalInvested;
                
                // Market Return (Buy & Hold from Jan 1 Open of THIS year to Dec 31 Close)
                // We use yearOpenPrice tracked at start of year
                const marketRet = yearOpenPrice > 0 ? ((candle.close - yearOpenPrice) / yearOpenPrice) * 100 : 0;

                // Strategy Return (Annual Isolated)
                // We simulate: If we started with 0 shares and just did the trades of this year.
                // Value = (SharesBoughtThisYear * ClosePrice) + (CashRemainingThisYear)
                // CashRemainingThisYear = AllocatedThisYear - CostOfTradesThisYear
                // Return = (Value - AllocatedThisYear) / AllocatedThisYear
                const cashRemainingThisYear = allocatedThisYear - costOfTradesThisYear;
                const yearValue = (sharesBoughtThisYear * candle.close) + cashRemainingThisYear;
                const strategyRet = allocatedThisYear > 0 ? ((yearValue - allocatedThisYear) / allocatedThisYear) * 100 : 0;

                yearlyStats.push({
                    year: year,
                    value: currentVal,
                    profit: profit,
                    yearReturn: strategyRet,
                    marketReturn: marketRet
                });
            }
    } // End for loop

        const finalPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
        const finalValue = shares * finalPrice + cash;
        const totalReturnPct = totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0;
    
        return {
            strategyName,
            totalInvested,
            finalValue,
            totalReturnPct,
            trades,
            history,
            yearlyStats,
            priceHistory: candles.map(c => ({ date: c.date, close: c.close }))
    };
  }
}
