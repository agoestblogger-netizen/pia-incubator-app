import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lpj, anggaranPengajuan, timInovator, LpjDetailPengajuan } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { LpjPdfDocument, LpjPdfData } from '@/lib/pdf/LpjPdfDocument';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ lpjId: string }> }
) {
  try {
    const { lpjId } = await context.params;

    const [lpjData] = await db
      .select()
      .from(lpj)
      .where(eq(lpj.id, lpjId))
      .limit(1);

    if (!lpjData) {
      return new NextResponse('Data LPJ tidak ditemukan.', { status: 404 });
    }

    const [anggaran] = await db
      .select()
      .from(anggaranPengajuan)
      .where(eq(anggaranPengajuan.id, lpjData.anggaranPengajuanId))
      .limit(1);

    let tim: any = null;
    if (anggaran) {
      const [foundTim] = await db
        .select()
        .from(timInovator)
        .where(eq(timInovator.id, anggaran.timInovatorId))
        .limit(1);
      tim = foundTim;
    }

    const d = (lpjData.detailLpj as LpjDetailPengajuan) || null;

    const pdfData: LpjPdfData = {
      namaProyekInovasi: tim?.namaProyekInovasi || d?.judulProyek || 'Proyek Inovasi',
      kategoriProyek: d?.kategoriProyek || tim?.kategoriPia || tim?.klasifikasiInovasi || '-',
      fase: anggaran?.fase || 'market_validation',
      tanggalKegiatanSelesai: lpjData.tanggalKegiatanSelesai,
      tanggalKirim: lpjData.tanggalKirim,
      status: lpjData.status,
      // Bagian A: Identitas
      namaPic: d?.namaPic || '-',
      unitKerjaPic: d?.unitKerjaPic || '-',
      noHpPic: d?.noHpPic || '-',
      // Bagian B: Informasi Inovasi
      judulProyek: d?.judulProyek || tim?.namaProyekInovasi || '-',
      // Bagian C: Ringkasan Penggunaan Anggaran
      items: d?.items || [],
      totalNominal: d?.totalNominal || 0,
      // Bagian D: Pernyataan & Pengesahan PIC
      pernyataanPic: d?.pernyataanPic || null,
    };

    const documentElement = React.createElement(LpjPdfDocument, { data: pdfData });
    const buffer = await renderToBuffer(documentElement as any);

    const safeName = (tim?.namaProyekInovasi || d?.judulProyek || 'Proyek')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'Proyek';

    let datePart = 'draft';
    try {
      if (lpjData.tanggalKirim) {
        datePart = new Date(lpjData.tanggalKirim).toISOString().slice(0, 10);
      }
    } catch {
      datePart = 'draft';
    }

    const filename = `LPJ-${safeName}-${datePart}.pdf`;
    const filenameEncoded = encodeURIComponent(filename);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filenameEncoded}`,
      },
    });
  } catch (error) {
    console.error('[GET /api/pdf/lpj/[lpjId]] Error generating PDF:', error);
    return new NextResponse('Gagal membuat dokumen PDF LPJ.', { status: 500 });
  }
}
