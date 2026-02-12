import React, { useState, useRef, useEffect } from "react";
import {
  Activity,
  Upload,
  Mic,
  Play,
  Square,
  FileAudio,
  Brain,
  Stethoscope,
  Info,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("detect"); // 'detect', 'architecture', 'about'
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0); // 0: Idle, 1: Preprocessing, 2: Feature Extraction, 3: CNN-GRU Inference
  const [result, setResult] = useState(null);

  // Refs for audio processing
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationRef = useRef(null);

  // --- Audio Visualization Logic ---
  const startVisualization = (stream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    const audioCtx = audioContextRef.current;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "rgb(240, 253, 250)"; // Light teal background
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(13, 148, 136)"; // Teal-600
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // --- Recording Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualization(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioFile(audioBlob);
        stopVisualization();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setResult(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  // --- File Upload Logic ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setResult(null);
      // Note: Visualization for file upload is harder without playing it,
      // skipping viz for static upload in this demo.
    }
  };

  // --- Analysis Simulation ---
  const runAnalysis = () => {
    if (!audioFile) return;

    setIsAnalyzing(true);
    setAnalysisStep(1); // Preprocessing

    // Simulate the time steps of a CNN-GRU pipeline
    setTimeout(() => setAnalysisStep(2), 1500); // Feature Extraction
    setTimeout(() => setAnalysisStep(3), 3000); // Inference
    setTimeout(() => {
      // Mock Results
      const isHealthy = Math.random() > 0.4;
      const results = isHealthy
        ? {
            label: "Healthy",
            confidence: 0.85 + Math.random() * 0.14,
            details: "Normal respiratory sounds detected.",
          }
        : Math.random() > 0.5
        ? {
            label: "COPD",
            confidence: 0.75 + Math.random() * 0.2,
            details: "Wheezing and prolonged expiratory phase detected.",
          }
        : {
            label: "Pneumonia",
            confidence: 0.82 + Math.random() * 0.15,
            details: "Crackles and bronchial breath sounds detected.",
          };

      setResult(results);
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }, 4500);
  };

  const getStepStatus = (step) => {
    if (analysisStep === step) return "active";
    if (analysisStep > step) return "completed";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-teal-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                RespiroNet AI
              </h1>
              <p className="text-xs text-teal-100 opacity-80">
                CNN-GRU Hybrid Respiratory Analysis
              </p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-1">
            {["detect", "architecture", "about"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-white text-teal-800 shadow-sm"
                    : "text-teal-100 hover:bg-teal-600"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Detection Tab */}
        {activeTab === "detect" && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Input */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold flex items-center space-x-2 mb-4">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>Audio Acquisition</span>
                </h2>

                {/* Input Methods */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() =>
                      document.getElementById("file-upload").click()
                    }
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all group"
                  >
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-600 mb-2" />
                    <span className="text-sm font-medium text-slate-600 group-hover:text-teal-700">
                      Upload .WAV
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </button>

                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-solid rounded-xl transition-all ${
                      isRecording
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300 hover:border-teal-500 hover:bg-teal-50"
                    }`}
                  >
                    {isRecording ? (
                      <Square className="w-8 h-8 text-red-600 mb-2 animate-pulse" />
                    ) : (
                      <Mic className="w-8 h-8 text-slate-400 mb-2" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        isRecording ? "text-red-700" : "text-slate-600"
                      }`}
                    >
                      {isRecording ? "Stop Recording" : "Record Breath"}
                    </span>
                  </button>
                </div>

                {/* Visualizer / Audio Player */}
                <div className="relative bg-teal-950 rounded-xl overflow-hidden h-48 flex items-center justify-center border border-slate-800">
                  {isRecording ? (
                    <canvas
                      ref={canvasRef}
                      width="600"
                      height="200"
                      className="w-full h-full opacity-80"
                    />
                  ) : audioUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-slate-900">
                      <FileAudio className="w-12 h-12 text-teal-400" />
                      <audio src={audioUrl} controls className="w-3/4 h-8" />
                    </div>
                  ) : (
                    <div className="text-teal-400/30 text-sm font-medium flex flex-col items-center">
                      <Activity className="w-12 h-12 mb-2 opacity-20" />
                      <span>Waiting for input stream...</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={runAnalysis}
                    disabled={!audioUrl || isAnalyzing}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold shadow-md transition-all ${
                      !audioUrl || isAnalyzing
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg active:scale-95"
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        <span>Analyze Audio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Process & Results */}
            <div className="lg:col-span-1 space-y-6">
              {/* Status Stepper */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Pipeline Status
                </h3>
                <div className="space-y-4">
                  <StepItem
                    status={getStepStatus(1)}
                    title="Preprocessing"
                    desc="Noise reduction & segmentation"
                  />
                  <StepItem
                    status={getStepStatus(2)}
                    title="Feature Extraction"
                    desc="Mel-Spectrogram Generation"
                  />
                  <StepItem
                    status={getStepStatus(3)}
                    title="CNN-GRU Inference"
                    desc="Spatial-Temporal Classification"
                  />
                </div>
              </div>

              {/* Results Card */}
              {result && (
                <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div
                    className={`p-4 ${
                      result.label === "Healthy"
                        ? "bg-emerald-100"
                        : "bg-amber-100"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold opacity-60 uppercase mb-1">
                          Diagnosis Prediction
                        </p>
                        <h2
                          className={`text-2xl font-bold ${
                            result.label === "Healthy"
                              ? "text-emerald-800"
                              : "text-amber-800"
                          }`}
                        >
                          {result.label}
                        </h2>
                      </div>
                      <div
                        className={`p-2 rounded-full ${
                          result.label === "Healthy"
                            ? "bg-emerald-200"
                            : "bg-amber-200"
                        }`}
                      >
                        {result.label === "Healthy" ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-amber-700" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Confidence Score</span>
                        <span className="font-bold text-slate-800">
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${
                            result.label === "Healthy"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${result.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold block mb-1 text-slate-700">
                        Clinical Note:
                      </span>
                      {result.details}
                    </p>
                    <div className="text-xs text-slate-400 text-center pt-2">
                      * Simulation Mode: Results generated for demonstration.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === "architecture" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-slate-300 p-4 border-b border-slate-800 flex justify-between items-center">
                <span className="font-mono text-sm">model_architecture.js</span>
                <span className="text-xs bg-teal-900 text-teal-300 px-2 py-1 rounded">
                  TensorFlow.js
                </span>
              </div>
              <div className="p-6 overflow-x-auto bg-[#0f172a]">
                <pre className="font-mono text-sm text-blue-100 leading-relaxed">
                  {`// 1. Define Sequential Model
const model = tf.sequential();

// --- Feature Extraction (CNN Block) ---
// Captures spatial features from Mel-Spectrograms (Frequency domain)
model.add(tf.layers.conv1d({
    inputShape: [128, 40], // 128 time steps, 40 MFCCs
    filters: 64,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same'
}));

model.add(tf.layers.batchNormalization());
model.add(tf.layers.maxPooling1d({ poolSize: 2 }));
model.add(tf.layers.dropout({ rate: 0.3 }));

model.add(tf.layers.conv1d({
    filters: 128,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same'
}));

model.add(tf.layers.maxPooling1d({ poolSize: 2 }));

// --- Temporal Analysis (GRU Block) ---
// Captures time-dependent patterns in breathing cycles
model.add(tf.layers.gru({
    units: 128,
    returnSequences: false, // Output only the last state
    dropout: 0.2,
    recurrentDropout: 0.2
}));

// --- Classification Head ---
model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
model.add(tf.layers.dropout({ rate: 0.3 }));

// Output Layer (3 Classes: Healthy, COPD, Pneumonia)
model.add(tf.layers.dense({ 
    units: 3, 
    activation: 'softmax' 
}));

// Compile
model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
});`}
                </pre>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-2">
                  Why this Architecture?
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start">
                    <ChevronRight className="w-4 h-4 text-teal-500 mt-0.5 mr-2 shrink-0" />
                    <span>
                      <strong>CNN (1D Convolution):</strong> Excellent at
                      detecting local features in audio spectrograms, such as
                      the specific frequency spikes caused by crackles or
                      wheezes.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <ChevronRight className="w-4 h-4 text-teal-500 mt-0.5 mr-2 shrink-0" />
                    <span>
                      <strong>GRU (Gated Recurrent Unit):</strong> More
                      efficient than LSTM, it remembers sequences. Respiratory
                      diseases often manifest as patterns over time (e.g., a
                      wheeze lasts for a specific duration in the breath cycle).
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                About the Technology
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Respiratory diseases like COPD and Pneumonia have distinct audio
                signatures. Using digital stethoscopes and Deep Learning, we can
                assist early diagnosis.
              </p>

              <div className="grid gap-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      1. Input Data
                    </h3>
                    <p className="text-sm text-slate-500">
                      Raw audio is converted into Mel-Spectrograms, visual
                      representations of the sound's frequency spectrum over
                      time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      2. Hybrid AI Model
                    </h3>
                    <p className="text-sm text-slate-500">
                      We utilize a hybrid CNN-GRU architecture. The CNN extracts
                      features from the image-like spectrogram, while the GRU
                      understands the timing of the breath cycle.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>Disclaimer:</strong> This application is a technical
                  demonstration. The inference results are simulated. A
                  real-world deployment would require a backend Python API or a
                  pre-trained TensorFlow.js model file loaded into the browser.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StepItem({ status, title, desc }) {
  const getIcon = () => {
    if (status === "completed")
      return <CheckCircle2 className="w-5 h-5 text-white" />;
    if (status === "active")
      return (
        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" />
      );
    return <div className="w-2 h-2 bg-slate-300 rounded-full" />;
  };

  const getBg = () => {
    if (status === "completed") return "bg-teal-500 border-teal-500";
    if (status === "active")
      return "bg-teal-600 border-teal-600 ring-4 ring-teal-100";
    return "bg-white border-slate-200";
  };

  return (
    <div className="flex items-center group">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${getBg()}`}
      >
        {getIcon()}
      </div>
      <div className="ml-4">
        <h4
          className={`text-sm font-semibold transition-colors ${
            status === "pending" ? "text-slate-400" : "text-slate-800"
          }`}
        >
          {title}
        </h4>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}
