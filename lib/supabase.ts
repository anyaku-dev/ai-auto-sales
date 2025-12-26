import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ブラウザ全体で唯一のインスタンスを保持するための変数
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, // セッションを維持する
        autoRefreshToken: true, // トークンを自動更新する
        detectSessionInUrl: true, // URLからのセッション検知を有効にする
      },
    });
  }
  return supabaseInstance;
})();