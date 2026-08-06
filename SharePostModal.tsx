/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { X, Send, Link, Check, Search, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Post, Profile } from "../types";
import UserAvatar from "./UserAvatar";
import { db, cleanUndefined } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface SharePostModalProps {
  post: Post | null;
  activeProfile: Profile;
  profiles: Profile[];
  onClose: () => void;
  onSharePostCount: (postId: string) => void;
  onAddRealNotification: (message: string, type: string) => void;
  onNavigateToMessages?: (recipientProfile: Profile) => void;
}

export default function SharePostModal({
  post,
  activeProfile,
  profiles,
  onClose,
  onSharePostCount,
  onAddRealNotification,
  onNavigateToMessages,
}: SharePostModalProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [customText, setCustomText] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  if (!post) return null;

  // Available profiles to send DM to (excluding self)
  const availableProfiles = profiles.filter((p) => p.id !== activeProfile.id);
  const filteredProfiles = availableProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRecipient = profiles.find((p) => p.id === selectedRecipientId);

  // Copy public secure link
  const handleCopyLink = () => {
    const postType = post.isPulse ? "pulses" : "gramps";
    const cleanId = post.id.replace("post_", "");
    const linkUrl = `wolly.techl.com.br/${postType}/${cleanId}`;

    navigator.clipboard.writeText(linkUrl).catch(() => {});
    setCopiedLink(true);
    onSharePostCount(post.id);
    onAddRealNotification("Link seguro da publicação copiado para a área de transferência! 🔒", "share");

    setTimeout(() => {
      setCopiedLink(false);
      onClose();
    }, 1200);
  };

  // Send post via Direct Message
  const handleSendDM = async () => {
    if (!selectedRecipient) return;

    setIsSending(true);
    try {
      const msgText = customText.trim() || `Olha essa publicação do Wolly feita por @${post.authorName}!`;

      const directMsg = {
        senderId: activeProfile.id,
        receiverId: selectedRecipient.id,
        senderName: activeProfile.name,
        senderNickname: activeProfile.nickname,
        senderAvatar: activeProfile.avatar,
        senderAvatarBg: activeProfile.avatarBg,
        text: msgText,
        sharedPostData: {
          id: post.id,
          authorName: post.authorName,
          authorNickname: post.authorNickname,
          content: post.content,
          image: post.image,
          isPulse: post.isPulse,
        },
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "direct_messages"), cleanUndefined(directMsg));

      onSharePostCount(post.id);
      onAddRealNotification(`Publicação compartilhada com ${selectedRecipient.name} nas mensagens do Wolly! ✉️`, "chat");
      setSentSuccess(true);
    } catch (err) {
      console.error("Erro ao compartilhar post via mensagem:", err);
      onAddRealNotification("Não foi possível enviar a mensagem. Tente novamente.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      id="share-post-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-5 w-full max-w-sm border border-slate-100 shadow-2xl relative space-y-4 text-left max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-shrink-0">
          <span className="font-display font-black text-sm text-slate-900 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span>Compartilhar Publicação</span>
          </span>
          <button
            onClick={onClose}
            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-6 text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
              ✓
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Publicação Compartilhada!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Sua mensagem com a publicação foi enviada para <strong className="text-slate-800">{selectedRecipient?.name}</strong>.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              {onNavigateToMessages && selectedRecipient && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToMessages(selectedRecipient);
                    onClose();
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ir para Conversa em Mensagens</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Post Preview Card */}
        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserAvatar
              avatar={post.authorAvatar}
              name={post.authorName}
              className="w-6 h-6"
              bgClassName={post.authorAvatarBg || "bg-indigo-600"}
              textClassName="text-[10px] font-bold text-white"
            />
            <span className="text-xs font-bold text-slate-800">{post.authorName}</span>
            <span className="text-[10px] font-mono text-slate-400">{post.authorNickname}</span>
          </div>
          <p className="text-xs text-slate-600 line-clamp-2 italic font-sans">
            "{post.content}"
          </p>
        </div>

        {/* Action 1: Direct Message Sharing Section */}
        <div className="space-y-2 flex-grow overflow-y-auto no-scrollbar min-h-[160px] pr-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            ✉️ Enviar Mensagem no Wolly
          </label>

          {/* Recipient Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar amigo no Wolly..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          {/* List of profiles to pick */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {filteredProfiles.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2 text-center">
                Nenhum usuário encontrado
              </p>
            ) : (
              filteredProfiles.map((p) => {
                const isSelected = selectedRecipientId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedRecipientId(isSelected ? "" : p.id)}
                    className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500"
                        : "bg-white border-slate-150 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        avatar={p.avatar}
                        name={p.name}
                        className="w-7 h-7"
                        bgClassName={p.avatarBg || "bg-indigo-600"}
                        textClassName="text-xs font-bold text-white"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 truncate">
                          {p.name}
                        </span>
                        <span className="block text-[9px] font-mono text-slate-400 leading-none">
                          {p.nickname}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-indigo-600 font-bold text-xs bg-indigo-100 rounded-full p-1">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Optional Message input if recipient is selected */}
          {selectedRecipientId && (
            <div className="pt-2 space-y-2 animate-fade-in">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Escreva um recado junto (opcional)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
              <button
                type="button"
                onClick={handleSendDM}
                disabled={isSending}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar para {selectedRecipient?.name.split(" ")[0]}</span>
              </button>
            </div>
          )}
        </div>

        {/* Action 2: Copy Link */}
        <div className="pt-2 border-t border-slate-100 flex-shrink-0 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            🔗 Ou Copiar Link Direto
          </label>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Link Copiado! 🔒</span>
              </>
            ) : (
              <>
                <Link className="w-4 h-4 text-slate-600" />
                <span>Copiar Link Seguro</span>
              </>
            )}
          </button>
        </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
