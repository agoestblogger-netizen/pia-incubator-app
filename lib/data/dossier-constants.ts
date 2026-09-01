// 5 Opsi Baku Klasifikasi Inovasi / Peringkat Medali Grand Final PIA
export const BAKU_KLASIFIKASI_OPTIONS = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
] as const;

export type BakuKlasifikasi = (typeof BAKU_KLASIFIKASI_OPTIONS)[number];
