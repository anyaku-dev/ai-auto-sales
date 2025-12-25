import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner_id, package_name } = body;

    if (!owner_id || !package_name) {
      return NextResponse.json({ error: 'Parameters missing' }, { status: 400 });
    }

    const { data: targets, error } = await supabase
      .from('targets')
      .select('company_name, url, status, completed_at, result_log')
      .eq('owner_id', owner_id)
      .eq('package_name', package_name);

    if (error || !targets || targets.length === 0) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    // CSV作成 (BOM付きでExcel文字化け回避)
    const header = ['会社名', 'URL', 'ステータス', '完了日時', 'ログ詳細'].join(',') + '\n';
    const rows = targets.map(t => {
      const statusJP = t.status === 'completed' ? '送信成功' : t.status === 'error' ? 'エラー' : '未完了';
      const time = t.completed_at ? new Date(t.completed_at).toLocaleString('ja-JP') : '-';
      const cleanCompany = `"${(t.company_name || '').replace(/"/g, '""')}"`;
      const cleanUrl = `"${(t.url || '').replace(/"/g, '""')}"`;
      const cleanLog = `"${(JSON.stringify(t.result_log) || '').replace(/"/g, '""')}"`;
      
      return [cleanCompany, cleanUrl, statusJP, time, cleanLog].join(',');
    }).join('\n');

    const bom = '\uFEFF';
    const csvContent = bom + header + rows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(package_name)}_report.csv"`,
      },
    });

  } catch (e: any) {
    console.error('CSV Download Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}