// ─── guestDb.js — localStorage adapter for guest mode ────────────────────────
// All function signatures mirror db.js exactly so callers are unaware of mode.

const GUEST_ID_KEY   = 'bt_guest_id';
const BABIES_KEY     = 'bt_guest_babies';
const growthKey  = id => `bt_guest_growth_${id}`;
const mstoneKey  = id => `bt_guest_milestones_${id}`;

// ── Guest identity ────────────────────────────────────────────────────────────
export function getGuestId() {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function clearGuestData() {
  const babies = getGuestBabies();
  babies.forEach(b => {
    localStorage.removeItem(growthKey(b.id));
    localStorage.removeItem(mstoneKey(b.id));
  });
  localStorage.removeItem(BABIES_KEY);
  localStorage.removeItem(GUEST_ID_KEY);
}

// ── Internal helpers ──────────────────────────────────────────────────────────
function getGuestBabies() {
  try { return JSON.parse(localStorage.getItem(BABIES_KEY) || '[]'); }
  catch { return []; }
}
function saveGuestBabies(list) {
  localStorage.setItem(BABIES_KEY, JSON.stringify(list));
}
function uid() {
  return 'local_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Babies ────────────────────────────────────────────────────────────────────
export async function fetchBabies(_userId) {
  return getGuestBabies();
}

export async function createBaby(_userId, baby) {
  const newBaby = {
    ...baby,
    id: uid(),
    user_id: getGuestId(),
    created_at: new Date().toISOString(),
  };
  const list = getGuestBabies();
  list.push(newBaby);
  saveGuestBabies(list);
  return newBaby;
}

export async function updateBaby(babyId, fields) {
  const list = getGuestBabies();
  const idx = list.findIndex(b => b.id === babyId);
  if (idx === -1) throw new Error('Baby not found');
  list[idx] = { ...list[idx], ...fields };
  saveGuestBabies(list);
  return list[idx];
}

export async function deleteBaby(babyId) {
  const list = getGuestBabies().filter(b => b.id !== babyId);
  saveGuestBabies(list);
  localStorage.removeItem(growthKey(babyId));
  localStorage.removeItem(mstoneKey(babyId));
}

// ── Growth records ────────────────────────────────────────────────────────────
export async function fetchGrowthRecords(babyId) {
  try {
    const data = JSON.parse(localStorage.getItem(growthKey(babyId)) || '[]');
    return data.sort((a, b) => a.day - b.day);
  } catch { return []; }
}

export async function upsertGrowthRecord(_userId, babyId, record) {
  const data = JSON.parse(localStorage.getItem(growthKey(babyId)) || '[]');
  const existing = data.findIndex(r =>
    record.id ? r.id === record.id : r.day === record.day
  );
  const row = {
    id:       record.id || uid(),
    day:      record.day,
    weight:   record.weight   ?? null,
    length:   record.length   ?? null,
    headCirc: record.headCirc ?? null,
    label:    record.label    ?? null,
    note:     record.note     ?? null,
  };
  if (existing >= 0) data[existing] = row;
  else data.push(row);
  localStorage.setItem(growthKey(babyId), JSON.stringify(data));
  return row;
}

export async function deleteGrowthRecord(recordId, babyId) {
  // babyId passed as 2nd arg since we need it for storage key
  // For compatibility, we search all babies if babyId not passed
  const babies = getGuestBabies();
  for (const b of babies) {
    const key = growthKey(b.id);
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = data.filter(r => r.id !== recordId);
    if (filtered.length !== data.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
      return;
    }
  }
}

// ── Milestone logs ────────────────────────────────────────────────────────────
export async function fetchMilestoneLogs(babyId) {
  try { return JSON.parse(localStorage.getItem(mstoneKey(babyId)) || '{}'); }
  catch { return {}; }
}

export async function upsertMilestoneLog(_userId, babyId, milestoneId, log) {
  const data = JSON.parse(localStorage.getItem(mstoneKey(babyId)) || '{}');
  data[milestoneId] = {
    id:           data[milestoneId]?.id || uid(),
    daysFromBirth: log.daysFromBirth ?? null,
    date:          log.date          ?? null,
    note:          log.note          ?? null,
  };
  localStorage.setItem(mstoneKey(babyId), JSON.stringify(data));
  return data[milestoneId];
}

export async function deleteMilestoneLog(babyId, milestoneId) {
  const data = JSON.parse(localStorage.getItem(mstoneKey(babyId)) || '{}');
  delete data[milestoneId];
  localStorage.setItem(mstoneKey(babyId), JSON.stringify(data));
}

// ── Share tokens — not supported for guests ───────────────────────────────────
export async function fetchShareTokens(_babyId)              { return []; }
export async function createShareToken(_u, _b, _l, _p)       { throw new Error('Sign in to share'); }
export async function deleteShareToken(_tokenId)              { throw new Error('Sign in to share'); }

// ── Vaccine logs ──────────────────────────────────────────────────────────────
const vaccineKey = id => `bt_guest_vaccines_${id}`;

export async function fetchVaccineLogs(babyId) {
  try {
    const data = JSON.parse(localStorage.getItem(vaccineKey(babyId)) || '[]');
    return new Set(data);
  } catch { return new Set(); }
}

export async function upsertVaccineLog(_userId, babyId, vaccineDay) {
  const data = JSON.parse(localStorage.getItem(vaccineKey(babyId)) || '[]');
  if (!data.includes(vaccineDay)) {
    data.push(vaccineDay);
    localStorage.setItem(vaccineKey(babyId), JSON.stringify(data));
  }
}

export async function deleteVaccineLog(babyId, vaccineDay) {
  const data = JSON.parse(localStorage.getItem(vaccineKey(babyId)) || '[]');
  localStorage.setItem(vaccineKey(babyId), JSON.stringify(data.filter(d => d !== vaccineDay)));
}
