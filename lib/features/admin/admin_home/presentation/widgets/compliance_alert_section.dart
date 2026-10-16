import 'package:bhmh/core/router/notification_navigator.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ComplianceAlertSection extends ConsumerWidget {
  const ComplianceAlertSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(complianceAlertsProvider);

    if (alerts.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED), // Subtle Amber background
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFFFEDD5), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF97316).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFF97316), size: 20),
              ),
              const SizedBox(width: 12),
              const Text(
                'Compliance Alerts',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF7C2D12),
                  letterSpacing: -0.5,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF97316),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(
                  '${alerts.length} Action Items',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...alerts.map((alert) => _buildAlertItem(context, alert)),
        ],
      ),
    );
  }

  Widget _buildAlertItem(BuildContext context, dynamic alert) {
    return InkWell(
      onTap: () {
        final command = NotificationNavigator.resolveCommand(
          metadata: {
            'type': 'admin_review_required',
            'employeeId': alert.employeeId,
            'taskId': alert.id,
          },
          isAdmin: true,
        );

        if (command != null) {
          context.pushNamed(
            command.routeName,
            pathParameters: command.pathParameters,
            extra: command.extra,
          );
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: alert.color.withValues(alpha: 0.2), width: 1),
          boxShadow: [
            BoxShadow(
              color: alert.color.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: alert.color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          alert.category.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: alert.color,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        alert.employeeName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF431407),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    alert.taskTitle,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF7C2D12),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: alert.color.withValues(alpha: 0.5)),
          ],
        ),
      ),
    );
  }
}
