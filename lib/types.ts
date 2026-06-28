// 앱 전반에서 공유하는 타입 정의

export interface ChatMessage {
  timestamp?: string;
  sender: string;
  message: string;
  isSystem: boolean;
}

export type Priority = "high" | "medium" | "low";

export interface ActionItem {
  task: string;
  assignee: string | null;
  priority: Priority;
}

export interface AnalysisResult {
  summary: string;
  keyTopics: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
  analyzedCount: number;
  totalCount: number;
}

// CSV 파싱 결과
export interface ParsedChat {
  messages: ChatMessage[];
  participants: string[];
}
