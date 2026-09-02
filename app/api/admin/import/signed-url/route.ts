import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { proposalId, fileName } = body;

    if (!proposalId || !fileName) {
      return NextResponse.json(
        { success: false, message: 'Parameter proposalId dan fileName dibutuhkan.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Pastikan bucket dossier-lampiran ada
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === 'dossier-lampiran');
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket('dossier-lampiran', { public: true });
    }

    const storagePath = `${proposalId}/${fileName}`;

    // Buat signed upload URL dengan upsert: true
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('dossier-lampiran')
      .createSignedUploadUrl(storagePath, { upsert: true } as any);

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json(
        { success: false, message: signedError?.message || 'Gagal membuat signed upload URL.' },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('dossier-lampiran')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
      path: signedData.path,
      token: signedData.token,
      publicUrl: publicUrlData?.publicUrl || '',
      fileName,
      proposalId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
