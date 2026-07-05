#!/usr/bin/env python3
"""Aviator Reality Check.

This is NOT a predictor. It is the tool that shows you why a predictor
cannot exist. It:

1. Simulates crash rounds using the same provably-fair scheme Spribe-style
   games use (HMAC-SHA256 of a server seed chain -> crash multiplier, with
   P(crash >= x) ~= (1 - house_edge) / x).
2. Trains a real ML model (gradient boosting / logistic regression) to
   predict "next round >= 2x" from round history — lags, rolling means,
   streaks: every feature gamblers believe in.
3. Reports honest out-of-sample accuracy vs the do-nothing baseline, and
   simulates the bankroll of betting on the model's predictions.
4. Can do the same on REAL multipliers you copy from any betting site's
   history tab (--csv yourdata.csv, one multiplier per line).

Spoiler: accuracy converges to the base rate (~48.5%) and the bankroll
converges to minus the house edge. On every site. Every time. Forever.
"""

import argparse
import hashlib
import hmac

import numpy as np
import pandas as pd

HOUSE_EDGE = 0.03  # ~3%, typical for Aviator-style games
TARGET = 2.0  # the "is next round >= 2x?" question


# ---------------------------------------------------------------- rounds
def provably_fair_rounds(n: int, server_seed: bytes = b"reality-check") -> np.ndarray:
    """Crash multipliers from an HMAC hash chain — the same *kind* of
    mechanism real crash games publish for verification. Each round's
    outcome is fixed by the seed chain before the round is played, and
    consecutive rounds are cryptographically independent."""
    out = np.empty(n)
    seed = server_seed
    for i in range(n):
        seed = hashlib.sha256(seed).digest()
        h = hmac.new(seed, b"round", hashlib.sha256).digest()
        # 52 bits of the hash -> uniform float in [0, 1)
        u = int.from_bytes(h[:7], "big") >> 4
        u /= 2**52
        crash = (1 - HOUSE_EDGE) / (1 - u)
        out[i] = max(1.0, np.floor(crash * 100) / 100)
    return out


def load_csv(path: str) -> np.ndarray:
    vals = pd.read_csv(path, header=None).iloc[:, 0].astype(float).values
    if len(vals) < 300:
        print(f"note: only {len(vals)} rounds — results will be noisy; "
              "the conclusion will not change.")
    return vals


# -------------------------------------------------------------- features
def build_features(mult: np.ndarray, n_lags: int = 10) -> pd.DataFrame:
    """Every 'pattern' gamblers watch, encoded as real features."""
    s = pd.Series(mult)
    df = pd.DataFrame({"y_next_ge_2x": (s.shift(-1) >= TARGET).astype(int)})
    for k in range(1, n_lags + 1):
        df[f"lag_{k}"] = s.shift(k - 1)
    df["roll_mean_5"] = s.rolling(5).mean()
    df["roll_mean_20"] = s.rolling(20).mean()
    df["share_low_10"] = (s < TARGET).rolling(10).mean()  # "lots of reds lately"
    # current streak of sub-2x rounds ("it's due!")
    low = (s < TARGET).astype(int)
    streak = low.groupby((low != low.shift()).cumsum()).cumsum() * low
    df["low_streak"] = streak
    return df.dropna()


# ----------------------------------------------------------------- model
def train_and_evaluate(mult: np.ndarray, label: str) -> None:
    from sklearn.ensemble import GradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression

    df = build_features(mult)
    split = int(len(df) * 0.7)  # train on the past, test on the future
    train, test = df.iloc[:split], df.iloc[split:]
    X_tr, y_tr = train.drop(columns="y_next_ge_2x"), train["y_next_ge_2x"]
    X_te, y_te = test.drop(columns="y_next_ge_2x"), test["y_next_ge_2x"]

    base_rate = y_te.mean()
    baseline = max(base_rate, 1 - base_rate)

    print(f"\n=== {label} ===")
    print(f"Rounds: {len(mult)} | share of rounds >= {TARGET}x in test data: "
          f"{base_rate:.1%}")
    print(f"Do-nothing baseline accuracy (always guess the majority): "
          f"{baseline:.1%}\n")

    models = {
        "LogisticRegression": LogisticRegression(max_iter=2000),
        "GradientBoosting": GradientBoostingClassifier(random_state=0),
    }
    for name, model in models.items():
        model.fit(X_tr, y_tr)
        acc_tr = model.score(X_tr, y_tr)
        acc_te = model.score(X_te, y_te)
        edge = acc_te - baseline
        print(f"{name:>20}:  train {acc_tr:.1%} | TEST {acc_te:.1%} "
              f"| edge over guessing: {edge:+.1%}")

        # Bet 1 unit at 2x cashout whenever the model says ">= 2x".
        pred = model.predict(X_te).astype(bool)
        actual = y_te.values.astype(bool)
        pnl = np.where(actual[pred], TARGET - 1, -1.0)
        n_bets = pred.sum()
        if n_bets:
            print(f"{'':>20}   bankroll if you bet its calls: "
                  f"{pnl.sum():+,.0f} units over {n_bets} bets "
                  f"({pnl.mean():+.1%} per bet; house edge is -3%)")
    print(
        "\nRead the TEST column, not train. Train accuracy above the baseline"
        "\nwith TEST at the baseline = the model memorized noise. That gap is"
        "\nwhat every 'predictor' seller shows you as proof."
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", help="file of real multipliers, one per line, "
                                  "oldest first (copy from the site's history)")
    ap.add_argument("--rounds", type=int, default=100_000)
    args = ap.parse_args()

    if args.csv:
        train_and_evaluate(load_csv(args.csv), f"REAL DATA: {args.csv}")
    else:
        train_and_evaluate(
            provably_fair_rounds(args.rounds),
            "SIMULATED provably-fair rounds (same mechanism as the real game)",
        )
        print(
            "\nNow do it with real site data: copy multipliers from the game's"
            "\nhistory into a text file (one number per line, oldest first) and"
            "\nrun:  python reality_check.py --csv mydata.csv"
            "\nThe numbers will say the same thing. That is the point."
        )


if __name__ == "__main__":
    main()
