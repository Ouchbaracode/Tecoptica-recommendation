from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import numpy as np
import io
import base64
import json
import uvicorn

from sqlalchemy.orm import Session
from database import engine, get_db, Base
import models
import schemas

app = FastAPI(title="Face Shape Classifier API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
model = None
CLASS_NAMES = ["heart", "oblong", "oval", "round", "square"]


@app.on_event("startup")
async def load_model():
    global model
    import os
    possible_paths = ["best.pt", "model/best.pt", "../model/best.pt", "backend/best.pt"]
    model_path = "best.pt"
    for path in possible_paths:
        if os.path.exists(path):
            model_path = path
            break
    model = YOLO(model_path)
    print(f"✅ YOLO model loaded successfully from: {model_path}")
    
    # Initialize SQL database tables automatically
    try:
        models.Base.metadata.create_all(bind=engine)
        print("✅ PostgreSQL database tables initialized successfully")
    except Exception as e:
        print(f"❌ Error initializing database tables: {str(e)}")


@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "model_type": "YOLO",
        "total_classes": len(CLASS_NAMES),
        "classes": CLASS_NAMES,
    }


@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PNG, JPG, and JPEG are supported.",
        )

    try:
        # Read and decode the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_array = np.array(image)

        # Run inference
        results = model(img_array)

        if len(results) == 0 or len(results[0].boxes) == 0:
            raise HTTPException(
                status_code=404,
                detail="No face detected in the image. Please try a clearer photo.",
            )

        boxes = results[0].boxes
        confidences = boxes.conf.cpu().numpy()
        classes = boxes.cls.cpu().numpy()
        xyxy = boxes.xyxy.cpu().numpy()

        # Get highest confidence prediction
        max_conf_idx = np.argmax(confidences)
        predicted_class = int(classes[max_conf_idx])
        confidence = float(confidences[max_conf_idx])
        bbox = xyxy[max_conf_idx]

        xmin, ymin, xmax, ymax = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
        width = xmax - xmin
        height = ymax - ymin

        return {
            "shape": CLASS_NAMES[predicted_class],
            "confidence": round(confidence, 4),
            "bbox": {
                "xmin": xmin,
                "xmax": xmax,
                "ymin": ymin,
                "ymax": ymax,
                "width": width,
                "height": height,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.websocket("/api/predict-live")
async def predict_live(websocket: WebSocket):
    await websocket.accept()
    try:    
        while True:
            # Receive base64 encoded image string from client
            data = await websocket.receive_text()
            
            try:
                # Remove data URI prefix if present (e.g. "data:image/jpeg;base64,")
                if "," in data:
                    base64_data = data.split(",")[1]
                else:
                    base64_data = data
                
                # Decode image
                image_bytes = base64.b64decode(base64_data)
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                img_array = np.array(image)
                
                # Run inference
                results = model(img_array)
                
                if len(results) == 0 or len(results[0].boxes) == 0:
                    await websocket.send_json({"face_detected": False})
                    continue
                
                boxes = results[0].boxes
                confidences = boxes.conf.cpu().numpy()
                classes = boxes.cls.cpu().numpy()
                xyxy = boxes.xyxy.cpu().numpy()
                
                # Get highest confidence prediction
                max_conf_idx = np.argmax(confidences)
                predicted_class = int(classes[max_conf_idx])
                confidence = float(confidences[max_conf_idx])
                bbox = xyxy[max_conf_idx]
                
                xmin, ymin, xmax, ymax = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
                width = xmax - xmin
                height = ymax - ymin
                
                await websocket.send_json({
                    "face_detected": True,
                    "shape": CLASS_NAMES[predicted_class],
                    "confidence": round(confidence, 4),
                    "bbox": {
                        "xmin": xmin,
                        "xmax": xmax,
                        "ymin": ymin,
                        "ymax": ymax,
                        "width": width,
                        "height": height,
                    }
                })
                
            except Exception as e:
                print(f"Error processing frame: {str(e)}")
                await websocket.send_json({"error": "Error processing frame"})
                
    except WebSocketDisconnect:
        print("Client disconnected")


@app.post("/api/products", response_model=schemas.ProductResponse, status_code=201)
async def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    try:
        db_product = models.Product(
            name=product.name,
            brand=product.brand,
            description=product.description,
            price=product.price,
            image_url=product.image_url,
            face_shapes=[shape.lower().strip() for shape in product.face_shapes]
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/products/recommend/{face_shape}", response_model=list[schemas.ProductResponse])
async def recommend_products(face_shape: str, db: Session = Depends(get_db)):
    try:
        normalized_shape = face_shape.lower().strip()
        # Query products that have normalized_shape in their face_shapes list
        recommended = db.query(models.Product).filter(
            models.Product.face_shapes.any(normalized_shape)
        ).all()
        return recommended
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
