/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, ChangeEvent, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileText, Search, Users, Bell, Plus, Heart, MessageSquare, Share2, Trash2, ShieldAlert, Tag, Sliders, Trophy, Clock, X, Camera, FolderOpen, Edit3, Music, BarChart3, ArrowRight, Settings, Star, Check, RotateCcw, ChevronRight, Sparkles, Radio, Play, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Post, PostIt, Ink, Challenge, Series, Clip, WollySearch, FeedPreferences, POSTIT_MUSIC_LIST } from "../types";
import { playPostItSynth, stopPostItSynth } from "../lib/synth";
import UserAvatar from "./UserAvatar";
import SharePostModal from "./SharePostModal";
import LineNewsModal from "./LineNewsModal";
import { extractNewsTopic, buildLineNewsUrl } from "../lib/newsUtils";
import { renderTextWithMentions } from "../lib/mentions";
import { isChallengeExpired, getChallengeRemainingTime } from "../lib/challengeUtils";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface FeedViewProps {
  activeProfile: Profile;
  profiles: Profile[];
  posts: Post[];
  postIts: PostIt[];
  onAddPostIt: (content: string, bgColor: string, image?: string, music?: string, audioUrl?: string) => void;
  onVisitProfile: (profileId: string) => void;
  onDeletePost: (postId: string) => void;
  onLikePost: (postId: string) => void;
  onAddCommentToPost: (postId: string, text: string) => void;
  onSharePost: (postId: string) => void;
  onSelectTab: (tab: string) => void;
  onOpenTransparencyCenter: () => void;
  activeInk: Ink | null;
  onJoinActiveInk: () => void;
  notifications?: any[];
  onTriggerNotificationGen?: () => void;
  isGeneratingNotifications?: boolean;
  notificationGenError?: string;
  notificationApiKey?: string;
  onUpdateApiKey?: (key: string) => void;
  challenges?: Challenge[];
  seriesList?: Series[];
  onSelectSeries?: (seriesId: string) => void;
  onInstallApp?: () => void;
  onAskLine123ToSummarize?: (content: string, type: string) => void;
  onHashtagClick?: (tag: string) => void;
  onAddRealNotification?: (message: string, type: string) => void;
  clips?: Clip[];
  searches?: WollySearch[];
  onUpdateFeedPreferences?: (feedPreferences: FeedPreferences, favoriteProfileIds: string[]) => void;
}

export default function FeedView({
  activeProfile,
  profiles,
  posts,
  postIts,
  onAddPostIt,
  onVisitProfile,
  onDeletePost,
  onLikePost,
  onAddCommentToPost,
  onSharePost,
  onSelectTab,
  onOpenTransparencyCenter,
  activeInk,
  onJoinActiveInk,
  notifications = [],
  onTriggerNotificationGen,
  isGeneratingNotifications = false,
  notificationGenError = "",
  notificationApiKey = "",
  onUpdateApiKey,
  challenges = [],
  seriesList = [],
  onSelectSeries,
  onInstallApp,
  onAskLine123ToSummarize,
  onHashtagClick,
  onAddRealNotification,
  clips = [],
  searches = [],
  onUpdateFeedPreferences,
}: FeedViewProps) {
  const [filterType, setFilterType] = useState<"todos" | "seguindo">("todos");
  const [logoUrl, setLogoUrl] = useState("https://lh3.googleusercontent.com/d/1xcNOkJuZ32J5wY3xQGSjNsZm8DtSBZay");
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>("Todos");
  const [showFilterSubTab, setShowFilterSubTab] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [postDisclosingId, setPostDisclosingId] = useState<string | null>(null);
  const [lineNewsModalPost, setLineNewsModalPost] = useState<Post | null>(null);

  const handleOpenLineNews = (post: Post) => {
    const topic = post.newsTopic || extractNewsTopic(post.content, post.hashtags);
    const targetUrl = buildLineNewsUrl(topic);
    try {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.warn("Navegador bloqueou popup, abrindo leitor integrado:", e);
    }
    setLineNewsModalPost(post);
  };
  const [installBannerDismissed, setInstallBannerDismissed] = useState(() => {
    return localStorage.getItem("wolly_install_banner_dismissed") === "true";
  });

  const defaultChallenge: Challenge = {
    id: "default-challenge",
    creatorId: "system",
    creatorName: "Equipe Wolly",
    creatorNickname: "@wolly",
    title: "Imagem mais doida na PainterA",
    description: "Acessem o Wolly e cliquem na aba IA. Nela, vai ter dois botões: IA e 123. Clique no IA. Aí, insira o prompt mega doido, e a PainterA vai criar uma imagem fantástica para você publicar!",
    reward: 132,
    expiresIn: "5 dias",
    createdAt: new Date().toISOString()
  };

  // State to force live countdown updates every 10 seconds
  const [, setTimerTick] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter active non-expired challenges for top banner
  const activeChallenges = (challenges || []).filter((c) => !isChallengeExpired(c));
  const displayChallenges = activeChallenges.length > 0 ? activeChallenges : [defaultChallenge];

  // Notifications custom tabs and real summarization state
  const [notificationTab, setNotificationTab] = useState<"real" | "summary">("real");
  const [feedSummary, setFeedSummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [summaryMethod, setSummaryMethod] = useState<string>("");

  const handleFetchFeedSummary = () => {
    setIsGeneratingSummary(true);
    fetch("/api/posts/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setFeedSummary(data.summary);
          setSummaryMethod(data.method || "Análise Wolly");
        } else {
          setFeedSummary("Não foi possível gerar o resumo das postagens.");
        }
      })
      .catch(() => {
        setFeedSummary("Erro ao comunicar com a inteligência do Wolly.");
      })
      .finally(() => {
        setIsGeneratingSummary(false);
      });
  };

  // Post It State Managers
  const [showPostItCreator, setShowPostItCreator] = useState(false);
  const [showAllPostItsModal, setShowAllPostItsModal] = useState(false);
  const [selectedPostIt, setSelectedPostIt] = useState<PostIt | null>(null);
  const [postItText, setPostItText] = useState("");
  const [postItImage, setPostItImage] = useState<string | null>(null);
  const [selectedBgColor, setSelectedBgColor] = useState("bg-yellow-101 border-yellow-210 text-yellow-900 shadow-yellow-100/30");
  const [postItMusic, setPostItMusic] = useState("");
  const [postItAudioUrl, setPostItAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(true);
  const postItAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("none");

  const getAudioSource = (music?: string, audioUrl?: string): string | null => {
    if (audioUrl) return audioUrl;
    return null;
  };

  // Camera state for Post It
  const [isCameraActive, setIsCameraActive] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const postItImageInputRef = useRef<HTMLInputElement>(null);
  const postItAudioInputRef = useRef<HTMLInputElement>(null);

  const filterCssMap: Record<string, string> = {
    none: "none",
    vintage: "sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.2)",
    bw: "grayscale(100%) contrast(1.2)",
    sepia: "sepia(0.8) contrast(1.1)",
    vivid: "saturate(1.8) contrast(1.15)",
    warm: "sepia(0.25) saturate(1.3) hue-rotate(-10deg)",
    cyber: "hue-rotate(180deg) saturate(1.6) contrast(1.2)"
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (cameraVideoRef.current) {
      const video = cameraVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPostItImage(dataUrl);
      }
    }
    stopCamera();
  };

  const handlePostItImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPostItImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostItAudioUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setPostItMusic(`🎧 ${cleanName}`);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPostItAudioUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCloseStory = () => {
    if (postItAudioRef.current) {
      try {
        postItAudioRef.current.pause();
        postItAudioRef.current.currentTime = 0;
      } catch (err) {}
    }
    stopPostItSynth();
    setSelectedPostIt(null);
  };

  useEffect(() => {
    if (!selectedPostIt) {
      stopPostItSynth();
      return;
    }

    setIsPlayingAudio(true);
    const audioSrc = getAudioSource(selectedPostIt.music, selectedPostIt.audioUrl);

    if (audioSrc) {
      const timer = setTimeout(() => {
        if (postItAudioRef.current) {
          postItAudioRef.current.currentTime = 0;
          postItAudioRef.current.play().catch((err) => {
            console.log("Audio autoplay exception caught cleanly:", err);
            if (selectedPostIt.music) {
              playPostItSynth(selectedPostIt.music);
            }
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    } else if (selectedPostIt.music) {
      playPostItSynth(selectedPostIt.music);
    }
  }, [selectedPostIt]);

  const postItColors = [
    { name: "Amarelo Pastel", value: "bg-yellow-101 border-yellow-210 text-yellow-900 shadow-yellow-100/30", dotColor: "bg-yellow-200" },
    { name: "Rosa Pastel", value: "bg-rose-101 border-rose-210/60 text-rose-950 shadow-rose-100/30", dotColor: "bg-rose-200" },
    { name: "Azul Pastel", value: "bg-sky-101 border-sky-210 text-sky-950 shadow-sky-100/30", dotColor: "bg-sky-200" },
    { name: "Verde Pastel", value: "bg-emerald-101 border-emerald-210 text-emerald-950 shadow-emerald-100/30", dotColor: "bg-emerald-200" },
    { name: "Laranja Pastel", value: "bg-amber-101 border-amber-210 text-amber-950 shadow-amber-100/30", dotColor: "bg-amber-200" }
  ];

  const handlePostItSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!postItText.trim() && !postItImage) return;

    let finalImg = postItImage || undefined;
    if (finalImg) {
      try {
        finalImg = await new Promise<string>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            const maxDim = 800;
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
              if (selectedFilter !== "none" && filterCssMap[selectedFilter]) {
                ctx.filter = filterCssMap[selectedFilter];
              }
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.75));
            } else {
              resolve(finalImg!);
            }
          };
          img.onerror = () => resolve(finalImg!);
          img.src = finalImg!;
        });
      } catch (err) {
        console.error("Error applying filter/compression to image:", err);
      }
    }

    onAddPostIt(postItText.trim() || "📌 Novo Story", selectedBgColor, finalImg, postItMusic || undefined, postItAudioUrl || undefined);
    setPostItText("");
    setPostItImage(null);
    setPostItMusic("");
    setPostItAudioUrl(null);
    setSelectedFilter("none");
    setShowPostItCreator(false);
  };

  const getRemainingTimeStr = (createdAtStr: string) => {
    const elapsed = Date.now() - new Date(createdAtStr).getTime();
    const remainingMs = 24 * 60 * 60 * 1000 - elapsed;
    if (remainingMs <= 0) return "Expirado";
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h e ${minutes}m`;
  };
  
  // Interactive comments section toggle mapping
  const [expandedCommentPostId, setExpandedCommentPostId] = useState<string | null>(null);
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  // Mock notifications matching image aesthetics or dynamic AI feed
  const notificationList = notifications.length > 0 ? notifications : [
    { id: "mock_1", message: "Deize curtiu sua publicação.", type: "like", time: "há 12 min" },
    { id: "mock_2", message: "Ana começou a seguir você.", type: "follow", time: "há 1 hora" },
    { id: "mock_3", message: "O desafio PainterA expira em breve!", type: "info", time: "há 5 horas" },
  ];

  // Strictly requested 12 themes List + "Todos" as fallback selector
  const themesChips = [
    { name: "Todos", emoji: "✨" },
    { name: "Cachorro", emoji: "🐶" },
    { name: "Gato", emoji: "🐱" },
    { name: "Outros Animais", emoji: "🦁" },
    { name: "Entretenimento", emoji: "🎭" },
    { name: "Saúde", emoji: "🏥" },
    { name: "Esporte", emoji: "⚽" },
    { name: "Educativo", emoji: "📚" },
    { name: "Notícias", emoji: "📰" },
    { name: "Jogos", emoji: "🎮" },
    { name: "Anúncios", emoji: "📢" },
    { name: "Comida", emoji: "🍕" },
    { name: "Outros", emoji: "🔮" }
  ];

  // --- Feed Personalization State & Transparent Rules Engine ---
  const DEFAULT_FEED_PREFERENCES: FeedPreferences = {
    order: "cronologico",
    filterSource: "todos",
    types: {
      gramps: true,
      clips: false,
      pulses: true,
      inks: false,
      postIts: false,
      challenges: false,
      searches: false
    },
    favoritesFirst: false
  };

  const [feedPreferences, setFeedPreferences] = useState<FeedPreferences>(() => {
    if (activeProfile.feedPreferences) return activeProfile.feedPreferences;
    try {
      const saved = localStorage.getItem(`wolly_feed_pref_${activeProfile.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FEED_PREFERENCES;
  });

  const [favoriteProfileIds, setFavoriteProfileIds] = useState<string[]>(() => {
    if (activeProfile.favoriteProfileIds) return activeProfile.favoriteProfileIds;
    try {
      const saved = localStorage.getItem(`wolly_fav_profiles_${activeProfile.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showFavoritesDrawer, setShowFavoritesDrawer] = useState(false);

  useEffect(() => {
    if (activeProfile.feedPreferences) {
      setFeedPreferences(activeProfile.feedPreferences);
    }
    if (activeProfile.favoriteProfileIds) {
      setFavoriteProfileIds(activeProfile.favoriteProfileIds);
    }
  }, [activeProfile.id]);

  const handleSavePreferences = (newPrefs: FeedPreferences, newFavs: string[]) => {
    setFeedPreferences(newPrefs);
    setFavoriteProfileIds(newFavs);
    try {
      localStorage.setItem(`wolly_feed_pref_${activeProfile.id}`, JSON.stringify(newPrefs));
      localStorage.setItem(`wolly_fav_profiles_${activeProfile.id}`, JSON.stringify(newFavs));
    } catch {}

    if (onUpdateFeedPreferences) {
      onUpdateFeedPreferences(newPrefs, newFavs);
    } else {
      setDoc(
        doc(db, "profiles", activeProfile.id),
        { feedPreferences: newPrefs, favoriteProfileIds: newFavs },
        { merge: true }
      ).catch((err) => console.error("Error saving feedPreferences to Firestore:", err));
    }

    if (onAddRealNotification) {
      onAddRealNotification(
        `Preferências do feed salvas! Ordem: ${newPrefs.order === "inteligente" ? "🎯 Inteligente" : "🕒 Cronológica"}.`,
        "system"
      );
    }
  };

  function parseDateToTimestamp(dateStr?: string): number {
    if (!dateStr) return Date.now();
    if (dateStr === "Agora" || dateStr === "agora") return Date.now();
    if (dateStr.startsWith("há ")) {
      const parts = dateStr.replace("há ", "").trim().split(" ");
      const val = parseInt(parts[0], 10) || 1;
      const unit = parts[1] || "";
      const now = Date.now();
      if (unit.startsWith("min")) return now - val * 60 * 1000;
      if (unit.startsWith("hora")) return now - val * 60 * 60 * 1000;
      if (unit.startsWith("dia")) return now - val * 24 * 60 * 60 * 1000;
      return now - val * 60 * 1000;
    }
    const parsed = new Date(dateStr).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }

  // 1. Assemble candidate items from enabled types
  const candidateFeedItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: "gramps" | "clips" | "pulses" | "inks" | "postIts" | "challenges" | "searches";
      createdAt: string;
      rawDate: number;
      profileId: string;
      authorName: string;
      authorNickname: string;
      authorAvatar: string;
      authorAvatarBg: string;
      theme?: string;
      rawItem: any;
    }> = [];

    // Gramps & Pulses (The feed is restricted to Pulses and Gramps only)
    posts.forEach((post) => {
      const isPulse = Boolean(post.isPulse);
      if (isPulse && feedPreferences.types.pulses) {
        items.push({
          id: post.id,
          type: "pulses",
          createdAt: post.createdAt,
          rawDate: parseDateToTimestamp(post.createdAt),
          profileId: post.profileId,
          authorName: post.authorName,
          authorNickname: post.authorNickname,
          authorAvatar: post.authorAvatar,
          authorAvatarBg: post.authorAvatarBg,
          theme: post.theme || "Pulses",
          rawItem: post
        });
      } else if (!isPulse && feedPreferences.types.gramps) {
        items.push({
          id: post.id,
          type: "gramps",
          createdAt: post.createdAt,
          rawDate: parseDateToTimestamp(post.createdAt),
          profileId: post.profileId,
          authorName: post.authorName,
          authorNickname: post.authorNickname,
          authorAvatar: post.authorAvatar,
          authorAvatarBg: post.authorAvatarBg,
          theme: post.theme || "Geral",
          rawItem: post
        });
      }
    });

    return items;
  }, [posts, feedPreferences.types]);

  // 2. Score, filter source, theme filter, search term & sort
  const filteredUnifiedItems = useMemo(() => {
    let list = candidateFeedItems.map((item) => {
      const isFollowing = activeProfile.followingIds.includes(item.profileId) || item.profileId === activeProfile.id;
      const isFavorite = favoriteProfileIds.includes(item.profileId);
      const targetProfile = profiles.find((p) => p.id === item.profileId);
      const isVerified = Boolean(
        item.profileId === "system" ||
        targetProfile?.isVerified
      );

      let groupLevel = 0;
      let badgeLabel = "";
      let ruleDescription = "";

      if (feedPreferences.order === "inteligente") {
        if (feedPreferences.favoritesFirst && isFavorite) {
          groupLevel = 4;
          badgeLabel = "⭐ Favorito • Feed Inteligente";
          ruleDescription = "Prioridade Máxima: Perfil marcado como Favorito pelo usuário.";
        } else if (isFollowing) {
          groupLevel = 3;
          badgeLabel = "👥 Seguindo • Feed Inteligente";
          ruleDescription = "1ª Prioridade: Perfil que você segue no Wolly.";
        } else if (isFavorite) {
          groupLevel = 2;
          badgeLabel = "⭐ Favorito • Feed Inteligente";
          ruleDescription = "2ª Prioridade: Perfil marcado como Favorito.";
        } else if (isVerified) {
          groupLevel = 1;
          badgeLabel = "🌟 Verificado • Feed Inteligente";
          ruleDescription = "3ª Prioridade: Perfil verificado e oficial.";
        } else {
          groupLevel = 0;
          badgeLabel = "🌐 Rede Wolly • Feed Inteligente";
          ruleDescription = "4ª Prioridade: Conteúdo da comunidade geral.";
        }
      } else {
        if (feedPreferences.favoritesFirst && isFavorite) {
          groupLevel = 1;
          badgeLabel = "⭐ Favorito • Cronológico";
          ruleDescription = "Destaque no topo por ser perfil Favorito.";
        } else {
          groupLevel = 0;
          badgeLabel = "🕒 Cronológico";
          ruleDescription = "Organizado estritamente por horário de publicação.";
        }
      }

      const groupRank = groupLevel * 1_000_000_000_000 + item.rawDate;

      return {
        ...item,
        isFollowing,
        isFavorite,
        isVerified,
        groupLevel,
        groupRank,
        badgeLabel,
        ruleDescription
      };
    });

    // Filter Source ("Mostrar")
    if (feedPreferences.filterSource === "seguindo") {
      list = list.filter((i) => i.isFollowing);
    } else if (feedPreferences.filterSource === "verificados") {
      list = list.filter((i) => i.isVerified);
    }

    // Theme Filter
    if (selectedThemeFilter !== "Todos") {
      if (selectedThemeFilter === "Pulses") {
        list = list.filter((i) => i.type === "pulses");
      } else {
        list = list.filter((i) => i.theme === selectedThemeFilter || (i.rawItem && i.rawItem.theme === selectedThemeFilter));
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => {
        const matchAuthor = i.authorName.toLowerCase().includes(q) || i.authorNickname.toLowerCase().includes(q);
        let matchText = false;
        if (i.rawItem) {
          matchText =
            (i.rawItem.content && i.rawItem.content.toLowerCase().includes(q)) ||
            (i.rawItem.title && i.rawItem.title.toLowerCase().includes(q)) ||
            (i.rawItem.description && i.rawItem.description.toLowerCase().includes(q)) ||
            (i.rawItem.hashtags && i.rawItem.hashtags.some((h: string) => h.toLowerCase().includes(q)));
        }
        return matchAuthor || matchText;
      });
    }

    // Sort deterministically
    list.sort((a, b) => b.groupRank - a.groupRank);

    return list;
  }, [
    candidateFeedItems,
    activeProfile,
    favoriteProfileIds,
    profiles,
    feedPreferences,
    selectedThemeFilter,
    searchQuery
  ]);

  // Virtualized List Ref and Hook for Feed Posts performance optimization
  const parentScrollRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredUnifiedItems.length,
    getScrollElement: () => {
      if (!parentScrollRef.current) return null;
      let el: HTMLElement | null = parentScrollRef.current;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === "auto" || style.overflowY === "scroll") {
          return el;
        }
        el = el.parentElement;
      }
      return parentScrollRef.current;
    },
    estimateSize: () => 420,
    overscan: 3,
  });

  // Recent visited profiles
  const recentlyVisitedProfiles = profiles.filter((p) => p.id !== activeProfile.id);

  const handleShareClick = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setSharingPost(post);
    }
  };

  return (
    <div id="feed-view-root" className="min-h-screen bg-slate-50 text-slate-800 pb-24 relative select-none">
      
      {/* Absolute Secure Notification Toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-18 inset-x-6 z-50 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/50 text-xs px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xl font-bold"
          >
            <span>🛡️</span>
            <span>{shareToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
        {/* Wolly Logo with brand mark matching Image 1 */}
        <div 
          id="wolly-logo"
          onClick={() => {
            setFilterType("todos");
            setSelectedThemeFilter("Todos");
          }}
          className="select-none cursor-pointer flex items-center gap-2 group"
        >
          <img src={logoUrl} onError={() => setLogoUrl(wollyLogo)} alt="Wolly Logo" className="w-8 h-8 rounded-full border border-slate-100 shadow-sm transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
          <span className="text-[25px] font-sans font-black tracking-tight text-emerald-500">Wolly</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3">
          {/* Active Post Its list trigger */}
          <button
            id="btn-all-postits"
            title="Ver todos os Post Its"
            onClick={() => setShowAllPostItsModal(true)}
            className="p-1 hover:bg-slate-50 rounded-xl text-slate-800 hover:text-indigo-600 transition-all cursor-pointer relative"
          >
            <FileText className="w-[20px] h-[20px] stroke-[15px]" style={{ strokeWidth: 1.8 }} />
            {postIts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold font-mono">
                {postIts.length}
              </span>
            )}
          </button>

          {/* Search trigger */}
          <button
            id="btn-toggle-search"
            title="Buscar"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded-xl transition-all cursor-pointer ${showSearch ? "text-emerald-500" : "text-slate-800 hover:text-emerald-500"}`}
          >
            <Search className="w-[20px] h-[20px]" style={{ strokeWidth: 1.8 }} />
          </button>

          {/* Wolly Searches */}
          <button
            id="btn-wolly-searches"
            title="Wolly Searches"
            onClick={() => onSelectTab("searches")}
            className="p-1 hover:bg-slate-50 rounded-xl text-slate-800 hover:text-indigo-600 transition-all cursor-pointer relative"
          >
            <BarChart3 className="w-[20px] h-[20px] text-indigo-600" style={{ strokeWidth: 1.8 }} />
          </button>

          {/* Groups & Workspace */}
          <button
            id="btn-groups-workspace"
            title="Grupos e Código"
            onClick={() => onSelectTab("grupos")}
            className="p-1 hover:bg-slate-50 rounded-xl text-slate-800 hover:text-indigo-600 transition-all cursor-pointer"
          >
            <Users className="w-[20px] h-[20px]" style={{ strokeWidth: 1.8 }} />
          </button>

          {/* Trophy/Challenges Access */}
          <button
            id="btn-challenges"
            title="Desafios"
            onClick={() => onSelectTab("desafios")}
            className="p-1 hover:bg-slate-50 rounded-xl text-slate-800 hover:text-amber-500 transition-all cursor-pointer relative"
          >
            <Trophy className="w-[20px] h-[20px] text-amber-500 fill-amber-50/50" style={{ strokeWidth: 1.8 }} />
          </button>
        </div>
      </div>

      {/* Slide down search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <input
              id="search-input"
              type="text"
              placeholder="Buscar termos, usuários ou #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow text-sm py-1.5 focus:outline-hidden text-slate-700 bg-transparent placeholder-slate-400 font-sans"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-xs text-slate-400 underline hover:text-slate-600 font-semibold font-sans">
                Limpar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0, scaleY: 0.95 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.95 }}
            className="absolute right-4 top-14 z-50 bg-white rounded-2xl p-4 shadow-xl border border-slate-150 w-85 space-y-3.5 origin-top"
          >
            <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex justify-between items-center">
              <span>Notificações Wolly</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold font-sans">Privacidade Max 🔒</span>
            </h4>

            {/* Tabs Selector for Real-time Actions vs. Post-Feed Summary */}
            <div className="flex bg-slate-100/70 border border-slate-200/50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setNotificationTab("real")}
                className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${notificationTab === "real" ? "bg-white text-indigo-650 shadow-3xs" : "text-slate-450 hover:text-slate-700"}`}
              >
                🔔 Eventos Reais
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotificationTab("summary");
                  handleFetchFeedSummary();
                }}
                className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${notificationTab === "summary" ? "bg-white text-rose-650 shadow-3xs" : "text-slate-450 hover:text-slate-700"}`}
              >
                📋 Resumo das Postagens
              </button>
            </div>

            {notificationTab === "real" ? (
              <div className="space-y-3">
                <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                  {notificationList.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-slate-400 font-medium">
                      Nenhuma atividade real registrada no seu navegador ainda.
                    </div>
                  ) : (
                    notificationList.map((n) => (
                      <div key={n.id} className="flex gap-2.5 items-start text-xs text-slate-700 hover:bg-slate-50 p-2 rounded-lg transition-all">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-slate-800 leading-tight">{n.message}</p>
                          <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">{n.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* AI Notification Engine (Line 123) Panel */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <span>🤖 Gerador de Alertas (Line 123)</span>
                    <span className="text-emerald-600">ATIVO</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-600 space-y-1.5 border border-slate-150">
                    <div className="text-[9px] text-slate-400 leading-tight">
                      Gera notificações cronológicas de interesse real baseadas nos posts. 
                    </div>
                    {notificationGenError && (
                      <div className="text-[9px] text-rose-500 font-bold bg-rose-50 p-1 rounded-md text-center border border-rose-100">
                        ⚠️ {notificationGenError}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={onTriggerNotificationGen}
                      disabled={isGeneratingNotifications}
                      className="w-full mt-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-750 disabled:bg-indigo-300 text-white font-bold text-[9.5px] uppercase tracking-wide rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                    >
                      {isGeneratingNotifications ? (
                        <span className="animate-pulse">Sincronizando...</span>
                      ) : (
                        <span>Disparar Notificações via IA ✨</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1 text-left">
                {isGeneratingSummary ? (
                  <div className="py-8 text-center space-y-2 flex flex-col items-center">
                    <div className="inline-block w-5 h-5 rounded-full border-2 border-rose-550 border-t-transparent animate-spin" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Gerando briefing no Wolly...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-rose-50/50 p-3.5 border border-rose-100 rounded-2xl space-y-2">
                      <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
                        {feedSummary || "Nenhuma publicação ativa no momento para resumir."}
                      </p>
                      
                      {summaryMethod && (
                        <span className="inline-block text-[8px] bg-rose-100/80 text-rose-700 px-2 py-0.5 rounded-md font-sans font-black tracking-widest uppercase">
                          Gerador: {summaryMethod} • Fidelidade Máxima
                        </span>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleFetchFeedSummary}
                      className="w-full py-1.8 bg-rose-600 hover:bg-rose-750 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>🔄 Atualizar Resumo Analítico</span>
                    </button>
                  </div>
                )}
                <p className="text-[9px] text-slate-400 leading-tight">
                  Wolly respeita sua soberania cognitiva. Resumos de feeds agregados economizam tempo de tela e reduzem dependência visual.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowNotifications(false)}
              className="w-full text-center text-xs text-indigo-600 hover:text-indigo-750 font-bold pt-2 border-t border-slate-100 cursor-pointer block"
            >
              Fechar Painel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Active Ink Livestream Alert */}
        {activeInk && (
          <div
            id="active-ink-alert"
            className="bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600 rounded-3xl p-4.5 border border-rose-400 shadow-[0_4px_15px_-3px_rgba(244,63,94,0.3)] text-white text-left relative overflow-hidden flex flex-col justify-between space-y-3.5 animate-fade-in"
          >
            {/* Ambient visual overlay */}
            <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
            <div className="absolute top-3 right-3 select-none flex items-center gap-1.5 z-10">
              <span className="flex items-center gap-1 bg-white/15 backdrop-blur-md text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping" />
                <span>AO VIVO NO WOLLY</span>
              </span>
            </div>

            <div className="flex items-start gap-3 z-10 pt-2">
              <div className="w-11 h-11 rounded-full border-2 border-white/20 flex-shrink-0 bg-white/10 flex items-center justify-center text-xl select-none shadow-3xs">
                <span>🎙️</span>
              </div>
              <div className="flex-grow space-y-0.5">
                <span className="text-[10px] uppercase font-black tracking-widest text-white/90 font-display block leading-none">
                  Ink Transmissão • @{activeInk.authorName}
                </span>
                <p className="text-xs font-bold leading-normal font-sans drop-shadow-xs pr-16 line-clamp-2">
                  "{activeInk.title}"
                </p>
                <div className="flex items-center gap-1 py-1 text-[9.5px] text-rose-100 font-mono font-bold leading-none">
                  <span>👥 {activeInk.spectatorsCount} sintonizados</span>
                </div>
              </div>
            </div>

            <button
              id="btn-active-ink-join-feed"
              onClick={onJoinActiveInk}
              className="w-full py-2.5 bg-white hover:bg-slate-50 text-rose-600 font-display font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 hover:shadow-lg"
            >
              <span>Entrar como Espectador</span>
              <span>👉</span>
            </button>
          </div>
        )}

        {/* Wolly Stories Carousel matching Image 1 */}
        <div id="wolly-postit-stories-container" className="bg-white rounded-3xl p-4 border border-slate-100 text-left space-y-3">
          <div className="flex items-center gap-4 py-1 overflow-x-auto no-scrollbar scroll-smooth">
            {/* "Novo" Story Bubble with Purple gradient border */}
            <div 
              id="story-novo-create"
              onClick={() => onSelectTab("create")}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
            >
              <div className="w-13 h-13 rounded-full border-2 border-purple-500 p-[2px] flex items-center justify-center transition-transform hover:scale-105">
                <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-purple-600 stroke-[3px]" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 mt-1.5 font-sans">Novo</span>
            </div>

            {/* Separator */}
            <div className="h-10 w-[1px] bg-slate-250 self-center flex-shrink-0" />

            {/* Active 24h Stories (Post Its) */}
            {postIts.map((pi) => (
              <div
                key={pi.id}
                id={`story-bubble-${pi.id}`}
                onClick={() => {
                  setSelectedPostIt(pi);
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group transition-transform hover:scale-105"
              >
                <div className="w-13 h-13 rounded-full p-[2.5px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-sm relative">
                  {pi.image ? (
                    <div className="w-full h-full rounded-full overflow-hidden border border-white bg-slate-100">
                      <img referrerPolicy="no-referrer" src={pi.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <UserAvatar
                      avatar={profiles.find(p => p.nickname === pi.authorNickname || p.id === pi.profileId)?.avatar || pi.authorAvatar}
                      name={pi.authorName}
                      className="w-full h-full"
                      bgClassName={pi.bgColor || "bg-gradient-to-tr from-pink-500 to-indigo-500"}
                    />
                  )}

                  {/* Tiny author avatar overlay if this is an image story */}
                  {pi.image && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full shadow-xs border border-white">
                      <UserAvatar
                        avatar={profiles.find(p => p.nickname === pi.authorNickname || p.id === pi.profileId)?.avatar || pi.authorAvatar}
                        name={pi.authorName}
                        className="w-full h-full"
                        bgClassName={pi.authorAvatarBg || "bg-slate-800"}
                        textClassName="text-[9px] font-black text-white"
                      />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-slate-700 mt-1.5 truncate max-w-[62px] font-sans">
                  {pi.authorName.split(" ")[0]}
                </span>
              </div>
            ))}

            {postIts.length > 0 && (
              <div className="h-10 w-[1px] bg-slate-250 self-center flex-shrink-0" />
            )}

            {/* "VISITADOS RECENTEMENTE" Header Info */}
            <div className="flex-shrink-0 flex flex-col justify-center px-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 font-sans tracking-wider uppercase leading-none">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>RECENTES</span>
              </div>
            </div>

            {/* Recents List from Profiles */}
            {profiles.filter(p => p.id !== activeProfile.id).map((p) => (
              <div
                key={p.id}
                id={`recent-sintonia-bubble-${p.id}`}
                onClick={() => onVisitProfile(p.id)}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer group transition-transform hover:scale-105"
              >
                <div className="w-13 h-13 rounded-full p-[2px] border border-slate-200 hover:border-pink-500 flex items-center justify-center shadow-xs">
                  <UserAvatar
                    avatar={p.avatar}
                    name={p.name}
                    className="w-full h-full"
                    bgClassName={p.avatarBg || "bg-gradient-to-tr from-pink-500 to-indigo-500"}
                  />
                </div>
                <span className="text-[10.5px] font-bold text-slate-700 mt-1.5 truncate max-w-[62px] font-sans">
                  {p.name.split(" ")[0]}
                </span>
              </div>
            ))}

            {profiles.filter(p => p.id !== activeProfile.id).length === 0 && (
              <div className="text-[10px] font-medium text-slate-400 italic pr-2 select-none self-center">
                Wolly está vazio. Crie perfis!
              </div>
            )}
          </div>
        </div>

        {/* Dynamic challenges at the top of the Feed */}
        <div className="space-y-3.5">
          {displayChallenges.map((challenge, idx) => (
            <div 
              key={challenge.id || idx}
              id={`active-challenge-banner-${challenge.id}`}
              className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-3xl p-5 text-white text-left shadow-[0_8px_20px_-6px_rgba(239,68,68,0.25)] relative overflow-hidden flex flex-col justify-between space-y-4 border border-white/10"
            >
              {/* Background accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start gap-3.5 z-10">
                {/* Circular Trophy icon */}
                <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex-shrink-0 flex items-center justify-center text-xl select-none animate-bounce duration-[3000ms]">
                  <Trophy className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-yellow-250 block leading-none font-sans flex items-center gap-1">
                    ★ DESAFIO ATIVO ★ <span className="bg-amber-400/20 px-1.5 py-0.5 rounded text-white text-[8px] font-bold">RECOMPENSA: {challenge.reward} COROAS 👑</span>
                  </span>
                  <h4 className="text-[14px] font-bold font-sans leading-snug tracking-tight">
                    {challenge.title}
                  </h4>
                  <p className="text-[10.5px] text-white/90 font-sans leading-relaxed font-normal whitespace-pre-wrap">
                    {challenge.description}
                  </p>
                  <p className="text-[9px] text-white/70 font-mono mt-1">
                    Proposto por: <span className="font-bold">{challenge.creatorName}</span> ({challenge.creatorNickname})
                  </p>
                </div>
              </div>

              {/* Expire tag */}
              {(() => {
                const timeInfo = getChallengeRemainingTime(challenge);
                return (
                  <div className="z-10 flex items-center gap-1.5 text-[9.5px] font-mono font-bold text-yellow-101 bg-black/15 px-3 py-1 rounded-full self-start border border-white/10 shadow-inner">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>⏳ {timeInfo.text}</span>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* PWA Install Banner */}
        {!installBannerDismissed && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-purple-500/10 border border-indigo-100 rounded-3xl p-5 text-left shadow-2xs relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
                📥
              </div>
              <div>
                <h4 className="font-sans font-extrabold text-sm text-slate-800 tracking-tight">Instalar o Wolly no seu dispositivo</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-normal mt-0.5">
                  Acesse em tela cheia na tela inicial, com suporte offline completo, melhor desempenho e sem barras do navegador!
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  setInstallBannerDismissed(true);
                  localStorage.setItem("wolly_install_banner_dismissed", "true");
                }}
                className="flex-1 sm:flex-none text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-xl cursor-pointer transition-colors text-center"
              >
                Depois
              </button>
              <button
                onClick={onInstallApp || (() => {
                  alert("📱 Wolly está 100% pronto para Instalação PWA!\n\n• No Chrome/Edge: Clique no ícone de instalação (símbolo 📥 ou [+] ao lado dos favoritos na barra de endereços).\n• No Safari do iOS/iPhone: Toque em Compartilhar 📤 e escolha 'Adicionar à Tela de Início' ➕.\n\nWolly funcionará em tela cheia com seu ícone e suporte offline!");
                })}
                className="flex-1 sm:flex-none text-[11.5px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/15 text-center flex items-center justify-center gap-1.5"
              >
                <span>Instalar Wolly</span>
                <span>✨</span>
              </button>
            </div>
          </div>
        )}

        {/* Feed Header with Personalizar Button and Virtualization Indicator */}
        <div className="flex items-center justify-between py-1 px-1 bg-transparent mt-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[20px] font-bold text-slate-900 font-sans tracking-tight">Feed</span>
            <span className="text-[9.5px] bg-emerald-50 text-emerald-700 font-mono font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>Virtualizado ({filteredUnifiedItems.length})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Dropdown theme filter badge */}
            <div 
              onClick={() => setShowFilterSubTab(!showFilterSubTab)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full cursor-pointer transition-all shadow-3xs border ${
                showFilterSubTab || selectedThemeFilter !== "Todos"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800"
              }`}
            >
              <Sliders className={`w-3.5 h-3.5 ${showFilterSubTab || selectedThemeFilter !== "Todos" ? "text-white" : "text-slate-600"}`} />
              <span className="text-[11px] font-bold font-sans">
                {selectedThemeFilter === "Todos" ? "Todos" : selectedThemeFilter}
              </span>
            </div>

            {/* ⚙️ Personalizar Button */}
            <button
              id="btn-personalize-feed"
              onClick={() => {
                setShowCustomizeModal(!showCustomizeModal);
                if (!showCustomizeModal) setShowFilterSubTab(false);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full cursor-pointer transition-all shadow-3xs border text-[11px] font-bold font-sans ${
                showCustomizeModal || feedPreferences.order === "inteligente" || feedPreferences.filterSource !== "todos" || feedPreferences.favoritesFirst
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>⚙️ Personalizar</span>
              {feedPreferences.order === "inteligente" && (
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              )}
            </button>
          </div>
        </div>

        {/* Inline Personalizar Feed Panel (At Top of Feed) */}
        <AnimatePresence>
          {showCustomizeModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-white border border-indigo-200 rounded-2xl p-4 mt-2 mb-4 space-y-4 shadow-md text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-display font-black text-sm text-slate-900">⚙️ Personalizar Feed</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-indigo-900">Feed 100% Transparente & Controlado por Você</span>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-sans">
                    Sem algoritmos ocultos ou IA manipuladora. Todas as regras e prioridades abaixo são aplicadas em tempo real.
                  </p>
                </div>
              </div>

              {/* 1. Ordem */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">1. Ordem das Publicações</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedPreferences(prev => ({ ...prev, order: "cronologico" }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      feedPreferences.order === "cronologico"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-display flex items-center gap-1">🕒 Cronológica</span>
                      {feedPreferences.order === "cronologico" && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <span className="text-[10px] opacity-80 leading-snug">
                      Puro por data e hora de publicação.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedPreferences(prev => ({ ...prev, order: "inteligente" }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      feedPreferences.order === "inteligente"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-display flex items-center gap-1">🎯 Inteligente</span>
                      {feedPreferences.order === "inteligente" && <Check className="w-4 h-4 text-emerald-300" />}
                    </div>
                    <span className="text-[10px] opacity-80 leading-snug">
                      Prioridades: Seguidos &gt; Favoritos &gt; Verificados.
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Mostrar */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">2. Mostrar Publicações De</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "todos", label: "🌐 Todos", desc: "Toda a rede" },
                    { id: "seguindo", label: "👥 Quem sigo", desc: "Amigos/Seguidos" },
                    { id: "verificados", label: "🌟 Verificados", desc: "Perfis oficiais" }
                  ].map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setFeedPreferences(prev => ({ ...prev, filterSource: src.id as any }))}
                      className={`py-2 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                        feedPreferences.filterSource === src.id
                          ? "bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-3xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block text-xs font-bold">{src.label}</span>
                      <span className="block text-[9px] opacity-75">{src.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Tipos de Publicação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">3. Tipos de Publicação</label>
                  <span className="text-[10px] font-bold text-slate-400">Marque o que deseja ver</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  {[
                    { key: "gramps", label: "📝 Gramps", desc: "Posts tradicionais" },
                    { key: "pulses", label: "⚡ Pulses", desc: "Notas rápidas" }
                  ].map((t) => {
                    const enabled = Boolean((feedPreferences.types as any)[t.key]);
                    return (
                      <div
                        key={t.key}
                        onClick={() =>
                          setFeedPreferences(prev => ({
                            ...prev,
                            types: { ...prev.types, [t.key]: !enabled }
                          }))
                        }
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          enabled
                            ? "bg-white border-indigo-200 shadow-3xs text-slate-900"
                            : "bg-slate-100/70 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div>
                          <span className="block text-xs font-bold leading-tight">{t.label}</span>
                          <span className="block text-[9.5px] opacity-75">{t.desc}</span>
                        </div>
                        <div
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                            enabled ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start"
                          }`}
                        >
                          <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-md" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Favoritos Primeiro */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <div>
                    <span className="text-xs font-black text-amber-950 block">Favoritos no topo</span>
                    <span className="text-[10px] text-amber-800 block">Coloca perfis estelarizados sempre na frente</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedPreferences(prev => ({ ...prev, favoritesFirst: !prev.favoritesFirst }))}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
                    feedPreferences.favoritesFirst ? "bg-amber-500 justify-end" : "bg-slate-300 justify-start"
                  }`}
                >
                  <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 5. Gerenciar Perfis Favoritos */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowFavoritesDrawer(!showFavoritesDrawer)}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Gerenciar Perfis Favoritos ({favoriteProfileIds.length})</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showFavoritesDrawer ? "rotate-90" : ""}`} />
                </button>

                <AnimatePresence>
                  {showFavoritesDrawer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 max-h-44 overflow-y-auto no-scrollbar"
                    >
                      <p className="text-[10px] font-semibold text-slate-500">
                        Selecione perfis para dar prioridade estelar no feed:
                      </p>
                      {profiles.filter(p => p.id !== activeProfile.id).map((p) => {
                        const isFav = favoriteProfileIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              const updated = isFav
                                ? favoriteProfileIds.filter(id => id !== p.id)
                                : [...favoriteProfileIds, p.id];
                              setFavoriteProfileIds(updated);
                            }}
                            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                              isFav ? "bg-amber-50 border-amber-200 text-amber-950 font-bold" : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserAvatar avatar={p.avatar} name={p.name} className="w-6 h-6" bgClassName={p.avatarBg} />
                              <span className="text-xs truncate">{p.name} ({p.nickname})</span>
                            </div>
                            <Star className={`w-4 h-4 ${isFav ? "text-amber-500 fill-amber-400" : "text-slate-300"}`} />
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setFeedPreferences(DEFAULT_FEED_PREFERENCES);
                    setFavoriteProfileIds([]);
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrões</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSavePreferences(feedPreferences, favoriteProfileIds);
                    setShowCustomizeModal(false);
                  }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar e Aplicar</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggleable Filter Sub-tab Panel */}
        <AnimatePresence>
          {showFilterSubTab && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-white border border-slate-150 rounded-2xl p-3.5 mt-2 mb-4 space-y-2.5 shadow-3xs"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 font-display">Filtrar Publicações</span>
                <button 
                  onClick={() => setShowFilterSubTab(false)} 
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {/* Todos Option */}
                <button
                  onClick={() => {
                    setSelectedThemeFilter("Todos");
                    setShowFilterSubTab(false);
                  }}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer ${
                    selectedThemeFilter === "Todos"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-3xs font-black"
                      : "bg-slate-50 border-slate-150/40 text-slate-600 hover:bg-slate-100/75"
                  }`}
                >
                  <span>✨</span> <span className="truncate">Todos</span>
                </button>

                {/* Pulses Option */}
                <button
                  onClick={() => {
                    setSelectedThemeFilter("Pulses");
                    setShowFilterSubTab(false);
                  }}
                  className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer ${
                    selectedThemeFilter === "Pulses"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-3xs font-black"
                      : "bg-slate-50 border-slate-150/40 text-slate-600 hover:bg-slate-100/75"
                  }`}
                >
                  <span>⚡</span> <span className="truncate">Pulses</span>
                </button>

                {/* The 12 Themes Options */}
                {themesChips.filter(t => t.name !== "Todos").map((thm) => (
                  <button
                    key={thm.name}
                    onClick={() => {
                      setSelectedThemeFilter(thm.name);
                      setShowFilterSubTab(false);
                    }}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer ${
                      selectedThemeFilter === thm.name
                        ? "bg-slate-900 text-white border-slate-900 shadow-3xs font-black"
                        : "bg-slate-50 border-slate-150/40 text-slate-600 hover:bg-slate-100/75"
                    }`}
                  >
                    <span>{thm.emoji}</span> <span className="truncate">{thm.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts Display (Virtualized for Mobile Performance) */}
        <div id="posts-list-container" ref={parentScrollRef} className="relative w-full">
          <AnimatePresence>
            {filteredUnifiedItems.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="bg-white border border-slate-150 rounded-2xl p-8 text-center space-y-3 shadow-3xs"
              >
                <div className="text-3xl text-slate-350">⏳</div>
                <h4 className="font-display font-bold text-sm text-slate-700">Abraço do silêncio no Wolly</h4>
                <p className="text-xs text-slate-400 px-4 leading-relaxed font-sans">
                  Não encontramos publicações para o filtro selecionado nesta zona do feed.
                </p>
                {(selectedThemeFilter !== "Todos" || feedPreferences.filterSource !== "todos") && (
                  <button
                    onClick={() => {
                      setSelectedThemeFilter("Todos");
                      setFeedPreferences(prev => ({ ...prev, filterSource: "todos" }));
                    }}
                    className="text-xs font-bold px-4 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Ver Tudo de Forma Ampla
                  </button>
                )}
              </motion.div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const unifiedItem = filteredUnifiedItems[virtualRow.index];
                  if (!unifiedItem) return null;

                  // 1. Clips Render
                  if (unifiedItem.type === "clips") {
                    const clip = unifiedItem.rawItem;
                    return (
                      <div
                        key={`clip-${clip.id}`}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: "1rem",
                        }}
                      >
                        <div className="bg-slate-900 text-white rounded-2xl shadow-md overflow-hidden text-left border border-slate-800">
                          <div className="p-3.5 flex items-center justify-between border-b border-slate-800">
                            <div onClick={() => onVisitProfile(clip.profileId)} className="flex items-center gap-2.5 cursor-pointer">
                              <UserAvatar avatar={clip.authorAvatar} name={clip.authorName} className="w-8 h-8" bgClassName={clip.authorAvatarBg} />
                              <div>
                                <span className="font-bold text-xs block text-white">{clip.authorName}</span>
                                <span className="text-[10px] text-slate-400 block">{clip.createdAt}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[9px] font-extrabold uppercase">
                              🎬 Clip
                            </span>
                          </div>
                          <div
                            onClick={() => onSelectTab("clips")}
                            className="relative aspect-video bg-black cursor-pointer group flex items-center justify-center overflow-hidden"
                          >
                            {clip.videoUrl ? (
                              <video src={clip.videoUrl} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                                <Play className="w-12 h-12 text-white/80 fill-white/80" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 fill-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                          <div className="p-3.5 space-y-2">
                            <p className="text-xs font-semibold text-slate-200 line-clamp-2">{clip.description}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5 text-rose-400" /> {clip.likes || 0} curtidas
                              </span>
                              <button
                                onClick={() => onSelectTab("clips")}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
                              >
                                Assistir Clip 🎬
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. Inks Render
                  if (unifiedItem.type === "inks") {
                    const ink = unifiedItem.rawItem;
                    return (
                      <div
                        key={`ink-${ink.id}`}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: "1rem",
                        }}
                      >
                        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-purple-500/30 space-y-3 text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                              <span className="text-xs font-black uppercase tracking-wider text-rose-300">Ao Vivo no Inks 🎙️</span>
                            </div>
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-slate-300">
                              {ink.spectatorsCount || 1} ouvintes
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <UserAvatar avatar={ink.authorAvatar} name={ink.authorName} className="w-10 h-10 border-2 border-purple-400" bgClassName={ink.authorAvatarBg} />
                            <div>
                              <h4 className="font-bold text-sm text-white leading-tight">{ink.title}</h4>
                              <span className="text-xs text-purple-200 block">{ink.authorName} ({ink.authorNickname})</span>
                            </div>
                          </div>
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={onJoinActiveInk}
                              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Radio className="w-4 h-4 animate-pulse" />
                              <span>Entrar na Transmissão de Áudio</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 3. Post-Its Render
                  if (unifiedItem.type === "postIts") {
                    const pi = unifiedItem.rawItem;
                    return (
                      <div
                        key={`pi-${pi.id}`}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: "1rem",
                        }}
                      >
                        <div className={`${pi.bgColor || "bg-amber-100"} text-slate-900 rounded-2xl p-4 shadow-sm border border-black/10 space-y-2.5 text-left`}>
                          <div className="flex items-center justify-between border-b border-black/10 pb-2">
                            <div onClick={() => onVisitProfile(pi.profileId)} className="flex items-center gap-2 cursor-pointer">
                              <UserAvatar avatar={pi.authorAvatar} name={pi.authorName} className="w-7 h-7" bgClassName={pi.authorAvatarBg} />
                              <span className="font-bold text-xs text-slate-900">{pi.authorName}</span>
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-700 bg-white/50 px-2 py-0.5 rounded-full">
                              📌 Post-It (24h)
                            </span>
                          </div>
                          {pi.image && (
                            <div className="w-full h-40 rounded-xl overflow-hidden shadow-2xs">
                              <img referrerPolicy="no-referrer" src={pi.image} alt="PostIt photo" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-xs font-medium leading-relaxed text-slate-900">"{pi.content}"</p>
                        </div>
                      </div>
                    );
                  }

                  // 4. Challenges Render
                  if (unifiedItem.type === "challenges") {
                    const c = unifiedItem.rawItem;
                    return (
                      <div
                        key={`ch-${c.id}`}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: "1rem",
                        }}
                      >
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 shadow-sm text-left space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-amber-600" /> Desafio Comunitário
                            </span>
                            <span className="text-[10px] font-mono font-extrabold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                              👑 +{c.reward || 100} Coroas
                            </span>
                          </div>
                          <div>
                            <h4 className="font-display font-extrabold text-sm text-amber-950">{c.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.description}</p>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500 font-mono">
                              Expira em: {getChallengeRemainingTime(c).text}
                            </span>
                            <button
                              onClick={() => onSelectTab("desafios")}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                              Aceitar Desafio 🏆
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 5. Searches Render
                  if (unifiedItem.type === "searches") {
                    const s = unifiedItem.rawItem;
                    return (
                      <div
                        key={`sr-${s.id}`}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: "1rem",
                        }}
                      >
                        <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-3xs text-left space-y-3">
                          <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                            <div onClick={() => onVisitProfile(s.creatorId)} className="flex items-center gap-2 cursor-pointer">
                              <UserAvatar avatar={s.creatorAvatar || "📊"} name={s.creatorName} className="w-7 h-7" bgClassName={s.creatorAvatarBg || "bg-indigo-600"} />
                              <span className="font-bold text-xs text-slate-900">{s.creatorName}</span>
                            </div>
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                              📊 Enquete Wolly Search
                            </span>
                          </div>
                          <h4 className="font-display font-bold text-sm text-slate-900">{s.question || s.title}</h4>
                          <div className="space-y-1.5">
                            {(s.options || []).map((opt: any, idx: number) => (
                              <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex justify-between">
                                <span>{opt.text || opt}</span>
                                <span className="text-indigo-600 font-mono font-bold">{opt.votes || 0} votos</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => onSelectTab("searches")}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
                            >
                              Votar na Enquete 📊
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 6. Gramps & Pulses Post Card Render
                  const post = unifiedItem.rawItem;
                  const postSeries = post.seriesId ? seriesList.find((s) => s.id === post.seriesId) : undefined;
                  return (
                    <div
                      key={post.id}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: "1rem",
                      }}
                    >
                      <motion.div
                        layoutId={`post-${post.id}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white border border-slate-150 rounded-2xl shadow-3xs overflow-hidden text-left animate-fade-in"
                      >
                    {postSeries && (
                      <div 
                        onClick={() => onSelectSeries && onSelectSeries(postSeries.id)}
                        className="bg-indigo-50/70 hover:bg-indigo-100/50 border-b border-indigo-100/50 px-4 py-2 flex items-center justify-between transition-all cursor-pointer text-slate-700 select-none"
                      >
                        <span className="text-[11px] font-bold flex items-center gap-1 font-sans">
                          <span>🧵</span> 
                          <span>Série: <strong className="text-indigo-700 font-extrabold">{postSeries.title}</strong></span>
                        </span>
                        <span className="text-[10px] bg-indigo-100/90 text-indigo-750 font-mono font-extrabold px-2 py-0.5 rounded-md">
                          Capítulo {post.seriesChapter || 1}
                        </span>
                      </div>
                    )}

                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between border-b border-slate-50">
                    <div 
                      onClick={() => onVisitProfile(post.profileId)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      {(() => {
                        const creator = profiles.find((p) => p.id === post.profileId);
                        return (
                          <UserAvatar
                            avatar={creator?.avatar || post.authorAvatar}
                            name={post.authorName}
                            className="w-9.5 h-9.5 group-hover:scale-105 transition-transform"
                            bgClassName={creator?.avatarBg || post.authorAvatarBg || "bg-indigo-600"}
                          />
                        );
                      })()}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-display font-bold text-xs text-slate-900 group-hover:text-indigo-650 transition-colors leading-tight">{post.authorName}</h4>
                          {unifiedItem.isVerified && (
                            <span className="text-indigo-600 text-[10px]" title="Perfil Verificado">🌟</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-450 block mt-0.5 leading-none">
                          {post.authorNickname} • {post.createdAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Transparent Rank Badge if Intelligent or Favorites */}
                      {feedPreferences.order === "inteligente" && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[8.5px] font-extrabold rounded-full border border-emerald-200">
                          {unifiedItem.badgeLabel}
                        </span>
                      )}

                      {/* Theme Indicator badge */}
                      {post.theme && (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[8.5px] font-extrabold text-indigo-700 uppercase tracking-wider">
                          {post.theme}
                        </span>
                      )}

                      {/* Trash icon if post is mine, otherwise Report/Transparency Alert */}
                      {post.profileId === activeProfile.id ? (
                        <button
                          title="Apagar publicação"
                          onClick={() => onDeletePost(post.id)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-505 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          title="Informações de Transparência do Feed"
                          onClick={() => setPostDisclosingId(postDisclosingId === post.id ? null : post.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${postDisclosingId === post.id ? "bg-amber-50 text-amber-600" : "hover:bg-slate-100 text-slate-400"}`}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Algorithmic Disclose Notice (Wolly privacy-focused aspect) */}
                  <AnimatePresence>
                    {postDisclosingId === post.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-50/70 border-b border-amber-100/30 px-4 py-2.5 text-xs text-slate-700 font-sans flex items-start gap-2 text-left"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-amber-900 leading-tight">Transparência do Feed</p>
                          <p className="text-[11px] text-slate-650 mt-1 font-medium leading-relaxed">
                            Este post aparece no seu feed porque <strong>{post.disclosedWhyVisible}</strong>. Wolly não comercializa seu engajamento nem vende anúncios. Seus dados são locais.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Post Image Content if available */}
                  {post.image && (
                    <div className="relative aspect-square max-h-[385px] w-full bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                      <img
                        referrerPolicy="no-referrer"
                        src={post.image}
                        alt="Conteúdo da publicação"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Post Text Description */}
                  <div className="p-4 space-y-3.5">
                    <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line font-medium">
                      {renderTextWithMentions(post.content)}
                    </p>

                    {/* Hashtags display */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.hashtags.map((tag) => (
                          <span
                            key={tag}
                            onClick={() => {
                              if (onHashtagClick) {
                                onHashtagClick(tag);
                              } else {
                                setShowSearch(true);
                                setSearchQuery(tag);
                              }
                            }}
                            className="text-[10px] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 border border-slate-100 px-2.5 py-0.5 rounded-lg font-mono font-semibold transition-colors cursor-pointer select-none"
                          >
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Line News Integration Button for Notícias Category */}
                    {(post.theme === "Notícias" || post.category === "Notícias") && (
                      <div className="pt-1.5 pb-1">
                        <button
                          type="button"
                          onClick={() => handleOpenLineNews(post)}
                          className="w-full py-2.5 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-display font-extrabold text-xs rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📰</span>
                            <span className="tracking-wide">Ver mais no Line News</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-blue-100 bg-white/15 px-2.5 py-1 rounded-lg group-hover:bg-white/25 transition-colors">
                            <span className="max-w-[140px] truncate">Tópico: {post.newsTopic || extractNewsTopic(post.content, post.hashtags)}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Bottom Action bar */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-slate-400">
                      
                      {/* Like button with exact constraint: click logic guarantees exact likedBy mapping */}
                      <button
                        onClick={() => onLikePost(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                          (Array.isArray(post.likedBy) && post.likedBy.some(uid => (profiles || []).some(p => p.id === uid)))
                            ? "text-rose-600 bg-rose-50 border border-rose-100"
                            : "hover:bg-slate-50 hover:text-slate-700 border border-transparent"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${
                          (Array.isArray(post.likedBy) && post.likedBy.some(uid => (profiles || []).some(p => p.id === uid)))
                            ? "fill-rose-500 text-rose-600 animate-pulse"
                            : ""
                        }`} />
                        <span>{post.likes}</span>
                      </button>

                      {/* Interactive Comments toggle button */}
                      <button
                        onClick={() => setExpandedCommentPostId(expandedCommentPostId === post.id ? null : post.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${expandedCommentPostId === post.id ? "text-indigo-600 bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50 hover:text-slate-700 border border-transparent"}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{(post.comments || []).length}</span>
                      </button>

                      {/* Share button with precise secure copy clip tracker */}
                      <button
                        onClick={() => handleShareClick(post.id)}
                        className="flex items-center gap-1.5 text-xs font-bold hover:bg-slate-50 hover:text-slate-700 py-1.5 px-3 rounded-lg transition-colors cursor-pointer border border-transparent"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 font-mono">{post.sharesCount || 0}</span>
                      </button>

                      {/* AI Summarize button with Line 123 */}
                      <button
                        onClick={() => onAskLine123ToSummarize?.(post.content, post.isPulse ? "Pulse" : "Gramp")}
                        className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-indigo-150 transition-all hover:scale-105 cursor-pointer"
                        title="Resumir com a assistente Line 123"
                      >
                        <span>🤖 Resumir</span>
                      </button>
                    </div>

                    {/* Collapsible comments section using global app state */}
                    <AnimatePresence>
                      {expandedCommentPostId === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden border-t border-slate-100 pt-3.5 space-y-3"
                        >
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                              Sessão de Comentários ({(post.comments || []).length})
                            </span>
                          </div>

                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar text-xs">
                            {(!post.comments || post.comments.length === 0) ? (
                              <p className="text-[11px] text-slate-400 italic text-center py-3 font-semibold">Nenhum comentário. Comece o diálogo seguro!</p>
                            ) : (
                              post.comments.map((comment) => (
                                <div key={comment.id} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5 space-y-1 text-left shadow-3xs">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const commentAuthor = profiles.find((p) => p.nickname === comment.authorNickname || p.name === comment.authorName);
                                        return (
                                          <UserAvatar
                                            avatar={commentAuthor?.avatar || comment.authorAvatar}
                                            name={comment.authorName}
                                            className="w-5.5 h-5.5"
                                            bgClassName={commentAuthor?.avatarBg || comment.authorAvatarBg || "bg-indigo-600"}
                                            textClassName="text-[10px] font-black text-white"
                                          />
                                        );
                                      })()}
                                      <span className="font-bold text-slate-900 text-[11px]">{comment.authorName}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-medium">{comment.createdAt}</span>
                                  </div>
                                  <p className="text-slate-650 pl-7 text-[11px] leading-relaxed font-sans font-medium">{comment.text}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add comment form */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const cTxt = newCommentTexts[post.id] || "";
                              if (!cTxt.trim()) return;
                              onAddCommentToPost(post.id, cTxt);
                              setNewCommentTexts({
                                ...newCommentTexts,
                                [post.id]: ""
                              });
                            }}
                            className="flex gap-2 pt-1"
                          >
                            <input
                              type="text"
                              value={newCommentTexts[post.id] || ""}
                              placeholder="Adicionar resposta de privacidade..."
                              onChange={(e) => setNewCommentTexts({
                                ...newCommentTexts,
                                [post.id]: e.target.value
                              })}
                              className="flex-1 text-xs px-3.5 py-2 placeholder-slate-400 bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-colors"
                            />
                            <button
                              type="submit"
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
                            >
                              Comentar
                            </button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                      </motion.div>
                    </div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Dynamic Modal - Create Post It */}
      <AnimatePresence>
        {showPostItCreator && (
          <div id="postit-creator-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 w-full max-w-sm border border-slate-100 shadow-2xl relative space-y-4 text-left"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-display font-black text-sm text-slate-950 flex items-center gap-1.5">
                  <span>📌</span> Novo Post It Temporário
                </span>
                <button
                  id="btn-close-postit-creator"
                  onClick={() => setShowPostItCreator(false)}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={handlePostItSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                {/* 1º PASSO: Botão de Câmera ao lado de Botão de Upload */}
                <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                  <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider block">
                    📸 1. Capturar Foto / Upload
                  </span>

                  <input
                    ref={postItImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePostItImageUpload}
                    className="hidden"
                  />

                  {/* Side-by-Side Camera and Upload Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                    >
                      <Camera className="w-4 h-4" />
                      <span>📸 Câmera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => postItImageInputRef.current?.click()}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>📁 Upload</span>
                    </button>
                  </div>

                  {/* Live Webcam Stream UI when Camera is Active */}
                  {isCameraActive && (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-indigo-500 shadow-md">
                      <video
                        ref={cameraVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2 px-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-md"
                        >
                          <span>📸 Capturar Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="py-1.5 px-2.5 bg-black/70 hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display Image Preview if captured or uploaded */}
                  {postItImage && !isCameraActive && (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-300 shadow-sm group">
                      <img
                        referrerPolicy="no-referrer"
                        src={postItImage}
                        alt="Preview PostIt"
                        className="w-full h-full object-cover transition-all"
                        style={{ filter: filterCssMap[selectedFilter] || "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => setPostItImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                        title="Remover Imagem"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2º PASSO: Botão de Editar (Adicionar Textos e Filtros) */}
                <div className="space-y-3 bg-purple-50/60 border border-purple-200/80 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs font-black text-purple-900 uppercase tracking-wider">
                    <Edit3 className="w-4 h-4 text-purple-600" />
                    <span>✏️ 2. Editar (Textos & Filtros)</span>
                  </div>

                  {/* Adicionar Texto */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 block">
                      ✍️ Adicionar Texto:
                    </label>
                    <div className={`p-3 rounded-xl ${selectedBgColor} border shadow-inner flex flex-col justify-between`}>
                      <textarea
                        id="textarea-postit-content"
                        maxLength={100}
                        placeholder="Escreva a legenda do seu Story (até 100 caracteres, use @para marcar)..."
                        value={postItText}
                        onChange={(e) => setPostItText(e.target.value)}
                        className="w-full bg-transparent text-xs font-sans font-extrabold leading-relaxed focus:outline-hidden resize-none placeholder-slate-600 border-none p-0 text-slate-900"
                        rows={2}
                      />
                      <div className="flex justify-between items-center text-[9px] text-slate-600 border-t border-black/10 pt-1 mt-1 font-bold">
                        <span>@{activeProfile.nickname.replace("@", "")}</span>
                        <span>{postItText.length}/100</span>
                      </div>
                    </div>

                    {/* Quick Mention Selector (@) */}
                    {profiles && profiles.length > 1 && (
                      <div className="pt-1.5 space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 flex items-center justify-between">
                          <span>🏷️ Marcar perfil com @:</span>
                          <span className="text-[9px] text-indigo-600 font-semibold">Toque para adicionar @</span>
                        </label>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-white/80 rounded-xl border border-slate-200/80">
                          {profiles
                            .filter((p) => p.id !== activeProfile.id)
                            .map((p) => {
                              const tagText = `@${(p.nickname || p.name).replace(/^@/, "")}`;
                              const isSelected = postItText.includes(tagText);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setPostItText(postItText.replace(tagText, "").trim());
                                    } else {
                                      const space = postItText && !postItText.endsWith(" ") ? " " : "";
                                      setPostItText((postItText + space + tagText + " ").slice(0, 100));
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600"
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

                  {/* Selecionar Filtros na Imagem */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-purple-600" />
                      <span>🎨 Aplicar Filtro na Imagem:</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "none", label: "✨ Normal" },
                        { id: "vintage", label: "🎞️ Vintage" },
                        { id: "bw", label: "🖤 P&B" },
                        { id: "sepia", label: "📜 Sépia" },
                        { id: "vivid", label: "🌈 Vívido" },
                        { id: "warm", label: "☀️ Quente" },
                        { id: "cyber", label: "🤖 Cyber" }
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFilter(f.id)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            selectedFilter === f.id
                              ? "bg-purple-600 text-white border-purple-600 shadow-xs"
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
                      🎨 Cor do Cartão/Texto:
                    </label>
                    <div className="flex items-center gap-2">
                      {postItColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedBgColor(color.value)}
                          className={`w-7 h-7 rounded-full ${color.dotColor} border border-black/10 transition-transform ${selectedBgColor === color.value ? "ring-2 ring-purple-600 ring-offset-2 scale-110" : "hover:scale-105"}`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3º PASSO: Upload Opcional de Música (No fim) */}
                <div className="space-y-2 bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase tracking-wider">
                    <Music className="w-4 h-4 text-emerald-600" />
                    <span>🎧 3. Upload Opcional de Música</span>
                  </div>

                  <input
                    ref={postItAudioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handlePostItAudioUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => postItAudioInputRef.current?.click()}
                    className="w-full py-2.5 px-3 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🎵 Fazer Upload de Música / Áudio (MP3)</span>
                  </button>

                  {/* Opções Rápida de Músicas da Plataforma */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POSTIT_MUSIC_LIST.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          setPostItMusic(postItMusic === track.name ? "" : track.name);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          postItMusic === track.name
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs scale-105"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {track.icon} {track.name}
                      </button>
                    ))}
                  </div>

                  {postItMusic && (
                    <div className="bg-emerald-101 border border-emerald-300 p-2 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
                      <span className="truncate">{postItMusic}</span>
                      <button
                        type="button"
                        onClick={() => setPostItMusic("")}
                        className="text-emerald-800 hover:text-emerald-950 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  id="btn-confirm-postit"
                  type="submit"
                  disabled={!postItText.trim() && !postItImage}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  🚀 Publicar Story / Post It
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Modal - View Post It / Story Details */}
      <AnimatePresence>
        {selectedPostIt && (
          <div 
            id="postit-detail-modal" 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md select-none w-screen h-screen p-3 sm:p-6 overflow-hidden" 
            onClick={handleCloseStory}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} // Prevent close on card click
              className="w-full max-w-sm sm:max-w-md max-h-[92vh] h-auto relative flex flex-col justify-between overflow-hidden bg-slate-950 rounded-3xl border border-white/20 shadow-2xl my-auto"
            >
              {/* Instagram-style Top Progress Bar */}
              <div className="pt-3 px-4 z-30 flex gap-1 shrink-0">
                <div className="h-[3px] bg-white/30 rounded-full flex-1 overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 15, ease: "linear" }}
                    className="h-full bg-white shadow-xs"
                  />
                </div>
              </div>

              {/* Story Header overlay with author information */}
              <div className="pt-2 px-4 z-30 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    avatar={profiles.find(p => p.nickname === selectedPostIt.authorNickname)?.avatar || selectedPostIt.authorAvatar}
                    name={selectedPostIt.authorName}
                    className="w-9 h-9 border-2 border-white/40 shadow-md shrink-0"
                    bgClassName={selectedPostIt.authorAvatarBg || "bg-slate-700"}
                  />
                  <div className="text-left min-w-0 truncate">
                    <span className="font-sans font-black text-xs block leading-tight text-white tracking-wide truncate">{selectedPostIt.authorName}</span>
                    <span className="text-[9.5px] font-mono opacity-80 block truncate">{selectedPostIt.authorNickname} • Expira em: {getRemainingTimeStr(selectedPostIt.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={handleCloseStory}
                  className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all cursor-pointer border border-white/20 shrink-0 ml-2"
                  title="Fechar Story"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Story Content Body (Resized Image or Text Card) */}
              <div className="my-2 px-3 flex-1 flex flex-col items-center justify-center overflow-hidden relative min-h-[220px] max-h-[55vh]">
                {selectedPostIt.image ? (
                  // Photo Story - Fit inside viewport
                  <div className="w-full h-full max-h-[52vh] relative flex items-center justify-center rounded-2xl overflow-hidden bg-black/60">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={selectedPostIt.image} 
                      alt="Story Media" 
                      className="max-h-[50vh] w-full object-contain rounded-2xl" 
                    />
                  </div>
                ) : (
                  // Color/Text Story
                  <div className={`w-full h-full min-h-[200px] flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-tr from-purple-900 via-indigo-950 to-slate-900 text-center relative border border-white/10 shadow-inner`}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none rounded-2xl" />
                    {selectedPostIt.content && (
                      <div className="relative z-10 font-sans font-black text-lg sm:text-xl text-white tracking-wide leading-snug max-w-xs px-2 drop-shadow-md break-words max-h-[40vh] overflow-y-auto no-scrollbar">
                        {renderTextWithMentions(selectedPostIt.content)}
                      </div>
                    )}
                  </div>
                )}

                {/* Text Caption overlaid if image + text exists */}
                {selectedPostIt.image && selectedPostIt.content && (
                  <div className="w-full mt-2 bg-black/80 border border-white/15 p-2.5 rounded-2xl text-center text-xs font-sans font-bold text-white max-h-24 overflow-y-auto shrink-0">
                    {renderTextWithMentions(selectedPostIt.content)}
                  </div>
                )}
              </div>

              {/* Music Player Bar at Bottom */}
              {selectedPostIt.music && (
                <div className="p-3 bg-emerald-950/90 border-t border-emerald-500/30 flex items-center justify-between text-white shrink-0 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (postItAudioRef.current) {
                          if (isPlayingAudio) {
                            try {
                              postItAudioRef.current.pause();
                            } catch (e) {}
                            setIsPlayingAudio(false);
                          } else {
                            postItAudioRef.current.play().catch((err) => {
                              console.log("Audio play error:", err);
                            });
                            setIsPlayingAudio(true);
                          }
                        } else if (selectedPostIt.music) {
                          if (isPlayingAudio) {
                            stopPostItSynth();
                            setIsPlayingAudio(false);
                          } else {
                            playPostItSynth(selectedPostIt.music);
                            setIsPlayingAudio(true);
                          }
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 font-extrabold text-xs transition-transform active:scale-90 cursor-pointer shadow-md"
                      title={isPlayingAudio ? "Pausar música" : "Tocar música"}
                    >
                      {isPlayingAudio ? "⏸" : "▶"}
                    </button>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="text-[9px] uppercase font-mono font-extrabold text-emerald-400 block leading-none">
                        🎵 Música do Post-It
                      </span>
                      <span className="text-xs font-bold text-white truncate block mt-0.5">
                        {selectedPostIt.music}
                      </span>
                    </div>
                  </div>

                  <audio
                    ref={postItAudioRef}
                    src={getAudioSource(selectedPostIt.music, selectedPostIt.audioUrl) || undefined}
                    loop
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compiled Active Post Its List Modal (Triggered by paper icon) */}
      <AnimatePresence>
        {showAllPostItsModal && (
          <div id="all-postits-list-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none" onClick={() => setShowAllPostItsModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-50 rounded-3xl p-5 w-full max-w-sm border border-slate-100 shadow-2xl relative space-y-4 text-left max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center border-b border-slate-250 pb-2.5 flex-shrink-0">
                <span className="font-display font-black text-sm text-slate-900 flex items-center gap-1.5 animate-pulse">
                  <span>📄</span> Post Its Ativos ({postIts.length})
                </span>
                <button
                  id="btn-close-all-postits-list"
                  onClick={() => setShowAllPostItsModal(false)}
                  className="p-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
                >
                  Fechar
                </button>
              </div>

              {/* Scrollable list of active Post Its */}
              <div className="flex-grow overflow-y-auto no-scrollbar space-y-3.5 pr-1 py-1">
                {postIts.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs italic space-y-2">
                    <div className="text-3xl">🍃</div>
                    <p>Nenhum Post It ativo no momento.</p>
                    <p className="text-[10px] text-slate-400">Seja o primeiro a publicar um Post It de 24 horas!</p>
                  </div>
                ) : (
                  postIts.map((pi) => (
                    <div
                      key={pi.id}
                      onClick={() => {
                        setSelectedPostIt(pi);
                        setShowAllPostItsModal(false);
                        if (pi.music) {
                          playPostItSynth(pi.music);
                        }
                      }}
                      className={`p-4 rounded-2xl ${pi.bgColor} border border-black/5 hover:scale-[1.01] hover:-translate-y-0.5 shadow-sm transition-all cursor-pointer relative flex flex-col justify-between space-y-2.5`}
                    >
                      {/* Tiny tack indicator to look like sticky note */}
                      <div className="absolute top-2 right-3.5 opacity-40 text-xs">📌</div>

                      <div className="flex items-center gap-2">
                        <UserAvatar
                          avatar={profiles.find(p => p.nickname === pi.authorNickname)?.avatar || pi.authorAvatar}
                          name={pi.authorName}
                          className="w-8 h-8"
                          bgClassName={pi.authorAvatarBg || "bg-indigo-600"}
                        />
                        <div>
                          <span className="block text-xs font-black text-slate-950 leading-tight">{pi.authorName}</span>
                          <span className="text-[9.5px] text-slate-550 font-semibold font-mono block leading-none">{pi.authorNickname}</span>
                        </div>
                      </div>

                      {pi.image && (
                        <div className="w-full h-28 rounded-xl overflow-hidden shadow-3xs my-1">
                          <img referrerPolicy="no-referrer" src={pi.image} alt="Post It Photo" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <p className="text-xs font-bold leading-relaxed text-slate-900 font-sans break-words pl-0.5">
                        "{pi.content}"
                      </p>

                      <div className="border-t border-black/5 pt-1.5 flex justify-between items-center text-[9px] font-bold text-slate-800">
                        <span className="text-slate-500 font-mono">⚡ Post It</span>
                        <span className="font-mono flex items-center gap-0.5">
                          <span>🕒</span> {getRemainingTimeStr(pi.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Fast create button trigger inside list modal */}
              <button
                id="btn-trigger-fast-create-inside-modal"
                onClick={() => {
                  setShowAllPostItsModal(false);
                  setShowPostItCreator(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 font-display font-black text-[11px] uppercase tracking-wider text-white hover:opacity-95 rounded-xl text-center shadow-md cursor-pointer transition-transform flex-shrink-0"
              >
                ＋ Publicar Novo Post It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Line News Integration Modal */}
      <LineNewsModal
        isOpen={!!lineNewsModalPost}
        newsTopic={lineNewsModalPost ? (lineNewsModalPost.newsTopic || extractNewsTopic(lineNewsModalPost.content, lineNewsModalPost.hashtags)) : ""}
        onClose={() => setLineNewsModalPost(null)}
      />

    </div>
  );
}
