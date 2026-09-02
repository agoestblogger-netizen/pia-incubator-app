import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  timInovator,
  charter,
  sprint,
  kanbanCard,
  anggotaTim,
  users,
} from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import {
  CharterPdfDocument,
  CharterPdfData,
  RolePerson,
  BacklogItemPdf,
  SprintMilestonePdf,
} from '@/lib/pdf/CharterPdfDocument';
import { getCharterByTimId, getCharterRolesData } from '@/app/actions/charter';

export const dynamic = 'force-dynamic';

function formatDateRange(d1?: Date | string | null, d2?: Date | string | null): string {
  if (!d1 && !d2) return '-';
  const formatD = (d: Date | string) => {
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
  };

  if (d1 && d2) {
    return `${formatD(d1)} - ${formatD(d2)}`;
  }
  if (d1) return `Mulai: ${formatD(d1)}`;
  return `Target: ${formatD(d2!)}`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ timId: string }> }
) {
  try {
    const { timId } = await context.params;

    // 1. Fetch team
    const [tim] = await db
      .select()
      .from(timInovator)
      .where(eq(timInovator.id, timId))
      .limit(1);

    if (!tim) {
      return new NextResponse('Tim inovator tidak ditemukan.', { status: 404 });
    }

    // 2. Fetch charter & role assignments
    const [charterResult, rolesResult] = await Promise.all([
      getCharterByTimId(timId),
      getCharterRolesData(timId),
    ]);

    const c = charterResult.charter || {};
    const assignments = rolesResult?.assignments || [];
    const teamMembers = rolesResult?.anggotaTim || [];

    // Helper to extract RolePerson list for a given roleCode
    const getRolePersons = (roleCode: string): RolePerson[] => {
      const matched = assignments.filter((a: any) => a.roleCode === roleCode && (a.userName || a.userId));
      if (matched.length === 0) return [];
      return matched.map((a: any) => {
        const ang = teamMembers.find((m: any) => m.userId === a.userId || m.nama === a.userName);
        return {
          nama: a.userName || 'Anggota Tim',
          jabatan: ang?.jabatan || a.jabatan || '',
          unitKerja: ang?.unitKerja || a.unitKerja || '',
          komitmenDukungan: ang?.komitmenDukungan || null,
        };
      });
    };

    const rolesMap = {
      sponsor: getRolePersons('sponsor'),
      promotor: getRolePersons('promotor'),
      projectOwner: getRolePersons('project_owner'),
      inisiator: getRolePersons('inisiator'),
      coCreators: getRolePersons('co_creator'),
      coach: getRolePersons('coach'),
      sme: getRolePersons('sme'),
    };

    // 3. Fetch Sprints
    const sprintRows = await db
      .select()
      .from(sprint)
      .where(eq(sprint.timInovatorId, timId))
      .orderBy(asc(sprint.nomorSprint));

    const sprintMilestones: SprintMilestonePdf[] = sprintRows.map((s) => ({
      nomorSprint: s.nomorSprint,
      tujuan: s.tujuan || s.sprintGoal || '',
      tanggalMulaiRencana: s.tanggalMulaiRencana
        ? new Date(s.tanggalMulaiRencana).toISOString().split('T')[0]
        : null,
      tanggalSelesaiRencana: s.tanggalSelesaiRencana
        ? new Date(s.tanggalSelesaiRencana).toISOString().split('T')[0]
        : null,
    }));

    // 4. Fetch Backlog (Kanban Cards)
    const cards = await db
      .select({
        id: kanbanCard.id,
        judul: kanbanCard.judul,
        deskripsi: kanbanCard.deskripsi,
        sprintNumber: kanbanCard.sprintNumber,
        suggestedSprintNumber: kanbanCard.suggestedSprintNumber,
        acceptanceCriteria: kanbanCard.acceptanceCriteria,
        dependencyRisiko: kanbanCard.dependencyRisiko,
        tanggalMulai: kanbanCard.tanggalMulai,
        tanggalSelesai: kanbanCard.tanggalSelesai,
        ownerAnggotaId: kanbanCard.ownerAnggotaId,
        ownerNama: anggotaTim.nama,
      })
      .from(kanbanCard)
      .leftJoin(anggotaTim, eq(kanbanCard.ownerAnggotaId, anggotaTim.id))
      .where(eq(kanbanCard.timInovatorId, timId))
      .orderBy(asc(kanbanCard.urutan), asc(kanbanCard.sprintNumber));

    const backlogList: BacklogItemPdf[] = cards.map((card) => ({
      judul: card.judul,
      deskripsi: card.deskripsi,
      sprintNumber: card.sprintNumber || card.suggestedSprintNumber || 1,
      acceptanceCriteria: card.acceptanceCriteria,
      ownerName: card.ownerNama || null,
      dependencyRisiko: card.dependencyRisiko,
      timeline: formatDateRange(card.tanggalMulai, card.tanggalSelesai),
    }));

    // 5. Signatures mapping
    // Promotor signature
    let ttdDisetujui = c.ttdDisetujui;
    if (!ttdDisetujui && rolesMap.promotor.length > 0) {
      ttdDisetujui = {
        nama: rolesMap.promotor[0].nama,
        jabatan: rolesMap.promotor[0].jabatan || 'Promotor Inovasi',
        unit: rolesMap.promotor[0].unitKerja || 'PT Pegadaian (Persero)',
        status: 'pending',
      };
    }

    // PO signature
    let ttdDisusun = c.ttdDisusun;
    if (!ttdDisusun && rolesMap.projectOwner.length > 0) {
      ttdDisusun = {
        nama: rolesMap.projectOwner[0].nama,
        jabatan: rolesMap.projectOwner[0].jabatan || 'Project Owner',
        unit: rolesMap.projectOwner[0].unitKerja || 'PT Pegadaian (Persero)',
        status: 'pending',
      };
    }

    // Coach signature
    let ttdDiperiksa = c.ttdDiperiksa;
    if (!ttdDiperiksa && rolesMap.coach.length > 0) {
      ttdDiperiksa = {
        nama: rolesMap.coach[0].nama,
        jabatan: rolesMap.coach[0].jabatan || 'Innovation Coach',
        unit: rolesMap.coach[0].unitKerja || 'PT Pegadaian (Persero)',
        status: 'pending',
      };
    }

    const pdfData: CharterPdfData = {
      namaProyekInovasi: tim.namaProyekInovasi || 'Proyek Inovasi',
      kategoriPia: tim.kategoriPia || tim.seasonAsli || 'Season 12',
      klasifikasiInovasi: c.klasifikasiStrategisInovasi || 'BREAKTHROUGH',
      projectMission: c.projectMission,
      customerEarlyAdopters: c.customerEarlyAdopters,
      contextAreaBantuan: c.contextAreaBantuan,
      problemWorthSolving: c.problemWorthSolving,
      hmw: c.hmw,
      opportunityStatement: c.opportunityStatement,
      businessOpportunity: c.businessOpportunity,
      solusiAwal: c.solusiAwal,
      desirabilityHypothesis: c.desirabilityHypothesis,
      feasibilityHypothesis: c.feasibilityHypothesis,
      viabilityHypothesis: c.viabilityHypothesis,
      linkProposal: c.linkProposal,

      // Section 1 Roles
      roles: rolesMap,

      // Section 2 Team Agreement & Milestones
      ritmeKerja: c.ritmeKerja,
      sprintMilestones,
      pacingMonitoring: c.pacingMonitoring,
      kebutuhanDukungan: c.kebutuhanDukungan,
      risikoAwal: c.risikoAwal,

      // Section 3 Backlog
      backlogList,

      // Signatures
      ttdDisusun,
      ttdDiperiksa,
      ttdDisetujui,
    };

    // Render PDF to buffer
    const documentElement = React.createElement(CharterPdfDocument, { data: pdfData });
    const buffer = await renderToBuffer(documentElement as any);

    const safeName = (tim.namaProyekInovasi || 'Tim')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50) || 'Tim';
    const filename = `Innovation-Charter-${safeName}.pdf`;
    const filenameEncoded = encodeURIComponent(filename);

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filenameEncoded}`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[PDF Export Innovation Charter] Error:', error);
    return new NextResponse(
      JSON.stringify({ error: `Gagal membuat PDF Innovation Charter: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
