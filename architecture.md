# 아키텍처

채팅방 분석 도우미의 코드 구조와 핵심 파일 연결 관계를 정리한다. 명령어·환경 변수 등 운영 정보는 루트 `CLAUDE.md`, API 라우트 상세는 `app/api/CLAUDE.md`를 참고하라.

## 데이터 흐름

**클라이언트가 CSV 파싱 → API 라우트로 messages POST → 서버가 OpenAI 호출 → 대시보드 렌더링**

실질적인 소스 파일은 세 개뿐이며, 이들이 어떻게 연결되는지 파악하는 것이 중요하다.

## 핵심 파일

- **`app/page.tsx`** (`"use client"`) — 전체 UI와 모든 상태 (전역 상태 라이브러리 없음). `FileReader`로 파일을 읽고 `Papa.parse(text, { header: false })`로 파싱한 뒤, 원시 행 배열을 `parseChatCsv`에 넘기고 `{ messages, limit }`을 `/api/analyze`로 POST 한다. 분석할 최근 메시지 수는 사용자가 선택한다 (`LIMIT_OPTIONS = [100, 300, 500, 1000]`).

- **`lib/parseCsv.ts`** — 포맷 자동 판별 CSV 파서. `parseChatCsv`는 먼저 `parseGenericCsv`(시간/이름/메시지에 대한 한·영 컬럼명 키워드 매칭)를 시도하고, `null`이면 `parseKakaoCsv`(카카오톡 내보내기 포맷: col0의 타임스탬프, 나머지의 `보낸이 : 내용`, 멀티라인 연속 행은 직전 메시지에 이어붙이고 날짜 구분선·시스템 행 처리)로 폴백한다. 둘 다 `finalize`를 거치며, 여기서 시스템이 아닌 발화자로부터 `participants`를 도출한다. 시스템 메시지(초대/퇴장 등)는 여기서 `isSystem`으로 **표시만** 하고 제거하지 않는다 — 필터링은 하류에서 일어난다.

- **`app/api/`** — 서버사이드 API 라우트 (OpenAI 호출). 상세 내용은 **`app/api/CLAUDE.md`** 참고. 클라이언트는 `/api/analyze`로 `{ messages, limit }`을 POST 하고 `AnalysisResult`를 받는다.

- **`lib/types.ts`** — 공유 타입 (`ChatMessage`, `ActionItem`, `AnalysisResult`, `ParsedChat`). `AnalysisResult` 형태는 시스템 프롬프트의 JSON 스키마, 라우트의 검증, 대시보드 렌더링 사이의 계약이다 — 셋을 함께 변경하라.

## 유지해야 할 관례

- 공유 모듈은 `@/*` 경로 별칭으로 임포트한다 (예: `@/lib/types`, `tsconfig.json`에 설정됨).
- 출력 스키마(`AnalysisResult`)는 세 곳(시스템 프롬프트, 라우트의 `safe` 검증, `lib/types.ts`)에 걸친 계약이다. 함께 변경하라 (`app/api/CLAUDE.md` 참고).
