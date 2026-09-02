import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  timInovator,
  customerValidationPlan,
  customerValidationDimensiFeedback,
  rencanaValidasiMetrik,
  charter,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { CvPlanningPdfDocument, CvPlanningPdfData } from '@/lib/pdf/CvPlanningPdfDocument';

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

    const [charterRow] = await db
      .select({ klasifikasiStrategisInovasi: charter.klasifikasiStrategisInovasi })
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);

    const [plan] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);

    let dimensiRows: any[] = [];
    let metrikRows: any[] = [];

    if (plan) {
      dimensiRows = await db
        .select()
        .from(customerValidationDimensiFeedback)
        .where(eq(customerValidationDimensiFeedback.planId, plan.id));

      metrikRows = await db
        .select()
        .from(rencanaValidasiMetrik)
        .where(eq(rencanaValidasiMetrik.planId, plan.id));
    }

    const pdfData: CvPlanningPdfData = {
      namaProyekInovasi: tim.namaProyekInovasi || '-',
      klasifikasiInovasi: charterRow?.klasifikasiStrategisInovasi || 'BREAKTHROUGH',
      // Section A
      projectMission: plan?.projectMission,
      customerDanContext: plan?.customerDanContext,
      problemHypothesis: plan?.problemHypothesis,
      hmw: plan?.hmw,
      solutionHypothesis: plan?.solutionHypothesis,
      // Section B
      prototypeType: plan?.prototypeType,
      fiturAlurDiuji: plan?.fiturAlurDiuji,
      skenarioUserTesting: plan?.skenarioUserTesting,
      instrumenValidasi: plan?.instrumenValidasi,
      dataDukung: (plan?.dataDukung as string[]) || [],
      // Section C
      targetEarlyAdopters: plan?.targetEarlyAdopters,
      kriteriaSeleksi: plan?.kriteriaSeleksi,
      jumlahTargetResponden: plan?.jumlahTargetResponden,
      lokasiChannelTesting: plan?.lokasiChannelTesting,
      metodeRekrutmen: plan?.metodeRekrutmen,
      etikaPersetujuanData: plan?.etikaPersetujuanData,
      // Section D & E
      dimensiRows: dimensiRows,
      metrikRows: metrikRows,
      // Signatures
      ttdDisusun: plan?.ttdDisusun as any,
      ttdDiperiksa: plan?.ttdDiperiksa as any,
      ttdDisetujui: plan?.ttdDisetujui as any,
    };

    // Render PDF to buffer
    const documentElement = React.createElement(CvPlanningPdfDocument, { data: pdfData });
    const buffer = await renderToBuffer(documentElement as any);

    const safeName = (tim.namaProyekInovasi || 'Tim')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50) || 'Tim';
    const filename = `Perencanaan-CustomerValidation-${safeName}.pdf`;
    const filenameEncoded = encodeURIComponent(filename);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filenameEncoded}`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[PDF Export CV Planning] Error:', error);
    return new NextResponse(`Gagal membuat PDF: ${error.message}`, { status: 500 });
  }
}
