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

  // 3. Check Customer Validation gate:
  // Condition: Innovation Charter sudah disetujui Promotor (ttdDisetujui tidak null/falsy).
  const charterApproval = charterRow?.ttdDisetujui as any;
  const isCustomerValidationUnlocked = Boolean(
    charterApproval && (charterApproval.disetujui === true || charterApproval.status === 'approved')
  );


  // 4. Check Market Validation gate:
  // Condition: customer_validation_report.keputusan === 'Lanjut ke Market Validation' or 'lanjut'
  // ATAU role user saat ini memiliki izin bypass gerbang fase di phase_gate_bypass_role_config
  const currentUser = await getCurrentUser();
  const canBypassMvGate = await canUserBypassMarketValidationGate(currentUser, timId);

  const [cvPlan] = await db
    .select()
    .from(customerValidationPlan)
    .where(eq(customerValidationPlan.timInovatorId, timId))
    .limit(1);

  let isMarketValidationUnlocked = canBypassMvGate;
  if (!isMarketValidationUnlocked && cvPlan) {
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
      isMarketValidationUnlocked = true;
    }
  }

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
          : "Innovation Charter belum disetujui oleh Promotor Inovasi. Minta Promotor untuk memberikan persetujuan formal di halaman Innovation Charter.",
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
