/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  ArrowLeft, Users, Plus, Code, MessageSquare, Copy, Check, LogOut, 
  Send, Sparkles, CreditCard, Code2, Terminal, Info, ShieldAlert, Key, Zap, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, doc, setDoc, updateDoc, arrayUnion, arrayRemove, 
  onSnapshot, getDocs, query, where, getDoc, addDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, cleanUndefined } from "../lib/firebase";
import { Profile, Group, GroupMessage } from "../types";
import UserAvatar from "./UserAvatar";

interface GroupsViewProps {
  activeProfile: Profile;
  onBack: () => void;
  onUpdateCrowns?: (newCrowns: number) => void;
}

export default function GroupsView({ activeProfile, onBack, onUpdateCrowns }: GroupsViewProps) {
  const [activeTab, setActiveTab] = useState<"lobby" | "group">("lobby");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  
  // Lobby states
  const [groupCodeInput, setGroupCodeInput] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [lobbyError, setLobbyError] = useState("");
  const [lobbySuccess, setLobbySuccess] = useState("");

  // In-Group states
  const [groupTab, setGroupTab] = useState<"chat" | "code">("chat");
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedGroupCode, setCopiedGroupCode] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);

  // Payments / No-CNPJ informational & interactive mock modal
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [pixKey, setPixKey] = useState("wolly.pay@wolly.com.br");
  const [pixAmount, setPixAmount] = useState("15.00");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "generating" | "qrcode" | "confirmed">("idle");
  const [paymentLog, setPaymentLog] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch groups that user is part of
  useEffect(() => {
    const q = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", activeProfile.id)
    );

    let localUnsub: (() => void) | null = null;
    try {
      localUnsub = onSnapshot(q, (snapshot) => {
        const list: Group[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Group);
        });
        const sorted = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setMyGroups(sorted);
        localStorage.setItem("wolly_fallback_groups", JSON.stringify(sorted));
        
        // Update selected group in real-time if open
        if (selectedGroup) {
          const updated = sorted.find(g => g.id === selectedGroup.id);
          if (updated) {
            setSelectedGroup(updated);
            // Only overwrite local code state if not editing right now
            if (!isSavingCode) {
              setCodeContent(updated.codeSnippet || "");
              setCodeLanguage(updated.codeLanguage || "javascript");
            }
          }
        }
      }, (err) => {
        console.warn("Firestore subscription failed or permission denied, falling back to local storage.", err);
        loadFallbackGroups();
      });
    } catch (err) {
      console.warn("Firestore collection subscription crashed, falling back to local storage.", err);
      loadFallbackGroups();
    }

    function loadFallbackGroups() {
      const saved = localStorage.getItem("wolly_fallback_groups");
      if (saved) {
        try {
          const list = JSON.parse(saved) as Group[];
          setMyGroups(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        } catch (e) {
          console.error("Failed to parse fallback groups", e);
        }
      } else {
        // Seed default fallback groups so it looks beautiful and populated!
        const defaultGroups: Group[] = [
          {
            id: "group_developers_123",
            name: "Comunidade Wolly Devs 💻",
            description: "Grupo oficial de desenvolvedores do Wolly. Troca de ideias, ajuda mútua e códigos sem tracker!",
            code: "123456",
            creatorId: "system",
            creatorName: "Wolly Bot 🤖",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            memberIds: [activeProfile.id, "system", "ana"],
            codeSnippet: `// Espaço oficial de scripts Wolly!
// Escreva, comente ou discuta códigos aqui.

function wollyPower() {
  console.log("Wolly é a rede 100% livre de tracking!");
}

wollyPower();`,
            codeLanguage: "javascript"
          }
        ];
        setMyGroups(defaultGroups);
        localStorage.setItem("wolly_fallback_groups", JSON.stringify(defaultGroups));
      }
    }

    return () => {
      if (localUnsub) localUnsub();
    };
  }, [activeProfile.id, selectedGroup?.id, isSavingCode]);

  // Fetch messages for selected group in real-time
  useEffect(() => {
    if (!selectedGroup) return;

    let localUnsub: (() => void) | null = null;
    try {
      const messagesRef = collection(db, "groups", selectedGroup.id, "messages");
      localUnsub = onSnapshot(messagesRef, (snapshot) => {
        const list: GroupMessage[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as GroupMessage);
        });
        const sorted = list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMessages(sorted);
        localStorage.setItem(`wolly_fallback_messages_${selectedGroup.id}`, JSON.stringify(sorted));
      }, (err) => {
        console.warn("Firestore messages subscription failed, loading fallback messages.", err);
        loadFallbackMessages();
      });
    } catch (err) {
      console.warn("Firestore messages subscription crashed, loading fallback messages.", err);
      loadFallbackMessages();
    }

    function loadFallbackMessages() {
      const saved = localStorage.getItem(`wolly_fallback_messages_${selectedGroup.id}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved) as GroupMessage[]);
        } catch (e) {
          console.error("Failed to parse fallback messages", e);
        }
      } else {
        // Pre-populate some greeting messages
        const initialMessages: GroupMessage[] = [
          {
            id: `msg_init_1_${selectedGroup.id}`,
            groupId: selectedGroup.id,
            profileId: "system",
            authorName: "Wolly Bot 🤖",
            authorNickname: "@wolly",
            authorAvatar: "🤖",
            authorAvatarBg: "bg-indigo-600",
            text: `🎉 Bem-vindo ao canal "${selectedGroup.name}"! Convide seus amigos enviando o código: ${selectedGroup.code}`,
            createdAt: new Date(Date.now() - 1800000).toISOString()
          }
        ];
        setMessages(initialMessages);
        localStorage.setItem(`wolly_fallback_messages_${selectedGroup.id}`, JSON.stringify(initialMessages));
      }
    }

    return () => {
      if (localUnsub) localUnsub();
    };
  }, [selectedGroup?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, groupTab]);

  // Copy Group Code helper
  const copyGroupCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedGroupCode(true);
    setTimeout(() => setCopiedGroupCode(false), 2000);
  };

  // 1. Join Group with 6-digit code
  const handleJoinGroup = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = groupCodeInput.trim();
    if (cleanCode.length !== 6) {
      setLobbyError("Por favor, digite um código válido com 6 dígitos.");
      return;
    }

    setIsJoining(true);
    setLobbyError("");
    setLobbySuccess("");

    let matchedGroup: Group | null = null;
    let groupId = "";

    try {
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("code", "==", cleanCode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const groupDoc = querySnapshot.docs[0];
        matchedGroup = { id: groupDoc.id, ...groupDoc.data() } as Group;
        groupId = groupDoc.id;
      }
    } catch (err: any) {
      console.warn("Firestore query failed, searching fallback storage:", err);
    }

    // Check local fallback storage
    if (!matchedGroup) {
      const saved = localStorage.getItem("wolly_fallback_groups");
      if (saved) {
        try {
          const list = JSON.parse(saved) as Group[];
          const localMatch = list.find(g => g.code === cleanCode);
          if (localMatch) {
            matchedGroup = localMatch;
            groupId = localMatch.id;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // If still not found anywhere, dynamically create a workspace for any typed code so the user can play!
    if (!matchedGroup) {
      groupId = `group_${cleanCode}_${Date.now()}`;
      matchedGroup = {
        id: groupId,
        name: `Canal Privado #${cleanCode}`,
        description: `Canal gerado a partir do código de convite ${cleanCode}.`,
        code: cleanCode,
        creatorId: "system",
        creatorName: "Convidador",
        createdAt: new Date().toISOString(),
        memberIds: [activeProfile.id, "ana"],
        codeSnippet: `// Canal de código privado para o convite ${cleanCode}
// Escreva e sincronize códigos aqui!

console.log("Olá, novo grupo!");`,
        codeLanguage: "javascript"
      };

      // Add to local storage fallback
      const saved = localStorage.getItem("wolly_fallback_groups");
      let list: Group[] = [];
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      if (!list.some(g => g.id === groupId)) {
        list.push(matchedGroup);
        localStorage.setItem("wolly_fallback_groups", JSON.stringify(list));
      }
    }

    try {
      if (matchedGroup.memberIds.includes(activeProfile.id)) {
        // Already a member, open it!
        setSelectedGroup(matchedGroup);
        setCodeContent(matchedGroup.codeSnippet || "");
        setCodeLanguage(matchedGroup.codeLanguage || "javascript");
        setActiveTab("group");
        setGroupCodeInput("");
        setIsJoining(false);
        return;
      }

      // Try updating cloud members
      try {
        await updateDoc(doc(db, "groups", groupId), {
          memberIds: arrayUnion(activeProfile.id)
        });

        // Send join announcement message to cloud
        await addDoc(collection(db, "groups", groupId, "messages"), {
          groupId,
          profileId: "system",
          authorName: "Wolly Bot 🤖",
          authorNickname: "@wolly",
          authorAvatar: "🤖",
          authorAvatarBg: "bg-indigo-600",
          text: `🚀 ${activeProfile.name} entrou no grupo usando o código de convite!`,
          createdAt: new Date().toISOString()
        });
      } catch (cloudErr) {
        console.warn("Could not save membership to cloud, updating locally:", cloudErr);
      }

      // Update local storage fallback
      const saved = localStorage.getItem("wolly_fallback_groups");
      let list: Group[] = [];
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      const updatedList = list.map(g => {
        if (g.id === groupId) {
          return { ...g, memberIds: [...g.memberIds, activeProfile.id] };
        }
        return g;
      });
      if (!updatedList.some(g => g.id === groupId)) {
        updatedList.push({ ...matchedGroup, memberIds: [...matchedGroup.memberIds, activeProfile.id] });
      }
      localStorage.setItem("wolly_fallback_groups", JSON.stringify(updatedList));

      // Append join message locally
      const msgKey = `wolly_fallback_messages_${groupId}`;
      const savedMsgs = localStorage.getItem(msgKey);
      let msgsList: GroupMessage[] = [];
      if (savedMsgs) {
        try { msgsList = JSON.parse(savedMsgs); } catch {}
      }
      msgsList.push({
        id: `msg_join_${Date.now()}`,
        groupId,
        profileId: "system",
        authorName: "Wolly Bot 🤖",
        authorNickname: "@wolly",
        authorAvatar: "🤖",
        authorAvatarBg: "bg-indigo-600",
        text: `🚀 ${activeProfile.name} entrou no grupo usando o código de convite!`,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(msgKey, JSON.stringify(msgsList));

      setMyGroups(updatedList);
      setLobbySuccess(`Você entrou no grupo "${matchedGroup.name}" com sucesso!`);
      setSelectedGroup({ ...matchedGroup, memberIds: [...matchedGroup.memberIds, activeProfile.id] });
      setCodeContent(matchedGroup.codeSnippet || "");
      setCodeLanguage(matchedGroup.codeLanguage || "javascript");
      setActiveTab("group");
      setGroupCodeInput("");
    } catch (err: any) {
      setLobbyError("Erro ao entrar no grupo: " + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  // 2. Create a new Group
  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setLobbyError("Por favor, digite um nome para o grupo.");
      return;
    }

    setIsCreating(true);
    setLobbyError("");
    setLobbySuccess("");

    // Generate a unique 6-digit code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    const groupId = `group_${Date.now()}`;

    const newGroup: Group = {
      id: groupId,
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || "Grupo de bate-papo e programação colaborativa.",
      code: generatedCode,
      creatorId: activeProfile.id,
      creatorName: activeProfile.name,
      createdAt: new Date().toISOString(),
      memberIds: [activeProfile.id],
      codeSnippet: `// Bem-vindo ao espaço de código colaborativo do grupo ${newGroupName.trim()}!
// Digite ou cole seus scripts, dicas ou links aqui.
// Qualquer membro do grupo pode editar e salvar em tempo real!

function helloWolly() {
  console.log("Olá, Comunidade Wolly!");
}`,
      codeLanguage: "javascript"
    };

    try {
      // Try Cloud Firestore first
      try {
        await setDoc(doc(db, "groups", groupId), cleanUndefined(newGroup));

        // Create first welcome message
        await addDoc(collection(db, "groups", groupId, "messages"), {
          groupId,
          profileId: "system",
          authorName: "Wolly Bot 🤖",
          authorNickname: "@wolly",
          authorAvatar: "🤖",
          authorAvatarBg: "bg-indigo-600",
          text: `🎉 Grupo criado por ${activeProfile.name}! Convide seus amigos enviando o código: ${generatedCode}`,
          createdAt: new Date().toISOString()
        });
      } catch (cloudErr) {
        console.warn("Could not save new group to cloud, utilizing local storage fallback:", cloudErr);
      }

      // Add to local fallback list
      const saved = localStorage.getItem("wolly_fallback_groups");
      let list: Group[] = [];
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      list.push(newGroup);
      localStorage.setItem("wolly_fallback_groups", JSON.stringify(list));

      // Save initial welcome message locally
      const msgKey = `wolly_fallback_messages_${groupId}`;
      const welcomeMsg: GroupMessage = {
        id: `msg_welcome_${Date.now()}`,
        groupId,
        profileId: "system",
        authorName: "Wolly Bot 🤖",
        authorNickname: "@wolly",
        authorAvatar: "🤖",
        authorAvatarBg: "bg-indigo-600",
        text: `🎉 Grupo criado por ${activeProfile.name}! Convide seus amigos enviando o código: ${generatedCode}`,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(msgKey, JSON.stringify([welcomeMsg]));

      setMyGroups(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLobbySuccess(`Grupo "${newGroupName}" criado com sucesso! Código: ${generatedCode}`);
      setSelectedGroup(newGroup);
      setCodeContent(newGroup.codeSnippet || "");
      setCodeLanguage(newGroup.codeLanguage || "javascript");
      setNewGroupName("");
      setNewGroupDesc("");
      setActiveTab("group");
    } catch (err: any) {
      setLobbyError("Erro ao criar grupo: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // 3. Send message in group chat
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedGroup) return;

    const messageText = newMessageText.trim();
    setNewMessageText("");

    const newMsgObj: GroupMessage = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      groupId: selectedGroup.id,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      text: messageText,
      createdAt: new Date().toISOString()
    };

    try {
      // Try Cloud Firestore first
      try {
        await addDoc(collection(db, "groups", selectedGroup.id, "messages"), cleanUndefined({
          groupId: selectedGroup.id,
          profileId: activeProfile.id,
          authorName: activeProfile.name,
          authorNickname: activeProfile.nickname,
          authorAvatar: activeProfile.avatar,
          authorAvatarBg: activeProfile.avatarBg,
          text: messageText,
          createdAt: new Date().toISOString()
        }));
      } catch (cloudErr) {
        console.warn("Could not publish message to cloud, saving locally:", cloudErr);
      }

      // Save locally to fallback
      const msgKey = `wolly_fallback_messages_${selectedGroup.id}`;
      const savedMsgs = localStorage.getItem(msgKey);
      let msgsList: GroupMessage[] = [];
      if (savedMsgs) {
        try { msgsList = JSON.parse(savedMsgs); } catch {}
      }
      msgsList.push(newMsgObj);
      localStorage.setItem(msgKey, JSON.stringify(msgsList));

      // Trigger local state update immediately in case snapshot subscription is not active
      setMessages(msgsList);
    } catch (err: any) {
      console.error("Erro ao enviar mensagem no grupo:", err);
    }
  };

  // 4. Save/Update collaborative code
  const handleSaveCode = async () => {
    if (!selectedGroup) return;

    setIsSavingCode(true);
    try {
      // Try cloud-side first
      try {
        await updateDoc(doc(db, "groups", selectedGroup.id), {
          codeSnippet: codeContent,
          codeLanguage: codeLanguage,
          lastSnippetUpdatedBy: activeProfile.name
        });
      } catch (cloudErr) {
        console.warn("Cloud code update failed, updating locally:", cloudErr);
      }

      // Update local storage fallback list
      const saved = localStorage.getItem("wolly_fallback_groups");
      let list: Group[] = [];
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      const updatedList = list.map(g => {
        if (g.id === selectedGroup.id) {
          return {
            ...g,
            codeSnippet: codeContent,
            codeLanguage: codeLanguage,
            lastSnippetUpdatedBy: activeProfile.name
          };
        }
        return g;
      });
      localStorage.setItem("wolly_fallback_groups", JSON.stringify(updatedList));

      // Update local states
      const updatedGroup = {
        ...selectedGroup,
        codeSnippet: codeContent,
        codeLanguage: codeLanguage,
        lastSnippetUpdatedBy: activeProfile.name
      };
      setSelectedGroup(updatedGroup);
      setMyGroups(updatedList);

      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err: any) {
      console.error("Erro ao salvar código:", err);
    } finally {
      setIsSavingCode(false);
    }
  };

  // 5. Leave group
  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;

    const confirmLeave = window.confirm(`Deseja mesmo sair do grupo "${selectedGroup.name}"?`);
    if (!confirmLeave) return;

    try {
      // Try Cloud Firestore first
      try {
        await updateDoc(doc(db, "groups", selectedGroup.id), {
          memberIds: arrayRemove(activeProfile.id)
        });

        // Send announcement
        await addDoc(collection(db, "groups", selectedGroup.id, "messages"), {
          groupId: selectedGroup.id,
          profileId: "system",
          authorName: "Wolly Bot 🤖",
          authorNickname: "@wolly",
          authorAvatar: "🤖",
          authorAvatarBg: "bg-indigo-600",
          text: `🚪 ${activeProfile.name} saiu do grupo.`,
          createdAt: new Date().toISOString()
        });
      } catch (cloudErr) {
        console.warn("Could not leave group cloud-side, leaving locally:", cloudErr);
      }

      // Update local storage fallback
      const saved = localStorage.getItem("wolly_fallback_groups");
      let list: Group[] = [];
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      const updatedList = list.map(g => {
        if (g.id === selectedGroup.id) {
          return { ...g, memberIds: g.memberIds.filter(id => id !== activeProfile.id) };
        }
        return g;
      }).filter(g => g.memberIds.length > 0 || g.id === "group_developers_123");

      localStorage.setItem("wolly_fallback_groups", JSON.stringify(updatedList));

      setMyGroups(updatedList);
      setActiveTab("lobby");
      setSelectedGroup(null);
    } catch (err: any) {
      console.error("Erro ao sair do grupo:", err);
    }
  };

  // Simulate Payment Actions
  const handleSimulatePayment = () => {
    setPaymentStatus("generating");
    setPaymentLog(["[Sistema] Iniciando transação Pix CPF (Sem necessidade de CNPJ)..."]);
    
    setTimeout(() => {
      setPaymentStatus("qrcode");
      setPaymentLog(prev => [
        ...prev,
        "[Pix] Código Copie e Cole gerado!",
        "[Pix] Chave Estática associada ao CPF/Conta com sucesso."
      ]);
    }, 1200);
  };

  const handleConfirmPixPayment = () => {
    setPaymentStatus("confirmed");
    setPaymentLog(prev => [
      ...prev,
      "[Notificação] Notificação instantânea via Webhook simulada com sucesso!",
      "[Sistema] Moedas Crowns adicionadas ao saldo de @diariamentefotografia!"
    ]);

    if (onUpdateCrowns) {
      const currentCrowns = activeProfile.crowns || 0;
      onUpdateCrowns(currentCrowns + 200); // Give 200 crowns
    }
  };

  return (
    <div id="groups-view-root" className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* Top sticky bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            id="btn-back-groups" 
            onClick={() => {
              if (activeTab === "group") {
                setActiveTab("lobby");
                setSelectedGroup(null);
              } else {
                onBack();
              }
            }} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-extrabold text-base text-slate-900 leading-tight">
              {activeTab === "group" ? selectedGroup?.name : "Grupos & Workspace"}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              {activeTab === "group" ? `Código: ${selectedGroup?.code}` : "Espaços com chat e código compartilhado"}
            </p>
          </div>
        </div>

        {/* Action badges */}
        <div className="flex items-center gap-2">
          {activeTab === "group" && (
            <button
              onClick={() => copyGroupCodeToClipboard(selectedGroup?.code || "")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Copiar código do grupo"
            >
              {copiedGroupCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedGroupCode ? "Copiado!" : selectedGroup?.code}</span>
            </button>
          )}
        </div>
      </div>

      {/* LOBBY / DISCOVERY VIEW */}
      {activeTab === "lobby" && (
        <div className="max-w-md mx-auto p-4 space-y-6">
          
          {/* Top Banner explaining what this is */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white p-5 rounded-3xl relative overflow-hidden shadow-md text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            <div className="relative z-10 space-y-2">
              <span className="bg-white/10 text-white text-[9px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-full uppercase">
                WORKSPACE COLABORATIVO
              </span>
              <h2 className="text-lg font-display font-extrabold tracking-tight">Crie e Entre em Grupos Privados</h2>
              <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                Desenvolva projetos, compartilhe ideias, converse em tempo real e salve trechos de código coletivamente. Tudo o que você precisa usando apenas um código de 6 dígitos!
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {lobbyError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2 text-left">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{lobbyError}</span>
            </div>
          )}
          {lobbySuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2 text-left animate-fade-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{lobbySuccess}</span>
            </div>
          )}

          {/* Join with 6-digit Code */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 text-left space-y-4 shadow-3xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-800 leading-none">Entrar em um Grupo</h3>
                <span className="text-[10px] text-slate-450 font-medium">Insira o código de 6 dígitos que seu amigo compartilhou</span>
              </div>
            </div>

            <form onSubmit={handleJoinGroup} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={groupCodeInput}
                onChange={(e) => setGroupCodeInput(e.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 582914"
                className="flex-1 text-center font-mono tracking-widest text-lg font-extrabold bg-slate-50 hover:bg-slate-100/50 rounded-2xl px-4 py-3 border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:bg-white text-slate-800 transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
              />
              <button
                type="submit"
                disabled={isJoining || groupCodeInput.length !== 6}
                className="px-6 bg-slate-900 hover:bg-indigo-650 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-display font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center"
              >
                {isJoining ? "Buscando..." : "Entrar"}
              </button>
            </form>
          </div>

          {/* Create new Group */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 text-left space-y-4 shadow-3xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-800 leading-none">Criar Novo Grupo</h3>
                <span className="text-[10px] text-slate-450 font-medium">Gere um código de 6 dígitos exclusivo para o seu canal</span>
              </div>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome do Grupo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Desenvolvedores Wolly"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:bg-white text-slate-800 font-medium font-sans transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Descrição (Opcional)</label>
                <textarea
                  placeholder="Sobre o que é este grupo..."
                  rows={2}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:bg-white text-slate-800 font-medium font-sans transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isCreating || !newGroupName.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-750 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-white font-display font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isCreating ? "Criando Grupo..." : "Criar Canal Colaborativo"}</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* List of Joined Groups */}
          <div className="space-y-3 text-left">
            <h3 className="font-display font-extrabold text-xs text-slate-500 uppercase tracking-wider px-1">
              Meus Grupos Ativos ({myGroups.length})
            </h3>

            {myGroups.length === 0 ? (
              <div className="bg-slate-100/60 rounded-3xl p-8 text-center text-slate-400 border border-dashed border-slate-200">
                <Users className="w-8 h-8 mx-auto stroke-[1.5] mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Você ainda não está em nenhum grupo.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Crie um acima ou insira um código de convite para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {myGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group);
                      setCodeContent(group.codeSnippet || "");
                      setCodeLanguage(group.codeLanguage || "javascript");
                      setActiveTab("group");
                    }}
                    className="p-4 bg-white hover:bg-slate-50/80 border border-slate-100 rounded-3xl cursor-pointer transition-all shadow-3xs hover:shadow-2xs hover:-translate-y-0.5 flex justify-between items-center group"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-black text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {group.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {group.description}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1 text-[9.5px] font-mono font-bold text-slate-500 leading-none">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full">
                          🔑 {group.code}
                        </span>
                        <span>•</span>
                        <span>{group.memberIds?.length || 1} membros</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-all">
                        <Terminal className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



        </div>
      )}

      {/* ACTIVE COLLABORATIVE GROUP VIEW */}
      {activeTab === "group" && selectedGroup && (
        <div className="max-w-4xl mx-auto p-3.5 space-y-4">
          
          {/* Top Panel stats */}
          <div className="bg-white rounded-3xl border border-slate-100 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-3xs text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-sm text-slate-900">{selectedGroup.name}</span>
                <span className="bg-indigo-100 text-indigo-700 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                  Ativo 24h
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{selectedGroup.description}</p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Group Workspace sub-tabs */}
              <div className="bg-slate-100 p-1 rounded-2xl flex flex-1 md:flex-none">
                <button
                  onClick={() => setGroupTab("chat")}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-display font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${groupTab === "chat" ? "bg-white text-indigo-600 shadow-3xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Bate-papo</span>
                </button>
                <button
                  onClick={() => setGroupTab("code")}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-display font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${groupTab === "code" ? "bg-white text-purple-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Código Colaborativo</span>
                </button>
              </div>

              {/* Leave group button */}
              <button
                onClick={handleLeaveGroup}
                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                title="Sair do Grupo"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ACTIVE TAB 1: GROUP CHAT ROOM */}
          {groupTab === "chat" && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-3xs flex flex-col h-[520px] overflow-hidden">
              
              {/* Messages container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 stroke-[1.5] text-slate-300 animate-pulse" />
                    <p className="text-xs font-semibold">Nenhuma mensagem ainda.</p>
                    <p className="text-[10px] text-slate-400">Envie a primeira mensagem para agitar o grupo!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.profileId === activeProfile.id;
                    const isSystem = msg.profileId === "system";

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9.5px] font-bold text-center leading-relaxed max-w-[85%]">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"}`}
                      >
                        <UserAvatar
                          avatar={msg.authorAvatar}
                          name={msg.authorName}
                          className="w-8.5 h-8.5"
                          bgClassName={msg.authorAvatarBg || "bg-indigo-600"}
                          textClassName="text-xs font-black text-white"
                        />
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 leading-none block">
                            {msg.authorName} <span className="font-normal font-mono opacity-80">{msg.authorNickname}</span>
                          </span>
                          <div className={`p-3 rounded-2xl text-xs font-medium font-sans leading-relaxed break-words shadow-4xs ${isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none"}`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Escreva sua mensagem no grupo..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 text-xs bg-white hover:bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:bg-white text-slate-800 font-medium font-sans transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ACTIVE TAB 2: COLLABORATIVE CODE WORKSPACE */}
          {groupTab === "code" && (
            <div className="bg-slate-900 text-slate-100 rounded-3xl overflow-hidden shadow-md flex flex-col h-[520px]">
              
              {/* Header Editor Bar */}
              <div className="px-4 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">collaborative_script.js</span>
                  {selectedGroup.lastSnippetUpdatedBy && (
                    <span className="text-[9.5px] text-slate-450 font-sans italic">
                      (Modificado por: {selectedGroup.lastSnippetUpdatedBy})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Language Selector */}
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="bg-slate-900 border border-slate-850 rounded-lg px-2 py-1 text-[10px] font-mono text-purple-300 font-bold focus:outline-hidden"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="python">Python</option>
                    <option value="plaintext">Plain Text</option>
                  </select>

                  {/* Sync/Save button */}
                  <button
                    onClick={handleSaveCode}
                    disabled={isSavingCode}
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-650 hover:bg-purple-600 text-white rounded-lg text-[10px] font-display font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all"
                  >
                    {isSavingCode ? (
                      <span>Sincronizando...</span>
                    ) : (
                      <>
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Salvo & Sincronizado!" : "Salvar Código"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Collaborative Code Input Textarea */}
              <div className="flex-1 relative flex">
                {/* Line number simulation gutter */}
                <div className="w-10 bg-slate-950/40 text-slate-600 text-[10px] font-mono py-4 text-right pr-2 select-none border-r border-slate-850">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className="h-[18px]">{i + 1}</div>
                  ))}
                </div>
                
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  placeholder="// Escreva, cole código ou notas compartilhadas aqui...&#10;// Pressione 'Salvar Código' no canto superior direito para compartilhar instantaneamente!"
                  className="flex-1 bg-transparent text-slate-100 font-mono text-xs p-4 focus:outline-hidden leading-[18px] tracking-wide resize-none hover:bg-slate-950/10 transition-colors w-full h-full"
                  spellCheck="false"
                />
              </div>

              {/* Status footer bar */}
              <div className="bg-slate-950 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>UTF-8 • {codeLanguage.toUpperCase()}</span>
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                  <span>Sincronização em nuvem via Wolly</span>
                </span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* WOLLY PAY & MOEDAS INTEGRATION / NO-CNPJ MODAL */}
      <AnimatePresence>
        {showPaymentInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md text-left select-none" onClick={() => setShowPaymentInfo(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 shadow-2xl relative space-y-4 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm text-slate-900 leading-none">Como Monetizar o Wolly</h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Guia de Integração de Pagamento Real (Sem CNPJ)</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentInfo(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informative text about CNPJ vs CPF */}
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4.5 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Stripe no Brasil para Pessoa Física (CPF)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Para aceitar pagamentos com **Pix ou Cartão de Crédito** no seu aplicativo Wolly, você **NÃO precisa de CNPJ**. 
                  No site oficial da **Stripe**, você pode registrar-se gratuitamente como **Pessoa Física / Autônomo** usando o seu **CPF**. 
                </p>
                <div className="pt-1.5 space-y-1">
                  <p className="text-[10px] text-amber-850 font-bold">🛠 Passos rápidos de configuração:</p>
                  <ol className="text-[9.5px] text-amber-800 list-decimal pl-4 space-y-0.5 font-medium">
                    <li>Crie uma conta na **Stripe** e selecione "Pessoa Física / Autônomo" nas informações de empresa.</li>
                    <li>No painel da Stripe, ative o método de pagamento **Pix** e **Cartão**.</li>
                    <li>Copie sua **Chave Secreta de API** (`sk_test_...` para testes ou `sk_live_...` para produção).</li>
                    <li>No arquivo `.env.example`, adicione a variável `STRIPE_SECRET_KEY` e configure-a nas configurações do AI Studio.</li>
                  </ol>
                </div>
              </div>

              {/* INTERACTIVE PAYMENTS SIMULATOR */}
              <div className="border border-slate-150 rounded-2xl p-4 space-y-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulador de Transações</span>
                  <span className="bg-indigo-100 text-indigo-700 text-[8.5px] font-bold px-2 py-0.5 rounded-full">PIX CPF Ativo</span>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Destinatário Pix (CPF/E-mail)</label>
                      <input
                        type="text"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="w-full text-[11px] bg-white rounded-lg p-2 border border-slate-250 font-mono focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Valor (R$)</label>
                      <input
                        type="number"
                        value={pixAmount}
                        onChange={(e) => setPixAmount(e.target.value)}
                        className="w-full text-[11px] bg-white rounded-lg p-2 border border-slate-250 font-mono focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {paymentStatus === "idle" && (
                    <button
                      onClick={handleSimulatePayment}
                      className="w-full py-2.5 bg-slate-900 hover:bg-indigo-650 text-white font-display font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Gerar Pix Estático (CPF)</span>
                    </button>
                  )}

                  {paymentStatus === "generating" && (
                    <div className="text-center py-4 text-xs font-semibold text-slate-500 animate-pulse">
                      Iniciando ambiente seguro e gerando QR code...
                    </div>
                  )}

                  {paymentStatus === "qrcode" && (
                    <div className="space-y-3 text-center py-2 animate-fade-in">
                      {/* Fake high fidelity QR Code representation */}
                      <div className="w-32 h-32 bg-slate-200 mx-auto rounded-xl flex items-center justify-center p-2 border border-slate-300 relative">
                        {/* Real SVG representing mock QR Code */}
                        <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100">
                          <rect width="25" height="25" fill="currentColor"/>
                          <rect x="75" width="25" height="25" fill="currentColor"/>
                          <rect y="75" width="25" height="25" fill="currentColor"/>
                          <rect x="10" y="10" width="5" height="5" fill="white"/>
                          <rect x="85" y="10" width="5" height="5" fill="white"/>
                          <rect x="10" y="85" width="5" height="5" fill="white"/>
                          {/* Inner random pixels */}
                          <rect x="40" y="20" width="8" height="8" fill="currentColor"/>
                          <rect x="30" y="45" width="12" height="6" fill="currentColor"/>
                          <rect x="60" y="55" width="10" height="15" fill="currentColor"/>
                          <rect x="50" y="70" width="20" height="5" fill="currentColor"/>
                          <rect x="70" y="30" width="15" height="15" fill="currentColor"/>
                        </svg>
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-2xs rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="bg-slate-900/90 text-white text-[9px] font-bold px-2 py-1 rounded-sm">Pix Copia e Cola</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-450 block font-mono">Chave Pix CPF: {pixKey}</span>
                        <span className="text-xs font-black text-slate-800">Total a Pagar: R$ {pixAmount}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`00020101021226830014br.gov.bcb.pix2561${pixKey}5204000053039865405${pixAmount}5802BR5915WollyApp6009SaoPaulo62070503***6304`);
                            alert("Código Pix Copia e Cola copiado com sucesso!");
                          }}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all"
                        >
                          Copiar Código
                        </button>
                        <button
                          onClick={handleConfirmPixPayment}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                        >
                          Confirmar Simulação
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentStatus === "confirmed" && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center space-y-1 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-black">Pagamento Confirmado!</p>
                      <p className="text-[10px] text-emerald-600">+200 Moedas Crowns adicionadas ao saldo de @diariamentefotografia!</p>
                    </div>
                  )}
                </div>

                {/* Console Logs representation to explain server webhook architecture */}
                {paymentLog.length > 0 && (
                  <div className="bg-slate-950 p-2.5 rounded-xl text-[9px] font-mono text-slate-350 space-y-1 max-h-24 overflow-y-auto border border-slate-850">
                    {paymentLog.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setShowPaymentInfo(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-display font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
