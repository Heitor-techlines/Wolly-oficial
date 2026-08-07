/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Shield, ArrowLeft, Download, Trash2, Database, Sliders, CheckCircle2, History, Info } from "lucide-react";
import { motion } from "motion/react";
import { Profile, Post, Clip } from "../types";

interface TransparencyCenterProps {
  onBack: () => void;
  profiles: Profile[];
  posts: Post[];
  clips: Clip[];
  activeProfile: Profile;
  onResetAllData: () => void;
}

export default function TransparencyCenter({
  onBack,
  profiles,
  posts,
  clips,
  activeProfile,
  onResetAllData,
}: TransparencyCenterProps) {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Download all user data locally to represent ultimate "transparência e controle"
  const handleExportData = () => {
    const dataToExport = {
      exportedAt: new Date().toISOString(),
      platform: "Wolly Social Network",
      author: activeProfile.name,
      activeProfileNickname: activeProfile.nickname,
      allProfilesCount: profiles.length,
      allProfiles: profiles.map(p => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        bio: p.bio,
        followers: p.followersCount,
        following: p.followingCount,
        postsCount: p.postsCount,
        followingList: p.followingIds
      })),
      localPosts: posts.map(pos => ({
        id: pos.id,
        author: pos.authorName,
        content: pos.content,
        theme: pos.theme,
        createdAt: pos.createdAt,
        likes: pos.likes
      })),
      localClips: clips.map(c => ({
        id: c.id,
        author: c.authorName,
        description: c.description,
        location: c.location,
        likes: c.likes
      }))
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToExport, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `wolly-transparencia-dados-${activeProfile.nickname}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div id="transparency-center" className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top sticky header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        <button id="btn-back-transp" onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1">
          <h1 className="font-display font-bold text-lg text-slate-900 flex items-center justify-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" /> Centro de Transparência Wolly
          </h1>
          <p className="text-xs text-slate-500">Controle total e auditoria de seus dados</p>
        </div>
        <div className="w-9" /> {/* spacer */}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Anti-Algorithm Oath */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-950 to-slate-900 text-indigo-100 rounded-2xl p-6 shadow-md border border-indigo-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30 text-indigo-400 mt-1">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">Nosso Compromisso com Você</h2>
              <p className="text-sm mt-2 text-indigo-200/90 leading-relaxed font-sans">
                O Wolly foi desenvolvido sob o princípio do <strong>respeito à atenção</strong>.
                Não coletamos telemetria sigilosa, não rastreamos seu histórico externo e 
                nosso feed é <strong>estritamente cronológico</strong>. Não usamos inteligência artificial 
                para prender seus olhos de forma aditiva.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-indigo-300 font-mono">
                <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded">✓ Sem Algoritmos de Recomendação</span>
                <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded">✓ Feed 100% Ordinal</span>
                <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded">✓ Zero Mineração de Perfil</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Database Audit Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Database className="w-5 h-5 text-indigo-500" />
            <h3 className="font-display font-semibold text-base">Seu Armazenamento Local</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nenhum dos seus dados é de propriedade exclusiva da nossa infraestrutura. Todo o seu estado de múltiplos perfis, postagens que você criou e curtidas ficam visíveis e sincronizados abertamente.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <span className="block text-2xl font-bold text-slate-800 font-display">{profiles.length}</span>
              <span className="text-xs text-slate-500">Perfis Registrados</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <span className="block text-2xl font-bold text-slate-800 font-display">{posts.length}</span>
              <span className="text-xs text-slate-500">Publicações</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <span className="block text-2xl font-bold text-slate-800 font-display">{clips.length}</span>
              <span className="text-xs text-slate-500">Clipes Curtidos</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {/* Download Data Button */}
            <button
              id="btn-export-data"
              onClick={handleExportData}
              className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Exportar Meus Dados (.JSON)
            </button>
            
            {/* Delete All Data Button */}
            <button
              id="btn-confirm-delete"
              onClick={() => setShowConfirmReset(true)}
              className="px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Restaurar Conta / Limpar Tudo
            </button>
          </div>

          {downloadSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Seus dados foram processados e baixados como arquivo JSON com sucesso! Abra-o no computador para inspecionar os objetos salvos livremente.</span>
            </motion.div>
          )}
        </div>

        {/* Audit Log / Transparency Logs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-slate-900 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-semibold text-base">Registros de Transparência do Feed</h3>
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">Modo: Cronológico Estrito</span>
          </div>

          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl font-mono">
            <p className="flex justify-between">
              <span>ALGORITMO DE RECOMENDAÇÃO:</span>
              <span className="text-red-600 font-bold">DESATIVADO / INEXISTENTE</span>
            </p>
            <p className="flex justify-between pt-1 border-t border-slate-200/50">
              <span>SISTEMA DE ANÚNCIOS ESPIÕES:</span>
              <span className="text-emerald-600 font-bold">BLOQUEADO</span>
            </p>
            <p className="flex justify-between pt-1 border-t border-slate-200/50">
              <span>ORDENAÇÃO DAS POSTAGENS:</span>
              <span className="text-indigo-600 font-bold">TIMESTAMP DESCENDENTE (NEWEST FIRST)</span>
            </p>
          </div>

          <p className="text-xs text-slate-500 font-sans italic leading-relaxed">
            No Wolly, cada publicação em seu Feed exibe uma etiqueta de transparência para que você sempre saiba exatamente o motivo daquele conteúdo estar na sua tela.
          </p>

          <div className="space-y-2.5">
            <div className="p-3 border border-slate-100 rounded-xl flex items-start gap-2.5 bg-slate-50/50">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Origem: Post por "Diariamente Fotografia"</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Relação: "Aprovado porque o seu perfil ativo segue esta conta diretamente."</p>
              </div>
            </div>
            <div className="p-3 border border-slate-100 rounded-xl flex items-start gap-2.5 bg-slate-50/50">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Origem: Post por "Ana"</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Relação: "Aprovado por ser um anúncio público global do criador oficial."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Audit FAQ */}
        <div className="bg-slate-200/30 rounded-2xl p-6 border border-slate-100 space-y-3">
          <h4 className="font-display font-medium text-sm text-slate-900">Perguntas Frequentes sobre nossa Governança</h4>
          <div className="space-y-3 text-xs leading-relaxed text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">O que significa possuir múltiplos perfis?</p>
              <p className="mt-1">Significa que você pode criar diferentes identidades digitais sob o mesmo login. O Wolly garante que as interações, seguidores e histórico de um perfil não vazem e nem sejam conectados aos outros perfis por anunciantes.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Como funciona a integração com a Line 123?</p>
              <p className="mt-1">A IA Line 123 é totalmente opcional e processada via servidores protegidos com as chaves oficiais do Google (Gemini) sem espionagem comportamental. Ela serve unicamente para ajudar você a gerar conteúdos livres e auditar sua privacidade.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Reset Dialog Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-2xl space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-slate-900 text-center">Tem certeza absoluta?</h3>
            <p className="text-sm text-slate-600 text-center">
              Isso apagará permanentemente todos os perfis customizados, publicações criadas e configurações locais do Wolly, retornando ao estado de demonstração original.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                id="btn-cancel-reset"
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-reset-ok"
                onClick={() => {
                  onResetAllData();
                  setShowConfirmReset(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-xl transition-all cursor-pointer text-center"
              >
                Sim, Limpar Tudo!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
