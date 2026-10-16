"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyEmployeeOnTrainingAssignment = exports.checkDeadlines = exports.notifyAdminClearanceReview = exports.notifyAdminOnboardingReview = exports.migrateOnboardingAcknowledgment = exports.registerStaff = exports.sendBroadcastNotification = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Helper to send targeted push notifications and save to 'notifications' history collection
 */
async function sendTargetedNotification(userId, title, body, notificationType, dataPayload) {
    try {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        const userData = userDoc.data();
        if (!userData) {
            console.log(`User ${userId} not found.`);
            return;
        }
        // Check preferences (default to true if not set)
        const prefs = userData.notificationPreferences || {};
        if (prefs.pushEnabled === false) {
            console.log(`User ${userId} disabled all push notifications.`);
            return;
        }
        if (notificationType === "adminAlerts" && prefs.adminAlerts === false) {
            return;
        }
        if (notificationType === "taskReminders" && prefs.taskReminders === false) {
            return;
        }
        // Save notification to history
        await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("notifications")
            .add({
            title,
            body,
            type: notificationType,
            data: dataPayload || {},
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Send push notification if token exists
        const token = userData.fcmToken;
        if (token) {
            await admin.messaging().send({
                notification: { title, body },
                data: dataPayload || {},
                android: {
                    notification: {
                        channelId: "bhmh_communications",
                        icon: "@mipmap/launcher_icon",
                        sound: "default",
                        priority: "high",
                    },
                },
                token: token,
            });
            console.log(`Push sent to ${userId}`);
        }
        else {
            console.log(`User ${userId} has no FCM token.`);
        }
    }
    catch (error) {
        console.error(`Error sending notification to ${userId}:`, error);
    }
}
/**
 * Automatically sends a push notification when a new document is added to 'messages' collection.
 */
exports.sendBroadcastNotification = (0, firestore_1.onDocumentCreated)("messages/{messageId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    if (data.isPushEnabled !== true) {
        console.log("Push notification not enabled for this message. Skipping.");
        return;
    }
    const title = data.title && data.title.trim() !== "" ? data.title : "BHMH Update";
    const content = data.content || "You have a new message from the clinic.";
    const recipientId = data.recipientId;
    if (recipientId && recipientId !== "broadcast") {
        await sendTargetedNotification(recipientId, title, content, "system");
        return;
    }
    // Broadcast
    try {
        await admin.messaging().send({
            notification: { title, body: content },
            android: {
                notification: {
                    channelId: "bhmh_communications",
                    icon: "@mipmap/launcher_icon",
                    sound: "default",
                    priority: "high",
                },
            },
            topic: "announcements",
        });
    }
    catch (error) {
        console.error("Error in broadcast:", error);
    }
});
/**
 * Registers a new staff member, creates their Auth account,
 * seeds Firestore data, and returns a password reset link.
 */
exports.registerStaff = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();
    if ((callerData === null || callerData === void 0 ? void 0 : callerData.role) !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can register staff.");
    }
    const { email, name, role = "employee" } = request.data;
    if (!email || !name) {
        throw new https_1.HttpsError("invalid-argument", "Email and name are required.");
    }
    try {
        const userRecord = await admin.auth().createUser({
            email: email,
            displayName: name,
        });
        const newUid = userRecord.uid;
        const resetLink = await admin.auth().generatePasswordResetLink(email);
        await admin.firestore().collection("users").doc(newUid).set({
            uid: newUid,
            email: email,
            name: name,
            role: role,
            adminId: callerUid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            notificationPreferences: {
                pushEnabled: true,
                emailEnabled: true,
                taskReminders: true,
                adminAlerts: true,
            },
        });
        const onboardingTasks = [
            { id: "onboarding_acknowledgment_form", title: "Onboarding Acknowledgment form", status: "notStarted" },
            { id: "signed_offer_letter", title: "Signed offer letter", status: "notStarted" },
            { id: "personal_details", title: "Personal Details", status: "notStarted" },
            { id: "employee_handbook", title: "Employee Handbook", status: "notStarted" },
        ];
        const batch = admin.firestore().batch();
        onboardingTasks.forEach((task) => {
            const ref = admin.firestore().collection("users").doc(newUid).collection("onboarding_tasks").doc(task.id);
            batch.set(ref, Object.assign(Object.assign({}, task), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        });
        const trainings = [
            { id: "hipaa_compliance", title: "HIPAA Compliance 2026", status: "notStarted" },
        ];
        trainings.forEach((t) => {
            const ref = admin.firestore().collection("users").doc(newUid).collection("trainings").doc(t.id);
            batch.set(ref, Object.assign(Object.assign({}, t), { dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) }));
        });
        await batch.commit();
        // Trigger Notification for new items
        await sendTargetedNotification(newUid, "Welcome to BHMH!", "You have new onboarding tasks waiting for you.", "system");
        return {
            success: true,
            uid: newUid,
            resetLink: resetLink,
        };
    }
    catch (error) {
        console.error("Error registering staff:", error);
        throw new https_1.HttpsError("internal", error.message || "Failed to register staff.");
    }
});
/**
 * Migration Function: Resets the 'Onboarding Acknowledgment form' for ALL existing employees.
 * This ensures all current users are required to sign the new legal terms.
 */
exports.migrateOnboardingAcknowledgment = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can trigger migrations.");
    }
    const usersSnapshot = await admin.firestore().collection("users").where("role", "==", "employee").get();
    const batchSize = 400;
    let count = 0;
    for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
        const batch = admin.firestore().batch();
        const chunk = usersSnapshot.docs.slice(i, i + batchSize);
        chunk.forEach((userDoc) => {
            const oldTaskRef1 = userDoc.ref.collection("onboarding_tasks").doc("terms_and_conditions_acknowledgement_form");
            const oldTaskRef2 = userDoc.ref.collection("onboarding_tasks").doc("terms_and_conditions_acknowledgment_form");
            const newTaskRef = userDoc.ref.collection("onboarding_tasks").doc("onboarding_acknowledgment_form");
            // Delete old tasks to prevent duplicates
            batch.delete(oldTaskRef1);
            batch.delete(oldTaskRef2);
            // Set the new task
            batch.set(newTaskRef, {
                id: "onboarding_acknowledgment_form",
                title: "Onboarding Acknowledgment form",
                subtitle: "Signature Required",
                status: "notStarted",
                isCompleted: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            count++;
        });
        await batch.commit();
    }
    return { success: true, processedUsers: count };
});
/**
 * Triggers when an onboarding task is updated to 'underReview'. Notifies Admin.
 */
exports.notifyAdminOnboardingReview = (0, firestore_1.onDocumentUpdated)("users/{userId}/onboarding_tasks/{taskId}", async (event) => {
    var _a, _b, _c, _d;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status !== "underReview" && after.status === "underReview") {
        const userId = event.params.userId;
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        const adminId = (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.adminId;
        const userName = ((_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.name) || "An employee";
        if (adminId) {
            await sendTargetedNotification(adminId, "Review Required", `${userName} submitted an onboarding task for review.`, "adminAlerts", { route: `/admin/tasks/${userId}/${event.params.taskId}` });
        }
    }
});
/**
 * Triggers when a clearance task is updated to 'underReview'. Notifies Admin.
 */
exports.notifyAdminClearanceReview = (0, firestore_1.onDocumentUpdated)("users/{userId}/clearance_tasks/{taskId}", async (event) => {
    var _a, _b, _c, _d;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after)
        return;
    if (before.status !== "underReview" && after.status === "underReview") {
        const userId = event.params.userId;
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        const adminId = (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.adminId;
        const userName = ((_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.name) || "An employee";
        if (adminId) {
            await sendTargetedNotification(adminId, "Clearance Review Required", `${userName} submitted a background clearance document for review.`, "adminAlerts", { route: `/admin/clearance/${userId}/${event.params.taskId}` });
        }
    }
});
/**
 * Scheduled cron job to check for due or overdue tasks daily at 8:00 AM.
 */
exports.checkDeadlines = (0, scheduler_1.onSchedule)("every day 08:00", async (event) => {
    const usersSnapshot = await admin.firestore().collection("users").where("isActive", "==", true).get();
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const prefs = userData.notificationPreferences || {};
        if (prefs.taskReminders === false)
            continue; // Skip if user disabled reminders
        const collectionsToCheck = ["onboarding_tasks", "trainings", "clearance_tasks"];
        for (const col of collectionsToCheck) {
            const tasksSnapshot = await userDoc.ref.collection(col).get();
            for (const taskDoc of tasksSnapshot.docs) {
                const task = taskDoc.data();
                if (task.status === "verified" || !task.dueDate)
                    continue;
                const dueDate = task.dueDate.toDate();
                // Check if overdue
                if (dueDate < now) {
                    await sendTargetedNotification(userDoc.id, "Task Overdue", `Your task "${task.title || 'Untitled'}" is overdue. Please complete it.`, "taskReminders", { route: `/tasks/${taskDoc.id}` });
                }
                // Check if due soon (within 3 days)
                else if (dueDate.getFullYear() === threeDaysFromNow.getFullYear() &&
                    dueDate.getMonth() === threeDaysFromNow.getMonth() &&
                    dueDate.getDate() === threeDaysFromNow.getDate()) {
                    await sendTargetedNotification(userDoc.id, "Task Due Soon", `Your task "${task.title || 'Untitled'}" is due in 3 days.`, "taskReminders", { route: `/tasks/${taskDoc.id}` });
                }
            }
        }
    }
});
/**
 * Triggers when a new training module is assigned to an employee.
 * Notifies the employee about the new assignment.
 */
exports.notifyEmployeeOnTrainingAssignment = (0, firestore_1.onDocumentCreated)("users/{userId}/trainings/{trainingId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const userId = event.params.userId;
    const title = data.title || "Untitled Training";
    await sendTargetedNotification(userId, "New Training Assigned", `You have been assigned a new training module: ${title}. Please review your compliance dashboard.`, "system");
});
//# sourceMappingURL=index.js.map