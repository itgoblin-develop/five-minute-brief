/** 뉴스 댓글 */
export interface CommentItem {
  user: string;
  time: string;
  text: string;
  isMine: boolean;
}

/** 뉴스 기사 */
export interface NewsItem {
  id: number;
  category: string;
  title: string;
  summary: string;
  tags: string[];
  date: string;
  likes: number;
  bookmarks: number;
  comments: number;
  body: string;
  aiSummary: string[];
  commentsData: CommentItem[];
  gradient: string;
  img: string;
}
