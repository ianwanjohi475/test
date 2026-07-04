"""Event-driven backtest engine.

Honesty rules baked in:
- Signals form on bar close, orders fill at the NEXT bar's open (no lookahead).
- Every fill pays spread + slippage.
- If a bar touches both the stop and the take-profit, the STOP is assumed to
  have been hit first (pessimistic tie-break).
- Position sizing and the drawdown kill switch come from RiskManager.
"""

from dataclasses import dataclass, field

import pandas as pd

from .risk import RiskManager, RiskParams
from .strategy import FLAT, LONG, SHORT, StrategyParams, build_signals


@dataclass
class CostModel:
    pip: float = 0.0001  # pip size for the pair (0.01 for JPY pairs)
    spread_pips: float = 1.0  # full spread, paid on entry
    slippage_pips: float = 0.5  # paid on each fill


@dataclass
class Trade:
    entry_time: object
    exit_time: object
    side: int
    entry: float
    exit: float
    size: float
    pnl: float
    r_multiple: float
    reason: str


@dataclass
class BacktestResult:
    trades: list = field(default_factory=list)
    equity_curve: pd.Series = None
    halted_early: bool = False


def run_backtest(
    df: pd.DataFrame,
    strat: StrategyParams = None,
    risk: RiskParams = None,
    costs: CostModel = None,
    starting_equity: float = 10_000.0,
) -> BacktestResult:
    strat = strat or StrategyParams()
    risk = risk or RiskParams()
    costs = costs or CostModel()

    data = build_signals(df, strat)
    rm = RiskManager(risk, starting_equity)

    cost_per_fill = (costs.spread_pips / 2 + costs.slippage_pips) * costs.pip

    equity = starting_equity
    pos_side = FLAT
    pos_entry = pos_stop = pos_tp = pos_size = 0.0
    pos_entry_time = None
    pos_risk = 0.0  # currency amount risked on the open trade

    trades: list[Trade] = []
    curve = pd.Series(index=data.index, dtype=float)

    rows = list(data.itertuples())
    for i in range(1, len(rows)):
        prev, bar = rows[i - 1], rows[i]

        # ---- manage open position -------------------------------------
        if pos_side != FLAT:
            exit_price, reason = None, None

            # Early exit on opposite crossover signalled on the previous bar.
            if (pos_side == LONG and prev.exit_long) or (
                pos_side == SHORT and prev.exit_short
            ):
                exit_price, reason = bar.Open, "crossover"
            # Stop first (pessimistic), then take-profit, checked intra-bar.
            elif pos_side == LONG and bar.Low <= pos_stop:
                exit_price, reason = pos_stop, "stop"
            elif pos_side == LONG and bar.High >= pos_tp:
                exit_price, reason = pos_tp, "take_profit"
            elif pos_side == SHORT and bar.High >= pos_stop:
                exit_price, reason = pos_stop, "stop"
            elif pos_side == SHORT and bar.Low <= pos_tp:
                exit_price, reason = pos_tp, "take_profit"

            if exit_price is not None:
                fill = exit_price - pos_side * cost_per_fill
                pnl = pos_side * (fill - pos_entry) * pos_size
                equity += pnl
                rm.update_equity(equity)
                trades.append(
                    Trade(
                        entry_time=pos_entry_time,
                        exit_time=bar.Index,
                        side=pos_side,
                        entry=pos_entry,
                        exit=fill,
                        size=pos_size,
                        pnl=pnl,
                        r_multiple=pnl / pos_risk if pos_risk else 0.0,
                        reason=reason,
                    )
                )
                pos_side = FLAT

        # ---- new entry from previous bar's signal ----------------------
        if pos_side == FLAT and prev.entry != FLAT and not rm.halted:
            side = prev.entry
            stop_distance = strat.atr_mult * prev.atr
            size = rm.position_size(equity, stop_distance)
            if size > 0:
                fill = bar.Open + side * cost_per_fill
                pos_side = side
                pos_entry = fill
                pos_stop = fill - side * stop_distance
                pos_tp = fill + side * stop_distance * strat.rr
                pos_size = size
                pos_entry_time = bar.Index
                pos_risk = equity * rm.p.risk_per_trade

        # Mark equity to market for the curve.
        unrealized = (
            pos_side * (bar.Close - pos_entry) * pos_size if pos_side != FLAT else 0.0
        )
        curve.iloc[i] = equity + unrealized

    curve.iloc[0] = starting_equity
    curve = curve.ffill()
    return BacktestResult(trades=trades, equity_curve=curve, halted_early=rm.halted)
