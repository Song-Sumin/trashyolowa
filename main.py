from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import io
import base64
from PIL import Image

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None


class Detection(BaseModel):
    label: str
    confidence: float


class PredictResponse(BaseModel):
    model: str
    detections: List[Detection]
    best_label: Optional[str]
    annotated_image: Optional[str]


app = FastAPI(title="Waste-AI-Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


models = {"yolov8n": None, "best": None}


@app.on_event("startup")
def load_models() -> None:
    if YOLO is None:
        return
    try:
        models["yolov8n"] = YOLO("yolov8n.pt")
    except Exception:
        models["yolov8n"] = None
    try:
        models["best"] = YOLO("best.pt")
    except Exception:
        models["best"] = None


@app.post("/api/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...), model: str = Form("best")):
    if YOLO is None:
        return JSONResponse(status_code=500, content={"detail": "Ultralytics is not installed."})

    model_key = "best" if model.lower() == "best" else "yolov8n"
    yolo_model = models.get(model_key)
    if yolo_model is None:
        return JSONResponse(status_code=500, content={"detail": f"Model '{model_key}' is not available."})

    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    results = yolo_model.predict(image, verbose=False)
    result = results[0]

    detections: List[Detection] = []
    best_label: Optional[str] = None

    if result.boxes is not None and result.boxes.cls is not None:
        names = result.names if hasattr(result, "names") and result.names else yolo_model.names
        probs = result.boxes.conf.tolist() if result.boxes.conf is not None else []
        classes = result.boxes.cls.tolist()
        for cls_idx, conf in zip(classes, probs):
            label = names[int(cls_idx)] if names and int(cls_idx) in names else str(int(cls_idx))
            detections.append(Detection(label=label, confidence=float(conf)))
        if detections:
            best_label = max(detections, key=lambda d: d.confidence).label

    annotated_bgr = result.plot()
    annotated_rgb = Image.fromarray(annotated_bgr[:, :, ::-1])
    buf = io.BytesIO()
    annotated_rgb.save(buf, format="JPEG", quality=90)
    data_url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    return PredictResponse(
        model=model_key,
        detections=detections,
        best_label=best_label,
        annotated_image=data_url,
    )


app.mount("/", StaticFiles(directory=".", html=True), name="static")


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


