import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  timInovator,
  customerValidationPlan,
  customerValidationReport,
  customerTestingFeedbackResponden,
  hasilValidasiMetrik,
  rencanaValidasiMetrik,
  customerValidationTemuanKualitatif,
  anggotaTim,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { CvReportPdfDocument, CvReportPdfData } from '@/lib/pdf/CvReportPdfDocument';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ timId: string }> }
) {
  try {
    const { timId } = await context.params;

    const [tim] = await db
      .select()
      .from(timInovator)
      .where(eq(timInovator.id, timId))
      .limit(1);

    if (!tim) {
      return new NextResponse('Tim inovator tidak ditemukan.', { status: 404 });
    }

    const [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    let report: any = null;
    let feedbackRespondenList: any[] = [];
    let metrikHasilList: any[] = [];
    let temuanKualitatifList: any[] = [];
    let metrikRencanaRows: any[] = [];

    if (plan) {
      [report] = await db
        .select()
        .from(customerValidationReport)
        .where(eq(customerValidationReport.planId, plan.id))
        .limit(1);

      metrikRencanaRows = await db
        .select()
        .from(rencanaValidasiMetrik)
        .where(eq(rencanaValidasiMetrik.planId, plan.id));
    }

    if (report) {
      feedbackRespondenList = await db
        .select()
        .from(customerTestingFeedbackResponden)
        .where(eq(customerTestingFeedbackResponden.reportId, report.id));

      metrikHasilList = await db
        .select()
        .from(hasilValidasiMetrik)
        .where(
          and(
            eq(hasilValidasiMetrik.reportId, report.id),
            eq(hasilValidasiMetrik.fase, 'customer_validation')
          )
        );

      temuanKualitatifList = await db
        .select()
        .from(customerValidationTemuanKualitatif)
        .where(eq(customerValidationTemuanKualitatif.reportId, report.id));
    }

    // 7 Metrik Resmi Juklak PIA
    const METRIK_OFFICIAL = [
      {
        validasi: 'Desirability',
        metrik: 'Kepuasan Pengguna',
        kriteria: 'Rata-rata ≥4 atau target lain yang disepakati',
      },
      {
        validasi: 'Desirability',
        metrik: 'Ketertarikan Penggunaan Berulang',
        kriteria: 'Mayoritas minimal "Sering" atau target lain yang disepakati',
      },
      {
        validasi: 'Desirability',
        metrik: 'Rekomendasi kepada Orang Lain',
        kriteria: 'Mayoritas minimal "Mungkin"',
      },
      {
        validasi: 'Desirability',
        metrik: 'Kejelasan dan Kemudahan Penggunaan',
        kriteria: 'Rata-rata ≥4 atau mayoritas "Mudah"',
      },
      {
        validasi: 'Desirability',
        metrik: 'Kesediaan Membayar / Menggunakan',
        kriteria: 'Mayoritas bersedia membayar/menggunakan sesuai konteks inovasi',
      },
      {
        validasi: 'Feasibility On Paper',
        metrik: 'Kelayakan teknis/operasional awal',
        kriteria: 'Tidak ada blocker kritis sebelum MVP',
      },
      {
        validasi: 'Viability On Paper',
        metrik: 'Potensi dampak bisnis/ekonomi awal',
        kriteria: 'Terdapat potensi manfaat dan asumsi yang dapat diuji saat MVP',
      },
    ];

    const normalizeValidasi = (val: string): string => {
      if (!val) return 'Desirability';
      const v = val.toLowerCase().trim();
      if (v.includes('desir')) return 'Desirability';
      if (v.includes('feas')) return 'Feasibility On Paper';
      if (v.includes('viab')) return 'Viability On Paper';
      return val;
    };

    let mappedMetrikHasil: any[] = [];
    if (metrikRencanaRows && metrikRencanaRows.length > 0) {
      mappedMetrikHasil = metrikRencanaRows.map((r) => {
        const found = metrikHasilList.find((h) => {
          const hMetrik = (h.metrik || '').toLowerCase().trim();
          const rMetrik = (r.metrik || '').toLowerCase().trim();
          return (
            hMetrik === rMetrik ||
            (rMetrik.startsWith('kesediaan membayar') && hMetrik.startsWith('kesediaan membayar'))
          );
        });
        return {
          validasi: normalizeValidasi(r.validasi),
          metrik: r.metrik,
          target: r.kriteriaKesuksesan || found?.target || '-',
          hasilAktual: found?.hasilAktual || '',
          interpretasi: found?.interpretasi || '',
          learning: found?.learning || '',
          enhancement: found?.enhancement || '',
        };
      });
    } else {
      mappedMetrikHasil = METRIK_OFFICIAL.map((m) => {
        const found = metrikHasilList.find((h) => h.metrik === m.metrik);
        return {
          validasi: m.validasi,
          metrik: m.metrik,
          target: found?.target || m.kriteria,
          hasilAktual: found?.hasilAktual || '',
          interpretasi: found?.interpretasi || '',
          learning: found?.learning || '',
          enhancement: found?.enhancement || '',
        };
      });
    }

    // Role charter names fallback
    const members = await db
      .select()
      .from(anggotaTim)
      .where(eq(anggotaTim.timInovatorId, timId));

    const inisiatorName =
      members.find((a) => a.jabatan?.toLowerCase().includes('inisiator'))?.nama || undefined;
    const coachName =
      members.find((a) => a.jabatan?.toLowerCase().includes('coach'))?.nama || undefined;
    const poName =
      members.find((a) => a.jabatan?.toLowerCase().includes('owner') || a.jabatan?.toLowerCase().includes('po'))?.nama || undefined;

    const pdfData: CvReportPdfData = {
      namaTim: tim.namaProyekInovasi || 'Tim Inovasi',
      namaProyek: tim.namaProyekInovasi || 'Proyek Inovasi',
      tanggalCetak: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      // Section A
      projectMission: plan?.projectMission || undefined,
      customerDanContext: plan?.customerDanContext || undefined,
      problemHypothesis: plan?.problemHypothesis || undefined,
      hmw: plan?.hmw || undefined,
      validatedSolution: report?.validatedSolution || undefined,
      valueProposition: report?.valueProposition || undefined,
      fiturKunci1: report?.fiturKunci1 || undefined,
      fiturKunci2: report?.fiturKunci2 || undefined,
      fiturKunci3: report?.fiturKunci3 || undefined,
      flowSolusi: report?.flowSolusi || undefined,
      // Section B
      prototypeSolusiLink: report?.prototypeSolusiLink || undefined,
      mekanismeUserTesting: report?.mekanismeUserTesting || undefined,
      tanggalLokasiTesting: report?.tanggalLokasiTesting || undefined,
      jumlahRespondenAktual: report?.jumlahRespondenAktual ?? undefined,
      profilRespondenAktual: report?.profilRespondenAktual || undefined,
      // Section C
      feedbackRespondenList,
      // Section D
      metrikHasilList: mappedMetrikHasil,
      // Section E
      temuanKualitatifList,
      // Section F
      kesimpulan: report?.kesimpulan || undefined,
      ketercapaianPsf: report?.ketercapaianPsf || undefined,
      keputusan: report?.keputusan || undefined,
      catatanMvpPlanning: report?.catatanMvpPlanning || undefined,
      buktiPendukung: typeof report?.buktiPendukung === 'string' ? report.buktiPendukung : undefined,
      catatanReviewSme: (report?.catatanReviewSme as any[]) || (Array.isArray(report?.buktiPendukung) ? report.buktiPendukung : []),
      // Section G
      ttdDisusun: report?.ttdDisusun || plan?.ttdDisusun || undefined,
      ttdDiperiksa: report?.ttdDiperiksa || plan?.ttdDiperiksa || undefined,
      ttdDisetujui: report?.ttdDisetujui || plan?.ttdDisetujui || undefined,
      inisiatorCharterName: inisiatorName,
      coachCharterName: coachName,
      poCharterName: poName,
    };

    // Render PDF to buffer
    const documentElement = React.createElement(CvReportPdfDocument, { data: pdfData });
    const buffer = await renderToBuffer(documentElement as any);

    const safeName = (tim.namaProyekInovasi || 'Tim')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50) || 'Tim';
    const filename = `Laporan-CustomerValidation-${safeName}.pdf`;
    const filenameEncoded = encodeURIComponent(filename);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filenameEncoded}`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[PDF Export CV Report] Error:', error);
    return new NextResponse(`Gagal membuat PDF Laporan CV: ${error.message}`, { status: 500 });
  }
}
