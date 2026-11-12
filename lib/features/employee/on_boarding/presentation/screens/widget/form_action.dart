// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class FormAction extends ConsumerStatefulWidget {
  final String taskId;
  final String? title; // NEW: Descriptive title
  const FormAction({super.key, required this.taskId, this.title});

  @override
  ConsumerState<FormAction> createState() => _FormActionState();
}

class _FormActionState extends ConsumerState<FormAction> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  bool _isSubmittingSuccessfully = false;
  bool _isDisposed = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _initializeFields());
  }

  @override
  void deactivate() {
    _isDisposed = true;
    super.deactivate();
  }

  @override
  void dispose() {
    _isDisposed = true;
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _safeSetState(VoidCallback fn) {
    if (!_isDisposed && mounted) {
      setState(fn);
    }
  }

  void _initializeFields() {
    final fields = _getFieldsForTask(widget.taskId);
    final tasksAsync = ref.read(onboardingTasksStreamProvider);

    Map<String, dynamic>? existingData;
    tasksAsync.whenData((tasks) {
      final task = tasks.cast<CompilationSubTask?>().firstWhere(
        (t) => t?.id == widget.taskId,
        orElse: () => null,
      );
      existingData = task?.formData;

      if (existingData != null) {
        for (final field in fields) {
          if (existingData!.containsKey(field)) {
            _controllers[field]?.text = existingData![field]?.toString() ?? '';
          }
        }
      }
    });

    for (final field in fields) {
      _controllers[field] = TextEditingController();
    }
    if (mounted) setState(() {});
  }

  List<String> _getFieldsForTask(String taskId) {
    if (taskId.toLowerCase().contains('contact')) {
      return ['Phone Number', 'Secondary Phone', 'Email Address'];
    } else if (taskId.toLowerCase().contains('emergency')) {
      return ['Contact Name', 'Relationship', 'Primary Phone'];
    } else if (taskId.toLowerCase().contains('personal')) {
      return ['Full Name', 'Date of Birth', 'Home Address'];
    }
    return ['Full Name', 'Note'];
  }

  Map<String, String> _collectData() {
    return _controllers.map(
      (key, controller) => MapEntry(key, controller.text),
    );
  }

  bool _isLocked(TaskStatus? status) => isTaskLocked(status);

  @override
  Widget build(BuildContext context) {
    final taskStatus = ref.watch(taskStatusMapProvider)[widget.taskId];
    final isLoading = ref.watch(taskViewModelProvider).isLoading;
    final isLocked = _isLocked(taskStatus);

    // ── Reactive Error Handling ───────────────────────────────
    ref.listen<AsyncValue<void>>(taskViewModelProvider, (previous, next) {
      next.whenOrNull(
        error: (error, stack) {
          final userFriendlyMessage =
              AppErrorMapper.getUserFriendlyMessage(error);
          ToastService.showError(context, userFriendlyMessage);
        },
      );
    });

    return Container(
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
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isLocked)
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.lock_outline,
                      size: 16,
                      color: Color(0xFF64748B),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Task Submitted - Locked',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
            ..._controllers.entries.map((entry) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.key,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF334155),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: entry.value,
                      enabled: !isLocked && !isLoading,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: isLocked
                            ? Colors.grey.shade50
                            : Colors.white,
                        hintText: 'Enter ${entry.key.toLowerCase()}',
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF109B85),
                            width: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isLoading || isLocked || _isSubmittingSuccessfully
                    ? null
                    : () async {
                        final success = await ref
                            .read(taskViewModelProvider.notifier)
                            .submitFormData(
                              taskId: widget.taskId,
                              taskTitle: widget.title,
                              formData: _collectData(),
                              isDraft: false,
                            );
                        if (success && mounted) {
                          _safeSetState(() => _isSubmittingSuccessfully = true);
                          ToastService.showSuccess(
                            context,
                            'Form submitted successfully',
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF109B85),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: (isLoading || _isSubmittingSuccessfully)
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : const Text(
                        'Submit Form',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
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
