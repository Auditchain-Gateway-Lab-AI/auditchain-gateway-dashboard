const integerFormat = new Intl.NumberFormat('id-ID');
const percentFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });

export const monitoringNumber = value => value == null ? '—' : integerFormat.format(value);
export const monitoringCount = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
export const monitoringTime = value => value && Number.isFinite(new Date(value).getTime()) ? `${dateTimeFormat.format(new Date(value))} WIB` : 'Belum tersedia';

export function monitoringPercent(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.1) return '<0,1%';
  if (value < 100 && value > 99.9) return '>99,9%';
  return `${percentFormat.format(value)}%`;
}
