import { useState } from "react";
import { ArrowLeft, Play, Users, Calendar, MoveUp, MoveDown, Eye, Heart, MessageSquare, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Post, Clip, Ink, Series } from "../types";

interface SeriesViewProps {
  series: Series;
  activeProfile: Profile;
  profiles: Profile[];
  posts: Post[];
  clips: Clip[];
  activeInk: Ink | null;
  onBack: () => void;
  onToggleFollow: (seriesId: string) => void;
  onReorderChapters: (seriesId: string, itemIdsOrdered: string[]) => void;
  onVisitProfile?: (profileId: string) => void;
}

export default function SeriesView({
  series,
  activeProfile,
  profiles,
  posts,
  clips,
  activeInk,
  onBack,
  onToggleFollow,
  onReorderChapters,
  onVisitProfile,
}: SeriesViewProps) {
  const isOwner = series.profileId === activeProfile.id;
  const isFollowing = (series.followerIds || []).includes(activeProfile.id);

  // Collect all items belonging to this series
  const seriesPosts = posts.filter((p) => p.seriesId === series.id).map(p => ({
    id: p.id,
    type: "post" as const,
    title: p.content.substring(0, 45) + (p.content.length > 45 ? "..." : ""),
    content: p.content,
    image: p.image,
    createdAt: p.createdAt,
    likes: p.likes,
    commentsCount: p.comments?.length || 0,
    authorName: p.authorName,
    authorNickname: p.authorNickname,
    chapter: p.seriesChapter || 1,
    raw: p
  }));

  const seriesClips = clips.filter((c) => c.seriesId === series.id).map(c => ({
    id: c.id,
    type: "clip" as const,
    title: c.description.substring(0, 45) + (c.description.length > 45 ? "..." : ""),
    content: c.description,
    image: undefined,
    videoPlaceholder: c.videoPlaceholder,
    videoUrl: c.videoUrl,
    createdAt: c.createdAt || "recentemente",
    likes: c.likes,
    commentsCount: c.comments?.length || 0,
    authorName: c.authorName,
    authorNickname: `@${c.authorName.toLowerCase().replace(/\s+/g, "")}`,
    chapter: c.seriesChapter || 1,
    raw: c
  }));

  // Combine and sort by chapter ascending
  const allItems = [...seriesPosts, ...seriesClips].sort((a, b) => a.chapter - b.chapter);

  // Selected item modal review
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null);

  // Manual re-ordering logic using mobile-perfect Swap strategy
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...allItems];
    // swap chapter numbers or sequence in array
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;

    const orderedIds = newList.map(item => item.id);
    onReorderChapters(series.id, orderedIds);
  };

  const handleMoveDown = (index: number) => {
    if (index === allItems.length - 1) return;
    const newList = [...allItems];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;

    const orderedIds = newList.map(item => item.id);
    onReorderChapters(series.id, orderedIds);
  };

  const handleStartFromStart = () => {
    if (allItems.length > 0) {
      setSelectedReviewItem(allItems[0]);
    } else {
      alert("Esta série ainda não possui capítulos publicados!");
    }
  };

  return (
    <div id={`series-detail-screen-${series.id}`} className="min-h-screen bg-slate-50 text-slate-800 pb-24 text-left font-sans">
      {/* Header Cover Background */}
      <div className="relative h-44 w-full bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 flex items-end justify-between p-4 shadow-inner overflow-hidden">
        {/* Animated fluid backdrops */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl pointer-events-none" />

        {/* Real Cover Image if provided */}
        {series.cover && (
          <img 
            src={series.cover} 
            alt={series.title} 
            className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" 
          />
        )}

        {/* Return Button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-black/50 hover:bg-black/75 rounded-xl text-white text-[11px] font-black tracking-wide border border-white/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        {/* Floating badge for series author */}
        <div className="absolute top-4 right-4 z-10 bg-indigo-600 border border-indigo-400 text-white font-mono text-[9px] uppercase px-2.5 py-1 rounded-full font-extrabold shadow-sm flex items-center gap-1">
          <span>🧵 Série Oficial</span>
        </div>

        {/* Gradient Overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-0" />

        {/* Small avatar and details directly layered over bottom of banner */}
        <div className="z-10 flex items-center gap-3 w-full">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex-shrink-0 flex items-center justify-center text-3xl border border-white/20 shadow-md">
            {series.cover ? (
              <img src={series.cover} className="w-full h-full object-cover rounded-2xl" />
            ) : "🧵"}
          </div>
          <div className="min-w-0 text-white space-y-0.5">
            <h1 className="text-base font-black tracking-tight leading-snug drop-shadow-md truncate max-w-[280px]">
              {series.title}
            </h1>
            <p className="text-[10.5px] text-slate-300 font-mono tracking-wide">
              Criado por: <span className="text-indigo-300 font-bold hover:underline cursor-pointer" onClick={() => onVisitProfile && onVisitProfile(series.profileId)}>@{series.authorNickname}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-md mx-auto">
        {/* Statistics and follow bar */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-3xs flex items-center justify-between">
          <div className="flex gap-4">
            <div>
              <span className="block text-[8.5px] uppercase font-mono font-bold tracking-widest text-slate-400 leading-none">Capítulos</span>
              <span className="text-sm font-black text-slate-800 font-display mt-0.5 block">{allItems.length}</span>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <span className="block text-[8.5px] uppercase font-mono font-bold tracking-widest text-slate-400 leading-none">Seguidores</span>
              <span className="text-sm font-black text-slate-850 font-display mt-0.5 block">{(series.followerIds || []).length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Follow/Unfollow button */}
            <button
              onClick={() => onToggleFollow(series.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold font-sans text-[10.5px] transition-all cursor-pointer flex items-center gap-1 ${
                isFollowing
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs shadow-indigo-500/10"
              }`}
            >
              {isFollowing ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-500" />
                  <span>Seguindo</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Seguir Série</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Series Description */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-3xs text-left space-y-1.5">
          <h3 className="text-xs font-black text-slate-850 font-sans tracking-wide uppercase leading-none">Sobre esta sequência</h3>
          <p className="text-xs leading-relaxed text-slate-605 whitespace-pre-wrap font-sans">
            {series.description || "Esta linda série ainda não adicionou uma descrição longa."}
          </p>
        </div>

        {/* Start from beginning and actions */}
        {allItems.length > 0 && (
          <button
            onClick={handleStartFromStart}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:shadow-md hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold font-sans text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-500/15"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Começar do início (Capítulo 1)</span>
          </button>
        )}

        {/* Chapters header */}
        <div className="flex justify-between items-center pt-2">
          <h2 className="text-xs font-black tracking-widest text-slate-550 uppercase font-mono">
            📚 Capítulos da Série ({allItems.length})
          </h2>
          {isOwner && (
            <span className="text-[9px] text-indigo-600 font-mono font-bold bg-indigo-50 px-2 py-0.5 rounded">
              Você pode reordenar ↓↑
            </span>
          )}
        </div>

        {/* List of episodes */}
        {allItems.length === 0 ? (
          <div className="bg-white/75 border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-500 space-y-2">
            <span className="text-2xl block">🥞</span>
            <p className="text-xs font-bold font-sans">Série vazia no momento</p>
            <p className="text-[10px] text-slate-400 max-w-[80%] mx-auto leading-normal">
              Para ver episódios aqui, publique um novo Gramp ou Clip e selecione esta série ao criar!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {allItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-4xs text-left hover:border-slate-200 transition-all flex items-center justify-between gap-3 group relative overflow-hidden"
              >
                {/* Visual Accent for chapter */}
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />

                <div 
                  onClick={() => setSelectedReviewItem(item)}
                  className="flex-grow min-w-0 flex gap-3 cursor-pointer"
                >
                  {/* Small circle block with index numbers */}
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex-shrink-0 flex flex-col items-center justify-center font-display leading-none select-none">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">Cap</span>
                    <span className="text-sm font-extrabold">{index + 1}</span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors truncate">
                      {item.title || "Sem título"}
                    </h4>
                    <p className="text-[10.5px] text-slate-450 line-clamp-1">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-2.5 text-[9px] text-slate-400 font-mono">
                      <span className="uppercase text-indigo-600 font-bold tracking-wide">{item.type}</span>
                      <span>•</span>
                      <span>❤ {item.likes} curtidas</span>
                    </div>
                  </div>
                </div>

                {/* Reorder and View Actions */}
                <div className="flex items-center gap-1 z-10">
                  {isOwner ? (
                    <div className="flex flex-col gap-0.5">
                      <button
                        title="Mover para cima"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className={`p-1 rounded-md hover:bg-slate-100 cursor-pointer ${index === 0 ? "text-slate-200 cursor-not-allowed" : "text-slate-500"}`}
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Mover para baixo"
                        disabled={index === allItems.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className={`p-1 rounded-md hover:bg-slate-100 cursor-pointer ${index === allItems.length - 1 ? "text-slate-200 cursor-not-allowed" : "text-slate-500"}`}
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedReviewItem(item)}
                      className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600 transition-all active:scale-90 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded item details modal view to simulate sequential chapter consumption */}
      <AnimatePresence>
        {selectedReviewItem && (
          <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedReviewItem(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                ✕
              </button>

              {/* Title Header */}
              <div className="space-y-1 pr-6">
                <span className="text-[9px] font-black tracking-widest text-indigo-600 block uppercase font-mono bg-indigo-50 rounded-md px-2 py-0.5 self-start w-fit">
                  🧵 Capítulo {selectedReviewItem.chapter} de "{series.title}"
                </span>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                  Publicado por @{selectedReviewItem.authorNickname}
                </p>
              </div>

              {/* Cover Art or Imagery inside Chapter */}
              {selectedReviewItem.image && (
                <div className="rounded-2xl overflow-hidden bg-slate-100 max-h-48 border border-slate-50 relative">
                  <img src={selectedReviewItem.image} alt="Publicado na série" className="w-full h-full object-cover" />
                </div>
              )}

              {/* If it was a clip video placeholder */}
              {selectedReviewItem.videoPlaceholder && (
                <div className="rounded-2xl h-44 bg-gradient-to-tr from-purple-900 to-indigo-950 flex flex-col justify-center items-center text-white border relative">
                  <span className="text-2xl animate-pulse">🍿🎞</span>
                  <span className="text-[10px] mt-2 font-mono text-indigo-200">Reproduzindo Clipes no Wolly Series</span>
                  {selectedReviewItem.videoTrimStart !== undefined && (
                    <span className="text-[8px] mt-1 text-slate-350 bg-black/45 px-2 py-0.5 rounded font-mono">
                      Corte: {selectedReviewItem.videoTrimStart}s - {selectedReviewItem.videoTrimEnd}s
                    </span>
                  )}
                </div>
              )}

              {/* Text content */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedReviewItem.content}
                </p>
              </div>

              {/* Chapter navigation footer (Previous, Next) */}
              <div className="flex items-center justify-between pt-1 font-sans">
                {(() => {
                  const currIdx = allItems.findIndex(i => i.id === selectedReviewItem.id);
                  const hasPrev = currIdx > 0;
                  const hasNext = currIdx < allItems.length - 1;

                  return (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        disabled={!hasPrev}
                        onClick={() => setSelectedReviewItem(allItems[currIdx - 1])}
                        className="py-2 px-3 text-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        ← Anterior
                      </button>
                      <button
                        disabled={!hasNext}
                        onClick={() => setSelectedReviewItem(allItems[currIdx + 1])}
                        className="py-2 px-3 text-center rounded-xl bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Próximo →
                      </button>
                    </div>
                  );
                })()}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
