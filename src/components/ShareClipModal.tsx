/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { X, Send, Link, Check, Search, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Clip, Profile } from "../types";
import UserAvatar from "./UserAvatar";
import { db, cleanUndefined } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface ShareClipModalProps {
  clip: Clip | null;
  activeProfile: Profile;
  profiles: Profile[];
  onClose: () => void;
  onShareClipCount: (clipId: string) => void;
  onAddRealNotification: (message: string, type: string) => void;
}

export default function ShareClipModal({
  clip,
  activeProfile,
  profiles,
  onClose,
  onShareClipCount,
  onAddRealNotification,
}: ShareClipModalProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [customComment, setCustomComment] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  if (!clip) return null;

  // Available profiles to send DM to (excluding self)
  const availableProfiles = profiles.filter((p) => p.id !== activeProfile.id);
  const filteredProfiles = availableProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nickname && p.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedRecipient = profiles.find((p) => p.id === selectedRecipientId);

  // Copy public link
  const handleCopyLink = () => {
    const cleanId = clip.id.replace("clip_", "");
    const linkUrl = `wolly.techl.com.br/clips/${cleanId}`;

    navigator.clipboard.writeText(linkUrl).catch(() => {});
    setCopiedLink(true);
    onShareClipCount(clip.id);
    onAddRealNotification("Link público do Clipe copiado! 🔒", "share");

    setTimeout(() => {
      setCopiedLink(false);
      onClose();
    }, 1200);
  };

  // Send Clip via Direct Message Chat with custom comment
  const handleSendToChat = async () => {
    if (!selectedRecipient) return;

    setIsSending(true);
    try {
      const defaultComment = `Olha esse clipe incrível no Wolly feito por @${clip.authorName}! 🎬`;
      const msgText = customComment.trim() ? `${customComment.trim()}\n\n🎬 ${clip.description || 'Clipe'}` : defaultComment;

      const directMsg = {
        senderId: activeProfile.id,
        receiverId: selectedRecipient.id,
        senderName: activeProfile.name,
        senderNickname: activeProfile.nickname || `@${activeProfile.name.split(" ")[0].toLowerCase()}`,
        senderAvatar: activeProfile.avatar,
        senderAvatarBg: activeProfile.avatarBg,
        text: msgText,
        sharedClipData: {
          id: clip.id,
          authorName: clip.authorName,
          description: clip.description,
          videoUrl: clip.videoUrl,
        },
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "direct_messages"), cleanUndefined(directMsg));

      onShareClipCount(clip.id);
      onAddRealNotification(`Clipe compartilhado com ${selectedRecipient.name} no chat! ✉️`, "chat");
      setSentSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Erro ao compartilhar clipe via chat:", err);
      onAddRealNotification("Não foi possível enviar a mensagem. Tente novamente.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      id="share-clip-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden text-white shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Compartilhar Clipe no Chat</h3>
              <p className="text-[10px] text-slate-400">Escolha um amigo e inclua um comentário</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clip Preview Box */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden relative shrink-0 flex items-center justify-center">
            {clip.videoUrl ? (
              <video src={clip.videoUrl} className="w-full h-full object-cover" muted />
            ) : (
              <span className="text-xl">🎬</span>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="text-white text-xs">▶</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-indigo-400 block">@{clip.authorName}</span>
            <p className="text-xs text-slate-200 line-clamp-1 font-medium">{clip.description}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 no-scrollbar">
          
          {/* Custom Comment Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">
              💬 Seu comentário ao enviar:
            </label>
            <textarea
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              placeholder="Escreva algo sobre este clipe para enviar no chat..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Select Recipient Chat */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 block">
              ✉️ Enviar no Chat com:
            </label>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar contatos..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* List of contacts */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {filteredProfiles.length === 0 ? (
                <p className="text-center py-4 text-xs text-slate-500">Nenhum perfil encontrado.</p>
              ) : (
                filteredProfiles.map((p) => {
                  const isSelected = selectedRecipientId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedRecipientId(p.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          avatar={p.avatar}
                          name={p.name}
                          className="w-7 h-7"
                          bgClassName={p.avatarBg || "bg-indigo-600"}
                          textClassName="text-[10px] font-bold text-white"
                        />
                        <div>
                          <p className="text-xs font-bold leading-tight">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.nickname}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "bg-indigo-500 border-indigo-400 text-white"
                            : "border-slate-700"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
          {/* Copy Link button */}
          <button
            onClick={handleCopyLink}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link className="w-4 h-4" />}
            <span>{copiedLink ? "Link Copiado!" : "Copiar Link"}</span>
          </button>

          {/* Send DM button */}
          <button
            onClick={handleSendToChat}
            disabled={!selectedRecipientId || isSending || sentSuccess}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <span className="animate-spin text-sm">⌛</span>
            ) : sentSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{sentSuccess ? "Enviado!" : "Enviar no Chat"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
