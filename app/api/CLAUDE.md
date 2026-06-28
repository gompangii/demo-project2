# CLAUDE.md — API

This file provides guidance to Claude Code (claude.ai/code) when working with code under `app/api/`.

서버사이드 API 라우트만 다룬다. 전체 아키텍처와 클라이언트/파서 내용은 루트 `CLAUDE.md`를 참고하라.

## `analyze/route.ts`

`runtime = "nodejs"` — 유일한 서버 코드이자 OpenAI 키가 사용되는 유일한 곳이다 (브라우저에 노출 안 됨).

요청/응답 계약:

- **입력**: `POST /api/analyze` 본문 `{ messages: ChatMessage[], limit: number }`.
- **출력**: `AnalysisResult` (요약 · 핵심 주제 · 액션 아이템 · 미해결 질문 + `analyzedCount` / `totalCount`).

처리 흐름:

1. 키 검증 — `OPENAI_API_KEY`가 없거나 플레이스홀더(`sk-...`)면 미설정으로 간주하고 한국어 에러와 함께 500 반환.
2. `isSystem` 메시지를 걸러내고 최근 `limit`개만 유지 (`buildTranscript`). `limit`은 `resolveLimit`으로 정규화한다 (허용값 `[100, 300, 500, 1000]`, 기본 300, 상한 1000).
3. 한국어 `SYSTEM_PROMPT`와 `response_format: { type: "json_object" }`로 `chat.completions.create` 호출.
4. 모델 JSON을 필드별로 `AnalysisResult`(`safe` 객체)로 재검증 — 잘못되거나 부분적인 응답이 와도 크래시 대신 빈 배열/빈 문자열로 안전 처리.

## 환경 변수

| 변수 | 필수 | 기본값 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 예 | — |
| `OPENAI_MODEL` | 아니오 | `gpt-4o-mini` |

## 유지해야 할 관례

- `temperature`는 의도적으로 OpenAI에 전달하지 **않는다**. 기본값만 허용하는 최신 모델(gpt-5 / o 시리즈)과 호환되도록 하기 위함이니 다시 추가하지 마라.
- 출력 스키마는 세 곳에 존재한다: 이 라우트의 `SYSTEM_PROMPT`, `safe` 검증, `@/lib/types`의 `AnalysisResult`. 항상 함께 동기화하라.
- OpenAI 키는 절대 클라이언트로 흘려보내지 마라. 외부 API 호출은 이 라우트 안에서만.
