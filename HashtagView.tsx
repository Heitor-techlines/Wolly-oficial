/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { 
  ArrowLeft, Tag, Heart, MessageSquare, Share2, Sparkles, Sliders, Search, Compass, Eye, TrendingUp, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Post, Profile } from "../types";
import UserAvatar from "./UserAvatar";
import SharePostModal from "./SharePostModal";
import LineNewsModal from "./LineNewsModal";
import { extractNewsTopic, buildLineNewsUrl } from "../lib/newsUtils";

interface HashtagViewProps {
  hashtag: string;
  posts: Post[];
  profiles: Profile[];
  activeProfile: Profile;
  onBack: () => void;
  onLikePost: (postId: string) => void;
  onAddCommentToPost: (postId: string, text: string) => void;
  onSharePost: (postId: string) => void;
  onVisitProfile: (profileId: string) => void;
  onAskLine123ToSummarize?: (content: string, type: string) => void;
  onSelectHashtag?: (hashtag: string) => void;
}

export default function HashtagView({
  hashtag,
  posts,
  profiles,
  activeProfile,
  onBack,
  onLikePost,
  onAddCommentToPost,
  onSharePost,
  onVisitProfile,
  onAskLine123ToSummarize,
  onSelectHashtag
}: HashtagViewProps) {
  const [hashtagSearchInput, setHashtagSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "pulses" | "gramps">("todos");
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [lineNewsModalPost, setLineNewsModalPost] = useState<Post | null>(null);

  const handleOpenLineNews = (post: Post) => {
    const topic = post.newsTopic || extractNewsTopic(post.content, post.hashtags);
    const targetUrl = buildLineNewsUrl(topic);
    try {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.warn("Popup blocked, opening reader:", e);
    }
    setLineNewsModalPost(post);
  };
  
  // Normalize active hashtag
  const activeTag = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;
  
  // Find all posts containing this hashtag
  const filteredPosts = posts.filter(post => {
    if (!post.hashtags) return false;
    const matchesTag = post.hashtags.some(tag => tag.toLowerCase() === activeTag.toLowerCase());
    
    if (!matchesTag) return false;
    
    if (activeTab === "pulses") return post.isPulse === true;
    if (activeTab === "gramps") return !post.isPulse;
    return true;
  });

  // Calculate some stats for this hashtag
  const totalLikes = filteredPosts.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalComments = filteredPosts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
  
  // Find other popular hashtags in the system for discovery
  const allTagsWithCounts: { [key: string]: number } = {};
  posts.forEach(p => {
    if (p.hashtags) {
      p.hashtags.forEach(tag => {
        const norm = tag.startsWith("#") ? tag : `#${tag}`;
        allTagsWithCounts[norm] = (allTagsWithCounts[norm] || 0) + 1;
      });
    }
  });
  
  const popularTags = Object.entries(allTagsWithCounts)
    .filter(([tag]) => tag.toLowerCase() !== activeTag.toLowerCase())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  // States for comment expand per post
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentSubmit = (e: FormEvent, postId: string) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;
    onAddCommentToPost(postId, commentText);
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = hashtagSearchInput.trim();
    if (!cleaned) return;
    const formatted = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
    onSelectHashtag?.(formatted);
    setHashtagSearchInput("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 text-left font-sans animate-fade-in">
      {/* Elegant Header with Back Button */}
      <div className="bg-white/85 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="hashtag-btn-back"
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Voltar ao Wolly"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <span className="text-[10px] text-indigo-600 font-bold tracking-widest uppercase block font-mono">Espaço de Descoberta</span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.2">
              <Tag className="w-4.5 h-4.5 text-indigo-500" />
              <span>{activeTag}</span>
            </h2>
          </div>
        </div>

        {/* Dynamic Badge */}
        <div className="bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 text-[11px] font-black font-mono">
          {filteredPosts.length} {filteredPosts.length === 1 ? "Publicação" : "Publicações"}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Hashtag Dashboard Info Card */}
        <div className="bg-gradient-to-r from-indigo-550 via-indigo-600 to-purple-650 rounded-3xl p-5 text-white shadow-md relative overflow-hidden border border-indigo-500/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />
          
          <div className="relative space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/20 rounded-xl text-lg">✨</span>
              <div>
                <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider font-mono">Métrica de Engajamento</p>
                <h3 className="text-sm font-bold">Resumo Geral de {activeTag}</h3>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center border-t border-white/15">
              <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                <span className="text-[10px] text-indigo-200 font-semibold block">Posts</span>
                <span className="text-sm font-black font-mono mt-0.5 block">{filteredPosts.length}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                <span className="text-[10px] text-indigo-200 font-semibold block">Corações</span>
                <span className="text-sm font-black font-mono mt-0.5 block">{totalLikes}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                <span className="text-[10px] text-indigo-200 font-semibold block">Comentários</span>
                <span className="text-sm font-black font-mono mt-0.5 block">{totalComments}</span>
              </div>
            </div>

            {/* AI Callout */}
            {onAskLine123ToSummarize && filteredPosts.length > 0 && (
              <button
                id="hashtag-btn-summarize-all"
                onClick={() => {
                  const combinedContent = filteredPosts.map(p => `${p.authorName || 'Autor'}: ${p.content}`).join("\n\n");
                  onAskLine123ToSummarize(combinedContent, `Compilado da Hashtag ${activeTag}`);
                }}
                className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-[11px] py-2 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-indigo-900/10 active:scale-98 cursor-pointer"
              >
                <span>🤖</span> Resumir publicações com Line 123
              </button>
            )}
          </div>
        </div>

        {/* Discovery & Search Section */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-3xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              id="hashtag-search-input"
              type="text"
              placeholder="Buscar outra #hashtag..."
              value={hashtagSearchInput}
              onChange={(e) => setHashtagSearchInput(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-150 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-550/10 focus:border-indigo-550 transition-all text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.2 pointer-events-none" />
          </form>

          {/* Quick Popular Tags Suggestions */}
          {popularTags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hashtags Populares do Wolly</span>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => onSelectHashtag?.(tag)}
                    className="text-[10.5px] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-bold border border-slate-150 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs selector */}
        <div className="flex bg-slate-100 rounded-2xl p-1 shadow-3xs border border-slate-150">
          {(["todos", "pulses", "gramps"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab === "todos" ? "Tudo" : tab === "pulses" ? "⚡ Pulses" : "🖼️ Gramps"}
            </button>
          ))}
        </div>

        {/* Posts Content List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-150 shadow-3xs space-y-3">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-lg mx-auto border border-slate-100">
                📭
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Nenhuma postagem encontrada</p>
                <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto">
                  Não há publicações registradas com o filtro de {activeTab === "todos" ? "tudo" : activeTab} sob a hashtag {activeTag}.
                </p>
              </div>
            </div>
          ) : (
            filteredPosts.map(post => {
              const creator = profiles.find(p => p.id === post.profileId);
              const avatarBg = creator?.avatarBg || "bg-gradient-to-r from-indigo-500 to-purple-500";
              const isPulse = post.isPulse === true;

              return (
                <div 
                  key={post.id} 
                  id={`hashtag-post-card-${post.id}`}
                  className="bg-white rounded-3xl border border-slate-150 shadow-3xs overflow-hidden flex flex-col transition-all hover:border-slate-300"
                >
                  {/* Top Creator Header */}
                  <div className="p-3.5 flex items-center justify-between border-b border-slate-100">
                    <div 
                      onClick={() => onVisitProfile(post.profileId)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <UserAvatar
                        avatar={creator?.avatar || post.authorAvatar}
                        name={post.authorName || creator?.name}
                        className="w-9 h-9 group-hover:scale-105 transition-transform"
                        bgClassName={avatarBg || "bg-indigo-600"}
                      />
                      <div className="text-left min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 leading-tight truncate group-hover:text-indigo-600 transition-colors">
                          {post.authorName || creator?.name}
                        </h4>
                        <span className="text-[9px] font-mono font-bold text-slate-400">
                          {creator?.nickname || "@anonimo"}
                        </span>
                      </div>
                    </div>

                    {isPulse && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                        ⚡ Pulse
                      </span>
                    )}
                  </div>

                  {/* Post Image (if available) */}
                  {post.image && (
                    <div className="relative aspect-square max-h-[300px] w-full bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                      <img
                        referrerPolicy="no-referrer"
                        src={post.image}
                        alt="Conteúdo da hashtag"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Post Body content */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium font-sans">
                      {post.content}
                    </p>

                    {/* Hashtags Inline */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.hashtags.map(t => {
                          const isCurrent = t.toLowerCase() === activeTag.toLowerCase();
                          return (
                            <button
                              key={t}
                              onClick={() => onSelectHashtag?.(t)}
                              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                                isCurrent
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Line News Integration Button */}
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

                    {/* Quick Post Actions (Like, Comments button, Share, AI summarize button) */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex gap-2">
                        {/* Like */}
                        <button
                          onClick={() => onLikePost(post.id)}
                          className={`flex items-center gap-1 text-xs font-bold py-1.5 px-2.5 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                            (Array.isArray(post.likedBy) && post.likedBy.some(uid => (profiles || []).some(p => p.id === uid)))
                              ? "bg-rose-50 border-rose-100 text-rose-700"
                              : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${
                            (Array.isArray(post.likedBy) && post.likedBy.some(uid => (profiles || []).some(p => p.id === uid)))
                              ? "fill-rose-700 text-rose-700"
                              : "text-slate-400"
                          }`} />
                          <span className="font-mono text-[10px]">{post.likes || 0}</span>
                        </button>

                        {/* Comment section toggle */}
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-150 transition-all hover:scale-105 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="font-mono text-[10px]">
                            {post.comments?.length || 0}
                          </span>
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => setSharingPost(post)}
                          className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-150 transition-all hover:scale-105 cursor-pointer"
                          title="Compartilhar"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* AI Summarize this specific post */}
                      {onAskLine123ToSummarize && (
                        <button
                          onClick={() => onAskLine123ToSummarize(post.content, isPulse ? "Pulse" : "Gramp")}
                          className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10.5px] font-bold py-1.5 px-2.5 rounded-lg border border-indigo-150 transition-all hover:scale-105 cursor-pointer"
                          title="Resumir com Line 123"
                        >
                          <span>🤖 Resumir</span>
                        </button>
                      )}
                    </div>

                    {/* Expanded comments section */}
                    {expandedComments[post.id] && (
                      <div className="mt-3 bg-slate-50 rounded-2xl p-3 border border-slate-150 space-y-3">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Comentários</span>
                        
                        {/* List */}
                        {post.comments && post.comments.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {post.comments.map((comment, index) => (
                              <div key={index} className="text-left bg-white p-2 rounded-xl border border-slate-100 text-[11px] leading-relaxed">
                                <span className="font-bold text-slate-800 mr-1">{comment.authorName}</span>
                                <span className="text-slate-600">{comment.text}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic text-center py-1">Sem comentários ainda. Seja o primeiro!</p>
                        )}

                        {/* Input form */}
                        <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <input
                            type="text"
                            placeholder="Comente algo..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            className="flex-grow bg-white border border-slate-150 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!commentInputs[post.id]?.trim()}
                            className="bg-indigo-600 disabled:bg-slate-200 text-white disabled:text-slate-400 px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer"
                          >
                            Enviar
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Share Post Modal */}
      <AnimatePresence>
        {sharingPost && (
          <SharePostModal
            post={sharingPost}
            activeProfile={activeProfile}
            profiles={profiles}
            onClose={() => setSharingPost(null)}
            onSharePostCount={onSharePost}
            onAddRealNotification={() => {}}
          />
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
