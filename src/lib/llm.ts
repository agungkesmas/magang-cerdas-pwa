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
// Tone: "kakak pembimbing asik" — ramah, santai, pakai "kamu", emoji secukupnya
// ============================================================
export const TASK_SYSTEM_PROMPT = `Kamu adalah kakak pembimbing magang yang asik dan perhatian di BPJS Ketenagakerjaan Cabang Cirebon.

Tugas: parafrase BASE TASK jadi instruksi personal sesuai JURUSAN magang.

Aturan bahasa:
- Pakai "kamu" bukan "Anda"
- Santai tapi tetap sopan (kayak kakak ngomong ke adik kelas)
- Kasih tips praktis yang relevan dengan jurusan mereka
- Singkat (2-3 kalimat), ada emoji secukupnya (💪🚀✨🙏 dll)
- Akhiri dengan semangat (misal: "Gas! 🚀" atau "Semangat ya! 💪")
- JANGAN pakai bahasa formal/surat dinas
- JANGAN pakai kata "harap", "mohon", "dimohon"

Contoh tone yang diinginkan:
"Hai! Minggu ini kamu bantu verifikasi dokumen JHT di sistem JMO. Karena kamu anak TKJ, perhatiin responsivitas sistem saat load data nasabah ya — catat kalau ada lag. Kalau nemu bug, langsung lapor ke kakak pembimbing. Gas! 🚀"

Kalau jurusan tidak dikenal, inferensi skill umum dari nama jurusan tersebut.`;

// ============================================================
// Stub fallback (rule-based) — used when no API key is set
// Tone: sama dengan AI — ramah, santai, "kakak pembimbing asik"
// ============================================================
const STUB_INSTRUCTIONS: Record<string, (task: string) => string> = {
  RPL: (t) => `Hai! ${t} 🚀 Karena kamu anak RPL, manfaatin logika algoritma kamu buat validasi alur data nasabah ya. Catat anomaly sistem yang kamu temuin — bisa jadi bahan improvement! Gas! 💪`,
  TKJ: (t) => `Hai! ${t} 🚀 Karena kamu anak TKJ, perhatiin responsivitas sistem & koneksi jaringan pas proses data ya. Kalau ada lag atau gangguan, langsung lapor ke kakak pembimbing. Semangat! 💪`,
  AKL: (t) => `Hai! ${t} 🚀 Karena kamu anak AKL, pakai ketelitian akuntansi kamu buat rekonsiliasi data finansial peserta. Cek konsistensi angka antara sistem & dokumen fisik ya. Gas! 💪`,
  OTKP: (t) => `Hai! ${t} 🚀 Karena kamu anak OTKP, pakai skill administrasi kamu buat nyusun dokumentasi verifikasi yang rapi & terstruktur. Pastikan arsip digital terorganisir ya. Semangat! 📋✨`,
  MPLB: (t) => `Hai! ${t} 🚀 Karena kamu anak MPLB, manfaatin skill manajemen kantor buat koordinasi alur dokumen verifikasi. Pastikan timeline pelayanan tercatat dengan baik ya. Gas! 💪`,
  BDP: (t) => `Hai! ${t} 🚀 Karena kamu anak BDP, terapin pendekatan pemasaran buat bantu sosialisasi program ke peserta. Catat respons peserta buat evaluasi komunikasi ya. Semangat! 🎯`,
  DKV: (t) => `Hai! ${t} 🚀 Karena kamu anak DKV, dokumentasin proses verifikasi secara visual buat materi edukasi internal. Bikin infografis singkat kalau memungkinkan ya. Gas! 🎨✨`,
  'Computer Science': (t) =>
    `Hai! ${t} 🚀 Karena kamu CS student, analisis sistem secara teknis & dokumentasin potential improvements. Catat bug atau UX issue yang kamu temuin ya. Semangat! 💻💪`,
  Management: (t) =>
    `Hai! ${t} 🚀 Karena kamu anak Management, analisis efisiensi proses & dokumentasin opportunity buat optimasi. Kaitin sama KPI operasional ya. Gas! 📊✨`,
  Economics: (t) =>
    `Hai! ${t} 🚀 Karena kamu anak Economics, fokus ke analisis cost-benefit dari proses verifikasi. Catat inefficiency yang berdampak finansial ya. Semangat! 💰💪`,
  'Public Relations': (t) =>
    `Hai! ${t} 🚀 Karena kamu anak PR, fokus ke komunikasi peserta & dokumentasin feedback. Bantu nyusun messaging yang lebih efektif ya. Gas! 📣✨`,
  Law: (t) =>
    `Hai! ${t} 🚀 Karena kamu anak Law, perhatiin aspek kepatuhan regulasi di setiap verifikasi. Catat potensi issue legal yang perlu eskalasi ya. Semangat! ⚖️💪`,
  Psychology: (t) =>
    `Hai! ${t} 🚀 Karena kamu anak Psychology, observasi dinamika interaksi tim & peserta. Dokumentasin insight buat improvement training internal ya. Gas! 🧠✨`
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
  return `Hai! ${task} 🚀 Manfaatin pengetahuan dari jurusan ${m} kamu buat ngerjain tugas ini ya. Catat pembelajaran di logbook harian, dan jangan ragu tanya kakak pembimbing kalau bingung. Semangat! 💪`;
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
