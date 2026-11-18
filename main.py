import sys
from fastapi import FastAPI, UploadFile
from fastapi.staticfiles import StaticFiles
from closest_pair import closest_pair
from karatsuba import karatsuba, _short

sys.set_int_max_str_digits(0)  # allow very long integers in uploaded files

app = FastAPI()


@app.post("/api/closest-pair")
async def run_closest_pair(file: UploadFile):
    tokens = (await file.read()).decode().split()
    n = int(tokens[0])
    coords = [int(t) for t in tokens[1:1 + 2 * n]]
    points = list(zip(coords[::2], coords[1::2]))

    steps = []
    p, q, d = closest_pair(points, steps)
    return {"points": points, "steps": steps, "result": {"p": p, "q": q, "dist": d}}


@app.post("/api/karatsuba")
async def run_karatsuba(file: UploadFile):
    tokens = (await file.read()).decode().split()
    x, y = int(tokens[0]), int(tokens[1])

    rec = {"steps": [], "calls": 0, "mults": 0}
    prod = karatsuba(x, y, rec)
    digits = max(len(str(abs(x))), len(str(abs(y))))
    return {
        "steps": rec["steps"],
        "result": {
            "x": _short(x), "y": _short(y), "product": _short(prod),
            "verified": prod == x * y, "calls": rec["calls"],
            "mults": rec["mults"], "digits": digits, "school": digits * digits,
        },
    }


app.mount("/", StaticFiles(directory="static", html=True), name="static")
