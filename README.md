# 💬 채팅방 분석 도우미 (방장용 MVP)

채팅방 대화 내보내기 CSV를 업로드하면, AI가 대화를 **요약**하고 **핵심 주제 · 액션 아이템 · 미해결 질문**을 정리해 주는 아주 단순한 프로토타입입니다. 커뮤니티 **방장(운영자)** 의 운영을 돕는 것이 목표입니다.

- 프레임워크: **Next.js (App Router) + TypeScript**
- 스타일: **Tailwind CSS** (대시보드형 결과 화면)
- AI: **OpenAI ChatGPT API** — API Route에서 **서버사이드로만** 호출 (키는 브라우저에 노출되지 않음)
- 데이터베이스: 없음 (업로드한 데이터는 저장하지 않고 메모리에서만 처리)

## 폴더 구조

```
demo_project2/
  app/
    page.tsx              # 메인 화면 (업로드 → 미리보기 → 분석 → 대시보드 결과)
    api/analyze/route.ts  # 서버사이드 OpenAI 호출
    layout.tsx, globals.css
  lib/
    parseCsv.ts           # CSV 파서 (카카오톡 포맷 + 일반 CSV 자동 인식)
    types.ts              # 공유 타입
  public/sample.csv       # 데모용 샘플 대화
```

## 실행 방법

```bash
npm install

# .env.local 준비 (PowerShell)
copy .env.local.example .env.local
# .env.local 을 열어 OPENAI_API_KEY 를 입력하세요

npm run dev                # http://localhost:3000
```

## 사용법

1. 브라우저에서 http://localhost:3000 접속
2. **샘플 불러오기** 클릭 또는 카카오톡 내보내기 CSV 업로드
3. 미리보기에서 메시지 수 · 참여자 확인
4. **분석하기** 클릭
5. 대시보드에서 요약 · 핵심 주제 · 액션 아이템 · 미해결 질문 확인

## 지원하는 CSV 형식

- **카카오톡 내보내기 CSV**: `시간, 보낸이 : 내용` 형태 (날짜 구분선·시스템 메시지·멀티라인 자동 처리)
- **일반 CSV**: `시간/이름/메시지`(또는 time/user/message 등) 헤더가 있는 표 형태 — 헤더를 자동 인식해 컬럼을 매핑

## 환경 변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API 키 (필수) | — |
| `OPENAI_MODEL` | 사용할 모델 | `gpt-4o-mini` |
