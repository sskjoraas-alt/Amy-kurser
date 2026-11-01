import json
import pathlib
import tempfile
import fetch

BARS = {
    "TOM.OL": [("2026-10-29T16:15:00+01:00", 94.5), ("2026-10-30T16:20:00+01:00", 95.9512345)],
    "MIPS.ST": [("2026-10-30T17:25:00+01:00", 383.4)],
    "SEKNOK=X": [("2026-10-30T17:00:00+00:00", 0.93631), ("2026-10-31T00:00:00+00:00", 0.9363)],
    "OSEBX.OL": [("2026-10-29T16:25:00+01:00", 1500.0), ("2026-10-30T16:25:00+01:00", 1515.0)],
}


def test_build_schema_and_rounding():
    out = fetch.build(BARS, ["TOM.OL", "MIPS.ST", "NOPE.OL"], now="2026-11-01T21:00:00Z")
    assert out["generated"] == "2026-11-01T21:00:00Z"
    q = out["quotes"]["TOM.OL"]
    assert q == {"p": 95.9512, "prev": 94.5, "chg": 1.54, "cur": "NOK", "t": "2026-10-30T16:20:00+01:00"}
    assert out["quotes"]["MIPS.ST"]["prev"] is None and out["quotes"]["MIPS.ST"]["cur"] == "SEK"
    assert out["fx"]["SEK"] == 0.9363
    assert out["idx"]["OSEBX"] == {"p": 1515.0, "chg": 1.0}
    assert out["missing"] == ["NOPE.OL"]


DAILY = {
    "MIPS.ST": [("2026-10-29", 411.0), ("2026-10-30", 418.2)],
    "TOM.OL": [("2026-10-29", 94.5), ("2026-10-30", 95.95)],
}


def test_daily_close_wins_after_market_close():
    out = fetch.build(BARS, ["MIPS.ST", "TOM.OL"], now="2026-11-01T21:00:00Z", daily=DAILY)
    m = out["quotes"]["MIPS.ST"]
    assert m["p"] == 418.2 and m["prev"] == 411.0 and m["t"].startswith("2026-10-30T17:30")
    assert out["quotes"]["TOM.OL"]["p"] == 95.95


def test_intraday_wins_during_trading():
    bars = {"TOM.OL": [("2026-11-02T10:15:00+01:00", 97.0)]}
    daily = {"TOM.OL": [("2026-10-30", 95.95), ("2026-11-02", 96.8)]}
    out = fetch.build(bars, ["TOM.OL"], now="2026-11-02T09:20:00Z", daily=daily)
    q = out["quotes"]["TOM.OL"]
    assert q["p"] == 97.0 and q["prev"] == 95.95 and q["t"] == "2026-11-02T10:15:00+01:00"


def test_never_holdings_fields():
    text = json.dumps(fetch.build(BARS, ["TOM.OL"], now="x"))
    for word in ("antall", "qty", "amount", "belop", "beholdning"):
        assert word not in text


def test_symbols_merge():
    tmp_path = pathlib.Path(tempfile.mkdtemp())
    (tmp_path / "universe.txt").write_text("TOM.OL\n# kommentar\nmips.st\n\n")
    (tmp_path / "extra.txt").write_text("TOM.OL\nNEW.ST  # ny\n")
    assert fetch.symbols(tmp_path) == ["TOM.OL", "MIPS.ST", "NEW.ST"]


def test_currency_rule():
    assert [fetch.currency(s) for s in ["A.OL", "B.ST", "C.CO", "D.HE", "E.DE", "AAPL"]] == ["NOK", "SEK", "DKK", "EUR", "EUR", "USD"]



def test_daily_today_during_trading_not_future():
    daily = {"MIPS.ST": [("2026-10-30", 418.2), ("2026-11-02", 420.0)]}
    out = fetch.build({}, ["MIPS.ST"], now="2026-11-02T10:00:00Z", daily=daily)
    q = out["quotes"]["MIPS.ST"]
    assert q["p"] == 420.0 and q["prev"] == 418.2
    assert q["t"] <= "2026-11-02T11:00:00+01:00", q["t"]

if __name__ == "__main__":
    import sys
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
