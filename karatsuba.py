LOG_DEPTH = 3  # only the top levels of the recursion are recorded for the GUI


def _short(n):
    s = str(n)
    return s if len(s) <= 14 else f"{s[:6]}…{s[-4:]} ({len(s)}d)"


def _log(rec, level, **event):
    if rec is not None and level <= LOG_DEPTH:
        rec["steps"].append(event)


def _karatsuba_positive(x, y, rec=None, depth=0, parent=None, role="root"):
    nid = None
    if rec is not None:
        nid = rec["calls"]
        rec["calls"] += 1
        _log(rec, depth, type="enter", id=nid, parent=parent, role=role,
             depth=depth, x=_short(x), y=_short(y))

    if x < 10 or y < 10:
        if rec is not None:
            rec["mults"] += 1
        _log(rec, depth, type="leaf", id=nid, res=_short(x * y))
        return x * y

    m = max(len(str(x)), len(str(y))) // 2

    a = x // (10 ** m)
    b = x % (10 ** m)

    c = y // (10 ** m)
    d = y % (10 ** m)

    _log(rec, depth, type="split", id=nid, m=m, a=_short(a), b=_short(b),
         c=_short(c), d=_short(d), collapsed=depth >= LOG_DEPTH)

    z0 = _karatsuba_positive(b, d, rec, depth + 1, nid, "z0")
    z2 = _karatsuba_positive(a, c, rec, depth + 1, nid, "z2")
    z1 = _karatsuba_positive(a + b, c + d, rec, depth + 1, nid, "z1") - z2 - z0

    res = z2 * (10 ** (2 * m)) + z1 * (10 ** m) + z0
    _log(rec, depth, type="combine", id=nid, z0=_short(z0), z1=_short(z1),
         z2=_short(z2), res=_short(res))
    return res


def karatsuba(x, y, rec=None):
    if x == 0 or y == 0:
        return 0

    sign = -1 if (x < 0) ^ (y < 0) else 1

    result = _karatsuba_positive(abs(x), abs(y), rec)

    return sign * result
