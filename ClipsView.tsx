/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { Play, Pause, Heart, MessageSquare, Share2, Volume2, VolumeX, ArrowLeft, Send, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Clip } from "../types";
import UserAvatar from "./UserAvatar";
import ShareClipModal from "./ShareClipModal";
import { getVideoFromIndexedDB } from "../lib/videoStore";

interface ClipsViewProps {
  activeProfile: Profile;
  profiles?: Profile[];
  clips: Clip[];
  onLikeClip: (clipId: string) => void;
  onAddCommentToClip: (clipId: string, text: string) => void;
  onShareClip: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
  onDeleteCommentFromClip?: (clipId: string, commentId: string) => void;
  onBack: () => void;
  onAskLine123ToSummarize?: (content: string, type: string) => void;
  onAddRealNotification?: (message: string, type: string) => void;
}

export default function ClipsView({
  activeProfile,
  profiles = [],
  clips,
  onLikeClip,
  onAddCommentToClip,
  onShareClip,
  onDeleteClip,
  onDeleteCommentFromClip,
  onBack,
  onAskLine123ToSummarize,
  onAddRealNotification
}: ClipsViewProps) {
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [sharingClipModal, setSharingClipModal] = useState<Clip | null>(null);

  const activeClip = clips?.[currentClipIndex] || clips?.[0];

  // Safeguard: Ensure currentClipIndex is always within valid bounds of the clips array
  useEffect(() => {
    if (clips && clips.length > 0 && currentClipIndex >= clips.length) {
      setCurrentClipIndex(0);
    }
  }, [clips?.length, currentClipIndex]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevObjectUrlRef = useRef<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [fallbackVideoUrl, setFallbackVideoUrl] = useState<string | null>(null);
  const [indexedDbVideoUrl, setIndexedDbVideoUrl] = useState<string | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Reset states, clean up old object URLs to prevent memory leaks, and check IndexedDB when active clip changes
  useEffect(() => {
    setIsVideoLoading(true);
    setHasVideoError(false);
    setFallbackVideoUrl(null);

    // Clean up previous blob URL to prevent browser memory leak that crashes video after prolonged playback
    if (prevObjectUrlRef.current && prevObjectUrlRef.current.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(prevObjectUrlRef.current);
      } catch (e) {
        console.warn("Error revoking object URL:", e);
      }
      prevObjectUrlRef.current = null;
    }
    setIndexedDbVideoUrl(null);

    let isMounted = true;
    if (activeClip?.id) {
      getVideoFromIndexedDB(activeClip.id).then((url) => {
        if (isMounted && url) {
          if (url.startsWith("blob:")) {
            prevObjectUrlRef.current = url;
          }
          setIndexedDbVideoUrl(url);
        } else if (activeClip.videoUrl) {
          getVideoFromIndexedDB(activeClip.videoUrl).then((url2) => {
            if (isMounted && url2) {
              if (url2.startsWith("blob:")) {
                prevObjectUrlRef.current = url2;
              }
              setIndexedDbVideoUrl(url2);
            }
          });
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [currentClipIndex, activeClip?.id, activeClip?.videoUrl]);

  // Cleanup object URL on component unmount
  useEffect(() => {
    return () => {
      if (prevObjectUrlRef.current && prevObjectUrlRef.current.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prevObjectUrlRef.current);
        } catch (_) {}
      }
    };
  }, []);

  // Keep video synchronized with play state
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch((err) => {
        console.warn("Autoplay was prevented by browser:", err);
      });
    } else {
      el.pause();
    }
  }, [isPlaying, currentClipIndex, activeClip?.id, indexedDbVideoUrl]);

  // Synchronize muted state
  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.muted = isMuted;
    }
  }, [isMuted]);

  // Synchronize speed
  useEffect(() => {
    const el = videoRef.current;
    if (el && activeClip?.videoSpeed) {
      el.playbackRate = activeClip.videoSpeed;
    }
  }, [activeClip?.videoSpeed, currentClipIndex, activeClip?.id]);

  // Scroll container ref for YouTube Shorts-style snap scrolling
  const clipsContainerRef = useRef<HTMLDivElement | null>(null);

  const handleNextClip = () => {
    const nextIdx = (currentClipIndex + 1) % clips.length;
    setCurrentClipIndex(nextIdx);
    setIsPlaying(true);
    if (clipsContainerRef.current) {
      const cardHeight = clipsContainerRef.current.clientHeight;
      clipsContainerRef.current.scrollTo({
        top: nextIdx * cardHeight,
        behavior: "smooth"
      });
    }
  };

  const handlePrevClip = () => {
    const prevIdx = (currentClipIndex - 1 + clips.length) % clips.length;
    setCurrentClipIndex(prevIdx);
    setIsPlaying(true);
    if (clipsContainerRef.current) {
      const cardHeight = clipsContainerRef.current.clientHeight;
      clipsContainerRef.current.scrollTo({
        top: prevIdx * cardHeight,
        behavior: "smooth"
      });
    }
  };

  const handleScroll = (e: { currentTarget: HTMLDivElement }) => {
    const el = e.currentTarget;
    if (el.clientHeight > 0) {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      if (idx >= 0 && idx < clips.length && idx !== currentClipIndex) {
        setCurrentClipIndex(idx);
        setIsPlaying(true);
      }
    }
  };

  const handleAddComment = (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    onAddCommentToClip(activeClip.id, newComment.trim());
    setNewComment("");
  };

  const handleShareClick = (targetClip?: Clip) => {
    const clipToShare = targetClip || activeClip;
    if (!clipToShare) return;
    setSharingClipModal(clipToShare);
  };

  const activeClipComments = activeClip?.comments || [];

  if (!clips || clips.length === 0 || !activeClip) {
    return (
      <div id="clips-view-root" className="min-h-screen bg-black text-white pb-20 select-none relative flex flex-col justify-between">
        {/* Top Overlay HUD Bar */}
        <div className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              id="btn-back-clips"
              onClick={onBack} 
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-display font-black text-lg tracking-wider text-white flex items-center gap-2">
              Clips <span className="bg-red-500 text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-mono">Live</span>
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl">
            🎬
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="font-display font-bold text-sm text-white">Nenhum Clipe Disponível</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Os clips e as mídias padronizadas foram removidos. Esse espaço agora é preenchido de forma dinâmica ao publicar novos clipes na sua conta ativa!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="clips-view-root" className="h-[calc(100vh-64px)] bg-black text-white select-none relative flex flex-col justify-between overflow-hidden">
      
      {/* Toast Notice */}
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

      {/* Top Overlay HUD Bar */}
      <div className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/90 to-transparent p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            id="btn-back-clips"
            onClick={onBack} 
            className="p-1 text-white hover:text-slate-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-sans font-black text-xl tracking-tight text-white">
            Clips
          </span>
        </div>
        <div className="bg-rose-500/20 backdrop-blur-md rounded-full px-3 py-1 text-[10px] text-rose-300 border border-rose-400/30 font-mono font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping" />
          <span>Shorts Feed ({clips.length})</span>
        </div>
      </div>

      {/* Main Video Area with Native Shorts-Style CSS Snap Scroll */}
      <div 
        ref={clipsContainerRef}
        className="flex-1 w-full h-full relative overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar"
        onScroll={handleScroll}
      >
        {clips.map((clipItem, index) => {
          const isCurrent = index === currentClipIndex;
          const isOwner = clipItem.profileId === activeProfile.id || clipItem.authorName === activeProfile.name || (activeProfile.nickname && clipItem.authorName === activeProfile.nickname);
          const clipLikedBy = Array.isArray(clipItem.likedBy) ? clipItem.likedBy : [];
          const isLiked = clipLikedBy.includes(activeProfile.id);

          return (
            <div
              key={clipItem.id}
              id={`clip-card-${clipItem.id}`}
              className="w-full h-full snap-start snap-always shrink-0 relative overflow-hidden flex items-center justify-center bg-black"
            >
              {/* Active or Preloaded Video Content using standard HTML5 <video> tag */}
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                {isCurrent ? (
                  <video
                    id={`clip-player-video-${clipItem.id}`}
                    src={indexedDbVideoUrl || fallbackVideoUrl || clipItem.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}
                    autoPlay={isPlaying}
                    loop
                    muted={isMuted}
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover"
                    style={{ filter: clipItem.videoFilter || "none" }}
                    onTimeUpdate={(e) => {
                      const el = e.currentTarget;
                      setVideoCurrentTime(el.currentTime);
                      const start = clipItem.videoTrimStart || 0;
                      const end = (clipItem.videoTrimEnd && clipItem.videoTrimEnd > start) ? clipItem.videoTrimEnd : (el.duration && el.duration > 0 ? el.duration : 60000);
                      if (el.currentTime < start) {
                        el.currentTime = start;
                      }
                      if (el.currentTime >= end) {
                        el.currentTime = start;
                        if (isPlaying) {
                          el.play().catch(() => {});
                        }
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget;
                      setVideoDuration(el.duration || 0);
                      el.currentTime = clipItem.videoTrimStart || 0;
                      if (clipItem.videoSpeed) {
                        el.playbackRate = clipItem.videoSpeed;
                      }
                    }}
                    onEnded={(e) => {
                      const el = e.currentTarget;
                      el.currentTime = clipItem.videoTrimStart || 0;
                      if (isPlaying) {
                        el.play().catch(() => {});
                      }
                    }}
                    onLoadStart={() => {
                      setIsVideoLoading(true);
                      setHasVideoError(false);
                    }}
                    onWaiting={() => setIsVideoLoading(true)}
                    onPlaying={() => setIsVideoLoading(false)}
                    onCanPlay={() => setIsVideoLoading(false)}
                    onLoadedData={() => setIsVideoLoading(false)}
                    onError={() => {
                      console.warn("Video failed to load source:", clipItem.videoUrl);
                      if (!fallbackVideoUrl) {
                        setFallbackVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
                      } else {
                        setIsVideoLoading(false);
                      }
                    }}
                    ref={videoRef}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${clipItem.videoPlaceholder || "from-neutral-900 via-stone-900 to-black"} flex items-center justify-center`} />
                )}

                {/* Buffering/Loading Spinner */}
                {isCurrent && isVideoLoading && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex flex-col items-center justify-center z-10 pointer-events-none">
                    <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-2" />
                    <span className="text-[10px] text-indigo-300 font-mono tracking-wider uppercase">Carregando Mídia...</span>
                  </div>
                )}
              </div>

              {/* Big Play Outline HUD in center */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                {!isPlaying && isCurrent && (
                  <div className="w-16 h-16 rounded-full bg-black/40 border border-white/40 flex items-center justify-center backdrop-blur-xs select-none">
                    <Play className="w-8 h-8 fill-white text-white ml-1" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 z-20 cursor-pointer" onClick={() => setIsPlaying(!isPlaying)} />

              {/* Interactive HTML5 Video Timeline Scrubber Bar */}
              {isCurrent && (
                <div className="absolute inset-x-4 bottom-16 z-30 flex items-center gap-2 px-1">
                  <div
                    className="flex-1 bg-white/20 hover:bg-white/40 h-1.5 hover:h-2.5 rounded-full overflow-hidden cursor-pointer transition-all relative group"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current && videoDuration > 0) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, clickX / rect.width));
                        videoRef.current.currentTime = pct * videoDuration;
                        setVideoCurrentTime(pct * videoDuration);
                      }
                    }}
                  >
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all relative"
                      style={{ width: `${videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-white/90 drop-shadow-md select-none shrink-0">
                    {formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
                  </span>
                </div>
              )}

              {/* Right HUD Sidebar (Compact & Sleek) */}
              <div className="absolute right-3.5 bottom-12 z-30 flex flex-col items-center gap-3">
                {/* Like button */}
                <button
                  id={`btn-like-clip-${clipItem.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLikeClip(clipItem.id);
                  }}
                  className="flex flex-col items-center gap-0.5 group cursor-pointer"
                  title={isLiked ? "Remover curtida" : "Curtir clipe"}
                >
                  <div
                    className={`w-9.5 h-9.5 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
                      isLiked
                        ? "bg-rose-500/30 border-rose-400 text-rose-400 shadow-md shadow-rose-500/30 scale-105"
                        : "bg-black/60 border-white/20 text-white group-hover:bg-black/80"
                    }`}
                  >
                    <Heart className={`w-4.5 h-4.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                  </div>
                  <span className="text-[10px] font-bold text-white drop-shadow-md">{clipItem.likes || 0}</span>
                </button>

                {/* Comment button */}
                <button
                  id={`btn-toggle-comments-${clipItem.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(true);
                  }}
                  className="flex flex-col items-center gap-0.5 group cursor-pointer"
                  title="Ver comentários"
                >
                  <div className="w-9.5 h-9.5 rounded-full bg-black/60 group-hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all text-white">
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-white drop-shadow-md">{(clipItem.comments || []).length}</span>
                </button>

                {/* Share button */}
                <button
                  id={`btn-share-clip-${clipItem.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareClick(clipItem);
                  }}
                  className="flex flex-col items-center gap-0.5 group cursor-pointer"
                  title="Compartilhar clipe no chat"
                >
                  <div className="w-9.5 h-9.5 rounded-full bg-black/60 group-hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all text-white">
                    <Share2 className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-white drop-shadow-md">{clipItem.sharesCount || 0}</span>
                </button>

                {/* Delete button (ONLY FOR OWNER) */}
                {isOwner && onDeleteClip && (
                  <button
                    id={`btn-delete-clip-${clipItem.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Deseja realmente excluir este clipe? Esta ação é irreversível.")) {
                        onDeleteClip(clipItem.id);
                      }
                    }}
                    className="flex flex-col items-center gap-0.5 group cursor-pointer"
                    title="Excluir meu clipe"
                  >
                    <div className="w-9.5 h-9.5 rounded-full bg-rose-950/80 group-hover:bg-rose-900 border border-rose-500/40 backdrop-blur-md flex items-center justify-center transition-all text-rose-400 group-hover:text-rose-200 shadow-md shadow-rose-950/50">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-rose-300 drop-shadow-md">Excluir</span>
                  </button>
                )}

                {/* AI Summarize Clip */}
                <button
                  id={`btn-summarize-clip-${clipItem.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAskLine123ToSummarize?.(clipItem.description, "Clip");
                  }}
                  className="flex flex-col items-center gap-0.5 group cursor-pointer"
                  title="Resumir com a assistente Line 123"
                >
                  <div className="w-9.5 h-9.5 rounded-full bg-indigo-600 group-hover:bg-indigo-700 backdrop-blur-md border border-indigo-400/30 flex items-center justify-center transition-all text-white animate-pulse">
                    <span className="text-base">🤖</span>
                  </div>
                  <span className="text-[9px] font-extrabold text-indigo-200 drop-shadow-md">Resumir</span>
                </button>

                {/* Mute/unmute button */}
                <button
                  id={`btn-toggle-mute-${clipItem.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="w-9.5 h-9.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all cursor-pointer text-white"
                  title={isMuted ? "Ativar som" : "Desativar som"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4.5 h-4.5 text-slate-300" />
                  ) : (
                    <Volume2 className="w-4.5 h-4.5 text-emerald-400" />
                  )}
                </button>
              </div>

              {/* Lower Left content overlay */}
              <div className="absolute left-5 bottom-12 z-30 max-w-[68%] space-y-2 text-left pointer-events-none">
                <div>
                  <h3 className="font-sans font-black text-[16px] tracking-wide text-white drop-shadow-md">
                    @{clipItem.authorName}
                  </h3>
                  <p className="text-xs text-slate-300 drop-shadow-sm font-sans line-clamp-2 leading-relaxed">
                    {clipItem.description}
                  </p>
                </div>
                
                <div className="inline-flex items-center text-xs font-semibold text-yellow-400 drop-shadow-md">
                  <span>📍 {clipItem.location || "Pedra da Gávea"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Swipe Navigation indicator */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between text-xs text-slate-400 px-6">
        <button 
          onClick={handlePrevClip} 
          className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-30 p-1 font-semibold"
        >
          ← Ant.
        </button>
        <span className="font-mono text-[10px]">Clip {currentClipIndex + 1} de {clips.length}</span>
        <button 
          onClick={handleNextClip} 
          className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 p-1 font-semibold"
        >
          Próx. →
        </button>
      </div>

      {/* Sliding Dialog for comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute inset-x-0 bottom-0 z-50 bg-neutral-900 border-t border-neutral-800 rounded-t-2xl max-h-[55%] flex flex-col justify-between text-left shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <span className="font-display font-bold text-sm text-white">Comentários ({activeClipComments.length})</span>
              <button 
                onClick={() => setShowComments(false)}
                className="text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Comments list scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 h-64 no-scrollbar">
              {activeClipComments.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nenhum comentário neste clipe ainda. Seja o primeiro a comentar!</p>
              ) : (
                activeClipComments.map((cmt) => {
                  const isCommentOwner = cmt.profileId === activeProfile.id || cmt.authorName === activeProfile.name;
                  const isClipOwner = activeClip.profileId === activeProfile.id || activeClip.authorName === activeProfile.name;
                  const canDeleteComment = (isCommentOwner || isClipOwner) && onDeleteCommentFromClip;

                  return (
                    <div key={cmt.id} className="text-xs space-y-1 bg-white/5 border border-white/5 p-2.5 rounded-xl flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            avatar={cmt.authorAvatar}
                            name={cmt.authorName}
                            className="w-5 h-5"
                            bgClassName={cmt.authorAvatarBg || "bg-indigo-600"}
                            textClassName="text-[9px] font-black text-white"
                          />
                          <span className="font-bold text-indigo-400">@{cmt.authorName}</span>
                          <span className="text-[8px] text-zinc-500 ml-auto">{cmt.createdAt}</span>
                        </div>
                        <p className="text-slate-200 mt-0.5 leading-relaxed pl-7">{cmt.text}</p>
                      </div>

                      {canDeleteComment && (
                        <button
                          onClick={() => onDeleteCommentFromClip(activeClip.id, cmt.id)}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="Excluir comentário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment input form */}
            <form onSubmit={handleAddComment} className="p-3 bg-neutral-950 border-t border-neutral-800 flex gap-2">
              <input
                id="comment-input"
                type="text"
                placeholder="Comentar local e seguro..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-neutral-800 border border-neutral-700 text-xs px-3 py-2 rounded-xl text-white focus:outline-hidden placeholder-slate-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-750 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Clip Modal for Chat */}
      {sharingClipModal && (
        <ShareClipModal
          clip={sharingClipModal}
          activeProfile={activeProfile}
          profiles={profiles}
          onClose={() => setSharingClipModal(null)}
          onShareClipCount={onShareClip}
          onAddRealNotification={(msg, type) => {
            setShareToast(msg);
            setTimeout(() => setShareToast(null), 3000);
            onAddRealNotification?.(msg, type);
          }}
        />
      )}

    </div>
  );
}
