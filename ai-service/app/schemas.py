from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class SalesPoint(BaseModel):
    date: date
    quantity: float = Field(ge=0)


class ForecastRequest(BaseModel):
    history: List[SalesPoint] = Field(default_factory=list)
    horizonDays: int = Field(default=30, ge=1, le=90)


class ForecastPoint(BaseModel):
    date: str
    value: float
    confidence: float


class ForecastResponse(BaseModel):
    predictions: List[ForecastPoint]
    modelUsed: str
    trainedOnRows: int


class TransactionPoint(BaseModel):
    id: str
    quantity: float
    action: str
    timestamp: str


class AnomalyDetectRequest(BaseModel):
    points: List[TransactionPoint]


class AnomalyResult(BaseModel):
    id: str
    quantity: float
    action: str
    timestamp: str
    isAnomaly: bool
    anomalyScore: float


class AnomalyDetectResponse(BaseModel):
    anomalies: List[AnomalyResult]
    totalFlagged: int


class ReorderRequest(BaseModel):
    currentStock: int
    avgDailyDemand: float
    leadTimeDays: int
    safetyStockDays: int = 3


class ReorderResponse(BaseModel):
    reorderQuantity: int
    leadTimeDemand: float
    safetyStock: float
