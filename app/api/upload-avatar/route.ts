// app/api/upload-avatar/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ownerId = formData.get('ownerId') as string;

    if (!file || !ownerId) {
      return NextResponse.json({ error: 'ファイルまたはIDが不足しています' }, { status: 400 });
    }

    // ファイル名をユニークにする（ownerId + タイムスタンプ）
    const fileExt = file.name.split('.').pop();
    const fileName = `${ownerId}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({ publicUrl });

  } catch (e: any) {
    console.error('Server Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}