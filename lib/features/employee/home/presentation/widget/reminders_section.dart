import 'package:bhmh/core/models/app_notification.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/home/presentation/provider/notification_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class RemindersSection extends ConsumerWidget {
  const RemindersSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(systemNotificationsProvider);

    return notificationsAsync.when(
      data: (notifications) {
        // Filter out read notifications and sort by date. Keep only top 3.
        final reminders = notifications
            .where((n) => !n.isRead && n.type == NotificationType.warning)
            .take(3)
            .toList();

        if (reminders.isEmpty) {
          return const SizedBox.shrink(); // Hide panel if no reminders
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: Text(
                'Action Required',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.red.shade700,
                  letterSpacing: -0.3,
                ),
              ),
            ),
            ...reminders.map((reminder) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  border: Border.all(color: Colors.red.shade200),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Material(
                  color: Colors.transparent,
                  clipBehavior: Clip.antiAlias,
                  borderRadius: BorderRadius.circular(12),
                  child: ListTile(
                    leading: Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.red.shade700,
                    ),
                    title: Text(
                      reminder.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: Text(
                      reminder.body,
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                    ),
                    trailing: Icon(
                      Icons.chevron_right,
                      color: Colors.red.shade300,
                    ),
                    onTap: () {
                      // Mark as read
                      final uid = ref.read(authStateProvider).value?.uid;
                      if (uid != null) {
                        ref
                            .read(notificationServiceProvider)
                            .markAsRead(uid, reminder.id);
                      }
                      // Navigate
                      final route = reminder.metadata?['route'] as String?;
                      if (route != null && route.isNotEmpty) {
                        context.go(route);
                      }
                    },
                  ),
                ),
              );
            }),
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}
