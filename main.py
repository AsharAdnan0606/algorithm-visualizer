from fastapi import FastAPI, UploadFile
from fastapi.staticfiles import StaticFiles
from closest_pair import closest_pair

app = FastAPI()

@app.get("/api/hello")
def hello():
    return {"message": "backend is alive"}

@app.post("/api/closest-pair")
async def run_closest_pair(file: UploadFile):
    text = (await file.read()).decode()
    tokens = text.split()
    n = int(tokens[0])
    coords = [int(t) for t in tokens[1:1 + 2 * n]]
    points = list(zip(coords[::2], coords[1::2]))

    steps = []
    p, q, d = closest_pair(points, steps)
    return {"points": points, "steps": steps, "result": {"p": p, "q": q, "dist": d}}


app.mount("/", StaticFiles(directory="static", html=True), name="static")