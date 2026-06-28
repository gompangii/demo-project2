import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatMessage, AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// 분석할 최근 메시지 수: 사용자가 선택 (100/300/500/1000), 기본 300, 상한 1000
const ALLOWED_LIMITS = [100, 300, 500, 1000];
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;

function resolveLimit(raw: unknown): number {
  const n = Number(raw);
  if (ALLOWED_LIMITS.includes(n)) return n;
  if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), MAX_LIMIT);
  return DEFAULT_LIMIT;
}

const SYSTEM_PROMPT = `너는 채팅 커뮤니티 방장(운영자)을 돕는 비서다.
주어진 채팅방 대화 로그를 분석해서 방장이 빠르게 파악할 수 있도록 한국어로 정리한다.
반드시 아래 JSON 스키마에 맞는 JSON 객체 하나만 출력한다. 다른 텍스트는 절대 출력하지 마라.

{
  "summary": "전체 대화의 핵심을 3~5문장으로 요약 (한국어)",
  "keyTopics": ["대화에서 다뤄진 핵심 주제들 (3~7개)"],
  "actionItems": [
    {
      "task": "방장 또는 멤버가 후속으로 해야 할 구체적인 할 일",
      "assignee": "담당자 이름 (대화에서 추정 가능하면, 아니면 null)",
      "priority": "high | medium | low"
    }
  ],
  "openQuestions": ["대화 중 제기됐지만 아직 답이 정해지지 않은 질문/미결 사항"]
}

규칙:
- actionItems 는 실제로 행동이 필요한 항목만. 단순 잡담은 제외.
- 약속/일정/결정/요청 사항을 우선적으로 action item 으로 뽑는다.
- 내용이 부족하면 빈 배열을 사용하되, summary 는 항상 채운다.`;

function buildTranscript(messages: ChatMessage[], limit: number): string {
  const sliced = messages.slice(-limit);
  return sliced
    .map((m) => {
      const ts = m.timestamp ? `[${m.timestamp}] ` : "";
      const sender = m.sender || "보낸이없음";
      const text = (m.message || "").replace(/\s+/g, " ").trim();
      return `${ts}${sender}: ${text}`;
    })
    .join("\n");
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith("sk-...")) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY 가 설정되지 않았습니다. .env.local 파일에 키를 입력해주세요.",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "분석할 메시지가 없습니다. CSV를 다시 확인해주세요." },
        { status: 400 }
      );
    }

    const limit = resolveLimit(body?.limit);

    // 시스템 메시지(초대/퇴장 등)는 분석에서 제외
    const conversational = messages.filter((m) => !m.isSystem);
    const target = conversational.length > 0 ? conversational : messages;
    const transcript = buildTranscript(target, limit);

    const openai = new OpenAI({ apiKey });
    // 일부 최신 모델(gpt-5 / o 시리즈 등)은 temperature 커스텀 값을 지원하지 않아
    // 기본값(1)만 허용한다. 모든 모델과 호환되도록 temperature 는 지정하지 않는다.
    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `다음은 채팅방 대화 로그입니다. 분석해서 JSON 으로 정리해주세요.\n\n---\n${transcript}\n---`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsed: Partial<AnalysisResult>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI 응답을 파싱하지 못했습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    const analyzedCount = Math.min(target.length, limit);

    const safe: AnalysisResult = {
      summary: parsed.summary || "",
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      openQuestions: Array.isArray(parsed.openQuestions)
        ? parsed.openQuestions
        : [],
      analyzedCount,
      totalCount: messages.length,
    };

    return NextResponse.json(safe);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[analyze] 오류:", msg);
    return NextResponse.json(
      { error: `분석 중 오류가 발생했습니다: ${msg}` },
      { status: 500 }
    );
  }
}
