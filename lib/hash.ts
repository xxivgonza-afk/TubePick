import { createHash } from "node:crypto";

export function hashKey(value: string): string {
  return createHash("sha1").update(value).digest("hex");
}
