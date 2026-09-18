export type SessionState =
  | "idle"
  | "starting"
  | "waiting-permission"
  | "sharing"
  | "analyzing"
  | "thinking"
  | "ready"
  | "error"
  | "stopped";

export type AiStatus =
  | "ready"
  | "analyzing"
  | "thinking"
  | "waiting-input"
  | "error";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  at: string; // ISO timestamp
  /** True while this assistant message is still streaming in. */
  streaming?: boolean;
  /** True when this message was grounded in a screen frame. */
  groundedInScreen?: boolean;
}

export type TimelineKind =
  | "session-start"
  | "sharing"
  | "capture"
  | "screen-changed"
  | "analysis"
  | "chat"
  | "compare"
  | "summary"
  | "stopped"
  | "error";

export interface TimelineEvent {
  id: string;
  at: string; // ISO timestamp
  kind: TimelineKind;
  label: string;
}

export interface CapturedFrame {
  id: string;
  at: string;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  /** Short label, e.g. "Manual capture", "Analysis frame". */
  label: string;
}

export interface PersistedSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  status: string;
  messageCount: number;
  messages: ChatMessage[];
  timeline: TimelineEvent[];
  summary: string | null;
  technicalMode: boolean;
}

export type AnalyzeAction =
  | "analyze"
  | "explain-error"
  | "what-changed"
  | "next-step"
  | "summarize";
