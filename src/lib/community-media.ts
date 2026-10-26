import { randomUUID } from "node:crypto";
import type { D1Database } from "./billing-db";
import { CommunityError, COMMUNITY_ID } from "./community";

export const MAX_COMMUNITY_IMAGE_BYTES = 768 * 1024;

function jpegDimensions(bytes: Buffer): [number, number] {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new CommunityError("Upload a valid PNG or JPEG screenshot.");
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 0xff) throw new CommunityError("Invalid JPEG screenshot.");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker >= 0xd0 && marker <= 0xd7 || marker === 0x01) continue;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8)
      return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    offset += length;
  }
  throw new CommunityError("Upload a standard JPEG or PNG screenshot.");
}

export function validateCommunityImage(value: unknown): { bytes: Buffer; contentType: string } {
  if (typeof value !== "string" || value.length > 1_048_620) throw new CommunityError("Screenshot must be no larger than 768 KB.");
  const match = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || value !== `data:${match[1]};base64,${match[2]}`) throw new CommunityError("Upload a PNG or JPEG screenshot; SVG and remote image URLs are not accepted.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_COMMUNITY_IMAGE_BYTES || bytes.toString("base64") !== match[2])
    throw new CommunityError("Screenshot encoding or size is invalid.");
  let dimensions: [number, number];
  if (match[1] === "image/png") {
    if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR")
      throw new CommunityError("Upload a valid PNG screenshot.");
    dimensions = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  } else dimensions = jpegDimensions(bytes);
  if (dimensions.some(n => n < 16) || dimensions[0] > 3840 || dimensions[1] > 2160 || dimensions[0] * dimensions[1] > 8_294_400)
    throw new CommunityError("Screenshot dimensions must be between 16×16 and 3840×2160.");
  return { bytes, contentType: match[1] };
}

export async function storeCommunityImage(db: D1Database, ownerId: string, value: unknown) {
  const image = validateCommunityImage(value);
  if (!await db.prepare("SELECT handle FROM community_profiles WHERE owner_id=?").bind(ownerId).first())
    throw new CommunityError("Create your community profile before uploading a showcase screenshot.", 409);
  const now = Date.now();
  // Remove only old, unreferenced uploads belonging to this creator.
  await db.prepare(`DELETE FROM community_media WHERE owner_id=? AND created_at<?
    AND NOT EXISTS(SELECT 1 FROM community_posts WHERE cover_image='/api/community/media/'||community_media.id)`)
    .bind(ownerId, now - 86400_000).run();
  const id = randomUUID();
  const result = await db.prepare(`INSERT INTO community_media(id,owner_id,content_type,data_base64,created_at)
    SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM community_media WHERE owner_id=?)<24
    AND (SELECT COUNT(*) FROM community_media WHERE owner_id=? AND created_at>?)<6`)
    .bind(id, ownerId, image.contentType, image.bytes.toString("base64"), now, ownerId, ownerId, now - 600_000).run();
  if (!result.meta.changes) throw new CommunityError("Screenshot upload limit reached. Wait before uploading more, or reuse an existing screenshot.", 429);
  return { url: `/api/community/media/${id}` };
}

export async function readCommunityImage(db: D1Database, id: string, ownerId?: string, moderator = false) {
  if (id.length !== 36 || !COMMUNITY_ID.test(id)) throw new CommunityError("Screenshot not found.", 404);
  const row = await db.prepare(`SELECT m.content_type,m.data_base64 FROM community_media m WHERE m.id=?
    AND (m.owner_id=? OR EXISTS(SELECT 1 FROM community_posts p WHERE p.cover_image='/api/community/media/'||m.id AND (p.status='published' OR (?=1 AND p.status='pending'))))`)
    .bind(id, ownerId ?? "", moderator ? 1 : 0).first<{ content_type: string; data_base64: string }>();
  if (!row || !["image/png", "image/jpeg"].includes(row.content_type)) throw new CommunityError("Screenshot not found.", 404);
  return { bytes: Buffer.from(row.data_base64, "base64"), contentType: row.content_type };
}
