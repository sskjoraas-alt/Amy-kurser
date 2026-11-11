"""Grovsil for Amy: regner nøkkeltall og poengsum for mange aksjer og skriver screen.json.

Filen inneholder bare offentlige tall. Aldri beholdning, antall eller beløp.
"""
import statistics

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
