// ============================================================
// TYPE DEFINITIONS — MAGANG-CERDAS PWA
// ============================================================

export type Department = 'Pelayanan' | 'Pemasaran' | 'Keuangan';
export type Tier = 'Excellence' | 'Competent' | 'Participation';
export type AttendanceType = 'Check-In' | 'Check-Out';
export type LLMProvider = 'groq' | 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'qwen' | 'mistral' | 'zhipu';

export interface Intern {
  id: string;
  name: string;
  school_origin: string | null;
  major: string;
  department: Department;
  start_date: string;
  end_date: string;
  total_exp: number;
  streak_count: number;
  username: string;
  raw_password: string;
  is_active: boolean;
  survival_kit_progress: Record<string, unknown>;
  certificate_unlocked: boolean;
  certificate_id: string | null;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  department: Department;
  base_description: string;
  target_count: number;
  is_active: boolean;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  intern_id: string;
  task_id: string;
  chunk_index: number;
  completed_count: number;
  last_completed_at: string | null;
  ai_instruction: string | null;
}

export interface Attendance {
  id: string;
  intern_id: string;
  timestamp: string;
  type: AttendanceType;
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  photo_url: string | null;
  is_within_geofence: boolean;
  notes: string | null;
}

export interface LogbookEntry {
  id: string;
  intern_id: string;
  entry_date: string;
  activity: string;
  learning_summary: string | null;
  difficulties: string | null;
  created_at: string;
}

export interface Official {
  id: string;
  name: string;
  nip: string;
  position: string;
  signature_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  intern_id: string;
  official_id: string;
  tier: Tier;
  issue_date: string;
  verification_id: string;
  pdf_url: string | null;
  created_at: string;
}

export interface AppSettings {
  id: number;
  office_lat: number;
  office_lng: number;
  geofence_radius_meters: number;
  llm_provider: LLMProvider;
  llm_model: string;
  llm_api_key_encrypted: string | null;
  office_name: string;
  office_address: string;
  updated_at: string;
}

export interface Nudge {
  id: string;
  intern_id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// LLM Provider configurations
export interface LLMProviderConfig {
  id: LLMProvider;
  label: string;
  region: 'Western' | 'China';
  envKey: string;
  defaultModel: string;
  availableModels: string[];
  docsUrl: string;
}

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  {
    id: 'groq',
    label: 'Groq (Ultra-Fast Llama)',
    region: 'Western',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    availableModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ],
    docsUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'openai',
    label: 'OpenAI GPT',
    region: 'Western',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    region: 'Western',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-haiku-20241022',
    availableModels: [
      'claude-3-5-haiku-20241022',
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229'
    ],
    docsUrl: 'https://console.anthropic.com/'
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    region: 'Western',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-1.5-flash',
    availableModels: [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp'
    ],
    docsUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    region: 'Western',
    envKey: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
    availableModels: ['mistral-small-latest', 'mistral-large-latest', 'mistral-tiny'],
    docsUrl: 'https://console.mistral.ai/api-keys'
  },
  {
    id: 'deepseek',
    label: 'DeepSeek (China)',
    region: 'China',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
    docsUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'qwen',
    label: 'Alibaba Qwen (China)',
    region: 'China',
    envKey: 'QWEN_API_KEY',
    defaultModel: 'qwen-plus',
    availableModels: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long'],
    docsUrl: 'https://dashscope.console.aliyun.com/'
  },
  {
    id: 'zhipu',
    label: 'Zhipu GLM (China)',
    region: 'China',
    envKey: 'ZHIPU_API_KEY',
    defaultModel: 'glm-4-flash',
    availableModels: ['glm-4-flash', 'glm-4', 'glm-4-air', 'glm-4-plus'],
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys'
  }
];

// Survival Kit modules (Universal modules for all interns)
export interface SurvivalKitModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  quizQuestions: { q: string; options: string[]; answer: number }[];
}

export const SURVIVAL_KIT_MODULES: SurvivalKitModule[] = [
  {
    id: 'mod-1-etos-kerja',
    title: 'Etos Kerja Profesional',
    description: 'Memahami budaya kerja, disiplin, dan integritas di lingkungan BPJS Ketenagakerjaan.',
    icon: 'briefcase',
    quizQuestions: [
      {
        q: 'Apa arti penting etos kerja di lingkungan BPJS Ketenagakerjaan?',
        options: [
          'Hanya sekadar tepat waktu datang ke kantor',
          'Mencakup disiplin, integritas, dan komitmen pelayanan publik',
          'Menyelesaikan tugas secepat mungkin tanpa peduli kualitas',
          'Mengikuti atasan tanpa bertanya'
        ],
        answer: 1
      },
      {
        q: 'Saat menghadapi klien yang marah, sikap terbaik adalah?',
        options: [
          'Membela diri dengan keras',
          'Mengabaikan klien sampai tenang',
          'Mendengarkan dengan empati lalu menjelaskan solusi',
          'Memanggil security'
        ],
        answer: 2
      }
    ]
  },
  {
    id: 'mod-2-jkk',
    title: 'JKK - Jaminan Kecelakaan Kerja',
    description: 'Program pemberian santunan bagi tenaga kerja yang mengalami kecelakaan kerja atau penyakit akibat kerja.',
    icon: 'shield',
    quizQuestions: [
      {
        q: 'Apa yang dimaksud dengan JKK?',
        options: [
          'Jaminan Kecelakaan Kerja - santunan untuk kecelakaan di tempat kerja',
          'Jaminan Kesehatan Keluarga',
          'Jaminan Kredit Karyawan',
          'Jaminan Kompensasi Kontrak'
        ],
        answer: 0
      }
    ]
  },
  {
    id: 'mod-3-jkm',
    title: 'JKM - Jaminan Kematian',
    description: 'Program santunan kematian bagi peserta yang meninggal dunia (bukan karena kecelakaan kerja).',
    icon: 'heart',
    quizQuestions: [
      {
        q: 'Dokumen wajib untuk verifikasi klaim JKM?',
        options: [
          'KTP dan KK saja',
          'Akta Kematian, Kartu Keluarga, dan Sertifikat Ahli Waris',
          'Hanya surat kematian dari RT',
          'Buku tabungan dan KTP'
        ],
        answer: 1
      }
    ]
  },
  {
    id: 'mod-4-jht',
    title: 'JHT - Jaminan Hari Tua',
    description: 'Tabungan hari tua yang dapat diambil saat peserta pensiun, mengundurkan diri, atau PHK.',
    icon: 'piggy-bank',
    quizQuestions: [
      {
        q: 'Dokumen yang diperlukan untuk klaim JHT karena resign?',
        options: [
          'Surat pengunduran diri bermeterai, KTP, dan buku tabungan',
          'Hanya KTP',
          'Akta kelahiran',
          'SK kerja'
        ],
        answer: 0
      }
    ]
  },
  {
    id: 'mod-5-jp',
    title: 'JP - Jaminan Pensiun',
    description: 'Pensiunan bulanan untuk peserta yang telah memenuhi masa iuran minimal 15 tahun.',
    icon: 'hand-coins',
    quizQuestions: [
      {
        q: 'Verifikasi status survivorship untuk JP anak yatim harus memenuhi kriteria?',
        options: [
          'Belum menikah dan berusia di bawah 21 tahun',
          'Sudah bekerja',
          'Sudah menikah',
          'Di atas 25 tahun'
        ],
        answer: 0
      }
    ]
  },
  {
    id: 'mod-6-jkp',
    title: 'JKP - Jaminan Kehilangan Pekerjaan',
    description: 'Bantuan kas bagi pekerja yang terkena PHK untuk membantu transisi pekerjaan baru.',
    icon: 'trending-down',
    quizQuestions: [
      {
        q: 'Dokumen utama untuk klaim JKP?',
        options: [
          'SK Pemutusan Hubungan Kerja dan riwayat kepesertaan BPJS',
          'Hanya KTP',
          'Surat keterangan sehat',
          'Buku nikah'
        ],
        answer: 0
      }
    ]
  }
];
