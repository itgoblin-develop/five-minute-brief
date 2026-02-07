export function getCategoryColor(category: string): string {
  switch (category) {
    case '경제': return 'bg-blue-500';
    case '테크': return 'bg-indigo-500';
    case '세계': return 'bg-violet-500';
    case '환경': return 'bg-green-500';
    case '문화': return 'bg-pink-500';
    case '사회': return 'bg-orange-500';
    case '재테크': return 'bg-cyan-500';
    case '트렌딩': return 'bg-rose-500';
    default: return 'bg-gray-800';
  }
}

export function getRelativeTime(dateString: string): string {
  // Assuming dateString is "YYYY.MM.DD" or similar format parseable by Date
  const date = new Date(dateString.replace(/\./g, '-'));
  const now = new Date();
  
  // Reset time part for accurate day comparison
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '오늘';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}일 전`;
  
  return dateString; // Fallback for older dates
}

export function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}
