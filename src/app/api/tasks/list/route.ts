// ============================================================
// /api/tasks/list — List tasks
// Admin: semua task (with assignments info)
// Intern: task yang relevant untuk mereka (per departemen + yang di-assign)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getInternToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const intern = await getInternToken();
    if (!admin && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    if (admin && !intern) {
      // Admin: lihat semua task (with assignments)
      const { data: tasks, error: tErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

      // Get all assignments + intern info
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('task_id, interns(id, name, major, department, username, is_active)')
        .in('task_id', (tasks || []).map((t) => t.id));

      // Get team progress untuk mode 'team'
      const { data: teamProgress } = await supabase
        .from('task_team_progress')
        .select('task_id, chunk_index, completed_by_intern_id, interns!inner(name)')
        .in('task_id', (tasks || []).map((t) => t.id));

      // Build map
      const assignmentsPerTask: Record<string, any[]> = {};
      (assignments || []).forEach((a: any) => {
        if (!assignmentsPerTask[a.task_id]) assignmentsPerTask[a.task_id] = [];
        if (a.interns) assignmentsPerTask[a.task_id].push(a.interns);
      });

      const teamProgressPerTask: Record<string, any[]> = {};
      (teamProgress || []).forEach((p: any) => {
        if (!teamProgressPerTask[p.task_id]) teamProgressPerTask[p.task_id] = [];
        teamProgressPerTask[p.task_id].push({
          chunk_index: p.chunk_index,
          completed_by: p.interns?.name,
          completed_by_intern_id: p.completed_by_intern_id
        });
      });

      const tasksEnriched = (tasks || []).map((t) => ({
        ...t,
        assigned_interns: assignmentsPerTask[t.id] || [],
        team_progress_entries: teamProgressPerTask[t.id] || []
      }));

      return NextResponse.json({ success: true, tasks: tasksEnriched });
    }

    // Intern: task yang relevant
    // 1. individual: filter by department
    // 2. assigned/team: filter by assignment (intern_id = current)
    const internDept = intern!.department;
    const internId = intern!.intern_id;
    const { data: deptTasks, error: dErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .eq('department', internDept)
      .eq('mode', 'individual')
      .order('created_at', { ascending: false });
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    // Get assigned tasks for this intern
    const { data: assignedTasks, error: aErr } = await supabase
      .from('task_assignments')
      .select('tasks!inner(*)')
      .eq('intern_id', internId)
      .eq('tasks.is_active', true);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const assignedTaskList = (assignedTasks || []).map((a: any) => a.tasks).filter(Boolean);

    // Combine + dedupe
    const allTasks = [...(deptTasks || []), ...assignedTaskList];
    const seenIds = new Set();
    const uniqueTasks = allTasks.filter((t) => {
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    });

    // Get team progress untuk assigned/team tasks
    const teamTaskIds = uniqueTasks.filter((t) => t.mode === 'team').map((t) => t.id);
    let teamProgressMap: Record<string, any[]> = {};
    if (teamTaskIds.length > 0) {
      const { data: tp } = await supabase
        .from('task_team_progress')
        .select('task_id, chunk_index, completed_by_intern_id, interns!inner(name)')
        .in('task_id', teamTaskIds);
      (tp || []).forEach((p: any) => {
        if (!teamProgressMap[p.task_id]) teamProgressMap[p.task_id] = [];
        teamProgressMap[p.task_id].push({
          chunk_index: p.chunk_index,
          completed_by_intern_id: p.completed_by_intern_id,
          completed_by: p.interns?.name
        });
      });
    }

    // Get assigned interns untuk mode assigned/team (so intern can see teammates)
    const assignedTaskIds = uniqueTasks.filter((t) => t.mode !== 'individual').map((t) => t.id);
    let teammatesMap: Record<string, any[]> = {};
    if (assignedTaskIds.length > 0) {
      const { data: teammates } = await supabase
        .from('task_assignments')
        .select('task_id, interns(id, name, major)')
        .in('task_id', assignedTaskIds);
      (teammates || []).forEach((t: any) => {
        if (!teammatesMap[t.task_id]) teammatesMap[t.task_id] = [];
        if (t.interns) teammatesMap[t.task_id].push(t.interns);
      });
    }

    const tasksEnriched = uniqueTasks.map((t) => ({
      ...t,
      teammates: teammatesMap[t.id] || [],
      team_progress_entries: teamProgressMap[t.id] || []
    }));

    return NextResponse.json({ success: true, tasks: tasksEnriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
