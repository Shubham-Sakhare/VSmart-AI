export type Intent =
  | "system"
  | "browser"
  | "memory"
  | "file"
  | "automation"
  | "coding"
  | "chat"
  | "vision"
  | "agent"
  | "unknown";

export interface AIRequest {
  text: string;
}

export interface AIResponse<T = unknown> {
  success: boolean;
  reply: string;
  data?: T;
}

export interface Plan {
  intent: Intent;
  command: string;
}