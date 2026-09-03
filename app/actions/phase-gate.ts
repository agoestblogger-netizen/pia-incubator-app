"use server";

import { db } from "@/lib/db";
import {
  charter,
  customerValidationPlan,
  customerValidationReport,
  marketValidationPlan,
  marketValidationReport,
  sprint,
  timInovator,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";


import { getCurrentUser } from "@/lib/auth/rbac";
import { canUserBypassMarketValidationGate } from "@/app/actions/phase-gate-bypass";

export type PhaseGateStatus = {
  timId: string;
  namaTim: string;
  activeSprint: {
    id: string;
    nomorSprint: number;
    tanggalMulaiAktual: Date | null;
    status: string;
  } | null;
  gates: {
    overview: {
      unlocked: boolean;
      href: string;
      reason?: string;
    };
    innovationSetup: {
      unlocked: boolean;
      isFilled: boolean;
      href: string;
      reason?: string;
    };
    customerValidation: {
      unlocked: boolean;
      href: string;
      reason?: string;
    };
    marketValidation: {
      unlocked: boolean;
      href: string;
      reason?: string;
    };
    keuangan: {
      unlocked: boolean;
      href: string;
      reason?: string;
    };
    governance: {
      unlocked: boolean;
      href: string;
      reason?: string;
    };
  };
};

/**
 * Memeriksa apakah gerbang fase Customer Validation terbuka untuk user dan tim tertentu,
 * cukup salah satu dari PO (Disusun Oleh) atau Coach (Diperiksa Oleh) yang sudah menandatangani Charter,
 * atau tanda tangan Promotor (Disetujui Oleh), atau user adalah Admin IC.
 */
export async function isCustomerValidationUnlockedForUser(
  user: any | null,
  timId: string,
  existingCharterRow?: any
): Promise<boolean> {
  if (!user) return false;

  // 1. Admin selalu bypass
  const isAdmin = Boolean(
    user.globalRoles?.some((r: string) => ["super_admin", "admin_ic", "admin"].includes(r))
  );
  if (isAdmin) return true;

  // 2. Cek apakah Innovation Charter tim ini sudah ditandatangani PO atau Coach (salah satu cukup)
  let charterRow = existingCharterRow;
  if (charterRow === undefined) {
    const [row] = await db
      .select({
        ttdDisusun: charter.ttdDisusun,
        ttdDiperiksa: charter.ttdDiperiksa,
        ttdDisetujui: charter.ttdDisetujui,
      })
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1);
    charterRow = row;
  }

  if (!charterRow) return false;

  const isPoSigned = Boolean(
    charterRow.ttdDisusun &&
      ((charterRow.ttdDisusun as any).disetujui === true ||
        (charterRow.ttdDisusun as any).status === "approved" ||
        (charterRow.ttdDisusun as any).status === "signed")
  );

  const isCoachSigned = Boolean(
    charterRow.ttdDiperiksa &&
      ((charterRow.ttdDiperiksa as any).disetujui === true ||
        (charterRow.ttdDiperiksa as any).status === "approved" ||
        (charterRow.ttdDiperiksa as any).status === "signed")
  );

  const isPromotorSigned = Boolean(
    charterRow.ttdDisetujui &&
      ((charterRow.ttdDisetujui as any).disetujui === true ||
        (charterRow.ttdDisetujui as any).status === "approved" ||
        (charterRow.ttdDisetujui as any).status === "signed")
  );

  return isPoSigned || isCoachSigned || isPromotorSigned;
}

/**
 * Memeriksa apakah gerbang fase Market Validation terbuka untuk user dan tim tertentu,
 * baik karena keputusan Customer Validation sudah "lanjut", atau user memiliki izin bypass / Admin.
 */
export async function isMarketValidationUnlockedForUser(
  user: any | null,
  timId: string,
  existingCvPlan?: any
): Promise<boolean> {
  if (!user) return false;

  // 1. Cek izin bypass (Admin selalu bypass, atau role terdaftar di phase_gate_bypass_role_config)
  const canBypass = await canUserBypassMarketValidationGate(user, timId);
  if (canBypass) return true;

  // 2. Cek apakah CV Report tim ini memiliki keputusan 'lanjut'
  let cvPlan = existingCvPlan;
  if (cvPlan === undefined) {
    const [row] = await db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1);
    cvPlan = row;
  }

  if (cvPlan) {
    const [cvReport] = await db
      .select()
      .from(customerValidationReport)
      .where(eq(customerValidationReport.planId, cvPlan.id))
      .limit(1);

    if (
      cvReport &&
      cvReport.keputusan &&
      (cvReport.keputusan.toLowerCase().includes("lanjut") || cvReport.keputusan === "lanjut")
    ) {
      return true;
    }
  }

  return false;
}

export async function getTeamPhaseGateStatus(
  timId: string,
  existingTim?: any,
  existingUser?: any
): Promise<PhaseGateStatus> {
  // Batch 1: Query tim, sprint, charter, user, mvPlan, cvPlan secara paralel
  const [
    timRes,
    [activeSprintRow],
    [charterRow],
    currentUser,
    [mvPlan],
    [cvPlan],
  ] = await Promise.all([
    existingTim
      ? Promise.resolve([existingTim])
      : db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1),
    db
      .select()
      .from(sprint)
      .where(and(eq(sprint.timInovatorId, timId), eq(sprint.status, "aktif")))
      .limit(1),
    db
      .select()
      .from(charter)
      .where(eq(charter.timInovatorId, timId))
      .limit(1),
    existingUser !== undefined ? Promise.resolve(existingUser) : getCurrentUser(),
    db
      .select()
      .from(marketValidationPlan)
      .where(eq(marketValidationPlan.timInovatorId, timId))
      .limit(1),
    db
      .select()
      .from(customerValidationPlan)
      .where(eq(customerValidationPlan.timInovatorId, timId))
      .limit(1),
  ]);

  const tim = timRes[0];

  const isCharterFilled = Boolean(
    charterRow && (charterRow.projectMission || charterRow.problemWorthSolving || charterRow.ttdDisetujui)
  );

  // Batch 2: Cek gerbang Customer Validation, Market Validation, dan MV Report secara paralel
  const [isCustomerValidationUnlocked, isMarketValidationUnlocked, [mvReport]] = await Promise.all([
    isCustomerValidationUnlockedForUser(currentUser, timId, charterRow),
    isMarketValidationUnlockedForUser(currentUser, timId, cvPlan),
    mvPlan
      ? db
          .select()
          .from(marketValidationReport)
          .where(eq(marketValidationReport.planId, mvPlan.id))
          .limit(1)
      : Promise.resolve([]),
  ]);

  let isGovernanceUnlocked = false;
  if (
    mvReport &&
    mvReport.keputusanGoNogo &&
    (mvReport.keputusanGoNogo.toLowerCase().includes("go") || mvReport.keputusanGoNogo === "go_ke_fmi")
  ) {
    isGovernanceUnlocked = true;
  }

  return {
    timId,
    namaTim: tim?.namaProyekInovasi || "Tim Inovator",
    activeSprint: activeSprintRow
      ? {
          id: activeSprintRow.id,
          nomorSprint: activeSprintRow.nomorSprint,
          tanggalMulaiAktual: activeSprintRow.tanggalMulaiAktual,
          status: activeSprintRow.status,
        }
      : null,
    gates: {
      overview: {
        unlocked: true,
        href: `/tim/${timId}/overview`,
      },
      innovationSetup: {
        unlocked: true,
        isFilled: isCharterFilled,
        href: `/tim/${timId}/charter`,
      },
      customerValidation: {
        unlocked: isCustomerValidationUnlocked,
        href: `/tim/${timId}/customer-validation`,
        reason: isCustomerValidationUnlocked
          ? undefined
          : "Innovation Charter belum ditandatangani oleh Project Owner atau Innovation Coach. Menunggu tanda tangan PO atau Coach untuk membuka gerbang Customer Validation.",
      },
      marketValidation: {
        unlocked: isMarketValidationUnlocked,
        href: `/tim/${timId}/market-validation`,
        reason: isMarketValidationUnlocked
          ? undefined
          : "Menunggu keputusan 'Lanjut ke Market Validation' pada Laporan Customer Validation.",
      },
      keuangan: {
        unlocked: true,
        href: `/tim/${timId}/keuangan`,
      },
      governance: {
        unlocked: isGovernanceUnlocked,
        href: `/tim/${timId}/governance`,
        reason: isGovernanceUnlocked
          ? undefined
          : "Menunggu keputusan 'Go ke FMI' pada Laporan Market Validation.",
      },
    },
  };
}
