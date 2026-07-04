"""Risk management. This module is what keeps the account alive.

Hard rules, not suggestions:
- Fixed fractional sizing: risk at most `risk_per_trade` of current equity
  on any single trade (default 1%).
- Kill switch: if equity ever falls `max_drawdown_stop` below its peak
  (default 20%), the bot stops opening new trades permanently. A strategy
  in that much drawdown is broken or the market has changed; a human must
  review before it trades again.
- No martingale, no doubling after losses, ever.
"""

from dataclasses import dataclass


@dataclass
class RiskParams:
    risk_per_trade: float = 0.01  # fraction of equity risked per trade
    max_drawdown_stop: float = 0.20  # halt trading at this peak-to-trough loss


class RiskManager:
    def __init__(self, params: RiskParams, starting_equity: float):
        self.p = params
        self.peak_equity = starting_equity
        self.halted = False

    def position_size(self, equity: float, stop_distance: float) -> float:
        """Units of base currency such that hitting the stop loses
        risk_per_trade * equity. Returns 0 if trading is halted."""
        if self.halted or stop_distance <= 0:
            return 0.0
        return (equity * self.p.risk_per_trade) / stop_distance

    def update_equity(self, equity: float) -> None:
        self.peak_equity = max(self.peak_equity, equity)
        drawdown = 1 - equity / self.peak_equity
        if drawdown >= self.p.max_drawdown_stop:
            self.halted = True
