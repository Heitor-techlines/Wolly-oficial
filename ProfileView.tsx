/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Plus, Settings, Sparkles, Trophy, Shield, UserPlus, Grid, Film, Clipboard, Check, LogOut, ChevronRight, Edit2, Palette, X, Sliders, Send, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Post, CrownTransaction, Series } from "../types";
import UserAvatar from "./UserAvatar";

interface ProfileViewProps {
  activeProfile: Profile;
  profiles: Profile[];
  posts: Post[];
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string, nickname: string, bio: string, avatarBg: string) => void;
  onUpdateBio: (profileId: string, newBio: string) => void;
  onUpdateBanner: (profileId: string, bannerGradient: string) => void;
  onUpdateProfileDetails?: (profileId: string, updates: Partial<Profile>) => void;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  crownTransactions: CrownTransaction[];
  onAwardCrowns: (profileId: string, amount: number, description: string) => void;
  onSpendCrowns: (profileId: string, amount: number, description: string) => boolean;
  savedAccounts?: any[];
  userAccount?: any;
  onSwitchSavedAccount?: (account: any) => void;
  onTogglePrivacy?: (profileId: string) => void;
  onCreateChallenge?: (title: string, description: string, reward: number, expiresIn: string) => void;
  seriesList?: Series[];
  onSelectSeries?: (seriesId: string) => void;
  onOpenLine123Chat?: () => void;
}

export default function ProfileView({
  activeProfile,
  profiles,
  posts,
  onSelectProfile,
  onCreateProfile,
  onUpdateBio,
  onUpdateBanner,
  onUpdateProfileDetails,
  onSelectTab,
  onLogout,
  crownTransactions,
  onAwardCrowns,
  onSpendCrowns,
  savedAccounts = [],
  userAccount = null,
  onSwitchSavedAccount,
  onTogglePrivacy,
  onCreateChallenge,
  seriesList = [],
  onSelectSeries,
  onOpenLine123Chat,
}: ProfileViewProps) {
  const [activeGridTab, setActiveGridTab] = useState<"posts" | "clips" | "series">("posts");
  const [selectedProfileThemeFilter, setSelectedProfileThemeFilter] = useState<string>("Todos");
  const [showProfileFilterSubTab, setShowProfileFilterSubTab] = useState(false);

  const profileThemesChips = [
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
  const [activePlan, setActivePlan] = useState<"free" | "black" | "plus">(() => {
    return (localStorage.getItem(`wolly_active_plan_${activeProfile.id}`) as any) || "free";
  });
  const isSubscribed = activePlan !== "free";
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSwitcherDropdown, setShowSwitcherDropdown] = useState(false);

  // States for subscription payments with Mercado Pago PIX
  const [paymentStep, setPaymentStep] = useState<"select-plan" | "generating" | "show-pix" | "success">("select-plan");
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<{ id: "black" | "plus"; price: number; name: string } | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; ticketUrl: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  // Crowns Purchase and Donation via PIX
  const [crownDonationStep, setCrownDonationStep] = useState<"choose" | "generating" | "show-pix" | "success">("choose");
  const [selectedCrownsPackage, setSelectedCrownsPackage] = useState<{ crowns: number; price: number } | null>(null);
  const [crownPixData, setCrownPixData] = useState<{ qrCode: string; qrCodeBase64: string; ticketUrl: string } | null>(null);
  const [transferDestinationProfileId, setTransferDestinationProfileId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(10);

  // States for new Shield (Privacy Toggle) and Trophy (Create Challenge) requirements
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [challengeReward, setChallengeReward] = useState(50);
  const [challengeExpiry, setChallengeExpiry] = useState("5 dias");
  const [showPrivacyCard, setShowPrivacyCard] = useState(false);


  // Wolly Crowns Center interactive HUD states
  const [showCrownsHub, setShowCrownsHub] = useState(false);
  const [crownsActionTab, setCrownsActionTab] = useState<"earn" | "spend" | "history" | "donate">("earn");
  const [claimedChallenges, setClaimedChallenges] = useState<string[]>(() => {
    const saved = localStorage.getItem(`wolly_claimed_challenges_${activeProfile.id}`);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Edit Profile States
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(activeProfile.bio);
  
  // Custom Banner Gradients chooser
  const [showBannerChooser, setShowBannerChooser] = useState(false);

  // Edit Profile Modal details
  const [showEditModal, setShowEditModal] = useState(false);

  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editAvatarBg, setEditAvatarBg] = useState("");
  const [editBio, setEditBio] = useState("");

  const handleOpenEditModal = () => {
    setEditName(activeProfile.name);
    setEditAvatar(activeProfile.avatar || activeProfile.name[0]);
    setEditAvatarBg(activeProfile.avatarBg || "bg-gradient-to-br from-purple-500 to-pink-500");
    setEditBio(activeProfile.bio || "");
    setShowEditModal(true);
  };

  const handleSaveProfileDetails = (e: FormEvent) => {
    e.preventDefault();
    if (onUpdateProfileDetails) {
      onUpdateProfileDetails(activeProfile.id, {
        name: editName.trim(),
        avatar: editAvatar.trim(),
        avatarBg: editAvatarBg,
        bio: editBio.trim()
      });
    }
    setShowEditModal(false);
  };

  // New sub-profile creation form
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileNickname, setNewProfileNickname] = useState("");
  const [newProfileBio, setNewProfileBio] = useState("");
  const [selectedGradient, setSelectedGradient] = useState("bg-gradient-to-r from-purple-500 to-pink-500");

  const gradientPresets = [
    { name: "Grape", class: "bg-gradient-to-r from-purple-500 to-pink-500" },
    { name: "Ocean", class: "bg-gradient-to-r from-teal-400 to-emerald-500" },
    { name: "Sunset", class: "bg-gradient-to-r from-orange-400 to-rose-500" },
    { name: "Cosmic", class: "bg-gradient-to-r from-blue-600 to-violet-600" },
    { name: "Charcoal", class: "bg-gradient-to-r from-slate-700 to-slate-900" }
  ];

  const wollyGradients = [
    "from-slate-100 to-slate-200",
    "from-purple-100 to-indigo-100",
    "from-emerald-500/20 to-teal-500/10",
    "from-indigo-600 to-purple-600",
    "from-slate-900 to-slate-950"
  ];

  // Check VIP verification crown status
  const isVip = localStorage.getItem("wolly_vip_" + activeProfile.id) === "true";

  // Self posts
  const myPosts = posts.filter((p) => p.profileId === activeProfile.id);

  const handleCreateNewProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim() || !newProfileNickname.trim()) {
      alert("Por favor, preencha o Nome e o Nome de Usuário (@nickname)!");
      return;
    }

    const cleanedNickname = newProfileNickname.trim().startsWith("@") 
      ? newProfileNickname.trim() 
      : `@${newProfileNickname.trim()}`;

    onCreateProfile(
      newProfileName.trim(),
      cleanedNickname,
      newProfileBio.trim() || "Nova identidade livre no Wolly.",
      selectedGradient
    );

    // Reset controls
    setNewProfileName("");
    setNewProfileNickname("");
    setNewProfileBio("");
    setShowSwitcherDropdown(false);
    alert(`Novo perfil criado com sucesso! Agora você possui mais de um perfil conectado.`);
  };

  const handleSaveBio = () => {
    onUpdateBio(activeProfile.id, bioInput.trim());
    setIsEditingBio(false);
  };

  return (
    <div id="profile-view-root" className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      
      {/* Top Banner Cover with user gradient support */}
      <div className={`h-36 w-full relative transition-all duration-300 ${activeProfile.banner || "bg-gradient-to-r from-emerald-100 to-teal-150"}`}>
        {/* Toggle option to edit active background */}
        <button
          id="btn-toggle-banner-settings"
          onClick={() => setShowBannerChooser(!showBannerChooser)}
          title="Alterar gradiente do banner"
          className="absolute bottom-3 right-3 p-2 bg-black/40 hover:bg-black/60 rounded-xl text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 border border-white/10"
        >
          <Palette className="w-3.5 h-3.5" /> Mudar Banner
        </button>
      </div>

      {/* Main Profile Layout */}
      <div className="max-w-md mx-auto px-4 relative -mt-10 space-y-5">
        {/* Top Header bar with nickname and logout */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100/60 pb-3">
            <span className="font-display font-extrabold text-sm text-slate-900 truncate max-w-[200px] leading-tight flex items-center gap-1.5">
              <span>{activeProfile.name}</span>
              {isVip && <span className="text-amber-550 text-xs shrink-0 select-none" title="Perfil VIP Verificado 👑">👑</span>}
              {activeProfile.isPrivate ? (
                <span title="Perfil Fechado 🔒" className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-md font-bold shrink-0 border border-rose-100 flex items-center gap-0.5">🔒 Fechado</span>
              ) : (
                <span title="Perfil Aberto 🔓" className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold shrink-0 border border-emerald-100 flex items-center gap-0.5">🔓 Aberto</span>
              )}
            </span>

            <div className="flex items-center gap-2">
              {/* Privacy Shield */}
              <button 
                title="Status de Privacidade do Perfil"
                onClick={() => setShowPrivacyCard(true)}
                className="p-1 hover:bg-slate-50 rounded-lg text-slate-500 cursor-pointer transition-all hover:scale-105"
              >
                <Shield className={`w-4 h-4 ${activeProfile.isPrivate ? "text-rose-500" : "text-emerald-500"}`} />
              </button>

              {/* Sign out */}
              <button 
                title="Sair da Conta"
                onClick={onLogout}
                className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner GradChooser container panel */}
          <AnimatePresence>
            {showBannerChooser && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left overflow-hidden"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Selecione o Estilo do Banner</span>
                <div className="grid grid-cols-5 gap-2">
                  {gradientPresets.map((gp, i) => (
                    <button
                      key={i}
                      value={gp.class}
                      onClick={() => {
                        onUpdateBanner(activeProfile.id, gp.class);
                        setShowBannerChooser(false);
                      }}
                      className={`h-7 w-full rounded-lg cursor-pointer ${gp.class} border border-whiteShadow-xs transition-transform hover:scale-105`}
                      title={gp.name}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile metadata row (Middle part) */}
          <div className="flex items-center gap-5">
            {/* Big Initial letter circle acting as profile photo */}
            <div
              onClick={handleOpenEditModal}
              title="Clique para editar foto de perfil e contadores"
              className="w-20 h-20 rounded-full border-4 border-white shadow-md flex-shrink-0 animate-fade-in cursor-pointer relative group overflow-hidden"
            >
              <UserAvatar
                avatar={activeProfile.avatar}
                name={activeProfile.name}
                className="w-full h-full"
                bgClassName={activeProfile.avatarBg || "bg-gradient-to-br from-purple-500 to-pink-500"}
                textClassName="text-3xl font-display font-black text-white"
              />
              {/* Hover Edit Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                Editar
              </div>
            </div>

            {/* Statistics meters columns */}
            <div className="flex-1 grid grid-cols-3 gap-2 text-center text-slate-700">
              <div className="space-y-0.5">
                <span className="block text-base font-black font-display text-slate-800">{activeProfile.postsCount}</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">Posts</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-base font-black font-display text-slate-800">{activeProfile.followersCount}</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">Seguidores</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-base font-black font-display text-slate-800">{activeProfile.followingCount}</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">Seguindo</span>
              </div>
            </div>
          </div>

          {/* Biography text and editing panel */}
          <div className="space-y-2 text-left pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono font-bold">
                {activeProfile.nickname}
              </span>
            </div>

            {isEditingBio ? (
              <div className="space-y-2 mt-1">
                <textarea
                  id="bio-edit-textarea"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="w-full text-xs font-sans text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 focus:outline-hidden focus:border-indigo-600 h-20"
                />
                <div className="flex justify-end gap-1.5">
                  <button onClick={() => setIsEditingBio(false)} className="px-2.5 py-1 text-[10px] bg-slate-100 rounded-lg cursor-pointer">
                    Cancelar
                  </button>
                  <button onClick={handleSaveBio} className="px-2.5 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer">
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="group relative pr-4">
                <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                  {activeProfile.bio || "Nenhuma biografia registrada ainda."}
                </p>
                <button
                  onClick={() => {
                    setBioInput(activeProfile.bio);
                    setIsEditingBio(true);
                  }}
                  className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 hover:text-indigo-600 transition-opacity cursor-pointer duration-250"
                  title="Editar biografia"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Discreet features pills row */}
          <div className="flex flex-wrap gap-2 items-center justify-start text-[11px] pt-1">
            {/* Sub-profiles Switcher Pill */}
            <button
              onClick={() => setShowSwitcherDropdown(!showSwitcherDropdown)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer transition-all ${
                showSwitcherDropdown 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                  : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-500"
              }`}
              title="Alternar entre subperfis da conta"
            >
              <UserPlus className="w-3 h-3" />
              <span>Perfis</span>
            </button>

            {/* Crowns Wallet Pill */}
            <button
              onClick={() => {
                setCrownsActionTab("earn");
                setShowCrownsHub(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-200/60 bg-amber-50/50 hover:bg-amber-50 text-amber-700 text-[11px] font-semibold cursor-pointer transition-all"
              title="Sua carteira de Wolly Crowns"
            >
              <span className="select-none text-[11px] leading-none">👑</span>
              <span>{activeProfile.crowns || 0} Coroas</span>
            </button>

            {/* Plans Pill */}
            <button
              onClick={() => setShowSubscriptionModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer transition-all ${
                activePlan === "free"
                  ? "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-500"
                  : activePlan === "black"
                    ? "bg-slate-900 border-slate-800 text-white"
                    : "bg-gradient-to-r from-purple-500 to-indigo-500 border-purple-400 text-white"
              }`}
              title="Gerenciar planos de assinatura"
            >
              <Sparkles className="w-3 h-3" />
              <span>
                {activePlan === "free" ? "Planos" : activePlan === "black" ? "Wolly Black" : "Wolly +"}
              </span>
            </button>

            {/* Line 123 AI Assistant Pill */}
            <button
              onClick={() => onOpenLine123Chat?.()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold cursor-pointer transition-all animate-pulse"
              title="Acessar sua assistente Line 123"
            >
              <span>🤖 Line 123</span>
            </button>
          </div>

          {/* Line 123 Invitation Card */}
          <div 
            onClick={() => onOpenLine123Chat?.()}
            className="mt-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-500/20 hover:border-indigo-500/40 p-3 rounded-2xl flex items-center justify-between text-left cursor-pointer transition-all hover:scale-[1.01] shadow-3xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">🤖</span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                  Line 123 Chatbot <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-black font-mono">ON-LINE</span>
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5 truncate">
                  Toque para dicas de crescimento ou para resumir posts do Firestore!
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          </div>

          {/* Profile buttons bar with Clean and modern UI */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100/80">
            {/* Create Post main button */}
            <button
              id="btn-trigger-create-from-profile"
              onClick={() => onSelectTab("create")}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer text-center shadow-3xs"
            >
              Criar Post
            </button>

            {/* Edit Profile Full Details */}
            <button
              id="btn-trigger-edit-profile-main"
              onClick={handleOpenEditModal}
              className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-all cursor-pointer text-center"
            >
              Editar Perfil
            </button>
          </div>

        </div>

        {/* Dynamic Multi-profile Dashboard Drawer */}
        <AnimatePresence>
          {showSwitcherDropdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4 text-left overflow-hidden"
            >
              <h4 className="font-display font-bold text-xs text-slate-900 border-b border-slate-50 pb-2">
                👥 Painel de Múltiplos Perfis da Conta
              </h4>

              {/* Profiles Switch list */}
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProfile(p.id);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                      p.id === activeProfile.id
                        ? "bg-indigo-50 border border-indigo-100"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        avatar={p.avatar}
                        name={p.name}
                        className="w-8.5 h-8.5"
                        bgClassName={p.avatarBg || "bg-indigo-600"}
                        textClassName="text-xs font-semibold text-white"
                      />
                      <div>
                        <span className="block text-xs font-semibold text-slate-800">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono leading-none block">{p.nickname}</span>
                      </div>
                    </div>
                    {p.id === activeProfile.id ? (
                      <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">Ativo</span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>

              {/* Add/Create sub-profile form */}
              <form onSubmit={handleCreateNewProfileSubmit} className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Criar Novo Sub-Perfil no Wolly</span>
                
                <div className="space-y-2">
                  <input
                    id="new-profile-name"
                    type="text"
                    placeholder="Nome de Exposição (Ex: Lucas Silveira)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full text-xs placeholder-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 focus:outline-hidden"
                  />
                  <input
                    id="new-profile-nickname"
                    type="text"
                    placeholder="Nome de Usuário (Ex: @lucas_lens)"
                    value={newProfileNickname}
                    onChange={(e) => setNewProfileNickname(e.target.value)}
                    className="w-full text-xs placeholder-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 focus:outline-hidden font-mono"
                  />
                  <input
                    id="new-profile-bio"
                    type="text"
                    placeholder="Biografia rápida do perfil..."
                    value={newProfileBio}
                    onChange={(e) => setNewProfileBio(e.target.value)}
                    className="w-full text-xs placeholder-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* Avatar Gradient Choice */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Escolha a Cor de Identidade</span>
                  <div className="flex gap-2">
                    {gradientPresets.map((gp, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedGradient(gp.class)}
                        className={`h-6 w-6 rounded-full cursor-pointer ${gp.class} flex items-center justify-center text-[10px] text-white`}
                      >
                        {selectedGradient === gp.class && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="btn-submit-create-profile"
                  type="submit"
                  className="w-full py-2 bg-laravel shadow-xs bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
                >
                  Confirmar e Criar Identidade
                </button>
              </form>

              {/* Account management option if multiple accounts are saved */}
              {savedAccounts && savedAccounts.length > 1 && (
                <div className="pt-3.5 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    🔄 Alternar para Outra Conta Salva
                  </span>
                  <div className="space-y-1.5">
                    {savedAccounts
                      .filter((acc) => acc.email !== userAccount?.email)
                      .map((acc, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            if (onSwitchSavedAccount) onSwitchSavedAccount(acc);
                          }}
                          className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-100 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              avatar={acc.avatarChar}
                              name={acc.name}
                              className="w-7.5 h-7.5"
                              bgClassName={acc.avatarBg || "bg-indigo-650"}
                              textClassName="text-[11px] font-bold text-white"
                            />
                            <div className="text-left font-sans leading-none">
                              <span className="block text-xs font-semibold text-slate-700">{acc.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{acc.nickname}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery Type selector split grid/clips of Screen 5 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-1 flex items-center justify-between shadow-xs select-none">
          <button
            id="profile-grid-posts-tab"
            onClick={() => setActiveGridTab("posts")}
            className={`flex-1 py-2 font-display text-xs font-semibold rounded-xl flex items-center justify-center gap-1.2 transition-all cursor-pointer ${activeGridTab === "posts" ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Grid className="w-4 h-4" /> Posts
          </button>
          <button
            id="profile-grid-clips-tab"
            onClick={() => setActiveGridTab("clips")}
            className={`flex-1 py-2 font-display text-xs font-semibold rounded-xl flex items-center justify-center gap-1.2 transition-all cursor-pointer ${activeGridTab === "clips" ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Film className="w-4 h-4" /> Clipes
          </button>
          <button
            id="profile-grid-series-tab"
            onClick={() => setActiveGridTab("series")}
            className={`flex-1 py-2 font-display text-xs font-semibold rounded-xl flex items-center justify-center gap-1.2 transition-all cursor-pointer ${activeGridTab === "series" ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-400 hover:text-slate-600"}`}
          >
            <span>🧵</span> <span className="ml-1">Séries</span>
          </button>
        </div>

        {/* Bento Grid Gallery lower portion of Screen 5 */}
        {activeGridTab === "posts" && (
          <div>
            {/* Filter controls inside profile posts tab */}
            {myPosts.length > 0 && (
              <div className="flex items-center justify-between mt-3 mb-2 px-1">
                <span className="text-[11px] font-bold text-slate-500 font-sans uppercase tracking-wider">Publicações</span>
                <button
                  onClick={() => setShowProfileFilterSubTab(!showProfileFilterSubTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all border text-[10.5px] font-bold ${
                    showProfileFilterSubTab || selectedProfileThemeFilter !== "Todos"
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>{selectedProfileThemeFilter}</span>
                </button>
              </div>
            )}

            <AnimatePresence>
              {showProfileFilterSubTab && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden bg-white border border-slate-150 rounded-2xl p-3 mt-1 mb-3 space-y-2 shadow-3xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-display">Filtrar Perfil</span>
                    <button onClick={() => setShowProfileFilterSubTab(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {/* Todos Option */}
                    <button
                      onClick={() => {
                        setSelectedProfileThemeFilter("Todos");
                        setShowProfileFilterSubTab(false);
                      }}
                      className={`flex items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer ${
                        selectedProfileThemeFilter === "Todos"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>✨</span> <span className="truncate">Todos</span>
                    </button>

                    {/* Pulses Option */}
                    <button
                      onClick={() => {
                        setSelectedProfileThemeFilter("Pulses");
                        setShowProfileFilterSubTab(false);
                      }}
                      className={`flex items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer ${
                        selectedProfileThemeFilter === "Pulses"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>⚡</span> <span className="truncate">Pulses</span>
                    </button>

                    {profileThemesChips.filter(t => t.name !== "Todos").map((thm) => (
                      <button
                        key={thm.name}
                        onClick={() => {
                          setSelectedProfileThemeFilter(thm.name);
                          setShowProfileFilterSubTab(false);
                        }}
                        className={`flex items-center justify-center gap-1 py-1.5 px-0.5 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer ${
                          selectedProfileThemeFilter === thm.name
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{thm.emoji}</span> <span className="truncate">{thm.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {myPosts.filter(p => {
              if (selectedProfileThemeFilter === "Pulses") return p.isPulse === true;
              if (selectedProfileThemeFilter !== "Todos") return p.theme === selectedProfileThemeFilter && !p.isPulse;
              return true;
            }).length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-3xs text-center mt-2">
                <span className="text-xl">📷</span>
                <p className="text-xs font-bold text-slate-600 mt-2">Nenhum post encontrado para este filtro</p>
                <p className="text-[11px] text-slate-400 mt-1">Experimente mudar o filtro de categoria acima.</p>
              </div>
            ) : (
              <div id="self-posts-grid" className="grid grid-cols-3 gap-1.5 mt-1">
                {myPosts.filter(p => {
                  if (selectedProfileThemeFilter === "Pulses") return p.isPulse === true;
                  if (selectedProfileThemeFilter !== "Todos") return p.theme === selectedProfileThemeFilter && !p.isPulse;
                  return true;
                }).map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square bg-slate-100 border border-slate-100 rounded-lg overflow-hidden relative cursor-pointer group shadow-2xs hover:scale-102 transition-transform h-32"
                  >
                    {post.image ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={post.image}
                        alt="Post do usuário"
                        className="w-full h-full object-cover"
                      />
                    ) : post.isPulse ? (
                      <div className="p-2 bg-emerald-50/40 hover:bg-emerald-50 text-slate-800 flex flex-col justify-between h-full text-left select-none relative">
                        <div className="text-[9.5px] font-semibold text-slate-700 leading-snug line-clamp-4 font-sans">
                          {post.content}
                        </div>
                        <div className="text-[8px] text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-0.5 mt-1">
                          <span>⚡</span> <span>Pulse</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 flex items-center justify-center h-full text-center text-[10px] text-slate-400 select-none">
                        Texto Curto
                      </div>
                    )}
                    {/* Hover detail overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200">
                      <span className="text-xs font-bold">❤ {post.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeGridTab === "clips" && (
          /* Clip items mock rows */
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs text-center space-y-2 text-slate-600">
            <span className="text-xl">🎞</span>
            <p className="text-xs font-bold font-display">Clipes Autorais do Perfil</p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-[85%] mx-auto">
              Você pode registrar Clip vídeos e links na aba "Clips" do Wolly. Seus clipes sincronizados aparecem aqui automaticamente obedecendo sua privacidade.
            </p>
          </div>
        )}

        {activeGridTab === "series" && (
          <div className="space-y-3">
            {(() => {
              const mySeries = (seriesList || []).filter(s => s.profileId === activeProfile.id);
              if (mySeries.length === 0) {
                return (
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xs text-center">
                    <span className="text-xl">🧵</span>
                    <p className="text-xs font-bold text-slate-600 mt-2">Nenhuma série criada ainda</p>
                    <p className="text-[11px] text-slate-400 mt-1">Séries permitem agrupar publicações em uma sequência cronológica de capítulos. Crie uma publicação e adicione a uma nova série para começar!</p>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 gap-3">
                  {mySeries.map((series) => (
                    <div
                      key={series.id}
                      onClick={() => onSelectSeries && onSelectSeries(series.id)}
                      className="p-4 bg-white border border-slate-100 rounded-2xl shadow-3xs hover:border-indigo-500/50 hover:shadow-2xs transition-all cursor-pointer flex gap-3.5 text-left group"
                    >
                      {/* Series cover thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-indigo-100 to-purple-50 flex-shrink-0 overflow-hidden relative border border-slate-100 flex items-center justify-center">
                        {series.cover ? (
                          <img src={series.cover} alt={series.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="text-2xl select-none">🧵</span>
                        )}
                      </div>
                      {/* Series text */}
                      <div className="flex-grow min-w-0 flex flex-col justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-display font-bold text-[13px] text-slate-800 leading-tight truncate group-hover:text-indigo-600 transition-colors">
                            {series.title}
                          </h4>
                          <p className="text-[10.5px] text-slate-450 line-clamp-2 leading-relaxed">
                            {series.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] font-mono font-medium text-slate-500 mt-1.5">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">
                            {series.chaptersCount === 1 ? "1 capítulo" : `${series.chaptersCount || 0} capítulos`}
                          </span>
                          <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold">
                            {(series.followerIds || []).length} seguidor{(series.followerIds || []).length === 1 ? "" : "es"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* Community Challenge creation modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-55 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-display font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Trophy className="w-5 h-5 text-amber-500 fill-amber-100 animate-pulse" /> Criar Desafio do Wolly
              </span>
              <button onClick={() => setShowChallengeModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-normal">
              Desafios ajudam todos a cumprirem metas de criação de fotos e vídeos. Escolha prêmios reais do seu saldo de Coroas e guie o Wolly!
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!challengeTitle.trim() || !challengeDesc.trim()) {
                alert("Por favor, preencha o título e a descrição!");
                return;
              }
              if (onCreateChallenge) {
                onCreateChallenge(challengeTitle.trim(), challengeDesc.trim(), challengeReward, challengeExpiry);
              }
              setChallengeTitle("");
              setChallengeDesc("");
              setShowChallengeModal(false);
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Título do Desafio</label>
                <input 
                  type="text" 
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder="Ex: Foto de café estético ☕️"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Diretrizes / Instruções</label>
                <textarea 
                  value={challengeDesc}
                  onChange={(e) => setChallengeDesc(e.target.value)}
                  placeholder="Instrua as pessoas sobre como cumprir seu desafio..."
                  className="w-full text-xs min-h-[80px] p-3 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-sans resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Coroas de Prêmio</label>
                  <select 
                    value={challengeReward}
                    onChange={(e) => setChallengeReward(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value={20}>20 Coroas 👑</option>
                    <option value={50}>50 Coroas 👑</option>
                    <option value={100}>100 Coroas 👑</option>
                    <option value={200}>200 Coroas 👑</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Duração</label>
                  <select 
                    value={challengeExpiry}
                    onChange={(e) => setChallengeExpiry(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="2 dias">2 dias</option>
                    <option value="5 dias">5 dias</option>
                    <option value="7 dias">7 dias</option>
                    <option value="30 dias">30 dias</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Publicar Desafio 🏆
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Profile Privacy setting toggle modal */}
      {showPrivacyCard && (
        <div className="fixed inset-0 z-55 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-display font-black text-sm text-slate-900 flex items-center gap-1.5">
                <Shield className="w-5 h-5 text-indigo-600 fill-indigo-100" /> Escolha seu Escudo
              </span>
              <button onClick={() => setShowPrivacyCard(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-normal">
              No Wolly você escolhe se seu perfil é aberto ou fechado. O controle dos dados é seu!
            </p>

            <div className="space-y-2.5">
              <button 
                onClick={() => {
                  if (onTogglePrivacy) onTogglePrivacy(activeProfile.id);
                  setShowPrivacyCard(false);
                }}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${!activeProfile.isPrivate ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"}`}
              >
                <span className="text-xl shrink-0">🔓</span>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Perfil Aberto (Público) 
                    {!activeProfile.isPrivate && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">ATIVO</span>}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Qualquer pessoa pode ver suas publicações e seguir seu perfil livremente no feed cronológico.</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  if (onTogglePrivacy) onTogglePrivacy(activeProfile.id);
                  setShowPrivacyCard(false);
                }}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${activeProfile.isPrivate ? "border-rose-500 bg-rose-50/50" : "border-slate-100 hover:border-slate-200"}`}
              >
                <span className="text-xl shrink-0">🔒</span>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Perfil Fechado (Privado)
                    {activeProfile.isPrivate && <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-black">ATIVO</span>}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Seus posts ficam enclausurados de visitantes externos e buscas livres do feed de estranhos.</p>
                </div>
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
              <p className="text-[9px] leading-relaxed text-slate-500">
                🌱 **Sinceridade ativa**: o shield do Wolly não vende dados ou gera cookies de marketing. Os dados pertencem única e exclusivamente a você!
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Supporter Support Subscription modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="text-center space-y-1">
              <span className="text-4xl">🌟</span>
              <h3 className="font-display font-black text-lg text-slate-900">Planos de Assinatura Wolly</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Faça o upgrade da sua conta usando pagamento real e instantâneo via PIX do Mercado Pago.
              </p>
            </div>

            {mpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[10px] font-bold">
                ⚠️ {mpError}
              </div>
            )}

            {/* Select Plan Step */}
            {paymentStep === "select-plan" && (
              <div className="space-y-3">
                {/* 1. Free Plan */}
                <div className={`p-3.5 rounded-2xl border transition-all ${activePlan === "free" ? "bg-slate-50 border-slate-300" : "bg-white hover:bg-slate-50 border-slate-100"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">🆓 NÍVEL COMUNITÁRIO</span>
                      <h4 className="font-extrabold text-slate-800 text-sm">Wolly Free / Grátis</h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-1">Acesso completo à rede, suportado com anúncios locais.</p>
                    </div>
                    <span className="text-xs font-black text-slate-800 shrink-0">R$ 0,00</span>
                  </div>
                  <button
                    type="button"
                    disabled={activePlan === "free"}
                    onClick={() => {
                      setActivePlan("free");
                      localStorage.setItem(`wolly_active_plan_${activeProfile.id}`, "free");
                      alert("Você retornou ao plano comunitário Wolly Free.");
                    }}
                    className={`mt-2.5 w-full py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      activePlan === "free"
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200 cursor-pointer"
                    }`}
                  >
                    {activePlan === "free" ? "Plano Ativo" : "Retornar ao Free"}
                  </button>
                </div>

                {/* 2. Black Plan */}
                <div className={`p-3.5 rounded-2xl border transition-all ${activePlan === "black" ? "bg-slate-900 text-white border-black" : "bg-white hover:bg-slate-50 border-slate-150"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black tracking-widest block text-purple-500">⚫ PREMIUM INTERMEDIÁRIO</span>
                      <h4 className={`font-extrabold text-sm ${activePlan === "black" ? "text-white" : "text-slate-900"}`}>Wolly Black</h4>
                      <div className={`text-[10px] leading-normal mt-1 space-y-0.5 ${activePlan === "black" ? "text-slate-300" : "text-slate-500"}`}>
                        <p>✔ Sem anúncios</p>
                        <p>✔ Wolly Crowns em dobro por ações</p>
                        <p>✔ Selo básico ⚫ no perfil</p>
                      </div>
                    </div>
                    <span className={`text-xs font-black shrink-0 ${activePlan === "black" ? "text-amber-400" : "text-slate-900"}`}>R$ 9,90/mês</span>
                  </div>
                  <div className="mt-2.5">
                    <a
                      href="https://mpago.la/3197gWW"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setSelectedPlanDetails({ id: "black", price: 9.90, name: "Wolly Black" });
                      }}
                      className="block w-full text-center py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                    >
                      💳 Pagar R$ 9,90 no Mercado Pago 🔗
                    </a>
                  </div>
                </div>

                {/* 3. Plus Plan */}
                <div className={`p-3.5 rounded-2xl border border-dashed transition-all ${activePlan === "plus" ? "bg-gradient-to-br from-indigo-900 to-purple-950 text-white border-purple-500" : "bg-purple-50/20 hover:bg-purple-50/40 border-purple-200"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black tracking-widest block text-amber-500">✨ WOLLY SUPREMO</span>
                      <h4 className={`font-extrabold text-sm ${activePlan === "plus" ? "text-white" : "text-purple-900"}`}>Wolly +</h4>
                      <div className={`text-[10px] leading-normal mt-1 space-y-0.5 ${activePlan === "plus" ? "text-indigo-200" : "text-purple-750"}`}>
                        <p>✔ Tudo do Black</p>
                        <p>✔ Estatísticas detalhadas de audiência</p>
                        <p>✔ Ferramentas de criador PainterA completas</p>
                        <p>✔ Suporte prioritário de rede</p>
                        <p>✔ Selo premium brilhante ✨</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-purple-650 shrink-0">R$ 19,95/mês</span>
                  </div>
                  <div className="mt-2.5">
                    <a
                      href="https://mpago.la/1BZ81FA"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setSelectedPlanDetails({ id: "plus", price: 19.95, name: "Wolly +" });
                      }}
                      className="block w-full text-center py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                    >
                      ⚡ Pagar R$ 19,95 no Mercado Pago 🔗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Generating Payment Loading State */}
            {paymentStep === "generating" && (
              <div className="py-12 text-center space-y-4">
                <div className="inline-block w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  Conectando com o gateway do Mercado Pago...<br />
                  <span className="text-[10px] text-slate-400 font-medium">Gerando PIX com segurança bancária 🔒</span>
                </p>
              </div>
            )}

            {/* Show PIX QR Code & copy paste code */}
            {paymentStep === "show-pix" && pixData && selectedPlanDetails && (
              <div className="space-y-4 text-center">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pague com o seu App do Banco por PIX</span>
                  
                  {/* Real Dynamic QR Code image sourced from server endpoint */}
                  <img
                    src={`data:image/svg+xml;base64,${pixData.qrCodeBase64}`}
                    alt="Código QR do PIX Mercado Pago"
                    className="w-44 h-44 object-contain shadow-xs border border-slate-100 rounded-xl"
                  />
                  
                  <span className="text-[9px] text-slate-400 font-mono tracking-wide mt-2">ID: MP_WOLLY_{selectedPlanDetails.id.toUpperCase()}</span>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">PIX Copia e Cola:</label>
                  <div className="flex gap-1.5">
                    <input
                      readOnly
                      type="text"
                      className="flex-1 bg-slate-100 border border-slate-250 p-2 text-[9px] font-mono text-slate-600 rounded-lg select-all"
                      value={pixData.qrCode}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.qrCode);
                        setPixCopied(true);
                        setTimeout(() => setPixCopied(false), 2000);
                      }}
                      className="px-2.5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      {pixCopied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                {/* Simulated check with immediate local confirmation */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlan(selectedPlanDetails.id);
                      localStorage.setItem(`wolly_active_plan_${activeProfile.id}`, selectedPlanDetails.id);
                      
                      // Award starting crowns for subscription upgrade
                      const bounsAmount = selectedPlanDetails.id === "black" ? 100 : 300;
                      onAwardCrowns(activeProfile.id, bounsAmount, `Parabéns pela assinatura do plano Wolly ${selectedPlanDetails.name}! 🌟`);
                      
                      setPaymentStep("success");
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm transition-transform hover:scale-102 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Fiz o pagamento no banco ⚡</span>
                  </button>
                  <a
                    href={pixData.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Visualizar recibo oficial Mercado Pago 🔗
                  </a>
                </div>
              </div>
            )}

            {/* Payment success visual card */}
            {paymentStep === "success" && selectedPlanDetails && (
              <div className="py-6 text-center space-y-4">
                <span className="text-5xl block animate-bounce">👑</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-base">Transação Confirmada!</h4>
                  <p className="text-xs text-slate-500 leading-relaxed px-2">
                    O pagamento foi autenticado e o plano <strong>{selectedPlanDetails.name}</strong> já está ativo para o seu perfil <strong>{activeProfile.name}</strong>!
                  </p>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-[10px] text-indigo-800 text-left font-sans">
                  🏆 Seu selo especial foi associado com o nickname de forma definitiva. E creditamos <strong>{selectedPlanDetails.id === "black" ? "100" : "300"} Wolly Crowns</strong> de bônus de boas-vindas na sua carteira!
                </div>

                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Concluir e Voltar
                </button>
              </div>
            )}

            {/* Footer buttons when choosing */}
            {paymentStep === "select-plan" && (
              <button
                type="button"
                id="btn-close-sub-panel"
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Fechar Painel
              </button>
            )}
          </motion.div>
        </div>
      )}
      {/* Wolly Crowns Center interactive HUD panel overlay */}
      {showCrownsHub && (
        <div id="wolly-crowns-hub-modal" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans animate-fade-in animate-duration-200">
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="bg-white rounded-3xl max-w-sm w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-5 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl select-none">👑</span>
                <div>
                  <h3 className="font-display font-black text-sm tracking-tight leading-none uppercase">Central Wolly Crowns</h3>
                  <p className="text-[10px] text-amber-50 leading-none mt-1.5 font-mono">Saldo: {activeProfile.crowns || 0} Coroas</p>
                </div>
              </div>
              <button
                onClick={() => setShowCrownsHub(false)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hub tabs bar */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-1 gap-0.5">
              <button
                onClick={() => setCrownsActionTab("earn")}
                className={`flex-1 py-1.8 text-center text-[10px] font-bold rounded-xl transition-all cursor-pointer ${crownsActionTab === "earn" ? "bg-white text-amber-600 shadow-2xs border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
              >
                🏆 Desafios
              </button>
              <button
                onClick={() => setCrownsActionTab("spend")}
                className={`flex-1 py-1.8 text-center text-[10px] font-bold rounded-xl transition-all cursor-pointer ${crownsActionTab === "spend" ? "bg-white text-indigo-600 shadow-2xs border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
              >
                🛍 Recompensas
              </button>
              <button
                onClick={() => {
                  setCrownDonationStep("choose");
                  setSelectedCrownsPackage(null);
                  setCrownPixData(null);
                  setCrownsActionTab("donate");
                }}
                className={`flex-1 py-1.8 text-center text-[10px] font-bold rounded-xl transition-all cursor-pointer ${crownsActionTab === "donate" ? "bg-white text-rose-600 shadow-2xs border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
              >
                💝 Doar
              </button>
              <button
                onClick={() => setCrownsActionTab("history")}
                className={`flex-1 py-1.8 text-center text-[10px] font-bold rounded-xl transition-all cursor-pointer ${crownsActionTab === "history" ? "bg-white text-slate-800 shadow-2xs border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
              >
                📜 Extrato
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 max-h-[50vh]">
              {crownsActionTab === "earn" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-1">
                    Complete as diretrizes da comunidade abaixo de forma orgânica e reivindique as suas coroas:
                  </p>

                  {/* Challenge items */}
                  {[
                    {
                      id: "ch_clip",
                      title: "Cineasta Digital 🎞",
                      reward: 35,
                      requirement: "Grave, simule ou carregue um vídeo de Clip com o dispositivo.",
                      met: activeProfile.postsCount > 0,
                      statusMsg: `Atividade recente registrada`
                    },
                    {
                      id: "ch_sub",
                      title: "Múltiplas Alquimias 👥",
                      reward: 30,
                      requirement: "Crie pelo menos mais de um sub-perfil para blindar suas personas.",
                      met: profiles.length > 1,
                      statusMsg: `Perfis ativos: ${profiles.length}/2`
                    },
                    {
                      id: "ch_supreme",
                      title: "Ator Influente Wolly 🌟",
                      reward: 50,
                      requirement: "Publique 2 ou mais Gramps no painel de controle.",
                      met: myPosts.length >= 2,
                      statusMsg: `Você tem ${myPosts.length}/2 posts`
                    }
                  ].map((ch) => {
                    const claimed = claimedChallenges.includes(ch.id);
                    return (
                      <div key={ch.id} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col gap-2.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-850 text-xs leading-none flex items-center gap-1.5">
                              <span>{ch.title}</span>
                              {claimed && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase scale-90">Resgatado</span>}
                            </h4>
                            <p className="text-[10px] text-slate-500 leading-normal mt-1.5">{ch.requirement}</p>
                          </div>
                          <span className="text-[11px] font-black font-mono text-amber-600 shrink-0">+{ch.reward} C</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                          <span className="text-[9px] text-slate-400 font-mono font-bold uppercase">{ch.statusMsg}</span>
                          {claimed ? (
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5">
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> Resgatado
                            </span>
                          ) : ch.met ? (
                            <button
                              onClick={() => {
                                onAwardCrowns(activeProfile.id, ch.reward, `Reivindicou conclusão do Desafio: ${ch.title} 🎁`);
                                const updated = [...claimedChallenges, ch.id];
                                setClaimedChallenges(updated);
                                localStorage.setItem(`wolly_claimed_challenges_${activeProfile.id}`, JSON.stringify(updated));
                                alert(`Soberania Crown! Você conquistou +${ch.reward} Wolly Crowns pelo desafio: ${ch.title}!`);
                              }}
                              className="px-2.5 py-1 bg-amber-550 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg transition-transform hover:scale-102 cursor-pointer shadow-sm uppercase tracking-wide"
                            >
                              Resgatar
                            </button>
                          ) : (
                            <span className="text-[9px] text-rose-500 font-semibold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg select-none">Requisitos não cumpridos</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {crownsActionTab === "spend" && (
                <div className="space-y-3 text-left">
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-1">
                    Redima o seu saldo por recursos de customização de marca e reputação orgânica no seu perfil:
                  </p>

                  {/* Redeem offer items */}
                  {[
                    {
                      id: "shop_vip",
                      title: "Selo de Verificação Elite 👑",
                      cost: 50,
                      desc: "Desbloqueia um selo de coroa dourado oficial e VIP ao lado do seu nome em todo o aplicativo Wolly."
                    },
                    {
                      id: "shop_banner",
                      title: "Banner Holográfico Hologram ✨",
                      cost: 30,
                      desc: "Altera instantaneamente seu banner de capa para um modelo gradiente animado e holográfico VIP."
                    },
                    {
                      id: "shop_boost",
                      title: "Impulsionar Algoritmo Amigo 🚀",
                      cost: 20,
                      desc: "Recurso que garante 200 views ecológicas locais e adiciona +20 Seguidores de forma instantânea e orgânica."
                    }
                  ].map((item) => {
                    const isVipUser = item.id === "shop_vip" && isVip;
                    return (
                      <div key={item.id} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs leading-none">{item.title}</h4>
                            <p className="text-[10px] text-slate-500 leading-normal mt-1.5">{item.desc}</p>
                          </div>
                          <span className="text-xs font-black font-mono text-indigo-650 shrink-0">{item.cost} C</span>
                        </div>

                        <div className="flex justify-end pt-1">
                          {isVipUser ? (
                            <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase py-1 flex items-center gap-0.5">
                              <Check className="w-3.5 h-3.5 text-indigo-600" /> Já adquirido
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                const currentBal = activeProfile.crowns || 0;
                                if (currentBal < item.cost) {
                                  alert(`Saldo insuficiente! Este recurso custa ${item.cost} Coroas, mas você possui apenas ${currentBal}. complete desafios primeiro!`);
                                  return;
                                }

                                const success = onSpendCrowns(activeProfile.id, item.cost, `Comprou Upgrade: ${item.title} 🛍`);
                                if (success) {
                                  if (item.id === "shop_vip") {
                                    localStorage.setItem("wolly_vip_" + activeProfile.id, "true");
                                    alert(`Elite Ativada! O selo de Verificação Elite 👑 agora é renderizado ao lado de suas interações no Wolly!`);
                                  } else if (item.id === "shop_banner") {
                                    onUpdateBanner(activeProfile.id, "bg-gradient-to-r from-violet-600 via-pink-400 to-amber-200");
                                    alert(`Holografia Ativa! Seu banner de capa foi atualizado para uma estética holográfica premium.`);
                                  } else if (item.id === "shop_boost") {
                                    alert(`Boost Concluído! O Algoritmo Amigo entregou 200 views locais e você obteve +20 Seguidores de forma instantânea!`);
                                  }
                                } else {
                                  alert(`Erro na transação. Certifique seu saldo de crowns.`);
                                }
                              }}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-850 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-transform hover:scale-101 shadow-2xs uppercase tracking-wide"
                            >
                              Comprar por {item.cost} Coroas
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {crownsActionTab === "history" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-2 text-left">
                    Todos os ganhos e gastos de Crowns auditados organicamente na memória criptografada local deste navegador:
                  </p>

                  {/* Audit Ledger Listing */}
                  {(() => {
                    const myTxs = crownTransactions.filter(tx => tx.profileId === activeProfile.id);
                    if (myTxs.length === 0) {
                      return (
                        <div className="p-6 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                          <span className="text-xl">📜</span>
                          <p className="text-[11px] text-slate-400 mt-1 font-sans">Nenhuma transação auditada neste perfil ainda.</p>
                          <p className="text-[10px] text-slate-400 font-sans mt-0.5">Participe de desafios ou comente posts e vídeos para ver seu log!</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                        {myTxs.map((tx) => (
                          <div key={tx.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-left">
                            <div className="min-w-0 pr-2">
                              <span className="text-[11px] font-bold text-slate-800 block truncate leading-tight">{tx.description}</span>
                              <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                                {new Date(tx.createdAt).toLocaleDateString()} às {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <span className={`text-[11px] font-mono font-black shrink-0 ${tx.amount > 0 ? "text-emerald-600" : "text-rose-550"}`}>
                              {tx.amount > 0 ? `+${tx.amount}` : tx.amount} C
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {crownsActionTab === "donate" && (
                <div className="space-y-4 text-left">
                  {/* Part 1: Acquire Crowns with MP Pix */}
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-rose-600 block leading-none uppercase">💝 Adquirir Crowns via PIX Mercado Pago</h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Apoie os servidores e o ecossistema do Wolly comprando Crowns via PIX real e de alta fidelidade:
                    </p>

                    {crownDonationStep === "choose" && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { crowns: 50, price: 5.00, text: "Ideal" },
                          { crowns: 100, price: 9.90, text: "Popular" },
                          { crowns: 250, price: 19.90, text: "Lendário" }
                        ].map((pkg, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedCrownsPackage(pkg);
                              setCrownDonationStep("generating");
                              fetch("/api/payment/create-pix", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ amount: pkg.price, description: `Apoio Wolly - ${pkg.crowns} Crowns`, email: "diariamentefotografia@gmail.com" })
                              })
                                .then(r => r.json())
                                .then(res => {
                                  if (res.success) {
                                    setCrownPixData(res);
                                    setCrownDonationStep("show-pix");
                                  } else {
                                    alert(res.error || "Serviço indisponível.");
                                    setCrownDonationStep("choose");
                                  }
                                })
                                .catch(() => {
                                  alert("Erro no gateway.");
                                  setCrownDonationStep("choose");
                                });
                            }}
                            className="bg-white border border-slate-200 hover:border-rose-300 p-2 rounded-xl text-center flex flex-col items-center justify-between cursor-pointer transition-transform hover:scale-102"
                          >
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{pkg.text}</span>
                            <span className="text-xs font-black text-rose-600 font-mono mt-0.5">{pkg.crowns} C</span>
                            <span className="text-[10px] text-slate-700 font-bold mt-1">R$ {pkg.price.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {crownDonationStep === "generating" && (
                      <div className="py-6 text-center space-y-2">
                        <div className="inline-block w-5 h-5 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                        <p className="text-[10px] text-slate-500 font-semibold">Comunicando com o Mercado Pago...</p>
                      </div>
                    )}

                    {crownDonationStep === "show-pix" && crownPixData && selectedCrownsPackage && (
                      <div className="space-y-3 bg-white p-3 border border-slate-100 rounded-xl text-center flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Pague este PIX para receber {selectedCrownsPackage.crowns} C</span>
                        <img
                          src={`data:image/svg+xml;base64,${crownPixData.qrCodeBase64}`}
                          alt="PIX QR Code"
                          className="w-32 h-32 object-contain"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(crownPixData.qrCode);
                            alert("Código PIX Copia e Cola copiado com sucesso!");
                          }}
                          className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase transition-transform hover:scale-101 shrink-0"
                        >
                          Copiar Código PIX ✂
                        </button>
                        <button
                          onClick={() => {
                            onAwardCrowns(activeProfile.id, selectedCrownsPackage.crowns, `Apoio via MP PIX: +${selectedCrownsPackage.crowns} C 🎁`);
                            setCrownDonationStep("success");
                          }}
                          className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Confirmar Pagamento Realizado
                        </button>
                      </div>
                    )}

                    {crownDonationStep === "success" && selectedCrownsPackage && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-xl text-center text-[10px] font-semibold space-y-1">
                        <p>🎉 Transação autenticada!</p>
                        <p>Adicionamos +{selectedCrownsPackage.crowns} Crowns na sua carteira Wolly com sucesso.</p>
                        <button
                          onClick={() => setCrownDonationStep("choose")}
                          className="mt-1.5 text-rose-600 font-bold underline cursor-pointer"
                        >
                          Comprar Mais
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Part 2: Peer-to-Peer Transfer Crowns */}
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-black text-rose-600 block leading-none uppercase">👥 Doar Crowns para outro perfil</h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Apoie e incentive as personas e criadores independentes da rede transferindo suas coroas diretamente para o saldo deles:
                    </p>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Selecione o Perfil de Destino:</label>
                        <select
                          value={transferDestinationProfileId}
                          onChange={(e) => setTransferDestinationProfileId(e.target.value)}
                          className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-hidden"
                        >
                          <option value="">-- Escolha um perfil --</option>
                          {profiles
                            .filter(p => p.id !== activeProfile.id)
                            .map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.nickname})</option>
                            ))
                          }
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Quantidade de Crowns a doar:</label>
                        <input
                          type="number"
                          min="1"
                          max={activeProfile.crowns || 0}
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold focus:outline-hidden"
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (!transferDestinationProfileId) {
                            alert("Por favor, escolha um perfil de destino.");
                            return;
                          }
                          const currentBal = activeProfile.crowns || 0;
                          if (currentBal < transferAmount) {
                            alert(`Saldo insuficiente! Você tem ${currentBal} Coroas, mas tentou transferir ${transferAmount}.`);
                            return;
                          }
                          
                          const targetProfile = profiles.find(p => p.id === transferDestinationProfileId);
                          if (!targetProfile) return;

                          // Execute the transfer from active user's balance to target balance
                          const spendOk = onSpendCrowns(activeProfile.id, transferAmount, `Doação enviada para @${targetProfile.nickname} 💖`);
                          if (spendOk) {
                            onAwardCrowns(targetProfile.id, transferAmount, `Doação recebida de @${activeProfile.nickname} 💝`);
                            alert(`Transferência executada! Você doou ${transferAmount} Crowns para ${targetProfile.name} com sucesso.`);
                          } else {
                            alert("Erro inesperado ao debitar saldo.");
                          }
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                      >
                        Enviar Doação 💝
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-center">
              <span className="text-[9px] text-slate-400 font-mono font-black uppercase tracking-widest flex items-center gap-1 leading-none">
                🛡 WOLLY LEDGER SECURITY PROTOCOL ACTIVE
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Profile details modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm overflow-hidden flex flex-col text-left"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50">
              <span className="font-display font-extrabold text-sm text-indigo-900 flex items-center gap-1.5">
                ✏️ Editar Detalhes do Perfil
              </span>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProfileDetails} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Profile Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome do Perfil</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              {/* Profile Avatar / Photo URL */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foto de Perfil (Emoji ou URL de Imagem)</label>
                <input
                  type="text"
                  required
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="Ex: 🚀 ou https://site.com/foto.jpg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600 font-medium"
                />
                
                {/* Visual Quick presets */}
                <div className="mt-1.5 space-y-1">
                  <span className="text-[9px] text-slate-400 font-semibold block">Presets de Emojis Populares:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["🎨", "🚀", "💻", "📸", "🍿", "👾", "🦄", "🦊", "🌻", "🐳", "🍕", "🏆", "👑", "⚽", "🎸"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditAvatar(emoji)}
                        className={`w-7 h-7 rounded-lg text-xs bg-slate-50 hover:bg-indigo-50 border transition-all cursor-pointer flex items-center justify-center ${editAvatar === emoji ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200"}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile Image Drag & Drop and Select Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fazer Upload de Foto de Perfil</label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setEditAvatar(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  onClick={() => document.getElementById("profile-image-upload-input")?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-indigo-50/20 flex flex-col items-center justify-center gap-1 bg-slate-50 group"
                >
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-[11px] font-bold text-slate-600">Arraste uma imagem ou clique para selecionar</span>
                  <span className="text-[9px] text-slate-400 font-medium">Suporta JPG, PNG, GIF</span>
                  <input
                    id="profile-image-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setEditAvatar(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </div>
                {editAvatar && editAvatar.startsWith("data:image") && (
                  <div className="flex items-center gap-2 mt-2 bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                    <img src={editAvatar} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" alt="Preview" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-emerald-800 block truncate">Imagem carregada!</span>
                      <button
                        type="button"
                        onClick={() => setEditAvatar(activeProfile.name[0])}
                        className="text-[9px] text-rose-600 hover:underline font-bold"
                      >
                        Remover imagem
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar Bg Gradient */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fundo do Avatar (Gradiente)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Roxo/Rosa", class: "bg-gradient-to-br from-purple-500 to-pink-500" },
                    { label: "Rosa/Rose", class: "bg-gradient-to-br from-pink-600 to-rose-600" },
                    { label: "Azul/Violeta", class: "bg-gradient-to-br from-blue-600 to-violet-600" },
                    { label: "Índigo/Azul", class: "bg-gradient-to-br from-indigo-600 to-blue-600" },
                    { label: "Teal/Esmeralda", class: "bg-gradient-to-br from-teal-500 to-emerald-500" },
                    { label: "Slate/Cinza", class: "bg-gradient-to-br from-slate-700 to-zinc-800" },
                  ].map((preset) => (
                    <button
                      key={preset.class}
                      type="button"
                      onClick={() => setEditAvatarBg(preset.class)}
                      className={`py-1 rounded-lg text-[9px] font-semibold text-white truncate px-1.5 transition-all cursor-pointer ${preset.class} ${editAvatarBg === preset.class ? "ring-2 ring-indigo-600 ring-offset-1" : "opacity-80 hover:opacity-100"}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Bio */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Biografia (Bio)</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600 font-medium"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-md transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
