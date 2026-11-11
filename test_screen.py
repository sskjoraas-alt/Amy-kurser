import sys

import screen


def test_metrics_for_few_bars_is_none():
    assert screen.metrics([10.0] * 129, [1000.0] * 129, [100.0] * 129) is None


def test_metrics_returns():
    closes = [100.0] * 126 + [110.0] * 126  # +10 % for 126 dager siden, flatt etterpå
    m = screen.metrics(closes, [1000.0] * 252, [100.0] * 252)
    assert m["r6m"] == 10.0 and m["r3m"] == 0.0 and m["r1m"] == 0.0
    assert m["rs3m"] == 0.0 and m["from_high"] == 0.0 and m["vol_ratio"] == 1.0
    assert m["turnover"] == 110.0 * 1000.0


def test_metrics_relative_strength_and_drawdown():
    closes = [100.0] * 189 + [120.0] * 62 + [108.0]  # topp 120, nå 108
    idx = [100.0] * 251 + [105.0]
    m = screen.metrics(closes, [1000.0] * 252, idx)
    assert m["r3m"] == 8.0 and m["rs3m"] == 3.0 and m["from_high"] == -10.0


def test_rank_scores_orders_best_first():
    rows = [{"sym": s, "r1m": v, "r3m": v, "r6m": v, "rs3m": v, "vol_ratio": v, "from_high": v}
            for s, v in (("A", 1.0), ("B", 3.0), ("C", 2.0))]
    out = screen.rank_scores(rows)
    assert [r["sym"] for r in out] == ["B", "C", "A"]
    assert out[0]["score"] == 100.0 and out[-1]["score"] == 0.0


def test_rank_scores_single_row_gets_full_score():
    out = screen.rank_scores([{"sym": "A", "r1m": 1, "r3m": 1, "r6m": 1, "rs3m": 1, "vol_ratio": 1, "from_high": 1}])
    assert out[0]["score"] == 100.0


if __name__ == "__main__":
    bad = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except Exception as e:  # noqa: BLE001
                bad += 1
                print("FAIL", name, repr(e))
    sys.exit(1 if bad else 0)
