// NegoLinks Intelligence Engine — AI Provider Abstraction
// Never expose provider names to end users.
// All AI is surfaced as "AI Assistance" / "Executive Assistant"

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export type AIProviderName =
  | "groq"
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "openrouter"
  | "azure_openai"
  | "aws_bedrock"
  | "ollama"
  | "custom";

export interface ProviderMeta {
  name: AIProviderName;
  label: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyPrefix?: string;
  isOpenAICompatible: boolean;
}

export const PROVIDER_REGISTRY: ProviderMeta[] = [
  {
    name: "groq",
    label: "Groq Cloud",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    apiKeyPrefix: "gsk_",
    isOpenAICompatible: true,
  },
  {
    name: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    apiKeyPrefix: "sk-",
    isOpenAICompatible: true,
  },
  {
    name: "anthropic",
    label: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6",
    isOpenAICompatible: false,
  },
  {
    name: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    isOpenAICompatible: false,
  },
  {
    name: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    isOpenAICompatible: true,
  },
  {
    name: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    apiKeyPrefix: "sk-or-",
    isOpenAICompatible: true,
  },
  {
    name: "azure_openai",
    label: "Azure OpenAI",
    baseUrl: "https://YOUR_RESOURCE.openai.azure.com",
    defaultModel: "gpt-4o",
    isOpenAICompatible: true,
  },
  {
    name: "aws_bedrock",
    label: "AWS Bedrock",
    baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
    defaultModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    isOpenAICompatible: false,
  },
  {
    name: "ollama",
    label: "Ollama (Self-hosted)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    isOpenAICompatible: true,
  },
  {
    name: "custom",
    label: "Custom OpenAI-Compatible API",
    baseUrl: "",
    defaultModel: "",
    isOpenAICompatible: true,
  },
];

export function getProviderMeta(name: AIProviderName): ProviderMeta {
  return PROVIDER_REGISTRY.find((p) => p.name === name) ?? PROVIDER_REGISTRY[0]!;
}

// Default AI config (used when nothing is configured in Supabase)
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: "groq",
  apiKey: "",
  baseUrl: "https://api.groq.com/openai/v1",
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
  maxTokens: 4096,
  streaming: false,
};
