import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlgoNote — 알고리즘 풀이 기록 자동화",
  description:
    "프로그래머스 문제 URL을 입력하면 마크다운 풀이 기록을 만들어 GitHub 레포에 커밋합니다.",
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
