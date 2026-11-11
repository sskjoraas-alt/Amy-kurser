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


def _bars(n, px, vol):
    return {"c": [px] * n, "v": [vol] * n}


IDX = {"OSEBX": [100.0] * 252, "SP500": [100.0] * 252}


def test_build_drops_illiquid_and_short():
    bars = {"BIG.OL": _bars(252, 100.0, 1_000_000), "SMALL.OL": _bars(252, 1.0, 100), "NEW.OL": _bars(50, 100.0, 1_000_000)}
    out = screen.build(bars, IDX, {"NOK": 1.0, "USD": 10.0}, {"BIG.OL": "Big ASA"}, "2026-11-11T21:50:00Z")
    assert out["generated"] == "2026-11-11T21:50:00Z"
    assert out["universe"] == 3 and out["with_data"] == 2 and out["passed"] == 1
    assert [r["sym"] for r in out["top"]] == ["BIG.OL"] and out["top"][0]["turnover_nok"] == 100_000_000
    assert out["top"][0]["name"] == "Big ASA" and out["top"][0]["p"] == 100.0 and out["top"][0]["cur"] == "NOK"
    assert "turnover" not in out["top"][0]


def test_build_converts_turnover_to_nok():
    out = screen.build({"AAPL": _bars(252, 100.0, 10_000)}, IDX, {"NOK": 1.0, "USD": 10.0}, {}, "x")
    assert out["top"][0]["turnover_nok"] == 10_000_000 and out["top"][0]["cur"] == "USD"


def test_build_skips_stock_without_fx_rate():
    out = screen.build({"VOLV-B.ST": _bars(252, 100.0, 1_000_000)}, IDX, {"NOK": 1.0}, {}, "x")
    assert out["with_data"] == 1 and out["passed"] == 0 and out["top"] == []


def test_build_keeps_only_top_n():
    bars = {f"S{i}.OL": {"c": [100.0] * 251 + [100.0 + i], "v": [1_000_000] * 252} for i in range(60)}
    out = screen.build(bars, IDX, {"NOK": 1.0}, {}, "x")
    assert out["passed"] == 60 and len(out["top"]) == 40 and out["top"][0]["sym"] == "S59.OL"


def test_should_publish_needs_half_the_universe():
    assert screen.should_publish({"universe": 100, "with_data": 49, "top": [{}]}) is False
    assert screen.should_publish({"universe": 100, "with_data": 50, "top": [{}]}) is True
    assert screen.should_publish({"universe": 100, "with_data": 90, "top": []}) is False


def _fake(monkey_bars):
    screen.universe = lambda: (list(monkey_bars), {})
    screen.fetch_daily = lambda syms, chunk=200: {s: monkey_bars[s] for s in syms if monkey_bars.get(s)}
    screen.fetch_refs = lambda: (IDX, {"NOK": 1.0, "USD": 10.0})


def test_main_writes_file_when_data_is_good():
    import json, pathlib, tempfile
    _fake({"BIG.OL": _bars(252, 100.0, 1_000_000), "OK.OL": _bars(252, 50.0, 1_000_000)})
    path = pathlib.Path(tempfile.mkdtemp()) / "out" / "screen.json"
    assert screen.main(str(path)) == 0
    out = json.loads(path.read_text(encoding="utf-8"))
    assert out["universe"] == 2 and len(out["top"]) == 2 and out["generated"].endswith("Z")


def test_main_writes_nothing_when_most_symbols_lack_data():
    import pathlib, tempfile
    _fake({"BIG.OL": _bars(252, 100.0, 1_000_000), "A.OL": None, "B.OL": None})
    path = pathlib.Path(tempfile.mkdtemp()) / "screen.json"
    assert screen.main(str(path)) == 3 and not path.exists()


def test_main_writes_nothing_when_universe_is_empty():
    import pathlib, tempfile
    _fake({})
    path = pathlib.Path(tempfile.mkdtemp()) / "screen.json"
    assert screen.main(str(path)) == 3 and not path.exists()


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
