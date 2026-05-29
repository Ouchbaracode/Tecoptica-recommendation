"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Sparkles, 
  Tag, 
  DollarSign, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle,
  Glasses,
  Sun,
  Moon
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ProductInput = {
  name: string;
  brand: string;
  price: string;
  image_url: string;
  description: string;
  face_shapes: string[];
};

const SUPPORTED_SHAPES = [
  { id: "heart", name: "Heart" },
  { id: "oblong", name: "Oblong" },
  { id: "oval", name: "Oval" },
  { id: "round", name: "Round" },
  { id: "square", name: "Square" }
];

export default function AddProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductInput>({
    name: "",
    brand: "",
    price: "",
    image_url: "",
    description: "",
    face_shapes: []
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleShapeToggle = (shapeId: string) => {
    setFormData(prev => {
      const activeShapes = prev.face_shapes.includes(shapeId)
        ? prev.face_shapes.filter(s => s !== shapeId)
        : [...prev.face_shapes, shapeId];
      return {
        ...prev,
        face_shapes: activeShapes
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formData.name || !formData.brand || !formData.price) {
      setError("Please fill out all required fields.");
      return;
    }

    if (formData.face_shapes.length === 0) {
      setError("Please select at least one compatible face shape.");
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price greater than $0.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("http://localhost:8000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand,
          price: priceNum,
          description: formData.description,
          image_url: formData.image_url || null,
          face_shapes: formData.face_shapes
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to add product to the database.");
      }

      setSuccess(true);
      setFormData({
        name: "",
        brand: "",
        price: "",
        image_url: "",
        description: "",
        face_shapes: []
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans p-6 md:p-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors font-medium"
          >
            <ArrowLeft size={16} /> Back to Classifier
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Admin Workspace
            </span>
            <button 
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-slate-600" />}
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Glasses className="text-blue-600 dark:text-blue-400" size={32} /> Add Eyewear Product
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Register a new glasses model into the PostgreSQL database and assign it to matching face shapes.
          </p>
        </div>

        {success ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-lg transition-all animate-fade-in max-w-lg mx-auto space-y-6">
            <div className="bg-green-50 dark:bg-green-950/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors">
              <CheckCircle2 size={36} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Eyewear Registered!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                The product has been successfully inserted into the PostgreSQL database and will now be recommended.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button 
                onClick={() => setSuccess(false)}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition shadow-sm"
              >
                Add Another Product
              </button>
              <Link 
                href="/"
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl font-semibold text-sm transition"
              >
                Go to Classifier
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Form Column */}
            <form onSubmit={handleSubmit} className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium leading-relaxed">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Product Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      id="name" 
                      name="name"
                      required
                      placeholder="e.g., Rounded Rim Aviators"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <label htmlFor="brand" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      id="brand" 
                      name="brand"
                      required
                      placeholder="e.g., Ray-Ban"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label htmlFor="price" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Price (USD) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-xl shadow-sm">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                      <DollarSign size={16} />
                    </span>
                    <input 
                      type="number" 
                      step="0.01"
                      id="price" 
                      name="price"
                      required
                      placeholder="149.99"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-r-xl pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <label htmlFor="image_url" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Image URL
                  </label>
                  <div className="relative flex rounded-xl shadow-sm">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                      <LinkIcon size={16} />
                    </span>
                    <input 
                      type="url" 
                      id="image_url" 
                      name="image_url"
                      placeholder="https://example.com/glasses.jpg"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-r-xl pl-4 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  Product Description
                </label>
                <textarea 
                  id="description" 
                  name="description"
                  rows={3}
                  placeholder="Describe the glasses design, lens, style, and what shapes it fits best..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {/* Compatible Face Shapes */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  Compatible Face Shapes <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {SUPPORTED_SHAPES.map((shape) => {
                    const isSelected = formData.face_shapes.includes(shape.id);
                    return (
                      <button
                        type="button"
                        key={shape.id}
                        onClick={() => handleShapeToggle(shape.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition hover:scale-[1.02] active:scale-95",
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <span>{shape.icon}</span>
                        {shape.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-4 px-6 rounded-xl font-bold transition-all shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <PlusCircle size={18} /> Register Eyewear Product
                  </>
                )}
              </button>

            </form>

            {/* Preview Column */}
            <aside className="w-full lg:w-80 shrink-0 space-y-6">
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-blue-500 animate-pulse" /> Product Preview
                </h3>
                
                {/* Preview Glasses Card */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 p-4 relative group flex flex-col min-h-[300px]">
                  
                  {/* Image Frame */}
                  <div className="h-40 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 overflow-hidden flex items-center justify-center mb-4 transition">
                    {formData.image_url ? (
                      <img 
                        src={formData.image_url} 
                        alt="Product preview" 
                        className="h-full w-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                        }}
                      />
                    ) : (
                      <div className="text-slate-300 dark:text-slate-600 flex flex-col items-center gap-1.5">
                        <ImageIcon size={36} />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">No Image URL</span>
                      </div>
                    )}
                  </div>

                  {/* Brand & Price */}
                  <div className="flex justify-between items-start mb-1 text-xs">
                    <span className="font-extrabold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                      {formData.brand || "BRAND NAME"}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${formData.price ? parseFloat(formData.price).toFixed(2) : "0.00"}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 capitalize line-clamp-1 mb-2">
                    {formData.name || "Product model name"}
                  </h4>

                  {/* Description */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed flex-1">
                    {formData.description || "Describe this eyewear product to help your users understand why these glasses match their unique face shape."}
                  </p>

                  {/* Suited Badge list */}
                  <div className="flex flex-wrap gap-1 mt-4">
                    {formData.face_shapes.length > 0 ? (
                      formData.face_shapes.map(shapeId => {
                        const shape = SUPPORTED_SHAPES.find(s => s.id === shapeId);
                        return (
                          <span key={shapeId} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 capitalize text-slate-600 dark:text-slate-300">
                            <span>{shape?.icon}</span>
                            {shape?.name}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[9px] font-medium text-slate-400 italic">Select shapes to add tag badges</span>
                    )}
                  </div>

                </div>
              </div>
            </aside>

          </div>
        )}

      </div>
    </div>
  );
}
