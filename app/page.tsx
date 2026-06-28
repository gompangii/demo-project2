"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { parseChatCsv } from "@/lib/parseCsv";
import type { AnalysisResult, ParsedChat, Priority } from "@/lib/types";

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const LIMIT_OPTIONS = [100, 300, 500, 1000];

export default function Home() {
  const [parsed, setParsed] = useState<ParsedChat | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [limit, setLimit] = useState<number>(300);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function ingestCsvText(text: string, name: string) {
    const { data } = Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: false,
    });
    const result = parseChatCsv(data as string[][]);
    setParsed(result);
    setFileName(name);
    setResult(null);
    setError("");
    if (result.messages.length === 0) {
      setError("CSV에서 메시지를 찾지 못했습니다. 형식을 확인해주세요.");
    }
  }

  function readFile(file: File) {
    const isCsv =
      file.type === "text/csv" || /\.csv$/i.test(file.name);
    if (!isCsv) {
      setError("CSV 파일만 업로드할 수 있습니다. (.csv)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => ingestCsvText(String(reader.result || ""), file.name);
    reader.readAsText(file, "utf-8");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  async function loadSample() {
    try {
      const res = await fetch("/sample.csv");
      const text = await res.text();
      ingestCsvText(text, "sample.csv");
    } catch {
      setError("샘플 파일을 불러오지 못했습니다.");
    }
  }

  async function analyze() {
    if (!parsed || parsed.messages.length === 0) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: parsed.messages, limit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "분석에 실패했습니다.");
      } else {
        setResult(data as AnalysisResult);
      }
    } catch {
      setError("서버에 연결하지 못했습니다. 개발 서버가 실행 중인지 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setParsed(null);
    setResult(null);
    setError("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const realMessages = parsed?.messages.filter((m) => !m.isSystem) ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* 헤더 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          💬 채팅방 분석 도우미
        </h1>
        <p className="mt-2 text-slate-500">
          채팅방 대화 CSV를 올리면 AI가 <b>요약 · 핵심 주제 · 액션 아이템 · 미해결 질문</b>을
          정리해 드립니다. 방장님의 운영을 도와드려요.
        </p>
      </header>

      {/* 업로드 영역 */}
      <section className="card mb-8">
        {/* 드롭존 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
            isDragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-slate-300 bg-slate-50"
          }`}
        >
          <div className="text-3xl">📥</div>
          <p className="text-sm text-slate-500">
            CSV 파일을 여기로 <b>드래그 앤 드롭</b> 하거나 아래 버튼으로 선택하세요
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              CSV 파일 선택
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <button
              onClick={loadSample}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              샘플 불러오기
            </button>
          </div>
          {fileName && (
            <span className="text-sm text-slate-500">📄 {fileName}</span>
          )}
        </div>

        {/* 분석 옵션 + 실행 */}
        {parsed && (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                분석할 최근 메시지 수
              </label>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                {LIMIT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setLimit(n)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                      limit === n
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {n}개
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="text-sm font-medium text-slate-400 hover:text-slate-600"
              >
                초기화
              </button>
              <button
                onClick={analyze}
                disabled={loading || realMessages.length === 0}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "분석 중…" : "분석하기"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 미리보기 */}
        {parsed && parsed.messages.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
              <span>
                전체 메시지 <b className="text-slate-800">{parsed.messages.length}</b>개
              </span>
              <span>
                대화 메시지 <b className="text-slate-800">{realMessages.length}</b>개
              </span>
              <span>
                참여자 <b className="text-slate-800">{parsed.participants.length}</b>명
              </span>
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
              {parsed.messages.slice(0, 12).map((m, i) => (
                <div key={i} className="py-0.5">
                  <span className="font-medium text-indigo-600">{m.sender}</span>
                  <span className="text-slate-400">: </span>
                  <span className="text-slate-700">
                    {m.message.length > 80
                      ? m.message.slice(0, 80) + "…"
                      : m.message}
                  </span>
                </div>
              ))}
              {parsed.messages.length > 12 && (
                <div className="pt-1 text-xs text-slate-400">
                  …외 {parsed.messages.length - 12}개
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="card animate-pulse text-center text-slate-400">
          AI가 대화를 분석하고 있어요…
        </div>
      )}

      {/* 결과 대시보드 */}
      {result && !loading && (
        <section>
          {result.totalCount > result.analyzedCount && (
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              메시지가 많아 최근 {result.analyzedCount}개만 분석했습니다 (전체{" "}
              {result.totalCount}개).
            </p>
          )}

          {/* 상단 통계 카드 */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <StatCard label="대화 메시지" value={realMessages.length} suffix="개" />
            <StatCard
              label="참여자"
              value={parsed?.participants.length ?? 0}
              suffix="명"
            />
            <StatCard
              label="액션 아이템"
              value={result.actionItems.length}
              suffix="개"
              accent
            />
          </div>

          {/* 2컬럼 그리드 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* 요약 */}
            <div className="card md:col-span-2">
              <h3 className="mb-2 text-lg font-bold text-slate-900">📝 요약</h3>
              <p className="whitespace-pre-line leading-relaxed text-slate-700">
                {result.summary || "요약 결과가 없습니다."}
              </p>
            </div>

            {/* 액션 아이템 */}
            <div className="card">
              <h3 className="mb-3 text-lg font-bold text-slate-900">
                ✅ 액션 아이템
              </h3>
              {result.actionItems.length === 0 ? (
                <p className="text-sm text-slate-400">도출된 액션 아이템이 없습니다.</p>
              ) : (
                <ul className="space-y-3">
                  {result.actionItems.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-800">{a.task}</span>
                          <span className={`badge badge-${a.priority || "low"}`}>
                            {PRIORITY_LABEL[a.priority] || "낮음"}
                          </span>
                        </div>
                        {a.assignee && (
                          <div className="mt-0.5 text-xs text-slate-400">
                            담당: {a.assignee}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 핵심 주제 */}
            <div className="card">
              <h3 className="mb-3 text-lg font-bold text-slate-900">🏷️ 핵심 주제</h3>
              {result.keyTopics.length === 0 ? (
                <p className="text-sm text-slate-400">추출된 주제가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.keyTopics.map((t, i) => (
                    <span key={i} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 미해결 질문 */}
            <div className="card md:col-span-2">
              <h3 className="mb-3 text-lg font-bold text-slate-900">
                ❓ 미해결 질문
              </h3>
              {result.openQuestions.length === 0 ? (
                <p className="text-sm text-slate-400">미해결 질문이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {result.openQuestions.map((q, i) => (
                    <li key={i} className="flex gap-2 text-slate-700">
                      <span className="text-slate-400">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card text-center ${
        accent ? "border-emerald-200 bg-emerald-50" : ""
      }`}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div
        className={`mt-1 text-3xl font-bold ${
          accent ? "text-emerald-600" : "text-slate-900"
        }`}
      >
        {value}
        {suffix && <span className="ml-0.5 text-base font-medium">{suffix}</span>}
      </div>
    </div>
  );
}
