# 🌟 Face Shape Classifier Workspace

Welcome to the organized workspace for the **Face Shape Classifier** application! The workspace is structured into three clean, dedicated modules for maximum clarity, flexibility, and architectural separation.

---

## 📂 Workspace Architecture

Below is the structured layout of the workspace:

```text
gpu-train/
├── 📁 frontend/         # Next.js Web App with Interactive UI
├── 📁 backend/          # FastAPI backend service & SQLAlchemy models
├── 📁 model/            # YOLO model weights, streamlit sandbox, & training curves
├── ⚙️ .gitignore         # Workspace-level git exclusions
└── 📖 README.md         # Workspace master documentation (this file)
```

---

## 🚀 Module Overview & Running Instructions

### 🎨 1. Frontend (`frontend/`)
A premium, highly interactive Next.js application that provides the end-user interface to perform face shape predictions (static and live snapshot modes) and receive styled eyewear recommendations.

*   **Port:** `3000` (Default Next.js)
*   **Startup Commands:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

### ⚙️ 2. Backend (`backend/`)
An enterprise-grade FastAPI backend service providing REST endpoints for YOLO inferences, real-time WebSocket connection handling for live streams, and database connectivity to manage eyewear product inventories.

*   **Port:** `8000`
*   **Database:** PostgreSQL (mapped via `database.py`)
*   **Startup Commands:**
    ```bash
    # Ensure your virtual environment is active
    .venv\Scripts\activate   # Windows
    
    # Run the server
    cd backend
    uvicorn main:app --reload --port 8000
    ```

---

### 🧠 3. Model (`model/`)
The core machine learning sandbox containing the trained YOLO model, performance assessment reports, and a high-performance Streamlit dashboard for real-time model experimentation.

*   **Components:**
    *   `best.pt`: The trained YOLO weights file.
    *   `streamlit_app.py`: Streamlit dashboard for direct model interaction.
    *   Metric curves (`confusion_matrix.png`, `BoxPR_curve.png`, `results.png`, etc.) for performance evaluations.
*   **Startup Commands:**
    ```bash
    # Ensure your virtual environment is active
    .venv\Scripts\activate   # Windows
    
    # Launch Streamlit Sandbox
    cd model
    streamlit run streamlit_app.py
    ```

---

## 🌐 Network & Port Allocation

| Component | Default URL | Role |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Next.js Web App UI |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | FastAPI & SQLAlchemy endpoints |
| **Streamlit Demo** | [http://localhost:8501](http://localhost:8501) | Streamlit ML Sandbox |
| **Database** | `localhost:5432` | PostgreSQL DB (Credentials inside docker-compose) |
