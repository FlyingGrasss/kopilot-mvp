import { createHash, randomBytes, randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export function newOpaqueToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Deterministic avatar colour for registrations that do not pick one. */
export function pickAvatarColor(seed: string, palette: readonly string[]): string {
  const digest = createHash("sha256").update(seed).digest();
  return palette[digest[0]! % palette.length]!;
}
