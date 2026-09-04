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
  timId: string
): Promise<boolean> {
  if (!user) return false;

  // 1. Admin selalu bypass
  const isAdmin = Boolean(
    user.globalRoles?.some((r: string) => ["super_admin", "admin_ic", "admin"].includes(r))
  );
  if (isAdmin) return true;

  // 2. Cek izin bypass (role terdaftar di phase_gate_bypass_role_config)
  const canBypass = await canUserBypassMarketValidationGate(user, timId);
  if (canBypass) return true;

  // 3. Cek apakah Innovation Charter tim ini sudah ditandatangani PO atau Coach (salah satu cukup)
  const [charterRow] = await db
    .select({
      ttdDisusun: charter.ttdDisusun,
      ttdDiperiksa: charter.ttdDiperiksa,
      ttdDisetujui: charter.ttdDisetujui,
    })
    .from(charter)
    .where(eq(charter.timInovatorId, timId))
    .limit(1);

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
  timId: string
): Promise<boolean> {
  if (!user) return false;

  // 1. Cek izin bypass (Admin selalu bypass, atau role terdaftar di phase_gate_bypass_role_config)
  const canBypass = await canUserBypassMarketValidationGate(user, timId);
  if (canBypass) return true;

  // 2. Cek apakah CV Report tim ini memiliki keputusan 'lanjut'
  const [cvPlan] = await db
    .select()
    .from(customerValidationPlan)
    .where(eq(customerValidationPlan.timInovatorId, timId))
    .limit(1);

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

export async function getTeamPhaseGateStatus(timId: string): Promise<PhaseGateStatus> {
  const [tim] = await db.select().from(timInovator).where(eq(timInovator.id, timId)).limit(1);

  // 1. Check Active Sprint
  const [activeSprintRow] = await db
    .select()
    .from(sprint)
    .where(and(eq(sprint.timInovatorId, timId), eq(sprint.status, "aktif")))
    .limit(1);

  // 2. Check Innovation Setup / Charter
  const [charterRow] = await db
    .select()
    .from(charter)
    .where(eq(charter.timInovatorId, timId))
    .limit(1);

  const isCharterFilled = Boolean(
    charterRow && (charterRow.projectMission || charterRow.problemWorthSolving || charterRow.ttdDisetujui)
  );

  const currentUser = await getCurrentUser();

  // 3. Check Customer Validation gate:
  // Condition: Innovation Charter sudah disetujui Promotor (ttdDisetujui tidak null/falsy) ATAU Admin
  const isCustomerValidationUnlocked = await isCustomerValidationUnlockedForUser(currentUser, timId);

  // 4. Check Market Validation gate:
  // Condition: customer_validation_report.keputusan === 'Lanjut ke Market Validation' or 'lanjut'
  // ATAU role user saat ini memiliki izin bypass gerbang fase di phase_gate_bypass_role_config
  const isMarketValidationUnlocked = await isMarketValidationUnlockedForUser(currentUser, timId);

  // 5. Check FMI & Governance gate:
  // Condition: market_validation_report.keputusan_go_nogo === 'Go ke FMI' or 'go_ke_fmi'
  const [mvPlan] = await db
    .select()
    .from(marketValidationPlan)
    .where(eq(marketValidationPlan.timInovatorId, timId))
    .limit(1);

  let isGovernanceUnlocked = false;
  if (mvPlan) {
    const [mvReport] = await db
      .select()
      .from(marketValidationReport)
      .where(eq(marketValidationReport.planId, mvPlan.id))
      .limit(1);

    if (
      mvReport &&
      mvReport.keputusanGoNogo &&
      (mvReport.keputusanGoNogo.toLowerCase().includes("go") || mvReport.keputusanGoNogo === "go_ke_fmi")
    ) {
      isGovernanceUnlocked = true;
    }
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
