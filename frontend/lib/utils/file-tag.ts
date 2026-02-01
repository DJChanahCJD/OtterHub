import { FileItem, FileTag } from "@shared/types";

// 标签展示配置
export interface TagDisplayConfig {
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const TAG_CONFIG: Record<FileTag, TagDisplayConfig> = {
  [FileTag.NSFW]: {
    label: "NSFW",
    description: "敏感内容",
    bgColor: "bg-amber-500/20",
    textColor: "text-amber-300 dark:text-amber-400",
    borderColor: "border-amber-500/50",
  },
  [FileTag.Private]: {
    label: "Private",
    description: "私有文件",
    bgColor: "bg-purple-500/20",
    textColor: "text-purple-300 dark:text-purple-400",
    borderColor: "border-purple-500/50",
  },
};

export enum BatchTagState {
  None = "none",
  Partial = "partial",
  All = "all",
}

export type TagStateMap = Record<FileTag, BatchTagState>;

/**
 * 标签操作意图：用户想做什么
 */
export type TagIntent = "keep" | "add" | "remove";

/**
 * 表驱动的状态跳转规则
 * 格式：NEXT_STATE[original][current] = [nextState]
 */
const NEXT_STATE: Record<
  BatchTagState,
  Record<BatchTagState, BatchTagState[]>
> = {
  // original = none
  [BatchTagState.None]: {
    [BatchTagState.None]: [BatchTagState.All],
    [BatchTagState.All]: [BatchTagState.None],
    [BatchTagState.Partial]: [], // 不会出现
  },

  // original = all
  [BatchTagState.All]: {
    [BatchTagState.All]: [BatchTagState.None],
    [BatchTagState.None]: [BatchTagState.All],
    [BatchTagState.Partial]: [],
  },

  // original = partial
  [BatchTagState.Partial]: {
    [BatchTagState.Partial]: [BatchTagState.All],
    [BatchTagState.All]: [BatchTagState.None],
    [BatchTagState.None]: [BatchTagState.Partial],
  },
};

/**
 * 获取标签操作意图
 * @param current 当前UI状态
 * @param original 原始分布状态
 */
export function getTagIntent(
  current: BatchTagState,
  original: BatchTagState,
): TagIntent {
  if (current === original) return "keep";
  if (current === BatchTagState.All) return "add";
  return "remove";
}

/**
 * 计算某一批文件中，各标签的原始分布状态
 */
export function calcOriginalTagStates(files: FileItem[]): TagStateMap {
  const states = Object.fromEntries(
    Object.values(FileTag).map((tag) => [tag, BatchTagState.None]),
  ) as TagStateMap;

  if (files.length === 0) return states;

  for (const tag of Object.values(FileTag)) {
    const count = files.filter((f) => f.metadata?.tags?.includes(tag)).length;

    if (count === 0) {
      states[tag] = BatchTagState.None;
    } else if (count === files.length) {
      states[tag] = BatchTagState.All;
    } else {
      states[tag] = BatchTagState.Partial;
    }
  }

  return states;
}

/**
 * 三态切换规则（唯一入口）
 * 使用表驱动的方式实现状态跳转
 */
export function nextTagState(
  current: BatchTagState,
  original: BatchTagState,
): BatchTagState {
  const next = NEXT_STATE[original][current];
  return next?.[0] ?? current;
}

/**
 * 计算单个文件的最终标签
 * 基于 intent 语义，更清晰的业务逻辑
 */
export function applyTagStates(
  existing: FileTag[],
  states: TagStateMap,
  original: TagStateMap,
): FileTag[] {
  const result = new Set<FileTag>(existing);

  for (const tag of Object.values(FileTag)) {
    const intent = getTagIntent(states[tag], original[tag]);

    if (intent === "add") result.add(tag);
    if (intent === "remove") result.delete(tag);
    // intent === "keep"：什么都不做
  }

  return [...result];
}

/**
 * 是否有任何标签发生了变化
 */
export function hasAnyTagChange(
  states: TagStateMap,
  original: TagStateMap,
): boolean {
  return Object.values(FileTag).some(
    (tag) => getTagIntent(states[tag], original[tag]) !== "keep",
  );
}
