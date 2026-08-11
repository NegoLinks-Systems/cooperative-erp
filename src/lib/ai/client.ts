// NegoLinks Intelligence Engine — Client
// All requests go through the Supabase edge function so API keys stay server-side.

import { supabase } from "@/lib/core";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  context?: string;       // live data context
  module?: string;        // which module is calling (for prompt templates)
  stream?: boolean;
}

export interface AIResponse {
  text: string;
  tokensUsed?: number;
  model?: string;
}

/** Call the NegoLinks Intelligence Engine (proxies to configured provider) */
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: request,
  });
  if (error) throw new Error(error.message ?? "AI request failed");
  if (!data?.text) throw new Error("No response from AI Assistance");
  return data as AIResponse;
}

/** Convenience: single prompt → text */
export async function askAI(
  prompt: string,
  context?: string,
  module?: string
): Promise<string> {
  const response = await callAI({
    messages: [{ role: "user", content: prompt }],
    context,
    module,
  });
  return response.text;
}

/** Generate an executive summary for the dashboard */
export async function generateExecutiveSummary(liveData: string): Promise<string> {
  return askAI(
    "Generate a concise executive summary (3-4 sentences) of the cooperative's current performance. Include key observations and one recommendation. Be direct and professional.",
    liveData,
    "dashboard"
  );
}
