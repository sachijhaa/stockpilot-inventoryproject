from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    ForecastRequest,
    ForecastResponse,
    AnomalyDetectRequest,
    AnomalyDetectResponse,
    ReorderRequest,
    ReorderResponse,
)
from . import inference


@asynccontextmanager
async def lifespan(app: FastAPI):
    inference.load_models()
    yield


app = FastAPI(
    title="Smart Inventory AI Service",
    description="Demand forecasting, anomaly detection, and reorder intelligence for the Smart Inventory system.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "demandModelReady": inference.is_demand_model_ready(),
        "anomalyModelReady": inference.is_anomaly_model_ready(),
    }


@app.post("/forecast/demand", response_model=ForecastResponse)
def forecast_demand(payload: ForecastRequest):
    try:
        history = [{"date": str(p.date), "quantity": p.quantity} for p in payload.history]
        predictions, model_used, trained_rows = inference.run_forecast(history, payload.horizonDays)
        return ForecastResponse(predictions=predictions, modelUsed=model_used, trainedOnRows=trained_rows)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Forecasting failed: {exc}") from exc


@app.post("/anomaly/detect", response_model=AnomalyDetectResponse)
def detect_anomalies(payload: AnomalyDetectRequest):
    try:
        points = [p.model_dump() for p in payload.points]
        results = inference.run_anomaly_detection(points)
        flagged = sum(1 for r in results if r["isAnomaly"])
        return AnomalyDetectResponse(anomalies=results, totalFlagged=flagged)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {exc}") from exc


@app.post("/reorder/calculate", response_model=ReorderResponse)
def calculate_reorder(payload: ReorderRequest):
    lead_time_demand = payload.avgDailyDemand * payload.leadTimeDays
    safety_stock = payload.avgDailyDemand * payload.safetyStockDays
    reorder_quantity = max(0, round(lead_time_demand + safety_stock - payload.currentStock))

    return ReorderResponse(
        reorderQuantity=reorder_quantity,
        leadTimeDemand=round(lead_time_demand, 2),
        safetyStock=round(safety_stock, 2),
    )


@app.get("/")
def root():
    return {
        "service": "Smart Inventory AI Service",
        "docs": "/docs",
        "endpoints": ["/health", "/forecast/demand", "/anomaly/detect", "/reorder/calculate"],
    }
