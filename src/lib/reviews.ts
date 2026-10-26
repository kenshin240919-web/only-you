import "server-only";
import { getDb } from "./db";

// 후기 코너(/stories). 관리자가 동의를 확인한 후기만 올린다. 영상은 R2 reviews/{id}.{ext}.
export type ReviewRow = {
  id: string;
  order_id: string | null;
  name: string;
  occasion: string;
  body: string;
  video_key: string | null;
  video_type: string | null;
  rewarded: number;
  published: number;
  created_at: string;
};

export type ReviewView = { id: string; name: string; occasion: string; body: string; hasVideo: boolean; rewarded: boolean; createdAt: string };

export const toView = (r: ReviewRow): ReviewView => ({
  id: r.id,
  name: r.name,
  occasion: r.occasion,
  body: r.body,
  hasVideo: Boolean(r.video_key),
  rewarded: r.rewarded === 1,
  createdAt: r.created_at,
});

export async function listReviews(publishedOnly: boolean): Promise<ReviewRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT * FROM reviews ${publishedOnly ? "WHERE published = 1" : ""} ORDER BY created_at DESC LIMIT 200`)
    .all<ReviewRow>();
  return results;
}

export async function getReview(id: string): Promise<ReviewRow | null> {
  const db = await getDb();
  return db.prepare("SELECT * FROM reviews WHERE id = ?").bind(id).first<ReviewRow>();
}

/** 영상 파일 형식. 휴대폰 영상(mp4 · mov)만 받는다. */
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
export const MAX_VIDEO_BYTES = 95 * 1024 * 1024;
