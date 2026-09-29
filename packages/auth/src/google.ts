import { createRemoteJWKSet, jwtVerify } from "jose";
import { workspaceIdentity } from "@oss-os/users";
const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export function googleAuthorizationURL(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  challenge: string;
  additionalScopes?: readonly string[];
  offline?: boolean;
  loginHint?: string;
}) {
  const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  target.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: ["openid", "email", "profile", ...(input.additionalScopes || [])].join(" "),
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: input.offline ? "consent" : "select_account",
    ...(input.offline ? { access_type: "offline" } : {}),
    ...(input.loginHint ? { login_hint: input.loginHint } : {}),
  }).toString();
  return target;
}
export async function exchangeGoogleCode(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  verifier: string;
}) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
      code_verifier: input.verifier,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("Google sign-in failed. Please try again.");
  const tokens = (await response.json()) as {
    id_token?: string;
    refresh_token?: string;
    scope?: string;
  };
  if (typeof tokens.id_token !== "string" || !tokens.id_token)
    throw Error("Identity token missing");
  return { ...tokens, id_token: tokens.id_token };
}
export async function verifyGoogleIdentityToken(idToken: string, clientId: string, nonce: string) {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub", "nonce"],
    maxTokenAge: "10m",
  });
  if (payload.nonce !== nonce) throw Error("Invalid nonce");
  return workspaceIdentity(payload);
}
