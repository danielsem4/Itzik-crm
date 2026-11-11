/**
 * The authenticated principal.
 *
 * Minimal, all server-derived, immutable per request. The session cookie carries
 * ONLY an opaque token; `authenticate` derives every field below server-side.
 * `role`/`status` are read fresh from the User on each request, which is why a
 * role change or disablement takes effect on the very next request.
 *
 * A Principal exists ONLY after a successful login. Mutable profile/business
 * data (name, email, preferences) must NOT live here.
 */
import type { Role, UserStatus } from "@prisma/client";
import type { ActorContext } from "../authz";

export interface Principal {
  /** User.id (uuid). */
  userId: string;
  /** Fresh from User.role every request. */
  role: Role;
  /** Session.id — revocation targeting & audit correlation. */
  sessionId: string;
  /** Must be ACTIVE to reach a handler. */
  status: UserStatus;
  /** Last full login — drives the recent-auth window. */
  authenticatedAt: Date;
}

/** Adapt a Principal to the authz `ActorContext` ({ id, role }). */
export function toActorContext(principal: Principal): ActorContext {
  return { id: principal.userId, role: principal.role };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `authenticate`; present only on a fully-authenticated request. */
      principal?: Principal;
      /**
       * The current session's synchronizer CSRF token, stashed by `authenticate`
       * for the `csrf` middleware. Not part of the trusted principal identity.
       */
      sessionCsrfToken?: string;
    }
  }
}
