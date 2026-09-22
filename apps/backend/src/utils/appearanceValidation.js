import sharp from "sharp";

export const MAX_LOGO_BYTES = 500 * 1024;

export function isValidLogo(value) {
  if (value === "") return true;
  if (typeof value !== "string" || value.length > Math.ceil(MAX_LOGO_BYTES / 3) * 4 + 32) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_LOGO_BYTES || buffer.toString("base64") !== match[2]) return false;
  if (match[1] === "png") return buffer.length >= 33 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.toString("ascii", 12, 16) === "IHDR";
  if (match[1] === "jpeg") return buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217;
  return buffer.length >= 20 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" && buffer.readUInt32LE(4) + 8 === buffer.length;
}

export async function normalizeLogo(value) {
  if (!isValidLogo(value)) throw new Error("Invalid logo");
  if (value === "") return "";
  const image = sharp(Buffer.from(value.split(",")[1], "base64"), { limitInputPixels: 4096 * 4096, failOn: "warning", pages: 1 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) throw new Error("Invalid dimensions");
  // Decode and re-encode: never persist client-provided metadata or appended content.
  const buffer = await image.rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
  if (buffer.length > MAX_LOGO_BYTES) throw new Error("Logo too large");
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}
