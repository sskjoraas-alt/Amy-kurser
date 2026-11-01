"""Henter offentlige aksjekurser for Amy og skriver prices.json.

Filen inneholder bare offentlige kurser, valutakurser og indekser.
Den inneholder aldri beholdning, antall eller beløp.
"""
import datetime
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).parent
FX = {"SEK": "SEKNOK=X", "USD": "USDNOK=X", "EUR": "EURNOK=X", "DKK": "DKKNOK=X"}
IDX = {"OSEBX": "OSEBX.OL", "SP500": "^GSPC"}
SUFFIX = {".OL": "NOK", ".ST": "SEK", ".CO": "DKK", ".HE": "EUR", ".DE": "EUR"}
# sluttid i norsk tid (Helsingfors 18:30 lokal = 17:30 norsk, New York 16:00 = 22:00 norsk)
CLOSE = {".OL": "16:25", ".ST": "17:30", ".CO": "17:00", ".HE": "17:30", ".DE": "17:35"}
OSLO = "Europe/Oslo"


def _close_hm(sym):
    for suf, hm in CLOSE.items():
        if sym.upper().endswith(suf):
            return hm
    return "22:00"


def _close_dt(date, sym):
    from zoneinfo import ZoneInfo  # noqa: PLC0415

    h, m = map(int, _close_hm(sym).split(":"))
    y, mo, d = map(int, date.split("-"))
    return datetime.datetime(y, mo, d, h, m, tzinfo=ZoneInfo(OSLO))


def _now_utc(now):
    try:
        return datetime.datetime.strptime(now, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    except Exception:  # noqa: BLE001
        return datetime.datetime.now(datetime.timezone.utc)


def currency(sym):
    for suf, cur in SUFFIX.items():
        if sym.upper().endswith(suf):
            return cur
    return "USD"


def symbols(root=ROOT):
    out = []
    for name in ("universe.txt", "extra.txt"):
        path = pathlib.Path(root) / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            sym = line.split("#", 1)[0].strip().upper()
            if sym and sym not in out:
                out.append(sym)
    return out


def _last_and_prev(bars):
    """bars = [(iso_time, close), ...] i tidsrekkefølge. Gir (tid, kurs, forrige sluttkurs)."""
    bars = [b for b in bars if b and b[1] is not None]
    if not bars:
        return None
    t, p = bars[-1]
    day = t[:10]
    prev = None
    for bt, bp in reversed(bars[:-1]):
        if bt[:10] < day:
            prev = bp
            break
    return t, p, prev


def _pick(sym, bars, daily, now_utc):
    """Velger kurs: intradag i børstida, dagens sluttkurs etter stenging."""
    intr = _last_and_prev(bars.get(sym) or [])
    dl = sorted(daily.get(sym) or [])
    if not dl:
        return intr
    dlast_d, dlast_c = dl[-1]
    dprev = dl[-2][1] if len(dl) > 1 else None
    closed = _close_dt(dlast_d, sym)
    use_daily = (not intr) or dlast_d > intr[0][:10] or (dlast_d == intr[0][:10] and now_utc >= closed)
    if use_daily:
        tt = closed if now_utc >= closed else now_utc.astimezone(closed.tzinfo).replace(second=0, microsecond=0)
        return tt.isoformat(timespec="seconds"), dlast_c, dprev
    t, p, prev = intr
    earlier = [c for d, c in dl if d < t[:10]]
    return t, p, (earlier[-1] if earlier else prev)


def build(bars, syms, now=None, daily=None):
    now = now or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    daily = daily or {}
    now_utc = _now_utc(now)
    out = {"generated": now, "quotes": {}, "fx": {}, "idx": {}, "missing": []}
    for sym in syms:
        lp = _pick(sym, bars, daily, now_utc)
        if not lp:
            out["missing"].append(sym)
            continue
        t, p, prev = lp
        chg = round((p / prev - 1) * 100, 2) if prev else None
        out["quotes"][sym] = {
            "p": round(p, 4),
            "prev": round(prev, 4) if prev else None,
            "chg": chg,
            "cur": currency(sym),
            "t": t,
        }
    for cur, sym in FX.items():
        lp = _last_and_prev(bars.get(sym) or [])
        if lp:
            out["fx"][cur] = round(lp[1], 4)
    for name, sym in IDX.items():
        lp = _last_and_prev(bars.get(sym) or [])
        if lp:
            t, p, prev = lp
            out["idx"][name] = {"p": round(p, 2), "chg": round((p / prev - 1) * 100, 2) if prev else None}
    return out


def fetch_bars(syms, chunk=60):
    """Henter 15-minutters stolper for de siste dagene fra Yahoo via yfinance."""
    import yfinance as yf  # noqa: PLC0415 (bare på GitHub)

    bars = {}
    for i in range(0, len(syms), chunk):
        part = syms[i : i + chunk]
        for attempt in range(3):
            try:
                df = yf.download(part, period="5d", interval="15m", group_by="ticker",
                                 progress=False, threads=True, auto_adjust=False, prepost=False)
                break
            except Exception as e:  # noqa: BLE001
                print("retry", attempt, e, file=sys.stderr)
                time.sleep(5 * (attempt + 1))
        else:
            continue
        for sym in part:
            try:
                sub = df[sym] if len(part) > 1 else df
                sub = sub.dropna(subset=["Close"])
                bars[sym] = [(ts.isoformat(), float(c)) for ts, c in zip(sub.index, sub["Close"])]
            except Exception:  # noqa: BLE001
                pass
        time.sleep(1)
    return bars


def fetch_daily(syms, chunk=100):
    """Henter dagsstolper (sluttkurser) for de siste dagene."""
    import yfinance as yf  # noqa: PLC0415

    daily = {}
    for i in range(0, len(syms), chunk):
        part = syms[i : i + chunk]
        try:
            df = yf.download(part, period="7d", interval="1d", group_by="ticker",
                             progress=False, threads=True, auto_adjust=False)
        except Exception as e:  # noqa: BLE001
            print("daily feilet", e, file=sys.stderr)
            continue
        for sym in part:
            try:
                sub = df[sym] if len(part) > 1 else df
                sub = sub.dropna(subset=["Close"])
                daily[sym] = [(ts.strftime("%Y-%m-%d"), float(c)) for ts, c in zip(sub.index, sub["Close"])]
            except Exception:  # noqa: BLE001
                pass
    return daily


def main(path="prices.json"):
    syms = symbols()
    extra = list(FX.values()) + list(IDX.values())
    bars = fetch_bars(syms + extra)
    daily = fetch_daily(syms)
    out = build(bars, syms, daily=daily)
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(path).write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out['quotes'])} kurser, {len(out['missing'])} mangler")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "prices.json")
