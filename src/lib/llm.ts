// ============================================================
// LLM ROUTER — Multi-Provider AI Adapter
// Supports: Groq, OpenAI, Anthropic, Gemini, DeepSeek, Qwen, Mistral, Zhipu
// ============================================================

import { LLMProvider, LLMProviderConfig, LLM_PROVIDERS } from '@/types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}

// ============================================================
// Get provider config
// ============================================================
export function getProviderConfig(provider: LLMProvider): LLMProviderConfig | undefined {
  return LLM_PROVIDERS.find((p) => p.id === provider);
}

export function getActiveProviderFromEnv(): { provider: LLMProvider; apiKey: string; model: string } {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || 'groq';
  const config = getProviderConfig(provider);

  if (!config) {
    throw new Error(`Unknown LLM provider: ${provider}`);
  }

  const apiKey = process.env[config.envKey] || '';
  const model = process.env[`${provider.toUpperCase()}_MODEL`] || config.defaultModel;

  return { provider, apiKey, model };
}

// ============================================================
// SYSTEM PROMPT for AI Adaptive Task Generation
// ============================================================
export const TASK_SYSTEM_PROMPT = `You are an HRD Task Optimizer for BPJS Ketenagakerjaan.
Given a BASE TASK (e.g., "Verifying JP claims in SMILE app") and an INTERN'S MAJOR (e.g., "SMK TKJ"), generate a tailored instruction that leverages the intern's specific skills while completing the base task.
Keep it concise, actionable, and in professional Indonesian.
Maximum 3 sentences. Be specific to the major's skills.
If the major is unknown, infer general skills based on the major's name.`;

// ============================================================
// Stub fallback (rule-based) — used when no API key is set
// ============================================================
const STUB_INSTRUCTIONS: Record<string, (task: string) => string> = {
  RPL: (t) => `${t}. Karena Anda jurusan RPL, manfaatkan pemahaman logika algoritma untuk memvalidasi alur data nasabah secara sistematis. Catat anomali alur sistem sebagai temuan teknis.`,
  TKJ: (t) => `${t}. Karena Anda jurusan TKJ, fokuslah pada responsivitas sistem dan koneksi jaringan saat memproses data. Laporkan jika ada lag time atau gangguan koneksi.`,
  AKL: (t) => `${t}. Karena Anda jurusan AKL, terapkan ketelitian akuntansi untuk merekonsiliasi data finansial peserta. Periksa konsistensi angka antara sistem dan dokumen fisik.`,
  OTKP: (t) => `${t}. Karena Anda jurusan OTKP, gunakan keterampilan administrasi untuk menyusun dokumentasi verifikasi yang rapi dan terstruktur. Pastikan arsip digital terorganisir.`,
  MPLB: (t) => `${t}. Karena Anda jurusan MPLB, manfaatkan keterampilan manajemen kantor untuk mengkoordinasi alur dokumen verifikasi. Pastikan timeline pelayanan tercatat dengan baik.`,
  BDP: (t) => `${t}. Karena Anda jurusan BDP, terapkan pendekatan pemasaran untuk membantu sosialisasi program kepada peserta. Catat respons peserta untuk evaluasi komunikasi.`,
  DKV: (t) => `${t}. Karena Anda jurusan DKV, dokumentasikan proses verifikasi secara visual untuk materi edukasi internal. Buat infografis singkat jika memungkinkan.`,
  'Computer Science': (t) =>
    `${t}. Karena Anda mahasiswa Computer Science, analisis sistem secara teknis dan dokumentasikan potential improvements. Catat bug atau UX issue yang ditemukan.`,
  Management: (t) =>
    `${t}. Karena Anda mahasiswa Management, analisis efisiensi proses dan dokumentasikan opportunity untuk optimasi. Kaitkan dengan KPI operasional.`,
  Economics: (t) =>
    `${t}. Karena Anda mahasiswa Economics, fokus pada analisis cost-benefit dari proses verifikasi. Catat inefficiency yang berdampak finansial.`,
  'Public Relations': (t) =>
    `${t}. Karena Anda mahasiswa Public Relations, fokus pada komunikasi peserta dan dokumentasikan feedback. Bantu menyusun messaging yang lebih efektif.`,
  Law: (t) =>
    `${t}. Karena Anda mahasiswa Law, perhatikan aspek kepatuhan regulasi dalam setiap verifikasi. Catat potensi issue legal yang perlu eskalasi.`,
  Psychology: (t) =>
    `${t}. Karena Anda mahasiswa Psychology, observasi dinamika interaksi tim dan peserta. Dokumentasikan insight untuk improvement training internal.`
};

export function getStubInstruction(task: string, major: string): string {
  const m = major.trim();
  // Try exact match first
  if (STUB_INSTRUCTIONS[m]) return STUB_INSTRUCTIONS[m](task);
  // Try partial match (case-insensitive)
  const lower = m.toLowerCase();
  for (const key of Object.keys(STUB_INSTRUCTIONS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return STUB_INSTRUCTIONS[key](task);
    }
  }
  // Default
  return `${task}. Manfaatkan pengetahuan dari jurusan ${m} Anda untuk menyelesaikan tugas ini secara optimal. Dokumentasikan pembelajaran dalam logbook harian.`;
}

// ============================================================
// Provider-specific call functions
// ============================================================
async function callGroq(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  const Groq = (await import('groq-sdk')).default;
  const client = new Groq({ apiKey });
  const res = await client.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 250
  });
  return res.choices[0]?.message?.content || '';
}

async function callOpenAI(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 250
  });
  return res.choices[0]?.message?.content || '';
}

async function callAnthropic(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const userMessages = messages.filter((m) => m.role !== 'system');
  const res = await client.messages.create({
    model,
    system: systemMsg,
    messages: userMessages as any,
    max_tokens: 250
  });
  return res.content[0]?.type === 'text' ? res.content[0].text : '';
}

async function callGemini(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({ model });
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const userMsg = messages.find((m) => m.role === 'user')?.content || '';
  const fullPrompt = `${systemMsg}\n\nUser: ${userMsg}`;
  const res = await genModel.generateContent(fullPrompt);
  return res.response.text();
}

async function callDeepSeek(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  // DeepSeek is OpenAI-compatible
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' });
  const res = await client.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 250
  });
  return res.choices[0]?.message?.content || '';
}

async function callQwen(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  // Alibaba Qwen / DashScope is OpenAI-compatible
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
  });
  const res = await client.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 250
  });
  return res.choices[0]?.message?.content || '';
}

async function callMistral(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey, baseURL: 'https://api.mistral.ai/v1' });
  const res = await client.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 250
  });
  return res.choices[0]?.message?.content || '';
}

async function callZhipu(messages: LLMMessage[], apiKey: string, model: string): Promise<string> {
  // Zhipu GLM is OpenAI-compatible
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey, baseURL: 'https://open.bigmodel.cn/api/paas/v4' });
  const res = await client.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 250
  });
  return res.choices[0]?.message?.content || '';
}

const PROVIDER_CALLERS: Record<LLMProvider, (m: LLMMessage[], k: string, model: string) => Promise<string>> = {
  groq: callGroq,
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  deepseek: callDeepSeek,
  qwen: callQwen,
  mistral: callMistral,
  zhipu: callZhipu
};

// ============================================================
// Main LLM call function with auto-fallback to stub
// ============================================================
export async function callLLM(
  messages: LLMMessage[],
  options?: { provider?: LLMProvider; apiKey?: string; model?: string }
): Promise<LLMResponse> {
  const start = Date.now();
  let provider: LLMProvider;
  let apiKey: string;
  let model: string;

  try {
    const active = getActiveProviderFromEnv();
    provider = options?.provider || active.provider;
    apiKey = options?.apiKey || active.apiKey;
    model = options?.model || active.model;
  } catch (e: any) {
    throw new Error(`LLM config error: ${e.message}`);
  }

  // If no API key, throw — caller must handle fallback
  if (!apiKey) {
    throw new Error(`No API key for provider ${provider}. Set ${getProviderConfig(provider)?.envKey} in env vars.`);
  }

  const caller = PROVIDER_CALLERS[provider];
  if (!caller) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  try {
    const text = await caller(messages, apiKey, model);
    return {
      text: text.trim(),
      provider,
      model,
      latencyMs: Date.now() - start
    };
  } catch (e: any) {
    throw new Error(`LLM call failed (${provider}/${model}): ${e.message}`);
  }
}

// ============================================================
// Higher-level: Generate adaptive task instruction
// ============================================================
export async function generateTaskInstruction(
  baseTask: string,
  major: string,
  options?: { provider?: LLMProvider; apiKey?: string; model?: string }
): Promise<{ text: string; source: 'llm' | 'stub'; provider?: LLMProvider; model?: string; latencyMs?: number }> {
  const start = Date.now();
  const messages: LLMMessage[] = [
    { role: 'system', content: TASK_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Base Task: ${baseTask}\nIntern's Major: ${major}\n\nGenerate the tailored instruction now:`
    }
  ];

  try {
    const res = await callLLM(messages, options);
    if (res.text && res.text.length > 5) {
      return { text: res.text, source: 'llm', provider: res.provider, model: res.model, latencyMs: res.latencyMs };
    }
    throw new Error('Empty LLM response');
  } catch (e: any) {
    // Fallback to stub
    return {
      text: getStubInstruction(baseTask, major),
      source: 'stub',
      latencyMs: Date.now() - start
    };
  }
}
