# AI Service — Smart Inventory Demand Forecasting & Intelligence

FastAPI microservice providing the AI features consumed by the Node backend.

## Endpoints

| Method | Path                 | Purpose                                              |
|--------|----------------------|-------------------------------------------------------|
| GET    | `/health`            | Reports whether trained models are loaded             |
| POST   | `/forecast/demand`   | Next-N-day demand forecast with confidence scores      |
| POST   | `/anomaly/detect`    | Flags anomalous inventory transactions (Isolation Forest) |
| POST   | `/reorder/calculate` | Pure reorder-quantity formula (also computed in backend) |

Interactive Swagger docs: `http://localhost:8000/docs`

## Models

- **Demand forecasting**: `XGBRegressor` trained on lag features (1/2/3/7/14-day),
  rolling mean/std, weekday/month/day-of-year — trained by `app/train_model.py`
  on `data/sample_sales.csv` (replace with a real historical sales export for
  production use). If fewer than 20 history points are supplied, or no trained
  model file exists yet, the service **automatically falls back** to a
  seasonal moving-average model so the API never fails.
- **Anomaly detection**: `IsolationForest` trained on synthetic transaction
  quantities (contamination=5%). Falls back to a z-score heuristic if the
  model file is missing.
- **Prophet** and **Matplotlib** are included in `requirements.txt` per the
  project's required tech stack and are ready to use for exploratory
  seasonal-decomposition notebooks / alternate forecasting experiments, but
  the live `/forecast/demand` endpoint uses XGBoost + fallback by default for
  speed and Docker-build reliability (Prophet's cmdstan backend can be slow
  to install in constrained build environments). If you want Prophet as the
  primary model, swap the call in `app/inference.py::run_forecast`.

## Retraining

```bash
cd ai-service
pip install -r requirements.txt
python data/generate_sample_data.py   # or supply your own data/sample_sales.csv
python app/train_model.py
```

This regenerates `models/demand_model.joblib`, `models/demand_model_metadata.joblib`,
and `models/anomaly_model.joblib`. The Docker image also runs this automatically
at build time so a fresh `docker compose up --build` ships with working models.

## Local run (without Docker)

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python data/generate_sample_data.py
python app/train_model.py
uvicorn app.main:app --reload --port 8000
```
