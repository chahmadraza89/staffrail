// ============================================================================
// --- THE INDIVIDUAL TASK TILE (CLICKABLE LIST ITEM) ---
// ============================================================================

// ============================================================================
// --- THE DETAIL PANEL CONTENT ---
// ============================================================================

import 'package:bhmh/features/admin/admin_directory/presentation/provider/admin_directory_actions.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_dictory_task_management_widgets.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_directory_helpers.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/annual_training_form_view.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/initial_training_form_view.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/split_field_form_view.dart';
import 'package:flutter/foundation.dart';
import 'package:bhmh/core/utils/web_download_helper.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/core/services/pdf_audit_report_generator.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_acknowledge_form_view.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher_string.dart';

class TaskDetailPanel extends ConsumerStatefulWidget {
  final CompilationSubTask task;
  final bool isMobile;
  final String employeeId;
  final List<CompilationSubTask>? allTasks;
  final VoidCallback? onClose;

  const TaskDetailPanel({
    super.key,
    required this.task,
    required this.isMobile,
    required this.employeeId,
    this.allTasks,
    this.onClose,
  });

  @override
  ConsumerState<TaskDetailPanel> createState() => _TaskDetailPanelState();
}

class _TaskDetailPanelState extends ConsumerState<TaskDetailPanel> {
  bool _isUploading = false;
  TextEditingController? _blankFormLinkController;
  bool _isSavingLink = false;

  @override
  void initState() {
    super.initState();
    _initBlankFormLinkController();
  }

  @override
  void didUpdateWidget(TaskDetailPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.task.id != widget.task.id || oldWidget.task.blankFormLink != widget.task.blankFormLink) {
      _initBlankFormLinkController();
    }
  }

  void _initBlankFormLinkController() {
    final taskId = widget.task.id;
    if (taskId == 'tax_documents_i_9' || taskId == 'tax_documents_w_9') {
      final defaultLink = taskId == 'tax_documents_i_9'
          ? 'https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf'
          : 'https://www.irs.gov/pub/irs-pdf/fw9.pdf';
      _blankFormLinkController?.dispose();
      _blankFormLinkController = TextEditingController(
        text: widget.task.blankFormLink ?? defaultLink,
      );
    } else {
      _blankFormLinkController?.dispose();
      _blankFormLinkController = null;
    }
  }

  @override
  void dispose() {
    _blankFormLinkController?.dispose();
    super.dispose();
  }

  Future<void> _handleAdminUpload() async {
    setState(() => _isUploading = true);
    try {
      final picker = ref.read(filePickerServiceProvider);
      final file = await picker.pickFile();

      if (file == null) return;

      await ref
          .read(adminDirectoryActionsProvider.notifier)
          .adminUploadFile(
            employeeId: widget.employeeId,
            taskId: widget.task.id,
            file: file,
            employeeName: widget.task.employeeName,
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Document uploaded and verified by Admin'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  /// Whether the download button should be shown for this task.
  /// Uploads: available when a file URL exists.
  /// Forms: only after employee has submitted (not for draft/notStarted/inProgress).
  bool _isDownloadAvailable() {
    if (widget.task.actionType == TaskActionType.upload) {
      return widget.task.fileUrl != null;
    }
    // Form-based tasks: only show after submission
    const submittedStatuses = {
      TaskStatus.submitted,
      TaskStatus.pendingEmployerSignature,
      TaskStatus.waitingForApprover,
      TaskStatus.completed,
      TaskStatus.verified,
      TaskStatus.signed,
      TaskStatus.acknowledged,
    };
    return submittedStatuses.contains(widget.task.status);
  }

  Future<void> _handleDownload() async {
    // ── CASE 1: Simple Upload Task ──────────────────────────────────────────
    // If it's a raw upload, we download the original file instead of an audit report
    if (widget.task.actionType == TaskActionType.upload &&
        widget.task.fileUrl != null) {
      final url = widget.task.fileUrl!;

      if (kIsWeb) {
        // On Web, use our platform-safe helper to trigger a real download without a new tab
        final fileName =
            '${widget.task.title.replaceAll(' ', '_')}_${widget.task.employeeName?.replaceAll(' ', '_') ?? 'Attachment'}';
        triggerWebDownload(url, fileName);
        return;
      }

      // Fallback for mobile or if JS helper fails
      await launchUrlString(url, mode: LaunchMode.externalApplication);
      return;
    }

    // ── CASE 2: Form-based Task ─────────────────────────────────────────────
    // Generate the standard Audit PDF for signed forms
    try {
      // Load logo bytes from assets for the PDF header
      Uint8List? logoBytes;
      try {
        final ByteData logoData = await rootBundle.load(
          'assets/images/a.png',
        );
        logoBytes = logoData.buffer.asUint8List();
      } catch (e) {
        debugPrint('Logo load failed: $e');
      }

      final pdfBytes = await PdfAuditReportGenerator.generateAcknowledgeFormPdf(
        task: widget.task,
        employeeName: widget.task.employeeName ?? 'Employee',
        logoBytes: logoBytes,
        allTasks: widget.allTasks,
      );

      final sanitizedFormName = widget.task.title.replaceAll(' ', '_');
      final sanitizedEmployeeName = (widget.task.employeeName ?? 'Employee').replaceAll(' ', '_');
      final fileName = '${sanitizedFormName}_$sanitizedEmployeeName.pdf';

      if (kIsWeb) {
        triggerBytesDownload(pdfBytes, fileName);
      } else {
        await Printing.sharePdf(
          bytes: pdfBytes,
          filename: fileName,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate PDF: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleReject() async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text(
          'Reject Task',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Please provide a reason for rejecting this task. The employee will see this feedback.',
              style: TextStyle(
                color: Color(0xFF475569),
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Enter rejection reason...',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.all(16),
              ),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text(
              'Cancel',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () =>
                Navigator.pop(context, reasonController.text.trim().isNotEmpty),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Reject Task',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref
          .read(adminDirectoryActionsProvider.notifier)
          .rejectTask(
            employeeId: widget.employeeId,
            taskId: widget.task.id,
            taskSource: widget.task.taskSource,
            reason: reasonController.text.trim(),
            employeeName: widget.task.employeeName,
          );
      if (widget.isMobile && mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = AdminDirectoryHelpers.getStatusColor(
      widget.task.status,
    );
    final canAccept =
        widget.task.status == TaskStatus.submitted ||
        widget.task.status == TaskStatus.signed ||
        widget.task.status == TaskStatus.pendingEmployerSignature ||
        widget.task.status == TaskStatus.waitingForApprover ||
        widget.task.status == TaskStatus.rejected;

    final canReject = canAccept || 
        widget.task.status == TaskStatus.completed || 
        widget.task.status == TaskStatus.verified;

    final isSplitField = widget.task.actionType == TaskActionType.splitField;
    final taskIdLower = widget.task.id.toLowerCase();
    final titleLower = widget.task.title.toLowerCase();

    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(32, 32, 32, 24),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  widget.task.title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  widget.task.status.name.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              if (!widget.isMobile && widget.onClose != null) ...[
                const SizedBox(width: 16),
                IconButton(
                  onPressed: widget.onClose,
                  icon: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      color: Color(0xFF475569),
                      size: 16,
                    ),
                  ),
                  splashRadius: 24,
                ),
              ],
            ],
          ),
        ),

        // Scrollable Content
        Expanded(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── PREVIEW SECTION (Standardized Previews) ──
                if (widget.task.fileUrl != null) ...[
                  _buildFilePreview(widget.task.fileUrl!),
                ],
                if (widget.task.signatureUrl != null) ...[
                  _buildSignaturePreview(widget.task.signatureUrl!),
                ],

                _buildAdminSkipControl(),
                _buildAdminLinkConfigCard(),

                // Action Buttons for Form/Upload
                // Only show download when: upload has a file, or form has been submitted/completed
                if (_isDownloadAvailable()) ...[
                  Row(
                    children: [
                      CompactActionButton(
                        label: widget.task.actionType == TaskActionType.upload
                            ? 'Download Original'
                            : 'Download Audit PDF',
                        icon: Icons.download_rounded,
                        color: const Color(0xFF10B981),
                        onTap: _handleDownload,
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                ],

                // ── FORM CONTENT SECTION ──
                if (widget.task.actionType != TaskActionType.upload) ...[
                  if (isSplitField) ...[
                    // Dedicated view for Training Record Forms
                    if (taskIdLower.contains('annualtraining') ||
                        titleLower.contains('annual training'))
                      AnnualTrainingFormView(
                        taskId: widget.task.id,
                        employeeId: widget.employeeId,
                      )
                    else if (taskIdLower.contains('initialtraining') ||
                        titleLower.contains('initial training'))
                      InitialTrainingFormView(
                        taskId: widget.task.id,
                        employeeId: widget.employeeId,
                      )
                    // ── Initial Orientation (Driver's Verification pattern) ──
                    else if (taskIdLower.contains('initial_orientation') ||
                        taskIdLower.contains('initialorientation') ||
                        taskIdLower.contains('bhmh_initial_orientation') ||
                        titleLower.contains('initial orientation'))
                      (widget.task.status == TaskStatus.completed ||
                              widget.task.status == TaskStatus.verified)
                          ? AdminAcknowledgeFormView(task: widget.task)
                          : SplitFieldFormView(
                              taskId: widget.task.id,
                              employeeId: widget.employeeId,
                              initialTask: widget.task,
                            )
                    else if ((taskIdLower.contains('cultural_competency') ||
                            (taskIdLower.contains('driver') && !taskIdLower.contains('license'))) &&
                        (widget.task.status == TaskStatus.completed ||
                            widget.task.status == TaskStatus.verified))
                      AdminAcknowledgeFormView(task: widget.task)
                    else
                      SplitFieldFormView(
                        taskId: widget.task.id,
                        employeeId: widget.employeeId,
                        initialTask: widget.task,
                      ),
                  ] else
                    AdminAcknowledgeFormView(task: widget.task),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                  ),
                ],

                const Text(
                  'Description',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.task.subtitle.isNotEmpty
                      ? widget.task.subtitle
                      : 'Complete and submit all required documents for the new employee onboarding process.',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF475569),
                    height: 1.5,
                  ),
                ),

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                ),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Submitted Materials',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    if (widget.task.actionType == TaskActionType.upload)
                      TextButton.icon(
                        onPressed: _isUploading ? null : _handleAdminUpload,
                        icon: _isUploading
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.upload_file_rounded, size: 18),
                        label: const Text('Admin Upload'),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF109B85),
                          textStyle: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (widget.task.fileUrl == null &&
                    widget.task.signatureUrl == null &&
                    (widget.task.formData == null ||
                        widget.task.formData!.isEmpty))
                  const Text(
                    'No submission data yet.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  )
                else
                  const Text(
                    'Submission materials are shown in the preview section above.',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                  ),

                // Form Data Section (If applicable)
                if (widget.task.formData != null &&
                    widget.task.formData!.isNotEmpty &&
                    widget.task.actionType != TaskActionType.splitField &&
                    widget.task.actionType != TaskActionType.acknowledgeSign &&
                    widget.task.actionType != TaskActionType.fillAndSign) ...[
                  const SizedBox(height: 20),
                  const Text(
                    'Form Data',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: widget.task.formData!.entries.map((entry) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${entry.key}: ',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  entry.value.toString(),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF1E293B),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                  ),
                ],

                const Text(
                  'Activity Timeline',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 24),
                ActivityTimeline(task: widget.task),
                const SizedBox(height: 24),

                // --- ACTION BUTTONS (Moved from fixed bottom to follow timeline) ---
                if (!isSplitField)
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: canAccept
                              ? () async {
                                  final confirmed = await showDialog<bool>(
                                    context: context,
                                    builder: (context) => AlertDialog(
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(24),
                                      ),
                                      title: const Text(
                                        'Verify Task?',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      content: Text(
                                        'Are you sure you want to mark "${widget.task.title}" as verified? This will complete the task for the employee.',
                                        style: const TextStyle(
                                          color: Color(0xFF475569),
                                          fontSize: 15,
                                          height: 1.5,
                                        ),
                                      ),
                                      actionsPadding: const EdgeInsets.fromLTRB(
                                        16,
                                        0,
                                        16,
                                        16,
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.pop(context, false),
                                          child: const Text(
                                            'Cancel',
                                            style: TextStyle(
                                              color: Color(0xFF64748B),
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                        ElevatedButton(
                                          onPressed: () =>
                                              Navigator.pop(context, true),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(
                                              0xFF10B981,
                                            ),
                                            foregroundColor: Colors.white,
                                            elevation: 0,
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 20,
                                              vertical: 12,
                                            ),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                            ),
                                          ),
                                          child: const Text(
                                            'Verify',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );

                                  if (confirmed == true) {
                                    await ref
                                        .read(
                                          adminDirectoryActionsProvider
                                              .notifier,
                                        )
                                        .acceptTask(
                                          employeeId: widget.employeeId,
                                          taskId: widget.task.id,
                                          taskSource: widget.task.taskSource,
                                          employeeName:
                                              widget.task.employeeName,
                                        );
                                    if (widget.isMobile && context.mounted) {
                                      Navigator.of(context).pop();
                                    }
                                  }
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: Colors.grey.shade200,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle_rounded, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Verify & Approve',
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: canReject ? _handleReject : null,
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(
                              color: canReject
                                  ? const Color(0xFFEF4444)
                                  : Colors.grey.shade200,
                              width: 1.5,
                            ),
                            foregroundColor: const Color(0xFFEF4444),
                            disabledForegroundColor: Colors.grey.shade400,
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Text(
                            'Reject',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 12),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFilePreview(String url) {
    final rawName = url.split('?').first;
    final decodedName = Uri.decodeComponent(rawName);
    final fileName = decodedName.split('/').last;

    final isImage = url.toLowerCase().contains(
      RegExp(r'\.(jpg|jpeg|png|webp|gif|bmp)'),
    );

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isImage)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  url,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: const Color(0xFFF1F5F9),
                    child: const Icon(
                      Icons.broken_image_rounded,
                      color: Color(0xFF94A3B8),
                      size: 48,
                    ),
                  ),
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      color: const Color(0xFFF1F5F9),
                      child: const Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF109B85),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Icon(
                    isImage
                        ? Icons.image_rounded
                        : Icons.insert_drive_file_rounded,
                    color: const Color(0xFF109B85),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fileName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        isImage ? 'Image Attachment' : 'Document File',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignaturePreview(String signature) {
    final isTyped = signature.startsWith('typed:');
    final signatureText = isTyped
        ? signature.substring(6)
        : 'Digital Signature captured';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Icon(
              Icons.draw_rounded,
              color: Color(0xFF109B85),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  signatureText,
                  style: GoogleFonts.dancingScript(
                    fontSize: 24,
                    fontWeight: isTyped ? FontWeight.w900 : FontWeight.bold,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const Text(
                  'Employee Signature',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminSkipControl() {
    final isSkipped = widget.task.status == TaskStatus.noActionRequired;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isSkipped ? const Color(0xFFF8FAFC) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSkipped ? const Color(0xFFCBD5E1) : const Color(0xFFE2E8F0),
          width: isSkipped ? 2.0 : 1.0,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isSkipped ? const Color(0xFFF1F5F9) : const Color(0xFFEFF6FF),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isSkipped ? Icons.block_flipped : Icons.next_plan_outlined,
              color: isSkipped ? const Color(0xFF64748B) : const Color(0xFF3B82F6),
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Skip Form (Admin Option)',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isSkipped
                      ? 'Marked as "No Action Required".'
                      : 'Exclude this form from onboarding requirements.',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: isSkipped,
            activeThumbColor: const Color(0xFF109B85),
            onChanged: _isUploading
                ? null
                : (value) async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                        title: Text(
                          value ? 'Skip Form?' : 'Unskip Form?',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        content: Text(
                          value
                              ? 'Are you sure you want to skip "${widget.task.title}"? The employee will be allowed to skip it, and it will be excluded from progress calculations.'
                              : 'Are you sure you want to make "${widget.task.title}" required again? The employee will need to complete it.',
                          style: const TextStyle(
                            color: Color(0xFF475569),
                            fontSize: 15,
                            height: 1.5,
                          ),
                        ),
                        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text(
                              'Cancel',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(context, true),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: value
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF109B85),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(
                              value ? 'Skip' : 'Make Required',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );

                    if (confirmed == true) {
                      setState(() {
                        _isUploading = true;
                      });
                      try {
                        await ref
                            .read(adminDirectoryActionsProvider.notifier)
                            .skipTask(
                              employeeId: widget.employeeId,
                              taskId: widget.task.id,
                              skip: value,
                              employeeName: widget.task.employeeName,
                              taskTitle: widget.task.title,
                            );

                        if (widget.isMobile && mounted) {
                          Navigator.of(context).pop();
                        }
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Failed to update task: $e'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      } finally {
                        if (mounted) {
                          setState(() {
                            _isUploading = false;
                          });
                        }
                      }
                    }
                  },
          ),
        ],
      ),
    );
  }

  Widget _buildAdminLinkConfigCard() {
    if (_blankFormLinkController == null) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF6FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.link_rounded,
                  color: Color(0xFF3B82F6),
                  size: 20,
                ),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Blank Form URL (Admin Config)',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                        fontSize: 14,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Provide the Adobe/USCIS/IRS blank document link.',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _blankFormLinkController,
                  decoration: InputDecoration(
                    hintText: 'https://...',
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    isDense: true,
                  ),
                  style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B)),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: _isSavingLink
                    ? null
                    : () async {
                        final newLink = _blankFormLinkController!.text.trim();
                        if (newLink.isEmpty) return;

                        setState(() {
                          _isSavingLink = true;
                        });

                        try {
                          await ref
                              .read(adminDirectoryActionsProvider.notifier)
                              .updateBlankFormLink(
                                employeeId: widget.employeeId,
                                taskId: widget.task.id,
                                newLink: newLink,
                                currentStatus: widget.task.status,
                              );

                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('✅ Blank form link updated'),
                                backgroundColor: Color(0xFF10B981),
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Failed to save link: $e'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        } finally {
                          if (mounted) {
                            setState(() {
                              _isSavingLink = false;
                            });
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF109B85),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSavingLink
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Save',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
