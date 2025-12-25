import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google"; // フォントを読み込み
import "./globals.css";
import Sidebar from "./components/Sidebar";

// 日本語フォントの設定
const notoSansJP = Noto_Sans_JP({ 
  subsets: ["latin"],
  weight: ["400", "500", "700"], // 通常、中太、太字を読み込む
});

export const metadata: Metadata = {
  title: "Auto Sales Bot",
  description: "AI Form Marketing SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* classNameにフォントを適用 */}
      <body className={notoSansJP.className}>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}