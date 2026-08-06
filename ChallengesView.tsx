/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { 
  ArrowLeft, Trophy, Clock, Plus, Check, Award, Flame, Star, Coins, User, Sparkles, X, ChevronRight, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Challenge } from "../types";
import { isChallengeExpired, getChallengeRemainingTime } from "../lib/challengeUtils";

interface ChallengesViewProps {
  activeProfile: Profile;
  challenges: Challenge[];
  onCreateChallenge: (title: string, description: string, reward: number, expiresIn: string) => void;
  onAwardCrowns: (profileId: string, amount: number, description: string) => void;
  onSpendCrowns: (profileId: string, amount: number, description: string) => boolean;
  onBack: () => void;
}

export default function ChallengesView({
  activeProfile,
  challenges = [],
  onCreateChallenge,
  onAwardCrowns,
  onSpendCrowns,
  onBack
}: ChallengesViewProps) {
  // Local state for filters and creating form
  const [subTab, setSubTab] = useState<"active" | "all" | "expired" | "mine" | "completed">("active");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Timer tick for real-time live countdown updates
  const [, setTimerTick] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Create challenge form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState(50);
  const [expiresIn, setExpiresIn] = useState("5 dias");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Claimed challenges tracking synced to local storage matching profile id
  const [claimedIds, setClaimedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`wolly_claimed_challenges_${activeProfile.id}`);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track claimed changes if active profile changes
  useEffect(() => {
    const saved = localStorage.getItem(`wolly_claimed_challenges_${activeProfile.id}`);
    try {
      setClaimedIds(saved ? JSON.parse(saved) : []);
    } catch {
      setClaimedIds([]);
    }
    setErrorMsg("");
    setSuccessMsg("");
  }, [activeProfile.id]);

  // Handle proposing a challenge
  const handleSubmitChallenge = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim() || !description.trim()) {
      setErrorMsg("Por favor, preencha todos os campos do desafio.");
      return;
    }

    if (reward < 10) {
      setErrorMsg("A recompensa mínima deve ser de 10 Coroas.");
      return;
    }

    // Check if user has enough Crowns to fund this challenge's reward
    const currentBalance = activeProfile.crowns || 0;
    if (currentBalance < reward) {
      setErrorMsg(`Saldo insuficiente! Você tem ${currentBalance} 👑, mas precisa de ${reward} 👑 para propor este prêmio.`);
      return;
    }

    // Try deducting the Crowns from user
    const spendSuccess = onSpendCrowns(
      activeProfile.id, 
      reward, 
      `Doador/Criador do Desafio: "${title.trim()}" 🏆`
    );

    if (!spendSuccess) {
      setErrorMsg("Ocorreu um erro ao debitar seu saldo de Crowns. Tente novamente.");
      return;
    }

    // Create challenge
    onCreateChallenge(title.trim(), description.trim(), reward, expiresIn);
    
    // Reset form states
    setTitle("");
    setDescription("");
    setReward(50);
    setExpiresIn("5 dias");
    setShowCreateForm(false);
    setSuccessMsg("Desafio lançado com sucesso com o prêmio financiado pelo seu saldo!");

    // Clear success message after 3.5s
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Claiming a challenge
  const handleClaimChallenge = (challenge: Challenge) => {
    if (claimedIds.includes(challenge.id)) return;

    if (isChallengeExpired(challenge)) {
      alert("⚠️ Este desafio expirou! Não é mais possível resgatar prêmios de desafios encerrados.");
      return;
    }

    const confirmClaim = window.confirm(
      `Você concluiu o desafio "${challenge.title}" de ${challenge.creatorName}?\nAo confirmar, você receberá o prêmio de ${challenge.reward} Wolly Crowns!`
    );

    if (confirmClaim) {
      // Award the reward Crowns to claimant
      onAwardCrowns(
        activeProfile.id, 
        challenge.reward, 
        `Completou o Desafio comunitário: "${challenge.title}" 🎉`
      );

      // Save to claimed list
      const updated = [...claimedIds, challenge.id];
      setClaimedIds(updated);
      localStorage.setItem(`wolly_claimed_challenges_${activeProfile.id}`, JSON.stringify(updated));
    }
  };

  // Filter challenges list based on selected subTab
  const filteredChallenges = challenges.filter((c) => {
    const expired = isChallengeExpired(c);
    if (subTab === "active") {
      return !expired;
    }
    if (subTab === "expired") {
      return expired;
    }
    if (subTab === "mine") {
      return c.creatorId === activeProfile.id;
    }
    if (subTab === "completed") {
      return claimedIds.includes(c.id);
    }
    return true; // "all"
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 text-left font-sans max-w-md mx-auto relative border-x border-slate-200/40">
      
      {/* Upper Navigation Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500"
          >
            <ArrowLeft className="w-[18px] h-[18px] stroke-[2.5px]" />
          </button>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-100" />
            <span className="font-display font-black text-slate-900 text-base leading-none">Desafios</span>
          </div>
        </div>

        {/* User Crowns Quick Balance Pill */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 shadow-3xs">
          <span className="text-[11px] font-black font-mono text-amber-700 leading-none">
            {activeProfile.crowns !== undefined ? activeProfile.crowns : 10} 👑
          </span>
          <span className="text-[8px] font-extrabold uppercase text-amber-600 font-sans tracking-wide leading-none">Crowns</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Banner Motivacional */}
        <div className="bg-gradient-to-tr from-indigo-650 to-purple-650 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute right-4 top-4 opacity-15">
            <Trophy className="w-16 h-16 text-white" />
          </div>
          
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-md self-start">
            Soberania de Atenção
          </span>
          <h3 className="text-base font-extrabold font-display leading-tight mt-2.5">
            Desafie a Rede Wolly!
          </h3>
          <p className="text-[11px] text-indigo-100 leading-relaxed font-normal mt-1.5">
            Crie desafios de fotos, vídeos, rotinas ou piadas. Incentive a comunidade financiando prêmios do seu próprio saldo de Coroas de forma orgânica e livre de algoritmos.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-bold font-sans"
          >
            ✓ {successMsg}
          </motion.div>
        )}

        {/* Filter Navigation Tabs and Propose Button */}
        <div className="flex items-center gap-2">
          <div className="flex-grow flex bg-slate-100 p-1 rounded-2xl gap-0.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSubTab("active")}
              className={`flex-1 min-w-[50px] py-1.8 text-center text-[10px] font-black rounded-xl transition-all cursor-pointer ${subTab === "active" ? "bg-white text-indigo-650 shadow-3xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              Ativos
            </button>
            <button
              onClick={() => setSubTab("expired")}
              className={`flex-1 min-w-[55px] py-1.8 text-center text-[10px] font-black rounded-xl transition-all cursor-pointer ${subTab === "expired" ? "bg-white text-rose-600 shadow-3xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              Expirados
            </button>
            <button
              onClick={() => setSubTab("mine")}
              className={`flex-1 min-w-[45px] py-1.8 text-center text-[10px] font-black rounded-xl transition-all cursor-pointer ${subTab === "mine" ? "bg-white text-indigo-650 shadow-3xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              Meus
            </button>
            <button
              onClick={() => setSubTab("completed")}
              className={`flex-1 min-w-[60px] py-1.8 text-center text-[10px] font-black rounded-xl transition-all cursor-pointer ${subTab === "completed" ? "bg-white text-emerald-600 shadow-3xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              Concluídos
            </button>
            <button
              onClick={() => setSubTab("all")}
              className={`flex-1 min-w-[45px] py-1.8 text-center text-[10px] font-black rounded-xl transition-all cursor-pointer ${subTab === "all" ? "bg-white text-indigo-650 shadow-3xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              Todos
            </button>
          </div>

          {/* Toggle Form Trigger Button */}
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setErrorMsg("");
            }}
            className={`p-2 rounded-2xl transition-all cursor-pointer shadow-3xs flex items-center justify-center ${showCreateForm ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            title="Lançar Novo Desafio"
          >
            {showCreateForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5 stroke-[2.5px]" />}
          </button>
        </div>

        {/* Expandable Form to Propose a Challenge */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleSubmitChallenge} className="bg-white rounded-3xl p-5 border border-slate-200/55 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-display font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" /> Propor Desafio Comunitário
                  </span>
                  <span className="text-[8px] bg-indigo-50 px-2 py-0.5 rounded-full text-indigo-600 font-extrabold font-mono uppercase">Financiamento Próprio</span>
                </div>

                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl text-[11px] font-bold">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {/* Título */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Título do Desafio</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Ex: Foto poética no espelho 🪞"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800 font-sans"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Regra ou Instrução de conclusão</label>
                  <textarea
                    required
                    maxLength={150}
                    rows={2}
                    placeholder="Ex: Tire uma foto criativa do seu reflexo usando um espelho estético e publique um post."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800 font-sans resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Prêmio Crowns */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Prêmio (Crowns)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={10}
                        max={1000}
                        value={reward}
                        onChange={(e) => setReward(Math.max(10, parseInt(e.target.value, 10) || 0))}
                        className="w-full text-xs pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800 font-mono font-bold"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs">👑</span>
                    </div>
                  </div>

                  {/* Expiração */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Tempo Limite</label>
                    <select
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white text-slate-800 font-sans font-medium"
                    >
                      <option value="24 horas">24 horas</option>
                      <option value="3 dias">3 dias</option>
                      <option value="5 dias">5 dias</option>
                      <option value="7 dias">7 dias</option>
                      <option value="15 dias">15 dias</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide uppercase rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-700/10"
                  >
                    Publicar & Debitar {reward} 👑
                  </button>
                  <p className="text-[9px] text-slate-400 text-center mt-2">
                    * {reward} Crowns serão deduzidos do seu perfil para garantir a recompensa comunitária.
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Challenges list */}
        <div className="space-y-3">
          {filteredChallenges.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200/40 text-center space-y-2.5 shadow-3xs">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-350">
                <Trophy className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-xs text-slate-700">Nenhum desafio encontrado</h4>
              <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                {subTab === "mine" 
                  ? "Você ainda não lançou nenhum desafio comunitário financiado." 
                  : subTab === "completed" 
                  ? "Nenhum desafio foi concluído ou resgatado por você ainda." 
                  : "Não há desafios ativos na rede Wolly no momento. Crie o primeiro!"}
              </p>
            </div>
          ) : (
            filteredChallenges.map((challenge) => {
              const isCreator = challenge.creatorId === activeProfile.id;
              const isClaimed = claimedIds.includes(challenge.id);
              const expired = isChallengeExpired(challenge);
              const timeInfo = getChallengeRemainingTime(challenge);

              return (
                <div 
                  key={challenge.id} 
                  className={`bg-white rounded-3xl border transition-all p-4.5 space-y-3.5 relative overflow-hidden ${
                    isClaimed 
                      ? "border-emerald-150 shadow-3xs" 
                      : expired 
                      ? "border-rose-200/80 bg-slate-50/50 shadow-3xs" 
                      : isCreator 
                      ? "border-indigo-150 shadow-xs" 
                      : "border-slate-200/55 shadow-xs"
                  }`}
                >
                  {/* Decorative badge for claim state / expiration */}
                  {isClaimed && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black tracking-wider uppercase px-3 py-1 rounded-bl-xl shadow-3xs flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3px]" /> Resgatado
                    </div>
                  )}

                  {!isClaimed && expired && (
                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black tracking-wider uppercase px-3 py-1 rounded-bl-xl shadow-3xs flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> Expirado
                    </div>
                  )}

                  {!isClaimed && !expired && isCreator && (
                    <div className="absolute top-0 right-0 bg-indigo-50 border-l border-b border-indigo-100 text-indigo-700 text-[8px] font-black tracking-wider uppercase px-3 py-1 rounded-bl-xl">
                      Seu Desafio
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Circle visual with custom avatar bg */}
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-display font-black text-sm relative shrink-0 ${expired ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-amber-50 border-amber-100 text-amber-600"}`}>
                      {expired ? "⌛" : "🏆"}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase block">
                        ★ {isCreator ? "Criado por você" : `Por @${challenge.creatorNickname.replace("@", "")}`}
                      </span>
                      <h4 className={`font-bold text-xs leading-snug break-words ${expired ? "text-slate-500 line-through" : "text-slate-850"}`}>
                        {challenge.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-normal whitespace-pre-wrap break-words">
                        {challenge.description}
                      </p>
                    </div>
                  </div>

                  {/* Horizontal info line and actions */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-slate-100/70">
                    <div className="flex items-center gap-3">
                      {/* Reward */}
                      <span className={`flex items-center gap-1 border text-[10px] font-black font-mono px-2 py-1 rounded-lg ${expired ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-amber-50 border-amber-100/70 text-amber-600"}`}>
                        <span>{challenge.reward} 👑</span>
                      </span>

                      {/* Expiration */}
                      <span className="flex items-center gap-1 text-[9.5px] font-mono">
                        <Clock className={`w-3 h-3 ${expired ? "text-rose-400" : "text-amber-500"}`} />
                        <span className={expired ? "text-rose-500 font-bold" : "text-slate-500"}>
                          {timeInfo.text}
                        </span>
                      </span>
                    </div>

                    {/* Action buttons */}
                    {isClaimed ? (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5" /> Concluído
                      </span>
                    ) : expired ? (
                      <span className="text-[9.5px] text-rose-400 font-extrabold bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl">
                        Encerrado
                      </span>
                    ) : isCreator ? (
                      <span className="text-[9px] text-slate-400 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100/80">
                        Monitorando respostas
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaimChallenge(challenge)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 hover:scale-103 active:scale-97 text-white font-bold text-[9.5px] tracking-wide rounded-xl transition-all cursor-pointer shadow-3xs uppercase"
                      >
                        Resgatar Prêmio
                      </button>
                    )}
                  </div>

                  {/* Time remaining progress bar */}
                  {!expired && !isClaimed && (
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-amber-400 to-indigo-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${timeInfo.percentRemaining}%` }} 
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
