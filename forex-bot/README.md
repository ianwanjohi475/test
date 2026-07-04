# Trend-Following Forex Bot (with honest backtesting)

A rules-based trading bot built the right way round: **strategy → backtest on
real data → demo account → only then, maybe, small real money.**

## What it is

- **Strategy** (`bot/strategy.py`): 20/50 EMA crossover entries, taken **only**
  when ADX(14) > 25 confirms the market is actually trending. In ranging
  markets — where trend strategies bleed — the bot stays flat.
- **Exits**: initial stop at 2×ATR, take-profit at 2× the stop distance
  (1:2 risk-reward). An opposite crossover closes the trade early.
- **Risk management** (`bot/risk.py`): 1% of equity risked per trade, and a
  hard kill switch that permanently halts trading at 20% drawdown. No
  martingale. Ever.
- **Backtest engine** (`bot/backtest.py`): signals on bar close fill at the
  *next* bar's open (no lookahead), every fill pays spread + slippage, and
  when a bar touches both stop and target the **stop is assumed hit first**
  (pessimistic). If a backtest is going to lie, it lies against the strategy.

## Quick start

```bash
pip install -r requirements.txt

# Backtest on real EUR/USD daily history (free, no API key):
python3 run_backtest.py --source stooq --symbol eurusd

# Other pairs:
python3 run_backtest.py --source stooq --symbol gbpusd
python3 run_backtest.py --source stooq --symbol usdjpy --pip 0.01

# Engine self-check without internet:
python3 run_backtest.py --source synthetic
```

The report prints trades, win rate, profit factor, expectancy in R, max
drawdown, Sharpe — and a plain-language verdict.

## How to read the results

- **Expectancy (R)** is the number that matters: average profit per trade in
  units of risk. Positive after costs = edge. Negative = no edge, regardless
  of win rate.
- **Win rate is NOT the goal.** This strategy is designed to win roughly
  35–45% of trades with winners ~2× the size of losers. That is what positive
  expectancy usually looks like in trend following.
- **Profit factor > 1.3** and expectancy > +0.1R across several years is
  "promising", not "proven".

## The rules (non-negotiable)

1. **No real money until the gauntlet is passed**: profitable backtest over
   5+ years → still profitable on years it never saw → 4+ weeks profitable on
   a **demo account**.
2. **Nobody can promise a win rate.** Any bot or signal seller claiming
   "70% guaranteed" is lying. This repo measures instead of promising.
3. **Expect losing streaks.** A 40%-win-rate strategy will hit 6–8 losses in a
   row routinely. The 1% risk cap exists so that streak costs ~7% of the
   account, not the whole account.
4. **If the kill switch fires, stop.** A 20% drawdown means the market changed
   or the edge was never real. Review; don't re-fund and hope.

## Project layout

```
forex-bot/
├── run_backtest.py      # CLI entry point
├── requirements.txt
└── bot/
    ├── indicators.py    # EMA, ATR, ADX (no lookahead)
    ├── strategy.py      # entries/exits + regime filter
    ├── risk.py          # position sizing + drawdown kill switch
    ├── backtest.py      # event-driven engine with costs
    ├── metrics.py       # expectancy, profit factor, drawdown, verdict
    └── data.py          # Stooq/Yahoo/CSV loaders + synthetic self-check data
```

## Roadmap

- [ ] Walk-forward validation (train/test splits by year)
- [ ] Parameter sensitivity report (an edge that only exists at EMA 20/50
      exactly is not an edge)
- [ ] Demo-account paper trader via a broker API (e.g. Deriv/OANDA demo)
- [ ] Live-trading adapter — **only after** all of the above pass

## Disclaimer

Trading foreign exchange carries a high level of risk. Most retail traders
lose money. Nothing here is financial advice, and no past backtest guarantees
future results. Never trade money you cannot afford to lose.
