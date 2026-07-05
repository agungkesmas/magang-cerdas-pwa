-- ============================================================
-- MIGRATION PHASE 1: Chat Group + Quest + Dashboard Pembina (MVP)
-- Idempotent — aman di-run ulang
-- Rollback: supabase/rollback-phase1-chat-quest.sql
-- ============================================================

-- ============================================================
-- A. EXTEND tabel activities (tambah kolom untuk Quest)
--    Tidak ubah kolom existing, hanya tambah
-- ============================================================
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_quest BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_by_pembina_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS xp_reward INT DEFAULT 20;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS max_slots INT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS current_slots_taken INT DEFAULT 0;

-- Update constraint activities_target_check: izinkan group_id sebagai target (untuk Quest)
-- Sebelumnya: intern_id ATAU department wajib
-- Sesudah: intern_id ATAU department ATAU group_id (untuk Quest yang di-deploy ke grup)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_target_check;
ALTER TABLE activities ADD CONSTRAINT activities_target_check
  CHECK (intern_id IS NOT NULL OR department IS NOT NULL OR group_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_activities_is_quest ON activities(is_quest) WHERE is_quest = TRUE;
CREATE INDEX IF NOT EXISTS idx_activities_group_id ON activities(group_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by_pembina ON activities(created_by_pembina_id);

-- ============================================================
-- B. TABEL: pembina_magang (Master akun pembina)
-- ============================================================
CREATE TABLE IF NOT EXISTS pembina_magang (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pembina_id VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  raw_password VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  department VARCHAR(50) CHECK (department IN ('Pelayanan', 'Pemasaran', 'Keuangan', 'Lintas Bidang')),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pembina_magang ENABLE ROW LEVEL SECURITY;
-- No public policy — all access via service role in API routes

-- Add FK dari activities.created_by_pembina_id ke pembina_magang
-- (hanya kalau constraint belum ada, supaya idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activities_created_by_pembina_fkey'
  ) THEN
    ALTER TABLE activities ADD CONSTRAINT activities_created_by_pembina_fkey
      FOREIGN KEY (created_by_pembina_id) REFERENCES pembina_magang(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- C. TABEL: groups (Grup chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_type VARCHAR(20) DEFAULT 'department',
  department VARCHAR(50),
  created_by_type VARCHAR(20),
  created_by_id UUID,
  created_by_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);

-- Add FK dari activities.group_id ke groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activities_group_fkey'
  ) THEN
    ALTER TABLE activities ADD CONSTRAINT activities_group_fkey
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- D. TABEL: group_members (Junction group ↔ user)
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  added_by_type VARCHAR(20),
  added_by_id UUID,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_type, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_type, user_id);

-- ============================================================
-- E. TABEL: chat_messages (Pesan chat + Quest Card embed)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  sender_id UUID NOT NULL,
  sender_name VARCHAR(255),
  message_type VARCHAR(20) DEFAULT 'text',
  content TEXT,
  quest_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_messages_group ON chat_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_quest ON chat_messages(quest_id) WHERE quest_id IS NOT NULL;

-- ============================================================
-- F. TABEL: quest_logs (Tracking Start/Submit per peserta per quest)
-- ============================================================
CREATE TABLE IF NOT EXISTS quest_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'available',
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submission_notes TEXT,
  xp_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quest_id, intern_id)
);

ALTER TABLE quest_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quest_logs_quest ON quest_logs(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_logs_intern ON quest_logs(intern_id);
CREATE INDEX IF NOT EXISTS idx_quest_logs_status ON quest_logs(status);

-- ============================================================
-- G. SEED: Default pembina (email: pembina@magang-cerdas.local / password: pembina123456)
--    Hash: bcryptjs untuk "pembina123456"
-- ============================================================
INSERT INTO pembina_magang (pembina_id, email, password_hash, raw_password, name, phone, department, is_active)
VALUES
  ('PB-0001', 'pembina@magang-cerdas.local', '$2a$10$9KOBpXYaAV7HJ5lgaBur5eZT8cRASjZLQX/HEgAr4OPUEmg4mxaqS', 'pembina123456', 'Pembina Default Pelayanan', '', 'Pelayanan', TRUE),
  ('PB-0002', 'pembina.keuangan@magang-cerdas.local', '$2a$10$9KOBpXYaAV7HJ5lgaBur5eZT8cRASjZLQX/HEgAr4OPUEmg4mxaqS', 'pembina123456', 'Pembina Default Keuangan', '', 'Keuangan', TRUE),
  ('PB-0003', 'pembina.pemasaran@magang-cerdas.local', '$2a$10$9KOBpXYaAV7HJ5lgaBur5eZT8cRASjZLQX/HEgAr4OPUEmg4mxaqS', 'pembina123456', 'Pembina Default Pemasaran', '', 'Pemasaran', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- H. SEED: Default grup (1 grup per department, link ke pembina default)
-- ============================================================
INSERT INTO groups (name, description, group_type, department, created_by_type, created_by_id, created_by_name, is_active)
SELECT
  g.name, g.description, 'department', g.department, 'admin', a.id, 'Super Admin', TRUE
FROM (VALUES
  ('Grup Magang Pelayanan Q3 2026', 'Grup kolaborasi pembina & peserta Pelayanan', 'Pelayanan'),
  ('Grup Magang Keuangan Q3 2026', 'Grup kolaborasi pembina & peserta Keuangan', 'Keuangan'),
  ('Grup Magang Pemasaran Q3 2026', 'Grup kolaborasi pembina & peserta Pemasaran', 'Pemasaran')
) AS g(name, description, department)
CROSS JOIN admins a
WHERE a.email = 'admin@magang-cerdas.local'
AND NOT EXISTS (SELECT 1 FROM groups WHERE name = g.name)
ON CONFLICT DO NOTHING;

-- Link pembina default ke grup masing-masing
INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id)
SELECT grp.id, 'pembina', p.id, 'group_admin', 'admin', a.id
FROM groups grp
JOIN pembina_magang p ON
  (grp.department = 'Pelayanan' AND p.email = 'pembina@magang-cerdas.local')
  OR (grp.department = 'Keuangan' AND p.email = 'pembina.keuangan@magang-cerdas.local')
  OR (grp.department = 'Pemasaran' AND p.email = 'pembina.pemasaran@magang-cerdas.local')
CROSS JOIN admins a
WHERE a.email = 'admin@magang-cerdas.local'
ON CONFLICT (group_id, user_type, user_id) DO NOTHING;

-- Link peserta magang existing ke grup sesuai department
INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id)
SELECT grp.id, 'peserta', i.id, 'member', 'admin', a.id
FROM interns i
JOIN groups grp ON
  (i.department = 'Pelayanan' AND grp.department = 'Pelayanan' AND grp.name = 'Grup Magang Pelayanan Q3 2026')
  OR (i.department = 'Keuangan' AND grp.department = 'Keuangan' AND grp.name = 'Grup Magang Keuangan Q3 2026')
  OR (i.department = 'Pemasaran' AND grp.department = 'Pemasaran' AND grp.name = 'Grup Magang Pemasaran Q3 2026')
CROSS JOIN admins a
WHERE i.is_active = TRUE
AND a.email = 'admin@magang-cerdas.local'
ON CONFLICT (group_id, user_type, user_id) DO NOTHING;

-- ============================================================
-- I. VERIFIKASI
-- ============================================================
SELECT 'MIGRATION PHASE 1 SELESAI' as info
UNION ALL SELECT 'pembina_magang: ' || COUNT(*)::text FROM pembina_magang
UNION ALL SELECT 'groups: ' || COUNT(*)::text FROM groups
UNION ALL SELECT 'group_members: ' || COUNT(*)::text FROM group_members
UNION ALL SELECT 'chat_messages: ' || COUNT(*)::text FROM chat_messages
UNION ALL SELECT 'quest_logs: ' || COUNT(*)::text FROM quest_logs
UNION ALL SELECT 'activities is_quest: ' || COUNT(*)::text FROM activities WHERE is_quest = TRUE;
