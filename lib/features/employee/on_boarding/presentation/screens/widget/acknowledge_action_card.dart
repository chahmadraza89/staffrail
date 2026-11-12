// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AcknowledgeAction extends ConsumerStatefulWidget {
  final String taskId;
  const AcknowledgeAction({super.key, required this.taskId});

  @override
  ConsumerState<AcknowledgeAction> createState() => _AcknowledgeActionState();
}

class _AcknowledgeActionState extends ConsumerState<AcknowledgeAction> {
  bool _isAcknowledged = false;
  bool _isDisposed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initializeState());
  }

  @override
  void deactivate() {
    _isDisposed = true;
    super.deactivate();
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }

  void _safeSetState(VoidCallback fn) {
    if (!_isDisposed && mounted) {
      setState(fn);
    }
  }

  void _initializeState() {
    if (_isDisposed || !mounted) return;
    final taskStatus = ref.read(taskStatusMapProvider)[widget.taskId];
    _safeSetState(() {
      _isAcknowledged =
          taskStatus == TaskStatus.acknowledged ||
          taskStatus == TaskStatus.completed ||
          taskStatus == TaskStatus.verified ||
          taskStatus == TaskStatus.signed ||
          taskStatus == TaskStatus.submitted;
    });
  }

  bool _isLocked(TaskStatus? status) => isTaskLocked(status);

  @override
  Widget build(BuildContext context) {
    final taskStatus = ref.watch(taskStatusMapProvider)[widget.taskId];
    final isLoading = ref.watch(taskViewModelProvider).isLoading;
    final isLocked = _isLocked(taskStatus);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade100, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isLocked)
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2F1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0xFF109B85).withValues(alpha: 0.2),
                  ),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.verified_user_rounded,
                      size: 18,
                      color: Color(0xFF109B85),
                    ),
                    SizedBox(width: 10),
                    Text(
                      'Task Completed & Locked',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF109B85),
                      ),
                    ),
                  ],
                ),
              ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF109B85).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.fact_check_rounded,
                    size: 20,
                    color: Color(0xFF109B85),
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Acknowledge Content',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'Confirm you have read the material',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Material(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                clipBehavior: Clip.antiAlias,
                child: CheckboxListTile(
                value: _isAcknowledged,
                onChanged: (isLoading || isLocked)
                    ? null
                    : (value) =>
                          setState(() => _isAcknowledged = value ?? false),
                title: const Text(
                  'I acknowledge and confirm',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF334155),
                  ),
                ),
                activeColor: const Color(0xFF109B85),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              ),
            ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: SizedBox(
                height: 54,
                child: ElevatedButton(
                  onPressed: _isAcknowledged && !isLoading && !isLocked
                      ? () async {
                          final success = await ref
                              .read(taskViewModelProvider.notifier)
                              .acknowledgeTask(taskId: widget.taskId);

                          if (success && mounted && !_isDisposed) {
                            ToastService.showSuccess(
                              context,
                              'Acknowledgment submitted successfully',
                            );
                          }
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF109B85),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade200,
                    disabledForegroundColor: Colors.grey.shade400,
                    padding: EdgeInsets.zero,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2.5,
                          ),
                        )
                      : const Text(
                          'Submit Acknowledgment',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
