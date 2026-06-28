# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

채팅방 분석 도우미 (방장용 MVP) — 커뮤니티 방장이 채팅 내보내기 CSV를 업로드하면 LLM이 요약 · 핵심 주제 · 액션 아이템 · 미해결 질문을 돌려주는 단일 페이지 Next.js 앱이다. DB는 없으며, 업로드한 데이터는 메모리에서만 처리되고 저장되지 않는다.

UI와 LLM에 전달하는 모든 프롬프트는 한국어다. 사용자 노출 문자열이나 시스템 프롬프트를 수정할 때 이 점을 맞춰라.

## 명령어

```bash
npm install
copy .env.local.example .env.local   # 이후 OPENAI_API_KEY 입력 (PowerShell; Windows 저장소)
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint     # next lint (ESLint)
```

테스트 프레임워크는 설정되어 있지 않다.

### 환경 변수 (`.env.local`)

| 변수 | 필수 | 기본값 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 예 | — |
| `OPENAI_MODEL` | 아니오 | `gpt-4o-mini` |

API 라우트는 키가 플레이스홀더(`sk-...`)로 남아 있으면 미설정으로 간주하고 한국어 에러 메시지와 함께 500을 반환한다.

## 아키텍처

데이터 흐름은 **클라이언트가 CSV 파싱 → API 라우트로 messages POST → 서버가 OpenAI 호출 → 대시보드 렌더링** 이다. 상세 내용(핵심 파일 연결 관계, 파서 동작, 유지해야 할 관례)은 아래 `@architecture.md`로 항상 로드된다. API 라우트 상세는 **`app/api/CLAUDE.md`** 를 참고하라 (해당 디렉터리 작업 시 자동 로드).

@architecture.md
