import { describe, it, expect } from "vitest";
import { resolveLimit } from "./limit";

describe("resolveLimit", () => {
  it("허용값(100/300/500/1000)은 그대로 통과시킨다", () => {
    expect(resolveLimit(100)).toBe(100);
    expect(resolveLimit(300)).toBe(300);
    expect(resolveLimit(500)).toBe(500);
    expect(resolveLimit(1000)).toBe(1000);
    expect(resolveLimit("500")).toBe(500); // 문자열 숫자도 허용
  });

  it("허용값이 아닌 양수는 내림 처리하되 상한 1000 으로 제한한다", () => {
    expect(resolveLimit(250)).toBe(250);
    expect(resolveLimit(99.9)).toBe(99);
    expect(resolveLimit(5000)).toBe(1000);
  });

  it("0/음수/NaN/비숫자 문자열은 기본값 300 으로 떨어진다", () => {
    expect(resolveLimit(0)).toBe(300);
    expect(resolveLimit(-50)).toBe(300);
    expect(resolveLimit("abc")).toBe(300);
    expect(resolveLimit(null)).toBe(300);
    expect(resolveLimit(undefined)).toBe(300);
  });
});
