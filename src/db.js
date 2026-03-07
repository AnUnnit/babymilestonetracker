// ─── db.js  — all Supabase data operations ────────────────────────────────────
import { supabase } from './supabaseClient';

// ── Babies ────────────────────────────────────────────────────────────────────

export async function fetchBabies(userId) {
  const { data, error } = await supabase
    .from('babies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createBaby(userId, baby) {
  // baby = { name, dob, sex, birth_weight, birth_length, birth_hc }
  const { data, error } = await supabase
    .from('babies')
    .insert({ ...baby, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBaby(babyId, fields) {
  const { data, error } = await supabase
    .from('babies')
    .update(fields)
    .eq('id', babyId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBaby(babyId) {
  const { error } = await supabase.from('babies').delete().eq('id', babyId);
  if (error) throw error;
}

// ── Growth records ────────────────────────────────────────────────────────────

export async function fetchGrowthRecords(babyId) {
  const { data, error } = await supabase
    .from('growth_records')
    .select('*')
    .eq('baby_id', babyId)
    .order('day', { ascending: true });
  if (error) throw error;
  // Normalise column names to match legacy camelCase used in the tracker component
  return data.map(r => ({
    id: r.id,
    day: r.day,
    weight: r.weight,
    length: r.length,
    headCirc: r.head_circ,
    label: r.label,
    note: r.note,
  }));
}

export async function upsertGrowthRecord(userId, babyId, record) {
  // record = { day, weight?, length?, headCirc?, label?, note? }
  const row = {
    user_id: userId,
    baby_id: babyId,
    day: record.day,
    weight: record.weight ?? null,
    length: record.length ?? null,
    head_circ: record.headCirc ?? null,
    label: record.label ?? null,
    note: record.note ?? null,
  };

  if (record.id) {
    // Update existing
    const { data, error } = await supabase
      .from('growth_records')
      .update(row)
      .eq('id', record.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('growth_records')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteGrowthRecord(recordId) {
  const { error } = await supabase.from('growth_records').delete().eq('id', recordId);
  if (error) throw error;
}

// ── Milestone logs ────────────────────────────────────────────────────────────

export async function fetchMilestoneLogs(babyId) {
  const { data, error } = await supabase
    .from('milestone_logs')
    .select('*')
    .eq('baby_id', babyId);
  if (error) throw error;
  // Return as { [milestone_id]: { daysFromBirth, date, note } }
  const map = {};
  for (const row of data) {
    map[row.milestone_id] = {
      id: row.id,
      daysFromBirth: row.days_from_birth,
      date: row.date_observed,
      note: row.note,
    };
  }
  return map;
}

export async function upsertMilestoneLog(userId, babyId, milestoneId, log) {
  // log = { daysFromBirth, date, note }
  const { data, error } = await supabase
    .from('milestone_logs')
    .upsert({
      user_id: userId,
      baby_id: babyId,
      milestone_id: milestoneId,
      days_from_birth: log.daysFromBirth ?? null,
      date_observed: log.date ?? null,
      note: log.note ?? null,
    }, { onConflict: 'baby_id,milestone_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMilestoneLog(babyId, milestoneId) {
  const { error } = await supabase
    .from('milestone_logs')
    .delete()
    .eq('baby_id', babyId)
    .eq('milestone_id', milestoneId);
  if (error) throw error;
}

// ── Share tokens ──────────────────────────────────────────────────────────────

export async function fetchShareTokens(babyId) {
  const { data, error } = await supabase
    .from('share_tokens')
    .select('*')
    .eq('baby_id', babyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Simple SHA-256 based PIN hash (runs in browser, no bcrypt needed)
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode('babytracker-pin-salt-' + pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(token, pin) {
  // Fetch the stored hash for this token
  const { data, error } = await supabase
    .from('share_tokens')
    .select('pin_hash')
    .eq('token', token)
    .single();
  if (error) throw error;
  if (!data.pin_hash) return true; // no PIN set → always passes
  const inputHash = await hashPin(pin);
  return inputHash === data.pin_hash;
}

export async function createShareToken(userId, babyId, label, pin) {
  const row = { user_id: userId, baby_id: babyId, label };
  if (pin && pin.length === 4) {
    row.pin_hash = await hashPin(pin);
  }
  const { data, error } = await supabase
    .from('share_tokens')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShareToken(tokenId) {
  const { error } = await supabase.from('share_tokens').delete().eq('id', tokenId);
  if (error) throw error;
}

// Read-only shared view — fetch baby data by share token (no auth required)
export async function checkShareToken(token) {
  // Check if token exists and return metadata (PIN required, expiry)
  const { data, error } = await supabase
    .from('share_tokens')
    .select('baby_id, expires_at, pin_hash')
    .eq('token', token)
    .single();
  if (error) throw new Error('Invalid share link');
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new Error('This share link has expired');
  }
  return { requiresPin: !!data.pin_hash, babyId: data.baby_id };
}

export async function fetchSharedBaby(token) {
  const { data: tokenRow, error: te } = await supabase
    .from('share_tokens')
    .select('baby_id, expires_at, pin_hash')
    .eq('token', token)
    .single();
  if (te || !tokenRow) throw new Error('Invalid or expired share link');
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    throw new Error('This share link has expired');
  }
  const babyId = tokenRow.baby_id;
  const [{ data: baby, error: be }, growthRaw, milestonesRaw] = await Promise.all([
    supabase.from('babies').select('*').eq('id', babyId).single(),
    fetchGrowthRecords(babyId),
    fetchMilestoneLogs(babyId),
  ]);
  if (be) throw be;
  return { baby, records: growthRaw, milestones: milestonesRaw };
}

// ── Vaccine logs ──────────────────────────────────────────────────────────────
// One row per completed vaccine visit (identified by vaccine_day).

export async function fetchVaccineLogs(babyId) {
  const { data, error } = await supabase
    .from('vaccine_logs')
    .select('vaccine_day')
    .eq('baby_id', babyId);
  if (error) throw error;
  // Return as a Set of completed days for O(1) lookup
  return new Set(data.map(r => r.vaccine_day));
}

export async function upsertVaccineLog(userId, babyId, vaccineDay) {
  const { error } = await supabase
    .from('vaccine_logs')
    .upsert(
      { user_id: userId, baby_id: babyId, vaccine_day: vaccineDay },
      { onConflict: 'baby_id,vaccine_day' }
    );
  if (error) throw error;
}

export async function deleteVaccineLog(babyId, vaccineDay) {
  const { error } = await supabase
    .from('vaccine_logs')
    .delete()
    .eq('baby_id', babyId)
    .eq('vaccine_day', vaccineDay);
  if (error) throw error;
}
