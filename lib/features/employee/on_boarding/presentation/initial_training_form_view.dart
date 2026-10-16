import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/initinal_traning_widgets.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/training_audit_table_widget.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/dynamic_form_builder.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

class InitialTrainingFormView extends ConsumerStatefulWidget {
  final String taskId;
  final String? employeeId;
  final String? title; // NEW: Descriptive title

  const InitialTrainingFormView({
    super.key,
    required this.taskId,
    this.employeeId,
    this.title,
  });

  @override
  ConsumerState<InitialTrainingFormView> createState() =>
      _InitialTrainingFormViewState();
}

class _InitialTrainingFormViewState
    extends ConsumerState<InitialTrainingFormView> {
  Map<String, dynamic> _employeeFormData = {};
  Map<String, dynamic> _adminFormData = {};
  String _typedSignature = '';
  String _adminTypedSignature = '';
  bool _isDisposed = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _isDisposed = true;
    super.dispose();
  }

  void _loadInitialData() {
    Future.microtask(() {
      if (_isDisposed) return;
      final tasksAsync = ref.read(
        widget.employeeId != null
            ? employeeTasksStreamProvider(widget.employeeId!)
            : onboardingTasksStreamProvider,
      );

      final task = tasksAsync.value
          ?.where((t) => t.id == widget.taskId)
          .firstOrNull;
      if (task != null) {
        if (mounted) {
          setState(() {
            _employeeFormData = Map<String, dynamic>.from(task.formData ?? {});
            _adminFormData = Map<String, dynamic>.from(
              task.adminFormData ?? {},
            );
            _typedSignature = (task.formData?['signature'] as String? ?? '')
                .replaceFirst('typed:', '');
            _adminTypedSignature =
                task.adminSignatureUrl?.replaceFirst('typed:', '') ?? '';
          });
        }
      }
    });
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
          color: isCompleted ? const Color(0xFF86EFAC) : const Color(0xFFFDE68A),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isCompleted ? Icons.verified_rounded : Icons.schedule_rounded,
            color: isCompleted ? const Color(0xFF16A34A) : const Color(0xFFD97706),
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label ?? (isCompleted ? 'Fully Signed & Verified' : 'Pending Review'),
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isCompleted ? const Color(0xFF16A34A) : const Color(0xFFD97706),
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

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider).value;
    final isGlobalAdmin = user?.role == UserRole.admin;
    final isAdminView =
        widget.employeeId != null &&
        widget.employeeId != user?.uid &&
        isGlobalAdmin;
    final isLoading = ref.watch(taskViewModelProvider).isLoading;

    final tasksAsync = ref.watch(
      widget.employeeId != null
          ? employeeTasksStreamProvider(widget.employeeId!)
          : onboardingTasksStreamProvider,
    );

    return tasksAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
      data: (tasks) {
        final taskOpt = tasks.where((t) => t.id == widget.taskId).toList();
        if (taskOpt.isEmpty) {
          return const Center(child: Text('Task not found'));
        }

        final currentTask = taskOpt.first;
        final isAdmin = isAdminView;

        // Determine status based flags
        final isLocked =
            isTaskLocked(currentTask.status) &&
            currentTask.status != TaskStatus.submitted &&
            currentTask.status != TaskStatus.pendingEmployerSignature;

        final isPendingAdminSign =
            currentTask.status == TaskStatus.submitted ||
            currentTask.status == TaskStatus.signed ||
            currentTask.status == TaskStatus.waitingForApprover ||
            currentTask.status == TaskStatus.pendingEmployerSignature;

        final employeeFields = <FormFieldSchema>[
          const FormFieldSchema(
            name: "fullName",
            type: "text",
            label: "Full Legal Name",
            required: true,
          ),
          const FormFieldSchema(
            name: "position",
            type: "text",
            label: "Position/Title",
            required: true,
          ),
          const FormFieldSchema(
            name: "employmentStartDate",
            type: "date",
            label: "Start Date",
            required: true,
          ),
        ];

        final adminFields = <FormFieldSchema>[
          const FormFieldSchema(
            name: "supervisorTrainer",
            type: "text",
            label: "Supervisor/Trainer Name",
            required: true,
          ),
          const FormFieldSchema(
            name: "verificationDate",
            type: "date",
            label: "Verification Date",
            required: true,
          ),
          const FormFieldSchema(
            name: "comments",
            type: "text",
            label: "Comments (Optional)",
            required: false,
          ),
        ];

        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // HEADER
              const TrainingHeader(),
              const SizedBox(height: 24),

              // METADATA BANNER
              TrainingMetadataBanner(task: currentTask),
              const SizedBox(height: 32),

              // STATUS BANNER (If locked/pending)
              if (isLocked)
                const TrainingStatusBanner(
                  icon: Icons.verified_user_rounded,
                  color: Color(0xFF6366F1), // Indigo Parity
                  text: 'This training record has been finalized and verified.',
                )
              else if (isPendingAdminSign)
                TrainingStatusBanner(
                  icon: Icons.pending_actions_rounded,
                  color: const Color(0xFF6366F1), // Unified Indigo
                  text: isAdmin
                      ? 'Awaiting your counter-signature to finalize.'
                      : 'Pending supervisor verification and counter-signature.',
                ),

              // SECTION 1: Employee Information
              const TrainingSectionHeader(
                title: 'Employee Information',
                icon: Icons.person_outline,
                color: Color(0xFF6366F1),
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
                  'employmentStartDate':
                      (currentTask.formData?['employmentStartDate']
                          as String?) ??
                      '',
                  ...(currentTask.formData?.map(
                        (k, v) => MapEntry(k, v.toString()),
                      ) ??
                      {}),
                },
                isReadOnly:
                    isLocked || isAdmin || (isPendingAdminSign && !isAdmin),
                onChanged: (data) =>
                    _safeSetState(() => _employeeFormData = data),
              ),

              const SizedBox(height: 32),

              // SECTION 2: Initial Training Topics Table
              const TrainingSectionHeader(
                title: 'Required Initial Trainings',
                icon: Icons.list_alt_rounded,
                color: Color(0xFF6366F1),
              ),
              const SizedBox(height: 12),
              TrainingAuditTableWidget(
                topicToTaskIdMap: const {
                  'Types of Services': ['types_of_services'],
                  'Person Centered Planning': ['person_centered_planning'],
                  'Documentation and Timelines': [
                    'documentation_and_timelines',
                  ],
                  'Client Rights & Responsibilities': [
                    'client_rights_responsibilities',
                  ],
                  'Cultural Competency': ['cultural_competency'],
                  'Crisis Intervention Steps': ['crisis_intervention_steps'],
                  'Corporate Compliance & Ethics': [
                    'code_of_conduct_ethics',
                    'corporate_compliance_acknowledge',
                  ],
                  'Confidentiality / HIPAA': [
                    'confidentiality_statement',
                    'corporate_confidentiality_statement',
                    'confidentiality_of_client___therapist___staff',
                  ],
                  'Mandatory Reporting': ['mandatory_reporting'],
                  'Abuse and Neglect Reporting': ['alleged_abuse_neglect'],
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
              TrainingAcknowledgmentSection(
                taskId: widget.taskId,
                task: currentTask,
                isLocked: isLocked,
                isAdmin: isAdmin,
                isPending: isPendingAdminSign,
                employeeFormData: _employeeFormData,
                onChanged: (val) {
                  _safeSetState(
                    () => _employeeFormData['final_ack'] = (val ?? false)
                        .toString(),
                  );
                },
              ),

              const SizedBox(height: 32),

              // Signature Block: Employee
              if (!isLocked && !isAdmin && !isPendingAdminSign) ...[
                TrainingSignatureSection(
                  label: 'Employee/Contractor Signature',
                  value: _typedSignature,
                  isReadOnly: false,
                  isLoading: isLoading,
                  onChanged: (v) => _safeSetState(() => _typedSignature = v),
                  initialValue: _typedSignature.isEmpty
                      ? (currentTask.formData?['signature'] as String? ?? '')
                            .replaceFirst('typed:', '')
                      : null,
                ),
              ] else if (currentTask.signatureUrl != null ||
                  (currentTask.formData?['signature'] as String?)?.isNotEmpty ==
                      true) ...[
                TrainingReadOnlySignature(
                  label: 'Employee/Contractor Signature',
                  value:
                      (currentTask.signatureUrl ??
                              currentTask.formData?['signature'] as String? ??
                              '')
                          .replaceFirst('typed:', ''),
                ),
              ],

              const SizedBox(height: 32),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              const SizedBox(height: 32),

              // SECTION 4: Admin Section (hidden from employee side)
              if (isAdmin) ...[
                const TrainingSectionHeader(
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

                TrainingSignatureSection(
                  label: 'Supervisor Signature',
                  value: _adminTypedSignature,
                  isReadOnly: isLocked,
                  isLoading: isLoading,
                  onChanged: (v) =>
                      _safeSetState(() => _adminTypedSignature = v),
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
                if (currentTask.status == TaskStatus.completed || currentTask.status == TaskStatus.verified)
                  _buildSignedStatusBadge(isCompleted: true)
                else if (isPendingAdminSign)
                  _buildSignedStatusBadge(isCompleted: false, label: 'Pending Supervisor Review'),
              ],

              const SizedBox(height: 48),

              // Action Buttons
              if (!isLocked || (isAdmin && isPendingAdminSign))
                TrainingActionButtons(
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
                    if (success) {
                      if (!context.mounted) return;
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
                      if (!context.mounted) return;
                      if (Navigator.canPop(context)) Navigator.pop(context);
                    }
                  },
                  onEmployeeSubmit: () async {
                    // Validate acknowledgment checkbox
                    final isAcknowledged = _employeeFormData['final_ack'] == 'true' ||
                        currentTask.formData?['final_ack'] == 'true';
                    if (!isAcknowledged) {
                      ToastService.showError(context, 'Please check the acknowledgment box before submitting.');
                      return;
                    }
                    final vm = ref.read(taskViewModelProvider.notifier);
                    final success = await vm.submitSplitForm(
                      taskId: widget.taskId,
                      formData: {
                        ...(currentTask.formData ?? {}),
                        ..._employeeFormData,
                        'signature': _typedSignature.isEmpty
                            ? (currentTask.formData?['signature'] as String? ??
                                  '')
                            : 'typed:$_typedSignature',
                        'signedAt': DateTime.now().toIso8601String(),
                      },
                      signatureData: _typedSignature.isEmpty
                          ? (currentTask.formData?['signature'] as String? ??
                                '')
                          : 'typed:$_typedSignature',
                      taskTitle: widget.title,
                    );
                    if (success) {
                      if (!context.mounted) return;
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
                    if (!context.mounted) return;
                    ToastService.showSuccess(context, 'Draft saved');
                  },
                ),
            ],
          ),
        );
      },
    );
  }
}
