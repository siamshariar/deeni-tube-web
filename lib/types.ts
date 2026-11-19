// lib/types.ts — shared shapes for mock data

/** A comment or reply in the mock comment threads */
export interface CommentReply {
  id: string;
  user: string;
  avatar: string;
  timeAgo: string;
  content: string;
  likes: number;
  dislikes: number;
  isChannel?: boolean;
  parentId?: string;
  replies?: CommentReply[];
  /** UI-only flags the Shorts page adds when loading comments */
  _isLiked?: boolean;
  _isDisliked?: boolean;
}

export type VideoComment = CommentReply;

/** A short listed on a channel or scholar page */
export interface ChannelShort {
  id: string;
  videoId: string;
  title: string;
  views: string;
  timeAgo: string;
  duration: string;
}
