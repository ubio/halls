import type { GoogleIdentity, WorkspaceUser } from "./index";
/** Adapter for the existing users table; binding/storage lifecycle belongs to each app. */
export class D1UserDirectory {
  constructor(private readonly db: D1Database) {}
  async registerVerifiedIdentity(
    identity: GoogleIdentity,
    initialRole = "member",
  ): Promise<WorkspaceUser> {
    const { email, name, sub } = identity;
    const existing = await this.db
      .prepare("SELECT email,active FROM users WHERE google_sub=? OR email=?")
      .bind(sub, email)
      .all<{ email: string; active: number }>();
    if (existing.results.some((u) => !u.active)) throw Error("Your account has been disabled.");
    if (existing.results.some((u) => u.email !== email))
      throw Error("Your account email has changed. Ask an administrator to update it.");
    await this.db
      .prepare(
        // A returning user keeps the role they were given, except that a login the
        // app marks as admin promotes them: bootstrap administrators are named
        // in code, and must not stay members because they signed in before
        // being named. Nothing here ever demotes.
        "INSERT INTO users(email,name,role,google_sub,active) VALUES(?,?,?,?,1) ON CONFLICT(email) DO UPDATE SET name=excluded.name, role=CASE WHEN excluded.role='admin' THEN 'admin' ELSE users.role END WHERE users.google_sub=excluded.google_sub",
      )
      .bind(email, name, initialRole, sub)
      .run();
    const bound = await this.db
      .prepare("SELECT email,name,role,google_sub,active FROM users WHERE email=?")
      .bind(email)
      .first<WorkspaceUser & { google_sub: string; active: number }>();
    if (!bound || bound.google_sub !== sub) throw Error("Account identity does not match.");
    if (!bound.active) throw Error("Your account has been disabled.");
    return { email: bound.email, name: bound.name, role: bound.role };
  }
}
