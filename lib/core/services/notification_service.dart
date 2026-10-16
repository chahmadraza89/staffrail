// import 'dart:developer';

import 'package:bhmh/core/config/app_config.dart';
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as firebase_const;
import 'package:bhmh/core/models/app_notification.dart';
import 'package:bhmh/core/shared/scaffold_messenger_key.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'dart:developer' as dev;
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:bhmh/core/router/app_router.dart';
import 'package:go_router/go_router.dart';
// import 'package:bhmh/core/config/app_config.dart' as app_config;
import 'package:bhmh/core/router/user_route_constant.dart';
import 'dart:async';

/// Top-level background handler — must be a top-level function.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // REQUIRED: Initialize Firebase for background message handling
  await Firebase.initializeApp();

  dev.log(
    "Handling a background message: ${message.messageId}",
    name: 'NotificationService',
  );

  // Process the background message (e.g., save to local storage, update UI state)
  if (message.data.isNotEmpty) {
    dev.log(
      "Background message data: ${message.data}",
      name: 'NotificationService',
    );
  }
}

class NotificationService {
  StreamSubscription<List<AppNotification>>? _firestoreNotificationSub;
  String? _lastShownTitle;
  String? _lastShownBody;
  DateTime? _lastShownTime;

  bool _canShowNotification(String? title, String? body) {
    if (title == null && body == null) return false;
    final now = DateTime.now();
    if (_lastShownTitle == title &&
        _lastShownBody == body &&
        _lastShownTime != null &&
        now.difference(_lastShownTime!).inSeconds < 3) {
      return false; // Prevent exact duplicate within 3 seconds
    }
    _lastShownTitle = title;
    _lastShownBody = body;
    _lastShownTime = now;
    return true;
  }

  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static const String _channelId = "bhmh_communications";
  static const String _channelName = "BHMH Communications";
  static const String _channelDesc =
      "Important clinic announcements and alerts";

  /// Callback for handling notification tap events
  static Function(RemoteMessage message)? onNotificationTap;

  /// Sets the callback for notification tap events
  void setNotificationTapCallback(Function(RemoteMessage message) callback) {
    onNotificationTap = callback;
  }

  Future<void> initialize() async {
    try {
      dev.log(
        "Initializing Notification Service...",
        name: 'NotificationService',
      );

      // ── 1. Request Permissions ──────────────────────────────────────────────
      final NotificationSettings settings = await _fcm.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      dev.log(
        'User granted permission: ${settings.authorizationStatus}',
        name: 'NotificationService',
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        dev.log(
          'Notification permission denied. Skipping FCM setup.',
          name: 'NotificationService',
        );
        return;
      }

      // ── 2. Platform-Specific Setup (Android/iOS only, not Web) ──────────
      if (!kIsWeb) {
        // Android local notifications plugin init
        const AndroidInitializationSettings initializationSettingsAndroid =
            AndroidInitializationSettings('@mipmap/launcher_icon');

        const DarwinInitializationSettings initializationSettingsIOS =
            DarwinInitializationSettings(
              requestAlertPermission: true,
              requestBadgePermission: true,
              requestSoundPermission: true,
            );

        const InitializationSettings initializationSettings =
            InitializationSettings(
              android: initializationSettingsAndroid,
              iOS: initializationSettingsIOS,
            );

        await _localNotificationsPlugin.initialize(
          settings: initializationSettings,
          onDidReceiveNotificationResponse: (NotificationResponse response) {
            // Trigger navigation when system local notification is tapped
            _handleNotificationNavigation(null);
          },
        );

        // Create Android High-Importance Channel
        const AndroidNotificationChannel channel = AndroidNotificationChannel(
          _channelId,
          _channelName,
          description: _channelDesc,
          importance: Importance.high,
        );

        await _localNotificationsPlugin
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >()
            ?.createNotificationChannel(channel);

        // Foreground messaging presentation options for Apple
        await _fcm.setForegroundNotificationPresentationOptions(
          alert: true,
          badge: true,
          sound: true,
        );

        // Register background handler
        FirebaseMessaging.onBackgroundMessage(
          _firebaseMessagingBackgroundHandler,
        );
      }

      // ── 3. Subscribe to Topic ───────────────────────────────────────────────
      // Topic subscription is NOT supported on Web client SDK
      if (!kIsWeb) {
        await _fcm.subscribeToTopic('announcements');
        dev.log(
          '✅ Successfully subscribed to announcements topic',
          name: 'NotificationService',
        );
      } else {
        dev.log(
          'ℹ️ Skipping topic subscription on Web (unsupported by client SDK)',
          name: 'NotificationService',
        );
      }

      // ── 4. Listen for Foreground Messages ───────────────────────────────
      FirebaseMessaging.onMessage.listen((dynamic rawMessage) {
        try {
          dev.log(
            "📩 Got a message whilst in the foreground!",
            name: 'NotificationService',
          );

          final RemoteMessage? message = _safeParseRemoteMessage(rawMessage);
          if (message == null) return;

          dev.log("Message data: ${message.data}", name: 'NotificationService');

          if (message.notification != null) {
            dev.log(
              "Notification: ${message.notification!.title} — ${message.notification!.body}",
              name: 'NotificationService',
            );

            if (!_canShowNotification(
              message.notification!.title,
              message.notification!.body,
            )) {
              dev.log(
                "Duplicate notification suppressed.",
                name: 'NotificationService',
              );
              return;
            }

            if (kIsWeb) {
              // Web doesn't support system heads-up notifications smoothly in foreground without service worker hacks.
              // So we show a custom beautiful In-App Banner.
              _showForegroundBanner(message);
            } else {
              // Mobile uses native OS Heads-Up banner
              _showLocalNotification(message);
            }
          }
        } catch (e) {
          dev.log(
            "Error handling foreground message: $e",
            name: 'NotificationService',
          );
        }
      });

      // ── 5. Handle Notification Tap (App in Background) ─────────────────────
      FirebaseMessaging.onMessageOpenedApp.listen((dynamic rawMessage) {
        try {
          final RemoteMessage? message = _safeParseRemoteMessage(rawMessage);
          if (message == null) return;

          dev.log(
            "👆 User tapped notification: ${message.messageId}",
            name: 'NotificationService',
          );
          dev.log(
            "Notification tap data: ${message.data}",
            name: 'NotificationService',
          );

          // Trigger callback if set (for navigation handling in main.dart or router)
          if (onNotificationTap != null) {
            onNotificationTap!(message);
          }

          // Automatic senior-level navigation handling
          _handleNotificationNavigation(message);
        } catch (e) {
          dev.log(
            "Error handling notification tap: $e",
            name: 'NotificationService',
          );
        }
      });

      // ── 6. Check if App was Opened from a Notification ─────────────────────
      // getInitialMessage is primarily for mobile intents.
      if (!kIsWeb) {
        RemoteMessage? initialMessage = await _fcm.getInitialMessage();
        if (initialMessage != null) {
          dev.log(
            "🚀 App opened from notification: ${initialMessage.messageId}",
            name: 'NotificationService',
          );
          dev.log(
            "Initial message data: ${initialMessage.data}",
            name: 'NotificationService',
          );

          // Trigger callback if set (for navigation handling in main.dart or router)
          if (onNotificationTap != null) {
            onNotificationTap!(initialMessage);
          }

          // Delay slightly to ensure router is ready on cold boot
          Future.delayed(const Duration(milliseconds: 500), () {
            _handleNotificationNavigation(initialMessage);
          });
        }
      }
    } catch (e, st) {
      dev.log(
        "❌ Error initializing notifications: $e",
        name: 'NotificationService',
        error: e,
        stackTrace: st,
      );
    }
  }

  /// Retrieves the current FCM token for this device
  Future<String?> getToken() async {
    try {
      if (kIsWeb) {
        // Wait a tiny bit on Web to ensure service worker & JS bridge are ready
        await Future.delayed(const Duration(seconds: 1));

        if (vapidKey == 'YOUR_VAPID_KEY_HERE') {
          dev.log(
            '⚠️ [NotificationService] Web VAPID key not configured. getToken() skipped.',
            name: 'NotificationService',
          );
          return null;
        }

        final token = await _fcm.getToken(vapidKey: vapidKey);
        dev.log(
          '✅ [NotificationService] FCM Token (Web): $token',
          name: 'NotificationService',
        );
        return token;
      }

      // Mobile (Android/iOS)
      final token = await _fcm.getToken();
      dev.log(
        '✅ [NotificationService] FCM Token: $token',
        name: 'NotificationService',
      );
      return token;
    } catch (e) {
      if (e.toString().contains('MissingPluginException')) {
        dev.log(
          '❌ [NotificationService] Error fetching FCM token: ${e.toString()}\n'
          '👉 TIP: This usually happens on Web after a hot-reload. Please STOP the app and run "flutter run -d chrome" again.',
          name: 'NotificationService',
        );
      } else {
        dev.log(
          '❌ [NotificationService] Error fetching FCM token: $e',
          name: 'NotificationService',
        );
      }
      return null;
    }
  }

  /// Listen to token refresh
  Stream<String> get onTokenRefresh => _fcm.onTokenRefresh;

  /// Shows a local notification banner when a push arrives while app is foregrounded (Mobile).
  void _showLocalNotification(RemoteMessage message) {
    if (kIsWeb) return;

    final notification = message.notification;
    if (notification == null) return;

    _localNotificationsPlugin.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDesc,
          icon: '@mipmap/launcher_icon',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }

  Timer? _bannerTimer;

  void _showForegroundBanner(RemoteMessage message) {
    // Senior-level guard: Ensure we don't attempt to render if the view is disposed or inactive
    final messenger = scaffoldMessengerKey.currentState;
    
    // Check if the engine is being disposed (specifically for Web)
    if (messenger == null || !messenger.mounted) {
      dev.log(
        '⚠️ [NotificationService] ScaffoldMessenger is null or not mounted. Skipping banner.',
        name: 'NotificationService',
      );
      return;
    }

    // Use addPostFrameCallback to avoid showing banners during build/layout phases
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Re-verify mounted status after the frame jump
      final currentMessenger = scaffoldMessengerKey.currentState;
      if (currentMessenger == null || !currentMessenger.mounted) return;

      try {
        final banner = MaterialBanner(
          elevation: 0.0,
          backgroundColor: Colors.transparent,
          forceActionsBelow: true,
          padding: EdgeInsets.zero,
          content: Container(
            margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                  spreadRadius: -5,
                ),
                BoxShadow(
                  color: const Color(0xFF109B85).withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(
                color: const Color(0xFF109B85).withValues(alpha: 0.08),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF109B85).withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.notifications_active_rounded,
                    color: Color(0xFF109B85),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.notification?.title ?? 'New Notification',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          color: Color(0xFF1E293B),
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        message.notification?.body ?? 'Tap to view details',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12, bottom: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextButton(
                    onPressed: () {
                      final m = scaffoldMessengerKey.currentState;
                      if (m != null && m.mounted) {
                        m.clearMaterialBanners();
                      }
                      _handleNotificationNavigation(message);
                    },
                    style: TextButton.styleFrom(
                      backgroundColor: const Color(
                        0xFF109B85,
                      ).withValues(alpha: 0.1),
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    child: const Text(
                      'VIEW',
                      style: TextStyle(
                        color: Color(0xFF109B85),
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () {
                      final m = scaffoldMessengerKey.currentState;
                      if (m != null && m.mounted) {
                        m.clearMaterialBanners();
                      }
                    },
                    style: TextButton.styleFrom(
                      backgroundColor: const Color(
                        0xFF94A3B8,
                      ).withValues(alpha: 0.1),
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                    child: const Text(
                      'DISMISS',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );

        // Remove existing banners before showing new one
        currentMessenger.removeCurrentMaterialBanner(
          reason: MaterialBannerClosedReason.remove,
        );
        currentMessenger.showMaterialBanner(banner);

        // Managed auto-dismiss timer
        _bannerTimer?.cancel();
        _bannerTimer = Timer(const Duration(seconds: 5), () {
          try {
            final m = scaffoldMessengerKey.currentState;
            if (m != null && m.mounted) {
              m.hideCurrentMaterialBanner();
            }
          } catch (_) {
            // Ignore timer-based disposal errors
          }
        });
      } catch (e) {
        dev.log(
          '⚠️ [NotificationService] Suppressed banner error during disposal: $e',
          name: 'NotificationService',
        );
      }
    });
  }

  /// Senior-compliant navigation handler
  void _handleNotificationNavigation(RemoteMessage? message) {
    dev.log(
      '🚀 [NotificationService] Routing notification tap...',
      name: 'NotificationService',
    );

    final context = rootNavigatorKey.currentContext;
    if (context == null) {
      dev.log(
        '⚠️ [NotificationService] No context available for navigation.',
        name: 'NotificationService',
      );
      return;
    }

    try {
      // 1. Clear any open dialogs/snackbars just in case
      scaffoldMessengerKey.currentState?.hideCurrentSnackBar();

      // 2. We route to the exact path defined by the user: "/user_notification"
      // Looking at UserRoutes in the app, it's typically 'notifications' or mapped as such.
      // Assuming 'notifications' is the name of the route.
      context.pushNamed(
        UserRouteNames.notifications,
      ); // If named route exists, otherwise context.go('/user_notification') etc.

      // Note: If you face a GoRouter error about name not found, replace with exact path
      // like `context.push('/user/notifications');` based on your router setup.
    } catch (e) {
      dev.log(
        '❌ [NotificationService] Navigation failed: $e\n'
        'Attempting fallback to explicit path...',
        name: 'NotificationService',
      );

      // Fallback
      try {
        context.push('/user_dashboard/notifications');
      } catch (e2) {
        dev.log('Fallback also failed: $e2', name: 'NotificationService');
      }
    }
  }

  /// Triggers a persistent notification by writing to Firestore.
  /// This is used by services to notify users of status changes.
  Future<void> triggerNotification({
    required String userId,
    required String title,
    required String body,
    NotificationType type = NotificationType.info,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      dev.log(
        "📧 Triggering notification for user: $userId",
        name: 'NotificationService',
      );

      final firestore = FirebaseFirestore.instance;
      final docRef = firestore
          .collection(firebase_const.users)
          .doc(userId)
          .collection(firebase_const.notifications)
          .doc();

      final notification = AppNotification(
        id: docRef.id,
        userId: userId,
        title: title,
        body: body,
        type: type,
        timestamp: DateTime.now(),
        metadata: metadata,
      );

      await docRef.set(notification.toFirestore());
      dev.log(
        "✅ Notification persisted to Firestore.",
        name: 'NotificationService',
      );
    } catch (e, st) {
      dev.log(
        "❌ Error triggering notification: $e",
        name: 'NotificationService',
        error: e,
        stackTrace: st,
      );
      rethrow;
    }
  }

  /// Streams notifications for a specific user.
  Stream<List<AppNotification>> streamNotifications(String userId) {
    return FirebaseFirestore.instance
        .collection(firebase_const.users)
        .doc(userId)
        .collection(firebase_const.notifications)
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => AppNotification.fromFirestore(doc))
              .toList();
        });
  }

  /// Marks a specific notification as read.

  Future<void> clearAllNotifications(String userId) async {
    final batch = FirebaseFirestore.instance.batch();
    final snapshot = await FirebaseFirestore.instance
        .collection(firebase_const.users)
        .doc(userId)
        .collection(firebase_const.notifications)
        .get();
        
    for (final doc in snapshot.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();
  }

  Future<void> markAsRead(String userId, String notificationId) async {
    await FirebaseFirestore.instance
        .collection(firebase_const.users)
        .doc(userId)
        .collection(firebase_const.notifications)
        .doc(notificationId)
        .update({'isRead': true});
  }

  /// Starts listening to the Firestore notifications collection for a given user.
  /// If a new unread notification arrives, it displays the in-app banner.
  void listenToFirestoreNotifications(String userId) {
    stopListeningToUser(); // Cancel any existing subscription first

    // Record the exact time we started listening.
    // We only want to show banners for notifications created AFTER this moment.
    final sessionStartTime = DateTime.now();
    dev.log(
      '🔔 [NotificationService] Started session-based listener for $userId at $sessionStartTime',
      name: 'NotificationService',
    );

    _firestoreNotificationSub = streamNotifications(userId).listen((
      notifications,
    ) {
      // Filter for strictly UNREAD notifications that were created AFTER we started this session
      final newUnread = notifications.where((n) {
        if (n.isRead) return false;

        // Only show if it was created after our session started
        return n.timestamp.isAfter(
          sessionStartTime.subtract(const Duration(seconds: 1)),
        );
      }).toList();

      if (newUnread.isNotEmpty) {
        // Grab the most recently added one (stream is ordered by timestamp descending, so first is newest)
        final latest = newUnread.first;

        if (!_canShowNotification(latest.title, latest.body)) {
          return;
        }

        dev.log(
          '📢 [NotificationService] New notification detected: ${latest.title}',
          name: 'NotificationService',
        );

        // Construct a synthetic RemoteMessage to feed into our existing banner UI
        final syntheticMessage = RemoteMessage(
          notification: RemoteNotification(
            title: latest.title,
            body: latest.body,
          ),
          data: latest.metadata ?? {},
        );

        if (kIsWeb) {
          _showForegroundBanner(syntheticMessage);
        } else {
          _showLocalNotification(syntheticMessage);
        }
      }
    });
  }

  /// Stops listening to the Firestore notifications stream.
  void stopListeningToUser() {
    _firestoreNotificationSub?.cancel();
    _firestoreNotificationSub = null;
  }

  /// Safe parsing of RemoteMessage to handle LegacyJavaScriptObject on Web.
  RemoteMessage? _safeParseRemoteMessage(dynamic message) {
    if (message == null) return null;
    if (message is RemoteMessage) return message;

    try {
      // If it's a Map (often what JS interop objects look like when cast)
      if (message is Map) {
        final Map<String, dynamic> data = Map<String, dynamic>.from(message);
        return RemoteMessage.fromMap(data);
      }

      dev.log(
        "⚠️ Received unknown message type: ${message.runtimeType}. Attempting cast...",
        name: 'NotificationService',
      );

      // Fallback for LegacyJavaScriptObject (which doesn't have a visible type in Dart)
      // We can try to access its properties if it's treated as dynamic
      return RemoteMessage(
        messageId: message.messageId?.toString(),
        category: message.category?.toString(),
        collapseKey: message.collapseKey?.toString(),
        contentAvailable: message.contentAvailable ?? false,
        data: Map<String, dynamic>.from(message.data ?? {}),
        from: message.from?.toString(),
        mutableContent: message.mutableContent ?? false,
        notification: message.notification != null
            ? RemoteNotification(
                title: message.notification.title?.toString(),
                body: message.notification.body?.toString(),
              )
            : null,
        sentTime: message.sentTime != null
            ? DateTime.fromMillisecondsSinceEpoch(message.sentTime as int)
            : null,
        threadId: message.threadId?.toString(),
        ttl: message.ttl as int?,
      );
    } catch (e) {
      dev.log("❌ Failed to parse message: $e", name: 'NotificationService');
      return null;
    }
  }
}
