import 'dart:async';
import 'dart:developer' as dev;

import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as store_const;
import 'package:bhmh/core/config/organization_config.dart';
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/core/models/app_notification.dart';
import 'package:bhmh/core/router/app_router.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/shared/scaffold_messenger_key.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';

class LocalNotificationMessage {
  final String? messageId;
  final String? title;
  final String? body;
  final Map<String, dynamic> data;

  const LocalNotificationMessage({
    this.messageId,
    this.title,
    this.body,
    this.data = const {},
  });
}

class NotificationService {
  StreamSubscription<List<AppNotification>>? _notificationSub;
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
      return false;
    }
    _lastShownTitle = title;
    _lastShownBody = body;
    _lastShownTime = now;
    return true;
  }

  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
      FlutterLocalNotificationsPlugin();
  final StreamController<String> _tokenRefreshController =
      StreamController<String>.broadcast();

  static const String _channelId = 'staffrail_communications';
  static const String _channelName = '${OrganizationConfig.appName} Alerts';
  static const String _channelDesc =
      'Important workspace announcements and alerts';

  static Function(LocalNotificationMessage message)? onNotificationTap;

  void setNotificationTapCallback(
    Function(LocalNotificationMessage message) callback,
  ) {
    onNotificationTap = callback;
  }

  Future<void> initialize() async {
    try {
      dev.log(
        'Initializing local Notification Service...',
        name: 'NotificationService',
      );

      if (!kIsWeb) {
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
            _handleNotificationNavigation(null);
          },
        );

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
      }
    } catch (e, st) {
      dev.log(
        'Error initializing notifications: $e',
        name: 'NotificationService',
        error: e,
        stackTrace: st,
      );
    }
  }

  Future<String?> getToken() async => 'local-device-token';

  Stream<String> get onTokenRefresh => _tokenRefreshController.stream;

  void _showLocalNotification(LocalNotificationMessage message) {
    if (kIsWeb) return;
    if (message.title == null && message.body == null) return;

    _localNotificationsPlugin.show(
      id: message.hashCode,
      title: message.title,
      body: message.body,
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

  void _showForegroundBanner(LocalNotificationMessage message) {
    final messenger = scaffoldMessengerKey.currentState;
    if (messenger == null || !messenger.mounted) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
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
                        message.title ?? 'New Notification',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          color: Color(0xFF1E293B),
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        message.body ?? 'Tap to view details',
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
                    child: const Text('VIEW'),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () {
                      final m = scaffoldMessengerKey.currentState;
                      if (m != null && m.mounted) {
                        m.clearMaterialBanners();
                      }
                    },
                    child: const Text('DISMISS'),
                  ),
                ],
              ),
            ),
          ],
        );

        currentMessenger.removeCurrentMaterialBanner(
          reason: MaterialBannerClosedReason.remove,
        );
        currentMessenger.showMaterialBanner(banner);

        _bannerTimer?.cancel();
        _bannerTimer = Timer(const Duration(seconds: 5), () {
          try {
            final m = scaffoldMessengerKey.currentState;
            if (m != null && m.mounted) {
              m.hideCurrentMaterialBanner();
            }
          } catch (_) {}
        });
      } catch (e) {
        dev.log(
          'Suppressed banner error during disposal: $e',
          name: 'NotificationService',
        );
      }
    });
  }

  void _handleNotificationNavigation(LocalNotificationMessage? message) {
    final context = rootNavigatorKey.currentContext;
    if (context == null) return;

    try {
      scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
      context.pushNamed(UserRouteNames.notifications);
    } catch (_) {
      try {
        context.push('/user_dashboard/notifications');
      } catch (_) {}
    }
  }

  Future<void> triggerNotification({
    required String userId,
    required String title,
    required String body,
    NotificationType type = NotificationType.info,
    Map<String, dynamic>? metadata,
  }) async {
    final store = LocalDataStore.instance;
    final docRef = store
        .collection(store_const.users)
        .doc(userId)
        .collection(store_const.notifications)
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
  }

  Stream<List<AppNotification>> streamNotifications(String userId) {
    return LocalDataStore.instance
        .collection(store_const.users)
        .doc(userId)
        .collection(store_const.notifications)
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs
              .map((doc) => AppNotification.fromFirestore(doc))
              .toList();
        });
  }

  Future<void> clearAllNotifications(String userId) async {
    final store = LocalDataStore.instance;
    final batch = store.batch();
    final snapshot = await store
        .collection(store_const.users)
        .doc(userId)
        .collection(store_const.notifications)
        .get();

    for (final doc in snapshot.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();
  }

  Future<void> markAsRead(String userId, String notificationId) async {
    await LocalDataStore.instance
        .collection(store_const.users)
        .doc(userId)
        .collection(store_const.notifications)
        .doc(notificationId)
        .update({'isRead': true});
  }

  void listenToUserNotifications(String userId) {
    stopListeningToUser();
    final sessionStartTime = DateTime.now();

    _notificationSub = streamNotifications(userId).listen((notifications) {
      final newUnread = notifications.where((n) {
        if (n.isRead) return false;
        return n.timestamp.isAfter(
          sessionStartTime.subtract(const Duration(seconds: 1)),
        );
      }).toList();

      if (newUnread.isNotEmpty) {
        final latest = newUnread.first;
        if (!_canShowNotification(latest.title, latest.body)) {
          return;
        }

        final syntheticMessage = LocalNotificationMessage(
          title: latest.title,
          body: latest.body,
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

  void stopListeningToUser() {
    _notificationSub?.cancel();
    _notificationSub = null;
  }
}
