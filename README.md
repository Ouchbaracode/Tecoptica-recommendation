# 🕶️ Tecoptica: Face Shape Classifier & Dynamic Eyewear Recommender

Tecoptica is an end-to-end, high-performance face shape classification and dynamic eyewear recommendation platform. Powered by a custom-trained **YOLOv8** computer vision model, a robust **FastAPI** backend, and a modern **Next.js** interactive user interface, Tecoptica detects human face shapes in real-time and recommends matching premium eyewear styles from a live PostgreSQL database catalog.

---

## 🚀 Key Features

*   **Custom YOLOv8 Vision Model**: Trained to detect and classify 5 distinct face shapes (`heart`, `oblong`, `oval`, `round`, `square`) with high confidence.
*   **Next.js Frontend**: Sleek dark/light theme, modern UI, live webcam snapshot mode, and drag-and-drop file upload.
*   **FastAPI Backend**: Microsecond-latency API serving static image inferences and high-performance **WebSocket** endpoints for live streams.
*   **PostgreSQL Inventory Integration**: Dynamic product recommendations queried using PostgreSQL `ARRAY` models via **SQLAlchemy**.
*   **Interactive ML Streamlit Sandbox**: Complete model testing sandbox containing metric curves (confusion matrices, PR curves, F1 scores) and a real-time Streamlit dashboard.

---

## 📂 Repository Architecture

```text
gpu-train/
├── 📁 frontend/             # Next.js Web Application
│   ├── 📁 src/app/          # Core views, admin panel & global layouts
│   └── ⚙️ package.json       # Node package manager configurations
├── 📁 backend/              # FastAPI Application Server
│   ├── 🐍 main.py           # REST endpoints & WebSockets prediction loops
│   ├── 🐍 database.py       # SQLAlchemy engine & DB session handling
│   ├── 🐍 models.py         # PostgreSQL Product relations
│   └── 🐍 schemas.py        # Pydantic validation layers
├── 📁 model/                # ML Sandbox & YOLO Weights
│   ├── 🧠 best.pt           # Trained PyTorch YOLO weights
│   ├── 📊 *.png/*.jpg       # Confusion matrices, PR curves, and training metrics
│   └── 🖥️ streamlit_app.py  # Streamlit direct model validation app
├── 🎨 howrecwork.png        # Recommendation engine visualization graph
└── ⚙️ .gitignore             # Workspace-level git exclusions
```

---

## ⚡ Exciting Code Showcases

This repository contains clean, modular, and highly optimized code implementations. Below are some of the most exciting architecture highlights:

### 1. High-Performance Live Inference Loop (FastAPI WebSockets)
Located in [backend/main.py](file:///c:/Users/hp/Downloads/gpu-train/backend/main.py#L122-L184), the backend processes real-time live frames sent over a WebSocket connection. It decodes base64 frames, performs YOLO detection, maps bounding box coordinates, and returns real-time JSON responses:

```python
@app.websocket("/api/predict-live")
async def predict_live(websocket: WebSocket):
    await websocket.accept()
    try:    
        while True:
            # Receive base64 encoded image string from client
            data = await websocket.receive_text()
            
            # Extract base64 payload
            if "," in data:
                base64_data = data.split(",")[1]
            else:
                base64_data = data
            
            # Decode frame and load as PIL Image
            image_bytes = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_array = np.array(image)
            
            # Run YOLO model inference
            results = model(img_array)
            
            if len(results) == 0 or len(results[0].boxes) == 0:
                await websocket.send_json({"face_detected": False})
                continue
            
            boxes = results[0].boxes
            confidences = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy()
            xyxy = boxes.xyxy.cpu().numpy()
            
            # Fetch maximum confidence detection
            max_conf_idx = np.argmax(confidences)
            predicted_class = int(classes[max_conf_idx])
            confidence = float(confidences[max_conf_idx])
            bbox = xyxy[max_conf_idx]
            
            await websocket.send_json({
                "face_detected": True,
                "shape": CLASS_NAMES[predicted_class],
                "confidence": round(confidence, 4),
                "bbox": {
                    "xmin": int(bbox[0]), "ymin": int(bbox[1]),
                    "xmax": int(bbox[2]), "ymax": int(bbox[3]),
                    "width": int(bbox[2] - bbox[0]), "height": int(bbox[3] - bbox[1])
                }
            })
    except WebSocketDisconnect:
        print("Live inference client disconnected")
```

### 2. Scaled Bounding Box Drawer (Next.js Canvas)
Located in [frontend/src/app/page.tsx](file:///c:/Users/hp/Downloads/gpu-train/frontend/src/app/page.tsx#L254-L292), the React application overlays predictions cleanly over dynamic elements. It handles dynamic resizing by auto-scaling the HTML5 canvas dimensions:

```typescript
const drawStaticBBox = useCallback((
  img: HTMLImageElement | null, 
  canvas: HTMLCanvasElement | null, 
  bbox: BBox | null, 
  shape: string | undefined, 
  confidence: number | undefined
) => {
  if (!img || !canvas || !bbox || !shape || confidence === undefined) return;

  // Match canvas dimensions to the natural image dimensions to align aspect ratios
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render bounding box
  ctx.strokeStyle = "#3b82f6"; // Tailwind blue-500
  ctx.lineWidth = Math.max(3, Math.round(img.naturalWidth / 200)); // Responsive width
  ctx.strokeRect(bbox.xmin, bbox.ymin, bbox.width, bbox.height);

  // Render Label
  ctx.fillStyle = "#3b82f6";
  const text = `${shape.toUpperCase()} ${(confidence * 100).toFixed(1)}%`;
  const fontSize = Math.max(16, Math.round(img.naturalWidth / 40));
  ctx.font = `bold ${fontSize}px Arial`;
  const textWidth = ctx.measureText(text).width;
  const padding = fontSize * 0.6;
  
  ctx.fillRect(bbox.xmin, bbox.ymin - (fontSize + padding), textWidth + padding * 2, fontSize + padding);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, bbox.xmin + padding, bbox.ymin - padding / 2);
}, []);
```

### 3. Dynamic Array Recommendations (PostgreSQL Database Query)
Located in [backend/main.py](file:///c:/Users/hp/Downloads/gpu-train/backend/main.py#L206-L216), product recommendations are retrieved dynamically based on whether the detected shape is registered in the product's compatible array of face shapes inside the database:

```python
@app.get("/api/products/recommend/{face_shape}", response_model=list[schemas.ProductResponse])
async def recommend_products(face_shape: str, db: Session = Depends(get_db)):
    try:
        normalized_shape = face_shape.lower().strip()
        # Query products where normalized_shape is inside the face_shapes PostgreSQL text array
        recommended = db.query(models.Product).filter(
            models.Product.face_shapes.any(normalized_shape)
        ).all()
        return recommended
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")
```

---

## 🛠️ Step-by-Step Installation & Run Guide

To run all modules of Tecoptica locally, follow the guidelines below:

### 1. Setup Virtual Environment
Run standard virtual environment installation from the repository root:
```bash
python -m venv .venv
# Activate environment
.venv\Scripts\activate      # Windows (PowerShell/CMD)
source .venv/bin/activate    # Linux/MacOS
```

### 2. Spin Up Backend (FastAPI)
Run the FastAPI development server:
```bash
cd backend
# Database URL can be configured using environment variables, or it defaults to localhost
uvicorn main:app --reload --port 8000
```
*   **Swagger API Docs**: Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) once online.

### 3. Spin Up Frontend (Next.js)
Start the frontend development hot-reload server:
```bash
cd frontend
npm install
npm run dev
```
*   **Web App URL**: Access [http://localhost:3000](http://localhost:3000).

### 4. Streamlit Machine Learning Sandbox
Experiment directly with YOLO weights and view performance validation graphics:
```bash
cd model
streamlit run streamlit_app.py
```
*   **Streamlit Port**: Runs on [http://localhost:8501](http://localhost:8501).

---

## Model Training & Performance Metrics

The YOLOv8 classifier was trained using high-performance GPU resources to detect face shapes accurately. The metric verification reports are saved in the [model/](file:///c:/Users/hp/Downloads/gpu-train/model/) directory:
*   **Confusion Matrix**: [confusion_matrix.png](file:///c:/Users/hp/Downloads/gpu-train/model/confusion_matrix.png) showcases class-by-class predictive accuracy.
*   **Precision-Recall Curve**: [BoxPR_curve.png](file:///c:/Users/hp/Downloads/gpu-train/model/BoxPR_curve.png) highlights precision vs recall tradeoff balance.
*   **F1 Confidence Curve**: [BoxF1_curve.png](file:///c:/Users/hp/Downloads/gpu-train/model/BoxF1_curve.png) demonstrates optimized model confidence thresholding.

