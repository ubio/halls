import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { workspaceIdentity } from "../src/index";
import { D1UserDirectory } from "../src/database";

test("both apps share exact verified staff-domain validation", () => {
  const claims = {
    sub: "google-1",
    email: "A@UB.IO",
    hd: "UB.IO",
    email_verified: true,
    name: "A",
  };
  assert.equal(workspaceIdentity(claims).email, "a@ub.io");
  for (const email of ["a@gmail.com", "a@ub.io.evil.test", "a@sub.ub.io", "a@ub.io\n", "a @ub.io"])
    assert.throws(() => workspaceIdentity({ ...claims, email }));
  assert.throws(() => workspaceIdentity({ ...claims, email_verified: false }));
  assert.throws(() => workspaceIdentity({ ...claims, sub: "" }));
  // A profile photo rides along only from Google's own image host.
  assert.equal(workspaceIdentity(claims).picture, undefined);
  assert.equal(
    workspaceIdentity({ ...claims, picture: "https://lh3.googleusercontent.com/a/photo=s96-c" }).picture,
    "https://lh3.googleusercontent.com/a/photo=s96-c",
  );
  assert.equal(workspaceIdentity({ ...claims, picture: "https://evil.example/photo.png" }).picture, undefined);
});

test("user provisioning preserves roles, prevents identity takeover and respects disabled users", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE users(email TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,google_sub TEXT NOT NULL UNIQUE,active INTEGER NOT NULL)",
  );
  const adapter = {
    prepare(sql: string) {
      let values: unknown[] = [];
      const statement = {
        bind(...args: unknown[]) {
          values = args;
          return statement;
        },
        async first() {
          return db.prepare(sql).get(...(values as never[])) || null;
        },
        async all() {
          return { results: db.prepare(sql).all(...(values as never[])) };
        },
        async run() {
          return db.prepare(sql).run(...(values as never[]));
        },
      };
      return statement;
    },
  } as unknown as D1Database;
  const directory = new D1UserDirectory(adapter);
  const identity = { sub: "google-1", email: "a@ub.io", name: "A", hd: "ub.io" };
  try {
    assert.equal((await directory.registerVerifiedIdentity(identity, "admin")).role, "admin");
    assert.equal(
      (await directory.registerVerifiedIdentity({ ...identity, name: "Updated" })).role,
      "admin",
    );
    assert.equal(db.prepare("SELECT name FROM users").get()?.name, "Updated");
    // A member named as a bootstrap admin is promoted at their next login.
    const second = { sub: "google-2", email: "b@ub.io", name: "B", hd: "ub.io" };
    assert.equal((await directory.registerVerifiedIdentity(second)).role, "member");
    assert.equal((await directory.registerVerifiedIdentity(second, "admin")).role, "admin");
    assert.equal((await directory.registerVerifiedIdentity(second)).role, "admin");
    // A later default login never demotes an administrator made in the app.
    db.prepare("UPDATE users SET role='admin' WHERE email='b@ub.io'").run();
    assert.equal((await directory.registerVerifiedIdentity(second, "member")).role, "admin");
    await assert.rejects(
      directory.registerVerifiedIdentity({ ...identity, sub: "impostor" }),
      /identity/,
    );
    await assert.rejects(
      directory.registerVerifiedIdentity({ ...identity, email: "renamed@ub.io" }),
      /email has changed/,
    );
    db.exec("UPDATE users SET active=0");
    await assert.rejects(directory.registerVerifiedIdentity(identity), /disabled/);
    assert.equal(db.prepare("SELECT count(*) AS total FROM users").get()?.total, 2);
  } finally {
    db.close();
  }
});
