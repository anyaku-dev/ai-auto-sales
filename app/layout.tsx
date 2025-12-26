'use client'; // routerを使うために追加

import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { usePathname } from "next/navigation"; // 追加

const notoSansJP = Noto_Sans_JP({ 
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // サイドバーを表示させないパスのリスト
  const noSidebarPages = ["/login", "/signup", "/signup/complete"];
  const isNoSidebarPage = noSidebarPages.includes(pathname);

  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        {isNoSidebarPage ? (
          // ログイン・登録画面：サイドバーなし、全画面表示
          <div className="min-h-screen">
            {children}
          </div>
        ) : (
          // 管理画面：サイドバーあり
          <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  );
}