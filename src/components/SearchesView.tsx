/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import {
  HelpCircle,
  Plus,
  Search as SearchIcon,
  CheckCircle2,
  ListFilter,
  BarChart3,
  Users,
  Eye,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Sliders,
  Award,
  Check,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, WollySearch, SearchVote, SearchType } from "../types";
import UserAvatar from "./UserAvatar";
import { db, handleFirestoreError, OperationType, cleanUndefined } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";

interface SearchesViewProps {
  activeProfile: Profile;
  profiles: Profile[];
  onVisitProfile: (profileId: string) => void;
  onAddRealNotification?: (message: string, type: string) => void;
}

export default function SearchesView({
  activeProfile,
  profiles,
  onVisitProfile,
  onAddRealNotification
}: SearchesViewProps) {
  const [searches, setSearches] = useState<WollySearch[]>([]);
  const [votesMap, setVotesMap] = useState<Record<string, SearchVote[]>>({});
  const [loading, setLoading] = useState(true);

  // Filter and search query states
  const [filterType, setFilterType] = useState<"all" | SearchType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<SearchType>("single");
  const [newOptions, setNewOptions] = useState<string[]>(["Opção 1", "Opção 2"]);
  const [newMaxScale, setNewMaxScale] = useState<number>(10);
  const [newScaleMinLabel, setNewScaleMinLabel] = useState("Discordo totalmente");
  const [newScaleMaxLabel, setNewScaleMaxLabel] = useState("Concordo totalmente");
  const [newRankingItems, setNewRankingItems] = useState<string[]>(["Item 1", "Item 2", "Item 3"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voting interaction state per card
  const [selectedSingleOption, setSelectedSingleOption] = useState<Record<string, string>>({});
  const [selectedMultipleOptions, setSelectedMultipleOptions] = useState<Record<string, string[]>>({});
  const [selectedScaleValues, setSelectedScaleValues] = useState<Record<string, number>>({});
  const [selectedRankingState, setSelectedRankingState] = useState<Record<string, string[]>>({});

  // Creator View Voters Modal State
  const [activeVotersModalSearch, setActiveVotersModalSearch] = useState<WollySearch | null>(null);

  // 1. Subscribe to Searches from Firestore
  useEffect(() => {
    const q = query(collection(db, "searches"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: WollySearch[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as WollySearch);
        });
        setSearches(list);
        setLoading(false);
      },
      (error) => {
        console.warn("Error fetching searches:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to Votes for each search
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    searches.forEach((search) => {
      const votesQuery = collection(db, "searches", search.id, "votes");
      const u = onSnapshot(
        votesQuery,
        (snapshot) => {
          const voteList: SearchVote[] = [];
          snapshot.forEach((doc) => {
            voteList.push({ id: doc.id, ...doc.data() } as SearchVote);
          });
          setVotesMap((prev) => ({ ...prev, [search.id]: voteList }));
        },
        (error) => {
          console.warn(`Error fetching votes for search ${search.id}:`, error);
        }
      );
      unsubs.push(u);
    });

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [searches.map((s) => s.id).join(",")]);

  // Handle option changes in creation form
  const handleOptionChange = (index: number, val: string) => {
    const updated = [...newOptions];
    updated[index] = val;
    setNewOptions(updated);
  };

  const handleAddOption = () => {
    if (newOptions.length < 10) {
      setNewOptions([...newOptions, `Opção ${newOptions.length + 1}`]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  // Ranking item changes
  const handleRankingItemChange = (index: number, val: string) => {
    const updated = [...newRankingItems];
    updated[index] = val;
    setNewRankingItems(updated);
  };

  const handleAddRankingItem = () => {
    if (newRankingItems.length < 5) {
      setNewRankingItems([...newRankingItems, `Item ${newRankingItems.length + 1}`]);
    }
  };

  const handleRemoveRankingItem = (index: number) => {
    if (newRankingItems.length > 2) {
      setNewRankingItems(newRankingItems.filter((_, i) => i !== index));
    }
  };

  // Create new Wolly Search
  const handleCreateSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const searchData: Omit<WollySearch, "id"> = {
        creatorId: activeProfile.id,
        creatorName: activeProfile.name,
        creatorNickname: activeProfile.nickname,
        creatorAvatar: activeProfile.avatar,
        creatorAvatarBg: activeProfile.avatarBg || "bg-indigo-600",
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        type: newType,
        createdAt: new Date().toISOString(),
        votesCount: 0
      };

      if (newType === "single" || newType === "multiple") {
        searchData.options = newOptions.map((o) => o.trim()).filter(Boolean);
      } else if (newType === "scale") {
        searchData.maxScale = newMaxScale;
        searchData.scaleMinLabel = newScaleMinLabel.trim() || "1 (Mínimo)";
        searchData.scaleMaxLabel = newScaleMaxLabel.trim() || `${newMaxScale} (Máximo)`;
      } else if (newType === "ranking") {
        searchData.options = newRankingItems.map((item) => item.trim()).filter(Boolean);
      }

      const docRef = await addDoc(collection(db, "searches"), cleanUndefined(searchData));
      
      // Notify user
      if (onAddRealNotification) {
        onAddRealNotification(`Wolly Search "${newTitle.slice(0, 20)}..." criada com sucesso! 📊`, "publish");
      }

      // Reset Form
      setNewTitle("");
      setNewDescription("");
      setNewType("single");
      setNewOptions(["Opção 1", "Opção 2"]);
      setNewMaxScale(10);
      setNewScaleMinLabel("Discordo totalmente");
      setNewScaleMaxLabel("Concordo totalmente");
      setNewRankingItems(["Item 1", "Item 2", "Item 3"]);
      setShowCreateModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "searches");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Vote
  const handleVote = async (search: WollySearch) => {
    const voteId = `${activeProfile.id}_vote`;
    const voteRef = doc(db, "searches", search.id, "votes", voteId);

    let votePayload: Partial<SearchVote> = {
      id: voteId,
      searchId: search.id,
      profileId: activeProfile.id,
      authorName: activeProfile.name,
      authorNickname: activeProfile.nickname,
      authorAvatar: activeProfile.avatar,
      authorAvatarBg: activeProfile.avatarBg || "bg-indigo-600",
      votedAt: new Date().toISOString()
    };

    if (search.type === "single") {
      const option = selectedSingleOption[search.id];
      if (!option) return;
      votePayload.selectedOptions = [option];
    } else if (search.type === "multiple") {
      const options = selectedMultipleOptions[search.id] || [];
      if (options.length === 0) return;
      votePayload.selectedOptions = options;
    } else if (search.type === "scale") {
      const val = selectedScaleValues[search.id];
      if (val === undefined) return;
      votePayload.scaleValue = val;
    } else if (search.type === "ranking") {
      const items = selectedRankingState[search.id] || search.options || [];
      if (items.length === 0) return;
      votePayload.rankingItems = items;
    }

    try {
      await setDoc(voteRef, cleanUndefined(votePayload));
      if (onAddRealNotification) {
        onAddRealNotification(`Voto registrado em "${search.title.slice(0, 20)}..."! 🗳️`, "vote");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `searches/${search.id}/votes/${voteId}`);
    }
  };

  // Delete search
  const handleDeleteSearch = async (searchId: string) => {
    if (!window.confirm("Deseja realmente excluir esta Wolly Search?")) return;
    try {
      await deleteDoc(doc(db, "searches", searchId));
      if (onAddRealNotification) {
        onAddRealNotification("Wolly Search excluída.", "delete");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `searches/${searchId}`);
    }
  };

  // Move item in ranking
  const moveRankingItem = (searchId: string, currentIndex: number, direction: "up" | "down", currentList: string[]) => {
    const list = [...currentList];
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;
    setSelectedRankingState((prev) => ({ ...prev, [searchId]: list }));
  };

  // Filtered searches list
  const filteredSearches = searches.filter((s) => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = (s.description || "").toLowerCase().includes(q);
      const matchAuthor = s.creatorName.toLowerCase().includes(q) || s.creatorNickname.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchAuthor;
    }
    return true;
  });

  return (
    <div id="wolly-searches-view-root" className="min-h-screen bg-slate-50 text-slate-800 pb-28 relative select-none">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white px-5 py-6 shadow-md border-b border-indigo-800/50">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold shadow-inner">
                <BarChart3 className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Wolly Searches</span>
                  <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-400/20">
                    PESQUISAS
                  </span>
                </h1>
                <p className="text-xs text-indigo-200/80">Opine, vote e crie pesquisas com a comunidade</p>
              </div>
            </div>

            <button
              id="btn-open-create-search"
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-2xl shadow-lg transition-all transform hover:scale-105 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Criar Search</span>
            </button>
          </div>

          {/* Explicit Notice Banner */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-xs text-indigo-100 flex items-start gap-2.5 leading-relaxed">
            <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Transparência nas Pesquisas Wolly</span>
              <span className="text-[11px] text-indigo-100/90">
                O criador da pesquisa pode visualizar quem votou e quais foram as opções escolhidas. Seus votos são explícitos para o autor.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search Input */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por pergunta, tema ou autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-xs font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFilterType("single")}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              filterType === "single"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>🔘 Escolha Única</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("multiple")}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              filterType === "multiple"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>☑️ Múltipla Escolha</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("scale")}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              filterType === "scale"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>📊 Escala (1-10)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("ranking")}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              filterType === "ranking"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>🥇 Ranking (até 5)</span>
          </button>
        </div>
      </div>

      {/* Main Searches Container */}
      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">Carregando Wolly Searches...</p>
          </div>
        ) : filteredSearches.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Nenhuma pesquisa encontrada</h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || filterType !== "all"
                  ? "Tente ajustar os filtros ou termos de busca."
                  : "Seja o primeiro a publicar uma Wolly Search para a comunidade!"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Criar a Primeira Search</span>
            </button>
          </div>
        ) : (
          filteredSearches.map((search) => {
            const votes = votesMap[search.id] || [];
            const myVote = votes.find((v) => v.profileId === activeProfile.id);
            const isCreator = search.creatorId === activeProfile.id;

            // Compute aggregates
            const totalVotes = votes.length;

            return (
              <div
                key={search.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all space-y-4 relative overflow-hidden"
              >
                {/* Search Header */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => onVisitProfile(search.creatorId)}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <UserAvatar
                      avatar={search.creatorAvatar}
                      name={search.creatorName}
                      className="w-10 h-10 border border-slate-100"
                      bgClassName={search.creatorAvatarBg || "bg-indigo-600"}
                      textClassName="text-sm font-black text-white"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {search.creatorName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {search.creatorNickname}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search Type Badge */}
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {search.type === "single" && "🔘 Escolha Única"}
                      {search.type === "multiple" && "☑️ Múltipla Escolha"}
                      {search.type === "scale" && "📊 Escala (1-10)"}
                      {search.type === "ranking" && "🥇 Ranking"}
                    </span>

                    {/* Delete button if owner */}
                    {isCreator && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSearch(search.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Excluir Pesquisa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <h2 className="text-base font-black text-slate-900 leading-snug">
                    {search.title}
                  </h2>
                  {search.description && (
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {search.description}
                    </p>
                  )}
                </div>

                {/* Explicit Owner Notice */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-2.5 text-[11px] text-slate-600 flex items-center gap-2 font-medium">
                  <Eye className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span>
                    O criador (<strong className="text-slate-800">{search.creatorNickname}</strong>) pode ver quem votou e suas escolhas.
                  </span>
                </div>

                {/* Search Voting Interface / Results */}
                <div className="pt-1">
                  {!myVote ? (
                    /* VOTING FORM BEFORE RESPONSE */
                    <div className="space-y-3 bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60">
                      
                      {/* TYPE: SINGLE CHOICE */}
                      {search.type === "single" && (
                        <div className="space-y-2">
                          {(search.options || []).map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                                selectedSingleOption[search.id] === opt
                                  ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`single_${search.id}`}
                                value={opt}
                                checked={selectedSingleOption[search.id] === opt}
                                onChange={() =>
                                  setSelectedSingleOption((prev) => ({ ...prev, [search.id]: opt }))
                                }
                                className="accent-indigo-600 w-4 h-4"
                              />
                              <span className="text-xs font-medium">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* TYPE: MULTIPLE CHOICE */}
                      {search.type === "multiple" && (
                        <div className="space-y-2">
                          {(search.options || []).map((opt) => {
                            const currentList = selectedMultipleOptions[search.id] || [];
                            const isChecked = currentList.includes(opt);
                            return (
                              <label
                                key={opt}
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMultipleOptions((prev) => ({
                                        ...prev,
                                        [search.id]: [...currentList, opt]
                                      }));
                                    } else {
                                      setSelectedMultipleOptions((prev) => ({
                                        ...prev,
                                        [search.id]: currentList.filter((o) => o !== opt)
                                      }));
                                    }
                                  }}
                                  className="accent-indigo-600 w-4 h-4 rounded-md"
                                />
                                <span className="text-xs font-medium">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* TYPE: SCALE (1 to 10) */}
                      {search.type === "scale" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                            <span>{search.scaleMinLabel || "1 (Mínimo)"}</span>
                            <span>{search.scaleMaxLabel || "10 (Máximo)"}</span>
                          </div>
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                            {Array.from({ length: search.maxScale || 10 }, (_, i) => i + 1).map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setSelectedScaleValues((prev) => ({ ...prev, [search.id]: val }))
                                }
                                className={`py-2.5 rounded-xl font-mono font-black text-xs transition-all cursor-pointer ${
                                  selectedScaleValues[search.id] === val
                                    ? "bg-indigo-600 text-white shadow-md scale-105"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                          {selectedScaleValues[search.id] !== undefined && (
                            <p className="text-center text-xs font-bold text-indigo-600 pt-1">
                              Sua nota selecionada: <span className="text-sm font-mono">{selectedScaleValues[search.id]}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* TYPE: RANKING (up to 5 items) */}
                      {search.type === "ranking" && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-slate-500 mb-2">
                            Ordene os itens do 1º (topo) ao último usando as setas:
                          </p>
                          {((selectedRankingState[search.id] || search.options || [])).map((item, idx) => (
                            <div
                              key={item}
                              className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-mono font-black text-xs flex items-center justify-center">
                                  {idx + 1}º
                                </span>
                                <span className="text-xs font-bold text-slate-800">{item}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() =>
                                    moveRankingItem(
                                      search.id,
                                      idx,
                                      "up",
                                      selectedRankingState[search.id] || search.options || []
                                    )
                                  }
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 rounded-lg transition-all cursor-pointer"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    idx ===
                                    ((selectedRankingState[search.id] || search.options || []).length - 1)
                                  }
                                  onClick={() =>
                                    moveRankingItem(
                                      search.id,
                                      idx,
                                      "down",
                                      selectedRankingState[search.id] || search.options || []
                                    )
                                  }
                                  className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 rounded-lg transition-all cursor-pointer"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* SUBMIT VOTE BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleVote(search)}
                        disabled={
                          (search.type === "single" && !selectedSingleOption[search.id]) ||
                          (search.type === "multiple" &&
                            (!selectedMultipleOptions[search.id] ||
                              selectedMultipleOptions[search.id].length === 0)) ||
                          (search.type === "scale" && selectedScaleValues[search.id] === undefined)
                        }
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer mt-2 flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar Resposta</span>
                      </button>
                    </div>
                  ) : (
                    /* ALREADY VOTED STATE & AGGREGATE SUMMARY */
                    <div className="space-y-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4">
                      
                      {/* Voted Confirmation Badge */}
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Você respondeu esta pesquisa</span>
                        </span>
                        <span className="text-[10px] text-indigo-600 font-mono font-medium">
                          {totalVotes} {totalVotes === 1 ? "voto" : "votos"}
                        </span>
                      </div>

                      {/* MY SUBMITTED ANSWER BREAKDOWN */}
                      <div className="bg-white/80 rounded-xl p-3 border border-indigo-100 space-y-1">
                        <span className="text-[10px] uppercase font-extrabold text-indigo-500 block tracking-wider">
                          Sua Resposta:
                        </span>
                        {myVote.selectedOptions && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {myVote.selectedOptions.map((opt) => (
                              <span
                                key={opt}
                                className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {myVote.scaleValue !== undefined && (
                          <p className="text-sm font-black text-indigo-900 font-mono">
                            Nota {myVote.scaleValue} / {search.maxScale || 10}
                          </p>
                        )}
                        {myVote.rankingItems && (
                          <div className="space-y-1 pt-1">
                            {myVote.rankingItems.map((item, idx) => (
                              <div key={item} className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                                <span className="font-mono font-bold text-indigo-600">{idx + 1}º</span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* AGGREGATE RESULTS FOR SINGLE / MULTIPLE */}
                      {(search.type === "single" || search.type === "multiple") && search.options && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                            Resultados Gerais ({totalVotes} votos):
                          </span>
                          {search.options.map((opt) => {
                            const optionVotesCount = votes.filter((v) =>
                              v.selectedOptions?.includes(opt)
                            ).length;
                            const percentage =
                              totalVotes > 0 ? Math.round((optionVotesCount / totalVotes) * 100) : 0;

                            return (
                              <div key={opt} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-slate-700">
                                  <span>{opt}</span>
                                  <span className="font-mono text-slate-500">{percentage}% ({optionVotesCount})</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* AGGREGATE AVERAGE FOR SCALE */}
                      {search.type === "scale" && totalVotes > 0 && (
                        <div className="space-y-1 pt-1 text-center bg-white/60 p-3 rounded-xl border border-indigo-100">
                          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                            Média da Comunidade:
                          </span>
                          {(() => {
                            const sum = votes.reduce((acc, v) => acc + (v.scaleValue || 0), 0);
                            const avg = (sum / totalVotes).toFixed(1);
                            return (
                              <p className="text-2xl font-black text-indigo-600 font-mono">
                                {avg} <span className="text-xs text-slate-400">/ {search.maxScale || 10}</span>
                              </p>
                            );
                          })()}
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {totalVotes} {totalVotes === 1 ? "voto registrado" : "votos registrados"}
                  </span>

                  {/* SPECIAL CREATOR BUTTON TO SEE ALL DETAILED VOTERS */}
                  {isCreator && (
                    <button
                      type="button"
                      onClick={() => setActiveVotersModalSearch(search)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ver quem votou ({totalVotes})</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* CREATE SEARCH MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar relative">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Nova Wolly Search</h3>
                <p className="text-xs text-slate-500">Crie uma pesquisa interativa para a rede</p>
              </div>
            </div>

            <form onSubmit={handleCreateSearch} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Pergunta ou Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Qual a melhor linguagem de programação em 2026?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Descrição (Opcional)</label>
                <textarea
                  placeholder="Dê mais detalhes sobre o contexto da pesquisa..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-medium resize-none h-16"
                />
              </div>

              {/* Search Type Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Tipo de Pesquisa *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("single")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newType === "single"
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs font-extrabold">🔘 Escolha Única</span>
                    <span className="text-[10px] text-slate-500 block font-normal">Apenas 1 opção escolhida</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType("multiple")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newType === "multiple"
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs font-extrabold">☑️ Múltipla Escolha</span>
                    <span className="text-[10px] text-slate-500 block font-normal">Selecione uma ou mais</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType("scale")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newType === "scale"
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs font-extrabold">📊 Escala (1-10)</span>
                    <span className="text-[10px] text-slate-500 block font-normal">Avaliação de 1 até 10</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType("ranking")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      newType === "ranking"
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs font-extrabold">🥇 Ranking (Até 5)</span>
                    <span className="text-[10px] text-slate-500 block font-normal">Ordenar por prioridade</span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC OPTIONS INPUTS */}
              {(newType === "single" || newType === "multiple") && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-700 block">Opções de Resposta</label>
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Opção ${idx + 1}`}
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-medium"
                      />
                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {newOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar outra opção</span>
                    </button>
                  )}
                </div>
              )}

              {/* SCALE INPUTS */}
              {newType === "scale" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block">Rótulo Mínimo (1)</label>
                      <input
                        type="text"
                        value={newScaleMinLabel}
                        onChange={(e) => setNewScaleMinLabel(e.target.value)}
                        placeholder="Ex: Discordo totalmente"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block">Rótulo Máximo (10)</label>
                      <input
                        type="text"
                        value={newScaleMaxLabel}
                        onChange={(e) => setNewScaleMaxLabel(e.target.value)}
                        placeholder="Ex: Concordo totalmente"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* RANKING INPUTS */}
              {newType === "ranking" && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-700 block">Itens para Ranquear (Até 5)</label>
                  {newRankingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400 w-5">{idx + 1}º</span>
                      <input
                        type="text"
                        required
                        value={item}
                        onChange={(e) => handleRankingItemChange(idx, e.target.value)}
                        placeholder={`Item ${idx + 1}`}
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-medium"
                      />
                      {newRankingItems.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRankingItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {newRankingItems.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddRankingItem}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar item ao ranking</span>
                    </button>
                  )}
                </div>
              )}

              {/* Explicit Transparency Warning Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso do Wolly:</strong> Como autor desta pesquisa, você poderá ver a lista completa de perfis que votaram e suas respectivas escolhas.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Publicando...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Publicar Search</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATOR DETAILED VOTERS LIST MODAL */}
      {activeVotersModalSearch && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar relative">
            <button
              type="button"
              onClick={() => setActiveVotersModalSearch(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Votantes e Respostas</h3>
                <p className="text-xs text-slate-500">
                  Apenas você (<strong className="text-slate-800">{activeVotersModalSearch.creatorNickname}</strong>) possui acesso
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">{activeVotersModalSearch.title}</span>
              <span className="text-[10px] text-slate-500 font-mono">
                Total de votos registrados: {(votesMap[activeVotersModalSearch.id] || []).length}
              </span>
            </div>

            {/* List of votes */}
            <div className="space-y-3 pt-1">
              {(votesMap[activeVotersModalSearch.id] || []).length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs italic">
                  Nenhum voto registrado nesta pesquisa até o momento.
                </p>
              ) : (
                (votesMap[activeVotersModalSearch.id] || []).map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => {
                          setActiveVotersModalSearch(null);
                          onVisitProfile(v.profileId);
                        }}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <UserAvatar
                          avatar={v.authorAvatar}
                          name={v.authorName}
                          className="w-8 h-8"
                          bgClassName={v.authorAvatarBg || "bg-indigo-600"}
                          textClassName="text-xs font-black text-white"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {v.authorName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {v.authorNickname}
                          </span>
                        </div>
                      </div>

                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(v.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-800 space-y-1">
                      <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider">
                        Escolha do usuário:
                      </span>
                      {v.selectedOptions && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {v.selectedOptions.map((opt) => (
                            <span
                              key={opt}
                              className="bg-indigo-600 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-md"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                      {v.scaleValue !== undefined && (
                        <p className="font-mono font-black text-indigo-700 text-sm">
                          Nota {v.scaleValue} / {activeVotersModalSearch.maxScale || 10}
                        </p>
                      )}
                      {v.rankingItems && (
                        <div className="space-y-0.5 pt-0.5">
                          {v.rankingItems.map((item, idx) => (
                            <div key={item} className="text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
                              <span className="font-mono font-bold text-indigo-600">{idx + 1}º:</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveVotersModalSearch(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
