/**
 * Auth constants shared by server code, the login page client and the
 * (edge-runtime) proxy. Must stay dependency-free.
 */

/** Secure, HttpOnly session cookie (value = a minted Firebase session cookie). */
export const SESSION_COOKIE = "staffrail_admin_session"

/** Double-submit CSRF cookie (readable by our own JS only). */
export const CSRF_COOKIE = "staffrail_csrf"

/** Header the login page client must echo the CSRF token in. */
export const CSRF_HEADER = "x-staffrail-csrf"

/** 14 days — also the maximum ttl accepted by Firebase session cookies. */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000

/** CSRF cookies are short-lived; the login page fetches a fresh one. */
export const CSRF_MAX_AGE_SECONDS = 60 * 60

/** Routes the proxy treats as protected (cookie-presence optimistic check). */
export const PROTECTED_PATH_PREFIXES = ["/dashboard"] as const
