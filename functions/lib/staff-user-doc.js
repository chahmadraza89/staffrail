"use strict";
/**
 * Initial user-document fields for the `registerStaff` callable.
 *
 * `webProvisioning` opts the WEB dashboard flow in (backward-compatible:
 * existing Flutter callers omit the option and keep the exact previous
 * behavior — no `setupStatus` field is written for them).
 *
 * Web accounts are created with `setupStatus: "incomplete"` written IN THIS
 * SAME trusted creation flow, BEFORE the callable returns success: recovery
 * then survives a browser closing before the client provisions documents,
 * a failed provisioning attempt, or a failed follow-up client write. The
 * provisioning transaction on the web client flips it to `complete`; no
 * failure handler ever overwrites it. The password-reset link is NEVER
 * stored in the document (or anywhere server-side).
 *
 * NOTE: the guarantee above requires the DEPLOYED callable to be updated:
 * `firebase deploy --only functions`. Until then the web client fills the
 * marker best-effort (only when the field is missing), never overwriting
 * a concurrent successful completion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStaffUserDoc = buildStaffUserDoc;
function buildStaffUserDoc(input, options = {}) {
    return Object.assign({ uid: input.uid, email: input.email, name: input.name, role: input.role, adminId: input.adminId, createdAt: input.serverTimestamp, lastLogin: input.serverTimestamp, isActive: true, notificationPreferences: {
            pushEnabled: true,
            emailEnabled: true,
            taskReminders: true,
            adminAlerts: true,
        } }, (options.webProvisioning === true ? { setupStatus: "incomplete" } : {}));
}
//# sourceMappingURL=staff-user-doc.js.map