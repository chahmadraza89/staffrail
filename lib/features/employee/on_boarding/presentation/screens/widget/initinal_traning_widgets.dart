// =============================================================================
// --- STANDALONE WIDGET COMPONENTS ---
// =============================================================================

import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TrainingHeader extends StatelessWidget {
  const TrainingHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF6366F1).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Icon(
            Icons.history_edu_rounded,
            color: Color(0xFF6366F1),
            size: 24,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Initial Training Record Form',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0F172A),
                ),
              ),
              Text(
                'High-Fidelity Compliance Document',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
        Image.asset(
          'assets/images/a.png',
          height: 40,
          errorBuilder: (context, error, stackTrace) =>
              const Icon(Icons.business, color: Color(0xFF6366F1)),
        ),
      ],
    );
  }
}

class TrainingMetadataBanner extends StatelessWidget {
  final CompilationSubTask task;

  const TrainingMetadataBanner({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          TrainingMetadataItem(label: 'Effective Date', value: '01/01/2026'),
          TrainingMetadataItem(label: 'Review Cycle', value: 'Initial'),
        ],
      ),
    );
  }
}

class TrainingMetadataItem extends StatelessWidget {
  final String label;
  final String value;

  const TrainingMetadataItem({
    super.key,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: const Color(0xFF64748B),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.outfit(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF6366F1),
          ),
        ),
      ],
    );
  }
}

class TrainingStatusBanner extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;

  const TrainingStatusBanner({
    super.key,
    required this.icon,
    required this.color,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class TrainingSectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;

  const TrainingSectionHeader({
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
        Flexible(
          child: Text(
            title.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ],
    );
  }
}

class TrainingAcknowledgmentSection extends StatelessWidget {
  final String taskId;
  final CompilationSubTask? task;
  final bool isLocked;
  final bool isAdmin;
  final bool isPending;
  final Map<String, dynamic> employeeFormData;
  final ValueChanged<bool?> onChanged;

  const TrainingAcknowledgmentSection({
    super.key,
    required this.taskId,
    required this.task,
    required this.isLocked,
    required this.isAdmin,
    required this.isPending,
    required this.employeeFormData,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final rawLegal =
        AppLegalContent.get(taskId) ??
        AppLegalContent.get('initial_training') ??
        '';
    final ackText = rawLegal.contains('---')
        ? rawLegal
              .split('---')
              .last
              .trim()
              .replaceAll('Acknowledgment', '')
              .replaceAll('ACKNOWLEDGMENT', '')
              .trim()
        : rawLegal.trim();
    final readOnly = isLocked || isAdmin || isPending;
    final isChecked =
        (task?.formData?['final_ack'] == 'true') ||
        (employeeFormData['final_ack'] == 'true');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Acknowledgment',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            ackText,
            style: GoogleFonts.inter(
              fontSize: 13,
              height: 1.6,
              color: const Color(0xFF475569),
            ),
          ),
          const SizedBox(height: 20),
          Material(
            color: Colors.transparent,
            child: CheckboxListTile(
              value: isChecked,
              onChanged: readOnly ? null : onChanged,
              title: Text(
                'I acknowledge that I have received and reviewed the training materials described above.',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF0F172A),
                ),
              ),
              activeColor: const Color(0xFF6366F1),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              dense: true,
            ),
          ),
        ],
      ),
    );
  }
}

class TrainingSignatureSection extends StatelessWidget {
  final String label;
  final String value;
  final bool isReadOnly;
  final bool isLoading;
  final ValueChanged<String> onChanged;
  final String? initialValue;

  const TrainingSignatureSection({
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
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          initialValue: initialValue,
          enabled: !isReadOnly && !isLoading,
          onChanged: onChanged,
          style: GoogleFonts.inter(fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: isReadOnly ? const Color(0xFFF8FAFC) : Colors.white,
            hintText: 'Type your full legal name as digital signature',
            hintStyle: GoogleFonts.inter(
              fontSize: 13,
              color: const Color(0xFF94A3B8),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFF6366F1),
                width: 1.5,
              ),
            ),
          ),
        ),
        if (value.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 16),
            padding: const EdgeInsets.all(24),
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Text(
              value,
              style: GoogleFonts.dancingScript(
                fontSize: 32,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
            ),
          ),
      ],
    );
  }
}

class TrainingReadOnlySignature extends StatelessWidget {
  final String label;
  final String value;

  const TrainingReadOnlySignature({
    super.key,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(20),
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDFA),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF5EEAD4)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.verified, color: Color(0xFF0D9488), size: 20),
              const SizedBox(width: 12),
              Text(
                value,
                style: GoogleFonts.dancingScript(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF0D9488),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class TrainingActionButtons extends StatelessWidget {
  final bool isAdmin;
  final bool isLoading;
  final VoidCallback onAdminVerify;
  final VoidCallback onAdminReject;
  final VoidCallback onEmployeeSubmit;
  final VoidCallback onEmployeeSaveDraft;

  const TrainingActionButtons({
    super.key,
    required this.isAdmin,
    required this.isLoading,
    required this.onAdminVerify,
    required this.onAdminReject,
    required this.onEmployeeSubmit,
    required this.onEmployeeSaveDraft,
  });

  @override
  Widget build(BuildContext context) {
    if (isAdmin) {
      return Column(
        children: [
          PrimaryActionButton(
            text: 'Verify & Counter-Sign',
            color: const Color(0xFF6366F1),
            isLoading: isLoading,
            onPressed: onAdminVerify,
          ),
          const SizedBox(height: 12),
          OutlinedActionButton(
            text: 'Request Revision',
            color: Colors.red,
            onPressed: onAdminReject,
          ),
        ],
      );
    }

    return Column(
      children: [
        PrimaryActionButton(
          text: 'Submit to Supervisor',
          color: const Color(0xFF3B82F6),
          isLoading: isLoading,
          onPressed: onEmployeeSubmit,
        ),
        const SizedBox(height: 12),
        OutlinedActionButton(
          text: 'Save Progress',
          color: const Color(0xFF64748B),
          onPressed: onEmployeeSaveDraft,
        ),
      ],
    );
  }
}

class PrimaryActionButton extends StatelessWidget {
  final String text;
  final Color color;
  final bool isLoading;
  final VoidCallback onPressed;

  const PrimaryActionButton({
    super.key,
    required this.text,
    required this.color,
    required this.isLoading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2.5,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send_rounded, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    text,
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class OutlinedActionButton extends StatelessWidget {
  final String text;
  final Color color;
  final VoidCallback onPressed;

  const OutlinedActionButton({
    super.key,
    required this.text,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: color.withValues(alpha: 0.5)),
          foregroundColor: color,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Text(
          text,
          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
