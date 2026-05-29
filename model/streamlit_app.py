import streamlit as st
from ultralytics import YOLO
from PIL import Image
import numpy as np 
import cv2
from streamlit_webrtc import webrtc_streamer, VideoTransformerBase, RTCConfiguration

@st.cache_resource
def load_model():
    import os
    possible_paths = ["best.pt", "model/best.pt", "../model/best.pt"]
    model_path = "best.pt"
    for path in possible_paths:
        if os.path.exists(path):
            model_path = path
            break
    model = YOLO(model_path)
    return model

def predict_face_shape(model, image):
    results = model(image)
    
    if len(results) == 0 or len(results[0].boxes) == 0:
        return None, None, None
    
    boxes = results[0].boxes
    confidences = boxes.conf.cpu().numpy()
    classes = boxes.cls.cpu().numpy()
    xyxy = boxes.xyxy.cpu().numpy()
    
    max_conf_idx = np.argmax(confidences)
    predicted_class = int(classes[max_conf_idx])
    confidence = float(confidences[max_conf_idx])
    bbox = xyxy[max_conf_idx]
    
    class_names = ["heart", "oblong", "oval", "round", "square"]
    face_shape = class_names[predicted_class]
    
    return face_shape, confidence, bbox

class VideoTransformer(VideoTransformerBase):
    def __init__(self):
        self.model = load_model()
        self.face_shape = None
        self.confidence = None
    
    def transform(self, frame):
        img = frame.to_ndarray(format="bgr24")
        
        results = self.model(img)
        
        if len(results) > 0 and len(results[0].boxes) > 0:
            boxes = results[0].boxes
            confidences = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy()
            xyxy = boxes.xyxy.cpu().numpy()
            
            max_conf_idx = np.argmax(confidences)
            predicted_class = int(classes[max_conf_idx])
            self.confidence = float(confidences[max_conf_idx])
            bbox = xyxy[max_conf_idx]
            
            class_names = ["heart", "oblong", "oval", "round", "square"]
            self.face_shape = class_names[predicted_class]
            
            x1, y1, x2, y2 = map(int, bbox)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            label = f"{self.face_shape.capitalize()}: {self.confidence*100:.1f}%"
            cv2.putText(img, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        return img

st.set_page_config(page_title="Face Shape Classifier", layout="wide", initial_sidebar_state="expanded")

st.markdown("""
    <style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        text-align: center;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        text-align: center;
        color: #666;
        font-size: 1.2rem;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .metric-value {
        font-size: 2.5rem;
        font-weight: bold;
        margin: 0.5rem 0;
    }
    .metric-label {
        font-size: 1rem;
        opacity: 0.9;
    }
    .class-badge {
        display: inline-block;
        padding: 0.5rem 1rem;
        margin: 0.25rem;
        background: black;
        border-radius: 20px;
        font-weight: 500;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 2rem;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 1rem 2rem;
        font-size: 1.1rem;
    }
    </style>
""", unsafe_allow_html=True)

st.markdown('<p class="main-header">🔍 Face Shape Classifier</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Analyze face shapes using AI-powered YOLO detection</p>', unsafe_allow_html=True)

with st.sidebar:
    st.image("https://img.icons8.com/color/96/000000/face-id.png", width=80)
    st.markdown("### 📊 Model Information")
    
    st.markdown("""
    <div style='background: black; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;'>
        <p style='margin: 0;'><strong>Architecture:</strong> YOLO</p>
        <p style='margin: 0;'><strong>Framework:</strong> PyTorch</p>
        <p style='margin: 0;'><strong>Device:</strong> CPU</p>
        <p style='margin: 0;'><strong>Classes:</strong> 5</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("### 🎯 Face Shape Classes")
    classes = ["heart", "oblong", "oval", "round", "square"]
    
    class_icons = {
        "heart": "❤️",
        "oblong": "📏",
        "oval": "🥚",
        "round": "⭕",
        "square": "⬛"
    }
    
    for cls in classes:
        st.markdown(f"<span class='class-badge'>{class_icons[cls]} {cls.capitalize()}</span>", unsafe_allow_html=True)
    
    st.divider()
    
    st.markdown("### ℹ️ How to Use")
    st.markdown("""
    1. Choose **Upload Image** or **Live Camera**
    2. Upload/capture a clear face photo
    3. View instant predictions
    4. Check confidence scores
    """)
    
    st.divider()
    st.markdown("### 💡 Tips")
    st.markdown("""
    - Use good lighting
    - Face the camera directly
    - Ensure face is clearly visible
    - Remove obstructions
    """)

tab1, tab2 = st.tabs(["📤 Upload Image", "📷 Live Camera"])

with tab1:
    col1, col2 = st.columns([1, 1], gap="large")
    
    with col1:
        st.markdown("#### Upload Your Image")
        uploaded_file = st.file_uploader(
            "Choose an image file",
            type=["jpg", "jpeg", "png"],
            help="Supported formats: JPG, JPEG, PNG"
        )
        
        if uploaded_file is not None:
            image = Image.open(uploaded_file)
            st.image(image, caption="Uploaded Image", use_container_width=True)
    
    with col2:
        if uploaded_file is not None:
            st.markdown("#### Analysis Results")
            
            try:
                with st.spinner("🔄 Analyzing face shape..."):
                    model = load_model()
                    face_shape, confidence, bbox = predict_face_shape(model, image)
                
                if face_shape is not None:
                    st.markdown(f"""
                    <div class='metric-card'>
                        <p class='metric-label'>Detected Face Shape</p>
                        <p class='metric-value'>{face_shape.upper()}</p>
                        <p class='metric-label'>Confidence: {confidence * 100:.2f}%</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    st.markdown("<br>", unsafe_allow_html=True)
                    
                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.metric("Face Shape", face_shape.capitalize(), delta=None)
                    with col_b:
                        st.metric("Confidence", f"{confidence * 100:.1f}%", delta=None)
                    
                    if confidence >= 0.8:
                        st.success("✅ High confidence prediction!")
                    elif confidence >= 0.5:
                        st.info("ℹ️ Moderate confidence prediction")
                    else:
                        st.warning("⚠️ Low confidence - results may be uncertain")
                    
                    with st.expander("📊 View Detailed Metrics"):
                        st.write(f"**Bounding Box Coordinates:**")
                        st.write(f"- Top-left: ({int(bbox[0])}, {int(bbox[1])})")
                        st.write(f"- Bottom-right: ({int(bbox[2])}, {int(bbox[3])})")
                        st.write(f"**Confidence Score:** {confidence:.4f}")
                else:
                    st.error("❌ No face detected in the image")
                    st.info("💡 Try uploading an image with a clear, visible face")
            
            except Exception as e:
                st.error(f"❌ Error processing image: {str(e)}")
        else:
            st.info("👆 Upload an image to see results here")

with tab2:
    st.markdown("#### Live Camera Detection")
    st.info("📹 Click **START** to begin live face shape detection")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        webrtc_ctx = webrtc_streamer(
            key="face-shape-classifier",
            video_transformer_factory=VideoTransformer,
            rtc_configuration=RTCConfiguration(
                {"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]}
            ),
            media_stream_constraints={"video": True, "audio": False},
            async_processing=True,
        )
    
    with col2:
        st.markdown("#### Live Results")
        if webrtc_ctx.video_transformer:
            st.markdown("""
            <div style='background: #f0f2f6; padding: 1rem; border-radius: 10px;'>
                <p style='margin: 0; text-align: center;'>📊 Real-time analysis active</p>
            </div>
            """, unsafe_allow_html=True)
            
            result_placeholder = st.empty()
            
            if hasattr(webrtc_ctx.video_transformer, 'face_shape') and webrtc_ctx.video_transformer.face_shape:
                face_shape = webrtc_ctx.video_transformer.face_shape
                confidence = webrtc_ctx.video_transformer.confidence
                
                result_placeholder.markdown(f"""
                <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 1rem; border-radius: 10px; color: white; margin-top: 1rem;'>
                    <p style='margin: 0; font-size: 0.9rem;'>Face Shape</p>
                    <p style='margin: 0.5rem 0; font-size: 1.8rem; font-weight: bold;'>{face_shape.upper()}</p>
                    <p style='margin: 0; font-size: 0.9rem;'>{confidence*100:.1f}% confident</p>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div style='background: black; padding: 1rem; border-radius: 10px; text-align: center;'>
                <p style='margin: 0;'>Waiting for camera...</p>
            </div>
            """, unsafe_allow_html=True)

st.divider()

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Total Classes", "5", delta=None)
with col2:
    st.metric("Model Type", "YOLO", delta=None)
with col3:
    st.metric("Status", "Active", delta="Online", delta_color="normal")