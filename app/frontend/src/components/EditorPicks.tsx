import { useState, useEffect } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { newsAPI } from '@/lib/api';
import { getCategoryColor } from '@/utils/helpers';

interface EditorPickItem {
  id: string;
  category: string;
  title: string;
  summary: string[];
  imageUrl: string;
  adminComment: string;
}

interface EditorPicksProps {
  onItemClick: (item: EditorPickItem) => void;
}

export function EditorPicks({ onItemClick }: EditorPicksProps) {
  const [picks, setPicks] = useState<EditorPickItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPicks();
  }, []);

  const loadPicks = async () => {
    try {
      const data = await newsAPI.getEditorPicks();
      if (data.success && data.picks.length > 0) {
        setPicks(data.picks);
      }
    } catch {
      // 에디터 픽 없으면 숨김
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || picks.length === 0) return null;

  return (
    <section className="px-4 pt-4 pb-2">
      <div className="flex items-center gap-1.5 mb-3">
        <Star size={16} className="text-yellow-500 fill-yellow-500" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">현결 PICK</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {picks.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left active:scale-[0.98]"
          >
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" className="w-full h-32 object-cover" loading="lazy" />
            )}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getCategoryColor(item.category)}`}>
                  {item.category}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">{item.title}</h3>
              {item.adminComment && (
                <p className="text-xs text-blue-500 dark:text-blue-400 line-clamp-2 italic">
                  "{item.adminComment}"
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
