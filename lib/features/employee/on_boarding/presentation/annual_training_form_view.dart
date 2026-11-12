// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/core/widgets/base_form_wrapper.dart';
import 'package:bhmh/core/widgets/dynamic_form_builder.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/training_audit_table_widget.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/annual_training_component.dart';
import 'package:google_fonts/google_fonts.dart';

// =============================================================================
// ANNUAL TRAINING FORM VIEW (v0.1)
// =============================================================================
// Specialized high-fidelity form for Category 4: Annual Training.
// Features a structured table for training topics, dual-signature support,
// and audit-ready data tracking.
// =============================================================================

class AnnualTrainingFormView extends ConsumerStatefulWidget {
  final String taskId;
  final String? employeeId; // Required when admin is viewing
  final String? title; // Descriptive title

  const AnnualTrainingFormView({
    super.key,
    required this.taskId,
    this.employeeId,
    this.title,
  });

  @override
  ConsumerState<AnnualTrainingFormView> createState() =>
      _AnnualTrainingFormViewState();
}

class _AnnualTrainingFormViewState
    extends ConsumerState<AnnualTrainingFormView> {
  bool _isDisposed = false;
  Map<String, String> _employeeFormData = {};
  Map<String, String> _adminFormData = {};
  String _typedSignature = '';
  String _adminTypedSignature = '';

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }

  void _safeSetState(VoidCallback fn) {
    if (!_isDisposed && mounted) setState(fn);
  }

  /// Industry-standard signed/pending status badge for employee view.
  Widget _buildSignedStatusBadge({required bool isCompleted, String? label}) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isCompleted ? const Color(0xFFF0FDF4) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCompleted
              ? const Color(0xFF86EFAC)
              : const Color(0xFFFDE68A),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isCompleted ? Icons.verified_rounded : Icons.schedule_rounded,
            color: isCompleted
                ? const Color(0xFF16A34A)
                : const Color(0xFFD97706),
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label ??
                  (isCompleted ? 'Fully Signed & Verified' : 'Pending Review'),
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isCompleted
                    ? const Color(0xFF16A34A)
                    : const Color(0xFFD97706),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<String?> _showRejectionDialog(BuildContext context) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Submission'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Please provide a reason for rejection.',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Enter reason...',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  CompilationSubTask _createFallbackTask() {
    return CompilationSubTask(
      id: widget.taskId,
      title: 'Annual Training',
      subtitle: 'Record Form',
      actionType: TaskActionType.splitField,
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider).value;
    final isAdmin = user?.role == UserRole.admin;
    final isLoading = ref.watch(taskViewModelProvider).isLoading;

    final tasksAsync = ref.watch(
      widget.employeeId != null
          ? employeeTasksStreamProvider(widget.employeeId!)
          : onboardingTasksStreamProvider,
    );
    final currentTask =
        tasksAsync.value?.cast<CompilationSubTask?>().firstWhere(
          (t) => t?.id == widget.taskId,
          orElse: () => _createFallbackTask(),
        ) ??
        _createFallbackTask();

    final taskStatus = currentTask.status;

    final isPendingAdminSign =
        taskStatus == TaskStatus.submitted ||
        taskStatus == TaskStatus.signed ||
        taskStatus == TaskStatus.waitingForApprover ||
        taskStatus == TaskStatus.pendingEmployerSignature;

    final isLocked =
        isTaskLocked(taskStatus) &&
        taskStatus != TaskStatus.submitted &&
        taskStatus != TaskStatus.pendingEmployerSignature;

    final employeeFields = [
      const FormFieldSchema(name: 'fullName', label: 'Full Legal Name'),
      const FormFieldSchema(name: 'position', label: 'Position/Title'),
      const FormFieldSchema(
        name: 'trainingDate',
        label: 'Start Date',
        type: 'date',
      ),
    ];

    final adminFields = [
      const FormFieldSchema(
        name: 'supervisorTrainer',
        label: 'Supervisor/Trainer',
      ),
      const FormFieldSchema(
        name: 'verificationDate',
        label: 'Verification Date',
        type: 'date',
      ),
      const FormFieldSchema(
        name: 'comments',
        label: 'Comments',
        type: 'textarea',
        required: false,
      ),
    ];

    return BaseFormWrapper(
      taskId: widget.taskId,
      lockMessage: 'Fully Signed & Locked',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AnnualTrainingHeader(),
          const SizedBox(height: 24),

          // Metadata Banner
          AnnualTrainingMetadataBanner(task: currentTask),
          const SizedBox(height: 24),

          // Status Indicators
          if (isPendingAdminSign && !isAdmin)
            const AnnualTrainingStatusBanner(
              icon: Icons.hourglass_top_rounded,
              color: Color(0xFFF59E0B),
              text: 'Awaiting supervisor counter-signature',
            ),
          if (isPendingAdminSign && isAdmin)
            const AnnualTrainingStatusBanner(
              icon: Icons.edit_note_rounded,
              color: Color(0xFF3B82F6),
              text: 'Supervisor verification required',
            ),

          // SECTION 1: Employee/Contractor Info
          const AnnualTrainingSectionHeader(
            title: 'Employee Section',
            icon: Icons.person_outline,
            color: Color(0xFF109B85),
          ),
          const SizedBox(height: 16),

          DynamicFormBuilder(
            key: ValueKey('employee_meta_${widget.taskId}'),
            fields: employeeFields,
            initialData: {
              'fullName':
                  (currentTask.formData?['fullName'] as String?) ??
                  user?.name ??
                  '',
              'position':
                  (currentTask.formData?['position'] as String?) ??
                  user?.department ??
                  '',
              'trainingDate':
                  (currentTask.formData?['trainingDate'] as String?) ?? '',
              ...(currentTask.formData?.map(
                    (k, v) => MapEntry(k, v.toString()),
                  ) ??
                  {}),
            },
            isReadOnly: isLocked || isAdmin || (isPendingAdminSign && !isAdmin),
            onChanged: (data) => _safeSetState(() => _employeeFormData = data),
          ),

          const SizedBox(height: 32),

          // SECTION 2: Annual Training Topics Table
          const AnnualTrainingSectionHeader(
            title: 'Annual Training Topics',
            icon: Icons.list_alt_rounded,
            color: Color(0xFF6366F1),
          ),
          const SizedBox(height: 12),
          TrainingAuditTableWidget(
            topicToTaskIdMap: const {
              'Code of Conduct & Corporate Compliance': [
                'code_of_conduct_ethics',
                'corporate_compliance_acknowledge',
              ],
              'Cultural Competency Refresher': ['cultural_competency'],
              'Ethics and Professional Conduct': ['code_of_conduct_ethics'],
              'HIPAA and Confidentiality': [
                'confidentiality_statement',
                'corporate_confidentiality_statement',
                'confidentiality_of_client___therapist___staff',
              ],
              'Workplace Safety & Emergency Preparedness': [
                'acknowledge_of_eoc_health_&_safety_policy',
              ],
              'Abuse, Neglect, and Exploitation Reporting': [
                'alleged_abuse_neglect',
              ],
              'Infection Control Refresher': ['infection_control_refresher'],
              'Trauma-Informed Care Practices': [
                'trauma_informed_care_practices',
              ],
            },
            task: currentTask,
            allTasks: tasksAsync.value,
            isLocked: isLocked,
            isAdmin: isAdmin,
            isPending: isPendingAdminSign,
            employeeFormData: _employeeFormData,
            onChanged: (fieldId, value) {
              _safeSetState(
                () => _employeeFormData[fieldId] = value.toString(),
              );
            },
          ),

          const SizedBox(height: 32),

          // SECTION 3: Acknowledgment
          AnnualTrainingAcknowledgmentSection(
            taskId: widget.taskId,
            task: currentTask,
            isLocked: isLocked,
            isAdmin: isAdmin,
            isPending: isPendingAdminSign,
            employeeFormData: _employeeFormData,
            onChanged: (val) {
              _safeSetState(
                () =>
                    _employeeFormData['final_ack'] = (val ?? false).toString(),
              );
            },
          ),

          const SizedBox(height: 32),

          // Signature Block: Employee
          if (!isLocked && !isAdmin && !isPendingAdminSign) ...[
            AnnualTrainingSignatureSection(
              label: 'Employee/Contractor Signature',
              value: _typedSignature,
              isReadOnly: false,
              isLoading: isLoading,
              onChanged: (v) => _safeSetState(() => _typedSignature = v),
              initialValue: _typedSignature.isEmpty
                  ? (currentTask.formData?['signature'] as String? ?? '')
                  : null,
            ),
          ] else if (currentTask.signatureUrl != null ||
              (currentTask.formData?['signature'] as String?)?.isNotEmpty ==
                  true) ...[
            AnnualTrainingReadOnlySignature(
              label: 'Employee/Contractor Signature',
              value:
                  (currentTask.signatureUrl ??
                          currentTask.formData?['signature'] as String? ??
                          '')
                      .replaceFirst('typed:', ''),
            ),
          ],

          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: 32),

          // SECTION 4: Admin Section (hidden from employee side)
          if (isAdmin) ...[
            const AnnualTrainingSectionHeader(
              title: 'Supervisor / Trainer Section',
              icon: Icons.admin_panel_settings_outlined,
              color: Color(0xFF3B82F6),
            ),
            const SizedBox(height: 16),

            DynamicFormBuilder(
              key: ValueKey('admin_meta_${widget.taskId}'),
              fields: adminFields,
              initialData: currentTask.adminFormData?.map(
                (k, v) => MapEntry(k, v.toString()),
              ),
              isReadOnly: !isAdmin || isLocked,
              onChanged: (data) => _safeSetState(() => _adminFormData = data),
            ),

            AnnualTrainingSignatureSection(
              label: 'Supervisor Signature',
              value: _adminTypedSignature,
              isReadOnly: isLocked,
              isLoading: isLoading,
              onChanged: (v) => _safeSetState(() => _adminTypedSignature = v),
              initialValue: _adminTypedSignature.isEmpty
                  ? (currentTask.adminSignatureUrl?.replaceFirst(
                          'typed:',
                          '',
                        ) ??
                        '')
                  : null,
            ),
          ],

          // Signed Status Badge (employee side only)
          if (!isAdmin) ...[
            if (taskStatus == TaskStatus.completed ||
                taskStatus == TaskStatus.verified)
              _buildSignedStatusBadge(isCompleted: true)
            else if (isPendingAdminSign)
              _buildSignedStatusBadge(
                isCompleted: false,
                label: 'Pending Supervisor Review',
              ),
          ],

          const SizedBox(height: 48),

          // Action Buttons
          if (!isLocked || (isAdmin && isPendingAdminSign))
            AnnualTrainingActionButtons(
              isAdmin: isAdmin,
              isLoading: isLoading,
              onAdminVerify: () async {
                final vm = ref.read(taskViewModelProvider.notifier);
                final success = await vm.adminCounterSign(
                  taskId: widget.taskId,
                  adminFormData: {
                    ...(currentTask.adminFormData ?? {}),
                    ..._adminFormData,
                  },
                  adminSignatureData: _adminTypedSignature.isEmpty
                      ? (currentTask.adminSignatureUrl ??
                            'typed:$_adminTypedSignature')
                      : 'typed:$_adminTypedSignature',
                  employeeId: widget.employeeId,
                  taskTitle: widget.title,
                );
                if (success && mounted) {
                  ToastService.showSuccess(
                    context,
                    'Training record finalized',
                  );
                }
              },
              onAdminReject: () async {
                final reason = await _showRejectionDialog(context);
                if (reason != null && mounted) {
                  await ref
                      .read(adminDirectoryActionsProvider.notifier)
                      .rejectTask(
                        employeeId: widget.employeeId ?? '',
                        taskId: widget.taskId,
                        taskSource: currentTask.taskSource,
                        reason: reason,
                        employeeName: currentTask.employeeName,
                      );
                  if (Navigator.canPop(context)) Navigator.pop(context);
                }
              },
              onEmployeeSubmit: () async {
                // Validate acknowledgment checkbox
                final isAcknowledged =
                    _employeeFormData['final_ack'] == 'true' ||
                    currentTask.formData?['final_ack'] == 'true';
                if (!isAcknowledged) {
                  ToastService.showError(
                    context,
                    'Please check the acknowledgment box before submitting.',
                  );
                  return;
                }
                final vm = ref.read(taskViewModelProvider.notifier);
                final success = await vm.submitSplitForm(
                  taskId: widget.taskId,
                  formData: {
                    ...(currentTask.formData ?? {}),
                    ..._employeeFormData,
                    'signature': _typedSignature.isEmpty
                        ? (currentTask.formData?['signature'] as String? ?? '')
                        : 'typed:$_typedSignature',
                    'signedAt': DateTime.now().toIso8601String(),
                  },
                  signatureData: _typedSignature.isEmpty
                      ? (currentTask.formData?['signature'] as String? ?? '')
                      : 'typed:$_typedSignature',
                  taskTitle: widget.title,
                );
                if (success && mounted) {
                  ToastService.showSuccess(
                    context,
                    'Submitted for verification',
                  );
                }
              },
              onEmployeeSaveDraft: () async {
                final vm = ref.read(taskViewModelProvider.notifier);
                await vm.submitFormData(
                  taskId: widget.taskId,
                  taskTitle: widget.title,
                  formData: _employeeFormData,
                  isDraft: true,
                );
                if (mounted) ToastService.showSuccess(context, 'Draft saved');
              },
            ),
        ],
      ),
    );
  }
}
