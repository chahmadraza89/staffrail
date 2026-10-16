// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/core/widgets/base_form_wrapper.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class UploadAction extends ConsumerStatefulWidget {
  final String taskId;
  final String? title; // NEW: Descriptive title
  const UploadAction({super.key, required this.taskId, this.title});

  @override
  ConsumerState<UploadAction> createState() => _UploadActionState();
}

class _UploadActionState extends ConsumerState<UploadAction> {
  PlatformFile? _selectedFile;
  bool _isHoveringDropzone = false;
  bool _isDisposed = false;

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

  void _pickFile() async {
    final taskStatus = ref.read(taskStatusMapProvider)[widget.taskId];
    if (isTaskLocked(taskStatus)) return;
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        withData: true,
      );

      if (result != null && result.files.isNotEmpty) {
        _safeSetState(() {
          _selectedFile = result.files.first;
        });
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(context, 'Failed to pick file: $e');
      }
    }
  }

  void _clearFile() {
    _safeSetState(() {
      _selectedFile = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        final taskStatus = ref.watch(taskStatusMapProvider)[widget.taskId];
        final isLoading = ref.watch(taskViewModelProvider).isLoading;
        final isLocked = isTaskLocked(taskStatus);
        final bool hasFile = _selectedFile != null;

        return BaseFormWrapper(
          taskId: widget.taskId,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 500),
                  child: MouseRegion(
                    onEnter: (_) =>
                        _safeSetState(() => _isHoveringDropzone = true),
                    onExit: (_) =>
                        _safeSetState(() => _isHoveringDropzone = false),
                    child: InkWell(
                      onTap: (isLoading || isLocked) ? null : _pickFile,
                      borderRadius: BorderRadius.circular(16),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 32,
                        ),
                        decoration: BoxDecoration(
                          color: hasFile
                              ? const Color(0xFF109B85).withValues(alpha: 0.04)
                              : (_isHoveringDropzone
                                    ? const Color(0xFFF1F5F9)
                                    : Colors.grey.shade50),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: hasFile
                                ? const Color(0xFF109B85)
                                : (_isHoveringDropzone
                                      ? Colors.grey.shade400
                                      : Colors.grey.shade200),
                            width: hasFile ? 2 : 1.5,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: hasFile
                                    ? const Color(
                                        0xFF109B85,
                                      ).withValues(alpha: 0.1)
                                    : Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                hasFile
                                    ? Icons.insert_drive_file_rounded
                                    : Icons.cloud_upload_outlined,
                                size: 32,
                                color: hasFile
                                    ? const Color(0xFF109B85)
                                    : Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              hasFile ? _selectedFile!.name : 'Upload Document',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: hasFile
                                    ? const Color(0xFF109B85)
                                    : const Color(0xFF0F172A),
                                letterSpacing: -0.2,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              hasFile
                                  ? 'File ready for upload'
                                  : 'Tap to select or drag & drop',
                              style: TextStyle(
                                fontSize: 13,
                                color: hasFile
                                    ? const Color(
                                        0xFF109B85,
                                      ).withValues(alpha: 0.7)
                                    : Colors.grey.shade500,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (hasFile && !isLocked) ...[
                              const SizedBox(height: 16),
                              TextButton.icon(
                                onPressed: _clearFile,
                                icon: const Icon(
                                  Icons.refresh_rounded,
                                  size: 18,
                                ),
                                label: const Text('Change File'),
                                style: TextButton.styleFrom(
                                  foregroundColor: const Color(0xFF109B85),
                                  backgroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _selectedFile == null || isLoading || isLocked
                          ? null
                          : () async {
                              final success = await ref
                                  .read(taskViewModelProvider.notifier)
                                  .uploadFileForTask(
                                    taskId: widget.taskId,
                                    taskTitle: widget.title,
                                    file: _selectedFile,
                                    asDraft: true,
                                  );
                              if (success && mounted) {
                                ToastService.showSuccess(
                                  context,
                                  'Draft saved successfully',
                                );
                              }
                            },
                      icon: const Icon(Icons.save_outlined, size: 18),
                      label: const Text('Save Draft'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF64748B),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomButton(
                      isLoading: isLoading,
                      onPressed: _selectedFile != null && !isLocked
                          ? () async {
                              final success = await ref
                                  .read(taskViewModelProvider.notifier)
                                  .uploadFileForTask(
                                    taskId: widget.taskId,
                                    taskTitle: widget.title,
                                    file: _selectedFile,
                                    asDraft: false,
                                  );
                              if (success && mounted) {
                                ToastService.showSuccess(
                                  context,
                                  'Document submitted successfully',
                                );
                                _safeSetState(() {
                                  _selectedFile = null;
                                });
                              }
                            }
                          : null,
                      text: 'Submit',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: isLoading || isLocked
                      ? null
                      : () async {
                          if (_selectedFile != null) {
                            await ref
                                .read(taskViewModelProvider.notifier)
                                .uploadFileForTask(
                                  taskId: widget.taskId,
                                  file: _selectedFile,
                                  asDraft: true,
                                );
                          }
                          if (mounted && context.mounted) {
                            context.pop();
                          }
                        },
                  icon: const Icon(Icons.save, size: 18),
                  label: const Text('Save & Exit'),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF109B85),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
