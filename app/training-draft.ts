// 全流程断点续传草稿模块
// 不写入敏感信息 (FORGE_ADMIN_KEY 等), 不依赖数据库 Schema

import type { TrainingMode } from "./data";

const DRAFT_VERSION = 2;
const DRAFT_PREFIX = "forge-training-draft";

function draftKey(task: { variantId?: string; id: string }): string {
  return `${DRAFT_PREFIX}:v${DRAFT_VERSION}:${task.variantId ?? task.id}`;
}

export interface DraftState {
  phase: string;
  trainingMode: TrainingMode;
  observation: Record<string, unknown>;
  systemModel: Record<string, unknown>;
  diagnosis: Record<string, unknown>;
  actionPlan: Record<string, unknown>;
  evidence: Record<string, unknown>;
  stateUpdate: Record<string, unknown>;
  reflection: Record<string, unknown>;
  reviewDecision: Record<string, unknown>;
  specificationCoverage: string[];
  releaseChecks: string[];
  funnelHistory: Array<{ stage: string; decision: string; at: string }>;
  workspace: Record<string, string>;
  selectedFile: string;
  results: Array<{ label: string; passed: boolean; input: string; actual: string; databaseState: string; why: string }>;
  hints: number;
  firstHintSeconds: number;
  diagnosisLockedBeforeHint: boolean;
  startedAt: number;
}

interface StoredDraft {
  version: number;
  taskId: string;
  taskTitle: string;
  savedAt: string;
  state: DraftState;
}

export function saveDraft(
  task: { variantId?: string; id: string; title: string },
  state: DraftState,
): void {
  try {
    const stored: StoredDraft = {
      version: DRAFT_VERSION,
      taskId: task.variantId ?? task.id,
      taskTitle: task.title,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(draftKey(task), JSON.stringify(stored));
  } catch {
    // localStorage 满或不可用, 静默失败不阻塞 UI
  }
}

export function loadDraft(task: { variantId?: string; id: string }): StoredDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(task));
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredDraft;
    // 版本兼容：v1 草稿无 trainingMode，默认 mastery
    if (stored.version === 1) {
      stored.state.trainingMode = "mastery";
      stored.version = DRAFT_VERSION;
    }
    if (stored.version !== DRAFT_VERSION) return null; // 不兼容版本，静默丢弃
    if (stored.state.phase === "result") return null;   // 已完成，不恢复
    return stored;
  } catch {
    return null;
  }
}

export function hasDraft(task: { variantId?: string; id: string }): boolean {
  try {
    const raw = localStorage.getItem(draftKey(task));
    if (!raw) return false;
    const stored = JSON.parse(raw) as StoredDraft;
    // v1 草稿仍有效
    if (stored.version === 1) return stored.state.phase !== "result";
    return stored.version === DRAFT_VERSION && stored.state.phase !== "result";
  } catch {
    return false;
  }
}

export function clearDraft(task: { variantId?: string; id: string }): void {
  try {
    localStorage.removeItem(draftKey(task));
  } catch {
    // 静默忽略
  }
}

export function getDraftSavedAt(task: { variantId?: string; id: string }): string | null {
  try {
    const raw = localStorage.getItem(draftKey(task));
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredDraft;
    if (stored.version !== DRAFT_VERSION && stored.version !== 1) return null;
    return stored.savedAt;
  } catch {
    return null;
  }
}