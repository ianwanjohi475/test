"""Performance metrics. These numbers — not hopes — decide whether the
strategy ever touches real money."""

import numpy as np
import pandas as pd

from .backtest import BacktestResult

TRADING_DAYS = 252


def summarize(result: BacktestResult, starting_equity: float = 10_000.0) -> dict:
    trades = result.trades
    curve = result.equity_curve

    if not trades:
        return {"trades": 0, "note": "No trades taken (filter kept the bot flat)."}

    pnls = np.array([t.pnl for t in trades])
    rs = np.array([t.r_multiple for t in trades])
    wins, losses = pnls[pnls > 0], pnls[pnls <= 0]

    gross_win = wins.sum() if len(wins) else 0.0
    gross_loss = -losses.sum() if len(losses) else 0.0

    daily_ret = curve.pct_change().dropna()
    years = max(len(curve) / TRADING_DAYS, 1e-9)
    final = curve.iloc[-1]

    rolling_peak = curve.cummax()
    max_dd = ((curve - rolling_peak) / rolling_peak).min()

    return {
        "trades": len(trades),
        "win_rate": len(wins) / len(trades),
        "profit_factor": gross_win / gross_loss if gross_loss else float("inf"),
        "expectancy_R": rs.mean(),  # average R per trade; > 0 means an edge
        "avg_win": wins.mean() if len(wins) else 0.0,
        "avg_loss": losses.mean() if len(losses) else 0.0,
        "total_return": final / starting_equity - 1,
        "cagr": (final / starting_equity) ** (1 / years) - 1,
        "max_drawdown": max_dd,
        "sharpe": (
            daily_ret.mean() / daily_ret.std() * np.sqrt(TRADING_DAYS)
            if daily_ret.std() > 0
            else 0.0
        ),
        "halted_by_kill_switch": result.halted_early,
    }


def print_report(stats: dict, title: str = "Backtest report") -> None:
    print(f"\n=== {title} ===")
    if stats.get("trades", 0) == 0:
        print(stats.get("note", "No trades."))
        return
    print(f"Trades:            {stats['trades']}")
    print(f"Win rate:          {stats['win_rate']:.1%}")
    print(f"Profit factor:     {stats['profit_factor']:.2f}   (>1.0 = profitable)")
    print(f"Expectancy:        {stats['expectancy_R']:+.2f} R  (>0 = edge exists)")
    print(f"Avg win / loss:    {stats['avg_win']:+,.2f} / {stats['avg_loss']:+,.2f}")
    print(f"Total return:      {stats['total_return']:+.1%}")
    print(f"CAGR:              {stats['cagr']:+.1%}")
    print(f"Max drawdown:      {stats['max_drawdown']:.1%}")
    print(f"Sharpe ratio:      {stats['sharpe']:.2f}")
    if stats["halted_by_kill_switch"]:
        print("!! Kill switch fired: 20% drawdown reached, trading halted.")
    print()

    pf, exp = stats["profit_factor"], stats["expectancy_R"]
    if pf >= 1.3 and exp > 0.1 and not stats["halted_by_kill_switch"]:
        verdict = (
            "PROMISING on this data. Next step: walk-forward test on unseen "
            "years, then a demo account for at least 4 weeks. NOT real money yet."
        )
    elif pf > 1.0:
        verdict = (
            "MARGINAL. Edge is thin and could be noise or vanish after costs "
            "rise. Do not fund this."
        )
    else:
        verdict = (
            "LOSING on this data. The strategy has no edge here — better to "
            "know now with fake money than later with real money."
        )
    print(f"Verdict: {verdict}")
