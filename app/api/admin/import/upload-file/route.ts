import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user, 'import.execute'))) {
    return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const proposalId = formData.get('proposalId') as string;
    const fileName = formData.get('fileName') as string;
    const file = formData.get('file') as File | null;

    if (!proposalId || !fileName || !file) {
      return NextResponse.json({ success: false, message: 'Parameter tidak lengkap.' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'dossier-lampiran');
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket('dossier-lampiran', { public: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `${proposalId}/${fileName}`;
    const contentType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

    const { error: uploadError } = await supabaseAdmin.storage
      .from('dossier-lampiran')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ success: false, message: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('dossier-lampiran')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData?.publicUrl || '',
      fileName,
      proposalId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
