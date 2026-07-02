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
  major_id: string | null;
  department: Department;
  start_date: string;
  end_date: string;
  total_exp: number;
  streak_count: number;
  username: string;
  raw_password: string;
  is_active: boolean;
  logbook_enabled: boolean;
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

export type TaskMode = 'individual' | 'assigned' | 'team';

export interface Task {
  id: string;
  title: string;
  department: Department;
  base_description: string;
  target_count: number;
  is_active: boolean;
  mode: TaskMode;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  // Computed fields (populated by API)
  assigned_interns?: Intern[];
  team_progress?: { completed_chunks: number; total_chunks: number };
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

export interface School {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  logbook_enabled: boolean;
  created_at: string;
}

export interface Major {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface BKKTeacher {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  raw_password?: string; // Only visible to admin
  schools?: School[]; // Populated via junction table
  created_at: string;
}

export type LeaveType = 'sakit' | 'izin' | 'cuti' | 'dinas-luar';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  intern_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  medical_certificate_url: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
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
    id: 'mod-1-first-day',
    title: 'First Day Survival',
    description: 'Bekal hari pertama magang: cara perkenalkan diri, baca budaya kantor, dress code, jam kerja, dan hal-hal kecil yang bikin kamu kelihatan profesional sejak awal.',
    icon: 'rocket',
    quizQuestions: [
      {
        q: 'Hari pertama magang, kamu datang ke kantor. Apa yang sebaiknya kamu lakukan pertama kali?',
        options: [
          'Langsung duduk di meja yang kosong dan nunggu disuruh',
          'Cari tahu siapa pembimbing/pic kamu, perkenalkan diri dengan sopan, dan tanya apa yang harus dilakukan hari ini',
          'Buka HP sambil nunggu ada yang menyapa',
          'Pulang duluan karena belum ada tugas'
        ],
        answer: 1
      },
      {
        q: 'Saat pembimbing menjelaskan tugas, sikap terbaik adalah?',
        options: [
          'Nggak perlu catat, nanti pasti ingat kok',
          'Catat poin penting, kalau bingung langsung tanya, dan konfirmasi ulang di akhir',
          'Hanya angguk-angguk walaupun nggak ngerti (biar nggak kelihatan bodoh)',
          'Foto papan tulisnya aja, nanti pelajari sendiri'
        ],
        answer: 1
      }
    ]
  },
  {
    id: 'mod-2-komunikasi',
    title: 'Komunikasi Profesional',
    description: 'Cara kirim email kerja, chat WhatsApp ke atasan, telepon klien, dan dengerin briefing tanpa salah paham. Komunikasi yang baik = karir yang lancar.',
    icon: 'message-circle',
    quizQuestions: [
      {
        q: 'Kamu mau kirim email ke atasan untuk laporan harian. Subject email yang paling tepat?',
        options: [
          'coba cek ini',
          'Laporan Harian Magang — [Nama] — [Tanggal]',
          'AYO BACA CEPAT!!!',
          '(kosong)'
        ],
        answer: 1
      },
      {
        q: 'Atasan chat WA di jam kerja: "Tolong kirim data kemarin". Balasan yang paling profesional?',
        options: [
          'ok',
          'Siap kak, lagi saya siapkan. Estimasi 10 menit lagi ya 🙏',
          'nanti aja ya lagi sibuk',
          'sudah saya kirim kemarin kok'
        ],
        answer: 1
      }
    ]
  },
  {
    id: 'mod-3-manajemen-waktu',
    title: 'Manajemen Waktu & Prioritas',
    description: '6 bulan magang = banyak tugas numpuk. Pelajari cara bikin to-do list, bedain yang urgent vs penting, dan nggak nunda-nunda sampai deadline.',
    icon: 'clock',
    quizQuestions: [
      {
        q: 'Kamu punya 4 tugas: (A) laporan besok jam 9, (B) presentasi minggu depan, (C) balas email non-urgent, (D) bantu rekan kerja sekarang. Urutan yang benar?',
        options: [
          'A → D → C → B',
          'B → A → C → D',
          'C → B → D → A',
          'D → A → B → C'
        ],
        answer: 0
      },
      {
        q: 'Cara jitu biar nggak nunda-nunda tugas (procrastinate)?',
        options: [
          'Tunggu mood bagus baru kerjain',
          'Pecah tugas jadi langkah kecil, mulai dari yang paling gampang dulu, set timer 25 menit fokus',
          'Kerjain semuanya malem sebelum deadline (biar sekali duduk)',
          'Tidur dulu, besok pasti lebih semangat'
        ],
        answer: 1
      }
    ]
  },
  {
    id: 'mod-4-mental-toughness',
    title: 'Mental Toughness',
    description: 'Magang 6 bulan bakal ada momen berat: dikritik, tugas numpuk, bos marah, merasa incompetent. Ini cara tetap semangat dan nggak gampang menyerah.',
    icon: 'heart',
    quizQuestions: [
      {
        q: 'Atasan keras sekali mengkritik pekerjaanmu di depan rekan kerja. Reaksi terbaik?',
        options: [
          'Marah dan langsung resign besoknya',
          'Diam saja, simpan kekesalan, kerjakan seperti biasa',
          'Dengarkan, akui kesalahan, minta arahan perbaikan, dan jadikan pelajaran (jangan diambil hati)',
          'Menangis di toilet terus kabur pulang'
        ],
        answer: 2
      },
      {
        q: 'Minggu ke-3 magang, kamu merasa "aku nggak bisa apa-apa, beban tim". Apa yang harus kamu lakukan?',
        options: [
          'Stop magang, ini bukan jalanku',
          'Ingat: semua orang pernah jadi pemula. Fokus ke progres kecil per hari, tanya bantuan pembimbing, dan jangan bandingkan diri dengan senior',
          'Pura-pura sakit biar nggak masuk kerja',
          'Diam dan biarkan waktu berlalu, nanti juga bisa'
        ],
        answer: 1
      }
    ]
  },
  {
    id: 'mod-5-etos-kerja',
    title: 'Etos Kerja & Integritas',
    description: 'Disiplin, jujur, tanggung jawab, dan inisiatif. Beda magang yang "cuma datang-pulang" vs magang yang diingat dan direkomendasikan adalah etos kerja.',
    icon: 'shield',
    quizQuestions: [
      {
        q: 'Selesai semua tugas jam 3 sore, masih 2 jam lagi sebelum pulang. Apa yang kamu lakukan?',
        options: [
          'Pulang duluan, namanya juga sudah selesai',
          'Buka sosmed sampai jam pulang',
          'Tanya pembimbing atau rekan: "ada yang bisa saya bantu?" atau pelajari skill baru yang relevan',
          'Tidur sebentar di meja'
        ],
        answer: 2
      },
      {
        q: 'Kamu salah input data, tapi belum ada yang tahu. Sikap integritas yang benar?',
        options: [
          'Diam saja, mudah-mudahan nggak ketahuan',
          'Laporkan ke atasan, akui kesalahan, dan segera perbaiki',
          'Salahkan sistem atau rekan kerja lain',
          'Tunggu ada yang komplain, baru akui'
        ],
        answer: 1
      }
    ]
  },
  {
    id: 'mod-6-belajar-dari-salah',
    title: 'Belajar dari Kesalahan',
    description: 'Salah itu pasti. Yang penting: cara admit salah, minta maaf, fix cepat, dan nggak ngulangin. Ini skill yang dicari perusahaan.',
    icon: 'refresh-cw',
    quizQuestions: [
      {
        q: 'Kamu lupa kirim laporan yang seharusnya jam 5 sore. Sekarang jam 6. Apa yang kamu lakukan?',
        options: [
          'Tunggu besok, nggak apa-apa kan cuma telat 1 hari',
          'Kirim laporan sekarang juga + chat minta maaf + jelaskan solusi biar nggulang',
          'Salahkan teknis (internet error, laptop hang, dll)',
          'Pura-pura laporan sudah terkirim'
        ],
        answer: 1
      },
      {
        q: 'Setelah salah, langkah terbaik agar nggak ngulangin kesalahan yang sama?',
        options: [
          'Lupakan saja, biarin waktu yang sembuhkan',
          'Catat penyebabnya, bikin checklist atau sistem pengingat, dan minta feedback dari atasan setelah beberapa minggu',
          'Pindah ke tugas lain biar nggak ingat',
          'Menyalahkan diri terus-menerus'
        ],
        answer: 1
      }
    ]
  },
  {
    id: 'mod-7-bpjs-ringkas',
    title: 'Program BPJS Ketenagakerjaan (Ringkas)',
    description: '5 program BPJS Ketenagakerjaan dalam 1 modul: JKK, JKM, JHT, JP, JKP. Cukup tahu dasarnya — ini konteks pekerjaan kamu selama 6 bulan.',
    icon: 'briefcase',
    quizQuestions: [
      {
        q: 'JHT (Jaminan Hari Tua) itu apa?',
        options: [
          'Santunan kematian kalau peserta meninggal',
          'Tabungan hari tua yang bisa diambil saat resign/pensiun/PHK',
          'Santunan kecelakaan kerja',
          'Pensiun bulanan untuk yang sudah pensiun'
        ],
        answer: 1
      },
      {
        q: 'Yang mana yang BENAR tentang program BPJS Ketenagakerjaan?',
        options: [
          'JKK = kecelakaan kerja, JKM = kematian, JHT = tabungan hari tua',
          'JKK = kredit kendaraan, JKM = jaminan makan, JHT = jaminan hotel',
          'Semua program = sama, hanya beda nama',
          'Hanya JHT yang penting, yang lain nggak'
        ],
        answer: 0
      }
    ]
  },
  {
    id: 'mod-8-career-readiness',
    title: 'Career Readiness',
    description: 'Persiapan setelah magang: cara tulis CV yang menarik, soft skills yang dicari perusahaan, dan mindset untuk kerja/lanjut kuliah setelah lulus.',
    icon: 'trending-up',
    quizQuestions: [
      {
        q: 'Di CV, pengalaman magang 6 bulan sebaiknya ditulis bagaimana?',
        options: [
          'Cuma tulis "Magang di BPJS" tanpa detail',
          'Tulis posisi, durasi, 3-5 pencapaian spesifik dengan angka (misal: "Verifikasi 200+ dokumen JHT")',
          'Jangan dicantumkan, masih belum pengalaman kerja',
          'Tulis panjang lebar 2 halaman tentang semua aktivitas harian'
        ],
        answer: 1
      },
      {
        q: 'Soft skill apa yang paling dicari perusahaan dari fresh graduate?',
        options: [
          'Hanya hard skill teknis (coding, akuntansi, dll)',
          'Komunikasi, kemampuan belajar cepat, kerja sama tim, dan inisiatif',
          'Kemampuan Puasa (sabar menunggu gaji)',
          'Kemampuan bawa motor (wajib punya SIM)'
        ],
        answer: 1
      }
    ]
  }
];
