import test from "node:test";
import assert from "node:assert/strict";
import { base64url } from "jose";
import { seal, unseal } from "../src/crypto";
test("a sealed value opens only with the same key and owner", async () => {
  const key = base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
  const other = base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
  const sealed = await seal("refresh-token", "calendar:company", key);
  assert.notEqual(sealed, "refresh-token");
  assert.equal(await unseal(sealed, "calendar:company", key), "refresh-token");
  await assert.rejects(unseal(sealed, "calendar:someone-else", key));
  await assert.rejects(unseal(sealed, "calendar:company", other));
  await assert.rejects(seal("x", "o", base64url.encode(new Uint8Array(16))), /encryption configuration/);
});
