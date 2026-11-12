// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/core/widgets/base_form_wrapper.dart';
import 'package:bhmh/core/widgets/dynamic_form_builder.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

// =============================================================================
// FILL-AND-SIGN ACTION WIDGET (v0.1)
// =============================================================================
// Combines DynamicFormBuilder (dynamic form fields from Firestore schema)
// with a digital signature pad for forms like I-9, W-4, Direct Deposit, etc.
//
// Flow: Employee fills fields → types signature → Submit
// Persists formData + signatureUrl to Firestore via TaskViewModel.
// =============================================================================

class FillAndSignAction extends ConsumerStatefulWidget {
  final String taskId;
  final String? title; // NEW: Pass the descriptive title
  const FillAndSignAction({super.key, required this.taskId, this.title});

  @override
  ConsumerState<FillAndSignAction> createState() => _FillAndSignActionState();
}

class _FillAndSignActionState extends ConsumerState<FillAndSignAction> {
  bool _isDisposed = false;
  Map<String, String> _formData = {};
  String _typedSignature = '';
  String _witnessSignature = '';
  final _formKey = GlobalKey<FormState>();

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

  bool _checkFormValidity(Map<String, dynamic>? existingData) {
    // Valid if current session has data OR previous draft has data
    return _formData.isNotEmpty || (existingData?.isNotEmpty ?? false);
  }
  bool get _isSignatureValid => _typedSignature.trim().length >= 2;
  bool get _isEmergencyMedical => widget.taskId == 'authorization_for_emergency_medical_care';
  bool get _isWitnessSignatureValid => !_isEmergencyMedical || _witnessSignature.trim().length >= 2;

  @override
  Widget build(BuildContext context) {
    final taskStatus = ref.watch(taskStatusMapProvider)[widget.taskId];
    final isLoading = ref.watch(taskViewModelProvider).isLoading;
    final isLocked = isTaskLocked(taskStatus);

    // ── Get task data for form schema ─────────────────────────────────
    final tasksAsync = ref.watch(onboardingTasksStreamProvider);
    List<FormFieldSchema> formSchema = [];
    Map<String, String>? existingFormData;

    tasksAsync.whenData((tasks) {
      final task = tasks.cast<CompilationSubTask?>().firstWhere(
        (t) => t?.id == widget.taskId,
        orElse: () => null,
      );
      if (task?.formSchema != null) {
        formSchema =
            task!.formSchema!.map((m) => FormFieldSchema.fromMap(m)).toList();
      }
      if (task?.formData != null) {
        existingFormData =
            task!.formData!.map((k, v) => MapEntry(k, v.toString()));
      }
    });

    // If no schema defined, use task-specific defaults
    if (formSchema.isEmpty) {
      if (widget.taskId == 'authorization_for_emergency_medical_care') {
        formSchema = const [
          // ── Emergency Contact 1 ──
          FormFieldSchema(name: 'emergencyContact1Name', label: 'Emergency Contact 1 — Print Name'),
          FormFieldSchema(name: 'emergencyContact1Phone', label: 'Telephone Number', type: 'phone'),
          FormFieldSchema(name: 'emergencyContact1Relation', label: 'Relationship'),
          // ── Emergency Contact 2 ──
          FormFieldSchema(name: 'emergencyContact2Name', label: 'Emergency Contact 2 — Print Name'),
          FormFieldSchema(name: 'emergencyContact2Phone', label: 'Telephone Number', type: 'phone'),
          FormFieldSchema(name: 'emergencyContact2Relation', label: 'Relationship'),
        ];
      } else if (widget.taskId == 'direct_deposit_authorization') {
        formSchema = const [
          FormFieldSchema(name: 'personalHeader', label: 'Personal Details', type: 'header'),
          FormFieldSchema(name: 'fullName', label: 'Full Legal Name'),
          FormFieldSchema(name: 'dateOfBirth', label: 'Date of Birth', type: 'date'),
          FormFieldSchema(name: 'ssn', label: 'SSN (Last 4)', hint: 'XXXX'),
          FormFieldSchema(name: 'address', label: 'Current Address', type: 'textarea'),
          FormFieldSchema(name: 'email', label: 'Email Address', type: 'email'),
          FormFieldSchema(name: 'bankHeader', label: 'Bank Information', type: 'header'),
          FormFieldSchema(name: 'bankName', label: 'Bank Name'),
          FormFieldSchema(
            name: 'accountType',
            label: 'Account Type',
            type: 'select',
            options: ['Checking', 'Savings'],
            hint: 'Select Account Type',
          ),
          FormFieldSchema(name: 'accountNumber', label: 'Account Number', type: 'number'),
          FormFieldSchema(name: 'routingNumber', label: 'Routing Number', type: 'number'),
          FormFieldSchema(name: 'signedDate', label: 'Date', type: 'date'),
        ];
      } else if (widget.taskId == 'attestation_form') {
        formSchema = const [
          FormFieldSchema(
            name: 'illegalDrugsUsage',
            label: 'Certification (Check one)',
            type: 'select',
            options: ['I do use illegal drugs', 'I do not use illegal drugs'],
            hint: 'Select an option',
          ),
          FormFieldSchema(name: 'fullName', label: 'Employee Name'),
          FormFieldSchema(name: 'signedDate', label: 'Date', type: 'date'),
        ];

      } else if (widget.taskId == 'acknowledgement_of_vehicle_documentation') {
        formSchema = const [
          FormFieldSchema(name: 'fullName', label: 'Employee/Contractor Name'),
          FormFieldSchema(
            name: 'positionTitle',
            label: 'Position/Title',
          ),
        ];
      } else if (widget.taskId == 'acknowledge_of_company_property' ||
                 widget.taskId == 'acknowledge_of_eoc_health_&_safety_policy') {
        formSchema = const [
          FormFieldSchema(name: 'fullName', label: 'Employee/Contractor Name'),
          FormFieldSchema(name: 'position', label: 'Position/Title'),
          FormFieldSchema(name: 'signedDate', label: 'Date', type: 'date'),
        ];
      } else {
        formSchema = const [
          FormFieldSchema(name: 'fullName', label: 'Full Legal Name'),
          FormFieldSchema(
            name: 'dateOfBirth',
            label: 'Date of Birth',
            type: 'date',
          ),
          FormFieldSchema(name: 'ssn', label: 'SSN (Last 4)', hint: 'XXXX'),
          FormFieldSchema(
            name: 'address',
            label: 'Current Address',
            type: 'textarea',
          ),
        ];
      }
    }

    return BaseFormWrapper(
      taskId: widget.taskId,
      lockMessage: 'Form Submitted & Locked',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────────────
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.assignment_outlined,
                  size: 20,
                  color: Color(0xFF3B82F6),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Fill & Sign',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      'Complete the form and sign below',
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // ── Policy Content (if registered) ─────────────────────────
          if (AppLegalContent.get(widget.taskId) != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Text(
                AppLegalContent.get(widget.taskId)!.replaceAll('**', '').trim(),
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.7,
                  color: Color(0xFF334155),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // ── Emergency Contact Information Header ────────────────────
          if (_isEmergencyMedical) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF109B85).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF109B85).withValues(alpha: 0.2)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.emergency, size: 20, color: Color(0xFF109B85)),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Emergency Contact Information',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF109B85),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            const Padding(
              padding: EdgeInsets.only(left: 4),
              child: Text(
                'In case of an emergency please contact:',
                style: TextStyle(
                  fontSize: 13,
                  fontStyle: FontStyle.italic,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF475569),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Form(
            key: _formKey,
            autovalidateMode: AutovalidateMode.onUserInteraction,
            child: DynamicFormBuilder(
              fields: formSchema,
              initialData: existingFormData,
              isReadOnly: isLocked,
              onChanged: (data) => _safeSetState(() => _formData = data),
            ),
          ),

          const Divider(height: 32),

          // ── Employee Signature Section ──────────────────────────────
          Text(
            _isEmergencyMedical ? 'Employee Signature' : 'Digital Signature',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            enabled: !isLocked && !isLoading,
            onChanged: (value) =>
                _safeSetState(() => _typedSignature = value),
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
                borderSide: const BorderSide(
                  color: Color(0xFF109B85),
                  width: 1.5,
                ),
              ),
            ),
          ),

          // ── Signature Preview ──────────────────────────────────────
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

          // ── Witness Signature Section (Emergency Medical Care only) ──
          if (_isEmergencyMedical) ...[
            const SizedBox(height: 24),
            const Divider(height: 1),
            const SizedBox(height: 16),
            const Text(
              'Witness Signature',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              enabled: !isLocked && !isLoading,
              onChanged: (value) =>
                  _safeSetState(() => _witnessSignature = value),
              decoration: InputDecoration(
                filled: true,
                fillColor: isLocked ? Colors.grey.shade50 : Colors.white,
                hintText: 'Type witness full name as signature',
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
            if (_witnessSignature.isNotEmpty)
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
                  _witnessSignature,
                  style: GoogleFonts.dancingScript(
                    fontSize: 28,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF0F172A),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
          ],

          const SizedBox(height: 32),

          // ── Action Buttons ─────────────────────────────────────────
          if (!isLocked) ...[
            // Save Draft
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        final vm = ref.read(taskViewModelProvider.notifier);
                        final success = await vm.submitFormData(
                          taskId: widget.taskId,
                          formData: _formData,
                          taskTitle: widget.title,
                          isDraft: true,
                        );
                        if (success && mounted && !_isDisposed) {
                          ToastService.showSuccess(
                            context,
                            'Draft saved successfully',
                          );
                        }
                      },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF109B85)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Save Draft',
                  style: TextStyle(
                    color: Color(0xFF109B85),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed:
                    _checkFormValidity(existingFormData) &&
                        _isSignatureValid &&
                        _isWitnessSignatureValid &&
                        !isLoading
                        ? () async {
                            if (!_formKey.currentState!.validate()) {
                              return;
                            }
                            final vm =
                                ref.read(taskViewModelProvider.notifier);
                            final success = await vm.submitFormData(
                              taskId: widget.taskId,
                              taskTitle: widget.title,
                              formData: {
                                ...(existingFormData ?? {}),
                                ..._formData,
                                'signatureData': 'typed:$_typedSignature',
                                if (_isEmergencyMedical)
                                  'witnessSignature': 'typed:$_witnessSignature',
                                'signedDate': _formData['signedDate'] ?? existingFormData?['signedDate'] ?? DateFormat('MMMM dd, yyyy').format(DateTime.now()),
                                'signedAt': DateTime.now().toIso8601String(),
                              },
                              isDraft: false,
                            );
                            if (success && mounted && !_isDisposed) {
                              ToastService.showSuccess(
                                context,
                                'Form submitted with signature',
                              );
                            }
                          }
                        : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF109B85),
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade200,
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
                        'Submit & Sign',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
