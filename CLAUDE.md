# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

채팅방 분석 도우미 (방장용 MVP) — 커뮤니티 방장이 채팅 내보내기 CSV를 업로드하면 LLM이 요약 · 핵심 주제 · 액션 아이템 · 미해결 질문을 돌려주는 단일 페이지 Next.js 앱이다. DB는 없으며, 업로드한 데이터는 메모리에서만 처리되고 저장되지 않는다.

UI와 LLM에 전달하는 모든 프롬프트는 한국어다. 사용자 노출 문자열이나 시스템 프롬프트를 수정할 때 이 점을 맞춰라.

## 명령어

```bash
npm install
copy .env.local.example .env.local   # 이후 OPENAI_API_KEY 입력 (PowerShell; Windows 저장소)
npm run dev            # http://localhost:3000
npm run build
npm start
npm run lint           # next lint — ⚠ 아직 ESLint 미설정: 첫 실행 시 대화형 설정 프롬프트가 뜬다 (자동화에선 멈춤). scripts/check.ps1 은 이 경우 lint 를 건너뛴다.
npm test               # vitest run (lib/*.test.ts)
npm run test:watch     # vitest watch
npm run test:coverage  # vitest run --coverage
```

테스트는 **vitest** 로 돌린다 (`lib/parseCsv.test.ts`, `lib/limit.test.ts`). 새 로직은 `lib/` 단위 테스트로 커버하라.

### 셸 / 작업 환경 (Windows)

- **셸 작업은 PowerShell 도구를 우선 사용하라.** 이 머신의 Git Bash 는 간헐적으로 치명 오류(`add_item ("\??\C:\Program Files\Git", "/") failed`)를 내며, Bash↔PowerShell 을 섞어 쓰면 시간이 샌다. (예외: `.claude/hooks/tdd-guard.sh` 는 의도적으로 bash 로 실행되는 훅이다.)
- 작업 디렉터리는 이미 프로젝트 루트다 — 매 명령마다 `cd`/`Set-Location` 로 절대 경로를 재입력하지 마라.
- 파일 수정 전 반드시 먼저 Read 하라 (Write/Edit 가 "File has not been read yet" 으로 실패하는 것을 방지).

### 명령 플레이북 (반복 작업 자동화)

| 용도 | 명령 |
| --- | --- |
| 검증 게이트 (lint→typecheck→test→build 일괄) | `pwsh scripts/check.ps1` 또는 `/validate` |
| `/api/analyze` 연동 스모크 (dev 기동→POST→계약 검증→정리) | `pwsh scripts/smoke.ps1 -Start` |
| 파서 수동 확인용 샘플 CSV | `scripts/sample-kakao.csv`, `scripts/sample-generic.csv` |
| add+commit(트레일러)+push | `/ship "커밋 메시지"` |

> `scripts/smoke.ps1` 은 과거에 임시 라우트(`app/api/_partest`)를 만들었다 지우던 일회성 연동 확인을 영구 대체한다. 다시 임시 라우트를 만들지 마라.

### 환경 변수 (`.env.local`)

| 변수 | 필수 | 기본값 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 예 | — |
| `OPENAI_MODEL` | 아니오 | `gpt-4o-mini` |

API 라우트는 키가 플레이스홀더(`sk-...`)로 남아 있으면 미설정으로 간주하고 한국어 에러 메시지와 함께 500을 반환한다.

## 아키텍처

데이터 흐름은 **클라이언트가 CSV 파싱 → API 라우트로 messages POST → 서버가 OpenAI 호출 → 대시보드 렌더링** 이다. 상세 내용(핵심 파일 연결 관계, 파서 동작, 유지해야 할 관례)은 아래 `@architecture.md`로 항상 로드된다. API 라우트 상세는 **`app/api/CLAUDE.md`** 를 참고하라 (해당 디렉터리 작업 시 자동 로드).

@architecture.md
