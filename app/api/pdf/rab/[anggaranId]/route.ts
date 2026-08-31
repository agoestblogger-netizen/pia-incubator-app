import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anggaranPengajuan, timInovator, AnggaranDetailPengajuan } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { RabPdfDocument, RabPdfData } from '@/lib/pdf/RabPdfDocument';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ anggaranId: string }> }
) {
  try {
    const { anggaranId } = await context.params;

    const [anggaran] = await db
      .select()
      .from(anggaranPengajuan)
      .where(eq(anggaranPengajuan.id, anggaranId))
      .limit(1);

    if (!anggaran) {
      return new NextResponse('Data pengajuan anggaran tidak ditemukan.', { status: 404 });
    }

    const [tim] = await db
      .select()
      .from(timInovator)
      .where(eq(timInovator.id, anggaran.timInovatorId))
      .limit(1);

    const d = (anggaran.detailPengajuan as AnggaranDetailPengajuan) || null;

    const pdfData: RabPdfData = {
      namaProyekInovasi: tim?.namaProyekInovasi || d?.judulProyek || 'Proyek Inovasi',
      kategoriProyek: d?.kategoriProyek || tim?.kategoriPia || tim?.klasifikasiInovasi || '-',
      fase: anggaran.fase,
      tanggalPengajuan: anggaran.tanggalPengajuan,
      status: anggaran.status,
      // Bagian 1: Identitas
      namaPic: d?.namaPic || '-',
      unitKerjaPic: d?.unitKerjaPic || '-',
      noHpPic: d?.noHpPic || '-',
      // Bagian 2: Ringkasan Pengajuan Dana
      tujuanPenggunaan: d?.tujuanPenggunaan || '-',
      nominalDiajukan: anggaran.nominalDiajukan,
      // Bagian 3: Tujuan Aktivitas Inkubasi
      outputYangDiharapkan: d?.outputYangDiharapkan || '-',
      // Bagian 4: Tabel RAB
      rabItems: d?.rabItems || [],
      totalRab: d?.totalRab || anggaran.nominalDiajukan,
      // Bagian 5: Pengesahan
      pengesahanPic: d?.pengesahanPic || null,
      pengesahanApprover: d?.pengesahanApprover || null,
    };

    const documentElement = React.createElement(RabPdfDocument, { data: pdfData });
    const buffer = await renderToBuffer(documentElement as any);

    const safeName = (tim?.namaProyekInovasi || d?.judulProyek || 'Proyek')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'Proyek';

    let datePart = 'draft';
    try {
      if (anggaran.tanggalPengajuan) {
        datePart = new Date(anggaran.tanggalPengajuan).toISOString().slice(0, 10);
      }
    } catch {
      datePart = 'draft';
    }

    const filename = `RAB-${safeName}-${datePart}.pdf`;
    const filenameEncoded = encodeURIComponent(filename);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filenameEncoded}`,
      },
    });
  } catch (error) {
    console.error('[GET /api/pdf/rab/[anggaranId]] Error generating PDF:', error);
    return new NextResponse('Gagal membuat dokumen PDF RAB.', { status: 500 });
  }
}
