"""Grovsil for Amy: regner nøkkeltall og poengsum for mange aksjer og skriver screen.json.

Filen inneholder bare offentlige tall. Aldri beholdning, antall eller beløp.
"""
import datetime
import json
import pathlib
import statistics
import sys
import time

LIQ_FLOOR_NOK = 5_000_000
TOP_N = 40
MIN_BARS = 130
WEIGHTS = {"r3m": 0.30, "r1m": 0.20, "r6m": 0.15, "rs3m": 0.15, "vol_ratio": 0.10, "from_high": 0.10}


def _ret(xs, days):
    """Avkastning i prosent over de siste `days` børsdagene."""
    if len(xs) <= days or not xs[-days - 1]:
        return None
    return round((xs[-1] / xs[-days - 1] - 1) * 100, 2)


def metrics(closes, volumes, idx_closes):
    """Nøkkeltall for én aksje. None når det er for få dagsstolper."""
    if len(closes) < MIN_BARS or len(volumes) < MIN_BARS:
        return None
    r3m = _ret(closes, 63)
    idx3 = _ret(idx_closes, 63) if idx_closes else None
    v5, v60 = statistics.fmean(volumes[-5:]), statistics.fmean(volumes[-60:])
    daily = [closes[i] / closes[i - 1] - 1 for i in range(len(closes) - 20, len(closes)) if closes[i - 1]]
    return {
        "r1m": _ret(closes, 21),
        "r3m": r3m,
        "r6m": _ret(closes, 126),
        "rs3m": round(r3m - idx3, 2) if r3m is not None and idx3 is not None else r3m,
        "vol_ratio": round(v5 / v60, 2) if v60 else None,
        "from_high": round((closes[-1] / max(closes[-252:]) - 1) * 100, 2),
        "volat": round(statistics.pstdev(daily) * (252 ** 0.5) * 100, 1) if len(daily) > 1 else None,
        "turnover": statistics.median(c * v for c, v in zip(closes[-20:], volumes[-20:])),
    }


def rank_scores(rows):
    """Legger score (0–100) på hver rad ut fra persentilrang, og sorterer best først."""
    n = len(rows)
    for r in rows:
        r["score"] = 0.0
    for key, w in WEIGHTS.items():
        vals = [r.get(key) if r.get(key) is not None else float("-inf") for r in rows]
        for r, v in zip(rows, vals):
            pr = 1.0 if n == 1 else sum(1 for x in vals if x < v) / (n - 1)
            r["score"] += 100 * w * pr
    for r in rows:
        r["score"] = round(r["score"], 1)
    return sorted(rows, key=lambda r: r["score"], reverse=True)


def _index_for(sym):
    """Nordiske og tyske aksjer måles mot OSEBX, USA (uten endelse) mot S&P 500."""
    return "OSEBX" if "." in sym else "SP500"


def build(bars, idx, fx, names, now):
    """bars[sym] = {"c": sluttkurser, "v": volum}. Gir innholdet i screen.json."""
    import fetch  # noqa: PLC0415 (deler valutaregelen med kursjobben)

    rows, with_data = [], 0
    for sym, b in bars.items():
        m = metrics(b.get("c") or [], b.get("v") or [], idx.get(_index_for(sym)) or [])
        if not m:
            continue
        with_data += 1
        cur = fetch.currency(sym)
        rate = fx.get(cur)
        if not rate:
            continue
        turnover_nok = round(m.pop("turnover") * rate)
        if turnover_nok < LIQ_FLOOR_NOK:
            continue
        rows.append({"sym": sym, "name": names.get(sym, ""), "cur": cur, "p": round(b["c"][-1], 4),
                     **m, "turnover_nok": turnover_nok})
    ranked = rank_scores(rows)
    return {"generated": now, "universe": len(bars), "with_data": with_data,
            "passed": len(ranked), "top": ranked[:TOP_N]}


def should_publish(out):
    """Publiser bare når minst halve universet ga data og lista ikke er tom."""
    return bool(out.get("top")) and out.get("with_data", 0) >= 0.5 * out.get("universe", 0)


# region -> (børsfilter eller None, høyst antall symboler). Mest omsatte først.
REGIONS = {"no": (None, 750), "se": (None, 750), "dk": (None, 750), "fi": (None, 750),
           "de": ("GER", 500), "us": (None, 2500)}
MIN_AVG_VOLUME = 20000


def universe():
    """Symboler og navn fra Yahoo sin aksjesøker, mest omsatte først per region."""
    import yfinance as yf  # noqa: PLC0415 (bare på GitHub)
    from yfinance import EquityQuery  # noqa: PLC0415

    syms, names = [], {}
    for region, (exchange, cap) in REGIONS.items():
        parts = [EquityQuery("eq", ["region", region]), EquityQuery("gt", ["avgdailyvol3m", MIN_AVG_VOLUME])]
        if exchange:
            parts.append(EquityQuery("eq", ["exchange", exchange]))
        got = 0
        try:
            while got < cap:
                res = yf.screen(EquityQuery("and", parts), offset=got, size=250,
                                sortField="avgdailyvol3m", sortAsc=False)
                quotes = (res or {}).get("quotes") or []
                if not quotes:
                    break
                for q in quotes:
                    sym = str(q.get("symbol") or "").upper()
                    if sym and q.get("quoteType") == "EQUITY" and sym not in names:
                        syms.append(sym)
                        names[sym] = q.get("longName") or q.get("shortName") or ""
                got += len(quotes)
                time.sleep(1)
        except Exception as e:  # noqa: BLE001
            print("univers feilet for", region, e, file=sys.stderr)
        print(region, len(syms), "symboler så langt", file=sys.stderr)
    return syms, names


def _download(syms):
    import yfinance as yf  # noqa: PLC0415

    for attempt in range(3):
        try:
            return yf.download(syms, period="1y", interval="1d", group_by="ticker",
                               progress=False, threads=True, auto_adjust=True)
        except Exception as e:  # noqa: BLE001
            print("retry", attempt, e, file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    return None


def fetch_daily(syms, chunk=200):
    """Ett år med dagsstolper per symbol: {"c": sluttkurser, "v": volum}."""
    bars = {}
    for i in range(0, len(syms), chunk):
        part = syms[i : i + chunk]
        df = _download(part)
        if df is None:
            continue
        for sym in part:
            try:
                sub = (df[sym] if len(part) > 1 else df).dropna(subset=["Close"])
                if len(sub):
                    bars[sym] = {"c": [float(x) for x in sub["Close"]],
                                 "v": [float(x) if x == x else 0.0 for x in sub["Volume"]]}
            except Exception:  # noqa: BLE001
                pass
        time.sleep(2)
    return bars


def fetch_refs():
    """Indekser (sluttkurser) og valutakurser (kroner per valuta)."""
    import fetch  # noqa: PLC0415

    got = fetch_daily(list(fetch.IDX.values()) + list(fetch.FX.values()))
    idx = {name: (got.get(sym) or {}).get("c") or [] for name, sym in fetch.IDX.items()}
    fx = {"NOK": 1.0}
    for cur, sym in fetch.FX.items():
        closes = (got.get(sym) or {}).get("c")
        if closes:
            fx[cur] = closes[-1]
    return idx, fx


def main(path="screen.json"):
    """Skriver screen.json og gir 0. Gir 3 uten å skrive når dataene er for tynne."""
    syms, names = universe()
    bars = fetch_daily(syms) if syms else {}
    idx, fx = fetch_refs()
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = build(bars, idx, fx, names, now)
    out["universe"] = len(syms)
    print(f"{out['universe']} i universet, {out['with_data']} med data, {out['passed']} over gulvet")
    if not should_publish(out):
        print("For tynne data. Skriver ingenting.", file=sys.stderr)
        return 3
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "screen.json"))
