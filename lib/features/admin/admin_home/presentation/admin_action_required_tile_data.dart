import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_action_tile.dart';
import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:developer' as dev;
import 'package:go_router/go_router.dart';

class AdminActionRequiredList extends ConsumerWidget {
  const AdminActionRequiredList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final actionsAsync = ref.watch(adminActionRequiredTasksProvider);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200, width: 1),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF64748B).withValues(alpha: 0.04),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Color(0xFFF59E0B),
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              const Text(
                'Action Required',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          actionsAsync.when(
            data: (tasks) {
              if (tasks.isEmpty) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      'All caught up! No actions required.',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                  ),
                );
              }

              return Column(
                children: tasks.map((task) {
                  return AdminActionTile(
                    name: task.employeeName ?? 'Unknown Employee',
                    task: task.title,
                    statusText: _getStatusLabel(task.status),
                    statusColor: _getStatusColor(task.status),
                    onReviewPressed: () {
                      if (task.employeeId != null) {
                        context.pushNamed(
                          AdminRouteNames.employeeProfile,
                          pathParameters: {'employeeId': task.employeeId!},
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              "Error: This task is not linked to a valid employee ID.",
                            ),
                            backgroundColor: Colors.redAccent,
                          ),
                        );
                      }
                    },
                  );
                }).toList(),
              );
            },
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (e, _) {
              dev.log('❌ [ADMIN-ACTION-LIST] UI Error: $e');
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Error: $e',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.red.shade400, fontSize: 12),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _getStatusLabel(TaskStatus status) {
    switch (status) {
      case TaskStatus.submitted:
        return 'Submitted';
      case TaskStatus.signed:
        return 'Signed';
      case TaskStatus.waitingForApprover:
        return 'Waiting For Approver';
      case TaskStatus.rejected:
        return 'Rejected';
      case TaskStatus.completed:
        return 'Completed';
      case TaskStatus.pending:
        return 'Pending';
      default:
        // Fallback for any other statuses using the smart formatter
        final statusStr = status.name;
        final spaced = statusStr.replaceAllMapped(
          RegExp(r'([A-Z])'),
          (match) => ' ${match.group(0)}',
        );
        return spaced[0].toUpperCase() + spaced.substring(1).trim();
    }
  }

  Color _getStatusColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.submitted:
        return const Color(0xFF3B82F6); // Blue
      case TaskStatus.signed:
        return const Color(0xFF10B981); // Green
      case TaskStatus.waitingForApprover:
        return const Color(0xFFF59E0B); // Orange
      case TaskStatus.rejected:
        return const Color(0xFFEF4444); // Red
      default:
        return const Color(0xFF64748B); // Slate
    }
  }
}
