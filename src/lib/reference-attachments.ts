import type { ReferenceAttachment } from "./types";

export const MAX_ATTACHMENTS = 6;
export const ATTACHMENT_BUDGET = 180_000;
export const MAX_REFERENCE_SIDE = 768;
// Conservative reservation/fallback allowance, not a provider pricing formula.
export const ESTIMATED_IMAGE_INPUT_TOKENS = 8_192;
const textExtension = /\.(txt|md|json|ya?ml|toml|properties|java|kt|mcmeta|mcfunction|log)$/i;
export const isImageReference = (file: ReferenceAttachment) => file.type.startsWith("image/");

function imageDimensions(bytes: Uint8Array, type: string): [number, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "image/png" && bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value)
    && view.getUint32(8) === 13 && String.fromCharCode(...bytes.slice(12, 16)) === "IHDR")
    return [view.getUint32(16), view.getUint32(20)];
  if (type === "image/jpeg" && bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216
    && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217) break;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194].includes(marker) && length >= 8)
        return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
      offset += length;
    }
  }
  throw new Error("Reference image header does not match its PNG/JPEG type.");
}

export function validateAttachments(value: unknown): ReferenceAttachment[] {
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS)
    throw new Error(`Attach at most ${MAX_ATTACHMENTS} reference files.`);
  let total = 0;
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid reference attachment.");
    const { name, type, data } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim() || name.length > 160 || /[\\/\u0000-\u001f\u007f]/.test(name)
      || typeof type !== "string" || typeof data !== "string" || data.includes("\0"))
      throw new Error("Reference files need a plain filename, supported type and text data.");
    total += new TextEncoder().encode(data).length;
    if (total > ATTACHMENT_BUDGET) throw new Error("Reference attachments exceed the combined 180 KB limit.");
    if (type.startsWith("image/")) {
      if (type !== "image/jpeg" && type !== "image/png") throw new Error("Reference images must be JPEG or PNG; reattach through the image picker.");
      const prefix = `data:${type};base64,`;
      if (!data.startsWith(prefix)) throw new Error("Reference images must be inline base64 data, not remote URLs.");
      const encoded = data.slice(prefix.length);
      if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
        throw new Error("Reference image contains invalid base64 data.");
      const decoded = atob(encoded);
      if (btoa(decoded) !== encoded) throw new Error("Reference image contains noncanonical base64 data.");
      const [width, height] = imageDimensions(Uint8Array.from(decoded, c => c.charCodeAt(0)), type);
      if (!width || !height || width > MAX_REFERENCE_SIDE || height > MAX_REFERENCE_SIDE)
        throw new Error(`Reference images must fit within ${MAX_REFERENCE_SIDE} × ${MAX_REFERENCE_SIDE}; reattach through the image picker.`);
      return { name, type, data };
    }
    if (!textExtension.test(name) || data.length > 40_000 || !["text/plain", "text/markdown", "application/json", "application/octet-stream", "", "application/yaml", "text/yaml", "text/x-java-source"].includes(type))
      throw new Error("Attach a supported text/code file of at most 40,000 characters.");
    return { name, type: "text/plain", data };
  });
}

/** Keep image bytes out of JSON text prompts, logs and token character estimates. */
export function referenceDescriptions(files: ReferenceAttachment[] = []) {
  return files.map(file => ({ name: file.name, type: file.type, ...(isImageReference(file) ? {} : { content: file.data }) }));
}
