import { customAlphabet } from "nanoid";

// Same alphabet the CLI uses (URL-safe, no ambiguous chars like 0/O).
const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const make = customAlphabet(alphabet, 16);

export function newProjectId(): string {
  return `ws_${make()}`;
}
