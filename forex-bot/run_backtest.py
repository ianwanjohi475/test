#!/usr/bin/env python3
"""Run the trend-following bot over historical data and print an honest report.

Examples
--------
# Real EUR/USD daily history from Stooq (free, no API key):
python3 run_backtest.py --source stooq --symbol eurusd

# Real data via Yahoo Finance (needs: pip install yfinance):
python3 run_backtest.py --source yahoo --symbol EURUSD=X

# Your own CSV (Date,Open,High,Low,Close):
python3 run_backtest.py --source csv --path mydata.csv

# Engine self-check on synthetic data (validates the machinery ONLY —
# says nothing about real-market profitability):
python3 run_backtest.py --source synthetic
"""

import argparse

from bot import data as datalib
from bot.backtest import CostModel, run_backtest
from bot.metrics import print_report, summarize
from bot.risk import RiskParams
from bot.strategy import StrategyParams


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", choices=["stooq", "yahoo", "csv", "synthetic"],
                    default="stooq")
    ap.add_argument("--symbol", default="eurusd")
    ap.add_argument("--path", help="CSV path when --source csv")
    ap.add_argument("--equity", type=float, default=10_000.0)
    ap.add_argument("--risk", type=float, default=0.01,
                    help="fraction of equity risked per trade (default 1%%)")
    ap.add_argument("--spread-pips", type=float, default=1.0)
    ap.add_argument("--pip", type=float, default=0.0001,
                    help="pip size (0.01 for JPY pairs)")
    args = ap.parse_args()

    if args.source == "stooq":
        df = datalib.download_stooq(args.symbol)
    elif args.source == "yahoo":
        df = datalib.download_yahoo(args.symbol)
    elif args.source == "csv":
        if not args.path:
            ap.error("--source csv requires --path")
        df = datalib.load_csv(args.path)
    else:
        df = datalib.synthetic_market()

    print(f"Data: {len(df)} daily bars, {df.index[0].date()} → {df.index[-1].date()}")

    result = run_backtest(
        df,
        strat=StrategyParams(),
        risk=RiskParams(risk_per_trade=args.risk),
        costs=CostModel(pip=args.pip, spread_pips=args.spread_pips),
        starting_equity=args.equity,
    )
    stats = summarize(result, starting_equity=args.equity)
    title = f"{args.source}:{args.symbol}" if args.source != "synthetic" else \
        "SYNTHETIC DATA — engine self-check only, not a real result"
    print_report(stats, title)

    if args.source == "synthetic":
        print("Reminder: synthetic results validate the code, not the strategy.")
        print("Run with --source stooq for real EUR/USD history.")


if __name__ == "__main__":
    main()
