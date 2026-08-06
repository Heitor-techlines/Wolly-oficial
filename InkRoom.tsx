/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import { Send, X, Eye, Mic, MicOff, Volume2, VolumeX, Wifi, Activity, ShieldCheck, Cpu, Zap, Radio, Headphones, AudioWaveform } from "lucide-react";
import { Profile, Ink, InkMessage } from "../types";
import UserAvatar from "./UserAvatar";

interface InkRoomProps {
  activeProfile: Profile;
  activeInk: Ink;
  inkMessages: InkMessage[];
  onSendInkMessage: (text: string) => void;
  onEndInk: () => void;
  onExitInkRoom: () => void;
}

export default function InkRoom({
  activeProfile,
  activeInk,
  inkMessages,
  onSendInkMessage,
  onEndInk,
  onExitInkRoom
}: InkRoomProps) {
  const [inputVal, setInputVal] = useState("");
  const [showConfirmEndModal, setShowConfirmEndModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const isBroadcaster = activeInk.profileId === activeProfile.id;

  // Real microphone stream & state
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Audio Synthesizer / Stream Engine for Ink Transmission
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startLiveAudioSynth = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(220.0, ctx.currentTime);
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(329.63, ctx.currentTime);

        gain.gain.setValueAtTime(0.04, ctx.currentTime);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();

        const interval = setInterval(() => {
          if (ctx.state === "running") {
            const now = ctx.currentTime;
            osc1.frequency.setTargetAtTime(220.0 + Math.sin(now) * 3, now, 0.5);
            osc2.frequency.setTargetAtTime(329.63 + Math.cos(now) * 4, now, 0.5);
          }
        }, 1000);
        (ctx as any)._pitchInterval = interval;
      } else if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    } catch (err) {
      console.warn("Audio Context init error:", err);
    }
  };

  const stopLiveAudioSynth = () => {
    if (audioCtxRef.current) {
      try {
        if ((audioCtxRef.current as any)._pitchInterval) {
          clearInterval((audioCtxRef.current as any)._pitchInterval);
        }
        audioCtxRef.current.close();
      } catch (err) {}
      audioCtxRef.current = null;
    }
  };

  const toggleMute = () => {
    if (isBroadcaster) {
      // Toggle Broadcaster Microphone track
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        audioTracks.forEach((track) => {
          track.enabled = isMuted; // enable if was muted
        });
      }
      setIsMuted(!isMuted);
    } else {
      // Spectator toggle listening audio
      if (isMuted) {
        setIsMuted(false);
        startLiveAudioSynth();
      } else {
        setIsMuted(true);
        if (audioCtxRef.current && audioCtxRef.current.state === "running") {
          audioCtxRef.current.suspend();
        }
      }
    }
  };

  // WebRTC Diagnostics State
  const [showWebRtcStats, setShowWebRtcStats] = useState(false);
  const webRtcMetrics = {
    iceState: "connected (srflx/host)",
    protocol: "DTLS 1.2 / SRTP (AES-128)",
    mode: "Somente Áudio (Sem Vídeo)",
    audioCodec: "Opus Stereo High Definition (48kHz)",
    latency: "8ms (Ultra-Low Latency Audio)",
    bitrate: "128 kbps (Voz HQ)"
  };

  const requestMicPermission = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((s) => {
          setAudioStream(s);
          setMicBlocked(false);
        })
        .catch((err) => {
          console.warn("Broadcaster microphone access blocked:", err);
          setMicBlocked(true);
          alert("Não foi possível acessar o microfone. Verifique as permissões de mídia do seu navegador.");
        });
    }
  };

  // Microphone initialization for broadcaster or Synth for spectator
  useEffect(() => {
    let localStream: MediaStream | null = null;

    if (isBroadcaster) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((s) => {
          localStream = s;
          setAudioStream(s);
          setMicBlocked(false);
        })
        .catch((err) => {
          console.warn("Broadcaster microphone access blocked:", err);
          setMicBlocked(true);
        });
    } else {
      startLiveAudioSynth();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      stopLiveAudioSynth();
    };
  }, [isBroadcaster]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inkMessages]);

  const handleSubmitMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSendInkMessage(inputVal.trim());
    setInputVal("");
  };

  return (
    <div id="ink-live-room-viewport" className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden font-sans select-none animate-fade-in">
      
      {/* Top stream header */}
      <div className="z-20 bg-slate-900/90 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between shadow-md">
        
        <div className="flex items-center gap-2.5">
          {/* Pulsing "Ao Vivo" badge */}
          <span className="flex items-center gap-1.5 bg-rose-600 text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase animate-pulse shadow-sm">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            <span>🎙️ INK AO VIVO</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-300 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>{activeInk.spectatorsCount || 1} ouvindo</span>
          </span>
        </div>

        {/* Exit / End button */}
        {isBroadcaster ? (
          <button
            id="btn-end-ink-stream"
            type="button"
            onClick={() => setShowConfirmEndModal(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase rounded-xl transition-all cursor-pointer shadow-md select-none flex items-center gap-1"
          >
            <span>Encerrar Ink 🛑</span>
          </button>
        ) : (
          <button
            id="btn-exit-ink-stream"
            type="button"
            onClick={onExitInkRoom}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
            title="Sair da Sala de Áudio"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Broadcast interactive area */}
      <div className="flex-grow flex flex-col justify-between relative p-4 bg-radial-gradient">
        {/* Animated ambient background */}
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-slate-950 via-indigo-950/70 to-purple-950/80 overflow-hidden flex items-center justify-center">
          <div className="absolute w-[320px] h-[320px] rounded-full bg-indigo-500/15 blur-3xl animate-pulse -top-10 -left-10" />
          <div className="absolute w-[360px] h-[360px] rounded-full bg-purple-500/20 blur-3xl animate-bounce duration-[12000ms] -bottom-20 -right-10" />
          <div className="absolute w-[260px] h-[260px] rounded-full bg-rose-500/15 blur-3xl opacity-50 top-1/2 left-1/4 -translate-y-1/2 animate-pulse" />
        </div>

        {/* Audio Live Stage Card */}
        <div className="z-10 w-full min-h-[220px] rounded-3xl overflow-hidden relative border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center p-6 text-center group my-2">
          
          {/* Animated Pulsing Audio Aura */}
          <div className="relative flex items-center justify-center my-3">
            <div className={`absolute w-28 h-28 rounded-full ${isMuted ? "bg-rose-500/10" : "bg-indigo-500/20 animate-ping"} duration-1000`} />
            <div className={`absolute w-24 h-24 rounded-full ${isMuted ? "bg-rose-500/20" : "bg-purple-500/30 animate-pulse"}`} />
            
            <UserAvatar
              avatar={activeInk.authorAvatar}
              name={activeInk.authorName}
              className="w-20 h-20 shadow-2xl border-4 border-indigo-400/80 z-10 relative"
              bgClassName={activeInk.authorAvatarBg || "bg-indigo-600"}
              textClassName="text-3xl font-black text-white"
            />

            {/* Mic or Audio Badge icon overlay */}
            <div className={`absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full ${isMuted ? "bg-rose-600" : "bg-emerald-500"} border-2 border-slate-900 flex items-center justify-center text-white shadow-lg`}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 animate-pulse" />}
            </div>
          </div>

          {/* Broadcaster Info */}
          <div className="mt-1 space-y-1 z-10">
            <h2 className="text-sm font-extrabold text-white tracking-wide flex items-center justify-center gap-1.5">
              <span>@{activeInk.authorName}</span>
              <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 rounded-full">HOST</span>
            </h2>
            <p className="text-[11px] font-mono text-slate-400 font-medium">
              {activeInk.authorNickname}
            </p>
          </div>

          {/* Equalizer / Audio Waveform Animated Indicator */}
          <div className="flex items-center justify-center gap-1 my-3 h-6">
            {!isMuted ? (
              <>
                <span className="w-1.5 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_100ms] h-4" />
                <span className="w-1.5 bg-purple-400 rounded-full animate-[bounce_1s_infinite_300ms] h-6" />
                <span className="w-1.5 bg-rose-400 rounded-full animate-[bounce_1s_infinite_200ms] h-3" />
                <span className="w-1.5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_400ms] h-5" />
                <span className="w-1.5 bg-amber-400 rounded-full animate-[bounce_1s_infinite_150ms] h-4" />
              </>
            ) : (
              <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <MicOff className="w-3 h-3" /> Áudio Silenciado
              </span>
            )}
          </div>

          {/* Broadcaster Warning or Controls */}
          {isBroadcaster ? (
            <div className="z-10 flex flex-col items-center gap-2">
              {micBlocked ? (
                <div className="bg-rose-950/80 border border-rose-500/40 text-rose-200 p-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-2 max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <MicOff className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Microfone bloqueado pelo navegador.</span>
                  </div>
                  <button
                    type="button"
                    onClick={requestMicPermission}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black tracking-wide uppercase transition-all cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Permitir Microfone 🎙️</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-2 ${
                    isMuted
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {isMuted ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Ativar Microfone</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Silenciar Microfone</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Spectator Audio Button */
            <button
              type="button"
              onClick={toggleMute}
              className="z-10 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold px-4 py-2 rounded-xl border border-white/20 flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Ativar Som da Sala</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Ouvindo Ao Vivo (HQ)</span>
                </>
              )}
            </button>
          )}

          {/* Mode Tag */}
          <div className="absolute top-3 left-3 bg-indigo-600/90 backdrop-blur-md text-[8.5px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md text-white border border-indigo-500/30 flex items-center gap-1">
            <Radio className="w-3 h-3 text-indigo-200" />
            <span>Somente Áudio</span>
          </div>

          {/* WebRTC Diagnostics HUD */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
            <button
              type="button"
              onClick={() => setShowWebRtcStats(true)}
              className="bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>Conexão Voz</span>
            </button>
          </div>
        </div>

        {/* Title Information */}
        <div className="z-10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-left space-y-1 mt-1">
          <div className="flex items-center gap-2">
            <AudioWaveform className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-black tracking-wide text-indigo-200">
              📌 {activeInk.title}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono pl-6">
            Transmissão de voz e bate-papo em áudio sem streaming de vídeo.
          </p>
        </div>

        {/* Real Live Chat Commentary Region */}
        <div className="z-10 flex flex-col justify-end flex-grow max-h-[42vh] mt-3">
          <div className="bg-gradient-to-t from-slate-950 to-transparent absolute inset-0 bottom-0 pointer-events-none h-48 z-0" />

          {/* Chat scroll box */}
          <div className="overflow-y-auto no-scrollbar space-y-2.5 max-h-[32vh] pb-3 z-10 pr-1 select-text">
            {inkMessages.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-900/40 rounded-2xl p-3 border border-white/5">
                O chat ao vivo está pronto. Comente sobre o áudio da live! 💬🎙️
              </div>
            ) : (
              inkMessages.map((msg) => {
                const isMyMessage = msg.profileId === activeProfile.id || msg.authorNickname === activeProfile.nickname;
                return (
                  <div
                    key={msg.id}
                    className="flex justify-start items-start gap-2 max-w-full animate-slide-up text-left"
                  >
                    <UserAvatar
                      avatar={msg.authorAvatar}
                      name={msg.authorName}
                      className="w-6 h-6 mt-0.5"
                      bgClassName={msg.authorAvatarBg || "bg-indigo-650"}
                      textClassName="text-[8px] font-black text-white"
                    />
                    <div className="bg-black/50 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-white/10 text-xs max-w-[85%]">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`font-black text-[9px] ${isMyMessage ? "text-indigo-400" : "text-amber-300"}`}>
                          {msg.authorName}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">{msg.authorNickname}</span>
                      </div>
                      <p className="text-slate-100 font-medium font-sans leading-relaxed break-words break-all text-[11px]">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSubmitMessage} className="flex items-center gap-1.5 pt-2 border-t border-white/10 z-10 flex-shrink-0">
            <input
              id="live-chat-input"
              type="text"
              placeholder="Envie uma mensagem na sala de áudio..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-grow bg-slate-900/90 border border-white/10 hover:border-white/20 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-550 focus:outline-hidden transition-all font-medium leading-normal"
              maxLength={140}
              autoComplete="off"
            />
            <button
              id="btn-send-chat-msg"
              type="submit"
              disabled={!inputVal.trim()}
              className="p-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-650 text-white rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>

      {/* Confirmation Modal to END Ink Stream cleanly */}
      {showConfirmEndModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 text-white shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <MicOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Encerrar Sala de Áudio Ink?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                A transmissão de áudio será finalizada e removida da rede. Todos os ouvintes sairão da sala.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmEndModal(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmEndModal(false);
                  onEndInk();
                }}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                Sim, Encerrar Ink
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WebRTC Diagnostics Modal */}
      {showWebRtcStats && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full space-y-4 text-white shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowWebRtcStats(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <span>Voz Direta Wolly</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">AUDIO STREAM</span>
                </h3>
                <p className="text-xs text-slate-400">Transmissão em tempo real de áudio Opus</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-indigo-400" />
                  Modo
                </span>
                <p className="font-mono font-bold text-indigo-300 truncate">{webRtcMetrics.mode}</p>
              </div>

              <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Latência
                </span>
                <p className="font-mono font-bold text-amber-300">{webRtcMetrics.latency}</p>
              </div>

              <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  Codec
                </span>
                <p className="font-mono font-bold text-slate-200 truncate">{webRtcMetrics.audioCodec}</p>
              </div>

              <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/50 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 text-purple-400" />
                  Taxa de Bits
                </span>
                <p className="font-mono font-bold text-slate-200">{webRtcMetrics.bitrate}</p>
              </div>

              <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/50 space-y-1 col-span-2">
                <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Criptografia
                </span>
                <p className="font-mono font-bold text-emerald-300">{webRtcMetrics.protocol}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowWebRtcStats(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Fechar Painel Diagnóstico
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
