import { PageLoadingSkeleton } from '@/components/ui/PageLoadingSkeleton';

export default function RolesLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      title="Manajemen Role, Hak Akses & Pengguna"
      subtitle="Memuat matriks permission, daftar peran, dan akun pengguna terdaftar..."
    />
  );
}
