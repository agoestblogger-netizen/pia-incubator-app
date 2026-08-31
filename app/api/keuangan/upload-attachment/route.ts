import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth/rbac';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Harap login terlebih dahulu.' },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const timId = formData.get('timId') as string;
    const file = formData.get('file') as File | null;

    if (!timId || !file) {
      return NextResponse.json(
        { success: false, message: 'Parameter tidak lengkap (timId dan file dibutuhkan).' },
        { status: 400 }
      );
    }

    const allowed = await hasPermission(user, 'anggaran.submit', timId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Anda tidak memiliki izin mengunggah bukti penggunaan anggaran di tim ini.' },
        { status: 403 }
      );
    }

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          message: `Format .${ext} tidak didukung. Tipe yang diizinkan: Gambar (jpg, png, webp), PDF, Word, atau Excel.`,
        },
        { status: 400 }
      );
    }

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `Ukuran file melebihi batas 15MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === 'task-attachments');
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket('task-attachments', { public: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `lpj/${timId}/${Date.now()}_${sanitized}`;
    const contentType = file.type || MIME_MAP[ext] || 'application/octet-stream';

    const { error: uploadError } = await supabaseAdmin.storage
      .from('task-attachments')
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      return NextResponse.json(
        { success: false, message: `Gagal upload ke storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('task-attachments')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData?.publicUrl || '',
      storagePath,
      fileName,
      fileType: contentType,
      fileSize: file.size,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
