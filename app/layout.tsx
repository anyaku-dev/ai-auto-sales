'use client';

import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { usePathname } from "next/navigation";

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

  // ログイン・登録画面ではサイドバーを隠す
  const noSidebarPages = ["/login", "/signup", "/signup/complete"];
  const isNoSidebarPage = noSidebarPages.includes(pathname);

  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        {isNoSidebarPage ? (
          <main className="min-h-screen bg-[#F8FAFC]">
            {children}
          </main>
        ) : (
          <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}