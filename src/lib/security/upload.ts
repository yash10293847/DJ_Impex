import "server-only";

import sharp from "sharp";
import { SecurityError } from "./errors";

const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/avif": "heif", "image/gif": "gif" };

export async function validateMedia(bytes: Buffer, contentType: string): Promise<Buffer> {
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new SecurityError(413, "Please use a file under 4MB.");
  if (formats[contentType]) {
    try {
      const image = sharp(bytes, { animated: true, limitInputPixels: 40000000, failOn: "warning" });
      const metadata = await image.metadata();
      if (metadata.format !== formats[contentType] || (metadata.pages ?? 1) > 100 ||
        (metadata.width ?? 0) * (metadata.height ?? 0) * (metadata.pages ?? 1) > 80000000) throw new Error();
      // Decode and re-encode rather than storing arbitrary bytes with an image MIME.
      const result = await image.rotate().toBuffer();
      if (result.length > 4 * 1024 * 1024) throw new Error();
      return result;
    } catch { throw new SecurityError(415, "Please upload a valid supported image."); }
  }
  if (["video/mp4", "video/quicktime"].includes(contentType)) {
    let offset = 0;
    const types = new Set<string>();
    let brand = "";
    // Bound every top-level ISO-BMFF box. Require an actual movie and media data.
    while (offset + 8 <= bytes.length) {
      let size = bytes.readUInt32BE(offset);
      const type = bytes.toString("ascii", offset + 4, offset + 8);
      let header = 8;
      if (size === 1) {
        if (offset + 16 > bytes.length) break;
        const large = bytes.readBigUInt64BE(offset + 8);
        if (large > BigInt(bytes.length)) break;
        size = Number(large); header = 16;
      }
      if (size === 0) size = bytes.length - offset;
      if (size < header || offset + size > bytes.length) break;
      if (type === "ftyp" && size >= header + 8) brand = bytes.toString("ascii", offset + header, offset + header + 4);
      if (size > header) types.add(type);
      offset += size;
    }
    if (offset === bytes.length && types.has("ftyp") && types.has("moov") && types.has("mdat") &&
      /^(isom|iso[2-9]|mp4[12]|avc1|M4V |qt  )$/.test(brand)) return bytes;
  }
  if (contentType === "video/webm" && validWebm(bytes)) return bytes;
  throw new SecurityError(415, "Please upload a valid supported media file.");
}

function validWebm(bytes: Buffer): boolean {
  if (bytes.length < 8 || bytes.readUInt32BE(0) !== 0x1a45dfa3) return false;
  // A WebM EBML header declares its document type before the Segment element.
  // This bounded container check is not a substitute for a full video decoder.
  const header = bytes.subarray(0, Math.min(bytes.length, 256));
  return header.includes(Buffer.from([0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d])) &&
    bytes.indexOf(Buffer.from([0x18, 0x53, 0x80, 0x67]), 4) > 0 &&
    bytes.indexOf(Buffer.from([0x1f, 0x43, 0xb6, 0x75]), 4) > 0;
}
