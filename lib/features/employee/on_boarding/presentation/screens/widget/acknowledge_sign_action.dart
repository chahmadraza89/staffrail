// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/core/widgets/base_form_wrapper.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

// =============================================================================
// ACKNOWLEDGE + SIGN ACTION WIDGET (v0.1)
// =============================================================================
// Combined acknowledgment checkbox + digital signature for forms that require
// both (e.g., Terms & Conditions, Corporate Compliance).
//
// Follows existing ConsumerStatefulWidget + _safeSetState + _isDisposed pattern.
// =============================================================================

class AcknowledgeSignAction extends ConsumerStatefulWidget {
  final String taskId;
  final String? title; // NEW: Descriptive title
  const AcknowledgeSignAction({super.key, required this.taskId, this.title});

  @override
  ConsumerState<AcknowledgeSignAction> createState() =>
      _AcknowledgeSignActionState();
}

class _AcknowledgeSignActionState extends ConsumerState<AcknowledgeSignAction> {
  bool _isAcknowledged = false;
  bool _isDisposed = false;
  String _typedSignature = '';
  final TextEditingController _nameController = TextEditingController();
  String _signedDate = ''; // Initialized in initState

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

  void _safeSetState(VoidCallback fn) {
    if (!_isDisposed && mounted) {
      setState(fn);
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _nameController.dispose();
    super.dispose();
  }

  void _initializeState() {
    if (_isDisposed || !mounted) return;
    final taskStatus = ref.read(taskStatusMapProvider)[widget.taskId];
    final user = ref.read(currentUserProvider).value;

    final tasksVal = ref.read(onboardingTasksStreamProvider).value;
    if (tasksVal != null) {
      final task = tasksVal.cast<CompilationSubTask?>().firstWhere(
        (t) => t?.id == widget.taskId,
        orElse: () => null,
      );
      if (task != null && task.formData != null) {
        final savedName = task.formData!['fullName'] as String?;
        final savedDate = task.formData!['signedDate'] as String?;
        _safeSetState(() {
          _isAcknowledged = isTaskLocked(taskStatus);
          final isLocked = _isAcknowledged;
          
          if (widget.taskId == 'grievance_procedure' && !isLocked) {
            _nameController.text = '';
            _signedDate = '';
          } else {
            if (savedName != null && savedName.isNotEmpty) {
              _nameController.text = savedName;
            } else if (user != null) {
              _nameController.text = user.name;
            }
            if (savedDate != null && savedDate.isNotEmpty) {
              _signedDate = savedDate;
            } else {
              _signedDate = DateFormat('MMMM dd, yyyy').format(DateTime.now());
            }
          }
        });
        return;
      }
    }

    _safeSetState(() {
      _isAcknowledged = isTaskLocked(taskStatus);
      if (user != null && widget.taskId != 'grievance_procedure') {
        _nameController.text = user.name;
      } else if (widget.taskId == 'grievance_procedure') {
        _nameController.text = '';
      }
      
      if (widget.taskId != 'grievance_procedure') {
        _signedDate = DateFormat('MMMM dd, yyyy').format(DateTime.now());
      } else {
        _signedDate = '';
      }
    });
  }

  bool get _isSignatureReady => _typedSignature.trim().length >= 2;

  @override
  Widget build(BuildContext context) {
    final taskStatus = ref.watch(taskStatusMapProvider)[widget.taskId];
    final isLoading = ref.watch(taskViewModelProvider).isLoading;
    final isLocked = isTaskLocked(taskStatus);

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

    // Listen to onboardingTasksStreamProvider to populate saved draft / completion values
    ref.listen<AsyncValue<List<CompilationSubTask>>>(
      onboardingTasksStreamProvider,
      (previous, next) {
        next.whenData((tasks) {
          final task = tasks.cast<CompilationSubTask?>().firstWhere(
            (t) => t?.id == widget.taskId,
            orElse: () => null,
          );
          if (task != null && task.formData != null) {
            final savedName = task.formData!['fullName'] as String?;
            final savedDate = task.formData!['signedDate'] as String?;
            _safeSetState(() {
              if (widget.taskId == 'grievance_procedure' && !isLocked) {
                // Do not pre-fill draft data for grievance_procedure
              } else {
                if (savedName != null &&
                    savedName.isNotEmpty &&
                    (_nameController.text.isEmpty || isLocked)) {
                  _nameController.text = savedName;
                }
                if (savedDate != null && savedDate.isNotEmpty && (_signedDate.isEmpty || isLocked)) {
                  _signedDate = savedDate;
                }
              }
            });
          }
        });
      },
    );

    final isSpecialForm = widget.taskId == 'onboarding_acknowledgment_form';
    // Show name/date fields for forms that require them per original documents
    final showNameField = isSpecialForm ||
        widget.taskId == 'corporate_compliance_acknowledge' ||
        widget.taskId == 'corporate_confidentiality_statement' ||
        widget.taskId == 'confidentiality_of_client___therapist___staff' ||
        widget.taskId == 'transportation_acknowledgement_statement' ||
        widget.taskId == 'acknowledgement_of_transporting_clients' ||
        widget.taskId == 'grievance_procedure';
    final themeColor = isSpecialForm
        ? const Color(0xFFEF4444)
        : const Color(0xFF109B85);

    // Fetch policy content from AppLegalContent registry or task stream
    final tasksAsync = ref.watch(onboardingTasksStreamProvider);
    String? policyContent = AppLegalContent.get(widget.taskId);

    if (policyContent == null || policyContent.isEmpty) {
      tasksAsync.whenData((tasks) {
        final task = tasks.cast<CompilationSubTask?>().firstWhere(
          (t) => t?.id == widget.taskId,
          orElse: () => null,
        );
        policyContent = task?.policyContent;
      });
    }

    // ── Content Parsing (Rich Text) ──────────────────────────────
    Widget contentWidget = const SizedBox.shrink();
    if (policyContent != null && policyContent!.isNotEmpty) {
      final welcomeMatch = RegExp(
        r'\*\*WELCOME\*\*(.*?)\n---',
        dotAll: true,
      ).firstMatch(policyContent!);
      final hasWelcome = welcomeMatch != null;

      String mainContent = policyContent!;
      Widget? welcomeHeader;

      if (hasWelcome) {
        final welcomeText = welcomeMatch.group(1)?.trim() ?? '';
        mainContent = policyContent!.split('---').last.trim();

        welcomeHeader = Container(
          margin: const EdgeInsets.only(bottom: 24),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.shade100),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            children: [
              Image.asset(
                'assets/images/a.png',
                height: 80,
                errorBuilder: (c, e, s) => const Icon(
                  Icons.business,
                  size: 60,
                  color: Color(0xFF109B85),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'WELCOME',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFEF4444),
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                welcomeText.split('Sincerely,').first.trim(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.6,
                  color: Color(0xFF475569),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 20),
              Column(
                children: [
                  const Text(
                    'Sincerely,',
                    style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
                  ),
                  Text(
                    'Clinic Director',
                    style: GoogleFonts.dancingScript(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const Text(
                    'Chief Executive Officer',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      }

      contentWidget = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ?welcomeHeader,
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                 ...mainContent.split('\n').map((line) {
                  final cleanLine = line.trim();
                  if (cleanLine.isEmpty) return const SizedBox(height: 8);

                  bool isBold =
                      cleanLine.startsWith('**') && cleanLine.endsWith('**');
                  bool isBullet = cleanLine.startsWith('- ') || cleanLine.startsWith('• ');
                  String textToShow = cleanLine.replaceAll('**', '');
                  if (isBullet) {
                    textToShow = textToShow.substring(2).trim();
                  }

                  if (isBullet) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8, left: 16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '•  ',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: themeColor,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              textToShow,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                height: 1.6,
                                color: Color(0xFF334155),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(
                      textToShow,
                      style: TextStyle(
                        fontSize: isBold ? 15 : 13,
                        fontWeight: isBold ? FontWeight.w800 : FontWeight.w500,
                        height: 1.6,
                        color: isBold
                            ? const Color(0xFF0F172A)
                            : const Color(0xFF334155),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      );
    }

    return BaseFormWrapper(
      taskId: widget.taskId,
      lockMessage: 'Acknowledged & Signed — Locked',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF109B85).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.verified_outlined,
                  size: 20,
                  color: themeColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isSpecialForm
                          ? 'Onboarding Acknowledgment'
                          : 'Acknowledge & Sign',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isSpecialForm
                            ? themeColor
                            : const Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      'Read, acknowledge, and sign the document',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // ── Policy Content (Rich) ────────────────────────────
          contentWidget,

          // ── Acknowledge Checkbox ─────────────────────────────────────
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
                  : (value) => setState(() => _isAcknowledged = value ?? false),
              title: const Text(
                'I acknowledge and confirm I have read the above content',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF334155),
                ),
              ),
              activeColor: themeColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
            ),
          ),
          ),

          const SizedBox(height: 24),

          // ── Additional Fields for Forms Requiring Name/Date ───────────
          if (showNameField) ...[
            const Text(
              'Employee / Contractor Name',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 8),
            CustomTextField(
              hintText: 'Enter your full name',
              controller: _nameController,
              enabled: !isLocked && !isLoading,
              fillColor: isLocked ? Colors.grey.shade50 : Colors.white,
            ),
            const SizedBox(height: 20),
            const Text(
              'Date',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 8),
            CustomTextField(
              hintText: 'Date',
              readOnly: true,
              controller: TextEditingController(text: _signedDate),
              enabled: !isLocked && !isLoading,
              fillColor: isLocked ? Colors.grey.shade50 : Colors.white,
              suffixIcon: Icon(
                Icons.calendar_today_rounded,
                size: 18,
                color: isLocked ? Colors.grey.shade400 : themeColor,
              ),
              onTap: (isLocked || isLoading)
                  ? null
                  : () async {
                      DateTime initialDate = DateTime.now();
                      try {
                        initialDate = DateFormat(
                          'MMMM dd, yyyy',
                        ).parse(_signedDate);
                      } catch (_) {}
                      if (initialDate.isAfter(DateTime.now())) {
                        initialDate = DateTime.now();
                      }
                      final pickedDate = await showDatePicker(
                        context: context,
                        initialDate: initialDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now(),
                        builder: (context, child) {
                          return Theme(
                            data: Theme.of(context).copyWith(
                              colorScheme: ColorScheme.light(
                                primary: themeColor,
                                onPrimary: Colors.white,
                                onSurface: const Color(0xFF0F172A),
                              ),
                            ),
                            child: child!,
                          );
                        },
                      );
                      if (pickedDate != null) {
                        _safeSetState(() {
                          _signedDate = DateFormat(
                            'MMMM dd, yyyy',
                          ).format(pickedDate);
                        });
                      }
                    },
            ),
            const SizedBox(height: 24),
          ],

          // ── Typed Signature ─────────────────────────────────────────
          const Text(
            'Digital Signature',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            enabled: !isLocked && !isLoading,
            onChanged: (value) => _safeSetState(() => _typedSignature = value),
            decoration: InputDecoration(
              filled: true,
              fillColor: isLocked ? Colors.grey.shade50 : Colors.white,
              hintText: 'Type your full name as signature',
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
                borderSide: BorderSide(color: themeColor, width: 1.5),
              ),
            ),
          ),

          // ── Signature Preview ───────────────────────────────────────
          if (_typedSignature.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(16),
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Text(
                _typedSignature,
                style: GoogleFonts.dancingScript(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF0F172A),
                ),
                textAlign: TextAlign.center,
              ),
            ),

          const SizedBox(height: 32),

          // ── Submit Button ───────────────────────────────────────────
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed:
                  _isAcknowledged &&
                      _isSignatureReady &&
                      !isLoading &&
                      !isLocked &&
                      (!showNameField || (_nameController.text.trim().isNotEmpty && _signedDate.isNotEmpty))
                  ? () async {
                      // Submit acknowledge + signature together
                      final success = await ref
                          .read(taskViewModelProvider.notifier)
                          .signTask(
                            taskId: widget.taskId,
                            taskTitle: widget.title,
                            signatureData: 'typed:$_typedSignature',
                            formData: {
                              'fullName': _nameController.text.trim(),
                              'signedDate': _signedDate,
                            },
                          );

                      if (success && mounted && !_isDisposed) {
                        ToastService.showSuccess(
                          context,
                          'Acknowledgment & Signature submitted',
                        );
                      }
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: themeColor,
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
                      'Acknowledge & Sign',
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
    );
  }
}
