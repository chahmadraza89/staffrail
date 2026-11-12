// ignore_for_file: use_build_context_synchronously
import 'dart:developer';
import 'package:intl/intl.dart';

import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/shared/compatemcey_evaulation_form.dart';
import 'package:bhmh/core/extensions/string_extensions.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/core/widgets/base_form_wrapper.dart';
import 'package:bhmh/core/widgets/dynamic_form_builder.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/split_filed_compontent.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';

// =============================================================================
// SPLIT-FIELD FORM VIEW (v0.1)
// =============================================================================
// Dual-role form for documents that require both employee AND admin input.
// Examples: Confidentiality Agreement, Transportation Acknowledgment, etc.
//
// Flow:
//   1. Employee fills their fields → submits → status = pendingEmployerSignature
//   2. Admin opens same view → sees employee data (read-only) + admin fields
//   3. Admin fills their fields → counter-signs → status = completed + isLocked
//
// Role detection uses ref.watch(currentUserProvider) to show/hide sections.
// =============================================================================

class SplitFieldFormView extends ConsumerStatefulWidget {
  final String taskId;
  final String? title; // Descriptive title
  final String? employeeId;
  final CompilationSubTask?
  initialTask; // Optional initial task to avoid first-load flicker

  const SplitFieldFormView({
    super.key,
    required this.taskId,
    this.title,
    this.employeeId,
    this.initialTask,
  });

  @override
  ConsumerState<SplitFieldFormView> createState() => _SplitFieldFormViewState();
}

class _SplitFieldFormViewState extends ConsumerState<SplitFieldFormView> {
  bool _isDisposed = false;
  Map<String, String> _employeeFormData = {};
  Map<String, String> _adminFormData = {};
  String _typedSignature = '';
  String _adminTypedSignature = '';

  PlatformFile? _selectedFile;
  bool _completedVirtually = false;
  bool _isCompletedVirtuallyInitialized = false;

  @override
  void didUpdateWidget(covariant SplitFieldFormView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.taskId != widget.taskId) {
      _selectedFile = null;
      _completedVirtually = false;
      _isCompletedVirtuallyInitialized = false;
    }
  }

  void _pickFile() async {
    try {
      final filePicker = ref.read(filePickerServiceProvider);
      final file = await filePicker.pickPDF(context: context);
      if (file != null) {
        _safeSetState(() {
          _selectedFile = file;
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

  Widget _buildTaxFormEmployeeSection({
    required CompilationSubTask? task,
    required bool isEmployeeReadOnly,
    required String blankFormLink,
  }) {
    final hasUploadedFile =
        (task?.fileUrl != null && task!.fileUrl!.isNotEmpty) ||
        _selectedFile != null;
    final uploadedFileName = _selectedFile != null
        ? _selectedFile!.name
        : (task?.fileUrl != null ? task!.fileUrl!.getCleanFileName() : '');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Card 1: Download / Open Blank Form ────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0F2FE),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.picture_as_pdf_rounded,
                      color: Color(0xFF0284C7),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Blank Form PDF',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: const Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Download, fill, and sign the official document.',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      final uri = Uri.parse(blankFormLink);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        );
                      } else {
                        if (mounted) {
                          ToastService.showError(
                            context,
                            'Could not open blank form link',
                          );
                        }
                      }
                    } catch (e) {
                      if (mounted) {
                        ToastService.showError(
                          context,
                          'Invalid blank form link',
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  label: const Text('Download / Open'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // ── Card 2: Virtual Completion Checkbox ──────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _completedVirtually ? const Color(0xFFF0FDFA) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _completedVirtually
                  ? const Color(0xFF99F6E4)
                  : const Color(0xFFE2E8F0),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: _completedVirtually,
                    activeColor: const Color(0xFF0D9488),
                    onChanged: isEmployeeReadOnly
                        ? null
                        : (val) {
                            _safeSetState(() {
                              _completedVirtually = val ?? false;
                            });
                          },
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'I completed this form virtually through Adobe.',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: const Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Check this if you filled out and signed the document electronically via Adobe Acrobat, Adobe Sign, or a similar virtual signature platform.',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFF64748B),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // ── Card 3: File Upload Area ─────────────────────────────────────────
        if (!_completedVirtually) ...[
          Text(
            'Upload Completed Form',
            style: GoogleFonts.inter(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              color: const Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: isEmployeeReadOnly ? null : _pickFile,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: BoxDecoration(
                color: hasUploadedFile
                    ? const Color(0xFFF0FDF4)
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: hasUploadedFile
                      ? const Color(0xFF86EFAC)
                      : const Color(0xFFCBD5E1),
                  style: hasUploadedFile ? BorderStyle.solid : BorderStyle.none,
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    hasUploadedFile
                        ? Icons.check_circle_rounded
                        : Icons.cloud_upload_outlined,
                    color: hasUploadedFile
                        ? const Color(0xFF16A34A)
                        : const Color(0xFF64748B),
                    size: 32,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    hasUploadedFile ? uploadedFileName : 'No file uploaded yet',
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: hasUploadedFile
                          ? const Color(0xFF16A34A)
                          : const Color(0xFF475569),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (!hasUploadedFile) ...[
                    const SizedBox(height: 4),
                    Text(
                      'PDF format required. Max size 10MB.',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: const Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                  if (hasUploadedFile && !isEmployeeReadOnly) ...[
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _clearFile,
                      child: Text(
                        'Remove & Upload New File',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: const Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ],
                  if (hasUploadedFile &&
                      isEmployeeReadOnly &&
                      task?.fileUrl != null) ...[
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: () async {
                        try {
                          final uri = Uri.parse(task!.fileUrl!);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(
                              uri,
                              mode: LaunchMode.externalApplication,
                            );
                          } else {
                            if (mounted) {
                              ToastService.showError(
                                context,
                                'Could not open file link',
                              );
                            }
                          }
                        } catch (e) {
                          if (mounted) {
                            ToastService.showError(
                              context,
                              'Invalid file link',
                            );
                          }
                        }
                      },
                      icon: const Icon(Icons.download_rounded, size: 14),
                      label: const Text('View Uploaded File'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
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
        ] else ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: Color(0xFF64748B),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'File upload is optional because you marked this form as completed virtually.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (hasUploadedFile) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle_rounded,
                    color: Color(0xFF16A34A),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      uploadedFileName,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: const Color(0xFF16A34A),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (!isEmployeeReadOnly)
                    IconButton(
                      icon: const Icon(Icons.close, color: Color(0xFFDC2626)),
                      onPressed: _clearFile,
                    )
                  else if (task?.fileUrl != null)
                    TextButton.icon(
                      onPressed: () async {
                        try {
                          final uri = Uri.parse(task!.fileUrl!);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(
                              uri,
                              mode: LaunchMode.externalApplication,
                            );
                          } else {
                            if (mounted) {
                              ToastService.showError(
                                context,
                                'Could not open file link',
                              );
                            }
                          }
                        } catch (e) {
                          if (mounted) {
                            ToastService.showError(
                              context,
                              'Invalid file link',
                            );
                          }
                        }
                      },
                      icon: const Icon(Icons.download_rounded, size: 14),
                      label: const Text('View'),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF16A34A),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ],
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
              'Please provide a reason for rejecting this document. This will be shown to the employee.',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Enter rejection reason...',
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
    final currentUser = ref.watch(currentUserProvider).value;
    final tasksAsync = ref.watch(
      widget.employeeId != null
          ? employeeTasksStreamProvider(widget.employeeId!)
          : onboardingTasksStreamProvider,
    );
    // ── Get task data ───────────────────────────────────────────────
    final currentTask =
        tasksAsync.value?.cast<CompilationSubTask?>().firstWhere(
          (t) => t?.id == widget.taskId,
          orElse: () => widget.initialTask,
        ) ??
        widget.initialTask;

    if (!_isCompletedVirtuallyInitialized && currentTask != null) {
      _completedVirtually =
          currentTask.formData?['completedVirtually'] == 'true';
      _isCompletedVirtuallyInitialized = true;
    }

    // IMPORTANT: Use the actual task status from the stream, NOT the local map
    // which only contains the current user's (admin's) own tasks.
    final taskStatus = currentTask?.status ?? TaskStatus.notStarted;
    final isLoading = ref.watch(taskViewModelProvider).isLoading;

    // ── Determine current user role ─────────────────────────────────
    final isAdmin = currentUser?.role == UserRole.admin;
    final isPendingAdminSign =
        taskStatus == TaskStatus.pendingEmployerSignature ||
        taskStatus == TaskStatus.submitted ||
        taskStatus == TaskStatus.waitingForApprover;
    final isRejected = taskStatus == TaskStatus.rejected;

    // For Split-Field, it's only locked when COMPLETED, not just submitted.
    final isLocked =
        isTaskLocked(taskStatus) &&
        taskStatus != TaskStatus.submitted &&
        taskStatus != TaskStatus.pendingEmployerSignature;

    // Debug helper (logs to console to help track role/status issues)
    log(
      '🔍 [SplitFieldForm] Task: ${widget.taskId} | Status: $taskStatus | IsAdmin: $isAdmin',
    );

    // ── Specialized schemas for Driver's Verification ─────────────────
    // Handle both 'driver's_verification' and 'driver's_license' with robust ID check
    final taskIdNormalized = widget.taskId.toLowerCase().replaceAll('’', "'");
    final isDriversVerification =
        taskIdNormalized.contains('driver') &&
        !taskIdNormalized.contains('license');
    final isCodeOfConduct = widget.taskId == 'code_of_conduct_ethics';

    final isInitialOrientation =
        widget.taskId == 'initial_orientation' ||
        widget.taskId == 'bhmh_initial_orientation';

    final isCsspCompetency =
        widget.taskId == 'cssp_competency' ||
        widget.taskId == 'qmhp_cs_competency' ||
        widget.taskId == 'lpha_competency';

    final isI9Form = widget.taskId == 'tax_documents_i_9';
    final isW9Form = widget.taskId == 'tax_documents_w_9';
    final isW4Form =
        widget.taskId == 'tax_documents_w_4' ||
        widget.taskId == 'tax_documents_w_1';
    final isW1Form = widget.taskId == 'tax_documents_w_1';

    final isTaxForm = isI9Form || isW9Form || isW4Form || isW1Form;
    final isTaxCustomForm = isI9Form || isW9Form;

    final employeeFields = isCsspCompetency
        ? CompetencyEvaluationSchemas.getEmployeeFields(widget.taskId)
        : isDriversVerification
        ? [
            const FormFieldSchema(
              name: 'ack_refusal',
              label: 'Non-Transport Acknowledgment',
              type: 'checkbox',
              hint:
                  'Due to non-presentation of valid Texas Driver\'s License and/or required Texas Liability vehicle insurance, I will not transport any recipients of this agency at any time, for any reason.',
            ),
            const FormFieldSchema(
              name: 'ack_submitted',
              label: 'Document Submission',
              type: 'checkbox',
              hint:
                  'I have submitted a current Texas Driver\'s License and Texas Liability vehicle insurance.',
            ),
            const FormFieldSchema(
              name: 'ack_future',
              label: 'Future Provision Agreement',
              type: 'checkbox',
              hint:
                  'I will provide Example Health Clinic, LLC Services with current License and Insurance as updated and upon request.',
            ),
            const FormFieldSchema(
              name: 'ack_inspection',
              label: 'Employee Vehicle Inspection Form',
              type: 'checkbox',
              hint:
                  'I certify that the vehicle used for StaffRail business has been inspected and is in safe operating condition.',
            ),
            // Expiration date field (Single slot as requested)
            ...List.generate(
              1,
              (i) => FormFieldSchema(
                name: 'exp_date_${i + 1}',
                label: 'Vehicle Documentation Expiration Date',
                type: 'date',
                required: false,
              ),
            ),
          ]
        : isCodeOfConduct
        ? [
            const FormFieldSchema(name: 'fullName', label: 'Full Legal Name'),
            const FormFieldSchema(name: 'position', label: 'Position/Title'),
            const FormFieldSchema(
              name: 'startDate',
              label: 'Start Date',
              type: 'date',
            ),
            const FormFieldSchema(
              name: 'ethics_1',
              label: 'Conflict of Interest',
              type: 'checkbox',
              hint: 'To avoid real or perceived conflicts of interest',
            ),
            const FormFieldSchema(
              name: 'ethics_2',
              label: 'Honesty in Documentation',
              type: 'checkbox',
              hint:
                  'To be honest and realistic when documenting services provided',
            ),
            const FormFieldSchema(
              name: 'ethics_3',
              label: 'Anti-Bribery',
              type: 'checkbox',
              hint: 'To reject bribery in all its forms',
            ),
            const FormFieldSchema(
              name: 'ethics_4',
              label: 'Service Understanding',
              type: 'checkbox',
              hint:
                  'To improve the understanding of behavioral health services',
            ),
            const FormFieldSchema(
              name: 'ethics_5',
              label: 'Fair Treatment',
              type: 'checkbox',
              hint:
                  'To treat all staff and clients fairly and not engage in any acts of discrimination',
            ),
            const FormFieldSchema(
              name: 'ethics_6',
              label: 'Safe Environment',
              type: 'checkbox',
              hint: 'To provide safe environment for clients and staff',
            ),
            const FormFieldSchema(
              name: 'ethics_7',
              label: 'Legal & HIPAA Compliance',
              type: 'checkbox',
              hint:
                  'Abide by all applicable federal and state laws, including HIPPA',
            ),
            const FormFieldSchema(
              name: 'ethics_8',
              label: 'Final Ethics Agreement',
              type: 'checkbox',
              hint: 'To abide by this Code of Ethics',
            ),
            const FormFieldSchema(
              name: 'final_ack',
              label: 'Acknowledgment',
              type: 'checkbox',
              hint:
                  'I acknowledge that I have received, read, and understood the Code of Ethics/Conduct document and agree to comply with all applicable laws and regulations.',
            ),
          ]
        : isTaxForm
        ? [
            const FormFieldSchema(name: 'fullName', label: 'Full Legal Name'),
            const FormFieldSchema(
              name: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
            ),
            const FormFieldSchema(
              name: 'ssn',
              label: 'SSN',
              hint: 'XXX-XX-XXXX',
            ),
            const FormFieldSchema(
              name: 'address',
              label: 'Current Address',
              type: 'textarea',
            ),
            const FormFieldSchema(name: 'position', label: 'Position/Title'),
            const FormFieldSchema(
              name: 'startDate',
              label: 'Start Date',
              type: 'date',
            ),
            if (isW9Form)
              const FormFieldSchema(
                name: 'w9_certification',
                label: 'Tax Certification',
                type: 'checkbox',
                hint:
                    'I certify under penalties of perjury that the information provided is correct, and I am not subject to backup withholding.',
                required: true,
              ),
            if (isI9Form)
              const FormFieldSchema(
                name: 'i9_certification',
                label: 'I-9 Attestation',
                type: 'checkbox',
                hint:
                    'I attest, under penalty of perjury, that I am a citizen or national of the United States, or a lawful permanent resident, or a noncitizen authorized to work.',
                required: true,
              ),
            if (isW4Form)
              const FormFieldSchema(
                name: 'w4_certification',
                label: 'W-4/W-1 Acknowledgment',
                type: 'checkbox',
                hint:
                    'I certify that the withholding information provided is correct to the best of my knowledge.',
                required: true,
              ),
          ]
        : isInitialOrientation
        ? [
            const FormFieldSchema(name: 'fullName', label: 'Full Legal Name'),
            const FormFieldSchema(name: 'position', label: 'Position/Title'),
            const FormFieldSchema(
              name: 'startDate',
              label: 'Start Date',
              type: 'date',
            ),
          ]
        : [
            const FormFieldSchema(name: 'fullName', label: 'Full Legal Name'),
            const FormFieldSchema(name: 'position', label: 'Position/Title'),
            const FormFieldSchema(
              name: 'startDate',
              label: 'Start Date',
              type: 'date',
            ),
          ];

    // ── Default admin fields ────────────────────────────────────────
    final adminFields = isCsspCompetency
        ? CompetencyEvaluationSchemas.getAdminFields(widget.taskId)
        : isI9Form
        ? [
            const FormFieldSchema(
              name: 'authRepName',
              label: 'Authorized Representative Name',
            ),
            const FormFieldSchema(
              name: 'authRepTitle',
              label: 'Authorized Representative Title',
            ),
            const FormFieldSchema(name: 'orgName', label: 'Organization Name'),
            const FormFieldSchema(
              name: 'verificationDate',
              label: 'Verification Date',
              type: 'date',
            ),
          ]
        : [
            FormFieldSchema(
              name: isInitialOrientation || isTaxForm
                  ? 'supervisorTrainer'
                  : 'supervisorName',
              label: isInitialOrientation || isTaxForm
                  ? 'Supervisor/Trainer Name'
                  : 'Supervisor Name',
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
          // ── Header ──────────────────────────────────────────────────
          const SplitFieldHeader(),
          const SizedBox(height: 20),

          // ── Policy Content (if available) ────────────────────────────
          if (AppLegalContent.get(widget.taskId) != null) ...[
            SplitFieldPolicyContent(taskId: widget.taskId),
          ],

          const SizedBox(height: 4),

          // ── Status Indicator ────────────────────────────────────────
          if (isPendingAdminSign && !isAdmin)
            const SplitFieldStatusBanner(
              icon: Icons.hourglass_top_rounded,
              color: Color(0xFFF59E0B),
              text: 'Awaiting admin counter-signature',
            ),
          if (isPendingAdminSign && isAdmin)
            const SplitFieldStatusBanner(
              icon: Icons.edit_note_rounded,
              color: Color(0xFF3B82F6),
              text: 'Your counter-signature is required',
            ),

          // ── SECTION 1: Employee Fields ─────────────────────────────
          const SplitFieldSectionHeader(
            title: 'Employee Section',
            icon: Icons.person_outline,
            color: Color(0xFF109B85),
          ),
          const SizedBox(height: 12),
          if (isCsspCompetency) ...[
            CompetencyEvaluationTableWidget(
              isAdmin: isAdmin,
              isLocked: isLocked,
              currentTask: currentTask,
              taskId: widget.taskId,
            ),
            const SizedBox(height: 24),
          ],
          if (isInitialOrientation) ...[
            const InitialOrientationTopicsCoveredWidget(),
            const SizedBox(height: 24),
          ],

          if (isRejected && currentTask?.rejectionReason != null) ...[
            SplitFieldRejectionBanner(reason: currentTask!.rejectionReason!),
            const SizedBox(height: 12),
          ],

          if (isTaxCustomForm) ...[
            _buildTaxFormEmployeeSection(
              task: currentTask,
              isEmployeeReadOnly:
                  isLocked || isAdmin || (isPendingAdminSign && !isAdmin),
              blankFormLink:
                  currentTask?.blankFormLink ??
                  (widget.taskId == 'tax_documents_i_9'
                      ? 'https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf'
                      : 'https://www.irs.gov/pub/irs-pdf/fw9.pdf'),
            ),
          ] else ...[
            DynamicFormBuilder(
              key: ValueKey('employee_form_${widget.taskId}'),
              fields: employeeFields,
              initialData: () {
                final rawData =
                    currentTask?.formData?.map(
                      (k, v) => MapEntry(k, v.toString()),
                    ) ??
                    {};

                // Pre-fill common fields from profile if empty
                if ((rawData['fullName'] ?? '').isEmpty) {
                  rawData['fullName'] = currentUser?.name ?? '';
                }
                if ((rawData['position'] ?? '').isEmpty) {
                  rawData['position'] = currentUser?.department ?? '';
                }

                if (isDriversVerification) {
                  // Determine if we have legacy data (old named keys or numbered keys)
                  final bool hasLegacy =
                      rawData.containsKey('ack_license') ||
                      rawData.containsKey('ack_1') ||
                      rawData.containsKey('ack_2') ||
                      rawData.containsKey('ack_3');

                  // ONLY perform mapping if the new keys are missing or effectively empty
                  if (hasLegacy &&
                      (rawData['ack_submitted'] == null ||
                          rawData['ack_submitted'] == 'false')) {
                    final bool hasLicense =
                        rawData['ack_license'] == 'true' ||
                        rawData['ack_1'] == 'true';
                    final bool hasInsurance =
                        rawData['ack_insurance'] == 'true' ||
                        rawData['ack_2'] == 'true';
                    final bool hasInspection =
                        rawData['ack_inspection'] == 'true' ||
                        rawData['ack_4'] == 'true';

                    return {
                      ...rawData,
                      'ack_submitted': (hasLicense && hasInsurance).toString(),
                      'ack_refusal': (!(hasLicense || hasInsurance)).toString(),
                      'ack_future': (hasLicense || hasInsurance).toString(),
                      'ack_inspection': hasInspection.toString(),
                    };
                  }
                }
                return rawData;
              }(),
              isReadOnly:
                  isLocked || isAdmin || (isPendingAdminSign && !isAdmin),
              onChanged: (data) =>
                  _safeSetState(() => _employeeFormData = data),
            ),

            if (!isLocked && !isAdmin && !isPendingAdminSign) ...[
              SplitFieldSignatureSection(
                label: isDriversVerification
                    ? 'Staff/Contractor Signature'
                    : 'Employee Signature',
                value: _typedSignature,
                isReadOnly: isLocked || (isPendingAdminSign && !isAdmin),
                isLoading: isLoading,
                onChanged: (v) => _safeSetState(() => _typedSignature = v),
                initialValue: _typedSignature.isEmpty
                    ? (currentTask?.formData?['signature'] as String? ?? '')
                    : null,
              ),
            ] else if (currentTask?.signatureUrl != null ||
                (currentTask?.formData?['signature'] as String?)?.isNotEmpty ==
                    true) ...[
              SplitFieldReadOnlySignature(
                label: isDriversVerification
                    ? 'Staff/Contractor Signature'
                    : 'Employee Signature',
                value:
                    (currentTask?.signatureUrl ??
                            currentTask?.formData?['signature'] as String? ??
                            '')
                        .replaceFirst('typed:', ''),
              ),
            ],
          ],

          const SizedBox(height: 8),
          const SizedBox(height: 12),

          // ── SECTION 2: Admin Fields (hidden from employee side) ────
          if (isAdmin) ...[
            const SplitFieldSectionHeader(
              title: 'Admin / Supervisor Section',
              icon: Icons.admin_panel_settings_outlined,
              color: Color(0xFF3B82F6),
            ),
            const SizedBox(height: 12),

            DynamicFormBuilder(
              key: ValueKey('admin_form_${widget.taskId}'),
              fields: adminFields,
              initialData: currentTask?.adminFormData?.map(
                (k, v) => MapEntry(k, v.toString()),
              ),
              isReadOnly: !isAdmin || isLocked,
              onChanged: (data) => _safeSetState(() => _adminFormData = data),
            ),

            SplitFieldSignatureSection(
              label: 'Admin Signature',
              value: _adminTypedSignature,
              isReadOnly: isLocked,
              isLoading: isLoading,
              onChanged: (v) => _safeSetState(() => _adminTypedSignature = v),
            ),
          ],

          // ── Signed Status Badge (employee side only) ───────────────
          if (!isAdmin) ...[
            if (taskStatus == TaskStatus.completed ||
                taskStatus == TaskStatus.verified)
              _buildSignedStatusBadge(isCompleted: true)
            else if (isPendingAdminSign)
              _buildSignedStatusBadge(
                isCompleted: false,
                label: 'Pending Admin Review',
              ),
          ],

          const SizedBox(height: 32),

          // ── Action Buttons ─────────────────────────────────────────
          if (!isLocked || (isAdmin && isPendingAdminSign))
            SplitFieldActionButtons(
              isAdmin: isAdmin,
              isLoading: isLoading,
              onAdminSaveDraft: () async {
                final vm = ref.read(taskViewModelProvider.notifier);
                final success = await vm.saveAdminDraft(
                  taskId: widget.taskId,
                  taskTitle: widget.title,
                  adminFormData: {
                    ...(currentTask?.adminFormData ?? {}),
                    ..._adminFormData,
                  },
                  currentStatus: currentTask?.status ?? TaskStatus.notStarted,
                  employeeId: widget.employeeId,
                );
                if (success && mounted && !_isDisposed) {
                  ToastService.showSuccess(context, 'Admin progress saved');
                }
              },
              onAdminReject: () async {
                final reason = await _showRejectionDialog(context);
                if (reason != null && mounted) {
                  await ref
                      .read(adminDirectoryActionsProvider.notifier)
                      .rejectTask(
                        employeeId:
                            widget.employeeId ??
                            ref.read(currentUserProvider).value?.uid ??
                            '',
                        taskId: widget.taskId,
                        taskSource:
                            currentTask?.taskSource ?? TaskSource.onboarding,
                        reason: reason,
                        employeeName: currentTask?.employeeName,
                      );
                  Navigator.of(context).pop();
                }
              },
              onAdminCounterSign:
                  (_adminTypedSignature.trim().length >= 2 ||
                      (currentTask?.adminSignatureUrl?.isNotEmpty ?? false))
                  ? () async {
                      final vm = ref.read(taskViewModelProvider.notifier);
                      final success = await vm.adminCounterSign(
                        taskId: widget.taskId,
                        taskTitle: widget.title,
                        adminFormData: {
                          ...(currentTask?.adminFormData ?? {}),
                          ..._adminFormData,
                        },
                        adminSignatureData: _adminTypedSignature.isEmpty
                            ? (currentTask?.adminSignatureUrl ??
                                  'typed:$_adminTypedSignature')
                            : 'typed:$_adminTypedSignature',
                        employeeId: widget.employeeId,
                      );
                      if (success && mounted && !_isDisposed) {
                        ToastService.showSuccess(
                          context,
                          'Document counter-signed and finalized',
                        );
                      }
                    }
                  : null,
              onEmployeeSaveDraft: () async {
                final vm = ref.read(taskViewModelProvider.notifier);
                if (isTaxCustomForm) {
                  String? uploadedUrl;
                  if (_selectedFile != null) {
                    uploadedUrl = await vm.uploadOnly(
                      taskId: widget.taskId,
                      file: _selectedFile!,
                    );
                    if (uploadedUrl == null) {
                      return;
                    }
                  }
                  final success = await vm.submitFormData(
                    taskId: widget.taskId,
                    taskTitle: widget.title,
                    formData: {
                      ...(currentTask?.formData ?? {}),
                      'completedVirtually': _completedVirtually.toString(),
                    },
                    fileUrl: uploadedUrl ?? currentTask?.fileUrl,
                    isDraft: true,
                  );
                  if (success && mounted && !_isDisposed) {
                    _safeSetState(() {
                      _selectedFile = null;
                    });
                    ToastService.showSuccess(context, 'Draft saved');
                  }
                } else {
                  final success = await vm.submitFormData(
                    taskId: widget.taskId,
                    taskTitle: widget.title,
                    formData: _employeeFormData,
                    isDraft: true,
                  );
                  if (success && mounted && !_isDisposed) {
                    ToastService.showSuccess(context, 'Draft saved');
                  }
                }
              },
              onEmployeeSubmit: isTaxCustomForm
                  ? ((_completedVirtually ||
                            _selectedFile != null ||
                            (currentTask?.fileUrl != null &&
                                currentTask!.fileUrl!.isNotEmpty))
                        ? () async {
                            final vm = ref.read(taskViewModelProvider.notifier);
                            String? uploadedUrl;
                            if (_selectedFile != null) {
                              uploadedUrl = await vm.uploadOnly(
                                taskId: widget.taskId,
                                file: _selectedFile!,
                              );
                              if (uploadedUrl == null) {
                                return;
                              }
                            }
                            final success = await vm.submitSplitForm(
                              taskId: widget.taskId,
                              taskTitle: widget.title,
                              formData: {
                                ...(currentTask?.formData ?? {}),
                                'completedVirtually': _completedVirtually
                                    .toString(),
                              },
                              fileUrl: uploadedUrl ?? currentTask?.fileUrl,
                              signatureData: '',
                            );
                            if (success && mounted && !_isDisposed) {
                              _safeSetState(() {
                                _selectedFile = null;
                              });
                              ToastService.showSuccess(
                                context,
                                'Submitted — Awaiting admin counter-signature',
                              );
                            }
                          }
                        : null)
                  : (((_employeeFormData.isNotEmpty ||
                                (currentTask?.formData?.isNotEmpty ?? false)) &&
                            (_typedSignature.trim().length >= 2 ||
                                ((currentTask?.formData?['signature']
                                            as String?)
                                        ?.isNotEmpty ??
                                    false)) &&
                            employeeFields
                                .where(
                                  (f) => f.type == 'checkbox' && f.required,
                                )
                                .every(
                                  (f) =>
                                      _employeeFormData[f.name] == 'true' ||
                                      (currentTask?.formData?[f.name]
                                              ?.toString() ==
                                          'true'),
                                ))
                        ? () async {
                            final vm = ref.read(taskViewModelProvider.notifier);
                            final success = await vm.submitSplitForm(
                              taskId: widget.taskId,
                              taskTitle: widget.title,
                              formData: {
                                ...(currentTask?.formData ?? {}),
                                ..._employeeFormData,
                                'signature': _typedSignature.isEmpty
                                    ? (currentTask?.formData?['signature']
                                              as String? ??
                                          '')
                                    : 'typed:$_typedSignature',
                                'signedAt': DateTime.now().toIso8601String(),
                                'signedDate': DateFormat('MMMM dd, yyyy').format(DateTime.now()),
                              },
                              signatureData: _typedSignature.isEmpty
                                  ? (currentTask?.formData?['signature']
                                            as String? ??
                                        '')
                                  : 'typed:$_typedSignature',
                            );
                            if (success && mounted && !_isDisposed) {
                              ToastService.showSuccess(
                                context,
                                'Submitted — Awaiting admin counter-signature',
                              );
                            }
                          }
                        : null),
            ),
        ],
      ),
    );
  }
}
