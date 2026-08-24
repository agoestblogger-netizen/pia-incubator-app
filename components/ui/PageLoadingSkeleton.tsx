import React from 'react';
import { CenteredPageLoader } from './CenteredPageLoader';

interface PageLoadingSkeletonProps {
  variant?: 'dashboard' | 'dossier_list' | 'dossier_detail' | 'charter' | 'kanban' | 'keuangan' | 'table' | 'default';
  title?: string;
  subtitle?: string;
}

export function PageLoadingSkeleton({
  title,
}: PageLoadingSkeletonProps) {
  return <CenteredPageLoader text="Sedang proses....." />;
}
