import 'package:bhmh/core/router/notification_navigator.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/home/presentation/widget/notification_card.dart';
import 'package:bhmh/features/employee/home/presentation/provider/message_provider.dart';
import 'package:bhmh/features/employee/home/presentation/provider/notification_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Unified Notification Item for sorting
class UnifiedNotification {
  final String id;
  final String title;
  final String content;
  final DateTime timestamp;
  final bool isSystem;
  final String? route;
  final Map<String, dynamic>? metadata;
  final bool isRead;

  UnifiedNotification({
    required this.id,
    required this.title,
    required this.content,
    required this.timestamp,
    required this.isSystem,
    this.route,
    this.metadata,
    this.isRead = true,
  });
}

final unifiedNotificationsProvider =
    Provider<AsyncValue<List<UnifiedNotification>>>((ref) {
      final messagesAsync = ref.watch(messagesProvider);
      final notificationsAsync = ref.watch(systemNotificationsProvider);

      if (messagesAsync.isLoading || notificationsAsync.isLoading) {
        return const AsyncValue.loading();
      }

      if (messagesAsync.hasError) {
        return AsyncValue.error(
          messagesAsync.error!,
          messagesAsync.stackTrace!,
        );
      }

      final messages = messagesAsync.value ?? [];
      final notifications = notificationsAsync.value ?? [];

      final List<UnifiedNotification> combined = [];

      for (var msg in messages) {
        combined.add(
          UnifiedNotification(
            id: msg.id,
            title: msg.title.isNotEmpty ? msg.title : 'Announcement',
            content: msg.content,
            timestamp: msg.timestamp,
            isSystem: false,
          ),
        );
      }

      for (var notif in notifications) {
        combined.add(
          UnifiedNotification(
            id: notif.id,
            title: notif.title,
            content: notif.body,
            timestamp: notif.timestamp,
            isSystem: true,
            route: notif.metadata?['route'] as String?,
            metadata: notif.metadata,
            isRead: notif.isRead,
          ),
        );
      }

      // Sort: Overdue/Due Soon (unread system tasks) -> New -> Old
      combined.sort((a, b) {
        if (!a.isRead && b.isRead) return -1;
        if (a.isRead && !b.isRead) return 1;
        return b.timestamp.compareTo(a.timestamp);
      });

      return AsyncValue.data(combined);
    });

class NotificationCard extends ConsumerWidget {
  const NotificationCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unifiedAsync = ref.watch(unifiedNotificationsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'All Notifications',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87,
                  letterSpacing: -0.3,
                ),
              ),
              if (unifiedAsync.value?.isNotEmpty ?? false)
                Tooltip(
                  message: 'Clear All',
                  child: IconButton(
                    icon: const Icon(Icons.clear_all_rounded, color: Colors.grey),
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Clear Notifications'),
                          content: const Text('Are you sure you want to clear all notifications?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(false),
                              child: const Text('Cancel'),
                            ),
                            ElevatedButton(
                              onPressed: () => Navigator.of(context).pop(true),
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                              child: const Text('Clear', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );
                      
                      if (confirm == true) {
                        final authValue = ref.read(currentUserProvider).value;
                        if (authValue?.uid != null) {
                          await ref.read(notificationServiceProvider).clearAllNotifications(authValue!.uid);
                        }
                      }
                    },
                  ),
                ),
            ],
          ),
        ),
        // The List Builder - Real-time from Firestore
        unifiedAsync.when(
          data: (notifications) {
            if (notifications.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40.0),
                  child: Column(
                    children: [
                      Icon(
                        Icons.notifications_none_rounded,
                        size: 64,
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No notifications yet',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey.shade400,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'New announcements will appear here',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final item = notifications[index];

                return NewActivityCard(
                  key: ValueKey(item.id),
                  title: item.title,
                  message: item.content,
                  onTap: () {
                    if (item.isSystem) {
                      final authValue = ref.read(currentUserProvider).value;
                      final uid = authValue?.uid;
                      final isAdmin = authValue?.role == UserRole.admin;

                      // 1. Mark as read immediately for UX responsiveness
                      if (uid != null && !item.isRead) {
                        ref
                            .read(notificationServiceProvider)
                            .markAsRead(uid, item.id);
                      }

                      // 2. Resolve Smart Route Command using the Senior Navigator
                      final command = NotificationNavigator.resolveCommand(
                        metadata: item.metadata,
                        isAdmin: isAdmin,
                        title: item.title,
                      );

                      if (command != null) {
                        context.pushNamed(
                          command.routeName,
                          pathParameters: command.pathParameters,
                          extra: command.extra,
                        );
                      } else if (item.route != null && item.route!.isNotEmpty) {
                        // Legacy fallback for explicit string routes
                        context.push(item.route!);
                      }
                    } else {
                      debugPrint('Tapped on announcement: ${item.id}');
                    }
                  },
                );
              },
            );
          },
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 40.0),
              child: CircularProgressIndicator(),
            ),
          ),
          error: (err, st) => Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 40.0),
              child: Column(
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    size: 48,
                    color: Colors.red.shade300,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Failed to load notifications',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.red.shade400,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      ref.invalidate(messagesProvider);
                      ref.invalidate(systemNotificationsProvider);
                    },
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Retry'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF109B85),
                      foregroundColor: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
