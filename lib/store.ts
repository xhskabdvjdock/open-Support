"use client";

import type { PersistedSession } from "./types";

const SESSIONS_KEY = "open-support:sessions:v1";
const MAX_STORED_SESSIONS = 20;

/** Screenshots are never persisted — only messages, timeline, and metadata. */

function readAll(): PersistedSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: PersistedSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_STORED_SESSIONS)));
  } catch {
    // Storage full or unavailable: sessions simply won't persist.
  }
}

export function listSessions(): PersistedSession[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveSession(session: PersistedSession) {
  const all = readAll().filter((s) => s.id !== session.id);
  all.unshift(session);
  writeAll(all);
}

export function deleteSession(id: string) {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function clearSessions() {
  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch {
    // ignore
  }
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
