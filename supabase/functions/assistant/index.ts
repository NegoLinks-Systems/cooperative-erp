// Supabase Edge Function: assistant
// The AI provider and API key stay server-side. The client only sees text.
// Deploy:  supabase functions deploy assistant --no-verify-jwt=false
// Secret:  supabase secrets set ASSISTANT_API_KEY=sk-ant-...

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { prompt, context } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "A prompt is required." }, { status: 400, headers: cors });
    }
    const apiKey = Deno.env.get("ASSISTANT_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "Assistant is not configured. Set the ASSISTANT_API_KEY secret." }, { status: 500, headers: cors });
    }

    const system =
      "You are the in-house analyst for a cooperative & microfinance institution. " +
      "Be concise, practical and numerate. Never mention which AI provider or model powers you. " +
      (context ? `\n\nLive system data you may use:\n${context}` : "");

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("assistant upstream error", upstream.status, detail);
      return Response.json({ error: "The assistant could not complete that request." }, { status: 502, headers: cors });
    }

    const data = await upstream.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");
    return Response.json({ text }, { headers: cors });
  } catch (e) {
    console.error("assistant error", e);
    return Response.json({ error: "Bad request." }, { status: 400, headers: cors });
  }
});
