const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const m = parseInt(month, 10) - 1;
  if (m < 0 || m > 11) return dateStr;
  return `${parseInt(day, 10)} ${MONTHS[m]} ${year}`;
}
