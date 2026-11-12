import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/core/services/notification_service.dart';
import 'package:bhmh/core/models/app_notification.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});

final systemNotificationsProvider = StreamProvider<List<AppNotification>>((ref) {
  final service = ref.watch(notificationServiceProvider);
  final uid = ref.watch(
    authStateProvider.select((asyncValue) => asyncValue.value?.uid),
  ) ?? '';
  return service.streamNotifications(uid);
});

final unreadSystemNotificationsCountProvider = Provider<int>((ref) {
  final notifications = ref.watch(systemNotificationsProvider).value ?? [];
  return notifications.where((n) => !n.isRead).length;
});
