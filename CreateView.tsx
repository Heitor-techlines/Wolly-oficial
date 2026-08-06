/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { ArrowLeft, Camera, FolderOpen, Tag, X, MapPin, Film, Edit3, Sliders, Music, Plus, Newspaper } from "lucide-react";
import { Profile, Ink, Series, POSTIT_MUSIC_LIST } from "../types";
import { extractNewsTopic } from "../lib/newsUtils";
import { saveVideoToIndexedDB } from "../lib/videoStore";

interface CreateViewProps {
  activeProfile: Profile;
  profiles?: Profile[];
  onAddPost: (newPostData: { content: string; image?: string; theme: string; hashtags: string[]; seriesId?: string; isPulse?: boolean; category?: string; newsTopic?: string }) => void;
  onAddClip: (newClipData: { 
    description: string; 
    location: string; 
    videoPlaceholder: string; 
    theme: string; 
    hashtags: string[]; 
    videoUrl?: string;
    videoFilter?: string;
    videoTrimStart?: number;
    videoTrimEnd?: number;
    videoSpeed?: number;
    seriesId?: string;
  }) => void;
  onAddPostIt: (content: string, bgColor: string, image?: string, music?: string) => void;
  onBack: () => void;
  activeInk: Ink | null;
  onStartInk: (title: string, seriesId?: string) => void;
  onJoinActiveInk: () => void;
  onEndInk?: () => void;
  seriesList?: Series[];
  onCreateSeries?: (title: string, description: string, cover?: string) => string;
}

export default function CreateView({
  activeProfile,
  profiles = [],
  onAddPost,
  onAddClip,
  onAddPostIt,
  onBack,
  activeInk,
  onStartInk,
  onJoinActiveInk,
  onEndInk,
  seriesList = [],
  onCreateSeries,
}: CreateViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"gramp" | "pulse" | "clip" | "postit" | "ink">("gramp");
  const [content, setContent] = useState("");
  const [isModerating, setIsModerating] = useState(false);
  const [inkTitle, setInkTitle] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("Cachorro");
  const [newsTopicInput, setNewsTopicInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageFile, setImageFile] = useState<string | null>(null);
  
  // High fidelity Photo & Video Creative Creators Suite States
  const [imgBrightness, setImgBrightness] = useState(100);
  const [imgContrast, setImgContrast] = useState(100);
  const [imgGrayscale, setImgGrayscale] = useState(0);
  const [imgSepia, setImgSepia] = useState(0);
  const [imgBlur, setImgBlur] = useState(0);
  const [imgRotate, setImgRotate] = useState(0); // 0, 90, 180, 270
  const [imgTextOverlay, setImgTextOverlay] = useState("");
  const [imgFilter, setImgFilter] = useState("none"); // none, vintage, grayscale, neon, dramatic, blur
  const [showImgEditor, setShowImgEditor] = useState(false);

  const [vidFilter, setVidFilter] = useState("none"); // css string representing filter style
  const [vidTrimStart, setVidTrimStart] = useState(0);
  const [vidTrimEnd, setVidTrimEnd] = useState(59);
  const [vidSpeed, setVidSpeed] = useState(1); // Playback rate: 0.5, 1.0, 1.5, 2.0
  const [showVidEditor, setShowVidEditor] = useState(false);

  // Series Integration States
  const [addToSeries, setAddToSeries] = useState(false);
  const [seriesId, setSeriesId] = useState("");
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDesc, setNewSeriesDesc] = useState("");
  const [newSeriesCover, setNewSeriesCover] = useState("");

  const [videoPlaceholder, setVideoPlaceholder] = useState("from-indigo-950 to-purple-900");
  const [postItBgColor, setPostItBgColor] = useState("bg-yellow-101 border-yellow-201 text-yellow-1000 shadow-yellow-100/30");
  const [selectedMusic, setSelectedMusic] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video Clips recording state variables
  const [clipVideoUrl, setClipVideoUrl] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecordingCameraActive, setIsRecordingCameraActive] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Real Web Camera state declarations
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const postItColors = [
    { name: "Amarelo Pastel", value: "bg-yellow-100 border-yellow-200 text-yellow-905 shadow-yellow-100/30", dotColor: "bg-yellow-200" },
    { name: "Rosa Pastel", value: "bg-rose-100 border-rose-200 text-rose-955 shadow-rose-100/30", dotColor: "bg-rose-200" },
    { name: "Azul Pastel", value: "bg-blue-105 border-blue-200 text-blue-955 shadow-blue-100/30", dotColor: "bg-blue-200" },
    { name: "Verde Pastel", value: "bg-emerald-100 border-emerald-200 text-emerald-955 shadow-emerald-100/30", dotColor: "bg-emerald-200" },
    { name: "Laranja Pastel", value: "bg-amber-100 border-amber-200 text-amber-955 shadow-amber-100/30", dotColor: "bg-amber-200" }
  ];

  // Creative presets for Gramps
  const presets = [
    { name: "Cachorrinho 🐶", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80", tag: "Cachorro" },
    { name: "Gatinho Fofo 🐱", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80", tag: "Gato" },
    { name: "Animais Selvagens 🦁", url: "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&w=800&q=80", tag: "Outros Animais" },
    { name: "Entretenimento / Show 🎭", url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80", tag: "Entretenimento" }
  ];

  // Clip video visualization presets representing privacy-first simulated videos
  const clipPresets = [
    { name: "🐶 Brincadeiras", bg: "from-amber-950 via-zinc-900 to-amber-900" },
    { name: "🎭 Show de Humor", bg: "from-pink-950 via-rose-950 to-purple-950" },
    { name: "⚽ Golaço Incrível", bg: "from-emerald-950 via-neutral-900 to-emerald-900" },
    { name: "🎮 Gameplay Épica", bg: "from-fuchsia-950 via-slate-950 to-violet-950" },
    { name: "🍕 Receita Express", bg: "from-orange-950 via-stone-900 to-red-950" }
  ];

  // Strictly the requested 12 themes
  const themesList = [
    { id: "cachorro", name: "Cachorro", emoji: "🐶" },
    { id: "gato", name: "Gato", emoji: "🐱" },
    { id: "outros_animais", name: "Outros Animais", emoji: "🦁" },
    { id: "entretenimento", name: "Entretenimento", emoji: "🎭" },
    { id: "saude", name: "Saúde", emoji: "🏥" },
    { id: "esporte", name: "Esporte", emoji: "⚽" },
    { id: "educativo", name: "Educativo", emoji: "📚" },
    { id: "noticias", name: "Notícias", emoji: "📰" },
    { id: "jogos", name: "Jogos", emoji: "🎮" },
    { id: "anuncios", name: "Anúncios", emoji: "📢" },
    { id: "comida", name: "Comida", emoji: "🍕" },
    { id: "outros", name: "Outros", emoji: "✨" }
  ];

  const handleHashtagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const cleanVal = tagInput.trim().replace(/#/g, "");
      if (!cleanVal) return;
      if (hashtags.length >= 5) {
        alert("Wolly limita as hashtags em 5 para evitar poluição visual e spam.");
        return;
      }
      if (!hashtags.includes(`#${cleanVal}`)) {
        setHashtags([...hashtags, `#${cleanVal}`]);
      }
      setTagInput("");
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(t => t !== tagToRemove));
  };

  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => handleLocalImageUpload(e);
      input.click();
    }
  };

  const handleLocalImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setImageFile(compressedDataUrl);
          } else {
            setImageFile(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const applyImageEdits = () => {
    if (!imageFile) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calculate rotated canvas dimensions
      let finalW = img.width;
      let finalH = img.height;
      if (imgRotate === 90 || imgRotate === 270) {
        finalW = img.height;
        finalH = img.width;
      }

      // Keep canvas size responsive and within friendly processing limits (max 1200px)
      const maxDim = 1200;
      if (finalW > maxDim || finalH > maxDim) {
        if (finalW > finalH) {
          finalH = Math.round((finalH / finalW) * maxDim);
          finalW = maxDim;
        } else {
          finalW = Math.round((finalW / finalH) * maxDim);
          finalH = maxDim;
        }
      }

      canvas.width = finalW;
      canvas.height = finalH;

      // Apply Filter Styles on Canvas rendering context
      let filterString = `brightness(${imgBrightness}%) contrast(${imgContrast}%) grayscale(${imgGrayscale}%) sepia(${imgSepia}%) blur(${imgBlur}px)`;
      if (imgFilter === "vintage") filterString += " sepia(70%) saturate(85%) hue-rotate(-10deg)";
      if (imgFilter === "grayscale") filterString += " grayscale(100%) contrast(110%)";
      if (imgFilter === "neon") filterString += " hue-rotate(90deg) saturate(180%) brightness(105%)";
      if (imgFilter === "dramatic") filterString += " saturate(140%) contrast(120%) brightness(105%)";
      if (imgFilter === "blur") filterString += " blur(2px)";

      ctx.filter = filterString;

      // Rotate / Translate Center for drawing
      ctx.translate(finalW / 2, finalH / 2);
      ctx.rotate((imgRotate * Math.PI) / 180);
      
      const drawW = (imgRotate === 90 || imgRotate === 270) ? finalH : finalW;
      const drawH = (imgRotate === 90 || imgRotate === 270) ? finalW : finalH;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      // Clean transformations & filter constraints for subtitle / overlay drawings
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = "none";

      if (imgTextOverlay.trim()) {
        const textStr = imgTextOverlay.trim();
        ctx.font = "bold 26px 'Inter', sans-serif";
        const textWidth = ctx.measureText(textStr).width;
        
        const boxW = textWidth + 40;
        const boxH = 50;
        const boxX = (finalW - boxW) / 2;
        const boxY = finalH - 85;

        // Draw elegant capsule backdrop
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        // Fallback for older browsers
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxW, boxH, 14);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();

        // Draw text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(textStr, finalW / 2, boxY + boxH / 2);
      }

      // Update state with transformed results
      setImageFile(canvas.toDataURL("image/jpeg", 0.9));
      alert("Edições de imagem aplicadas com sucesso! 🎨📸");
      
      // Reset tools toggles
      setShowImgEditor(false);
      setImgTextOverlay("");
      setImgRotate(0);
      setImgFilter("none");
      setImgBrightness(100);
      setImgContrast(100);
      setImgGrayscale(0);
      setImgSepia(0);
      setImgBlur(0);
    };
    img.src = imageFile;
  };

  // Simulated Mock Stream fallback generator for sandbox iframe environments
  const generateMockStream = (): MediaStream => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    let angle = 0;
    
    const intervalId = setInterval(() => {
      if (!ctx) return;
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "#1e1b4b"); // Dark indigo
      grad.addColorStop(0.5, "#311042"); // Deep violet
      grad.addColorStop(1, "#0f172a"); // Dark slate
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Moving cosmic rings
      ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const x = canvas.width / 2 + Math.cos(angle) * 80;
      const y = canvas.height / 2 + Math.sin(angle) * 50;
      ctx.arc(x, y, 70, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(236, 72, 153, 0.3)";
      ctx.beginPath();
      ctx.arc(canvas.width / 2 - Math.cos(angle) * 60, canvas.height / 2 - Math.sin(angle) * 40, 45, 0, Math.PI * 2);
      ctx.stroke();
      
      // Crosshair / Scanner grid
      ctx.strokeStyle = "rgba(45, 212, 191, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 20, canvas.height / 2);
      ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height / 2 - 20);
      ctx.lineTo(canvas.width / 2, canvas.height / 2 + 20);
      ctx.stroke();
      
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Pulse record dot
      const showDot = Math.floor(Date.now() / 500) % 2 === 0;
      if (showDot) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(50, 50, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.fillText("REC", 68, 54);
      }
      
      // Beautiful Text Info
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("WOLLY - MOCKUP DEVICE CAMERA", canvas.width / 2, canvas.height - 70);
      
      ctx.fillStyle = "rgba(248, 250, 252, 0.75)";
      ctx.font = "500 11px monospace";
      ctx.fillText(`SIMULATED FEED: ACTIVE | TIME: ${new Date().toLocaleTimeString()}`, canvas.width / 2, canvas.height - 45);
      
      angle += 0.04;
    }, 45);
    
    let stream: MediaStream;
    if ((canvas as any).captureStream) {
      stream = (canvas as any).captureStream(25);
    } else if ((canvas as any).mozCaptureStream) {
      stream = (canvas as any).mozCaptureStream(25);
    } else {
      stream = new MediaStream();
    }
    
    const track = stream.getVideoTracks()[0];
    if (track) {
      const originalStop = track.stop.bind(track);
      track.stop = () => {
        clearInterval(intervalId);
        originalStop();
      };
    } else {
      (stream as any)._intervalId = intervalId;
    }
    
    return stream;
  };

  // Real device camera interaction flow
  const startDeviceCamera = async () => {
    setIsCameraActive(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      // Small timeout to let elements wire in case of lazy mounting
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.warn("Camera permissions/access error, falling back to simulated high fidelity camera feed:", err);
      const mockStream = generateMockStream();
      streamRef.current = mockStream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mockStream;
        }
      }, 100);
      setCameraError("Nota: Câmera física indisponível ou permissão não concedida. Usando feed virtual.");
    }
  };

  const stopDeviceCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setImageFile(dataUrl);
        stopDeviceCamera();
      }
    } catch (err) {
      console.error("Failed to capture from stream:", err);
      alert("Erro ao capturar foto. Tentando usar modo alternativo.");
    }
  };

  // Video recording control helpers
  const startRecordingCamera = async () => {
    setIsRecordingCameraActive(true);
    setCameraError(null);
    setRecordingSeconds(0);
    videoChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      recordingStreamRef.current = stream;
      setTimeout(() => {
        if (recVideoRef.current) {
          recVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.warn("Video recording camera access error, falling back to simulated high fidelity camera feed:", err);
      const mockStream = generateMockStream();
      recordingStreamRef.current = mockStream;
      setTimeout(() => {
        if (recVideoRef.current) {
          recVideoRef.current.srcObject = mockStream;
        }
      }, 100);
      setCameraError("Nota: Câmera física indisponível ou permissão não concedida. Usando feed virtual.");
    }
  };

  const stopRecordingCamera = () => {
    if (isRecordingVideo) {
      handleStopActualRecording();
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    setIsRecordingCameraActive(false);
  };

  const handleStartActualRecording = () => {
    if (!recordingStreamRef.current) return;
    try {
      videoChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(recordingStreamRef.current, {
        mimeType: "video/webm;codecs=vp8"
      });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setClipVideoUrl(reader.result as string);
        };
        reader.readAsDataURL(videoBlob);
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 59) {
            handleStopActualRecording();
            return 59;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("MediaRecorder start failed, using high fidelity emulation:", err);
      setIsRecordingVideo(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 59) {
            handleStopActualRecordingSimulated();
            return 59;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handleStopActualRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      handleStopActualRecordingSimulated();
    }
    setIsRecordingVideo(false);
  };

  const handleStopActualRecordingSimulated = () => {
    const customVideoGradients = [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    ];
    const pickedVideo = customVideoGradients[Math.floor(Math.random() * customVideoGradients.length)];
    setClipVideoUrl(pickedVideo);
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    setIsRecordingCameraActive(false);
  };

  const handleLocalVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert("O Wolly prioriza sua privacidade e conexão rápida. Carregue vídeos de até 25MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setClipVideoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Image compression and filter application helper
  const processAndCompressImage = async (dataUrl: string, filterStr: string = "none"): Promise<string> => {
    if (!dataUrl) return dataUrl;
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Keep image dimensions under 800px so base64 stays < 100KB for Firestore
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (filterStr && filterStr !== "none") {
            ctx.filter = filterStr;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handlePublish = async () => {
    let finalSeriesId: string | undefined = undefined;
    if (activeSubTab !== "postit" && addToSeries) {
      if (isCreatingNewSeries) {
        if (!newSeriesTitle.trim()) {
          alert("Por favor, dê um título para a sua nova série!");
          return;
        }
        if (!newSeriesDesc.trim()) {
          alert("Por favor, preencha a descrição da sua nova série!");
          return;
        }
        if (onCreateSeries) {
          finalSeriesId = onCreateSeries(
            newSeriesTitle.trim(),
            newSeriesDesc.trim(),
            newSeriesCover.trim() || undefined
          );
        }
      } else {
        if (!seriesId) {
          alert("Por favor, selecione uma série existente!");
          return;
        }
        finalSeriesId = seriesId;
      }
    }

    if (activeSubTab === "ink") {
      if (!inkTitle.trim()) {
        alert("Por favor, adicione um título para a sua transmissão Ink!");
        return;
      }
      onStartInk(inkTitle.trim(), finalSeriesId);
      return;
    }

    if (activeSubTab === "postit") {
      if (!content.trim() && !imageFile) {
        alert("Por favor, tire uma foto ou escreva um texto para postar o seu Story!");
        return;
      }
      if (content.trim().length > 100) {
        alert("O Story deve ter no máximo 100 caracteres!");
        return;
      }
      setIsModerating(true);
      let finalImg = imageFile || undefined;
      if (finalImg) {
        try {
          finalImg = await processAndCompressImage(finalImg, imgFilter);
        } catch (err) {
          console.warn("Erro na compressão da imagem do Story:", err);
        }
      }
      setIsModerating(false);
      onAddPostIt(content.trim(), postItBgColor, finalImg, selectedMusic || undefined);
      return;
    }

    if (!content.trim() && !imageFile && activeSubTab === "gramp") {
      alert("Por favor, adicione uma foto ou uma descrição para publicar!");
      return;
    }

    if (activeSubTab === "pulse" && !content.trim()) {
      alert("Por favor, adicione um texto para publicar no seu Pulse!");
      return;
    }

    // AI content moderation check
    setIsModerating(true);
    try {
      const response = await fetch("/api/ai/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content,
          image: activeSubTab === "gramp" ? (imageFile || undefined) : undefined
        })
      });
      const data = await response.json();
      if (data && data.success) {
        if (!data.approved) {
          alert(`🚫 PUBLICAR BARRADO POR ASSISTENTE IA:\n\n${data.reason}\n\nO Wolly valoriza a segurança digital e repudia agressividade, termos tóxicos ou violência.`);
          setIsModerating(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Erro ao invocar moderação de IA, permitindo contingentemente:", err);
    }
    setIsModerating(false);

    if (activeSubTab === "gramp" || activeSubTab === "pulse") {
      let finalGrampImg = activeSubTab === "gramp" ? (imageFile || undefined) : undefined;
      if (finalGrampImg) {
        finalGrampImg = await processAndCompressImage(finalGrampImg, imgFilter);
      }
      onAddPost({
        content: content.trim(),
        image: finalGrampImg,
        theme: selectedTheme,
        category: selectedTheme,
        newsTopic: selectedTheme === "Notícias" ? (newsTopicInput.trim() || extractNewsTopic(content, hashtags)) : undefined,
        hashtags: hashtags,
        seriesId: finalSeriesId,
        isPulse: activeSubTab === "pulse"
      });
    } else if (activeSubTab === "clip") {
      if (!content.trim()) {
        alert("Por favor, adicione uma legenda para seu Clip!");
        return;
      }
      
      let finalVideoUrl: string | undefined = undefined;
      if (clipVideoUrl) {
        let base64ToUpload: string | null = null;

        if (clipVideoUrl.startsWith("blob:")) {
          try {
            const blobRes = await fetch(clipVideoUrl);
            const blobData = await blobRes.blob();
            base64ToUpload = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blobData);
            });
          } catch (e) {
            console.warn("Erro ao converter blob de vídeo para base64:", e);
          }
        } else if (clipVideoUrl.startsWith("data:")) {
          base64ToUpload = clipVideoUrl;
        } else {
          finalVideoUrl = clipVideoUrl;
        }

        if (base64ToUpload) {
          setIsModerating(true);
          try {
            const uploadResponse = await fetch("/api/upload-video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                videoData: base64ToUpload,
                filename: `clip_${activeProfile.id}_${Date.now()}`
              })
            });
            const uploadResult = await uploadResponse.json();
            if (uploadResult && uploadResult.success) {
              finalVideoUrl = uploadResult.videoUrl;
              if (finalVideoUrl && base64ToUpload) {
                saveVideoToIndexedDB(finalVideoUrl, base64ToUpload).catch((err) => console.warn("Erro ao salvar vídeo no IndexedDB:", err));
              }
            } else {
              console.warn("Upload de vídeo falhou no backend:", uploadResult?.error);
              finalVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
            }
          } catch (uploadErr) {
            console.warn("Erro de rede ao enviar vídeo para o backend:", uploadErr);
            finalVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
          }
          setIsModerating(false);
        }
      }

      if (!finalVideoUrl) {
        const sampleVideos = [
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        ];
        finalVideoUrl = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];
      }

      const finalLoc = location.trim() || undefined;
      onAddClip({
        description: content.trim(),
        location: finalLoc || "Brasil",
        videoPlaceholder: videoPlaceholder,
        theme: selectedTheme,
        hashtags: hashtags,
        videoUrl: finalVideoUrl,
        videoFilter: vidFilter !== "none" ? vidFilter : undefined,
        videoTrimStart: vidTrimStart,
        videoTrimEnd: vidTrimEnd,
        videoSpeed: vidSpeed,
        seriesId: finalSeriesId
      });
    }
  };

  return (
    <div id="create-view-root" className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* Hidden File Input accessible across all tabs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLocalImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Top navigation header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
        <button id="btn-back-create" onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-black text-sm tracking-wide text-slate-900">Novo Conteúdo</span>
        <button
          id="btn-publish-post"
          onClick={handlePublish}
          disabled={isModerating}
          className={`px-4 py-1.5 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1 ${isModerating ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}
        >
          {isModerating ? (
            <>
              <span>Analisando...</span>
              <span className="animate-spin text-xs">🧠</span>
            </>
          ) : (
            <>
              <span>Publicar</span>
              <span>🚀</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 mt-4 space-y-5">
        
        {/* Sub-tabs selections strictly for Gramps, Pulses, Clips, and Post It */}
        <div className="bg-slate-200/60 p-1 rounded-2xl flex items-center justify-between shadow-xs select-none text-[11px] gap-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("gramp");
              setSelectedTheme("Cachorro");
            }}
            className={`flex-1 py-2 font-display text-center font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 ${activeSubTab === "gramp" ? "bg-white text-indigo-700 font-extrabold shadow-3xs" : "text-slate-550 hover:text-slate-900"}`}
          >
            📸 Gramps
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("pulse");
              setSelectedTheme("Outros");
            }}
            className={`flex-1 py-2 font-display text-center font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 ${activeSubTab === "pulse" ? "bg-white text-emerald-700 font-extrabold shadow-3xs" : "text-slate-550 hover:text-slate-900"}`}
          >
            ⚡ Pulse
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("clip");
              setSelectedTheme("Cachorro");
            }}
            className={`flex-1 py-2 font-display text-center font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 ${activeSubTab === "clip" ? "bg-white text-purple-700 font-extrabold shadow-3xs" : "text-slate-550 hover:text-slate-900"}`}
          >
            🎞 Clips
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("postit");
            }}
            className={`flex-1 py-2 font-display text-center font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 ${activeSubTab === "postit" ? "bg-white text-amber-700 font-extrabold shadow-3xs" : "text-slate-550 hover:text-slate-900"}`}
          >
            📌 PostIt
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab("ink");
            }}
            className={`flex-1 py-2 font-display text-center font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 ${activeSubTab === "ink" ? "bg-white text-rose-700 font-extrabold shadow-3xs" : "text-slate-550 hover:text-slate-900"}`}
          >
            📺 Ink
          </button>
        </div>

        {/* Option 1: Gramps (Text + Optional Image) */}
        {activeSubTab === "gramp" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Gallery Trigger */}
              <button
                type="button"
                id="btn-upload-file"
                onClick={triggerImageUpload}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-500/70 hover:bg-indigo-50/20 active:scale-98 cursor-pointer rounded-2xl h-36 flex flex-col justify-center items-center text-center p-3 transition-all bg-white shadow-3xs w-full"
              >
                <FolderOpen className="w-7 h-7 text-indigo-500 mb-1.5" />
                <span className="text-xs font-bold text-slate-700">Galeria</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Buscar imagem local</span>
              </button>

              {/* Camera Trigger */}
              <div
                id="btn-trigger-device-camera"
                onClick={startDeviceCamera}
                className="border-2 border-dashed border-slate-200 hover:border-purple-500/70 hover:bg-purple-50/20 active:scale-98 cursor-pointer rounded-2xl h-36 flex flex-col justify-center items-center text-center p-3 transition-all bg-white shadow-3xs"
              >
                <Camera className="w-7 h-7 text-purple-500 mb-1.5" />
                <span className="text-xs font-bold text-slate-700">Câmera Real</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Ligar câmera do dispositivo</span>
              </div>
            </div>

            {/* Selected Image preview with fully actionable editor! */}
            {imageFile && (
              <div className="relative rounded-2xl border border-slate-150 bg-white p-3 shadow-3xs text-left space-y-3">
                <div className="relative rounded-xl overflow-hidden">
                  <img referrerPolicy="no-referrer" src={imageFile} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setShowImgEditor(false);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded-full text-white cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Collapsible Creative Suite Editor Header */}
                <button
                  type="button"
                  onClick={() => setShowImgEditor(!showImgEditor)}
                  className="w-full py-1.8 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border-0"
                >
                  <span className="flex items-center gap-1.5">
                    🎨 {showImgEditor ? "Fechar Estúdio Criativo" : "Editar foto no Estúdio Criativo"}
                  </span>
                  <span className="text-[10px] bg-indigo-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                    {showImgEditor ? "Recolher" : "Expandir"}
                  </span>
                </button>

                {showImgEditor && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-800 space-y-3.5 animate-slide-up">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">✨ Ferramentas de Processamento</span>
                    
                    {/* Filter Presets Grid */}
                    <div className="space-y-1.5">
                      <span className="text-[10.5px] font-bold text-slate-500">Preset Cromático:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "none", name: "Original" },
                          { id: "vintage", name: "Vintage" },
                          { id: "grayscale", name: "P&B" },
                          { id: "neon", name: "Ciborgue" },
                          { id: "dramatic", name: "Dramático" },
                          { id: "blur", name: "Desfocado" }
                        ].map((filt) => (
                          <button
                            key={filt.id}
                            type="button"
                            onClick={() => setImgFilter(filt.id)}
                            className={`py-1 text-[9.5px] font-black rounded-lg border transition-all cursor-pointer ${
                              imgFilter === filt.id
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {filt.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fine adjustments sliders */}
                    <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                      {/* Brightness */}
                      <div className="space-y-1 text-left">
                        <span className="font-bold text-slate-650">Brilho ({imgBrightness}%)</span>
                        <input
                          type="range"
                          min="30"
                          max="200"
                          value={imgBrightness}
                          onChange={(e) => setImgBrightness(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-ew-resize h-1 bg-slate-200 rounded-lg appearance-none animate-none p-0 inline-block"
                        />
                      </div>
                      
                      {/* Contrast */}
                      <div className="space-y-1 text-left">
                        <span className="font-bold text-slate-650">Contraste ({imgContrast}%)</span>
                        <input
                          type="range"
                          min="30"
                          max="200"
                          value={imgContrast}
                          onChange={(e) => setImgContrast(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-ew-resize h-1 bg-slate-200 rounded-lg appearance-none animate-none p-0 inline-block"
                        />
                      </div>

                      {/* Sepia */}
                      <div className="space-y-1 text-left">
                        <span className="font-bold text-slate-650">Sépia ({imgSepia}%)</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={imgSepia}
                          onChange={(e) => setImgSepia(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-ew-resize h-1 bg-slate-200 rounded-lg appearance-none animate-none p-0 inline-block"
                        />
                      </div>

                      {/* Blur */}
                      <div className="space-y-1 text-left">
                        <span className="font-bold text-slate-650">Foco / Blur ({imgBlur}px)</span>
                        <input
                          type="range"
                          min="0"
                          max="6"
                          value={imgBlur}
                          onChange={(e) => setImgBlur(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-ew-resize h-1 bg-slate-200 rounded-lg appearance-none animate-none p-0 inline-block"
                        />
                      </div>
                    </div>

                    {/* Rotation and Angle tools */}
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200/50">
                      <span className="text-[10.5px] font-bold text-slate-700">Rotacionar Angulação:</span>
                      <div className="flex gap-1">
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => setImgRotate(deg)}
                            className={`w-10 py-1 text-[9px] font-black border rounded-md transition-all cursor-pointer ${
                              imgRotate === deg
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subtitle text overlay tool */}
                    <div className="space-y-1 text-left">
                      <span className="text-[11px] font-bold text-slate-700">Legenda fixa sobreposta na imagem:</span>
                      <input
                        type="text"
                        placeholder="Ex: Rio de Janeiro, 2026..."
                        value={imgTextOverlay}
                        onChange={(e) => setImgTextOverlay(e.target.value)}
                        className="w-full font-sans text-xs bg-white border border-slate-200 rounded-xl p-2 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Bake Edits Trigger button */}
                    <button
                      type="button"
                      onClick={applyImageEdits}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-98 border-0"
                    >
                      <span>Aplicar Transformações 🎨✨</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick preset selection */}
            {!imageFile && (
              <div className="bg-slate-200/40 p-3.5 rounded-2xl border border-slate-200/20">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-2 text-left">Ideias Rápidas de Imagens</span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setImageFile(p.url);
                        setSelectedTheme(p.tag);
                      }}
                      className="text-[10px] bg-white border border-slate-200 p-2 hover:border-indigo-400 hover:text-indigo-700 rounded-xl font-semibold transition-all truncate text-left"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Option 2: Clips (Short Privacy Videos) */}
        {activeSubTab === "clip" && (
          <div className="space-y-4">
            {/* Visualizer Theme Match for Simulated or Real Clips */}
            {/* Visualizer Theme Match for Simulated or Real Clips */}
            {clipVideoUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-150 bg-black aspect-video shadow-md flex items-center justify-center group">
                  <video
                    src={clipVideoUrl}
                    autoPlay
                    controls
                    loop
                    muted
                    playsInline
                    style={{
                      filter: vidFilter === "vintage" ? "sepia(70%) saturate(85%) hue-rotate(-10deg)" :
                              vidFilter === "grayscale" ? "grayscale(100%) contrast(110%)" :
                              vidFilter === "neon" ? "hue-rotate(90deg) saturate(180%) brightness(105%)" :
                              vidFilter === "dramatic" ? "saturate(140%) contrast(120%) brightness(105%)" :
                              vidFilter === "blur" ? "blur(3px)" : "none"
                    }}
                    className="w-full h-full object-cover"
                    ref={(el) => {
                      if (el) {
                        try {
                          el.playbackRate = vidSpeed;
                        } catch (err) {}
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setClipVideoUrl(null);
                      setShowVidEditor(false);
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black/90 rounded-full text-white cursor-pointer transition-colors z-10"
                    title="Excluir Vídeo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-purple-600/90 text-[9px] px-2.5 py-1 rounded-md text-white font-extrabold font-mono tracking-widest uppercase">
                    Vídeo Ativo 🎥
                  </div>
                </div>

                {/* Collapsible Video Editor panel */}
                <button
                  type="button"
                  onClick={() => setShowVidEditor(!showVidEditor)}
                  className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border-0"
                >
                  <span className="flex items-center gap-1.5">
                    🎬 {showVidEditor ? "Fechar Estúdio de Vídeo" : "Editar vídeo no Estúdio de Vídeo"}
                  </span>
                  <span className="text-[10px] bg-purple-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                    {showVidEditor ? "Recolher" : "Expandir"}
                  </span>
                </button>

                {showVidEditor && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-800 space-y-4 animate-slide-up text-left">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block">🎞️ Controle e Filtros de Cinema</span>

                    {/* Film Color Presets */}
                    <div className="space-y-1.5">
                      <span className="text-[10.5px] font-bold text-slate-500">Filtro de Cinema:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "none", name: "Original 🎬" },
                          { id: "vintage", name: "Super 8 🎞️" },
                          { id: "grayscale", name: "Classic Noir 🎥" },
                          { id: "neon", name: "Cyber Neon ⚡" },
                          { id: "dramatic", name: "Vibrante 🍿" },
                          { id: "blur", name: "Neblina 💨" }
                        ].map((filt) => (
                          <button
                            key={filt.id}
                            type="button"
                            onClick={() => setVidFilter(filt.id)}
                            className={`py-1.5 text-[9px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                              vidFilter === filt.id
                                ? "bg-purple-600 text-white border-purple-600 shadow-3xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {filt.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Speed Controls */}
                    <div className="space-y-1.5">
                      <span className="text-[10.5px] font-bold text-slate-500">Velocidade de Reprodução ({vidSpeed}x):</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => setVidSpeed(spd)}
                            className={`py-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                              vidSpeed === spd
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {spd === 0.5 ? "Slow 0.5x" : spd === 1.0 ? "Normal 1x" : spd === 1.5 ? "Fast 1.5x" : "Hyper 2x"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trim sliders */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-500">
                        <span>Corte Temporal (Trim):</span>
                        <span className="font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{vidTrimStart}s até {vidTrimEnd}s</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[10.5px]">
                        <div className="space-y-1">
                          <span className="text-slate-500 font-semibold">Início do Vídeo</span>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(0, vidTrimEnd - 1)}
                            value={vidTrimStart}
                            onChange={(e) => setVidTrimStart(Number(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none p-0 inline-block cursor-ew-resize accent-purple-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 font-semibold">Fim do Vídeo (máx 59s)</span>
                          <input
                            type="range"
                            min={vidTrimStart + 1}
                            max="59"
                            value={vidTrimEnd}
                            onChange={(e) => setVidTrimEnd(Number(e.target.value))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none p-0 inline-block cursor-ew-resize accent-purple-600"
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400">O Wolly Clips suporta o corte automático loops de no máximo 59 segundos para manter os clipes engajantes.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        alert("Edições e filtros de vídeo configurados! 🎞️✨ O vídeo será publicado e reproduzido com esses efeitos.");
                        setShowVidEditor(false);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition-all active:scale-98 border-0"
                    >
                      Salvar Efeitos de Cinema 🎬💜
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={`p-5 rounded-2xl bg-gradient-to-br ${videoPlaceholder} text-white flex flex-col justify-between aspect-video relative overflow-hidden shadow-md border border-white/10 transition-all duration-350`}>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
                
                <div className="flex items-center justify-between z-10">
                  <span className="bg-purple-600/80 backdrop-blur-md text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-mono">
                    Aguardando Conteúdo
                  </span>
                  <Film className="w-4 h-4 text-purple-300 animate-pulse" />
                </div>

                <div className="text-center z-10 py-1.5">
                  <span className="text-4xl">🍿</span>
                  <p className="text-xs font-bold tracking-wide mt-1 drop-shadow-md">Nenhum vídeo capturado</p>
                  <p className="text-[9px] text-purple-200/90 leading-tight">Grave via sua webcam ou selecione um clipe mp4 da sua galeria abaixo!</p>
                </div>

                <div className="flex justify-between items-end z-10 text-[10px] text-slate-350">
                  <span className="font-semibold text-white">@{activeProfile.name.split(" ")[0]}</span>
                  <span className="font-mono text-[9px]">📍 {location || "Brasil"}</span>
                </div>
              </div>
            )}

            {/* Video Input Control Box */}
            <div className="bg-slate-200/45 p-4 rounded-3xl border border-slate-200/20 space-y-3 text-left shadow-2xs">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block">🎥 Gravar ou Carregar Clipe</span>
              
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={startRecordingCamera}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer active:scale-98"
                >
                  <Camera className="w-4 h-4 text-purple-650" />
                  <span>Gravar Webcam</span>
                </button>
                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer active:scale-98"
                >
                  <FolderOpen className="w-4 h-4 text-indigo-650" />
                  <span>Sua Galeria</span>
                </button>
                <input
                  type="file"
                  ref={videoFileInputRef}
                  onChange={handleLocalVideoUpload}
                  accept="video/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Presets Selectors for simulated colors as fallback */}
            {!clipVideoUrl && (
              <div className="bg-slate-200/40 p-3.5 rounded-2xl border border-slate-200/20 space-y-2">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block text-left">Ou escolha o Tema Visual como reserva</span>
                <div className="grid grid-cols-2 gap-2">
                  {clipPresets.map((cp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setVideoPlaceholder(cp.bg)}
                      className={`text-[10px] p-2 rounded-xl font-semibold transition-all text-left flex items-center justify-between border ${
                        videoPlaceholder === cp.bg 
                          ? "bg-purple-600 text-white border-purple-600 shadow-3xs" 
                          : "bg-white border-slate-200 text-slate-650 hover:bg-slate-100"
                      }`}
                    >
                      <span>{cp.name}</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr" style={{ background: `linear-gradient(to bottom right, ${cp.bg.split(' ')[1]}, ${cp.bg.split(' ')[cp.bg.split(' ').length - 1]})` }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location Input field for clip */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs space-y-2 text-left">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-purple-500" /> Localização do Clipe
              </label>
              <input
                type="text"
                value={location}
                placeholder="Ex: São Paulo, SP ou Pedra da Gávea, RJ"
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-250/50 focus:outline-hidden focus:border-purple-600 focus:bg-white text-slate-800 font-medium font-sans transition-all"
              />
            </div>
          </div>
        )}

        {/* Option 3: Post It (Short Temporary Stick Note) */}
        {activeSubTab === "postit" && (
          <div className="space-y-4 text-left">
            {/* 1º PASSO: Botão de Câmera ao lado de um Botão de Upload */}
            <div className="bg-slate-200/50 p-4 rounded-2xl border border-slate-300/40 space-y-3">
              <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider block">
                📸 1. Capturar Foto / Upload
              </span>
              
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={startDeviceCamera}
                  className="py-3 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Câmera</span>
                </button>
                <button
                  type="button"
                  onClick={triggerImageUpload}
                  className="py-3 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <FolderOpen className="w-4 h-4 text-purple-300" />
                  <span>📁 Upload</span>
                </button>
              </div>

              {/* Display selected/uploaded image preview */}
              {imageFile && (
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-300 shadow-sm group">
                  <img
                    referrerPolicy="no-referrer"
                    src={imageFile}
                    alt="Preview Post It"
                    className="w-full h-full object-cover transition-all"
                    style={{ filter: imgFilter !== "none" ? imgFilter : undefined }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full text-white transition-colors cursor-pointer shadow-sm"
                    title="Remover foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Photo Presets for quick selection */}
              <div className="space-y-1.5 pt-2 border-t border-slate-300/40">
                <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wide">Ou selecione uma foto da galeria rápida:</span>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setImageFile(preset.url)}
                      className="px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 bg-white border border-slate-200 rounded-lg transition-all cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2º PASSO: Botão/Seção de Editar (Textos, Filtros e Cores) */}
            <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-purple-900 uppercase tracking-wider">
                <Edit3 className="w-4 h-4 text-purple-600" />
                <span>✏️ 2. Editar (Adicionar Textos & Filtros)</span>
              </div>

              {/* Adicionar Texto */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 block">
                  ✍️ Digite a legenda do Story:
                </label>
                <textarea
                  id="textarea-postit-edit-text"
                  maxLength={100}
                  placeholder="Escreva algo especial para durar 24h... (use @para marcar um perfil)"
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 100))}
                  className="w-full bg-white border border-purple-200 rounded-xl p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-600 shadow-2xs resize-none"
                  rows={2}
                />
                
                {/* Marcar Perfil com @ */}
                {profiles.length > 1 && (
                  <div className="pt-1 space-y-1">
                    <label className="text-[10px] font-bold text-purple-900 flex items-center justify-between">
                      <span>🏷️ Marcar perfil (@):</span>
                      <span className="text-[9px] text-purple-600">Toque para incluir @ no Post It</span>
                    </label>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-white rounded-xl border border-purple-200">
                      {profiles
                        .filter((p) => p.id !== activeProfile.id)
                        .map((p) => {
                          const tagText = `@${(p.nickname || p.name).replace(/^@/, "")}`;
                          const isSelected = content.includes(tagText);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setContent(content.replace(tagText, "").trim());
                                } else {
                                  const space = content && !content.endsWith(" ") ? " " : "";
                                  setContent((content + space + tagText + " ").slice(0, 100));
                                }
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                                  : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100"
                              }`}
                            >
                              {tagText}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filtros para Foto */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>🎨 Filtros na Foto:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "none", label: "✨ Normal" },
                    { id: "sepia(0.35) contrast(1.15) brightness(0.95)", label: "🎞️ Vintage" },
                    { id: "grayscale(100%) contrast(1.2)", label: "🖤 P&B" },
                    { id: "sepia(0.8) contrast(1.1)", label: "📜 Sépia" },
                    { id: "saturate(1.8) contrast(1.15)", label: "🌈 Vívido" },
                    { id: "hue-rotate(-10deg) saturate(1.3)", label: "☀️ Quente" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setImgFilter(f.id)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        imgFilter === f.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cores Pastéis */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-slate-700 block">
                  🎨 Cor Pastel do Cartão:
                </label>
                <div className="flex items-center gap-2">
                  {postItColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setPostItBgColor(color.value)}
                      className={`w-8 h-8 rounded-full ${color.dotColor} border border-black/10 transition-transform ${postItBgColor === color.value ? "ring-2 ring-purple-600 ring-offset-2 scale-110" : "hover:scale-105"}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 3º PASSO: Upload Opcional de Música (No fim) */}
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase tracking-wider">
                  <Music className="w-4 h-4 text-emerald-600" />
                  <span>🎧 3. Upload Opcional de Música</span>
                </div>
                <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">Opcional</span>
              </div>

              {/* Botão de Upload de MP3 / Áudio Local */}
              <div className="space-y-2">
                <label className="w-full py-2.5 px-3 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>🎵 Fazer Upload de Música MP3</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const cleanName = file.name.replace(/\.[^/.]+$/, "");
                        setSelectedMusic(`🎧 ${cleanName}`);
                      }
                    }}
                  />
                </label>

                {/* Opções Rápida de Trilha Sonora */}
                <span className="text-[9.5px] text-slate-600 font-bold uppercase tracking-wide block">Ou escolha uma trilha sugerida:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMusic("")}
                    className={`py-2 px-2.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      !selectedMusic
                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>🔇 Sem música</span>
                  </button>
                  {POSTIT_MUSIC_LIST.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setSelectedMusic(selectedMusic === track.name ? "" : track.name)}
                      className={`py-2 px-2.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedMusic === track.name
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{track.icon}</span>
                      <span className="truncate">{track.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMusic && (
                <div className="bg-emerald-100 border border-emerald-300 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
                  <span className="truncate">{selectedMusic}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMusic("")}
                    className="text-emerald-800 hover:text-emerald-950 p-0.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Direct Action Button to Publish Post-It / Story */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePublish}
                disabled={isModerating}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isModerating ? (
                  <>
                    <span className="animate-spin text-sm">⌛</span>
                    <span>Publicando Post-It...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">📌</span>
                    <span>Publicar Post-It / Story (24h) 🚀</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* Option 4: Ink (Live transmissions creator system) */}
        {activeSubTab === "ink" && (
          <div id="create-ink-panel" className="space-y-4">
            {/* Visualizer stream live preview */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-rose-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between aspect-video relative overflow-hidden shadow-md border border-white/10 select-none">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="flex items-center justify-between z-10">
                <span className="bg-rose-600 font-bold font-mono tracking-widest text-[9px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  <span>{activeInk ? "TRANSMISSÃO ATIVA AO VIVO" : "PRONTO PARA TRANSMITIR"}</span>
                </span>
                {activeInk && (
                  <span className="text-[10px] bg-red-650 text-white font-mono px-2 py-0.5 rounded-md font-bold animate-pulse">
                    LIVE
                  </span>
                )}
              </div>

              <div className="text-center py-2 z-10">
                <span className="text-3xl">{activeInk ? "📶📺" : "🎥"}</span>
                <p className="text-xs font-black tracking-wide mt-1.5">Wolly Ink Livestream</p>
                {activeInk ? (
                  <p className="text-[10px] text-rose-200 leading-relaxed font-semibold max-w-[85%] mx-auto text-center">
                    Transmissão ativa: <strong className="text-white font-bold">"{activeInk.title}"</strong> por @{activeInk.authorName}
                  </p>
                ) : (
                  <p className="text-[9px] text-rose-250/90 leading-relaxed font-semibold max-w-[85%] mx-auto text-center">
                    Transmissão 100% em áudio ao vivo. Fala e som em tempo real sem câmera/vídeo.
                  </p>
                )}
              </div>

              <div className="flex justify-between items-end z-10 text-[9.5px] text-slate-400 font-mono">
                <span className="font-bold text-white uppercase font-display">@{activeProfile.nickname.replace("@", "")}</span>
                <span>🛡️ CONEXÃO SOBERANA</span>
              </div>
            </div>

            {/* Title Form Field input */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs space-y-2 text-left">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                🎯 Nome da sua Ink (Título da Transmissão)
              </label>
              <input
                id="input-ink-title-field"
                type="text"
                value={inkTitle}
                placeholder="Ex: Café, música e bate-papo! ☕🎙️"
                onChange={(e) => setInkTitle(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-rose-500 focus:bg-white text-slate-800 font-medium font-sans transition-all"
                maxLength={100}
                required
              />
            </div>

            {/* Action Buttons: Create and Cancel options requested by the user */}
            <div className="space-y-2">
              <button
                id="btn-direct-transmit-ink"
                disabled={!inkTitle.trim()}
                onClick={() => handlePublish()}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-display font-semibold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                🚀 Criar Ink e Transmitir
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInkTitle("")}
                  disabled={!inkTitle.trim()}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-650 font-display font-medium text-xs rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  Limpar Nome
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeInk) {
                      if (confirm("Deseja realmente cancelar/encerrar a transmissão Ink de forma definitiva?")) {
                        if (onEndInk) {
                          onEndInk();
                        }
                      }
                    } else {
                      onBack();
                    }
                  }}
                  className="py-2.5 bg-rose-50 hover:bg-rose-100/80 text-rose-600 font-display font-medium text-xs rounded-xl border border-rose-100 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {activeInk ? "🛑 Cancelar Ink Ativa" : "❌ Cancelar"}
                </button>
              </div>
            </div>

            {/* Active spectator option if someone else is broadcasting */}
            {activeInk && activeInk.profileId !== activeProfile.id && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
                <span className="text-[11px] font-bold text-amber-800">💡 Há outra live acontecendo!</span>
                <p className="text-[11.5px] text-slate-600 leading-normal font-sans">
                  Você pode entrar como espectador na live de <b>@{activeInk.authorName}</b> ou iniciar a sua própria acima para substituí-la.
                </p>
                <button
                  onClick={onJoinActiveInk}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10.5px] cursor-pointer"
                >
                  Entrar como Espectador
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content Details Block (Only for Gramps, Pulses & Clips) */}
        {activeSubTab !== "postit" && activeSubTab !== "ink" && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs text-left">
            <label className="text-xs font-bold text-slate-800 block mb-2">
              {activeSubTab === "gramp" 
                ? "O que você está pensando? (Legenda)" 
                : activeSubTab === "pulse" 
                  ? "O que você quer compartilhar no seu Pulse? (Apenas Texto)" 
                  : "Legenda e Descrição do Clipe"}
            </label>
            <textarea
              id="text-describe-moment"
              placeholder={
                activeSubTab === "gramp" 
                  ? "Escreva aqui os pensamentos da sua postagem... (use @para marcar)" 
                  : activeSubTab === "pulse" 
                    ? "Escreva o seu texto rápido aqui... (use @para marcar)" 
                    : "Digite o que acontece no seu vídeo..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[95px] text-xs leading-relaxed text-slate-700 bg-transparent focus:outline-hidden placeholder-slate-400 font-sans resize-none"
            />

            {/* Marcar perfil com @ em Gramps/Pulses */}
            {profiles.length > 1 && (activeSubTab === "gramp" || activeSubTab === "pulse") && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                  <span>🏷️ Marcar perfil com @:</span>
                  <span className="text-[9px] text-indigo-600 font-semibold">Toque para incluir no texto</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/70">
                  {profiles
                    .filter((p) => p.id !== activeProfile.id)
                    .map((p) => {
                      const tagText = `@${(p.nickname || p.name).replace(/^@/, "")}`;
                      const isSelected = content.includes(tagText);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setContent(content.replace(tagText, "").trim());
                            } else {
                              const space = content && !content.endsWith(" ") ? " " : "";
                              setContent(content + space + tagText + " ");
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600"
                          }`}
                        >
                          {tagText}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* strictly specified themes (Only for Gramps & Clips) */}
        {activeSubTab !== "postit" && activeSubTab !== "ink" && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs text-left space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Classifique a publicação por Tema</span>
            <div className="grid grid-cols-3 gap-1.5 font-semibold text-xs text-slate-700">
              {themesList.map((thm) => (
                <button
                  key={thm.id}
                  type="button"
                  onClick={() => setSelectedTheme(thm.name)}
                  className={`py-2 px-1 text-center rounded-xl border text-[10px] font-bold transition-all flex flex-col justify-center items-center gap-1 cursor-pointer min-h-[55px] ${
                    selectedTheme === thm.name
                      ? activeSubTab === "gramp"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-3xs"
                        : activeSubTab === "pulse"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-3xs"
                          : "bg-purple-600 text-white border-purple-600 shadow-3xs"
                      : "bg-slate-50 border-slate-150/40 text-slate-600 hover:bg-slate-100/70"
                  }`}
                >
                  <span className="text-xs leading-none">{thm.emoji}</span>
                  <span className="leading-tight">{thm.name}</span>
                </button>
              ))}
            </div>

            {selectedTheme === "Notícias" && (
              <div className="pt-2 border-t border-slate-100 space-y-2 animate-fade-in">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Newspaper className="w-3.5 h-3.5 text-blue-600" />
                  Tópico de Busca no Line News (<code className="text-blue-600">newsTopic</code>)
                </label>
                <input
                  type="text"
                  value={newsTopicInput}
                  onChange={(e) => setNewsTopicInput(e.target.value)}
                  placeholder="Ex: Inteligência Artificial, Política, Economia, Futebol..."
                  className="w-full text-xs bg-blue-50/50 rounded-xl px-3.5 py-2.5 border border-blue-200 focus:outline-hidden focus:border-blue-600 font-medium text-slate-800"
                  maxLength={80}
                />
                <p className="text-[10px] text-slate-500 italic">
                  Este tópico será enviado para pesquisa automática no portal Line News (news.techl.com.br).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selected Hashtags list block (Only for Gramps & Clips) */}
        {activeSubTab !== "postit" && activeSubTab !== "ink" && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs text-left space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" /> Hashtags ({hashtags.length}/5)
              </span>
              <span className="text-[10px] text-slate-400">Espaço ou Enter para somar</span>
            </div>

            <div className="space-y-2">
              <input
                id="hashtag-input"
                type="text"
                placeholder="#hashtag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                className="w-full text-xs placeholder-slate-400 bg-slate-50 rounded-xl px-3.5 py-2 border border-slate-100 focus:outline-hidden focus:border-indigo-500/70"
              />

              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 pl-2.5 pr-1.5 py-0.5 rounded-lg font-mono font-semibold"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="p-0.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Series integration block */}
        {activeSubTab !== "postit" && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs text-left space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 select-none animate-fade-in">
                <span>🧵</span> <span>Adicionar este conteúdo a uma Série?</span>
              </span>
              <input
                type="checkbox"
                checked={addToSeries}
                onChange={(e) => {
                  setAddToSeries(e.target.checked);
                  // Default to creating new series if list is empty
                  if (e.target.checked && seriesList.length === 0) {
                    setIsCreatingNewSeries(true);
                  }
                }}
                className="w-4 h-4 rounded text-indigo-650 focus:ring-indigo-500 border-slate-200 cursor-pointer"
              />
            </div>

            {addToSeries && (
              <div className="space-y-4 pt-1">
                {/* Switcher: Create new vs Select existing */}
                <div className="flex bg-slate-50 border border-slate-100 p-0.5 rounded-xl text-[10.5px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      if (seriesList.length === 0) {
                        alert("Você não possui séries existentes ainda! Crie uma no botão ao lado.");
                        return;
                      }
                      setIsCreatingNewSeries(false);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${!isCreatingNewSeries ? "bg-white text-slate-800 shadow-3xs" : "text-slate-400 hover:text-slate-650"}`}
                  >
                    Escolher Série existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewSeries(true)}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${isCreatingNewSeries ? "bg-white text-slate-800 shadow-3xs" : "text-slate-400 hover:text-slate-650"}`}
                  >
                    Criar nova Série
                  </button>
                </div>

                {isCreatingNewSeries ? (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Título da Série *</label>
                      <input
                        type="text"
                        placeholder="Ex: Desenvolvimento do Wolly / Criando uma startup em 30 dias"
                        value={newSeriesTitle}
                        onChange={(e) => setNewSeriesTitle(e.target.value)}
                        className="w-full text-xs placeholder-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-150/50 focus:outline-hidden focus:border-indigo-500/70 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">Descrição *</label>
                      <textarea
                        placeholder="Conte do que se trata esta sequência de capítulos..."
                        value={newSeriesDesc}
                        onChange={(e) => setNewSeriesDesc(e.target.value)}
                        className="w-full text-xs placeholder-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-150/50 focus:outline-hidden focus:border-indigo-500/70 min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">Imagem de capa (URL opcional)</label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={newSeriesCover}
                        onChange={(e) => setNewSeriesCover(e.target.value)}
                        className="w-full text-xs placeholder-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-150/50 focus:outline-hidden focus:border-indigo-500/70 font-sans"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">Selecione a série existente</label>
                    {seriesList.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-[10px] font-medium leading-normal">
                        Nenhuma série criada ainda. Toque em "Criar nova Série" acima para dar o pontapé inicial!
                      </div>
                    ) : (
                      <select
                        value={seriesId}
                        onChange={(e) => setSeriesId(e.target.value)}
                        className="w-full text-xs bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-150/50 focus:outline-hidden focus:border-indigo-500/70 font-semibold text-slate-600 font-sans"
                      >
                        <option value="">-- Escolha uma série existente --</option>
                        {seriesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({s.chaptersCount === 1 ? "1 capítulo" : `${s.chaptersCount || 0} capítulos`})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Real-time Web Camera active feed Modal Overlay */}
      {isCameraActive && (
        <div id="device-camera-modal-overlay" className="fixed inset-0 bg-slate-950/95 z-55 flex flex-col justify-between p-6 text-white font-sans animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-purple-600 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full animate-pulse">
                Webcam Ativa
              </span>
              <span className="text-xs font-bold text-slate-440">Captura em alta resolução</span>
            </div>
            <button
              id="btn-close-device-camera"
              onClick={stopDeviceCamera}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera stream body */}
          <div className="flex-grow flex items-center justify-center py-4">
            {cameraError ? (
              <div className="text-center space-y-3.5 p-6 bg-rose-500/10 border border-rose-500/20 max-w-sm rounded-3xl">
                <span className="text-4xl text-rose-500 block">🛑</span>
                <p className="text-xs leading-relaxed text-rose-200 font-medium">{cameraError}</p>
                <button
                  type="button"
                  onClick={startDeviceCamera}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : (
              <div className="relative w-full max-w-sm aspect-square md:aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]" // mirror effect
                />
                
                {/* Visual scanlines or grid overlays to highlight premium UI capture */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-white/20 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-white/20 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Capture trigger bar on bottom */}
          <div className="flex flex-col items-center gap-3.5">
            {!cameraError && (
              <button
                id="btn-take-shot"
                onClick={capturePhoto}
                className="w-20 h-20 bg-rose-600 hover:bg-rose-700 active:scale-95 border-4 border-white/20 flex items-center justify-center rounded-full transition-all cursor-pointer shadow-lg animate-pulse"
                title="Tirar Foto 📸"
              >
                <Camera className="w-9 h-9 text-white" />
              </button>
            )}
            <p className="text-[10px] text-slate-500 font-mono tracking-wider font-bold">
              WOLLY PRIVATE CHRONOS CAPTURE • SOBERANIA TOTAL
            </p>
          </div>
        </div>
      )}

      {/* Real-time Video Web Camera Recording Modal Overlay */}
      {isRecordingCameraActive && (
        <div id="video-recording-modal-overlay" className="fixed inset-0 bg-slate-950/95 z-55 flex flex-col justify-between p-6 text-white font-sans animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full ${isRecordingVideo ? "bg-rose-600 animate-pulse" : "bg-purple-600"}`}>
                {isRecordingVideo ? "Gravando Vídeo" : "Câmera pronta"}
              </span>
              <span className="text-xs font-bold text-slate-400">Suporta até 59 segundos</span>
            </div>
            <button
              onClick={stopRecordingCamera}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Camera stream body */}
          <div className="flex-grow flex items-center justify-center py-4">
            {cameraError ? (
              <div className="text-center space-y-3.5 p-6 bg-rose-500/10 border border-rose-500/20 max-w-sm rounded-3xl">
                <span className="text-4xl text-rose-500 block">🛑</span>
                <p className="text-xs leading-relaxed text-rose-200 font-medium">{cameraError}</p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={startRecordingCamera}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Fallback simulation directly
                      handleStopActualRecordingSimulated();
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Usar Simulação Premium
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-sm aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black flex flex-col justify-center">
                <video
                  ref={recVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Overlay flashing red icon and timer */}
                {isRecordingVideo && (
                  <div className="absolute top-4 right-4 bg-black/75 px-3 py-1 rounded-full border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-mono text-xs font-bold text-rose-200">
                      0:{recordingSeconds < 10 ? "0" : ""}{recordingSeconds} / 0:59
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Trigger in footer */}
          <div className="flex flex-col items-center gap-3.5">
            {!cameraError && (
              <div className="flex flex-col items-center gap-2">
                {isRecordingVideo ? (
                  <button
                    onClick={() => {
                      handleStopActualRecording();
                      alert("Registro de clipe finalizado (2ª pressão confirmada) ⚡");
                    }}
                    onDoubleClick={() => {
                      handleStopActualRecording();
                      alert("Registro de clipe finalizado via duplo clique detectado ⚡");
                    }}
                    className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 border-2 border-white/30 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md flex items-center gap-2 select-none animate-pulse"
                    title="Aperte 2 vezes ou clique de novo para terminar gravação Corrente"
                  >
                    <span className="w-3.5 h-3.5 rounded-xs bg-white animate-spin" />
                    <span>Gravação Ativa • Aperte p/ Parar (ou 2x) 🛑</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleStartActualRecording();
                    }}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-750 active:scale-95 border border-white/10 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-md flex items-center gap-2 select-none"
                    title="Aperte para começar, depois aperte mais uma vez ou clique 2 vezes para parar"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Gravar (Aperte 2x para parar) 📹</span>
                  </button>
                )}
                <span className="text-[10px] text-slate-400 font-medium">Soberania do Criador: 1 clique inicia, clique duplo ou 2ª pressão finaliza instantaneamente.</span>
              </div>
            )}
            <p className="text-[10px] text-slate-500 font-mono tracking-wider font-bold">
              WOLLY CLIPS CONTROLS • SOBERANIA DIGITAL SECURE RECORD
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
