// CSV → { messages, participants } 파서
//
// 입력: papaparse 가 header:false 로 파싱한 행 배열 (각 행은 셀 문자열 배열)
// 두 가지 입력을 모두 처리한다.
//   1) 카카오톡 내보내기 CSV  (Column1.. 헤더, "시간, 보낸이 : 내용" 행)
//   2) 일반 CSV              (시간/이름/메시지 류 헤더가 있는 표 형태)
//
// 출력: { messages, participants }
//   - messages: [{ timestamp, sender, message, isSystem }]
//   - participants: 시스템 메시지를 제외한 실제 발화자 목록

import type { ChatMessage, ParsedChat } from "./types";

type Row = (string | null | undefined)[];

// 카카오톡 타임스탬프: "2024년 11월 18일 오후 4:47"
const TIMESTAMP_RE =
  /^\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(오전|오후)\s*\d{1,2}:\d{2}$/;

const SYSTEM_RE =
  /(초대했습니다|나갔습니다|내보냈습니다|들어왔습니다|입장했습니다|퇴장했습니다|방장으로)/;

// 일반 CSV 헤더 컬럼 추정용 키워드
const TIME_KEYS = ["time", "date", "timestamp", "datetime", "시간", "날짜", "일시"];
const NAME_KEYS = ["name", "user", "sender", "author", "nick", "이름", "보낸이", "작성자", "닉네임"];
const MSG_KEYS = ["message", "msg", "text", "content", "body", "메시지", "내용", "본문", "대화"];

function cell(row: Row, i: number): string {
  const v = row[i];
  return v == null ? "" : String(v).trim();
}

// 셀 배열을 하나의 문자열로 합침. 끝쪽 빈 셀(패딩 콤마) 제거.
function joinCells(cells: Row): string {
  const arr = cells.map((c) => (c == null ? "" : String(c)));
  while (arr.length && arr[arr.length - 1].trim() === "") arr.pop();
  return arr.join(",").trim();
}

function findKey(header: string[], keys: string[]): number {
  return header.findIndex((h) => {
    const norm = h.toLowerCase().trim();
    return keys.some((k) => norm.includes(k));
  });
}

// ── 일반 CSV 파서 (헤더 기반 컬럼 매핑) ──────────────────────────────
function parseGenericCsv(rows: Row[]): ParsedChat | null {
  // 첫 비어있지 않은 행을 헤더로 본다.
  const headerIdx = rows.findIndex((r) => joinCells(r) !== "");
  if (headerIdx === -1) return null;

  const header = rows[headerIdx].map((c) => (c == null ? "" : String(c)));
  const nameCol = findKey(header, NAME_KEYS);
  const msgCol = findKey(header, MSG_KEYS);

  // 이름/메시지 컬럼을 못 찾으면 일반 CSV 가 아님 → null 반환해 카카오 파서로 폴백
  if (nameCol === -1 || msgCol === -1) return null;

  const timeCol = findKey(header, TIME_KEYS);
  const messages: ChatMessage[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || joinCells(row) === "") continue;

    const sender = cell(row, nameCol);
    const message = cell(row, msgCol);
    if (!sender && !message) continue;

    messages.push({
      timestamp: timeCol !== -1 ? cell(row, timeCol) || undefined : undefined,
      sender: sender || "이름없음",
      message,
      isSystem: SYSTEM_RE.test(`${sender} ${message}`),
    });
  }

  if (messages.length === 0) return null;
  return finalize(messages);
}

// ── 카카오톡 내보내기 CSV 파서 ──────────────────────────────────────
function parseKakaoCsv(rows: Row[]): ParsedChat {
  const messages: ChatMessage[] = [];
  let last: ChatMessage | null = null; // 연속(멀티라인) 이어붙이기 대상

  for (const cells of rows) {
    if (!cells || cells.length === 0) continue;

    const col0 = cell(cells, 0);

    // 헤더 / 빈 col0 처리
    if (col0 === "Column1" || col0 === "") {
      const onlyRest = joinCells(cells.slice(1));
      if (col0 === "Column1") continue;
      if (col0 === "" && onlyRest && last) {
        last.message += "\n" + onlyRest;
      }
      continue;
    }

    if (TIMESTAMP_RE.test(col0)) {
      const rest = joinCells(cells.slice(1));

      // 날짜 구분선 (타임스탬프만 있고 내용 없음)
      if (!rest) {
        last = null;
        continue;
      }

      const sepIdx = rest.indexOf(" : ");
      if (sepIdx === -1) {
        // "보낸이 : 내용" 형태가 아님 → 시스템 메시지로 취급
        messages.push({
          timestamp: col0,
          sender: "시스템",
          message: rest,
          isSystem: true,
        });
        last = null;
        continue;
      }

      const sender = rest.slice(0, sepIdx).trim();
      const message = rest.slice(sepIdx + 3).trim();
      const isSystem = SYSTEM_RE.test(rest);

      const msg: ChatMessage = { timestamp: col0, sender, message, isSystem };
      messages.push(msg);
      last = isSystem ? null : msg;
    } else {
      // col0 가 타임스탬프가 아님 → 메타데이터(제목/저장날짜) 또는 연속 행
      const cont = joinCells(cells);
      if (last && cont) {
        last.message += "\n" + cont;
      }
      // last 가 없으면 상단 메타데이터로 보고 스킵
    }
  }

  return finalize(messages);
}

function finalize(messages: ChatMessage[]): ParsedChat {
  const participants = [
    ...new Set(messages.filter((m) => !m.isSystem).map((m) => m.sender)),
  ];
  return { messages, participants };
}

// ── 진입점: 포맷 자동 판별 ──────────────────────────────────────────
export function parseChatCsv(rows: Row[]): ParsedChat {
  // 먼저 일반 CSV(헤더 기반) 시도 → 실패 시 카카오 파서로 폴백
  const generic = parseGenericCsv(rows);
  if (generic) return generic;
  return parseKakaoCsv(rows);
}
