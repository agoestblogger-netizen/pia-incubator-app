import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  timInovator,
  marketValidationPlan,
  marketValidationReport,
  mvReleaseLog,
  hasilValidasiMetrik,
  dfvRekapitulasi,
  sprintReview,
  kanbanCard,
} from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { MvReportPdfDocument } from '@/lib/pdf/MvReportPdfDocument';

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
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1);

    let report: any = null;
    let releaseLogs: any[] = [];
    let hasilMetrik: any[] = [];
    let dfvList: any[] = [];

    if (plan) {
      [report] = await db
        .select()
        .from(marketValidationReport)
        .where(eq(marketValidationReport.planId, plan.id))
        .limit(1);
    }

    if (report) {
      releaseLogs = await db
        .select()
        .from(mvReleaseLog)
        .where(eq(mvReleaseLog.reportId, report.id))
        .orderBy(asc(mvReleaseLog.tanggal));

      hasilMetrik = await db
        .select()
        .from(hasilValidasiMetrik)
        .where(
          and(
            eq(hasilValidasiMetrik.reportId, report.id),
            eq(hasilValidasiMetrik.fase, 'market_validation')
          )
        );

      dfvList = await db
        .select()
        .from(dfvRekapitulasi)
        .where(eq(dfvRekapitulasi.reportId, report.id));
    }

    // Ambil Sprint Reviews
    const sprintReviews = await db
      .select()
      .from(sprintReview)
      .where(eq(sprintReview.timInovatorId, timId))
      .orderBy(asc(sprintReview.sprintNumber));

    // Ambil Kanban cards
    const allTeamCards = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.timInovatorId, timId))
      .orderBy(asc(kanbanCard.urutan));

    // Render PDF buffer
    const documentElement = React.createElement(MvReportPdfDocument, {
      tim: {
        namaTim: tim.namaProyekInovasi || 'Tim Inovasi',
        namaProyekInovasi: tim.namaProyekInovasi,
        kategoriPia: tim.kategoriPia,
        klasifikasiInovasi: tim.klasifikasiInovasi || tim.kategoriPia || 'Incremental Innovation',
      },
      plan,
      report,
      releaseLogs,
      hasilMetrik,
      dfvRekapitulasi: dfvList,
      sprintReviews,
      allTeamCards,
    });

    const pdfBuffer = await renderToBuffer(documentElement as any);

    const safeTimName = (tim.namaProyekInovasi || 'Tim')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const filename = `Laporan_Market_Validation_${safeTimName}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/pdf/mv-report/[timId]] Error generating PDF:', error);
    return new NextResponse(
      `Gagal menghasilkan dokumen PDF Laporan Market Validation: ${error.message}`,
      { status: 500 }
    );
  }
}
