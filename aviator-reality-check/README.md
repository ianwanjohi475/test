# Aviator Reality Check

**This is not a predictor. It is the tool that proves a predictor cannot
exist** — run it yourself instead of taking anyone's word (including mine).

## What it does

1. Simulates crash-game rounds with the same provably-fair mechanism
   Spribe-style games use: an HMAC hash chain fixes every crash point
   before the round is played, with P(crash ≥ x) ≈ 0.97/x (3% house edge).
2. Trains real ML models (logistic regression + gradient boosting) to
   predict "next round ≥ 2x" from history — lags, rolling averages, red
   streaks: every pattern gamblers watch.
3. Reports **out-of-sample** accuracy vs the do-nothing baseline, and the
   bankroll you'd have betting the model's calls.
4. Accepts real multipliers copied from any site's history tab
   (Betika, SportPesa, etc. — same Spribe engine underneath).

## Run it

```bash
pip install pandas numpy scikit-learn

# On simulated provably-fair rounds:
python reality_check.py

# On real data: copy multipliers from the game history into a text file,
# one number per line, oldest first, then:
python reality_check.py --csv mydata.csv
```

## What you will see, every time

```
LogisticRegression:  train 51.5% | TEST 51.9% | edge over guessing: -0.0%
GradientBoosting:    train 54.0% | TEST 51.6% | edge over guessing: -0.3%
                     bankroll if you bet its calls: -103 units (-2.9% per bet)
```

- **TEST accuracy = the baseline.** No model beats "just guess the majority",
  because consecutive rounds are cryptographically independent. There is no
  signal in the history — on any site, with any amount of data, retrained
  as often as you like.
- **Train accuracy above baseline is the scam mechanism.** Models happily
  memorize noise in past data. A seller shows you that number ("54%! 70%!
  90%!") as "proof". Out of sample it evaporates.
- **Bankroll per bet ≈ -3% = the house edge.** The best possible strategy
  loses exactly the house edge. The only winning move is not to play.

## Why prediction is impossible (one paragraph)

The crash multiplier is computed from a hash of a server seed before the
round starts, and published for verification after. A cryptographic hash is
designed so its outputs are indistinguishable from random and independent of
each other — if round history could predict the next hash output, the same
technique would break the encryption protecting every bank on earth. Nobody
selling a KSh 5,000 Telegram predictor has broken SHA-256.
