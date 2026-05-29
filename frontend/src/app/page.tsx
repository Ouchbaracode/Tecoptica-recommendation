"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  UploadCloud, 
  Camera, 
  Heart, 
  Square, 
  Circle, 
  AlignJustify, 
  Layers, 
  Cpu,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  BrainCircuit,
  Scissors,
  Glasses,
  Sparkles,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type BBox = {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  width: number;
  height: number;
};

type PredictionResult = {
  shape: string;
  confidence: number;
  bbox: BBox;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "live">("upload");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Ref for the image to display in upload tab
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Camera Capture states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Snapshot States
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  // Bounding box refs
  const uploadImgRef = useRef<HTMLImageElement | null>(null);
  const uploadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraImgRef = useRef<HTMLImageElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load initial theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    } else if (savedTheme === "light") {
      setIsDarkMode(false);
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(systemPrefersDark);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Fetch recommendations when face shape is detected
  useEffect(() => {
    if (result?.shape) {
      fetch(`http://localhost:8000/api/products/recommend/${result.shape}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load recommendations");
          return res.json();
        })
        .then((data) => {
          setRecommendedProducts(data);
        })
        .catch((err) => {
          console.error("Error loading products:", err);
          setRecommendedProducts([]);
        });
    } else {
      setRecommendedProducts([]);
    }
  }, [result]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset results and selected image
    setResult(null);
    setSelectedImage(null);

    // Display selected image
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);

    // Call API
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("No face detected in the image. Please try a clearer photo.");
        }
        throw new Error("Failed to get prediction");
      }

      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error processing image. Please try again.");
      setSelectedImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const startLiveCamera = async () => {
    // Reset captured image and results
    setCapturedImage(null);
    setResult(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      setStream(mediaStream);
      setIsLiveActive(true);
      setLiveError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setLiveError("Could not access camera. Please check camera permissions.");
    }
  };

  const stopLiveCamera = () => {
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsLiveActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    
    // Create temporary canvas to draw the frame
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw current video frame on canvas (mirrored for natural look if video is mirrored, but let's draw normally for model accuracy!)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Trigger visual camera flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 500);

    // Get base64 URL for rendering preview
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(dataUrl);

    // Stop webcam tracks to release camera hardware
    stopLiveCamera();

    // Send photo to backend for prediction
    setIsProcessing(true);
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("No face detected in the captured photo. Please try a clearer picture.");
        }
        throw new Error("Failed to get prediction");
      }

      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error processing captured image. Please try again.");
      setCapturedImage(null);
      startLiveCamera();
    } finally {
      setIsProcessing(false);
    }
  };

  // Attach stream to video when it mounts
  useEffect(() => {
    if (isLiveActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [isLiveActive, stream]);

  // Utility to draw bounding box on static images dynamically
  const drawStaticBBox = useCallback((
    img: HTMLImageElement | null, 
    canvas: HTMLCanvasElement | null, 
    bbox: BBox | null, 
    shape: string | undefined, 
    confidence: number | undefined
  ) => {
    if (!img || !canvas || !bbox || !shape || confidence === undefined) return;

    // Match canvas width/height to natural image dimensions to allow seamless object-contain alignment
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bounding box
    ctx.strokeStyle = "#3b82f6"; // Tailwind blue-500
    ctx.lineWidth = Math.max(3, Math.round(img.naturalWidth / 200)); // Dynamic stroke thickness based on image size
    ctx.strokeRect(bbox.xmin, bbox.ymin, bbox.width, bbox.height);

    // Draw label background
    ctx.fillStyle = "#3b82f6";
    const text = `${shape.toUpperCase()} ${(confidence * 100).toFixed(1)}%`;
    
    const fontSize = Math.max(16, Math.round(img.naturalWidth / 40));
    ctx.font = `bold ${fontSize}px Arial`;
    const textWidth = ctx.measureText(text).width;
    const padding = fontSize * 0.6;
    
    ctx.fillRect(bbox.xmin, bbox.ymin - (fontSize + padding), textWidth + padding * 2, fontSize + padding);

    // Draw text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, bbox.xmin + padding, bbox.ymin - padding / 2);
  }, []);

  const handleUploadImageLoad = () => {
    if (result && uploadImgRef.current && uploadCanvasRef.current) {
      drawStaticBBox(uploadImgRef.current, uploadCanvasRef.current, result.bbox, result.shape, result.confidence);
    }
  };

  const handleCameraImageLoad = () => {
    if (result && cameraImgRef.current && cameraCanvasRef.current) {
      drawStaticBBox(cameraImgRef.current, cameraCanvasRef.current, result.bbox, result.shape, result.confidence);
    }
  };

  // Re-draw bounding boxes when results change
  useEffect(() => {
    if (activeTab === "upload" && result && uploadImgRef.current && uploadCanvasRef.current) {
      const timer = setTimeout(() => {
        drawStaticBBox(uploadImgRef.current, uploadCanvasRef.current, result.bbox, result.shape, result.confidence);
      }, 50);
      return () => clearTimeout(timer);
    } else if (activeTab === "live" && result && cameraImgRef.current && cameraCanvasRef.current) {
      const timer = setTimeout(() => {
        drawStaticBBox(cameraImgRef.current, cameraCanvasRef.current, result.bbox, result.shape, result.confidence);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [result, activeTab, drawStaticBBox]);


  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300",
      isDarkMode ? "dark" : ""
    )}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 dark:bg-slate-100 p-2 rounded-lg text-white dark:text-slate-900 transition-colors">
            <BrainCircuit size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Face Shape Classifier</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">AI Vision Model</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/add-product"
            className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 font-bold transition shadow-sm border border-slate-200/50 dark:border-slate-700"
          >
            Admin Panel
          </Link>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row p-6 md:p-8 gap-8 max-w-7xl mx-auto w-full">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-8">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Model Information</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2"><Layers size={16} /> Architecture</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">YOLO</span>
              </li>
              <li className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2"><Monitor size={16} /> Framework</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">PyTorch</span>
              </li>
              <li className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2"><Cpu size={16} /> Device</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">CPU</span>
              </li>
              <li className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2"><AlignJustify size={16} /> Total Classes</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">5</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Supported Shapes</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <Heart size={18} className="text-slate-400 dark:text-slate-500" /> Heart
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <Square size={18} className="text-slate-400 dark:text-slate-500" /> Oblong
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <Circle size={18} className="text-slate-400 dark:text-slate-500" /> Oval
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <Circle size={18} className="text-slate-400 dark:text-slate-500" /> Round
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <Square size={18} className="text-slate-400 dark:text-slate-500" /> Square
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-disc pl-4 marker:text-blue-600 dark:marker:text-blue-400">
              <li>Use good, even lighting</li>
              <li>Face the camera directly</li>
              <li>Remove glasses or hats</li>
              <li>Keep a neutral expression</li>
              <li>Ensure face is clearly visible</li>
            </ul>
          </div>
        </aside>

        {/* Central Hub */}
        <div className="flex-1 flex flex-col xl:flex-row gap-6 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          
          {/* Action Tabs & Input Area */}
          <div className="flex-1 p-4 flex flex-col min-h-[500px]">
            {/* Custom Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 transition-colors">
              <button 
                onClick={() => {
                  setActiveTab("upload");
                  stopLiveCamera();
                  setCapturedImage(null);
                  setResult(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative",
                  activeTab === "upload" 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <UploadCloud size={18} /> Upload Image
                {activeTab === "upload" && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                )}
              </button>
              <button 
                onClick={() => {
                  setActiveTab("live");
                  setResult(null);
                  setSelectedImage(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative",
                  activeTab === "live" 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <Camera size={18} /> Camera Capture
                {activeTab === "live" && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 items-center justify-center relative overflow-hidden transition-colors">
              {activeTab === "upload" ? (
                <>
                  {selectedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                       <img 
                         ref={uploadImgRef}
                         src={selectedImage} 
                         alt="Selected" 
                         className="max-h-full max-w-full rounded-lg object-contain shadow-md"
                         onLoad={handleUploadImageLoad}
                       />
                       {result && (
                         <canvas 
                           ref={uploadCanvasRef} 
                           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-full max-w-full object-contain pointer-events-none"
                         />
                       )}
                       <label className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition">
                         Change Image
                         <input type="file" className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={handleFileUpload} />
                       </label>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="bg-blue-50 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                        <UploadCloud size={32} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Drag & Drop</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">PNG, JPG, JPEG up to 10MB</p>
                      
                      <label className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer inline-flex items-center gap-2 shadow-sm shadow-blue-200 dark:shadow-none">
                        <UploadCloud size={18} /> Browse Files
                        <input type="file" className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-colors">
                      <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">Analyzing Image...</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                  {/* Camera Flash Overlay */}
                  {isFlashing && (
                    <div className="absolute inset-0 bg-white z-50 animate-flash pointer-events-none" />
                  )}

                  {capturedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                       <img 
                         ref={cameraImgRef}
                         src={capturedImage} 
                         alt="Captured" 
                         className="max-h-full max-w-full rounded-lg object-contain shadow-md"
                         onLoad={handleCameraImageLoad}
                       />
                       {result && (
                         <canvas 
                           ref={cameraCanvasRef} 
                           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-full max-w-full object-contain pointer-events-none"
                         />
                       )}
                       <button 
                         onClick={startLiveCamera}
                         className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition"
                       >
                         Retake Photo
                       </button>
                    </div>
                  ) : !isLiveActive ? (
                     <div className="text-center">
                       <div className="bg-blue-50 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                         <Camera size={32} className="text-blue-600 dark:text-blue-400" />
                       </div>
                       <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Camera Capture</h3>
                       <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Take a photo using your camera to analyze your face shape</p>
                       <button 
                         onClick={startLiveCamera}
                         className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-sm shadow-blue-200 dark:shadow-none"
                       >
                         <Camera size={18} /> Open Camera
                       </button>
                       {liveError && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{liveError}</p>}
                     </div>
                  ) : (
                    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        onLoadedMetadata={() => {
                          videoRef.current?.play().catch(console.error);
                        }}
                        className="w-full h-full object-contain scale-x-[-1]"
                      />
                      
                      {/* Face Guide Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[280px] h-[360px] border-2 border-dashed border-white/40 rounded-[50%/60%_60%_40%_40%] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-xs font-medium uppercase tracking-wider text-center select-none">
                            Align Face Here
                          </div>
                        </div>
                      </div>

                      {/* Controls Overlay */}
                      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-8 z-10">
                        <button 
                           onClick={stopLiveCamera}
                           className="bg-slate-800/85 hover:bg-slate-800 text-white border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                         >
                           Cancel
                         </button>

                         <button 
                           onClick={capturePhoto}
                           className="bg-white/95 hover:bg-white text-slate-900 shadow-xl w-16 h-16 rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 group border-4 border-slate-950/10"
                           title="Take Photo"
                         >
                           <div className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center transition group-hover:bg-slate-50">
                             <Camera size={24} className="text-slate-800" />
                           </div>
                         </button>

                         <div className="w-[84px]"></div>
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-colors">
                      <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">Analyzing Photo...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results Dashboard */}
          <div className="flex-1 p-6 xl:border-l border-t xl:border-t-0 border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10 rounded-r-2xl flex flex-col transition-colors max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Sun size={20} className="text-blue-600 dark:text-blue-400" /> Results Dashboard
              </h2>
              <button 
                onClick={() => {
                  setResult(null);
                  setSelectedImage(null);
                  setCapturedImage(null);
                  stopLiveCamera();
                }}
                className="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                ↻ Reset
              </button>
            </div>

            {result ? (
              <div className="flex-1 flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Detected Shape</p>
                    <h3 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight capitalize">{result.shape}</h3>
                  </div>
                  {/* Decorative face wireframe */}
                 
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Confidence Score</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 w-20">{(result.confidence * 100).toFixed(1)}%</span>
                    <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${result.confidence * 100}%` }}
                      ></div>
                    </div>
                    {result.confidence > 0.8 ? (
                       <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md flex items-center gap-1 border border-green-200 dark:border-green-800 whitespace-nowrap transition-colors">
                         <CheckCircle2 size={12} /> High Confidence
                       </span>
                    ) : (
                       <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-md flex items-center gap-1 border border-amber-200 dark:border-amber-800 whitespace-nowrap transition-colors">
                         <AlertCircle size={12} /> Moderate
                       </span>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-colors">
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-4 text-slate-800 dark:text-slate-100">
                    <Layers size={16} /> Bounding Box Coordinates
                  </h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">xmin:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{result.bbox.xmin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">xmax:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{result.bbox.xmax}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">ymin:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{result.bbox.ymin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">ymax:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{result.bbox.ymax}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Width:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{result.bbox.width}px</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Height:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{result.bbox.height}px</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Database Eyewear Catalog */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Glasses size={18} className="text-blue-600 dark:text-blue-400" />
                    Dynamic Eyewear Recommendations
                  </h4>
                  
                  {recommendedProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {recommendedProducts.map((product) => (
                        <div 
                          key={product.id} 
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-3 relative group flex flex-col min-h-[200px] transition hover:shadow-sm"
                        >
                          {/* Image Frame */}
                          {product.image_url ? (
                            <div className="h-24 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden flex items-center justify-center mb-3">
                              <img 
                                src={product.image_url} 
                                alt={product.name} 
                                className="h-full max-w-full object-contain p-1"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="h-24 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center mb-3 text-slate-300 dark:text-slate-600">
                              <Glasses size={24} />
                            </div>
                          )}
                          
                          <div className="flex justify-between items-start text-[10px] mb-1">
                            <span className="font-extrabold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                              {product.brand}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              ${parseFloat(product.price).toFixed(2)}
                            </span>
                          </div>
                          
                          <h6 className="font-bold text-xs text-slate-800 dark:text-slate-100 line-clamp-1 mb-1">
                            {product.name}
                          </h6>
                          
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed flex-1">
                            {product.description}
                          </p>
                          
                          <button className="mt-3 w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[10px] py-2 rounded-lg font-bold transition">
                            View Details
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-2">
                        No premium eyewear currently registered for your face shape.
                      </p>
                      <Link 
                        href="/admin/add-product"
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold inline-flex items-center gap-1"
                      >
                        + Register Eyewear Product in Admin Panel
                      </Link>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <BrainCircuit size={48} className="mb-4 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
                <p>Upload an image or start live camera to see results</p>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-8 mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center text-sm gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center transition-colors">
              <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.6)] dark:shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">System Online</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">All systems operational</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8 border-l border-slate-200 dark:border-slate-700 pl-8 transition-colors">
             <div className="flex items-center gap-3">
               <Layers size={20} className="text-slate-600 dark:text-slate-400" />
               <div>
                 <p className="font-semibold text-slate-900 dark:text-slate-100">Total Classes</p>
                 <p className="text-blue-600 dark:text-blue-400 font-bold text-xs">5</p>
               </div>
             </div>
             
             <div className="flex items-center gap-3">
               <Sun size={20} className="text-slate-600 dark:text-slate-400" />
               <div>
                 <p className="font-semibold text-slate-900 dark:text-slate-100">Model Type</p>
                 <p className="text-blue-600 dark:text-blue-400 font-bold text-xs">YOLO</p>
               </div>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

