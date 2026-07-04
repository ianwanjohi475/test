"""Data loading: real history (Stooq or Yahoo), local CSV, or a synthetic
regime-switching market used only to validate that the engine works.

A synthetic backtest says NOTHING about real profitability — it exists so
the machinery can be tested anywhere. Judge the strategy only on real data.
"""

import io
import urllib.request

import numpy as np
import pandas as pd

STOOQ_URL = "https://stooq.com/q/d/l/?s={symbol}&i=d"


def _standardize(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.rename(columns=str.title)
    df.index = pd.to_datetime(df.index)
    cols = ["Open", "High", "Low", "Close"]
    return df[cols].dropna().astype(float)


def download_stooq(symbol: str = "eurusd") -> pd.DataFrame:
    """Free daily OHLC history, no API key. Symbols: eurusd, gbpusd, usdjpy…"""
    req = urllib.request.Request(
        STOOQ_URL.format(symbol=symbol), headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read().decode("utf-8-sig", errors="replace").strip()

    first_line = raw.splitlines()[0] if raw else ""
    if not first_line.lower().startswith("date"):
        raise RuntimeError(
            "Stooq did not return CSV price data. Response began with: "
            f"{raw[:120]!r}. This usually means Stooq's free daily download "
            "limit was reached or the symbol is unknown. "
            "Try again tomorrow, or use: --source yahoo --symbol EURUSD=X"
        )
    df = pd.read_csv(io.StringIO(raw), index_col="Date")
    return _standardize(df)


def download_yahoo(symbol: str = "EURUSD=X", start: str = "2015-01-01") -> pd.DataFrame:
    import yfinance as yf

    df = yf.download(symbol, start=start, interval="1d", progress=False,
                     auto_adjust=True)
    if df is None or len(df) == 0:
        raise RuntimeError(
            f"Yahoo Finance returned no data for {symbol!r}. Check the "
            "symbol (FX pairs end in '=X', e.g. EURUSD=X) and your "
            "internet connection."
        )
    return _standardize(df)


def load_csv(path: str) -> pd.DataFrame:
    """CSV with Date,Open,High,Low,Close columns (extra columns ignored)."""
    df = pd.read_csv(path, index_col=0)
    return _standardize(df)


def synthetic_market(
    n_days: int = 2000, start_price: float = 1.10, seed: int = 42
) -> pd.DataFrame:
    """Regime-switching random walk: alternating uptrends, downtrends and
    ranges with realistic FX-scale daily volatility (~0.5%)."""
    rng = np.random.default_rng(seed)
    drifts = {"up": 0.0006, "down": -0.0006, "range": 0.0}
    regimes = ["up", "range", "down", "range"]

    log_price = np.log(start_price)
    closes = []
    day = 0
    while day < n_days:
        regime = regimes[(day // 150) % len(regimes)]
        length = min(150, n_days - day)
        rets = rng.normal(drifts[regime], 0.005, length)
        for r in rets:
            log_price += r
            closes.append(np.exp(log_price))
        day += length

    close = pd.Series(closes)
    open_ = close.shift(1).fillna(start_price)
    intrabar = np.abs(rng.normal(0, 0.003, n_days))
    high = np.maximum(open_.values, close.values) * (1 + intrabar)
    low = np.minimum(open_.values, close.values) * (1 - intrabar)

    idx = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=n_days)
    return pd.DataFrame(
        {"Open": open_.values, "High": high, "Low": low, "Close": close.values},
        index=idx,
    )
