// ============================================================
// system-groups.ts — Auto-sync interns & pembina to system groups
// ============================================================
// System groups:
//   - "All Peserta Magang" (all active interns)
//   - "Magang - Pelayanan" (interns in Pelayanan)
//   - "Magang - Pemasaran" (interns in Pemasaran)
//   - "Magang - Keuangan" (interns in Keuangan)
//
// Rules:
//   - Intern created → add to "All" + department group
//   - Intern archived → remove from "All" + department group
//   - Intern restored → re-add to "All" + department group
//   - Intern department changed → remove from old dept, add to new dept
// ============================================================

import { createServerClient } from '@/lib/supabase';

// Cache system group IDs within a request to avoid repeated queries
let systemGroupCache: { all?: string; pelayanan?: string; pemasaran?: string; keuangan?: string } | null = null;

async function getSystemGroups(supabase: ReturnType<typeof createServerClient>) {
  if (systemGroupCache) return systemGroupCache;

  const { data } = await supabase
    .from('groups')
    .select('id, name, department')
    .eq('group_type', 'system')
    .eq('is_active', true);

  const cache: any = {};
  for (const g of data || []) {
    if (g.name === 'All Peserta Magang') cache.all = g.id;
    else if (g.department === 'Pelayanan') cache.pelayanan = g.id;
    else if (g.department === 'Pemasaran') cache.pemasaran = g.id;
    else if (g.department === 'Keuangan') cache.keuangan = g.id;
  }

  systemGroupCache = cache;
  return cache;
}

/**
 * Sync an intern to system groups based on their active status and department.
 * Call this after creating, updating (active toggle / department change), or restoring an intern.
 *
 * @param supabase - Supabase server client
 * @param internId - UUID of the intern
 * @param department - Department name ('Pelayanan', 'Pemasaran', 'Keuangan')
 * @param isActive - Whether the intern is active
 */
export async function syncInternToSystemGroups(
  supabase: ReturnType<typeof createServerClient>,
  internId: string,
  department: string,
  isActive: boolean
): Promise<void> {
  try {
    const groups = await getSystemGroups(supabase);

    // Determine which group IDs this intern should be in
    const targetGroupIds: string[] = [];
    if (isActive) {
      if (groups.all) targetGroupIds.push(groups.all);
      if (department === 'Pelayanan' && groups.pelayanan) targetGroupIds.push(groups.pelayanan);
      if (department === 'Pemasaran' && groups.pemasaran) targetGroupIds.push(groups.pemasaran);
      if (department === 'Keuangan' && groups.keuangan) targetGroupIds.push(groups.keuangan);
    }

    // All system group IDs
    const allSystemGroupIds = [groups.all, groups.pelayanan, groups.pemasaran, groups.keuangan].filter(Boolean) as string[];

    // Remove intern from ALL system groups first (clean slate)
    if (allSystemGroupIds.length > 0) {
      await supabase
        .from('group_members')
        .delete()
        .eq('user_type', 'peserta')
        .eq('user_id', internId)
        .in('group_id', allSystemGroupIds);
    }

    // Re-add to target groups
    if (targetGroupIds.length > 0) {
      const inserts = targetGroupIds.map((groupId) => ({
        group_id: groupId,
        user_type: 'peserta' as const,
        user_id: internId,
        role: 'member' as const,
        added_by_type: 'system' as const,
        added_by_id: null,
      }));
      await supabase.from('group_members').insert(inserts);
    }
  } catch (e) {
    console.error('[system-groups] Failed to sync intern:', internId, e);
  }
}

/**
 * Sync a pembina to department system groups.
 * Call this after creating or updating a pembina.
 *
 * @param supabase - Supabase server client
 * @param pembinaId - UUID of the pembina
 * @param department - Department name
 * @param isActive - Whether the pembina is active
 */
export async function syncPembinaToSystemGroups(
  supabase: ReturnType<typeof createServerClient>,
  pembinaId: string,
  department: string,
  isActive: boolean
): Promise<void> {
  try {
    const groups = await getSystemGroups(supabase);

    // Determine target department group
    let targetGroupId: string | null = null;
    if (isActive) {
      if (department === 'Pelayanan' && groups.pelayanan) targetGroupId = groups.pelayanan;
      else if (department === 'Pemasaran' && groups.pemasaran) targetGroupId = groups.pemasaran;
      else if (department === 'Keuangan' && groups.keuangan) targetGroupId = groups.keuangan;
    }

    // All department system group IDs
    const deptGroupIds = [groups.pelayanan, groups.pemasaran, groups.keuangan].filter(Boolean) as string[];

    // Remove pembina from ALL department system groups
    if (deptGroupIds.length > 0) {
      await supabase
        .from('group_members')
        .delete()
        .eq('user_type', 'pembina')
        .eq('user_id', pembinaId)
        .in('group_id', deptGroupIds);
    }

    // Re-add to target department group
    if (targetGroupId) {
      await supabase.from('group_members').insert({
        group_id: targetGroupId,
        user_type: 'pembina',
        user_id: pembinaId,
        role: 'member',
        added_by_type: 'system',
        added_by_id: null,
      });
    }
  } catch (e) {
    console.error('[system-groups] Failed to sync pembina:', pembinaId, e);
  }
}

/**
 * Reset cache (for testing or long-running processes).
 */
export function resetSystemGroupCache(): void {
  systemGroupCache = null;
}
