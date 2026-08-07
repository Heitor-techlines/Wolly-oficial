/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Send, Search, MessageSquare, ArrowLeft, Trash2, Sparkles, Check, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, DirectMessage } from "../types";
import UserAvatar from "./UserAvatar";
import { db, auth, cleanUndefined } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";

interface MessagesViewProps {
  activeProfile: Profile;
  profiles: Profile[];
  onAddRealNotification: (message: string, type: string) => void;
  posts?: any[];
  onViewPost?: (post: any) => void;
}

export default function MessagesView({
  activeProfile,
  profiles,
  onAddRealNotification,
  posts = [],
  onViewPost
}: MessagesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activePartner, setActivePartner] = useState<Profile | null>(null);
  const [allMessages, setAllMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter out the active profile from the list of available profiles to chat with
  const otherProfiles = profiles.filter((p) => p.id !== activeProfile.id);

  // Filter other profiles based on the search term
  const filteredProfiles = otherProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sync direct messages from Firestore in real time
  useEffect(() => {
    const messagesCollection = collection(db, "direct_messages");
    const unsub = onSnapshot(
      messagesCollection,
      (snapshot) => {
        const loaded: DirectMessage[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() } as DirectMessage);
        });

        // Sort messages chronologically
        loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setAllMessages(loaded);

        // Seed a welcome message if the collection is completely empty and "Ana Maria" exists
        if (loaded.length === 0) {
          const ana = profiles.find((p) => p.id === "ana" || p.name.includes("Ana"));
          if (ana) {
            const seedId = "seed_welcome_msg";
            const seedMsg: Omit<DirectMessage, "id"> = {
              senderId: ana.id,
              receiverId: activeProfile.id,
              senderName: ana.name,
              senderNickname: ana.nickname,
              senderAvatar: ana.avatar,
              senderAvatarBg: ana.avatarBg,
              text: `Olá! Seja muito bem-vindo ao Wolly! 🌱 Que maravilhoso te ver por aqui conversando sem algoritmos, sem anúncios e com total controle dos seus dados. Como posso te apoiar hoje? 🎨✨`,
              createdAt: new Date().toISOString()
            };
            addDoc(collection(db, "direct_messages"), cleanUndefined(seedMsg)).catch(err => {
              console.error("Erro ao semear mensagem de boas-vindas:", err);
            });
          }
        }
      },
      (error) => {
        console.error("Erro ao sincronizar mensagens:", error);
      }
    );

    return () => unsub();
  }, [profiles, activeProfile.id]);

  // Scroll to bottom whenever active partner or message length changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activePartner, allMessages]);

  // Filter messages for the current conversation pair
  const conversationMessages = allMessages.filter(
    (msg) =>
      (msg.senderId === activeProfile.id && msg.receiverId === activePartner?.id) ||
      (msg.senderId === activePartner?.id && msg.receiverId === activeProfile.id)
  );

  // Send a message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activePartner) return;

    setIsSending(true);
    try {
      const newMsg: Omit<DirectMessage, "id"> = {
        senderId: activeProfile.id,
        receiverId: activePartner.id,
        senderName: activeProfile.name,
        senderNickname: activeProfile.nickname,
        senderAvatar: activeProfile.avatar,
        senderAvatarBg: activeProfile.avatarBg,
        text: text,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "direct_messages"), cleanUndefined(newMsg));
      setInputText("");
      onAddRealNotification(`Mensagem enviada para ${activePartner.name}! ✉️`, "chat");
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      alert("Não foi possível enviar a mensagem. Verifique sua conexão.");
    } finally {
      setIsSending(false);
    }
  };

  // Quick reply pills for interactive usage in the iFrame preview
  const quickReplies = [
    "Olá! Como vai?",
    "Adorei seu perfil!",
    "Wolly é incrível! 🚀",
    "Estou testando as mensagens!"
  ];

  // Helper to format iso strings to localized hour minutes
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "00:00";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans flex flex-col max-w-md mx-auto relative border-x border-slate-100">
      <AnimatePresence mode="wait">
        {!activePartner ? (
          // 1. LIST OF CONVERSATIONS SCREEN
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-grow flex flex-col p-4 space-y-4"
          >
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-slate-150 pb-2.5 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h2 className="font-display font-black text-slate-900 text-lg">Mensagens</h2>
              </div>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Soberania Local
              </span>
            </div>

            {/* Subtitle intro */}
            <p className="text-xs text-slate-500 leading-relaxed">
              Converse diretamente com qualquer perfil de forma criptografada na memória descentralizada do Wolly. Sem algoritmos interferindo nas suas palavras.
            </p>

            {/* Profile search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar perfis..."
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
              />
            </div>

            {/* Conversation List */}
            <div className="flex-grow space-y-2">
              <label className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 font-mono">
                Canais Disponíveis
              </label>

              {filteredProfiles.length === 0 ? (
                <div className="bg-white border rounded-2xl p-8 text-center space-y-2 shadow-3xs">
                  <span className="text-2xl block">🔍</span>
                  <p className="text-xs text-slate-500 font-semibold">Nenhum perfil encontrado</p>
                  <p className="text-[10px] text-slate-400">Tente buscar por outro nome de usuário ou crie uma nova identidade no Perfil.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProfiles.map((p) => {
                    // Check last message between activeProfile and this profile
                    const relativeMsgs = allMessages.filter(
                      (m) =>
                        (m.senderId === activeProfile.id && m.receiverId === p.id) ||
                        (m.senderId === p.id && m.receiverId === activeProfile.id)
                    );
                    const lastMsg = relativeMsgs[relativeMsgs.length - 1];

                    return (
                      <button
                        key={p.id}
                        onClick={() => setActivePartner(p)}
                        className="w-full bg-white border border-slate-200 hover:border-indigo-300 p-3.5 rounded-2xl flex items-center gap-3 text-left transition-all hover:translate-x-1 shadow-3xs cursor-pointer group"
                      >
                        {/* Avatar */}
                        <UserAvatar
                          avatar={p.avatar}
                          name={p.name}
                          className="w-11 h-11 border border-slate-100"
                          bgClassName={p.avatarBg || "bg-indigo-600"}
                          textClassName="text-lg font-black text-white"
                        />

                        {/* Middle Text Details */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 text-xs truncate group-hover:text-indigo-600 transition-colors">
                              {p.name}
                            </h4>
                            {lastMsg && (
                              <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                                {formatTime(lastMsg.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                            {p.nickname}
                          </p>
                          {lastMsg ? (
                            <p className="text-xs text-slate-500 truncate mt-1 italic font-sans flex items-center gap-1">
                              {lastMsg.senderId === activeProfile.id && (
                                <span className="text-emerald-500 shrink-0">✓</span>
                              )}
                              <span>{lastMsg.text}</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-indigo-400 font-bold mt-1.5 flex items-center gap-1">
                              <span className="animate-pulse">✨</span> Toque para iniciar chat
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          // 2. ACTIVE CONVERSATION SCREEN (CHATROOM)
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-grow flex flex-col h-[calc(100vh-64px)]"
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between sticky top-0 z-10 shadow-3xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setActivePartner(null)}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4.5 h-4.5" />
                </button>

                {/* Contact details */}
                <UserAvatar
                  avatar={activePartner.avatar}
                  name={activePartner.name}
                  className="w-9 h-9"
                  bgClassName={activePartner.avatarBg || "bg-indigo-600"}
                  textClassName="text-sm font-black text-white"
                />

                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-800 text-xs truncate leading-tight">
                    {activePartner.name}
                  </h4>
                  <span className="text-[9px] text-emerald-500 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    Ativo na rede
                  </span>
                </div>
              </div>

              {/* Status Info Tag */}
              <div className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-lg font-mono">
                P2P Simulado
              </div>
            </div>

            {/* Messages Log area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50 flex flex-col">
              {conversationMessages.length === 0 ? (
                <div className="my-auto text-center space-y-2 py-10 max-w-xs mx-auto">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-xl">
                    👋
                  </div>
                  <h5 className="font-bold text-slate-700 text-xs">Mande um Olá!</h5>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Nenhuma mensagem registrada ainda. Digite sua primeira palavra na soberania de sua rede descentralizada.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {conversationMessages.map((msg) => {
                    const isSelf = msg.senderId === activeProfile.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                      >
                        {/* Bubble Container */}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-sans shadow-3xs relative ${
                            isSelf
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
                            {msg.text}
                          </p>

                          {/* Shared Post Card embedded in DM */}
                          {msg.sharedPostData && (
                            <div
                              onClick={() => {
                                const found = posts.find((p: any) => p.id === msg.sharedPostData?.id);
                                if (found && onViewPost) {
                                  onViewPost(found);
                                } else if (onViewPost && msg.sharedPostData) {
                                  onViewPost({
                                    id: msg.sharedPostData.id,
                                    profileId: "",
                                    authorName: msg.sharedPostData.authorName,
                                    authorNickname: msg.sharedPostData.authorNickname,
                                    authorAvatar: msg.sharedPostData.authorName[0],
                                    authorAvatarBg: "bg-indigo-600",
                                    content: msg.sharedPostData.content,
                                    image: msg.sharedPostData.image,
                                    hashtags: [],
                                    createdAt: new Date().toISOString(),
                                    likes: 0,
                                    likedBy: [],
                                    disclosedWhyVisible: "Compartilhado via mensagem direta",
                                    isPulse: msg.sharedPostData.isPulse
                                  });
                                }
                              }}
                              className={`mt-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] ${
                                isSelf
                                  ? "bg-indigo-700/80 border-indigo-400/50 text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold opacity-80">
                                <span>📌 Publicação Compartilhada</span>
                              </div>
                              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                                <span>@{msg.sharedPostData.authorName}</span>
                                <span className="text-[10px] opacity-70 font-mono font-normal">{msg.sharedPostData.authorNickname}</span>
                              </div>
                              <p className="text-xs line-clamp-2 italic mb-1.5">
                                "{msg.sharedPostData.content}"
                              </p>
                              {msg.sharedPostData.image && (
                                <div className="rounded-lg overflow-hidden max-h-28 mb-1.5 border border-black/10">
                                  <img src={msg.sharedPostData.image} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              )}
                              <div className={`text-[10px] font-bold py-1 px-2 rounded-lg text-center ${isSelf ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'}`}>
                                👁️ Ver Publicação Completa
                              </div>
                            </div>
                          )}

                          {/* Shared Clip Card embedded in DM */}
                          {msg.sharedClipData && (
                            <div
                              className={`mt-2 p-2.5 rounded-xl border text-left transition-all ${
                                isSelf
                                  ? "bg-indigo-900/80 border-indigo-400/50 text-white"
                                  : "bg-slate-900 border-slate-700 text-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-indigo-300">
                                <span>🎬 Clipe do Wolly Compartilhado</span>
                              </div>
                              <div className="flex items-center gap-1.5 font-bold text-xs mb-1 text-white">
                                <span>@{msg.sharedClipData.authorName}</span>
                              </div>
                              <p className="text-xs line-clamp-2 italic mb-2 text-slate-200">
                                "{msg.sharedClipData.description}"
                              </p>
                              {msg.sharedClipData.videoUrl && (
                                <div className="rounded-xl overflow-hidden mb-2 border border-white/10 bg-black aspect-video relative flex items-center justify-center">
                                  <video 
                                    src={msg.sharedClipData.videoUrl} 
                                    className="w-full h-full object-cover" 
                                    controls={false}
                                    muted
                                    playsInline
                                  />
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg">
                                      ▶
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="text-[10px] font-bold py-1 px-2 rounded-lg text-center bg-indigo-600 text-white shadow-xs">
                                🎥 Assistir no Wolly Clips
                              </div>
                            </div>
                          )}

                          {/* Footer Details */}
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-mono leading-none ${
                            isSelf ? "text-indigo-200" : "text-slate-400"
                          }`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isSelf && (
                              <span className="text-emerald-300">
                                <CheckCheck className="w-3 h-3 inline-block" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Suggestions & Input Bottom Area */}
            <div className="bg-white border-t border-slate-200 p-3 space-y-2.5 shrink-0 shadow-sm sticky bottom-0">
              {/* Quick Reply Pills */}
              {conversationMessages.length === 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => handleSendMessage(qr)}
                      className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-xl transition-all border border-indigo-100 cursor-pointer active:scale-95"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Composer Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escreva sua mensagem livre..."
                  disabled={isSending}
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
