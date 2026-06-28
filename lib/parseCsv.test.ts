import { describe, it, expect } from "vitest";
import { parseChatCsv } from "./parseCsv";

const TS1 = "2024년 11월 18일 오후 4:47";
const TS2 = "2024년 11월 18일 오후 4:48";
const TS3 = "2024년 11월 19일 오후 4:47";

describe("parseChatCsv — 일반(제네릭) CSV", () => {
  it("한글 헤더(시간/이름/내용)를 컬럼 매핑한다", () => {
    const { messages, participants } = parseChatCsv([
      ["시간", "이름", "내용"],
      ["10:00", "철수", "안녕하세요"],
      ["10:01", "영희", "반가워요"],
    ]);

    expect(messages).toEqual([
      { timestamp: "10:00", sender: "철수", message: "안녕하세요", isSystem: false },
      { timestamp: "10:01", sender: "영희", message: "반가워요", isSystem: false },
    ]);
    expect(participants).toEqual(["철수", "영희"]);
  });

  it("영문 헤더(name/message)를 매핑하고, 시간 컬럼이 없으면 timestamp 는 undefined", () => {
    const { messages } = parseChatCsv([
      ["name", "message"],
      ["alice", "hello"],
      ["bob", "hi"],
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      timestamp: undefined,
      sender: "alice",
      message: "hello",
      isSystem: false,
    });
  });

  it("발신자가 비어 있으면 '이름없음' 으로 채운다", () => {
    const { messages } = parseChatCsv([
      ["name", "message"],
      ["", "내용만 있음"],
    ]);

    expect(messages[0].sender).toBe("이름없음");
    expect(messages[0].message).toBe("내용만 있음");
  });

  it("이름/메시지 컬럼을 못 찾으면 카카오 파서로 폴백한다", () => {
    // 헤더에 name/message 류 키워드가 없으므로 제네릭 파서는 null → 카카오 폴백
    const { messages, participants } = parseChatCsv([
      ["Column1", "Column2"],
      [TS1, "철수 : 안녕"],
    ]);

    expect(messages).toEqual([
      { timestamp: TS1, sender: "철수", message: "안녕", isSystem: false },
    ]);
    expect(participants).toEqual(["철수"]);
  });
});

describe("parseChatCsv — 카카오톡 내보내기 CSV", () => {
  it("'보낸이 : 내용' 행을 분리하고 timestamp 를 보존한다", () => {
    const { messages } = parseChatCsv([
      ["Column1"],
      [TS1, "철수 : 안녕하세요"],
    ]);

    expect(messages).toEqual([
      { timestamp: TS1, sender: "철수", message: "안녕하세요", isSystem: false },
    ]);
  });

  it("빈 col0 연속 행을 직전 메시지에 줄바꿈으로 이어붙인다", () => {
    const { messages } = parseChatCsv([
      ["Column1"],
      [TS1, "철수 : 첫줄"],
      ["", "둘째줄"],
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toBe("첫줄\n둘째줄");
  });

  it("타임스탬프가 아닌 연속 행을 직전 메시지에 이어붙인다", () => {
    const { messages } = parseChatCsv([
      [TS1, "철수 : 첫줄"],
      ["이어지는줄"],
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toBe("첫줄\n이어지는줄");
  });

  it("날짜 구분선(내용 없는 타임스탬프)은 이어붙이기 상태를 리셋한다", () => {
    const { messages } = parseChatCsv([
      [TS1, "철수 : 첫줄"],
      [TS3], // 날짜 구분선 → last 리셋
      ["이어지는줄"], // 붙을 대상이 없으므로 버려짐
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toBe("첫줄");
  });

  it("'보낸이 : 내용' 형태가 아닌 행은 시스템 메시지로 취급한다", () => {
    const { messages, participants } = parseChatCsv([
      [TS1, "오픈채팅방 공지사항입니다"],
    ]);

    expect(messages[0]).toEqual({
      timestamp: TS1,
      sender: "시스템",
      message: "오픈채팅방 공지사항입니다",
      isSystem: true,
    });
    expect(participants).toEqual([]); // 시스템 발신자는 participants 에서 제외
  });

  it("초대/퇴장 등 시스템 문구는 isSystem=true 이고 연속 이어붙이기를 끊는다", () => {
    const { messages, participants } = parseChatCsv([
      [TS1, "방장 : 철수님을 초대했습니다"],
      ["이어지는줄"], // 시스템 메시지 뒤이므로 붙지 않는다
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].isSystem).toBe(true);
    expect(messages[0].message).toBe("철수님을 초대했습니다");
    expect(participants).toEqual([]);
  });

  it("상단 메타데이터(제목/저장 날짜)와 Column1 헤더 행을 건너뛴다", () => {
    const { messages } = parseChatCsv([
      ["채팅방 제목"],
      ["저장한 날짜 : 2024년 11월 18일"],
      ["Column1", "Column2"],
      [TS1, "철수 : 안녕"],
    ]);

    expect(messages).toEqual([
      { timestamp: TS1, sender: "철수", message: "안녕", isSystem: false },
    ]);
  });

  it("participants 는 시스템 발신자를 제외하고 중복을 제거한다", () => {
    const { participants } = parseChatCsv([
      ["Column1"],
      [TS1, "철수 : 안녕"],
      [TS2, "영희 : 반가워"],
      [TS3, "철수 : 또 안녕"],
      [TS3, "방장 : 영희님이 나갔습니다"],
    ]);

    expect(participants).toEqual(["철수", "영희"]);
  });
});

describe("parseChatCsv — 빈 입력", () => {
  it("빈 행만 있으면 빈 결과를 돌려준다", () => {
    expect(parseChatCsv([["", ""], [""]])).toEqual({
      messages: [],
      participants: [],
    });
  });

  it("행이 전혀 없으면 빈 결과를 돌려준다", () => {
    expect(parseChatCsv([])).toEqual({ messages: [], participants: [] });
  });
});
