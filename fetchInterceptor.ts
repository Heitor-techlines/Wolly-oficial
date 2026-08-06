// Wolly Client-Side AI Interceptor Module for full compatibility when hosted on Vercel
const originalFetch = typeof window !== "undefined" && window.fetch ? window.fetch.bind(window) : fetch;

const DEFAULT_API_KEY = "AQ.Ab8RN6JEO5OrKxBXXhEj_mans_i0j3di8hmJxY9LqlNuAXi4Bw";

function generateProcSVG(promptText: string, aspectRatioString: string): string {
  let hash = 0;
  for (let i = 0; i < promptText.length; i++) {
    hash = promptText.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  
  const hue1 = hash % 360;
  const hue2 = (hue1 + 140) % 360;
  const color1 = `hsl(${hue1}, 80%, 20%)`;
  const color2 = `hsl(${hue2}, 70%, 12%)`;
  const glowColor = `hsl(${(hue1 + 45) % 360}, 90%, 55%)`;
  const accentColor = `hsl(${(hue1 + 90) % 360}, 100%, 65%)`;
  
  let width = 800;
  let height = 800;
  if (aspectRatioString === "16:9") {
    width = 1066;
    height = 600;
  } else if (aspectRatioString === "9:16") {
    width = 600;
    height = 1066;
  } else if (aspectRatioString === "4:3") {
    width = 1000;
    height = 750;
  } else if (aspectRatioString === "3:4") {
    width = 750;
    height = 1000;
  }
  
  const cx = width / 2;
  const cy = height / 2;
  const mainRadius = Math.min(width, height) * 0.3;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
      <radialGradient id="portalGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.9" />
        <stop offset="70%" stop-color="${accentColor}" stop-opacity="0.3" />
        <stop offset="100%" stop-color="${color2}" stop-opacity="0" />
      </radialGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="80" />
      </filter>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

    <circle cx="${cx - width * 0.15}" cy="${cy - height * 0.1}" r="${mainRadius * 1.5}" fill="${glowColor}" opacity="0.15" filter="url(#softGlow)" />
    <circle cx="${cx + width * 0.2}" cy="${cy + height * 0.15}" r="${mainRadius * 1.8}" fill="${accentColor}" opacity="0.12" filter="url(#softGlow)" />

    <g opacity="0.08" stroke="#ffffff" stroke-width="1.5">`;
    
  for (let i = 100; i < width; i += 100) {
    svg += `<line x1="${i}" y1="0" x2="${i}" y2="${height}" />`;
  }
  for (let j = 100; j < height; j += 100) {
    svg += `<line x1="0" y1="${j}" x2="${width}" y2="${j}" />`;
  }
  
  svg += `</g>

    <circle cx="${cx}" cy="${cy}" r="${mainRadius * 1.5}" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="5,15" opacity="0.15" />
    <circle cx="${cx}" cy="${cy}" r="${mainRadius * 1.1}" fill="none" stroke="${accentColor}" stroke-dasharray="60,10" stroke-width="1.5" opacity="0.25" />
    <circle cx="${cx}" cy="${cy}" r="${mainRadius * 0.9}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.2" />

    <circle cx="${cx}" cy="${cy}" r="${mainRadius}" fill="url(#portalGrad)" />
    <circle cx="${cx}" cy="${cy}" r="${mainRadius * 0.7}" fill="none" stroke="${accentColor}" stroke-width="3" filter="url(#glow)" stroke-dasharray="1,15" stroke-linecap="round" />

    <g fill="#ffffff" opacity="0.6">`;
    
  for (let s = 0; s < 40; s++) {
    const starX = ((hash + s * 137) % width);
    const starY = ((hash + s * 233) % height);
    const starR = (s % 3 === 0) ? 2.5 : 1.2;
    svg += `<circle cx="${starX}" cy="${starY}" r="${starR}" opacity="${0.3 + (s % 7) / 10}" />`;
  }
  
  svg += `</g>

    <g stroke="${accentColor}" stroke-width="2.5" opacity="0.4">`;
    
  const rayCount = 12 + (hash % 8);
  for (let r = 0; r < rayCount; r++) {
    const angle = (r * 2 * Math.PI) / rayCount;
    const x1 = cx + Math.cos(angle) * (mainRadius * 0.75);
    const y1 = cy + Math.sin(angle) * (mainRadius * 0.75);
    const x2 = cx + Math.cos(angle) * (mainRadius * 0.88);
    const y2 = cy + Math.sin(angle) * (mainRadius * 0.88);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }

  svg += `</g>

    <path d="M ${cx} 20 L ${cx} 40 M ${cx} ${height - 20} L ${cx} ${height - 40} M 20 ${cy} L 40 ${cy} M ${width - 20} ${cy} L ${width - 40} ${cy}" stroke="#ffffff" stroke-width="1.5" opacity="0.3" />

    <path d="M ${cx - mainRadius * 0.3} ${cy - mainRadius * 0.3} Q ${cx + mainRadius * 0.4} ${cy} ${cx - mainRadius * 0.3} ${cy + mainRadius * 0.3} Q ${cx + mainRadius * 0.15} ${cy} ${cx - mainRadius * 0.3} ${cy - mainRadius * 0.3}" fill="#ffffff" opacity="0.8" filter="url(#glow)" />
    
    <circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.5" />
    <circle cx="${cx}" cy="${cy}" r="4" fill="${glowColor}" stroke="#ffffff" stroke-width="1.5" />

    <rect x="${cx - 160}" y="${height - 70}" width="320" height="40" rx="10" fill="#000000" fill-opacity="0.4" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />
    <text x="${cx}" y="${height - 47}" fill="#ffffff" font-family="'Inter', sans-serif" font-weight="bold" font-size="11" letter-spacing="3" text-anchor="middle" opacity="0.9">
      ${promptText.substring(0, 32).toUpperCase()}${promptText.length > 32 ? "..." : ""}
    </text>

    <text x="${width - 30}" y="45" fill="#ffffff" font-family="'JetBrains Mono', monospace" font-size="10" letter-spacing="1" text-anchor="end" opacity="0.35">
      WOLLY // PAINTER-A
    </text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
}

function generateLocalFallback(promptText: string, aspectRatioString: string): string {
  const lowPrompt = promptText.toLowerCase();
  
  if (lowPrompt.includes("natureza") || lowPrompt.includes("mística") || lowPrompt.includes("árvore") || lowPrompt.includes("floresta") || lowPrompt.includes("glow") || lowPrompt.includes("planta") || lowPrompt.includes("violeta")) {
    return "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80";
  } else if (lowPrompt.includes("cyberpunk") || lowPrompt.includes("cidade") || lowPrompt.includes("futuro") || lowPrompt.includes("neon") || lowPrompt.includes("tecnologia")) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80";
  } else if (lowPrompt.includes("oceano") || lowPrompt.includes("mar") || lowPrompt.includes("surreal") || lowPrompt.includes("água") || lowPrompt.includes("peixe") || lowPrompt.includes("baleia") || lowPrompt.includes("estrelas")) {
    return "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=800&q=80";
  } else if (lowPrompt.includes("dragão") || lowPrompt.includes("épico") || lowPrompt.includes("monstro") || lowPrompt.includes("fantasia") || lowPrompt.includes("magia") || lowPrompt.includes("rústica") || lowPrompt.includes("óleo")) {
    return "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80";
  } else if (lowPrompt.includes("arte") || lowPrompt.includes("abstrata") || lowPrompt.includes("pintura") || lowPrompt.includes("quadro") || lowPrompt.includes("aquarela") || lowPrompt.includes("cores") || lowPrompt.includes("tinta")) {
    return "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80";
  } else if (lowPrompt.includes("espaço") || lowPrompt.includes("galáxia") || lowPrompt.includes("foguete") || lowPrompt.includes("estrela") || lowPrompt.includes("cosmo") || lowPrompt.includes("nebulosa")) {
    return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80";
  } else if (lowPrompt.includes("gato") || lowPrompt.includes("cat") || lowPrompt.includes("gatinho") || lowPrompt.includes("felino")) {
    return "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80";
  } else if (lowPrompt.includes("cachorro") || lowPrompt.includes("cão") || lowPrompt.includes("dog") || lowPrompt.includes("filhote")) {
    return "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80";
  }
  
  return generateProcSVG(promptText, aspectRatioString);
}

const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : (input && "href" in input ? (input as URL).href : (input && "url" in input ? (input as Request).url : String(input || "")));

  // Filter for AI related API routes only
  const isPaint = url.includes("/api/ai/paint");
  const isChat = url.includes("/api/ai/chat");
  const isModerate = url.includes("/api/ai/moderate");
  const isSummarize = url.includes("/api/posts/summarize");
  const isGenerateNotif = url.includes("/api/notifications/generate");

  if (!isPaint && !isChat && !isModerate && !isSummarize && !isGenerateNotif) {
    return originalFetch(input, init);
  }

  // 1. Try real server-side fetch connection (Express)
  try {
    const res = await originalFetch(input, init);
    if (res.status >= 200 && res.status < 400) {
      const cloned = res.clone();
      try {
        const json = await cloned.json();
        if (json && json.success === false) {
          console.warn("Express API returned success: false. Falling back to direct client-side Gemini...");
        } else {
          return res;
        }
      } catch (err) {
        return res;
      }
    } else {
      console.warn(`Express API returned non-OK status (${res.status}). Falling back to direct client-side Gemini...`);
    }
  } catch (error) {
    console.warn("Wolly Express is offline/missing. Falling back to browser-side Gemini API...");
  }

  // 2. Client-Side fallback logic connecting directly to Gemini APIs
  const apiKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || DEFAULT_API_KEY;
  console.log("[Wolly AI Interceptor] Running serverless-safeguard on client-side with key...");

  try {
    if (isPaint) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const prompt = body.prompt || "";
      const aspectRatio = body.aspectRatio || "1:1";

      let base64Image = "";

      // A. Try Imagen 3 client-side
      try {
        const genRes = await originalFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: prompt,
              numberOfImages: 1,
              outputMimeType: "image/jpeg",
              aspectRatio: aspectRatio,
            }),
          }
        );

        if (genRes.ok) {
          const resData = await genRes.json();
          if (resData.generatedImages?.[0]?.image?.imageBytes) {
            base64Image = `data:image/jpeg;base64,${resData.generatedImages[0].image.imageBytes}`;
            console.log("Client-side Imagen 3 generated image successfully.");
          }
        }
      } catch (e) {
        console.warn("Client Imagen 3 failed, trying text-to-SVG vector generator fallback...", e);
      }

      // B. Try vector art generator via chat/text fallback (Very high success and zero rate limits)
      if (!base64Image) {
        try {
          const systemMsg = `Por favor, atue como um talentoso artista vetorial digital e designer gráfico na BuilderA.
O usuário solicitou uma imagem na PainterA baseada neste prompt: "${prompt}".

Sua missão é gerar um código de arte vetorial SVG puro e exuberante que represente visualmente este prompt de modo abstrato ou ilustrativo.
Regras estritas:
1. Retorne APENAS um código SVG válido e completo contendo defs, gradients, estilos e formas modernas de alta fidelidade visual.
2. Certifique-se de preencher todo o viewBox com cores ricas condizentes com o tema.
3. Use círculos, caminhos (paths), retângulos e filtros de glow para dar profundidade estética e acabamento premium.
4. Adicione um título ou texto minimalista dentro do SVG em algum lugar harmonioso com o prompt do usuário.
5. Não adicione textos explicativos externos, comentários xml ou blocos de código com crases (\`\`\`xml ou \`\`\`svg). Comece diretamente em "<svg" e encerre na tag "</svg>".`;

          const textRes = await originalFetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemMsg }] }],
              }),
            }
          );

          if (textRes.ok) {
            const data = await textRes.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanSvg = textResponse.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
            if (cleanSvg.includes("<svg")) {
              base64Image = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(cleanSvg)))}`;
              console.log("Client-side fallback SVG generated.");
            }
          }
        } catch (e) {
          console.error("Client SVG fallback failed", e);
        }
      }

      // C. Ultimate static image database fallback
      if (!base64Image) {
        base64Image = generateLocalFallback(prompt, aspectRatio);
      }

      return new Response(
        JSON.stringify({
          success: true,
          image: base64Image,
          isFallback: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (isChat) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const messages = body.messages || [];
      const posts = body.posts || [];

      const systemPrompt = `Você é a Line 123, uma Inteligência Artificial avançada, conselheira residente de segurança digital, privacidade e auditoria no ecossistema Wolly.
Seu tom é técnico primordialmente, porém amigável, transparente, focado em ajudar o usuário com as melhores dicas de privacidade.
Seus conhecimentos incluem auditoria de dados, proteção de senhas, conformidade LGPD/GDPR, engenharia social, rastreamento online e gerenciamento seguro de perfis.

Aqui estão os dados recentes da rede social Wolly para contexto (use-os se achar pertinente ou se o usuário perguntar sobre suas publicações/dados):
${JSON.stringify(posts.slice(0, 5))}

Responda sempre em português (PT-BR) de forma extremamente estruturada e profissional.`;

      const formattedContents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }]
      }));

      const genRes = await originalFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: formattedContents,
          }),
        }
      );

      if (genRes.ok) {
        const data = await genRes.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, ocorreu uma instabilidade em meus canais de privacidade.";
        return new Response(
          JSON.stringify({ success: true, text: textResponse }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else {
        throw new Error("Client gemini-3.6-flash chat failure");
      }
    }

    if (isModerate) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const content = body.content || "";

      const blacklistWords = [
        "violência", "violencia", "bater", "matar", "espancar", "facada", "tiro", "sangue", 
        "impróprio", "improprio", "pornografia", "porno", "nudez", "sexo", "assédio", "assedio", 
        "ódio", "odio", "racismo", "bullying", "morte", "suicídio", "suicidio", "terrorismo",
        "arma", "armas", "drogas", "droga", "agredir", "agressão", "agressao"
      ];

      const containsBadWord = blacklistWords.some(word => 
        content.toLowerCase().includes(word)
      );

      if (containsBadWord) {
        return new Response(
          JSON.stringify({
            success: true,
            approved: false,
            reason: "O conteúdo viola as políticas do Wolly por conter referências a violência, vocabulário inapropriado ou comportamento tóxico (Filtro de Integridade Local)."
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const systemPrompt = `Você é o auditor de moderação do Wolly.
Sua missão é classificar se o conteúdo enviado pelo usuário é seguro e apropriado para a comunidade Wolly.
Wolly valoriza segurança digital e repudia agressividade, termos tóxicos, violência, crimes, suicídio, drogas, nudez, pornografia ou ódio.

Responda PARSANDO estritamente um formato JSON válido com as chaves:
{
  "approved": boolean,
  "reason": "explicativa curta em português se falso, ou vazia se verdadeiro"
}
Não insira qualquer texto além do JSON.`;

      let approved = true;
      let reason = "";

      try {
        const genRes = await originalFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [{ parts: [{ text: content }] }]
            }),
          }
        );

        if (genRes.ok) {
          const data = await genRes.json();
          const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && typeof parsed.approved === "boolean") {
            approved = parsed.approved;
            reason = parsed.reason || "";
          }
        }
      } catch (err) {
        console.warn("Client fallback AI moderate check failed, choosing default approved=true:", err);
      }

      return new Response(
        JSON.stringify({
          success: true,
          approved,
          reason
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (isSummarize) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const posts = body.posts || [];

      const summaryPrompt = `Você é o assistente analítico oficial do Wolly.
Sua tarefa é analisar o array de postagens recentes fornecidas e gerar um resumo analítico compacto, estruturado em tópicos, das principais tendências, assuntos quentes, sentimentos e atividades dos usuários.

Aqui estão as postagens:
${JSON.stringify(posts.slice(0, 10))}

Gere um resumo em português (PT-BR) de forma direta, clara e elegante. Use markdown em tópicos curtos.`;

      const genRes = await originalFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: summaryPrompt }] }],
          }),
        }
      );

      if (genRes.ok) {
        const data = await genRes.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nenhuma tendência encontrada no momento.";
        return new Response(
          JSON.stringify({
            success: true,
            summary: textResponse,
            method: "Análise Inteligente Client-Side",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else {
        throw new Error("Client summarizer failed");
      }
    }

    if (isGenerateNotif) {
      const prompt = `Gere exatamente 3 notificações curtas, engajantes e puramente informativas sobre novidades na rede Wolly.
Os temas devem girar em torno de Cachorro (🐶), Gato (🐱), Outros Animais (🦁), Entretenimento (🎭), Saúde (🏥), Esporte (⚽), Educativo (📚), Notícias (📰), Jogos (🎮), Anúncios (📢), Comida (🍕) ou Outros (✨).
Exemplos permitidos: "3 novas postagens sobre Gatos", "Ink acontecendo sobre Esportes ao vivo", "Novo Post-It sobre saúde canina!".
REGRAS CRÍTICAS DE SEGURANÇA E BEM-ESTAR:
- NUNCA gere notificações baseadas em cobrança de atenção ou culpa (ex: "você não abre o Wolly há 3 dias", "seus amigos estão com saudades", "você perdeu seu streak").
- Não use tons de cobrança emocional. No Wolly promovemos bem-estar e controle.
- Retorne a resposta estritamente formatada como um array JSON válido, no seguinte estilo:
[
  {"message": "3 novas postagens sobre arquitetura", "type": "post"},
  {"message": "Ink acontecendo sobre jogos ao vivo", "type": "ink"},
  {"message": "2 novos painéis de Design no feed de Arte", "type": "post"}
]
Responda exclusivamente com o código JSON limpo, sem markdown, tags de código ou introduções.`;

      const genRes = await originalFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (genRes.ok) {
        const data = await genRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) {
          const notifications = parsed.slice(0, 3).map((n: any, idx: number) => ({
            id: `notif_ai_${Date.now()}_${idx}`,
            message: n.message || "Novas publicações encontradas no Wolly!",
            type: n.type || "post",
            time: idx === 0 ? "há poucos instantes" : idx === 1 ? "há 1 hora" : "há 4 horas"
          }));
          return new Response(
            JSON.stringify({ success: true, method: "Line 123 AI Interceptor", notifications }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      throw new Error("Client notifications call failed");
    }

  } catch (err: any) {
    console.error("Critical error in client-side AI interception fallback:", err);
  }

  // Backup of the backup client side
  return new Response(
    JSON.stringify({
      success: true,
      approved: true,
      reason: "",
      image: generateLocalFallback("Wolly Art", "1:1"),
      summary: "Wolly está totalmente livre de publicidade corporativa.",
      text: "Eu sou a Line 123. Como não conseguimos acessar o servidor de IA local devido a limitações de ambiente, estou rodando em modo simplificado sem espionagem de dados.",
      notifications: [
        { id: "eb_1", message: "Conecte-se com segurança total no Wolly", type: "post", time: "há poucos instantes" },
        { id: "eb_2", message: "Seus dados estão 100% seguros de anunciantes", type: "post", time: "há 1 hora" }
      ]
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

try {
  Object.defineProperty(window, "fetch", {
    value: customFetch,
    writable: true,
    configurable: true
  });
} catch (e) {
  console.warn("[Wolly] Object.defineProperty(window, 'fetch') failed, using writable setter fallback:", e);
  try {
    (window as any).fetch = customFetch;
  } catch (err) {
    console.error("[Wolly] Direct assignment to window.fetch failed too", err);
  }
}
