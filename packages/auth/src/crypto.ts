import { base64url } from "jose";
export const randomToken = () => base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value: string): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function createPKCE() {
  const verifier = randomToken();
  const challenge = base64url.encode(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  return { verifier, challenge };
}

const utf8 = new TextEncoder();
async function sealingKey(secret: string) {
  const bytes = new Uint8Array(base64url.decode(secret));
  if (bytes.length !== 32) throw Error("Invalid token encryption configuration");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
/**
 * Encrypt a credential for storage, bound to its owner: the ciphertext only
 * opens again for the same owner string, so a row copied between people or
 * integrations is unreadable. AES-GCM with a fresh nonce each time.
 */
export async function seal(value: string, owner: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: utf8.encode(owner) },
    await sealingKey(secret),
    utf8.encode(value),
  );
  return base64url.encode(iv) + "." + base64url.encode(new Uint8Array(encrypted));
}
export async function unseal(value: string, owner: string, secret: string) {
  const [iv, encrypted] = value.split(".");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64url.decode(iv)), additionalData: utf8.encode(owner) },
    await sealingKey(secret),
    new Uint8Array(base64url.decode(encrypted)),
  );
  return new TextDecoder().decode(plain);
}
