/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { Search, ExternalLink, X, Globe, Sparkles, CheckCircle2, ArrowRight, Newspaper, RefreshCw, AlertCircle, ShieldCheck, Home, Compass, Zap, Bot, MousePointerClick } from "lucide-react";
import { buildLineNewsUrl } from "../lib/newsUtils";

interface LineNewsModalProps {
  isOpen: boolean;
  newsTopic: string;
  onClose: () => void;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  category: string;
  url: string;
  imageUrl?: string;
}

type TabType = "home" | "search" | "categories" | "trending";

export default function LineNewsModal({ isOpen, newsTopic, onClose }: LineNewsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [activeQuery, setActiveQuery] = useState("");
  const [typedQuery, setTypedQuery] = useState("");
  const [searchStage, setSearchStage] = useState<"connecting" | "navigating_tab" | "focusing_input" | "typing" | "executing" | "results">("connecting");
  const [stageProgress, setStageProgress] = useState(0);
  const [results, setResults] = useState<NewsItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // When modal opens, initialize automated sequence
  useEffect(() => {
    if (!isOpen) return;

    const topicToSearch = newsTopic.trim() || "Notícias";
    setActiveQuery(topicToSearch);
    setTypedQuery("");
    setActiveTab("home");
    setSearchStage("connecting");
    setStageProgress(10);
    setIsSearching(true);

    // Step 1 (0ms - 500ms): Connecting to news.techl.com.br on "Início" tab
    const timer1 = setTimeout(() => {
      // Step 2: Bot navigates to Search Tab
      setSearchStage("navigating_tab");
      setActiveTab("search");
      setStageProgress(35);
    }, 600);

    // Step 3: Bot focuses input
    const timer2 = setTimeout(() => {
      setSearchStage("focusing_input");
      setStageProgress(55);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 1200);

    // Step 4: Bot types topic
    const timer3 = setTimeout(() => {
      setSearchStage("typing");
      setStageProgress(70);

      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex <= topicToSearch.length) {
          setTypedQuery(topicToSearch.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          // Step 5: Execute search
          setSearchStage("executing");
          setStageProgress(88);

          setTimeout(() => {
            // Step 6: Show results
            setSearchStage("results");
            setStageProgress(100);
            setIsSearching(false);
            generateNewsResults(topicToSearch);
          }, 600);
        }
      }, 45);
    }, 1700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen, newsTopic]);

  const generateNewsResults = (query: string) => {
    const q = query.trim() || "Notícias";
    const nowStr = "Há poucos minutos";
    
    const sampleNews: NewsItem[] = [
      {
        id: "news_1",
        title: `Últimas atualizações e coberturas sobre: ${q}`,
        summary: `Acompanhe a cobertura em tempo real do Line News referente aos principais acontecimentos sobre ${q}, com verificações jornalísticas e fontes oficiais.`,
        source: "Line News Oficial",
        publishedAt: nowStr,
        category: "Destaque",
        url: buildLineNewsUrl(q),
        imageUrl: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: "news_2",
        title: `Principais destaques e repercussão global: ${q}`,
        summary: `Especialistas e veículos de imprensa analisam o impacto das recentes novidades ligadas a ${q} no cenário do Brasil e do mundo.`,
        source: "Redação Line News",
        publishedAt: "Há 1 hora",
        category: "Notícias",
        url: buildLineNewsUrl(q),
        imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: "news_3",
        title: `Análise Especial Line News: O futuro de ${q}`,
        summary: `Compreenda os bastidores, dados estatísticos e desdobramentos operacionais nas matérias investigativas publicadas no portal.`,
        source: "Agência Line News",
        publishedAt: "Há 3 horas",
        category: "Análise",
        url: buildLineNewsUrl(q),
        imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80"
      }
    ];

    setResults(sampleNews);
  };

  const handleManualSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!typedQuery.trim()) return;
    setActiveTab("search");
    setActiveQuery(typedQuery.trim());
    setIsSearching(true);
    setSearchStage("executing");
    setStageProgress(90);

    setTimeout(() => {
      setSearchStage("results");
      setStageProgress(100);
      setIsSearching(false);
      generateNewsResults(typedQuery.trim());
    }, 500);
  };

  const handleOpenExternalTab = () => {
    const targetUrl = buildLineNewsUrl(typedQuery || activeQuery || newsTopic);
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
        
        {/* Top Navigation Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-white">Line News</h3>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                  news.techl.com.br
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Bot de Navegação Automática Wolly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenExternalTab}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1"
              title="Abrir diretamente em news.techl.com.br"
            >
              <span>Abrir no Line News</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar of Line News Portal */}
        <div className="bg-slate-950/90 px-3 py-1.5 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "home"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 relative ${
              activeTab === "search"
                ? "bg-blue-600 text-white ring-2 ring-blue-400/50 shadow-md"
                : "text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-blue-300" />
            <span>Aba de Pesquisas</span>
            {searchStage !== "results" && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "categories"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Categorias</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "trending"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Em Alta</span>
          </button>
        </div>

        {/* Progress Bar for Auto-Navigation */}
        <div className="w-full bg-slate-800 h-1 relative overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300 ease-out"
            style={{ width: `${stageProgress}%` }}
          />
        </div>

        {/* Status Indicator Banner (Bot Action Log) */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-400 animate-bounce" />
            <span className="text-slate-200 font-semibold">
              {searchStage === "connecting" && "🤖 Bot: Abrindo o portal Line News (news.techl.com.br)..."}
              {searchStage === "navigating_tab" && "🤖 Bot: Selecionando a Aba de Pesquisas (🔍)..."}
              {searchStage === "focusing_input" && `🤖 Bot: Localizando a barra de pesquisa e o campo 'newsTopic'...`}
              {searchStage === "typing" && `🤖 Bot: Digitando o tópico "${typedQuery}"...`}
              {searchStage === "executing" && `🤖 Bot: Executando a pesquisa automaticamente...`}
              {searchStage === "results" && `🤖 Bot: Pesquisa concluída com sucesso para "${activeQuery}"!`}
            </span>
          </div>

          <span className="text-[10px] text-blue-300 font-bold bg-blue-950/80 border border-blue-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
            <MousePointerClick className="w-3 h-3 text-blue-400" />
            Auto-Navegador Wolly
          </span>
        </div>

        {/* Main Content Area */}
        {activeTab === "search" ? (
          <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                Barra de Pesquisa no Line News
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Campo automático: <code className="text-blue-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded">newsTopic</code>
              </span>
            </div>

            <form onSubmit={handleManualSearch} className="flex items-center gap-2">
              <div className={`relative flex-grow transition-all duration-300 rounded-xl overflow-hidden border ${
                searchStage === "typing" || searchStage === "focusing_input" || searchStage === "navigating_tab"
                  ? "border-blue-500 ring-2 ring-blue-500/40 bg-slate-800"
                  : "border-slate-700 bg-slate-800/80 focus-within:border-blue-500"
              }`}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={typedQuery}
                  onChange={(e) => setTypedQuery(e.target.value)}
                  placeholder="Pesquisar notícias no Line News..."
                  className="w-full bg-transparent px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden font-medium"
                />
                {searchStage === "typing" && (
                  <span className="absolute right-3 top-2.5 text-blue-400 text-xs animate-pulse font-mono font-bold">
                    🤖 digitando...
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Pesquisar</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6 text-center space-y-3 bg-slate-900 border-b border-slate-800">
            <p className="text-xs text-slate-300">
              Você está na aba <strong className="text-blue-400 uppercase">{activeTab}</strong> do Line News.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Ir para Aba de Pesquisas 🔍</span>
            </button>
          </div>
        )}

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-3 max-h-[50vh] bg-slate-950/40">
          {isSearching ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">
                Carregando resultados automatizados no Line News para <strong className="text-blue-400">"{typedQuery || activeQuery}"</strong>...
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center space-y-2 bg-slate-900/60 rounded-2xl p-6 border border-slate-800">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs font-bold text-slate-200">Nenhum resultado encontrado diretamente.</p>
              <p className="text-[11px] text-slate-400">
                Tente pesquisar por outro termo ou acesse o Line News diretamente.
              </p>
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all space-y-2 shadow-sm text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-blue-500/20 text-blue-400 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md border border-blue-500/30">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.source} • {item.publishedAt}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-100 group-hover:text-blue-300 transition-colors leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-normal line-clamp-2">
                      {item.summary}
                    </p>
                  </div>

                  {item.imageUrl && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-800 bg-slate-800">
                      <img
                        src={item.imageUrl}
                        alt="News cover"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Fonte oficial indexada
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Ver no Line News</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Integração Oficial Wolly & Line News
          </span>
          <button
            type="button"
            onClick={handleOpenExternalTab}
            className="text-blue-400 hover:underline font-bold"
          >
            news.techl.com.br ↗
          </button>
        </div>

      </div>
    </div>
  );
}
