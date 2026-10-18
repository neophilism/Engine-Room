import type { EventEmitter } from "node:events";
export function handleIdlePoolErrors<T extends EventEmitter>(pool: T, report?: (message: string, details: { code: string }) => void): T;
