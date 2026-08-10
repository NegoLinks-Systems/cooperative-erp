import { supabase } from "./core";

/**
 * Calls the `assistant` edge function. The provider and API key live
 * server-side; the client only ever sees the configured assistant name.
 */
export async function askAssistant(prompt: string, context?: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("assistant", {
    body: { prompt, context },
  });
  if (error) throw new Error("The assistant is not available. Confirm the edge function is deployed and its secret key is set.");
  if (data?.error) throw new Error(String(data.error));
  return String(data?.text ?? "");
}
