/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { Home, Film, Plus, Sparkles, User, ShieldAlert, Trash2, Lock, ArrowLeft, Check, ChevronRight, UserPlus, Share2, Copy, X, MessageSquare, Send, Download, Key, ShieldCheck, Github, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import UserAvatar from "./components/UserAvatar";

import { db, auth, handleFirestoreError, OperationType, registerFirestoreErrorHandler } from "./firebase.ts";
import { signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  getDocFromServer,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query, 
  where
} from "firebase/firestore";

import { Profile, Post, Clip, PostIt, Ink, InkMessage, CrownTransaction, Challenge, Series, FeedPreferences, WollySearch } from "./types";
import { parseExpirationMs } from "./lib/challengeUtils";
import { processMentionsInContent } from "./lib/mentions";
import { extractNewsTopic } from "./lib/newsUtils";
import FeedView from "./components/FeedView";
import ClipsView from "./components/ClipsView";
import CreateView from "./components/CreateView";
import MessagesView from "./components/MessagesView";
import ProfileView from "./components/ProfileView";
import SeriesView from "./components/SeriesView";
import TransparencyCenter from "./components/TransparencyCenter";
import InkRoom from "./components/InkRoom";
import GroupsView from "./components/GroupsView";
import HashtagView from "./components/HashtagView";
import ChallengesView from "./components/ChallengesView";
import SearchesView from "./components/SearchesView";
import wollyLogo from "./assets/images/wolly_logo.png";

function cleanUndefined<T extends object>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === "object" && item !== null ? cleanUndefined(item) : item)) as any;
  }
  const newObj = { ...obj } as any;
  Object.keys(newObj).forEach((key) => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    } else if (typeof newObj[key] === "object" && newObj[key] !== null) {
      newObj[key] = cleanUndefined(newObj[key]);
    }
  });
  return newObj;
}

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

// Preloaded initial profiles showing realistic data matching SCREEN 5
const INITIAL_PROFILES: Profile[] = [];

// Preloaded default Series matching the UX spec
const INITIAL_SERIES: Series[] = [];

// Preloaded chronological initial posts
const INITIAL_POSTS: Post[] = [];

// Preloaded initial vertical video clips matching SCREEN 3
const INITIAL_CLIPS: Clip[] = [
  {
    id: "clip_sample_1",
    profileId: "wolly_official",
    authorName: "Wolly Oficial",
    authorNickname: "wolly.oficial",
    authorAvatar: "W",
    authorAvatarBg: "bg-indigo-600",
    videoPlaceholder: "from-indigo-950 via-purple-900 to-black",
    description: "Boas-vindas aos Clips do Wolly! Vídeos curtos em loop, com soberania de dados e sem rastreamento.",
    location: "São Paulo, SP",
    likes: 142,
    likedBy: [],
    theme: "Entretenimento",
    hashtags: ["WollyClips", "SoberaniaDigital", "Tech"],
    createdAt: new Date().toISOString(),
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    videoSpeed: 1,
    videoTrimStart: 0,
    videoTrimEnd: 15,
    comments: [
      {
        id: "c_clip1",
        profileId: "lucas_dev",
        authorName: "Lucas Dev",
        authorNickname: "@lucas.dev",
        authorAvatar: "L",
        authorAvatarBg: "bg-blue-600",
        text: "Incrível! O feed de vídeos curtos carrega super rápido sem anúncios irritantes 🔥",
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: "clip_sample_2",
    profileId: "comunidade_wolly",
    authorName: "Comunidade Wolly",
    authorNickname: "comunidade",
    authorAvatar: "C",
    authorAvatarBg: "bg-emerald-600",
    videoPlaceholder: "from-emerald-950 via-zinc-900 to-black",
    description: "Veja como gravar e personalizar seus próprios clips direto da câmera do seu celular ou enviar arquivos da galeria!",
    location: "Brasil",
    likes: 98,
    likedBy: [],
    theme: "Educativo",
    hashtags: ["Tutorial", "Clips", "Criadores"],
    createdAt: new Date().toISOString(),
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    videoSpeed: 1,
    videoTrimStart: 0,
    videoTrimEnd: 12,
    comments: []
  },
  {
    id: "clip_sample_3",
    profileId: "pet_lovers",
    authorName: "Pet Lovers",
    authorNickname: "petlovers",
    authorAvatar: "P",
    authorAvatarBg: "bg-amber-600",
    videoPlaceholder: "from-amber-950 via-stone-900 to-black",
    description: "Momentos divertidos no parque! 🐶 Momentos especiais gravados na rede.",
    location: "Parque Ibirapuera",
    likes: 215,
    likedBy: [],
    theme: "Cachorro",
    hashtags: ["Pets", "Cachorros", "PetsOfWolly"],
    createdAt: new Date().toISOString(),
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyplays.mp4",
    videoSpeed: 1,
    videoTrimStart: 0,
    videoTrimEnd: 10,
    comments: []
  }
];

export default function App() {
  const [userAccount, setUserAccount] = useState<{ email: string; nickname: string; name: string } | null>(() => {
    const saved = localStorage.getItem("wolly_user_account");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [savedAccounts, setSavedAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem("wolly_saved_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    const oldAccount = localStorage.getItem("wolly_user_account");
    if (oldAccount) {
      try {
        const parsed = JSON.parse(oldAccount);
        let oldProfiles = [];
        try {
          const profilesStr = localStorage.getItem("wolly_profiles");
          oldProfiles = profilesStr ? JSON.parse(profilesStr) : [];
        } catch {}
        const oldProfileId = localStorage.getItem("wolly_current_profile_id") || "";
        const m = {
          email: parsed.email,
          nickname: parsed.nickname,
          name: parsed.name,
          password: "wolly",
          avatarChar: parsed.name?.[0]?.toUpperCase() || "W",
          avatarBg: "bg-indigo-600",
          profiles: oldProfiles,
          currentProfileId: oldProfileId
        };
        const list = [m];
        localStorage.setItem("wolly_saved_accounts", JSON.stringify(list));
        return list;
      } catch {
        return [];
      }
    }
    return [];
  });

  const [authMode, setAuthMode] = useState<"saved" | "login" | "signup">(() => {
    const saved = localStorage.getItem("wolly_saved_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return "saved";
      } catch {}
    }
    const oldAccount = localStorage.getItem("wolly_user_account");
    if (oldAccount) return "saved";
    return "signup";
  });

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpNickname, setSignUpNickname] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpBirthYear, setSignUpBirthYear] = useState("");
  const [signUpError, setSignUpError] = useState("");

  const [loginEmailOrNickname, setLoginEmailOrNickname] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBirthYear, setLoginBirthYear] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Email 6-digit verification modal states
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationDevCode, setVerificationDevCode] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [pendingVerificationCallback, setPendingVerificationCallback] = useState<(() => Promise<void> | void) | null>(null);

  const sendVerificationCode = async (email: string, name?: string): Promise<boolean> => {
    try {
      setVerificationEmail(email);
      setVerificationCodeInput("");
      setVerificationError("");
      setVerificationMessage("Enviando código de verificação de 6 dígitos para seu e-mail...");
      setVerificationModalOpen(true);

      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();

      if (data.success) {
        setVerificationMessage(data.message || `Código enviado para ${email}`);
        if (data.devCode) {
          setVerificationDevCode(data.devCode);
        } else {
          setVerificationDevCode(null);
        }
        return true;
      } else {
        setVerificationError(data.error || "Falha ao enviar código de verificação.");
        return false;
      }
    } catch (err: any) {
      console.error("Erro ao solicitar código:", err);
      setVerificationError("Erro de comunicação com o servidor.");
      return false;
    }
  };

  const handleConfirmVerificationCode = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!verificationCodeInput.trim() || verificationCodeInput.trim().length !== 6) {
      setVerificationError("Por favor, digite o código completo de 6 dígitos enviado por e-mail.");
      return;
    }

    setVerificationError("");
    setVerificationLoading(true);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code: verificationCodeInput.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setVerificationModalOpen(false);
        setVerificationLoading(false);
        if (pendingVerificationCallback) {
          const callback = pendingVerificationCallback;
          setPendingVerificationCallback(null);
          await callback();
        }
      } else {
        setVerificationError(data.error || "Código incorreto. Verifique seu e-mail e tente novamente.");
        setVerificationLoading(false);
      }
    } catch (err: any) {
      console.error("Erro na verificação do código:", err);
      setVerificationError("Erro ao conectar ao servidor para verificar o código.");
      setVerificationLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<string>("feed");
  const [logoUrl, setLogoUrl] = useState("https://lh3.googleusercontent.com/d/1xcNOkJuZ32J5wY3xQGSjNsZm8DtSBZay");
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem("wolly_profiles");
    try {
      let baseProfiles: Profile[] = [];
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          baseProfiles = parsed
            .filter((p: any) => p.id !== "ana" && p.id !== "wolly_official" && p.nickname !== "@ana.maria" && p.nickname !== "@wolly.oficial")
            .map((p: any) => ({
              ...p,
              followingIds: p.followingIds || [],
              boosterFollowers: p.boosterFollowers || 0,
              followersCount: p.followersCount || 0,
              followingCount: p.followingCount || 0,
              postsCount: p.postsCount || 0,
              crowns: p.crowns !== undefined ? p.crowns : 10,
              bio: p.bio || "Fico feliz em fazer parte do Wolly sem algoritmos! 🌱",
            }));
        }
      }
      return baseProfiles;
    } catch {
      return [];
    }
  });
  const [currentProfileId, setCurrentProfileId] = useState<string>(() => {
    return localStorage.getItem("wolly_current_profile_id") || "";
  });
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem("wolly_posts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p: Post) => p.profileId !== "ana" && p.authorNickname !== "@ana.maria" && p.authorNickname !== "@wolly.oficial"
          );
        }
      }
    } catch {}
    return [];
  });
  const [clips, setClips] = useState<Clip[]>(() => {
    try {
      const saved = localStorage.getItem("wolly_clips");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(
            (c: Clip) => c.profileId !== "ana" && c.profileId !== "wolly_official" && c.authorName !== "Ana Maria" && c.authorName !== "Wolly Oficial"
          );
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return INITIAL_CLIPS;
  });
  const [searches, setSearches] = useState<WollySearch[]>([]);
  const [series, setSeries] = useState<Series[]>(() => {
    try {
      const saved = localStorage.getItem("wolly_series");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: Series) => s.profileId !== "ana" && s.authorNickname !== "ana.maria");
        }
      }
    } catch {}
    return [];
  });
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);

  // PWA and url routing simulator states
  const [currentUrlPath, setCurrentUrlPath] = useState<string>("feed");
  const [urlInputText, setUrlInputText] = useState<string>("feed");
  const [resolverError, setResolverError] = useState<string | null>(null);
  
  // Directly viewing post or clip matched by URL
  const [directViewPost, setDirectViewPost] = useState<Post | null>(null);
  const [directViewClip, setDirectViewClip] = useState<Clip | null>(null);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  
  // Post success publication notice modal state
  const [publishedNotice, setPublishedNotice] = useState<{ type: "gramp" | "clip" | "pulse"; id: string; code: string } | null>(null);

  // Standalone PWA install trigger event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Firestore DB level error toast state
  const [dbError, setDbError] = useState<{ message: string; op: string; path: string | null } | null>(null);

  useEffect(() => {
    registerFirestoreErrorHandler((error, op, path) => {
      // Ignore initial subscription listings which may fail during local/offline boot
      if (op === OperationType.LIST) {
        console.warn(`Silencing list sync error: ${error} on path: ${path}`);
        return;
      }
      setDbError({ message: error, op, path });
      setTimeout(() => {
        setDbError(null);
      }, 7000);
    });
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the installation prompt");
        }
        setDeferredPrompt(null);
      });
    } else {
      alert("📱 Wolly está 100% pronto para Instalação PWA!\n\nNo Chrome/Edge: Clique no ícone de instalação na barra de endereços (ao lado dos favoritos ✨).\n\nNo Safari do iOS: Toque em Compartilhar 📤 e escolha 'Adicionar à Tela de Início' ➕.\n\nWolly funcionará em tela cheia com seu ícone PWA e suporte offline completo!");
    }
  };

  // Sync browser simulator URL pathway when active tab / view changes
  useEffect(() => {
    let resolvedPath = "feed";
    if (activeTab === "clips") {
      resolvedPath = "clips";
    } else if (activeTab === "ia") {
      resolvedPath = "mensagens";
    } else if (activeTab === "perfil") {
      resolvedPath = "perfil";
    } else if (activeTab === "create") {
      resolvedPath = "create";
    } else if (activeTab === "transp") {
      resolvedPath = "transparency-center";
    } else if (activeTab === "hashtag" && selectedHashtag) {
      resolvedPath = `hashtag/${selectedHashtag.replace("#", "").toLowerCase()}`;
    }
    
    if (activeSeriesId) {
      resolvedPath = `series/${activeSeriesId.replace('series_', '')}`;
    }
    
    setCurrentUrlPath(resolvedPath);
    setUrlInputText(resolvedPath);
  }, [activeTab, activeSeriesId, selectedHashtag]);

  const handleUrlGo = (text?: string) => {
    const input = (text !== undefined ? text : urlInputText).trim().toLowerCase();
    setResolverError(null);
    
    // Normalize url, strip https://wolly.techl.com.br/ and http://...
    let path = input
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/^wolly8\.netlify\.app\//, "")
      .replace(/^wolly\.techl\.com\.br\//, "")
      .replace(/^localhost:\d+\//, "");

    // clean extra slashes
    path = path.replace(/^\/+|\/+$/g, "");

    if (path === "" || path === "feed" || path === "home") {
      setActiveTab("feed");
      setActiveSeriesId(null);
      setDirectViewPost(null);
      setDirectViewClip(null);
      return;
    }
    if (path === "clips" || path === "clip" || path === "clipes") {
      setActiveTab("clips");
      setActiveSeriesId(null);
      setDirectViewPost(null);
      setDirectViewClip(null);
      return;
    }
    if (path === "ia" || path === "ia-painter" || path === "painter" || path === "messages" || path === "mensagens" || path === "conversas" || path === "chat") {
      setActiveTab("ia");
      setActiveSeriesId(null);
      setDirectViewPost(null);
      setDirectViewClip(null);
      return;
    }
    if (path === "perfil" || path === "profile") {
      setActiveTab("perfil");
      setActiveSeriesId(null);
      setDirectViewPost(null);
      setDirectViewClip(null);
      return;
    }
    if (path === "transp" || path === "transparency" || path === "transparency-center") {
      setActiveTab("transp");
      setActiveSeriesId(null);
      setDirectViewPost(null);
      setDirectViewClip(null);
      return;
    }

    // Checking for hashtag/<tag> or tag/<tag>
    if (path.startsWith("hashtag/") || path.startsWith("tag/")) {
      const parts = path.split("/");
      const rawTag = parts[1];
      if (rawTag) {
        setSelectedHashtag(`#${rawTag}`);
        setActiveTab("hashtag");
        setActiveSeriesId(null);
        setDirectViewPost(null);
        setDirectViewClip(null);
        return;
      }
    }

    // Checking for gramps/<code> or gramp/<code> or pulses/<code> or pulse/<code>
    if (path.startsWith("gramps/") || path.startsWith("gramp/") || path.startsWith("pulses/") || path.startsWith("pulse/")) {
      const parts = path.split("/");
      const code = parts[1];
      if (code) {
        // Search for post with ID matching "post_" + code or containing code
        const matchedPost = posts.find(
          (p) => p.id === `post_${code}` || p.id.replace("post_", "") === code || p.id === code
        );
        if (matchedPost) {
          setDirectViewPost(matchedPost);
          setDirectViewClip(null);
          return;
        } else {
          setResolverError(`Post com código "${code}" não foi encontrado localmente.`);
          setTimeout(() => setResolverError(null), 3000);
        }
      }
    }

    // Checking for clips/<code> or clip/<code> or clipes/<code>
    if (path.startsWith("clips/") || path.startsWith("clip/") || path.startsWith("clipes/")) {
      const parts = path.split("/");
      const code = parts[1];
      if (code) {
        // Search for clip with ID matching "clip_" + code or containing code
        const matchedClip = clips.find(
          (c) => c.id === `clip_${code}` || c.id.replace("clip_", "") === code || c.id === code
        );
        if (matchedClip) {
          setDirectViewClip(matchedClip);
          setDirectViewPost(null);
          setActiveTab("clips"); // switch to clips tab
          return;
        } else {
          setResolverError(`Clip de vídeo com código "${code}" não foi encontrado localmente.`);
          setTimeout(() => setResolverError(null), 3000);
        }
      }
    }
    
    // Default fallback
    const validTabs = ["feed", "clips", "ia", "perfil", "transp", "create"];
    if (validTabs.includes(path)) {
      setActiveTab(path);
      setActiveSeriesId(null);
      setDirectViewPost(null);
      setDirectViewClip(null);
    }
  };

  // Select and load active saved account session
  const selectSavedAccount = (account: any) => {
    setUserAccount({
      email: account.email,
      nickname: account.nickname,
      name: account.name
    });
    localStorage.setItem("wolly_user_account", JSON.stringify({
      email: account.email,
      nickname: account.nickname,
      name: account.name
    }));

    if (account.profiles && account.profiles.length > 0) {
      const merged = [...account.profiles];
      for (const def of INITIAL_PROFILES) {
        if (!merged.some((p) => p.id === def.id)) {
          merged.push(def);
        }
      }
      setProfiles(merged);
      setCurrentProfileId(account.currentProfileId || account.profiles[0].id);
      localStorage.setItem("wolly_profiles", JSON.stringify(merged));
      localStorage.setItem("wolly_current_profile_id", account.currentProfileId || account.profiles[0].id);
    } else {
      const defProf: Profile = {
        id: `profile_${account.nickname.replace("@", "")}_${Date.now().toString(36)}`,
        name: account.name,
        nickname: account.nickname,
        avatar: account.name[0].toUpperCase(),
        avatarBg: account.avatarBg || "bg-indigo-650",
        banner: "bg-gradient-to-r from-indigo-100 to-purple-100",
        bio: "Fico feliz em fazer parte do Wolly sem algoritmos! 🌱",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        followingIds: [],
        crowns: 10
      };
      const merged = [defProf];
      for (const def of INITIAL_PROFILES) {
        if (!merged.some((p) => p.id === def.id)) {
          merged.push(def);
        }
      }
      setProfiles(merged);
      setCurrentProfileId(defProf.id);
      localStorage.setItem("wolly_profiles", JSON.stringify(merged));
      localStorage.setItem("wolly_current_profile_id", defProf.id);
    }
    setActiveTab("feed");
  };

  // Remove a saved account from the switcher ledger and Firestore
  const handleRemoveSavedAccount = (emailToDelete: string, e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const confirmed = window.confirm("Deseja realmente remover e deletar esta conta salva do seu dispositivo?");
    if (!confirmed) return;

    const updated = savedAccounts.filter(acc => acc.email.toLowerCase() !== emailToDelete.toLowerCase());
    setSavedAccounts(updated);
    localStorage.setItem("wolly_saved_accounts", JSON.stringify(updated));

    deleteDoc(doc(db, "accounts", emailToDelete.toLowerCase())).catch(err => {
      console.warn("Error deleting account from Firestore:", err);
    });

    if (userAccount && userAccount.email.toLowerCase() === emailToDelete.toLowerCase()) {
      setUserAccount(null);
      localStorage.removeItem("wolly_user_account");
      setAuthMode(updated.length > 0 ? "saved" : "signup");
    }

    addRealNotification("Conta removida e deletada com sucesso. 🗑️", "system");
  };

  // Handle manual login submit form
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginEmailOrNickname.trim() || !loginPassword.trim() || !loginBirthYear.trim()) {
      setLoginError("Por favor, preencha todos os campos, incluindo o ano de nascimento.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const birthYearNum = parseInt(loginBirthYear.trim(), 10);
    if (isNaN(birthYearNum) || birthYearNum < 1900 || birthYearNum > currentYear) {
      setLoginError("Por favor, informe um ano de nascimento válido (ex: 2005).");
      return;
    }

    const userAge = currentYear - birthYearNum;
    if (userAge < 11) {
      setLoginError("⛔ Acesso bloqueado: O Wolly é restrito para usuários com 11 anos ou mais. Usuários com menos de 11 anos não podem acessar a plataforma.");
      return;
    }

    setLoginError("");
    setIsAuthLoading(true);

    const input = loginEmailOrNickname.trim();
    
    try {
      // 1. Try querying cloud database (Firestore) with fallback so login works even offline or on quota limits
      let matchedAccount: any = null;

      try {
        // Determine if input is email or nickname
        const isEmailInput = input.includes("@") && input.includes(".");
        if (isEmailInput) {
          // Query by email directly
          const docRef = doc(db, "accounts", input.toLowerCase());
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            matchedAccount = docSnap.data();
          }
        } else {
          // Query by nickname (with or without leading @)
          let queryNick = input;
          if (!queryNick.startsWith("@")) {
            queryNick = `@${queryNick}`;
          }
          const q = query(collection(db, "accounts"), where("nickname", "==", queryNick));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            matchedAccount = querySnap.docs[0].data();
          }
        }
      } catch (cloudErr) {
        console.warn("Cloud account lookup warning (proceeding with local account check):", cloudErr);
      }

      // 2. Check local saved accounts if not found in Firestore
      if (!matchedAccount) {
        matchedAccount = savedAccounts.find(
          acc => acc.email.toLowerCase() === input.toLowerCase() || 
                 acc.nickname.toLowerCase() === input.toLowerCase() ||
                 acc.nickname.toLowerCase() === `@${input.toLowerCase()}`
        );
      }

      if (matchedAccount) {
        if (matchedAccount.password && matchedAccount.password !== loginPassword) {
          setLoginError("Senha incorreta. Verifique sua senha ou crie uma conta com novo login.");
          setIsAuthLoading(false);
          return;
        }

        // Direct login
        selectSavedAccount(matchedAccount);

        const localIndex = savedAccounts.findIndex(acc => acc.email.toLowerCase() === matchedAccount.email.toLowerCase());
        let updatedAccounts = [...savedAccounts];
        const localAcc = {
          email: matchedAccount.email,
          nickname: matchedAccount.nickname,
          name: matchedAccount.name,
          password: matchedAccount.password || loginPassword,
          avatarChar: matchedAccount.avatarChar || matchedAccount.name[0].toUpperCase(),
          avatarBg: matchedAccount.avatarBg || "bg-indigo-650",
          profiles: matchedAccount.profiles || [],
          currentProfileId: matchedAccount.currentProfileId || ""
        };
        if (localIndex >= 0) {
          updatedAccounts[localIndex] = localAcc;
        } else {
          updatedAccounts.push(localAcc);
        }
        setSavedAccounts(updatedAccounts);
        localStorage.setItem("wolly_saved_accounts", JSON.stringify(updatedAccounts));

        setLoginError("");
        setLoginPassword("");
        setLoginEmailOrNickname("");
        setLoginBirthYear("");
        addRealNotification(`Bem-vindo de volta ao Wolly, ${matchedAccount.name}! 🚀`, "system");
        setIsAuthLoading(false);
        return;
      }

      // If account does not exist, automatically register it and log in!
      const isEmail = input.includes("@") && input.includes(".");
      const email = isEmail ? input.toLowerCase() : `${input.replace("@", "").toLowerCase()}@wolly.techl.com.br`;
      const nickname = isEmail ? `@${input.split("@")[0].toLowerCase()}` : (input.startsWith("@") ? input : `@${input}`);
      const rawName = isEmail ? input.split("@")[0] : input.replace("@", "");
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      const newAccountObj = {
        email,
        nickname,
        name: formattedName,
        password: loginPassword,
        avatarChar: formattedName[0].toUpperCase(),
        avatarBg: "bg-indigo-600",
        profiles: [],
        currentProfileId: ""
      };

      try {
        await setDoc(doc(db, "accounts", email), {
          ...newAccountObj,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore sync during auto-registration:", err);
      }

      selectSavedAccount(newAccountObj);
      const updatedAccounts = [...savedAccounts, newAccountObj];
      setSavedAccounts(updatedAccounts);
      localStorage.setItem("wolly_saved_accounts", JSON.stringify(updatedAccounts));

      setLoginError("");
      setLoginPassword("");
      setLoginEmailOrNickname("");
      setLoginBirthYear("");
      addRealNotification(`Conta criada e conectada com sucesso! 🎉`, "system");

    } catch (err: any) {
      console.error("Login attempt failed:", err);
      setLoginError("Ocorreu um erro ao processar o login. Tente novamente.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Switcher core logging out
  const handleLogoutAccount = () => {
    if (userAccount) {
      setSavedAccounts((prev) => {
        const updated = prev.map((acc) => {
          if (acc.email.toLowerCase() === userAccount.email.toLowerCase()) {
            return {
              ...acc,
              profiles: profiles,
              currentProfileId: currentProfileId
            };
          }
          return acc;
        });
        localStorage.setItem("wolly_saved_accounts", JSON.stringify(updated));
        return updated;
      });
    }
    setUserAccount(null);
    localStorage.removeItem("wolly_user_account");
  };

  // Active sync hooks back of changes to profiles or currently active IDs inside the savedAccounts core
  useEffect(() => {
    if (userAccount && profiles.length > 0) {
      setSavedAccounts((prev) => {
        const index = prev.findIndex((acc) => acc.email.toLowerCase() === userAccount.email.toLowerCase());
        if (index !== -1) {
          const currentAcc = prev[index];
          if (
            JSON.stringify(currentAcc.profiles) !== JSON.stringify(profiles) ||
            currentAcc.currentProfileId !== currentProfileId
          ) {
            const updated = [...prev];
            const updatedAcc = {
              ...currentAcc,
              profiles: profiles,
              currentProfileId: currentProfileId
            };
            updated[index] = updatedAcc;
            localStorage.setItem("wolly_saved_accounts", JSON.stringify(updated));

            // Sync update to Firestore cloud collection
            setDoc(doc(db, "accounts", userAccount.email.toLowerCase()), {
              ...updatedAcc,
              updatedAt: new Date().toISOString()
            }, { merge: true })
            .catch(err => console.error("Error syncing account to cloud:", err));

            return updated;
          }
        }
        return prev;
      });
    }
  }, [profiles, currentProfileId, userAccount]);

  // Wolly Crowns Transactions system state and audit logs
  const [crownTransactions, setCrownTransactions] = useState<CrownTransaction[]>(() => {
    const saved = localStorage.getItem("wolly_crown_transactions");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wolly Community Challenges state
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // Wolly Notifications State Engine and AI algorithms integration (Line 123)
  const [notifications, setNotifications] = useState<any[]>(() => {
    const saved = localStorage.getItem("wolly_notifications");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // Set some dynamic notifications based on existing active entities so it's not pre-fixed, or empty
    return [
      { id: "notif_init_1", message: "Bem-vindo ao Wolly! Sua rede social privada e descentralizada. 🛡️✨", type: "system", time: "há poucos instantes" },
      { id: "notif_init_2", message: "Sistema: Wolly Cronologia Ativa • Seus dados estão 100% livres de anúncios e algoritmos invasivos. 🛡️", type: "system", time: "há 10 min" },
      { id: "notif_init_3", message: "Sucesso: Você ingressou no ecossistema descentralizado Wolly!", type: "system", time: "há 1 hora" }
    ];
  });

  const addRealNotification = (message: string, type: string) => {
    setNotifications((prev) => {
      const newNotif = {
        id: `notif_real_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        message,
        type,
        time: "agora",
        createdAt: new Date().toISOString()
      };
      const updated = [newNotif, ...prev].slice(0, 30);
      localStorage.setItem("wolly_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const [notificationApiKey, setNotificationApiKey] = useState<string>("AQ.Ab8RN6JEO5OrKxBXXhEj_mans_i0j3di8hmJxY9LqlNuAXi4Bw");
  const [isGeneratingNotifications, setIsGeneratingNotifications] = useState<boolean>(false);
  const [notificationGenError, setNotificationGenError] = useState<string>("");

  const handleGenerateNotifications = async () => {
    if (isGeneratingNotifications) return;
    setIsGeneratingNotifications(true);
    setNotificationGenError("");
    try {
      const response = await fetch("/api/notifications/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: notificationApiKey
        })
      });

      const data = await response.json();
      if (data.success && data.notifications) {
        setNotifications((prev) => {
          const updated = [...data.notifications, ...prev].slice(0, 20); // Keep last 20
          localStorage.setItem("wolly_notifications", JSON.stringify(updated));
          return updated;
        });
        localStorage.setItem("wolly_last_notification_gen_time", Date.now().toString());
      } else {
        setNotificationGenError(data.error || "Erro na autenticação local do algoritmo.");
      }
    } catch (err: any) {
      console.error("Erro ao mandar requisição para Line 123:", err);
      setNotificationGenError("Não foi possível alcançar o servidor do Wolly.");
    } finally {
      setIsGeneratingNotifications(false);
    }
  };

  // Automated 24h cron simulation check on mounting
  useEffect(() => {
    const lastGen = localStorage.getItem("wolly_last_notification_gen_time");
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    if (!lastGen || (now - parseInt(lastGen, 10)) > dayInMs) {
      handleGenerateNotifications();
    }
  }, []);

  // Secure reactive Crown earning/gain updater
  const handleAwardCrowns = (profileId: string, amount: number, description: string) => {
    if (!profileId || amount <= 0) return;
    setProfiles((prevProfiles) => {
      const updated = prevProfiles.map((p) => {
        if (p.id === profileId) {
          const currentBal = p.crowns || 0;
          return { ...p, crowns: currentBal + amount };
        }
        return p;
      });
      localStorage.setItem("wolly_profiles", JSON.stringify(updated));
      return updated;
    });

    const newTx: CrownTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      profileId,
      amount,
      description,
      type: "earn",
      createdAt: new Date().toISOString()
    };
    setCrownTransactions((prev) => {
      const updated = [newTx, ...prev];
      localStorage.setItem("wolly_crown_transactions", JSON.stringify(updated));
      return updated;
    });

    // Fire real notification
    addRealNotification(`Você ganhou +${amount} Crowns: ${description} 👑✨`, "system");
  };

  const handleUpdateCrownsDirectly = (newCrowns: number) => {
    setProfiles((prevProfiles) => {
      const updated = prevProfiles.map((p) => {
        if (p.id === activeProfile.id) {
          return { ...p, crowns: newCrowns };
        }
        return p;
      });
      localStorage.setItem("wolly_profiles", JSON.stringify(updated));
      return updated;
    });

    // Add transaction history record
    const newTx: CrownTransaction = {
      id: `tx_pay_${Date.now()}`,
      profileId: activeProfile.id,
      amount: 200,
      description: "Recarga Wolly Pay (Simulação Pix)",
      type: "earn",
      createdAt: new Date().toISOString()
    };
    setCrownTransactions((prev) => {
      const updated = [newTx, ...prev];
      localStorage.setItem("wolly_crown_transactions", JSON.stringify(updated));
      return updated;
    });

    addRealNotification(`Seu pagamento Pix CPF foi confirmado! +200 Moedas Crowns creditadas! 👑💖`, "system");
  };

  // Secure reactive Crown expense/spend updater
  const handleSpendCrowns = (profileId: string, amount: number, description: string): boolean => {
    if (!profileId || amount <= 0) return false;
    let allowed = false;
    
    // Check beforehand
    const matchedProfile = profiles.find(p => p.id === profileId);
    if (!matchedProfile || (matchedProfile.crowns || 0) < amount) {
      return false;
    }

    setProfiles((prevProfiles) => {
      const updated = prevProfiles.map((p) => {
        if (p.id === profileId) {
          const currentBal = p.crowns || 0;
          if (currentBal >= amount) {
            allowed = true;
            // Boost followers by 20 if they bought a campaign booster
            const isBooster = description.toLowerCase().includes("impulsionar") || 
                              description.toLowerCase().includes("impulsionador") || 
                              description.toLowerCase().includes("booster") || 
                              description.toLowerCase().includes("boost") ||
                              description.toLowerCase().includes("algoritmo amigo");
            return {
              ...p,
              crowns: currentBal - amount,
              boosterFollowers: isBooster ? (p.boosterFollowers || 0) + 20 : (p.boosterFollowers || 0),
              followersCount: isBooster ? (p.followersCount || 0) + 20 : p.followersCount
            };
          }
        }
        return p;
      });
      if (allowed) {
        localStorage.setItem("wolly_profiles", JSON.stringify(updated));
      }
      return updated;
    });

    if (allowed) {
      const newTx: CrownTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        profileId,
        amount: -amount,
        description,
        type: "spend",
        createdAt: new Date().toISOString()
      };
      setCrownTransactions((prev) => {
        const updated = [newTx, ...prev];
        localStorage.setItem("wolly_crown_transactions", JSON.stringify(updated));
        return updated;
      });

      // Fire real notification
      addRealNotification(`Você enviou/gastou -${amount} Crowns: ${description} 💎🍿`, "system");
      return true;
    }
    return false;
  };

  const handleTogglePrivacy = (profileId: string) => {
    setProfiles((prev) => {
      const updated = prev.map((p) => {
        if (p.id === profileId) {
          const toggledValue = !p.isPrivate;
          addRealNotification(
            `Você alterou o Escudo do perfil para: ${toggledValue ? "🔒 FECHADO (Privado)" : "🔓 ABERTO (Público)"}`,
            "privacy"
          );
          return { ...p, isPrivate: toggledValue };
        }
        return p;
      });
      localStorage.setItem("wolly_profiles", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateFeedPreferences = (feedPreferences: FeedPreferences, favoriteProfileIds: string[]) => {
    setProfiles((prev) => {
      const updated = prev.map((p) => {
        if (p.id === activeProfile.id) {
          return { ...p, feedPreferences, favoriteProfileIds };
        }
        return p;
      });
      localStorage.setItem("wolly_profiles", JSON.stringify(updated));
      return updated;
    });

    if (activeProfile && activeProfile.id) {
      setDoc(
        doc(db, "profiles", activeProfile.id),
        { feedPreferences, favoriteProfileIds },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `profiles/${activeProfile.id}`));
    }
  };

  const handleCreateChallenge = (title: string, description: string, reward: number, expiresIn: string) => {
    const now = new Date();
    const durationMs = parseExpirationMs(expiresIn);
    const expiresAt = new Date(now.getTime() + durationMs).toISOString();

    const newChallengeId = `challenge_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newChallenge: Challenge = {
      id: newChallengeId,
      creatorId: activeProfile.id,
      creatorName: activeProfile.name,
      creatorNickname: activeProfile.nickname,
      title,
      description,
      reward,
      expiresIn,
      createdAt: now.toISOString(),
      expiresAt
    };

    setDoc(doc(db, "challenges", newChallengeId), cleanUndefined(newChallenge))
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `challenges/${newChallengeId}`));

    handleAwardCrowns(activeProfile.id, 10, `Lançou o desafio comunitário: "${title}" 🏆`);
    addRealNotification(`Você lançou o desafio comunitário "${title}" para toda a rede Wolly! 🏆🚀`, "challenge");
    setActiveTab("desafios");
  };

  const [postIts, setPostIts] = useState<PostIt[]>([]);

  // Track if we are visiting and inspecting someone else's profile details
  const [visitingProfileId, setVisitingProfileId] = useState<string | null>(null);

  // Active user Ink livestream states
  const [activeInk, setActiveInk] = useState<Ink | null>(null);

  const [inkMessages, setInkMessages] = useState<InkMessage[]>([]);

  // Sync to local storage for robust offline-like persistence
  useEffect(() => {
    localStorage.setItem("wolly_profiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem("wolly_current_profile_id", currentProfileId);
  }, [currentProfileId]);

  useEffect(() => {
    try {
      localStorage.setItem("wolly_posts", JSON.stringify(posts));
    } catch {}
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem("wolly_clips", JSON.stringify(clips));
    } catch {}
  }, [clips]);

  useEffect(() => {
    try {
      localStorage.setItem("wolly_series", JSON.stringify(series));
    } catch {}
  }, [series]);

  // Clean up test accounts in Firestore & local state on startup
  useEffect(() => {
    const cleanTestAccountsInDb = async () => {
      const targets = [
        ["profiles", "ana"],
        ["profiles", "wolly_official"],
        ["posts", "post_3"],
        ["posts", "post_4"],
        ["clips", "clip_1"],
        ["clips", "clip_2"],
        ["series", "series_startup_30_days"]
      ];
      for (const [col, id] of targets) {
        try {
          await deleteDoc(doc(db, col, id));
        } catch (_) {}
      }
    };
    cleanTestAccountsInDb();
  }, []);

  // Real-time Firestore subscriptions and Firebase initialization
  useEffect(() => {
    const initFirebaseAndSync = async () => {
      try {
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
            console.log("Firebase Auth signed in anonymously.");
          } catch (authErr) {
            console.warn("Firebase Auth anonymous sign-in failed (Anonymous provider might be disabled in Firebase Console):", authErr);
          }
        }

        // 1. Posts synchronization
        const unsubPosts = onSnapshot(collection(db, "posts"), async (snapshot) => {
          let loaded: Post[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Post;
            if (data.profileId !== "ana" && data.authorNickname !== "@ana.maria" && data.authorNickname !== "@wolly.oficial") {
              loaded.push({ id: doc.id, ...data });
            }
          });
          setPosts((prev) => {
            const map = new Map<string, Post>();
            loaded.forEach((item) => map.set(item.id, item));
            (prev || []).forEach((item) => {
              if (!map.has(item.id) && item.profileId !== "ana" && item.authorNickname !== "@ana.maria" && item.authorNickname !== "@wolly.oficial") {
                map.set(item.id, item);
              }
            });
            const merged = Array.from(map.values());
            merged.sort((a, b) => {
              const tA = a.createdAt ? parseDateToTimestamp(a.createdAt) : 0;
              const tB = b.createdAt ? parseDateToTimestamp(b.createdAt) : 0;
              return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
            });
            return merged;
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "posts");
        });

        // 2. Clips synchronization
        const unsubClips = onSnapshot(collection(db, "clips"), async (snapshot) => {
          let loaded: Clip[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Clip;
            if (data.profileId !== "ana" && data.profileId !== "wolly_official" && data.authorName !== "Ana Maria" && data.authorName !== "Wolly Oficial") {
              loaded.push({ id: doc.id, ...data });
            }
          });
          setClips((prev) => {
            const map = new Map<string, Clip>();
            loaded.forEach((item) => map.set(item.id, item));
            (prev || []).forEach((item) => {
              if (!map.has(item.id) && item.profileId !== "ana" && item.profileId !== "wolly_official") {
                map.set(item.id, item);
              }
            });
            const merged = Array.from(map.values());
            merged.sort((a, b) => {
              const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
            });
            return merged;
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "clips");
        });

        // 3. Post Its synchronization
        const unsubPostIts = onSnapshot(collection(db, "post_its"), async (snapshot) => {
          let loaded: PostIt[] = [];
          snapshot.forEach((doc) => {
            loaded.push({ id: doc.id, ...doc.data() } as PostIt);
          });
          const now = Date.now();
          const nonExpired = loaded.filter(pi => now - new Date(pi.createdAt).getTime() < 24 * 60 * 60 * 1000);
          setPostIts(nonExpired);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "post_its");
        });

        // 4. Series synchronization
        const unsubSeries = onSnapshot(collection(db, "series"), async (snapshot) => {
          let loaded: Series[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Series;
            if (data.profileId !== "ana" && data.authorNickname !== "ana.maria") {
              loaded.push({ id: doc.id, ...data });
            }
          });
          setSeries((prev) => {
            const map = new Map<string, Series>();
            loaded.forEach((item) => map.set(item.id, item));
            (prev || []).forEach((item) => {
              if (!map.has(item.id) && item.profileId !== "ana") {
                map.set(item.id, item);
              }
            });
            return Array.from(map.values());
          });
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "series");
        });

        // 5. Challenges synchronization
        const unsubChallenges = onSnapshot(collection(db, "challenges"), (snapshot) => {
          let loaded: Challenge[] = [];
          snapshot.forEach((doc) => {
            loaded.push({ id: doc.id, ...doc.data() } as Challenge);
          });
          setChallenges(loaded);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "challenges");
        });

        // 6. Inks (live feed room) synchronization
        const unsubInks = onSnapshot(collection(db, "inks"), (snapshot) => {
          let loaded: Ink[] = [];
          snapshot.forEach((doc) => {
            loaded.push({ id: doc.id, ...doc.data() } as Ink);
          });
          // Pick active broadcast if any
          if (loaded.length > 0) {
            setActiveInk(loaded[0]);
          } else {
            setActiveInk(null);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "inks");
        });

        // 7. Searches (Wolly Searches) synchronization
        const unsubSearches = onSnapshot(collection(db, "searches"), (snapshot) => {
          let loaded: WollySearch[] = [];
          snapshot.forEach((doc) => {
            loaded.push({ id: doc.id, ...doc.data() } as WollySearch);
          });
          setSearches(loaded);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "searches");
        });

        return () => {
          unsubPosts();
          unsubClips();
          unsubPostIts();
          unsubSeries();
          unsubChallenges();
          unsubInks();
          unsubSearches();
        };
      } catch (err) {
        console.error("Failed to initialize Firestore syncing", err);
      }
    };

    let cleanupPromise = initFirebaseAndSync();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, []);

  // Shared comments listener inside active Ink Room
  useEffect(() => {
    if (!activeInk) {
      setInkMessages([]);
      return;
    }
    const unsubMessages = onSnapshot(collection(db, "inks", activeInk.id, "messages"), (snapshot) => {
      let loaded: InkMessage[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as InkMessage);
      });
      loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setInkMessages(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `inks/${activeInk.id}/messages`);
    });
    return () => unsubMessages();
  }, [activeInk]);

  // Periodic automatic removal of expired Post Its (checks every 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      postIts.forEach(async (pi) => {
        if (now - new Date(pi.createdAt).getTime() >= 24 * 60 * 60 * 1000) {
          try {
            await deleteDoc(doc(db, "post_its", pi.id));
          } catch (e) {
            console.error("Expired post-it delete err:", e);
          }
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [postIts]);

  // Validate Connection to Firestore on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "posts", "connection_test_doc_non_existent"));
        console.log("Wolly Network Connection check: success");
      } catch (error) {
        if (error instanceof Error && error.message.includes("offline")) {
          console.error("Wolly network offline or Firebase config needs verification.");
        }
      }
    }
    testConnection();
  }, []);

  const handleAddPostIt = (content: string, bgColor: string, image?: string, music?: string, audioUrl?: string) => {
    const newPostItId = `postit_${Date.now()}`;
    const newPostIt: PostIt = {
      id: newPostItId,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      content: content.trim(),
      bgColor,
      image,
      music,
      audioUrl,
      createdAt: new Date().toISOString()
    };
    
    setDoc(doc(db, "post_its", newPostItId), cleanUndefined(newPostIt))
      .then(() => {
        processMentionsInContent(content.trim(), "postit", activeProfile, profilesWithCounts, addRealNotification);
      })
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `post_its/${newPostItId}`));
      
    handleAwardCrowns(activeProfile.id, 5, "Ficou no mural de recados Post It 📌");
    addRealNotification(`Você fixou um recado de Post It no painel! 📌`, "publish");
    setActiveTab("feed"); // Go back to feed tab automatically
  };

  const handleStartInk = (title: string, seriesId?: string) => {
    let nextChapter: number | undefined = undefined;
    if (seriesId) {
      nextChapter = getAndUpdateNextSeriesChapter(seriesId);
    }

    const newInkId = `ink_${Date.now()}`;
    const newInk: Ink = {
      id: newInkId,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      title: title.trim(),
      spectatorsCount: 15, // Starts with 15 baseline spectators
      createdAt: new Date().toISOString(),
      seriesId: seriesId,
      seriesChapter: nextChapter
    };
    
    setDoc(doc(db, "inks", newInkId), cleanUndefined(newInk))
      .then(() => {
        setActiveInk(newInk);
        setInkMessages([]);
        handleAwardCrowns(activeProfile.id, 50, "Iniciou uma transmissão de áudio Ink 🎙️");
        setActiveTab("ink-room");
      })
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `inks/${newInkId}`));
  };

  const handleEndInk = () => {
    if (activeInk) {
      const inkIdToDelete = activeInk.id;
      setActiveInk(null);
      setInkMessages([]);
      setActiveTab("feed");
      addRealNotification("Transmissão Ink encerrada com sucesso! 🛑", "publish");
      deleteDoc(doc(db, "inks", inkIdToDelete))
        .catch((err) => handleFirestoreError(err, OperationType.DELETE, `inks/${inkIdToDelete}`));
    } else {
      setActiveInk(null);
      setInkMessages([]);
      setActiveTab("feed");
    }
  };

  const handleSendInkMessage = (text: string) => {
    if (!activeInk) return;
    const msgId = `msg_${Date.now()}`;
    const newMsg: InkMessage = {
      id: msgId,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    setDoc(doc(db, "inks", activeInk.id, "messages", msgId), cleanUndefined(newMsg))
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `inks/${activeInk.id}/messages/${msgId}`));
  };

  const profilesWithCounts = profiles.map((p) => {
    const actualFollowers = profiles.filter(
      (other) => other.id !== p.id && other.followingIds?.includes(p.id)
    ).length;
    return {
      ...p,
      followersCount: actualFollowers + (p.boosterFollowers || 0),
      followingCount: p.followingIds ? p.followingIds.length : 0,
    };
  });

  const activeProfileRaw = (profilesWithCounts.find((p) => p.id === currentProfileId) || profilesWithCounts[0] || {
    id: "",
    name: "",
    nickname: "",
    avatar: "",
    avatarBg: "",
    banner: "",
    bio: "",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    followingIds: [],
    crowns: 10
  }) as Profile;

  const activeProfile: Profile = {
    ...activeProfileRaw,
    id: activeProfileRaw.id || "",
    name: activeProfileRaw.name || "",
    nickname: activeProfileRaw.nickname || "",
    avatar: activeProfileRaw.avatar || "",
    avatarBg: activeProfileRaw.avatarBg || "",
    banner: activeProfileRaw.banner || "",
    bio: activeProfileRaw.bio || "Fico feliz em fazer parte do Wolly sem algoritmos! 🌱",
    followingIds: activeProfileRaw.followingIds || [],
    followersCount: activeProfileRaw.followersCount || 0,
    followingCount: activeProfileRaw.followingCount || 0,
    postsCount: activeProfileRaw.postsCount || 0,
    crowns: activeProfileRaw.crowns !== undefined ? activeProfileRaw.crowns : 10,
  };

  // ==========================================
  // Line 123 AI Assistant Global Chat State & Actions
  // ==========================================
  const [showLine123Chat, setShowLine123Chat] = useState(false);
  const [line123Messages, setLine123Messages] = useState<Array<{ role: "user" | "assistant"; content: string; createdAt: string }>>([]);
  const [line123InputText, setLine123InputText] = useState("");
  const [isLine123Loading, setIsLine123Loading] = useState(false);

  // Initialize Line 123 chat when profile loads
  useEffect(() => {
    if (activeProfile?.id) {
      setLine123Messages([
        {
          role: "assistant",
          content: `Olá, ${activeProfile.name}! Eu sou a Line 123, a inteligência integrada ao Wolly 🤖. Estou conectada ao banco de dados do Firestore em tempo real! \n\nPosso te ajudar com:\n💡 **Dicas práticas de como crescer organicamente** no Wolly\n📊 **Resumos e relatórios das últimas postagens** do feed\n❤️ **Destaques das postagens mais populares** (com mais curtidas e comentários).\n\nComo posso te apoiar hoje?`,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  }, [activeProfile?.id]);

  const handleSendLine123Message = async (textToSend?: string) => {
    const text = (textToSend || line123InputText).trim();
    if (!text) return;

    const userMsg = {
      role: "user" as const,
      content: text,
      createdAt: new Date().toISOString()
    };

    const newMessages = [...line123Messages, userMsg];
    setLine123Messages(newMessages);
    setLine123InputText("");
    setIsLine123Loading(true);

    try {
      const payloadMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/ai/line123-profile-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: notificationApiKey,
          messages: payloadMessages,
          posts: posts
        })
      });

      if (!response.ok) {
        throw new Error("Erro na rede ou servidor indisponível");
      }

      const data = await response.json();
      if (data.success && data.text) {
        setLine123Messages(prev2 => [...prev2, {
          role: "assistant",
          content: data.text,
          createdAt: new Date().toISOString()
        }]);
      } else {
        throw new Error(data.error || "Falha ao gerar resposta");
      }
    } catch (err) {
      console.error("Erro ao falar com Line 123:", err);
      setLine123Messages(prev2 => [...prev2, {
        role: "assistant",
        content: "Oops! Tive um problema de conexão com o servidor de IA. Mas posso te dar uma dica rápida local: a melhor forma de crescer no Wolly é interagir organicamente, curtindo e comentando nos posts cronológicos dos outros usuários! 🚀",
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsLine123Loading(false);
    }
  };

  const handleAskLine123ToSummarize = async (content: string, type: string) => {
    if (isLine123Loading) return;
    setShowLine123Chat(true);
    
    const userPrompt = `Por favor, faça um resumo amigável, curto e profissional deste ${type} no Wolly: "${content}"`;
    const userDisplayMsg = `🤖 Resuma este ${type}: "${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"`;
    
    const userMsg = {
      role: "user" as const,
      content: userDisplayMsg,
      createdAt: new Date().toISOString()
    };

    const currentMsgs = line123Messages;
    const newMessages = [...currentMsgs, userMsg];
    setLine123Messages(newMessages);
    setIsLine123Loading(true);

    try {
      const payloadMessages = currentMsgs.map(m => ({
        role: m.role,
        content: m.content
      })).concat({
        role: "user",
        content: userPrompt
      });

      const response = await fetch("/api/ai/line123-profile-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: notificationApiKey,
          messages: payloadMessages,
          posts: posts
        })
      });

      if (!response.ok) {
        throw new Error("Erro na rede");
      }

      const data = await response.json();
      if (data.success && data.text) {
        setLine123Messages(prev2 => [...prev2, {
          role: "assistant",
          content: data.text,
          createdAt: new Date().toISOString()
        }]);
      } else {
        throw new Error(data.error || "Falha ao gerar resposta");
      }
    } catch (err) {
      console.error("Erro ao resumir com Line 123:", err);
      setLine123Messages(prev2 => [...prev2, {
        role: "assistant",
        content: `Desculpe, tive um problema ao tentar resumir este ${type}. Mas aqui está o conteúdo original se quiser ler de perto: \n\n"${content}"`,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsLine123Loading(false);
    }
  };

  // Reset Wolly to original demo state
  const handleResetData = () => {
    localStorage.removeItem("wolly_profiles");
    localStorage.removeItem("wolly_current_profile_id");
    localStorage.removeItem("wolly_user_account");
    setProfiles(INITIAL_PROFILES);
    setCurrentProfileId("");
    setUserAccount(null);
    setVisitingProfileId(null);
    setActiveTab("feed");
  };

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!signUpEmail.trim() || !signUpName.trim() || !signUpNickname.trim() || !signUpPassword.trim() || !signUpBirthYear.trim()) {
      setSignUpError("Por favor, preencha todos os campos, incluindo o ano de nascimento.");
      return;
    }

    const currentYear = new Date().getFullYear();
    const birthYearNum = parseInt(signUpBirthYear.trim(), 10);
    if (isNaN(birthYearNum) || birthYearNum < 1900 || birthYearNum > currentYear) {
      setSignUpError("Por favor, informe um ano de nascimento válido (ex: 2005).");
      return;
    }

    const userAge = currentYear - birthYearNum;
    if (userAge < 11) {
      setSignUpError("⛔ Acesso bloqueado: O Wolly é restrito para usuários com 11 anos ou mais. Usuários com menos de 11 anos não podem acessar a plataforma.");
      return;
    }
    
    // 1. Verify if the email is format-wise real and valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpEmail.trim())) {
      setSignUpError("Por favor, insira um endereço de e-mail válido.");
      return;
    }

    let rawNickname = signUpNickname.trim();
    if (!rawNickname.startsWith("@")) {
      rawNickname = `@${rawNickname}`;
    }

    // Validate nickname characters
    const cleanNickname = rawNickname.substring(1);
    const nicknameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!nicknameRegex.test(cleanNickname)) {
      setSignUpError("O nome de usuário deve conter apenas letras, números, pontos (.) ou traços (-).");
      return;
    }

    setSignUpError("");
    setIsAuthLoading(true);

    try {
      // 2. Check if email or nickname already exists in the entire Wolly network (Firestore)
      let emailExistsInCloud = false;
      try {
        const emailDocRef = doc(db, "accounts", signUpEmail.trim().toLowerCase());
        const emailSnap = await getDoc(emailDocRef);
        if (emailSnap.exists()) {
          emailExistsInCloud = true;
        }
      } catch (e) {
        console.warn("Cloud email check failed (proceeding with local check):", e);
      }

      if (emailExistsInCloud) {
        setSignUpError("Este endereço de e-mail já está sendo usado por outra conta.");
        setIsAuthLoading(false);
        return;
      }

      let nicknameExistsInCloud = false;
      try {
        const qNickname = query(collection(db, "accounts"), where("nickname", "==", rawNickname));
        const nicknameSnap = await getDocs(qNickname);
        if (!nicknameSnap.empty) {
          nicknameExistsInCloud = true;
        }
      } catch (e) {
        console.warn("Cloud nickname check failed (proceeding with local check):", e);
      }

      if (nicknameExistsInCloud) {
        setSignUpError("Este nome de usuário (@nickname) já está em uso por outro perfil.");
        setIsAuthLoading(false);
        return;
      }

      // Also check local device saved accounts to be 100% sure
      const existsLocally = savedAccounts.some(
        acc => acc.email.toLowerCase() === signUpEmail.trim().toLowerCase() || 
               acc.nickname.toLowerCase() === rawNickname.toLowerCase()
      );
      if (existsLocally) {
        setSignUpError("Uma conta com este e-mail ou nome de usuário já está salva neste aparelho.");
        setIsAuthLoading(false);
        return;
      }

      const accountData = {
        email: signUpEmail.trim(),
        nickname: rawNickname,
        name: signUpName.trim()
      };

      const newProfileId = `profile_${rawNickname.replace("@", "").replace(".", "_")}_${Date.now().toString(36)}`;
      const initialProfile: Profile = {
        id: newProfileId,
        name: signUpName.trim(),
        nickname: rawNickname,
        avatar: signUpName.trim()[0].toUpperCase(),
        avatarBg: "bg-gradient-to-tr from-indigo-600 to-indigo-800",
        banner: "bg-gradient-to-r from-indigo-100 to-purple-100",
        bio: "Fico feliz em fazer parte do Wolly sem algoritmos! 🌱",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        followingIds: [],
        crowns: 10 // Starting gift
      };

      const mergedProfiles = [initialProfile];
      for (const def of INITIAL_PROFILES) {
        if (!mergedProfiles.some((p) => p.id === def.id)) {
          mergedProfiles.push(def);
        }
      }

      const newSavedAcc = {
        email: signUpEmail.trim(),
        nickname: rawNickname,
        name: signUpName.trim(),
        password: signUpPassword.trim(),
        avatarChar: signUpName.trim()[0].toUpperCase(),
        avatarBg: "bg-indigo-650",
        profiles: mergedProfiles,
        currentProfileId: newProfileId
      };

      setPendingVerificationCallback(() => async () => {
        // 3. Save to cloud Firestore "accounts" collection safely with fallback
        try {
          await setDoc(doc(db, "accounts", signUpEmail.trim().toLowerCase()), cleanUndefined({
            ...newSavedAcc,
            createdAt: new Date().toISOString()
          }));
        } catch (cloudErr) {
          console.warn("Cloud account save warning (account saved locally):", cloudErr);
        }

        // 4. Save locally
        const updatedAccounts = [...savedAccounts, newSavedAcc];
        setSavedAccounts(updatedAccounts);
        localStorage.setItem("wolly_saved_accounts", JSON.stringify(updatedAccounts));

        setProfiles(mergedProfiles);
        setCurrentProfileId(newProfileId);
        setUserAccount(accountData);

        localStorage.setItem("wolly_user_account", JSON.stringify(accountData));
        localStorage.setItem("wolly_profiles", JSON.stringify(mergedProfiles));
        localStorage.setItem("wolly_current_profile_id", newProfileId);
        
        // Clear form
        setSignUpEmail("");
        setSignUpName("");
        setSignUpNickname("");
        setSignUpPassword("");
        setSignUpBirthYear("");
        setSignUpError("");
      });

      await sendVerificationCode(signUpEmail.trim(), signUpName.trim());
      setIsAuthLoading(false);
      return;
    } catch (err: any) {
      console.error("Signup failed:", err);
      setSignUpError("Ocorreu um erro ao criar sua conta. Por favor, tente novamente.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Switch Profiles within the single account
  const handleSelectProfile = (profileId: string) => {
    setCurrentProfileId(profileId);
    setVisitingProfileId(null); // Clear visiting if we switched active
  };

  // Create sub-profile within same account
  const handleCreateProfile = (name: string, nickname: string, bio: string, avatarBg: string) => {
    const newId = `profile_${Date.now()}`;
    const newProfile: Profile = {
      id: newId,
      name,
      nickname,
      avatar: name[0].toUpperCase(),
      avatarBg,
      banner: "bg-gradient-to-r from-slate-200 to-slate-350",
      bio,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      followingIds: []
    };

    setProfiles([...profiles, newProfile]);
    setCurrentProfileId(newId);
  };

  // Edit biography block
  const handleUpdateBio = (profileId: string, newBio: string) => {
    setProfiles(profiles.map(p => p.id === profileId ? { ...p, bio: newBio } : p));
  };

  // Edit full profile details (avatar, name, bio, followers, following)
  const handleUpdateProfileDetails = (profileId: string, updates: Partial<Profile>) => {
    setProfiles(profiles.map(p => p.id === profileId ? { ...p, ...updates } : p));
  };

  // Change banner background colors (user choice)
  const handleUpdateBanner = (profileId: string, bannerGradient: string) => {
    setProfiles(profiles.map(p => p.id === profileId ? { ...p, banner: bannerGradient } : p));
  };

  // Toggle follows another profile
  const handleFollowToggle = (profileIdToToggle: string) => {
    const isCurrentlyFollowing = activeProfile.followingIds.includes(profileIdToToggle);
    let updatedFollowingList = [...activeProfile.followingIds];

    if (isCurrentlyFollowing) {
      // Unfollow
      updatedFollowingList = updatedFollowingList.filter((id) => id !== profileIdToToggle);
    } else {
      // Follow
      updatedFollowingList.push(profileIdToToggle);
    }

    const targetProfile = profiles.find((p) => p.id === profileIdToToggle);
    if (targetProfile) {
      if (!isCurrentlyFollowing) {
        addRealNotification(`Você agora está seguindo @${targetProfile.nickname.replace("@", "")}! 👤✅`, "follow");
      } else {
        addRealNotification(`Você deixou de seguir @${targetProfile.nickname.replace("@", "")}. 👤❌`, "follow");
      }
    }

    setProfiles(
      profiles.map((p) => {
        if (p.id === activeProfile.id) {
          // Update my following list & count
          return {
            ...p,
            followingIds: updatedFollowingList,
            followingCount: updatedFollowingList.length,
          };
        }
        if (p.id === profileIdToToggle) {
          // Update target's followers count
          return {
            ...p,
            followersCount: Math.max(0, p.followersCount + (isCurrentlyFollowing ? -1 : 1)),
          };
        }
        return p;
      })
    );
  };

  // Direct visit profile trigger
  const handleVisitProfile = (profileId: string) => {
    if (profileId === activeProfile.id) {
      setVisitingProfileId(null);
    } else {
      setVisitingProfileId(profileId);
    }
    setActiveTab("perfil");
  };

  // Series Features Handling Methods
  const getAndUpdateNextSeriesChapter = (seriesId: string): number => {
    const pCount = posts.filter((p) => p.seriesId === seriesId).length;
    const cCount = clips.filter((c) => c.seriesId === seriesId).length;
    const nextChapter = pCount + cCount + 1;

    updateDoc(doc(db, "series", seriesId), { chaptersCount: nextChapter })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `series/${seriesId}`));
    return nextChapter;
  };

  const handleCreateSeries = (title: string, description: string, cover?: string): string => {
    const newId = `series_${Date.now()}`;
    const newSeriesObj: Series = {
      id: newId,
      title,
      description,
      cover,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname.replace("@", ""),
      createdAt: new Date().toISOString(),
      chaptersCount: 0,
      followerIds: []
    };
    
    setDoc(doc(db, "series", newId), cleanUndefined(newSeriesObj))
      .then(() => {
        addRealNotification(`Você iniciou a série "🧵 ${title}" com sucesso!`, "publish");
      })
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `series/${newId}`));
      
    return newId;
  };

  const handleToggleFollowSeries = (seriesId: string) => {
    const s = series.find(ser => ser.id === seriesId);
    if (!s) return;

    const isFollowing = (s.followerIds || []).includes(activeProfile.id);
    const followerIds = isFollowing
      ? (s.followerIds || []).filter((id) => id !== activeProfile.id)
      : [...(s.followerIds || []), activeProfile.id];

    updateDoc(doc(db, "series", seriesId), { followerIds })
      .then(() => {
        if (!isFollowing) {
          addRealNotification(`Você agora está seguindo a série "🧵 ${s.title}"!`, "follow");
          handleAwardCrowns(activeProfile.id, 5, `Seguiu a série "🧵 ${s.title}"`);
        } else {
          addRealNotification(`Você deixou de seguir a série "🧵 ${s.title}".`, "follow");
        }
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `series/${seriesId}`));
  };

  const handleReorderChapters = (seriesId: string, itemIdsOrdered: string[]) => {
    posts.forEach((post) => {
      if (post.seriesId === seriesId) {
        const index = itemIdsOrdered.indexOf(post.id);
        if (index !== -1) {
          updateDoc(doc(db, "posts", post.id), { seriesChapter: index + 1 })
            .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`));
        }
      }
    });

    clips.forEach((clip) => {
      if (clip.seriesId === seriesId) {
        const index = itemIdsOrdered.indexOf(clip.id);
        if (index !== -1) {
          updateDoc(doc(db, "clips", clip.id), { seriesChapter: index + 1 })
            .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `clips/${clip.id}`));
        }
      }
    });

    addRealNotification("Ordem dos capítulos reordenada pelo autor! 🧵📖", "publish");
  };

  // Post / Publish and increment counts
  const handleAddPost = (newPostData: { content: string; image?: string; theme?: string; hashtags: string[]; seriesId?: string; isPulse?: boolean; category?: string; newsTopic?: string }) => {
    let nextChapter: number | undefined = undefined;
    if (newPostData.seriesId) {
      nextChapter = getAndUpdateNextSeriesChapter(newPostData.seriesId);
    }

    const randCode = Math.random().toString(36).substring(2, 11);
    const newPostId = `post_${randCode}`;

    const effectiveTheme = newPostData.theme || newPostData.category || "Outros";
    const effectiveCategory = newPostData.category || effectiveTheme;
    const computedTopic = newPostData.newsTopic || ((effectiveTheme === "Notícias" || effectiveCategory === "Notícias") ? extractNewsTopic(newPostData.content, newPostData.hashtags) : undefined);

    const newPost: Post = {
      id: newPostId,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      content: newPostData.content,
      image: newPostData.image,
      theme: effectiveTheme,
      category: effectiveCategory,
      newsTopic: computedTopic,
      hashtags: newPostData.hashtags,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      disclosedWhyVisible: newPostData.isPulse ? "Você publicou este Pulse no Wolly." : "Você publicou este conteúdo no Wolly.",
      comments: [],
      sharesCount: 0,
      seriesId: newPostData.seriesId,
      seriesChapter: nextChapter,
      isPulse: newPostData.isPulse
    };

    // 1. Optimistically update posts state
    setPosts((prev) => [newPost, ...prev]);

    // 2. Send mention DMs if @mention exists in content
    processMentionsInContent(newPostData.content, newPostData.isPulse ? "pulse" : "gramp", activeProfile, profilesWithCounts, addRealNotification);

    // 3. Increment postCount of profile and award Crowns
    setProfiles((prev) => prev.map(p => p.id === activeProfile.id ? { ...p, postsCount: p.postsCount + 1 } : p));
    if (newPostData.isPulse) {
      handleAwardCrowns(activeProfile.id, 10, "Compartilhou um Pulse (texto) no feed ⚡");
      addRealNotification(`Você publicou com sucesso um novo Pulse no feed! ⚡🚀`, "publish");
    } else {
      handleAwardCrowns(activeProfile.id, 10, "Compartilhou um Gramp (publicação) no feed 📸");
      addRealNotification(`Você publicou com sucesso um novo Gramp no feed! 📸🚀`, "publish");
    }
    
    // 4. Open publication link success banner modal & navigate to feed
    setPublishedNotice({ type: newPostData.isPulse ? "pulse" : "gramp", id: newPostId, code: randCode });
    setActiveTab("feed");

    // 5. Asynchronously persist to Firestore
    setDoc(doc(db, "posts", newPostId), cleanUndefined(newPost))
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `posts/${newPostId}`));
  };

  // Add Clip Format Handler
  const handleAddClip = (newClipData: { 
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
  }) => {
    let nextChapter: number | undefined = undefined;
    if (newClipData.seriesId) {
      nextChapter = getAndUpdateNextSeriesChapter(newClipData.seriesId);
    }

    const randCode = Math.random().toString(36).substring(2, 11);
    const newClipId = `clip_${randCode}`;

    const newClip: Clip = {
      id: newClipId,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      videoPlaceholder: newClipData.videoPlaceholder,
      description: newClipData.description,
      location: newClipData.location,
      likes: 0,
      likedBy: [],
      theme: newClipData.theme,
      hashtags: newClipData.hashtags,
      createdAt: new Date().toISOString(),
      comments: [],
      sharesCount: 0,
      videoUrl: newClipData.videoUrl,
      videoFilter: newClipData.videoFilter,
      videoTrimStart: newClipData.videoTrimStart,
      videoTrimEnd: newClipData.videoTrimEnd,
      videoSpeed: newClipData.videoSpeed,
      seriesId: newClipData.seriesId,
      seriesChapter: nextChapter
    };

    // 1. Optimistically update local clips state so it instantly appears in Clips tab
    setClips((prev) => {
      if (prev.some((c) => c.id === newClipId)) return prev;
      return [newClip, ...prev];
    });

    // 2. Also update public count and award Crowns immediately
    setProfiles((prev) => prev.map(p => p.id === activeProfile.id ? { ...p, postsCount: p.postsCount + 1 } : p));
    handleAwardCrowns(activeProfile.id, 25, "Gravou ou carregou um Clipe no Wolly Clips 🎞");
    addRealNotification(`Você publicou com sucesso um clipe no Wolly Clips! 🎞🍿`, "publish");

    // 3. Open publication link success banner modal & navigate to clips tab immediately
    setPublishedNotice({ type: "clip", id: newClipId, code: randCode });
    setActiveTab("clips");

    // 4. Asynchronously persist to Firestore
    setDoc(doc(db, "clips", newClipId), cleanUndefined(newClip))
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `clips/${newClipId}`));
  };

  // Delete own posts
  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setProfiles((prev) => prev.map(p => p.id === activeProfile.id ? { ...p, postsCount: Math.max(0, p.postsCount - 1) } : p));
    deleteDoc(doc(db, "posts", postId))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`));
  };

  // Delete own clips
  const handleDeleteClip = (clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    addRealNotification("Clipe excluído com sucesso! 🗑️", "system");
    deleteDoc(doc(db, "clips", clipId))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `clips/${clipId}`));
  };

  // Delete comment from clip
  const handleDeleteCommentFromClip = (clipId: string, commentId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const updatedComments = (clip.comments || []).filter((cmt) => cmt.id !== commentId);

    updateDoc(doc(db, "clips", clipId), {
      comments: updatedComments
    })
      .then(() => {
        addRealNotification("Comentário removido.", "system");
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `clips/${clipId}`));
  };

  // Like Toggle
  const handleLikePost = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const targetAuthor = post.authorNickname || post.authorName;
    const userProfileIds = profiles.map(p => p.id);
    const postLikedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    
    // Check if any of the account's profiles liked this post
    const likedMe = postLikedBy.some((uid) => userProfileIds.includes(uid));

    const updatedLikedBy = likedMe
      ? postLikedBy.filter((uid) => !userProfileIds.includes(uid))
      : [...postLikedBy, activeProfile.id];

    updateDoc(doc(db, "posts", postId), {
      likedBy: updatedLikedBy,
      likes: updatedLikedBy.length
    })
      .then(() => {
        if (!likedMe) {
          handleAwardCrowns(activeProfile.id, 2, "Curtiu uma publicação no feed 💙");
          addRealNotification(`Você curtiu a publicação de ${targetAuthor}! 💙`, "like");
        } else {
          addRealNotification(`Você removeu a curtida na publicação de ${targetAuthor}.`, "like");
        }
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`));
  };

  // Like Clips
  const handleLikeClip = (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const targetAuthor = clip.authorName || "autor";
    const clipLikedBy = Array.isArray(clip.likedBy) ? clip.likedBy : [];
    
    // Check if current active profile liked this clip
    const likedMe = clipLikedBy.includes(activeProfile.id);

    const updatedLikedBy = likedMe
      ? clipLikedBy.filter((id) => id !== activeProfile.id)
      : [...clipLikedBy, activeProfile.id];

    updateDoc(doc(db, "clips", clipId), {
      likedBy: updatedLikedBy,
      likes: updatedLikedBy.length
    })
      .then(() => {
        if (!likedMe) {
          handleAwardCrowns(activeProfile.id, 2, "Curtiu um Clipe no Wolly Clips 💜");
          addRealNotification(`Você curtiu o Clipe de @${targetAuthor.split(" ")[0].toLowerCase()}! 💜`, "like");
        } else {
          addRealNotification(`Você removeu a curtida no Clipe de @${targetAuthor.split(" ")[0].toLowerCase()}.`, "like");
        }
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `clips/${clipId}`));
  };

  // Comments for Posts handler
  const handleAddCommentToPost = (postId: string, text: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const newComment = {
      id: `comment_${Date.now()}`,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const targetAuthor = post.authorNickname || post.authorName;
    const updatedComments = [...(post.comments || []), newComment];

    updateDoc(doc(db, "posts", postId), {
      comments: updatedComments
    })
      .then(() => {
        handleAwardCrowns(activeProfile.id, 5, "Comentou em um Gramp do feed 💬");
        addRealNotification(`Você comentou na publicação de ${targetAuthor}: "${text.trim().substring(0, 30)}..." 💬`, "comment");
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`));
  };

  // Comments for Clips handler
  const handleAddCommentToClip = (clipId: string, text: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const newComment = {
      id: `comment_${Date.now()}`,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname || `@${activeProfile.name.split(" ")[0].toLowerCase()}`,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const targetAuthor = clip.authorName;
    const updatedComments = [...(clip.comments || []), newComment];

    updateDoc(doc(db, "clips", clipId), {
      comments: updatedComments
    })
      .then(() => {
        handleAwardCrowns(activeProfile.id, 5, "Comentou em um clipe no Wolly Clips 💬");
        addRealNotification(`Você comentou no Clipe de @${targetAuthor.split(" ")[0].toLowerCase()}: "${text.trim().substring(0, 30)}..." 💬`, "comment");
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `clips/${clipId}`));
  };

  // Share Counters
  const handleSharePost = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    updateDoc(doc(db, "posts", postId), {
      sharesCount: (post.sharesCount || 0) + 1
    })
      .then(() => {
        handleAwardCrowns(activeProfile.id, 5, "Compartilhou uma publicação do feed 🚀");
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`));
  };

  const handleShareClip = (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    updateDoc(doc(db, "clips", clipId), {
      sharesCount: (clip.sharesCount || 0) + 1
    })
      .then(() => {
        handleAwardCrowns(activeProfile.id, 5, "Compartilhou um clipe com a comunidade 🚀");
      })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `clips/${clipId}`));
  };

  if (!userAccount) {
    return (
      <div id="wolly-main-viewport" className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans antialiased max-w-md mx-auto shadow-2xl border-x border-slate-200">
        
        {/* Connection Status Header Banner */}
        <div className="bg-indigo-600 text-white text-[10px] py-1 font-bold tracking-wide uppercase text-center select-none flex items-center justify-center gap-1 shadow-xs">
          <span>🛡️ CONEXÃO CRIPTOGRAFADA LOCAL DE CRIAÇÃO</span>
        </div>

        {/* Content Box */}
        <div className="flex-grow flex flex-col justify-start px-6 pt-5 pb-8 overflow-y-auto no-scrollbar">
          
          {/* Beautiful and exact Wolly Sheep logo artwork provided in user attachment */}
          <div className="relative w-full max-w-sm aspect-[3/2] mx-auto flex items-center justify-center p-0.5 mb-5 bg-white rounded-3xl overflow-hidden border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] select-none group">
            <img 
              src={logoUrl} 
              onError={() => setLogoUrl(wollyLogo)}
              alt="Wolly Logo Oficial" 
              className="w-full h-full object-cover rounded-[22px] transition-transform duration-700 group-hover:scale-103" 
              referrerPolicy="no-referrer" 
            />
          </div>

          <div className="text-center mb-5 shrink-0">
            <h1 className="text-2xl font-display font-black tracking-tight text-slate-900 leading-tight">Wolly</h1>
            <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-1 leading-relaxed">
              A primeira rede social livre de algoritmos, focada em soberania e privacidade
            </p>
          </div>

          {/* Form and Selection Switcher Block */}
          <div className="bg-white rounded-3xl p-5 border border-slate-250/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            
            {/* Tabs for fast switching if saved accounts are present, otherwise standard login/signup */}
            <div className={`grid ${savedAccounts.length > 0 ? "grid-cols-3" : "grid-cols-2"} gap-1.5 bg-slate-100 p-1.2 rounded-2xl`}>
              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("saved");
                    setSignUpError("");
                    setLoginError("");
                  }}
                  className={`py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                    authMode === "saved" 
                      ? "bg-white text-indigo-600 shadow-xs" 
                      : "text-slate-550 hover:text-slate-800"
                  }`}
                >
                  Contas Salvas ({savedAccounts.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setSignUpError("");
                  setLoginError("");
                }}
                className={`py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                  authMode === "login" 
                    ? "bg-white text-indigo-600 shadow-xs" 
                    : "text-slate-550 hover:text-slate-800"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setSignUpError("");
                  setLoginError("");
                }}
                className={`py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                  authMode === "signup" 
                    ? "bg-white text-indigo-600 shadow-xs" 
                    : "text-slate-550 hover:text-slate-800"
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* CASE 1: Saved Accounts View Switcher */}
            {authMode === "saved" && (
              <div className="space-y-3.5">
                <div className="text-center">
                  <h2 className="text-sm font-display font-bold text-slate-800">Sua Chave de Acesso</h2>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Tapping entry points: clique para acessar sua carteira local de dados e perfis instantaneamente.</p>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {savedAccounts.map((acc, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSavedAccount(acc)}
                      className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-150 rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatar={acc.avatarChar}
                          name={acc.name}
                          className="w-9.5 h-9.5"
                          bgClassName={acc.avatarBg || "bg-indigo-600"}
                          textClassName="text-sm font-extrabold text-white"
                        />
                        <div className="text-left font-sans leading-tight">
                          <span className="block text-[12px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{acc.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{acc.nickname}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-slate-200/50 text-slate-550 group-hover:bg-indigo-100 group-hover:text-indigo-700 px-2 py-0.5 rounded-lg font-bold">
                          Acessar →
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSavedAccount(acc.email, e)}
                          title="Remover conta salva deste dispositivo"
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-350 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {savedAccounts.length === 0 && (
                  <div className="text-center py-6 text-slate-400 space-y-2">
                    <p className="text-xs">Nenhuma conta salva foi encontrada neste computador/celular.</p>
                    <button
                      type="button"
                      onClick={() => setAuthMode("signup")}
                      className="text-xs text-indigo-600 hover:underline font-bold cursor-pointer"
                    >
                      Criar uma conta nova agora!
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CASE 2: Classic Web-login view */}
            {authMode === "login" && (
              <div className="space-y-3">
                <div className="text-center">
                  <h2 className="text-sm font-display font-bold text-slate-800">Entrar com Conta Existente</h2>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Seus perfis em rede local. Digite suas credenciais criadas para sincronizar.</p>
                </div>

                {loginError && (
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-center border border-red-100">
                    ⚠️ {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">E-mail ou @nickname de Usuário</label>
                    <input
                      type="text"
                      required
                      disabled={isAuthLoading}
                      placeholder="Ex: @seu_usuario ou seu@email.com"
                      value={loginEmailOrNickname}
                      onChange={(e) => setLoginEmailOrNickname(e.target.value)}
                      className="w-full text-xs placeholder-slate-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-sans disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Sua Senha</label>
                    <input
                      type="password"
                      required
                      disabled={isAuthLoading}
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-mono disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Ano de Nascimento</label>
                    <input
                      id="login-input-birth-year"
                      type="number"
                      required
                      min={1900}
                      max={new Date().getFullYear()}
                      disabled={isAuthLoading}
                      placeholder="Ex: 2005"
                      value={loginBirthYear}
                      onChange={(e) => setLoginBirthYear(e.target.value)}
                      className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-mono disabled:opacity-60"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs tracking-wide uppercase rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-700/10 disabled:cursor-not-allowed"
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Acessando Wolly...
                      </span>
                    ) : (
                      "Acessar Wolly"
                    )}
                  </button>
                </form>

                <div className="text-center pt-1.5">
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className="text-[10px] text-slate-400 font-bold hover:text-slate-700 underline"
                  >
                    Não possui conta? Registre-se aqui
                  </button>
                </div>
              </div>
            )}

            {/* CASE 3: Gorgeous standard Signup form matching initial styles */}
            {authMode === "signup" && (
              <div className="space-y-3">
                <div className="text-center text-slate-800 leading-tight">
                  <h2 className="text-sm font-display font-bold">Criar uma Nova Conta</h2>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Sua privacidade começa aqui. Seus segredos e dados nunca saem deste aparelho.</p>
                </div>

                {signUpError && (
                  <div className="p-2.5 bg-red-50 text-red-650 rounded-xl text-xs font-semibold text-center mt-1 border border-red-100">
                    ⚠️ {signUpError}
                  </div>
                )}

                <form onSubmit={handleSignUpSubmit} className="space-y-3 mt-1">
                  {/* Nome */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input
                      id="reg-input-name"
                      type="text"
                      required
                      disabled={isAuthLoading}
                      placeholder="Ex: Sua Assinatura"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="w-full text-xs placeholder-slate-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-medium font-sans disabled:opacity-60"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Endereço de E-mail</label>
                    <input
                      id="reg-input-email"
                      type="email"
                      required
                      disabled={isAuthLoading}
                      placeholder="Ex: seu@email.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full text-xs placeholder-slate-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-medium font-sans disabled:opacity-60"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome de Usuário (@nickname)</label>
                    <input
                      id="reg-input-nickname"
                      type="text"
                      required
                      disabled={isAuthLoading}
                      placeholder="Ex: SeuUsuario"
                      value={signUpNickname}
                      onChange={(e) => setSignUpNickname(e.target.value)}
                      className="w-full text-xs placeholder-slate-400 bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-medium font-mono disabled:opacity-60"
                    />
                  </div>

                  {/* Senha */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sua Senha</label>
                    <input
                      id="reg-input-password"
                      type="password"
                      required
                      disabled={isAuthLoading}
                      placeholder="••••••••••••"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-mono disabled:opacity-60"
                    />
                  </div>

                  {/* Ano de Nascimento */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ano de Nascimento</label>
                    <input
                      id="reg-input-birth-year"
                      type="number"
                      required
                      min={1900}
                      max={new Date().getFullYear()}
                      disabled={isAuthLoading}
                      placeholder="Ex: 2005"
                      value={signUpBirthYear}
                      onChange={(e) => setSignUpBirthYear(e.target.value)}
                      className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 rounded-xl px-3.5 py-2 border border-slate-200/60 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-all text-slate-800 font-mono disabled:opacity-60"
                    />
                  </div>

                  <button
                    id="reg-btn-submit"
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs tracking-wide uppercase rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-700/10 disabled:cursor-not-allowed"
                  >
                    {isAuthLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Criando sua Conta...
                      </span>
                    ) : (
                      "Criar Conta e Entrar"
                    )}
                  </button>
                </form>

                {savedAccounts.length > 0 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("saved")}
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      ← Voltar para Contas Salvas
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Core Guarantees Icons */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-slate-500 select-none shrink-0 mb-4">
            <div className="bg-white border border-slate-200/45 p-2 rounded-2xl flex flex-col items-center font-sans">
              <span className="text-base">🕒</span>
              <span className="text-[9px] font-bold leading-tight mt-0.5 text-slate-700">100% Cronológico</span>
            </div>
            <div className="bg-white border border-slate-200/45 p-2 rounded-2xl flex flex-col items-center font-sans">
              <span className="text-base">🛡️</span>
              <span className="text-[9px] font-bold leading-tight mt-0.5 text-slate-700">Zero Rastreamento</span>
            </div>
            <div className="bg-white border border-slate-200/45 p-2 rounded-2xl flex flex-col items-center font-sans">
              <span className="text-base">👁️</span>
              <span className="text-[9px] font-bold leading-tight mt-0.5 text-slate-700">Auditável</span>
            </div>
          </div>

        </div>

        {/* Footer info lock down */}
        <div className="py-2.5 text-center border-t border-slate-200/50 px-6 shrink-0 bg-white">
          <p className="text-[10px] text-slate-400 font-medium font-sans">
            Seus dados são armazenados localmente sob as chaves de soberania pessoal do Wolly.
          </p>
        </div>

      </div>
    );
  }

  return (
    <div id="wolly-main-viewport" className="min-h-screen bg-slate-100 flex flex-col relative font-sans antialiased max-w-md mx-auto shadow-2xl border-x border-slate-200">
      
      {/* Main Pages router body */}
      <div className="flex-grow overflow-y-auto no-scrollbar" style={{ contentVisibility: "auto" }}>
        {activeSeriesId !== null ? (
          <SeriesView
            series={series.find((s) => s.id === activeSeriesId)!}
            activeProfile={activeProfile}
            profiles={profilesWithCounts}
            posts={posts}
            clips={clips}
            activeInk={activeInk}
            onBack={() => {
              setActiveSeriesId(null);
            }}
            onToggleFollow={handleToggleFollowSeries}
            onReorderChapters={handleReorderChapters}
            onVisitProfile={handleVisitProfile}
          />
        ) : (
          <>
            {activeTab === "feed" && (
              <FeedView
                activeProfile={activeProfile}
                profiles={profilesWithCounts}
                posts={posts}
                postIts={postIts}
                onAddPostIt={handleAddPostIt}
                onVisitProfile={handleVisitProfile}
                onDeletePost={handleDeletePost}
                onLikePost={handleLikePost}
                onAddCommentToPost={handleAddCommentToPost}
                onSharePost={handleSharePost}
                onSelectTab={setActiveTab}
                onOpenTransparencyCenter={() => setActiveTab("transp")}
                activeInk={activeInk}
                onJoinActiveInk={() => setActiveTab("ink-room")}
                notifications={notifications}
                onTriggerNotificationGen={handleGenerateNotifications}
                isGeneratingNotifications={isGeneratingNotifications}
                notificationGenError={notificationGenError}
                notificationApiKey={notificationApiKey}
                onUpdateApiKey={setNotificationApiKey}
                challenges={challenges}
                seriesList={series}
                onSelectSeries={setActiveSeriesId}
                onInstallApp={handleInstallClick}
                onAskLine123ToSummarize={handleAskLine123ToSummarize}
                onHashtagClick={(tag) => {
                  setSelectedHashtag(tag);
                  setActiveTab("hashtag");
                }}
                onAddRealNotification={addRealNotification}
                clips={clips}
                searches={searches}
                onUpdateFeedPreferences={handleUpdateFeedPreferences}
              />
            )}

            {/* Ink Live Room Broadcast View */}
            {activeTab === "ink-room" && activeInk && (
              <InkRoom
                activeProfile={activeProfile}
                activeInk={activeInk}
                inkMessages={inkMessages}
                onSendInkMessage={handleSendInkMessage}
                onEndInk={handleEndInk}
                onExitInkRoom={() => setActiveTab("feed")}
              />
            )}

            {/* active clips view */}
            {activeTab === "clips" && (
              <ClipsView
                activeProfile={activeProfile}
                profiles={profilesWithCounts}
                clips={clips}
                onLikeClip={handleLikeClip}
                onAddCommentToClip={handleAddCommentToClip}
                onShareClip={handleShareClip}
                onDeleteClip={handleDeleteClip}
                onDeleteCommentFromClip={handleDeleteCommentFromClip}
                onBack={() => setActiveTab("feed")}
                onAskLine123ToSummarize={handleAskLine123ToSummarize}
                onAddRealNotification={addRealNotification}
              />
            )}

            {activeTab === "grupos" && (
              <GroupsView
                activeProfile={activeProfile}
                onBack={() => setActiveTab("feed")}
                onUpdateCrowns={handleUpdateCrownsDirectly}
              />
            )}

            {activeTab === "searches" && (
              <SearchesView
                activeProfile={activeProfile}
                profiles={profilesWithCounts}
                onVisitProfile={handleVisitProfile}
                onAddRealNotification={addRealNotification}
              />
            )}

            {activeTab === "create" && (
              <CreateView
                activeProfile={activeProfile}
                profiles={profilesWithCounts}
                onAddPost={handleAddPost}
                onAddClip={handleAddClip}
                onAddPostIt={handleAddPostIt}
                onBack={() => setActiveTab("feed")}
                activeInk={activeInk}
                onStartInk={handleStartInk}
                onJoinActiveInk={() => setActiveTab("ink-room")}
                onEndInk={handleEndInk}
                seriesList={series.filter(s => s.profileId === activeProfile.id)}
                onCreateSeries={handleCreateSeries}
              />
            )}

            {activeTab === "ia" && (
              <MessagesView
                activeProfile={activeProfile}
                profiles={profilesWithCounts}
                onAddRealNotification={addRealNotification}
                posts={posts}
                onViewPost={(p) => setDirectViewPost(p)}
              />
            )}

            {activeTab === "perfil" && (
              <>
                {visitingProfileId ? (
                  // Visiting another profile screen matching ProfileView layout but locked to target
                  <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 text-left">
                    {/* Visual Banner of visited profile */}
                    <div className={`h-36 w-full ${profilesWithCounts.find(p => p.id === visitingProfileId)?.banner || "bg-gradient-to-r from-teal-200 to-indigo-100"} relative`}>
                      <button
                        onClick={() => setVisitingProfileId(null)}
                        className="absolute top-4 left-4 px-3 py-1 bg-black/60 hover:bg-black/80 rounded-xl text-white text-xs font-bold"
                      >
                        ← Voltar
                      </button>
                    </div>

                    {/* Inspect Card */}
                    {(() => {
                      const target = profilesWithCounts.find(p => p.id === visitingProfileId);
                      if (!target) return <p className="p-4 text-center text-xs">Perfil não encontrado.</p>;
                      const isFollowing = activeProfile.followingIds.includes(target.id);
                      const targetPosts = posts.filter(pot => pot.profileId === target.id);

                      return (
                        <div className="px-4 relative -mt-10 space-y-4 max-w-md mx-auto">
                          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                              <span className="font-display font-black text-sm text-slate-900">{target.name}</span>
                              <span className="text-[10px] bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-500 font-mono font-bold">Visitando</span>
                            </div>

                            <div className="flex items-center gap-5">
                              <UserAvatar
                                avatar={target.avatar}
                                name={target.name}
                                className="w-20 h-20"
                                bgClassName={target.avatarBg || "bg-indigo-600"}
                                textClassName="text-3xl font-display font-black text-white"
                              />

                              <div className="flex-grow grid grid-cols-3 gap-2 text-center text-slate-600">
                                <div>
                                  <span className="block font-black font-display text-slate-800 text-sm">{target.postsCount}</span>
                                  <span className="text-[9px] text-slate-400">Posts</span>
                                </div>
                                <div>
                                  <span className="block font-black font-display text-slate-800 text-sm">{target.followersCount}</span>
                                  <span className="text-[9px] text-slate-400">Seguidores</span>
                                </div>
                                <div>
                                  <span className="block font-black font-display text-slate-800 text-sm">{target.followingCount}</span>
                                  <span className="text-[9px] text-slate-400">Seguindo</span>
                                </div>
                              </div>
                            </div>

                            {/* Bio */}
                            <div>
                              <h4 className="font-display font-bold text-xs text-slate-800">{target.name}</h4>
                              <p className="text-xs text-slate-500 italic mt-1 font-sans leading-relaxed">{target.bio}</p>
                            </div>

                            {/* Follow Button */}
                            <div className="pt-2 flex items-center gap-3">
                              <button
                                onClick={() => handleFollowToggle(target.id)}
                                className={`flex-1 py-2 font-black text-xs text-center rounded-xl transition-all cursor-pointer ${
                                  isFollowing 
                                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                                    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                                }`}
                              >
                                {isFollowing ? "✓ Deixar de seguir" : "＋ Seguir Perfil"}
                              </button>
                            </div>
                          </div>

                          {/* Visited profile posts grid */}
                          <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span className="px-3">Publicações de @{target.name.split(" ")[0]}</span>
                          </div>

                          {targetPosts.length === 0 ? (
                            <p className="p-8 text-center text-xs text-slate-400 bg-white border rounded-2xl">Este perfil ainda não publicou nada.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                              {targetPosts.map(tp => (
                                <div key={tp.id} className="aspect-square rounded-lg overflow-hidden border border-slate-100 bg-slate-50 relative h-32">
                                  {tp.image && (
                                    <img src={tp.image} alt="Publicado por conta" className="w-full h-full object-cover" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })()}

                  </div>
                ) : (
                  <ProfileView
                    activeProfile={activeProfile}
                    profiles={profilesWithCounts}
                    posts={posts}
                    onSelectProfile={handleSelectProfile}
                    onCreateProfile={handleCreateProfile}
                    onUpdateBio={handleUpdateBio}
                    onUpdateBanner={handleUpdateBanner}
                    onUpdateProfileDetails={handleUpdateProfileDetails}
                    onSelectTab={setActiveTab}
                    onLogout={handleLogoutAccount}
                    crownTransactions={crownTransactions}
                    onAwardCrowns={handleAwardCrowns}
                    onSpendCrowns={handleSpendCrowns}
                    savedAccounts={savedAccounts}
                    userAccount={userAccount}
                    onSwitchSavedAccount={selectSavedAccount}
                    onTogglePrivacy={handleTogglePrivacy}
                    onCreateChallenge={handleCreateChallenge}
                    seriesList={series.filter(s => s.profileId === activeProfile.id)}
                    onSelectSeries={setActiveSeriesId}
                    onOpenLine123Chat={() => setShowLine123Chat(true)}
                  />
                )}
              </>
            )}
          </>
        )}

        {activeTab === "transp" && (
          <TransparencyCenter
            onBack={() => setActiveTab("feed")}
            profiles={profilesWithCounts}
            posts={posts}
            clips={clips}
            activeProfile={activeProfile}
            onResetAllData={handleResetData}
          />
        )}

        {activeTab === "hashtag" && selectedHashtag && (
          <HashtagView
            hashtag={selectedHashtag}
            posts={posts}
            profiles={profilesWithCounts}
            activeProfile={activeProfile}
            onBack={() => {
              setActiveTab("feed");
              setSelectedHashtag(null);
            }}
            onLikePost={handleLikePost}
            onAddCommentToPost={handleAddCommentToPost}
            onSharePost={handleSharePost}
            onVisitProfile={handleVisitProfile}
            onAskLine123ToSummarize={handleAskLine123ToSummarize}
            onSelectHashtag={(tag) => {
              setSelectedHashtag(tag);
            }}
          />
        )}

        {activeTab === "desafios" && (
          <ChallengesView
            activeProfile={activeProfile}
            challenges={challenges}
            onCreateChallenge={handleCreateChallenge}
            onAwardCrowns={handleAwardCrowns}
            onSpendCrowns={handleSpendCrowns}
            onBack={() => setActiveTab("feed")}
          />
        )}
      </div>

      {/* Floating Bottom Navigator Tab menu matching screenshots */}
      {activeTab !== "ink-room" && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-100 py-3 px-6 flex items-center justify-between z-40 max-w-md mx-auto shadow-lg rounded-t-3xl">
          {/* Tab Item 1: Feed */}
          <button
            id="tab-btn-feed"
            onClick={() => {
              setVisitingProfileId(null);
              setActiveTab("feed");
            }}
            className={`flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === "feed" ? "text-indigo-600 scale-105" : "text-slate-450 hover:text-slate-700"}`}
          >
            <Home className="w-5.5 h-5.5" />
            <span className="text-[10px] font-semibold mt-1">Feed</span>
          </button>

          {/* Tab Item 2: Clips */}
          <button
            id="tab-btn-clips"
            onClick={() => {
              setVisitingProfileId(null);
              setActiveTab("clips");
            }}
            className={`flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === "clips" ? "text-slate-900 scale-105" : "text-slate-450 hover:text-slate-700"}`}
          >
            <Film className="w-5.5 h-5.5" />
            <span className="text-[10px] font-semibold mt-1">Clips</span>
          </button>

          {/* Absolute Floating Core item: Create purple circular icon */}
          <div className="relative -top-3">
            <button
              id="tab-btn-create-floating"
              onClick={() => {
                setVisitingProfileId(null);
                setActiveTab("create");
              }}
              className="w-13 h-13 rounded-full bg-gradient-to-tr from-purple-500 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-xl active:scale-95 transition-transform hover:scale-105 cursor-pointer border-3 border-white"
            >
              <Plus className="w-6.5 h-6.5 stroke-[2.5px]" />
            </button>
          </div>

          {/* Tab Item 3: Mensagens */}
          <button
            id="tab-btn-ia shadow-xs"
            onClick={() => {
              setVisitingProfileId(null);
              setActiveTab("ia");
            }}
            className={`flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === "ia" ? "text-indigo-600 scale-105" : "text-slate-450 hover:text-slate-700"}`}
          >
            <MessageSquare className="w-5.5 h-5.5" />
            <span className="text-[10px] font-semibold mt-1">Mensagens</span>
          </button>

          {/* Tab Item 4: Profile */}
          <button
            id="tab-btn-profile"
            onClick={() => {
              setVisitingProfileId(null);
              setActiveTab("perfil");
            }}
            className={`flex flex-col items-center justify-center transition-all cursor-pointer ${activeTab === "perfil" && !visitingProfileId ? "text-indigo-600 scale-105" : "text-slate-450 hover:text-slate-700"}`}
          >
            <User className="w-5.5 h-5.5" />
            <span className="text-[10px] font-semibold mt-1">Perfil</span>
          </button>
        </div>
      )}

      {/* 1. Modal / Overlay: Visualização Direta de GRAMP via Link */}
      <AnimatePresence>
        {directViewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 max-w-md mx-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-150 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📢</span>
                  <span className="text-xs font-bold font-mono tracking-wide">GRAMP RESOLVIDA SOB DEMANDA</span>
                </div>
                <button
                  onClick={() => setDirectViewPost(null)}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white rounded-full p-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* URL Indicator & Info */}
              <div className="bg-slate-50 border-b border-indigo-50 px-4 py-2 flex items-center justify-between text-xs text-slate-500 font-sans">
                <span className="font-mono text-[10px] text-indigo-600 font-bold overflow-hidden text-ellipsis whitespace-nowrap max-w-[240px]">
                  wolly.techl.com.br/{directViewPost.isPulse ? 'pulses' : 'gramps'}/{directViewPost.id.replace('post_', '')}
                </span>
                <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full">
                  Link Ativo ⛓
                </span>
              </div>

              {/* Core Post Card Content */}
              <div className="flex-grow overflow-y-auto p-5 space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatar={profiles.find(p => p.id === directViewPost.profileId)?.avatar || directViewPost.authorAvatar}
                    name={directViewPost.authorName}
                    className="w-10 h-10"
                    bgClassName={directViewPost.authorAvatarBg || 'bg-indigo-600'}
                    textClassName="text-sm font-extrabold text-white"
                  />
                  <div>
                    <h4 className="text-slate-800 text-sm font-bold leading-none">{directViewPost.authorName}</h4>
                    <span className="text-slate-455 font-mono text-xs font-semibold">{directViewPost.authorNickname || '@autor'}</span>
                  </div>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {directViewPost.content}
                </p>

                {directViewPost.image && (
                  <div className="rounded-2xl overflow-hidden border border-slate-100/80 shadow-3xs max-h-60 flex items-center justify-center bg-slate-50">
                    <img 
                      src={directViewPost.image} 
                      alt="Link preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Tags */}
                {directViewPost.hashtags && directViewPost.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {directViewPost.hashtags.map((tag) => (
                      <span 
                        key={tag} 
                        onClick={() => {
                          setDirectViewPost(null);
                          setSelectedHashtag(tag);
                          setActiveTab("hashtag");
                        }}
                        className="text-indigo-600 bg-indigo-50/70 text-[11px] font-bold px-2 py-0.5 rounded-lg cursor-pointer hover:bg-indigo-100/70 transition-all"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sovereignty Notice */}
                <div className="bg-slate-50/90 border border-slate-200/50 p-3 rounded-2xl text-[11px] text-slate-500 font-sans space-y-1">
                  <p className="font-bold text-slate-700 flex items-center gap-1">
                    <span>🧬</span> Por que esta gramp apareceu para você?
                  </p>
                  <p className="leading-tight text-slate-500">
                    Como no Wolly não existem robôs nem algoritmos de recomendação, este conteúdo foi aberto na sua tela puramente por meio de um link direto e público resolvido sob demanda.
                  </p>
                </div>
              </div>

              {/* Action bar and interactive counts */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleLikePost(directViewPost.id)}
                    className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    💖 <span className="font-mono text-xs">{directViewPost.likes || 0}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const typeSegment = directViewPost.isPulse ? "pulses" : "gramps";
                      const mockUrl = `wolly.techl.com.br/${typeSegment}/${directViewPost.id.replace('post_', '')}`;
                      navigator.clipboard.writeText(mockUrl).catch(() => {});
                      addRealNotification("Link copiado com sucesso! 🛡", "publish");
                    }}
                    className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    // Navigate to feed and close directView
                    setDirectViewPost(null);
                    setActiveTab("feed");
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs shadow-indigo-500/10"
                >
                  Ver no Feed Principal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Modal / Overlay: Visualização Direta de CLIP via Link */}
      <AnimatePresence>
        {directViewClip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center max-w-md mx-auto"
          >
            <div className="relative w-full h-full flex flex-col justify-between text-white font-sans p-6 overflow-hidden">
              {/* Fake Video Filter layer / Background */}
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 flex items-center justify-center">
                <div className={`absolute inset-0 ${directViewClip.videoFilter || "grayscale-0"} transition-all duration-300`}>
                  <img 
                    src={directViewClip.videoPlaceholder || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500"} 
                    alt="Clip background" 
                    className="w-full h-full object-cover blur-2xs opacity-40 scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Visual loop effect indicator in center */}
                <div className="absolute w-20 h-20 rounded-full border-4 border-indigo-400/20 flex items-center justify-center animate-pulse z-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <span className="text-xl text-indigo-300 animate-spin">🎞️</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Overlay Header detail */}
              <div className="z-10 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white font-mono text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-xs">
                    <span>🎞 CLIP RESOLVIDO</span>
                  </span>
                </div>
                <button
                  onClick={() => setDirectViewClip(null)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* URL address info */}
              <div className="z-10 bg-slate-900/80 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl text-xs font-mono text-center mx-auto text-indigo-300 max-w-xs flex items-center justify-between gap-1 mt-2 shadow-xs backdrop-blur-xs select-all">
                <span className="truncate">wolly.techl.com.br/clips/{directViewClip.id.replace('clip_', '')}</span>
                <span className="text-[10px] bg-indigo-950/90 text-indigo-350 font-bold px-1.5 rounded-full select-none">Link Ativo</span>
              </div>

              {/* Bottom Clip Information Card details */}
              <div className="z-10 mt-auto pt-4 space-y-4 font-sans">
                {/* Author context line */}
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatar={profiles.find(p => p.nickname === directViewClip.authorNickname)?.avatar || directViewClip.authorAvatar}
                    name={directViewClip.authorName}
                    className="w-11 h-11 border-2 border-white/25"
                    bgClassName={directViewClip.authorAvatarBg || 'bg-slate-600'}
                    textClassName="text-base font-extrabold text-white"
                  />
                  <div>
                    <h5 className="font-bold text-sm text-white drop-shadow-md">{directViewClip.authorName}</h5>
                    <span className="text-slate-350 text-[11px] font-semibold drop-shadow-sm flex items-center gap-1">
                      <span>📍</span> {directViewClip.location || "Soberania Local"}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-100 text-sm leading-snug font-sans drop-shadow-md text-left">
                  {directViewClip.description}
                </p>

                {/* Tags */}
                {directViewClip.hashtags && directViewClip.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-start">
                    {directViewClip.hashtags.map((tag) => (
                      <span 
                        key={tag} 
                        onClick={() => {
                          setDirectViewClip(null);
                          setSelectedHashtag(tag);
                          setActiveTab("hashtag");
                        }}
                        className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/60 border border-fuchsia-900/30 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-fuchsia-900/50 shadow-3xs transition-all"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions container Bar */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3 col-span-2">
                    <button 
                      onClick={() => handleLikeClip(directViewClip.id)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                    >
                      💖 <span>{directViewClip.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => {
                        const clUrl = `wolly.techl.com.br/clips/${directViewClip.id.replace('clip_', '')}`;
                        navigator.clipboard.writeText(clUrl).catch(() => {});
                        addRealNotification("Link do clipe copiado com sucesso! 🎞", "publish");
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-indigo-200 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setDirectViewClip(null);
                      setActiveTab("clips");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/20 animate-pulse"
                  >
                    Entrar no Wolly Clips
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Modal / Overlay: Informação de Link após Publicação com Sucesso (Wolly Hub) */}
      <AnimatePresence>
        {publishedNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-55 flex items-center justify-center p-4 max-w-md mx-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="bg-white text-slate-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center space-y-4 border border-indigo-100"
            >
              {/* Success Badge */}
              <div className="w-14 h-14 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                🎉
              </div>

              <div className="space-y-1.5">
                <h3 className="font-extrabold text-base text-slate-900 font-sans tracking-tight">Publicado com Sucesso!</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-sans">
                  Sua publicação foi persistida na soberania de sua rede. Um link estilo YouTube com código aleatório foi gerado automaticamente para você!
                </p>
              </div>

              {/* Dynamic Link Card with Copy Action */}
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl flex flex-col gap-2 shadow-inner text-left">
                <label className="text-[9px] font-extrabold tracking-wider uppercase text-slate-400 font-sans">
                  Seu link público {publishedNotice.type === "clip" ? "Clip 🎞" : publishedNotice.type === "pulse" ? "Pulse ⚡" : "Gramp 📸"}:
                </label>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs text-indigo-700 font-bold overflow-hidden text-ellipsis select-all">
                    wolly.techl.com.br/{publishedNotice.type === "pulse" ? "pulses" : publishedNotice.type === "clip" ? "clips" : "gramps"}/{publishedNotice.code}
                  </span>
                  <button
                    onClick={() => {
                      const pluralType = publishedNotice.type === "pulse" ? "pulses" : publishedNotice.type === "clip" ? "clips" : "gramps";
                      const fullLink = `wolly.techl.com.br/${pluralType}/${publishedNotice.code}`;
                      navigator.clipboard.writeText(fullLink).catch(() => {});
                      addRealNotification("Link público copiado com soberba! 🔒✨", "publish");
                    }}
                    className="p-1.5 text-slate-550 hover:text-indigo-600 bg-white border border-slate-150 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors shrink-0"
                    title="Copiar Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Options Action bar */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    const pluralType = publishedNotice.type === "pulse" ? "pulses" : publishedNotice.type === "clip" ? "clips" : "gramps";
                    const ln = `wolly.techl.com.br/${pluralType}/${publishedNotice.code}`;
                    setUrlInputText(ln);
                    setPublishedNotice(null);
                    // trigger simulator!
                    handleUrlGo(ln);
                  }}
                  className="py-2.5 px-2 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  ✈️ Testar Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPublishedNotice(null);
                  }}
                  className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer transition-all shadow-sm shadow-indigo-600/10"
                >
                  Entendido!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Line 123 Chatbot Modal */}
      <AnimatePresence>
        {showLine123Chat && (
          <div className="fixed inset-0 z-55 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 text-left font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full h-[600px] flex flex-col shadow-2xl overflow-hidden relative border border-slate-100"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 flex items-center justify-between shadow-xs shrink-0 font-sans">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shadow-inner shrink-0 animate-pulse">
                    🤖
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm truncate leading-tight flex items-center gap-1.5 text-white">
                      Assistente Line 123 <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded font-black font-mono">LIVE</span>
                    </h4>
                    <span className="text-[9px] text-indigo-150 font-semibold block text-indigo-100/85">
                      Conectada ao Firestore do Wolly
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLine123Chat(false)} 
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Quick Helper Banner */}
              <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between gap-2 text-xs text-indigo-900 shrink-0 select-none overflow-x-auto no-scrollbar font-sans">
                <span className="font-semibold flex items-center gap-1 shrink-0">
                  ⚡ Atalhos rápidos:
                </span>
                <div className="flex gap-1 py-0.5 min-w-max">
                  <button
                    type="button"
                    onClick={() => handleSendLine123Message("Como crescer no Wolly?")}
                    className="text-[9.5px] bg-white hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-150 shrink-0 transition-colors cursor-pointer"
                  >
                    📈 Como crescer?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendLine123Message("Resumir últimas postagens do Firestore")}
                    className="text-[9.5px] bg-white hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-150 shrink-0 transition-colors cursor-pointer"
                  >
                    📝 Resumir posts
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendLine123Message("Quais postagens do Firestore têm mais corações (likes) e comentários?")}
                    className="text-[9.5px] bg-white hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-md border border-indigo-150 shrink-0 transition-colors cursor-pointer"
                  >
                    ❤️ Postagens populares
                  </button>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 flex flex-col font-sans">
                {line123Messages.map((msg, index) => {
                  const isSelf = msg.role === "user";
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-sans shadow-3xs relative leading-relaxed ${
                          isSelf
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-white text-slate-800 border border-slate-150 rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-line break-words">
                          {msg.content}
                        </p>
                        <span className={`block text-[8px] font-mono mt-1 text-right ${isSelf ? "text-indigo-200" : "text-slate-400"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {isLine123Loading && (
                  <div className="flex flex-col items-start font-sans">
                    <div className="bg-white text-slate-800 border border-slate-150 rounded-2xl rounded-bl-none px-4 py-3 text-xs shadow-3xs flex items-center gap-2">
                      <span className="flex gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-200"></span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold font-mono">Line 123 está analisando o Firestore...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Footer */}
              <div className="bg-white border-t border-slate-150 p-3 shrink-0 font-sans">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendLine123Message();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={line123InputText}
                    onChange={(e) => setLine123InputText(e.target.value)}
                    placeholder="Pergunte à Line 123..."
                    disabled={isLine123Loading}
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!line123InputText.trim() || isLine123Loading}
                    className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/10"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Verification Code Modal Overlay */}
      <AnimatePresence>
        {verificationModalOpen && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-center relative font-sans"
            >
              <button
                type="button"
                onClick={() => {
                  setVerificationModalOpen(false);
                  setPendingVerificationCallback(null);
                }}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-3xl shadow-xs text-indigo-600">
                🔒
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Código de Verificação
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Enviamos um código de <strong className="text-slate-800">6 dígitos</strong> para o e-mail:
                </p>
                <div className="mt-1.5 px-3 py-1 bg-indigo-50/80 rounded-lg text-indigo-700 font-mono text-xs font-bold inline-block border border-indigo-100 break-all">
                  {verificationEmail}
                </div>
              </div>

              {verificationDevCode && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-left text-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] mb-1">
                    <span>⚡ Código Gerado (Modo Preview)</span>
                  </div>
                  <p className="text-[10px] text-amber-700 leading-tight">
                    Código: <strong className="font-mono text-xs text-amber-950 select-all font-black">{verificationDevCode}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setVerificationCodeInput(verificationDevCode)}
                    className="mt-1.5 w-full py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Auto-preencher código ({verificationDevCode})
                  </button>
                </div>
              )}

              {verificationError && (
                <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-600 font-medium text-left">
                  {verificationError}
                </div>
              )}

              <form onSubmit={handleConfirmVerificationCode} className="space-y-3 mt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Digite o código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="000000"
                    value={verificationCodeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setVerificationCodeInput(val);
                    }}
                    className="w-full text-center text-2xl font-black font-mono tracking-[0.5em] bg-slate-50 hover:bg-slate-100/50 rounded-2xl py-3 border-2 border-indigo-200 focus:border-indigo-600 focus:bg-white focus:outline-none transition-all text-slate-900 shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verificationLoading || verificationCodeInput.length !== 6}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {verificationLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    "Confirmar Código e Acessar 🚀"
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 font-medium">
                <button
                  type="button"
                  onClick={() => sendVerificationCode(verificationEmail)}
                  className="text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  📩 Reenviar código
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationModalOpen(false);
                    setPendingVerificationCallback(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Firestore Database Error Banner / Toast Notice */}
      <AnimatePresence>
        {dbError && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 inset-x-6 z-55 max-w-sm mx-auto p-4 bg-rose-650/95 backdrop-blur-md text-white border border-rose-500/50 rounded-2xl shadow-2xl flex flex-col gap-2 font-sans"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="font-extrabold text-sm tracking-tight">Falha de Privacidade / Sincronia</span>
              </div>
              <button 
                onClick={() => setDbError(null)}
                className="text-white/75 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-rose-100 leading-relaxed">
              Ocorreu um erro ao gravar seus dados locais em nossa rede descentralizada. 
              Geralmente isso ocorre por instabilidade de internet ou falta de consentimento de chaves nos servidores.
            </p>
            <div className="bg-black/20 p-2 rounded-xl text-[9px] font-mono text-rose-200/90 break-words mt-1 border border-black/5">
              Ref: [{dbError.op.toUpperCase()}] {dbError.path} - {dbError.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
