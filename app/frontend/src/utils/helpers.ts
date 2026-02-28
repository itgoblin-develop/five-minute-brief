export function getCategoryColor(category: string): string {
  switch (category) {
    case 'IT 소식': return 'bg-blue-500';
    case '리뷰': return 'bg-orange-500';
    case '사용 방법': return 'bg-emerald-500';
    default: return 'bg-gray-800';
  }
}

export function getRelativeTime(dateString: string): string {
  if (!dateString) return '';

  // Handle both ISO format (2026-02-06T21:25:44.527Z) and dot format (2026.02.06)
  const date = dateString.includes('T')
    ? new Date(dateString)
    : new Date(dateString.replace(/\./g, '-'));

  if (isNaN(date.getTime())) return dateString;

  const now = new Date();

  // Reset time part for accurate day comparison
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}일 전`;

  // Format as YYYY.MM.DD for older dates
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export function formatCount(count: number): string {
  if (count == null) return '0';
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}
