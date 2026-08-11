// NegoLinks Intelligence Engine — Edge Function
// Routes to the configured AI provider. Provider is NEVER exposed to clients.
// Secrets: AI_PROVIDER, AI_API_KEY, AI_BASE_URL, AI_MODEL (all optional, defaults to Groq)
// Deploy: supabase functions deploy ai-assistant

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIMessage { role: "system" | "user" | "assistant"; content: string; }
interface RequestBody {
  messages: AIMessage[];
  context?: string;
  module?: string;
}

const SYSTEM_PROMPT = `You are the Executive Assistant for a cooperative and microfinance institution, 
powered by NegoLinks Intelligence Engine. You provide expert financial analysis, governance insights, 
credit risk assessments, operational recommendations, and professional document drafts.
Be concise, data-driven, and professional. Never mention which AI provider, model, or platform powers you.
When given live system data, use it to provide specific, accurate insights.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body: RequestBody = await req.json();
    if (!body?.messages?.length) {
      return Response.json({ error: "Messages are required." }, { status: 400, headers: CORS });
    }

    // Read provider config from secrets (defaults to Groq)
    const provider = Deno.env.get("AI_PROVIDER") ?? "groq";
    const apiKey   = Deno.env.get("AI_API_KEY") ?? Deno.env.get("ASSISTANT_API_KEY") ?? "";
    const baseUrl  = Deno.env.get("AI_BASE_URL") ?? "https://api.groq.com/openai/v1";
    const model    = Deno.env.get("AI_MODEL") ?? "llama-3.3-70b-versatile";

    if (!apiKey) {
      return Response.json({ error: "AI Assistance is not configured. Ask your administrator to set up AI Platform in Settings." }, { status: 503, headers: CORS });
    }

    // Build system message with context
    const systemContent = body.context
      ? `${SYSTEM_PROMPT}\n\nLive system data:\n${body.context}`
      : SYSTEM_PROMPT;

    const messages: AIMessage[] = [
      { role: "system", content: systemContent },
      ...body.messages,
    ];

    let text = "";

    if (provider === "anthropic") {
      // Anthropic native API
      const res = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 4096, system: systemContent, messages: body.messages }),
      });
      if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
      const data = await res.json();
      text = (data.content ?? []).filter((b: {type:string}) => b.type === "text").map((b: {text:string}) => b.text).join("\n");

    } else if (provider === "gemini") {
      // Google Gemini native API
      const geminiMessages = messages.filter(m => m.role !== "system").map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const res = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: geminiMessages, systemInstruction: { parts: [{ text: systemContent }] } }),
      });
      if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
      const data = await res.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    } else {
      // OpenAI-compatible (Groq, OpenAI, DeepSeek, OpenRouter, Azure, Ollama, Custom)
      const url = provider === "azure_openai"
        ? `${baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`
        : `${baseUrl}/chat/completions`;

      const headers: Record<string, string> = {
        "content-type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      };
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = "https://cooperative.negolinks.com";
        headers["X-Title"] = "NegoLinks Cooperative ERP";
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
      });
      if (!res.ok) {
        const detail = await res.text();
        console.error("AI upstream error", res.status, detail);
        throw new Error(`AI provider error: ${res.status}`);
      }
      const data = await res.json();
      text = data.choices?.[0]?.message?.content ?? "";
    }

    if (!text) throw new Error("Empty response from AI Assistance");

    // Log usage (fire-and-forget, don't block response)
    logAIUsage(body.module ?? "general", model, text.length).catch(() => {});

    return Response.json({ text }, { headers: CORS });

  } catch (err) {
    console.error("ai-assistant error", err);
    const message = err instanceof Error ? err.message : "AI Assistance is temporarily unavailable.";
    return Response.json({ error: message }, { status: 500, headers: CORS });
  }
});

async function logAIUsage(module: string, model: string, responseLength: number): Promise<void> {
  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return;

  await fetch(`${supabaseUrl}/rest/v1/ai_usage_logs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ module, model_used: model, response_chars: responseLength }),
  });
}
