import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// =============================================================================
// --- STANDALONE UI COMPONENTS FOR SPLIT-FIELD FORM ---
// =============================================================================

class SplitFieldHeader extends StatelessWidget {
  const SplitFieldHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF8B5CF6).withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.people_outline,
            size: 20,
            color: Color(0xFF8B5CF6),
          ),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Dual-Signature Form',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              Text(
                'Requires both employee and admin signatures',
                style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class SplitFieldPolicyContent extends StatelessWidget {
  final String taskId;

  const SplitFieldPolicyContent({super.key, required this.taskId});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      constraints: const BoxConstraints(maxHeight: 200),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: SingleChildScrollView(
        child: Text(
          AppLegalContent.get(taskId)!,
          style: GoogleFonts.inter(
            fontSize: 13,
            height: 1.6,
            color: const Color(0xFF334155),
          ),
        ),
      ),
    );
  }
}

class SplitFieldStatusBanner extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;

  const SplitFieldStatusBanner({
    super.key,
    required this.icon,
    required this.color,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Builder(
        builder: (context) {
          final isMobile = MediaQuery.sizeOf(context).width < 600;
          if (isMobile) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(height: 8),
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ],
            );
          } else {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    text,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
              ],
            );
          }
        },
      ),
    );
  }
}

class SplitFieldRejectionBanner extends StatelessWidget {
  final String reason;

  const SplitFieldRejectionBanner({super.key, required this.reason});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
              const SizedBox(width: 8),
              Text(
                'Submission Rejected',
                style: TextStyle(
                  color: Colors.red.shade700,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Reason: $reason',
            style: TextStyle(color: Colors.red.shade900, fontSize: 13),
          ),
          const SizedBox(height: 4),
          const Text(
            'Please update the form and resubmit.',
            style: TextStyle(
              color: Colors.red,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class SplitFieldSectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;

  const SplitFieldSectionHeader({
    super.key,
    required this.title,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ],
    );
  }
}

class SplitFieldSignatureSection extends StatelessWidget {
  final String label;
  final String value;
  final bool isReadOnly;
  final bool isLoading;
  final ValueChanged<String> onChanged;
  final String? initialValue;

  const SplitFieldSignatureSection({
    super.key,
    required this.label,
    required this.value,
    required this.isReadOnly,
    required this.isLoading,
    required this.onChanged,
    this.initialValue,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: initialValue,
          enabled: !isReadOnly && !isLoading,
          onChanged: onChanged,
          decoration: InputDecoration(
            filled: true,
            fillColor: isReadOnly ? Colors.grey.shade50 : Colors.white,
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
        if (value.isNotEmpty)
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
              value,
              style: GoogleFonts.dancingScript(
                fontSize: 28,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF0F172A),
              ),
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }
}

class SplitFieldReadOnlySignature extends StatelessWidget {
  final String label;
  final String value;

  const SplitFieldReadOnlySignature({
    super.key,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              const Icon(Icons.check, size: 18, color: Color(0xFF109B85)),
              const SizedBox(width: 10),
              Text(
                value,
                style: GoogleFonts.dancingScript(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class SplitFieldActionButtons extends StatelessWidget {
  final bool isAdmin;
  final bool isLoading;
  final VoidCallback? onAdminSaveDraft;
  final VoidCallback? onAdminReject;
  final VoidCallback? onAdminCounterSign;
  final VoidCallback? onEmployeeSaveDraft;
  final VoidCallback? onEmployeeSubmit;

  const SplitFieldActionButtons({
    super.key,
    required this.isAdmin,
    required this.isLoading,
    this.onAdminSaveDraft,
    this.onAdminReject,
    this.onAdminCounterSign,
    this.onEmployeeSaveDraft,
    this.onEmployeeSubmit,
  });

  @override
  Widget build(BuildContext context) {
    if (isAdmin) {
      return Column(
        children: [
          const SizedBox(height: 24),
          // Save Admin Progress
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: isLoading ? null : onAdminSaveDraft,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF3B82F6)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Save Admin Progress',
                style: TextStyle(
                  color: Color(0xFF3B82F6),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Admin Reject Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: isLoading ? null : onAdminReject,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Reject Submission',
                style: TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Counter-Sign & Complete
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: isLoading ? null : onAdminCounterSign,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF109B85),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Counter-Sign & Complete',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      );
    }

    // Employee Submit Button
    return Column(
      children: [
        // Save Draft
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton(
            onPressed: isLoading ? null : onEmployeeSaveDraft,
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
        // Submit to Admin
        SizedBox(
          width: double.infinity,
          height: 54,
          child: ElevatedButton(
            onPressed: isLoading ? null : onEmployeeSubmit,
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
                    'Submit for Admin Review',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
          ),
        ),
      ],
    );
  }
}

class CompetencyEvaluationTableWidget extends StatelessWidget {
  final bool isAdmin;
  final bool isLocked;
  final String taskId;
  final CompilationSubTask? currentTask;

  const CompetencyEvaluationTableWidget({
    super.key,
    required this.isAdmin,
    required this.isLocked,
    required this.taskId,
    required this.currentTask,
  });

  @override
  Widget build(BuildContext context) {
    final areas =
        AppLegalContent.competencyAreas[taskId] ??
        AppLegalContent.competencyAreas['cssp_competency']!;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with Rating Scale
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'COMPETENCY RATING SCALE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1E293B),
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '5 – Excellent | 4 – Above Average | 3 – Competent | 2 – Needs Improvement | 1 – Unsatisfactory',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          // Table Rows
          ...areas.entries.map((entry) {
            final area = entry.key;
            final description = entry.value;
            final slug = area.toLowerCase().replaceAll(' ', '_');

            // Get data from task (read-only summary)
            final rating =
                currentTask?.adminFormData?['rating_$slug']?.toString() ?? '—';
            final comment =
                currentTask?.adminFormData?['comments_$slug']?.toString() ?? '';

            return Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 3,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              area,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              description,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: rating == '—'
                              ? Colors.grey.shade100
                              : const Color(0xFF109B85).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Rating: $rating',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: rating == '—'
                                ? Colors.grey
                                : const Color(0xFF109B85),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (comment.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Comment: $comment',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF475569),
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class InitialOrientationTopicsCoveredWidget extends StatelessWidget {
  const InitialOrientationTopicsCoveredWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'ORIENTATION TOPICS COVERED',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1E293B),
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 16),
          ...[
            'Mission, Vision, and Values of StaffRail',
            'Code of Conduct & Corporate Compliance',
            'Confidentiality and HIPAA Policy',
            'Cultural Competency & Diversity',
            'Workplace Safety & Emergency',
            'Client Rights and Responsibilities',
            'Abuse, Neglect, and Exploitation',
            'Infection Control & Precautions',
            'Incident & Grievance Reporting',
          ].map(
            (topic) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Icon(
                      Icons.circle,
                      size: 5,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      topic,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF475569),
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 32),
          const Text(
            'ACKNOWLEDGMENT',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'I acknowledge that I have completed the general orientation for Example Health Clinic, LLC and understand all topics presented. I have received copies of related policies and procedures.',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF334155),
              height: 1.5,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}
