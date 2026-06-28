// 분석할 최근 메시지 수 정규화 유틸
//
// 사용자가 100/300/500/1000 중 선택하지만, 임의 값이 들어와도 안전하게 처리한다.
// (Next.js route 파일은 HTTP 메서드 외 export 를 허용하지 않아 이 로직은 별도 모듈로 둔다.)

export const ALLOWED_LIMITS = [100, 300, 500, 1000];
export const DEFAULT_LIMIT = 300;
export const MAX_LIMIT = 1000;

export function resolveLimit(raw: unknown): number {
  const n = Number(raw);
  if (ALLOWED_LIMITS.includes(n)) return n;
  if (Number.isFinite(n) && n > 0) return Math.min(Math.floor(n), MAX_LIMIT);
  return DEFAULT_LIMIT;
}
