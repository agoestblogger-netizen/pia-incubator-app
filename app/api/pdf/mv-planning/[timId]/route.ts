import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  timInovator,
  charter,
  marketValidationPlan,
  mvpMappingFitur,
  mvpResourcesNeeded,
  rencanaValidasiMetrik,
  kanbanCard,
  anggotaTim,
} from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { MvPlanningPdfDocument, MvPlanningPdfData } from '@/lib/pdf/MvPlanningPdfDocument';

export const dynamic = 'force-dynamic';

const DEFAULT_MV_METRICS = [
  { validasi: 'Desirability', metrik: 'Kepuasan Pengguna MVP', unitUkuran: 'Skala 1-5 / CSAT', baseline: '0 / Eksisting', target: '≥4.0', threshold: '70% (≥2.8)', caraPengukuran: 'Survey pasca-penggunaan MVP & wawancara mendalam', pic: 'Project Owner', evidence: 'Rekap survey CSAT & quote pengguna' },
  { validasi: 'Desirability', metrik: 'Adopsi / Penggunaan Berulang', unitUkuran: '% active user', baseline: '0%', target: '≥60%', threshold: '70% (≥42%)', caraPengukuran: 'Tracking log aktivitas sistem / transaksi berulang', pic: 'Tech Lead / PO', evidence: 'Dashboard analitik pengguna & data transaksi' },
  { validasi: 'Desirability', metrik: 'Rekomendasi / Referral (NPS)', unitUkuran: 'NPS / % Rekomendasi', baseline: '0', target: 'NPS ≥+30 atau ≥70% Ya', threshold: '70%', caraPengukuran: 'Survey NPS / pertanyaan rekomendasi', pic: 'Project Owner', evidence: 'Hasil survey NPS & formulir feedback' },
  { validasi: 'Feasibility', metrik: 'Ketersediaan Sistem & Kelancaran Proses', unitUkuran: '% Uptime / SLA', baseline: '90%', target: '≥99% selama pilot', threshold: '70% (≥95%)', caraPengukuran: 'Monitoring server, log downtime, laporan helpdesk', pic: 'Tech Lead / DevOps', evidence: 'Log monitoring server & incident report' },
  { validasi: 'Feasibility', metrik: 'Waktu Proses / Response Time Solusi', unitUkuran: 'Detik / Menit', baseline: '15 menit (manual)', target: '≤2 menit', threshold: '70% (≤5 menit)', caraPengukuran: 'Pencatatan time-and-motion saat user menyelesaikan alur', pic: 'Scrum Master / Analyst', evidence: 'Hasil uji latency & catatan observasi waktu' },
  { validasi: 'Feasibility', metrik: 'Error / Issue Rate (Tingkat Kegagalan)', unitUkuran: '% transaksi gagal', baseline: '10%', target: '≤2%', threshold: '70% (≤5%)', caraPengukuran: 'Log error transaksi, pelaporan bug pengguna', pic: 'QA / Developer', evidence: 'Error log & issue tracker' },
  { validasi: 'Viability', metrik: 'Biaya Pengembangan & Operasional MVP', unitUkuran: 'Rupiah (Rp)', baseline: 'Estimasi RAB', target: '≤100% Realisasi vs Budget', threshold: '70% (≤110%)', caraPengukuran: 'Pencatatan realisasi pengeluaran vs anggaran inkubasi', pic: 'Project Owner / Finance', evidence: 'Laporan realisasi anggaran inkubasi' },
  { validasi: 'Viability', metrik: 'Potensi Revenue / Efisiensi Biaya', unitUkuran: 'Rp per periode / jam kerja', baseline: '0', target: 'Sesuai proyeksi model bisnis', threshold: '70%', caraPengukuran: 'Kalkulasi potensi pendapatan baru / jam kerja dihemat', pic: 'Project Owner / Analyst', evidence: 'Simulasi finansial & verifikasi dampak bisnis' },
  { validasi: 'Viability', metrik: 'ROI / Payback Period / Manfaat Finansial', unitUkuran: 'Bulan / Nilai ROI', baseline: '0', target: 'Layak secara komersial / operasional', threshold: '70%', caraPengukuran: 'Model analisa biaya-manfaat (cost-benefit analysis)', pic: 'Project Owner / Finance', evidence: 'Kajian kelayakan finansial akhir' },
];

const DEFAULT_RESOURCES = [
  { jenisResource: 'people_sme', label: 'People / SME' },
  { jenisResource: 'system_technology', label: 'System & Technology' },
  { jenisResource: 'data_access', label: 'Data & Access' },
  { jenisResource: 'budget_procurement', label: 'Budget & Procurement' },
  { jenisResource: 'operational_support', label: 'Operational Support' },
];

function formatDateIndo(d?: Date | string | null): string {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

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

    const [charterRow] = await db
      .select({ klasifikasiStrategisInovasi: charter.klasifikasiStrategisInovasi })
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    const [plan] = await db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    let mappingFiturList: any[] = [];
    let resourcesList: any[] = [];
    let metrikList: any[] = [];

    if (plan) {
      mappingFiturList = await db
        .select()
        .from(mvpMappingFitur)
        .where(eq(mvpMappingFitur.planId, plan.id));

      const dbResources = await db
        .select()
        .from(mvpResourcesNeeded)
        .where(eq(mvpResourcesNeeded.planId, plan.id));

      resourcesList = DEFAULT_RESOURCES.map((def) => {
        const found = dbResources.find((r) => r.jenisResource === def.jenisResource);
        return {
          jenisResource: def.jenisResource,
          label: def.label,
          kebutuhanSpesifik: found?.kebutuhanSpesifik || '-',
          ownerSumber: found?.ownerSumber || '-',
          statusKetersediaan: found?.statusKetersediaan || 'Belum',
          gapTindakLanjut: found?.gapTindakLanjut || '-',
        };
      });

      const dbMetrics = await db
        .select()
        .from(rencanaValidasiMetrik)
        .where(
          and(
            eq(rencanaValidasiMetrik.planId, plan.id),
            eq(rencanaValidasiMetrik.fase, 'market_validation')
          )
        );

      if (dbMetrics.length > 0) {
        metrikList = dbMetrics.map((m) => ({
          validasi: m.validasi || 'Desirability',
          metrik: m.metrik,
          unitUkuran: m.unitUkuran || '-',
          baseline: m.baseline || '-',
          target: m.target || '-',
          threshold: m.threshold || '70%',
          caraPengukuran: m.caraPengukuran || '-',
          pic: m.pic || '-',
          evidence: m.evidence || '-',
        }));
      } else {
        metrikList = DEFAULT_MV_METRICS;
      }
    } else {
      resourcesList = DEFAULT_RESOURCES.map((def) => ({
        jenisResource: def.jenisResource,
        label: def.label,
        kebutuhanSpesifik: '-',
        ownerSumber: '-',
        statusKetersediaan: 'Belum',
        gapTindakLanjut: '-',
      }));
      metrikList = DEFAULT_MV_METRICS;
    }

    // Fetch backlog cards for sprint table
    const cards = await db
      .select({
        judul: kanbanCard.judul,
        sprintNumber: kanbanCard.sprintNumber,
        suggestedSprintNumber: kanbanCard.suggestedSprintNumber,
        acceptanceCriteria: kanbanCard.acceptanceCriteria,
        dependencyRisiko: kanbanCard.dependencyRisiko,
        tanggalMulai: kanbanCard.tanggalMulai,
        tanggalSelesai: kanbanCard.tanggalSelesai,
        ownerNama: anggotaTim.nama,
      })
      .from(kanbanCard)
      .leftJoin(anggotaTim, eq(kanbanCard.ownerAnggotaId, anggotaTim.id))
      .where(eq(kanbanCard.timInovatorId, timId))
      .orderBy(asc(kanbanCard.urutan), asc(kanbanCard.sprintNumber));

    const sprintBacklogList = cards.map((c) => {
      const sp = c.sprintNumber || c.suggestedSprintNumber || 1;
      const tMulai = formatDateIndo(c.tanggalMulai);
      const tSelesai = formatDateIndo(c.tanggalSelesai);
      const periode = tMulai !== '-' && tSelesai !== '-' ? `${tMulai} - ${tSelesai}` : tMulai !== '-' ? tMulai : '-';

      return {
        sprintNumber: sp,
        periode,
        backlogTask: c.judul,
        outputCriteria: c.acceptanceCriteria || '-',
        owner: c.ownerNama || 'Tim Inovator',
        dependencyRisiko: c.dependencyRisiko || '-',
      };
    });

    const periodeStr =
      plan?.periodeReleaseMulai || plan?.periodeReleaseSelesai
        ? `${formatDateIndo(plan.periodeReleaseMulai)} s/d ${formatDateIndo(plan.periodeReleaseSelesai)}`
        : '-';

    const pdfData: MvPlanningPdfData = {
      namaProyekInovasi: tim.namaProyekInovasi || '-',
      klasifikasiInovasi: charterRow?.klasifikasiStrategisInovasi || 'BREAKTHROUGH',
      hasilCustomerValidation: plan?.hasilCustomerValidationRingkasan || '-',
      deskripsiMvp: plan?.deskripsiMvp || '-',
      mvpVersion: plan?.mvpVersion || 'MVP 1.0',
      fiturMvpDirilis: plan?.fiturMvpDirilis || '-',
      channelRelease: plan?.channelRelease || '-',
      periodeRelease: periodeStr,
      deskripsiProsesMvp: plan?.deskripsiProsesMvp || '-',
      dataDukungMvp: (plan?.dataDukungMvp as string[]) || [],

      mappingFiturList,
      targetEarlyAdopters: plan?.targetEarlyAdopters || '-',
      lokasiPilot: plan?.lokasiPilot || '-',
      daftarEarlyAdopters: plan?.daftarEarlyAdopters || '-',
      jumlahTargetPengguna: plan?.jumlahTargetPengguna || '-',
      batasanScopeMvp: plan?.batasanScopeMvp || '-',

      resourcesList,
      sprintBacklogList,
      metrikList,

      ttdDisusun: plan?.ttdDisusun as any,
      ttdDiperiksa: plan?.ttdDiperiksa as any,
      ttdDisetujui: plan?.ttdDisetujui as any,
    };

    const documentElement = React.createElement(MvPlanningPdfDocument, { data: pdfData });
    const buffer = await renderToBuffer(documentElement as any);

    const safeName = (tim.namaProyekInovasi || 'Tim')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50) || 'Tim';

    const filename = `Perencanaan-MarketValidation-${safeName}.pdf`;
    const filenameEncoded = encodeURIComponent(filename);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filenameEncoded}`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[PDF Export MV Planning] Error:', error);
    return new NextResponse(`Gagal membuat PDF: ${error.message}`, { status: 500 });
  }
}
