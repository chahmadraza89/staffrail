// =============================================================================
// --- ACTION BUTTONS (WITH TACTILE MICRO-ANIMATIONS) ---
// =============================================================================

import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_tasks_review_widget.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ReviewActionButtons extends ConsumerWidget {
  final CompilationSubTask task;
  final String employeeId;
  final String taskId;
  final bool isProcessing;

  const ReviewActionButtons({
    super.key,
    required this.task,
    required this.employeeId,
    required this.taskId,
    required this.isProcessing,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool isMobile = context.screenWidth < 600;

    final rejectButton = AnimatedActionButton(
      label: 'REJECT & REWORK',
      icon: Icons.close_rounded,
      isDestructive: true,
      isDisabled: isProcessing,
      onTap: () => _showRejectDialog(context, ref),
    );

    final approveButton = AnimatedActionButton(
      label: 'APPROVE & VERIFY',
      icon: Icons.check_rounded,
      isDestructive: false,
      isDisabled: isProcessing,
      onTap: () => _handleApprove(context, ref),
    );

    if (isMobile) {
      return Column(
        children: [
          SizedBox(width: double.infinity, child: approveButton),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: rejectButton),
        ],
      );
    }

    return Row(
      children: [
        Expanded(child: rejectButton),
        const SizedBox(width: 20),
        Expanded(child: approveButton),
      ],
    );
  }

  Future<void> _handleApprove(BuildContext context, WidgetRef ref) async {
    ref.read(adminReviewProcessingProvider).state = true;
    final service = ref.read(onboardingServiceProvider);
    final adminId = ref.read(currentUserProvider).value?.uid;

    try {
      await service.updateTaskStatus(
        uid: employeeId,
        taskId: taskId,
        status: TaskStatus.verified,
        isCompleted: true,
        adminId: adminId,
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              "Task approved successfully!",
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Approval failed: $e"),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      ref.read(adminReviewProcessingProvider).state = false;
    }
  }

  Future<void> _showRejectDialog(BuildContext context, WidgetRef ref) async {
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.4),
      builder: (context) => Dialog(
        elevation: 0,
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          width: 500,
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Reject Submission',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Please provide a reason so the employee knows what to fix.',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: reasonController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Enter reason (e.g. ID image is blurry)',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFFF1F5F9), // Soft slate fill
                  contentPadding: const EdgeInsets.all(16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(
                      color: Color(0xFFEF4444),
                      width: 2,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        if (reasonController.text.isEmpty) return;

                        final service = ref.read(onboardingServiceProvider);
                        final adminId = ref
                            .read(currentUserProvider)
                            .value
                            ?.uid;

                        try {
                          await service.updateTaskStatus(
                            uid: employeeId,
                            taskId: taskId,
                            status: TaskStatus.rejected,
                            isCompleted: false,
                            rejectionReason: reasonController.text,
                            adminId: adminId,
                          );
                          if (context.mounted) {
                            Navigator.pop(context);
                            context.pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  "Task rejected. Employee notified.",
                                ),
                                backgroundColor: Color(0xFFF59E0B),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text("Rejection failed: $e"),
                                backgroundColor: const Color(0xFFEF4444),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Reject',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
