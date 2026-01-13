# 🚀 QUICK START GUIDE

## Running the Analysis (Choose your OS)

### Windows:
1. Double-click `run_analysis.bat`
2. Wait for analysis to complete (10-30 seconds)
3. Check `output/` folder for results

### Mac/Linux:
1. Open Terminal
2. Navigate to this folder: `cd /path/to/investment_timing_analysis`
3. Run: `./run_analysis.sh`
4. Check `output/` folder for results

### Manual (Any OS):
```bash
# Install dependencies
pip install -r requirements.txt

# Run analysis
cd scripts
python run_analysis.py
```

## 📊 What You'll Get

After running:
- **Console output** - Summary of all strategies and years
- **data/*.csv** - Generated market data files
- **output/strategy_returns_by_year.csv** - Returns for each strategy
- **output/compound_results.csv** - 5-year compounded results

## 📖 Reading the Results

### Console Output Shows:
1. **Year-by-year performance** for all 6 strategies
2. **5-year summary** with total returns
3. **Winner announcement** (spoiler: RSI < 40)

### CSV Files Contain:
- Detailed returns for each strategy
- Compounded growth calculations
- Strategy comparisons

## 🎯 Key Takeaways

**WINNER: RSI < 40 Strategy**
- +32.68% return over 5 years
- Beat DCA by $1,778
- Only 5 min/month effort

**BASELINE: DCA (1st of month)**
- +29.72% return over 5 years
- Zero effort, fully automatic
- Only 0.70% behind optimal

## 📚 Full Documentation

See `docs/five_year_comprehensive_analysis.md` for:
- Complete strategy explanations
- Implementation guides
- Year-by-year breakdowns
- Market condition analysis
- Real-world execution tips

## ❓ Having Issues?

1. **Python not found?**
   - Install Python 3.8+ from python.org
   - Add to PATH during installation

2. **Import errors?**
   - Run: `pip install -r requirements.txt`

3. **Permission denied? (Mac/Linux)**
   - Run: `chmod +x run_analysis.sh`

4. **Still stuck?**
   - Check README.md for detailed troubleshooting

## 🎓 Next Steps

1. ✅ Run the analysis
2. 📖 Read full report in `docs/`
3. 🎯 Choose your strategy
4. 📱 Set up RSI alerts
5. 💰 Start investing!

---

**Remember:** Consistency beats perfection. Pick a strategy you'll actually use!
