/** Shared staff identity policy. App contacts/on-call recipients are separate domain records. */
export const allowedDomains = ["ub.io", "ubio.ai"];
export interface UserProfile {
  email: string;
  name: string;
}
export interface WorkspaceUser extends UserProfile {
  role: string;
}
export interface GoogleIdentity extends UserProfile {
  sub: string;
  hd: string;
  /** Google's profile photo URL, when the token carried one. */
  picture?: string;
}
export function allowedEmail(email: unknown, verified: unknown, hostedDomain: unknown): boolean {
  return (
    typeof email === "string" &&
    verified === true &&
    /^[^@\s]+@(ub\.io|ubio\.ai)$/i.test(email) &&
    typeof hostedDomain === "string" &&
    allowedDomains.includes(hostedDomain.toLowerCase())
  );
}
export function workspaceIdentity(claims: Record<string, unknown>): GoogleIdentity {
  if (
    !allowedEmail(claims.email, claims.email_verified, claims.hd) ||
    typeof claims.sub !== "string" ||
    !claims.sub.trim()
  )
    throw Error("Access denied");
  const picture =
    typeof claims.picture === "string" && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(claims.picture)
      ? claims.picture
      : undefined;
  return {
    sub: claims.sub,
    email: (claims.email as string).toLowerCase(),
    hd: (claims.hd as string).toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : (claims.email as string),
    ...(picture ? { picture } : {}),
  };
}
