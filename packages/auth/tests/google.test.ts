import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, base64url } from "jose";
import { createPKCE, googleAuthorizationURL, verifyGoogleIdentityToken } from "../src/index";

test("OAuth isolates mailbox consent from sign-in and uses valid PKCE", async () => {
  const a = await createPKCE(),
    b = await createPKCE();
  assert.notEqual(a.verifier, b.verifier);
  assert.equal(
    a.challenge,
    base64url.encode(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(a.verifier))),
    ),
  );
  const base = {
    clientId: "orbit",
    redirectUri: "https://orbit.ubio.dev/auth/callback",
    state: "state",
    nonce: "nonce",
    challenge: a.challenge,
  };
  const login = googleAuthorizationURL(base);
  assert.equal(login.searchParams.get("scope"), "openid email profile");
  assert.equal(login.searchParams.get("access_type"), null);
  const mail = googleAuthorizationURL({
    ...base,
    additionalScopes: ["gmail.readonly", "gmail.send"],
    offline: true,
    loginHint: "a@ub.io",
  });
  assert.equal(mail.searchParams.get("prompt"), "consent");
  assert.equal(mail.searchParams.get("access_type"), "offline");
  assert.equal(mail.searchParams.get("login_hint"), "a@ub.io");
});

test("Google JWT verification rejects the wrong app, nonce, issuer and identity", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "oss-os-test", alg: "RS256" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), "https://www.googleapis.com/oauth2/v3/certs");
    return Response.json({ keys: [jwk] });
  };
  const token = (overrides: Record<string, unknown> = {}, issuer = "https://accounts.google.com") =>
    new SignJWT({
      sub: "google-1",
      email: "a@ub.io",
      hd: "ub.io",
      email_verified: true,
      nonce: "expected",
      ...overrides,
    })
      .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
      .setIssuer(issuer)
      .setAudience("orbit")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  try {
    assert.equal(
      (await verifyGoogleIdentityToken(await token(), "orbit", "expected")).email,
      "a@ub.io",
    );
    await assert.rejects(verifyGoogleIdentityToken(await token(), "beacon", "expected"));
    await assert.rejects(verifyGoogleIdentityToken(await token(), "orbit", "other"));
    await assert.rejects(
      verifyGoogleIdentityToken(await token({}, "https://evil.test"), "orbit", "expected"),
    );
    await assert.rejects(
      verifyGoogleIdentityToken(await token({ email: "a@gmail.com" }), "orbit", "expected"),
    );
    await assert.rejects(
      verifyGoogleIdentityToken(await token({ email_verified: false }), "orbit", "expected"),
    );
    await assert.rejects(verifyGoogleIdentityToken((await token()) + "x", "orbit", "expected"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
