import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "채팅방 분석 도우미",
  description: "채팅방 대화 CSV를 업로드하면 AI가 요약·핵심주제·액션아이템을 정리합니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
