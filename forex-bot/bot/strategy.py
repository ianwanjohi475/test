"""Trend-following strategy with a regime filter.

Rules
-----
Entry (long):  fast EMA crosses above slow EMA AND ADX > adx_threshold.
Entry (short): fast EMA crosses below slow EMA AND ADX > adx_threshold.
No entry when ADX is below the threshold — a ranging market is the main
condition in which trend strategies bleed, so the bot stays flat.

Exit: initial stop at `atr_mult` * ATR from entry, take-profit at
`rr` times the stop distance (positive expectancy comes from winners being
larger than losers, not from a high win rate). An opposite crossover also
closes the position early.

Signals are generated on bar close and executed on the NEXT bar's open by
the backtest engine, so there is no lookahead bias.
"""

from dataclasses import dataclass

import pandas as pd

from .indicators import adx, atr, ema

LONG, SHORT, FLAT = 1, -1, 0


@dataclass
class StrategyParams:
    ema_fast: int = 20
    ema_slow: int = 50
    adx_period: int = 14
    adx_threshold: float = 25.0
    atr_period: int = 14
    atr_mult: float = 2.0  # stop distance in ATRs
    rr: float = 2.0  # reward:risk ratio for take-profit


def build_signals(df: pd.DataFrame, p: StrategyParams) -> pd.DataFrame:
    """Return df with indicator columns and an `entry` column
    (LONG/SHORT/FLAT) computed on bar close."""
    out = df.copy()
    out["ema_fast"] = ema(out["Close"], p.ema_fast)
    out["ema_slow"] = ema(out["Close"], p.ema_slow)
    out["adx"] = adx(out, p.adx_period)
    out["atr"] = atr(out, p.atr_period)

    above = out["ema_fast"] > out["ema_slow"]
    cross_up = above & ~above.shift(1, fill_value=False)
    cross_down = ~above & above.shift(1, fill_value=True)

    trending = out["adx"] > p.adx_threshold

    out["entry"] = FLAT
    out.loc[cross_up & trending, "entry"] = LONG
    out.loc[cross_down & trending, "entry"] = SHORT

    # Opposite crossover (regardless of ADX) is an early-exit signal.
    out["exit_long"] = cross_down
    out["exit_short"] = cross_up

    # Indicators need warmup; suppress signals until the slowest one is valid.
    warmup = max(p.ema_slow, p.adx_period * 2, p.atr_period) + 5
    out.iloc[:warmup, out.columns.get_loc("entry")] = FLAT
    return out
