import 'package:bhmh/core/extensions/string_extensions.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

// =============================================================================
// SPECIALIZED ADMIN FORM VIEW WIDGETS
// =============================================================================
// These widgets render the on-screen admin form views for each compliance
// document type, matching the structure of their PDF counterparts exactly.
// =============================================================================

// ─── Shared Acknowledgment Checkbox Item ─────────────────────────────────────
class _AckItem extends StatelessWidget {
  final String text;
  final bool checked;
  const _AckItem(this.text, {required this.checked});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            checked
                ? Icons.check_box_rounded
                : Icons.check_box_outline_blank_rounded,
            color: checked ? const Color(0xFF109B85) : Colors.grey.shade300,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 14,
                color: checked
                    ? const Color(0xFF0F172A)
                    : const Color(0xFF94A3B8),
                fontWeight: checked ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Shared Info Row ─────────────────────────────────────────────────────────
class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Colors.black54,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(bottom: 6),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.black12, width: 1),
              ),
            ),
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Shared Section Header ───────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w900,
        color: Color(0xFF0F172A),
        letterSpacing: 1.2,
      ),
    );
  }
}

// ─── Shared Description Text ─────────────────────────────────────────────────
class _DescriptionText extends StatelessWidget {
  final String text;
  const _DescriptionText(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        height: 1.6,
        color: Color(0xFF64748B),
      ),
    );
  }
}

// =============================================================================
// 1. CODE OF CONDUCT FORM VIEW
// =============================================================================
class CodeOfConductFormView extends StatelessWidget {
  final CompilationSubTask task;
  const CodeOfConductFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── WELCOME Section ──────────────────────────────────────────────
        Center(
          child: Text(
            'WELCOME',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: const Color(0xFFDC2626),
              letterSpacing: 1.0,
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Welcome to Bright Horizons Mental Health, LLC. I would like to wish you much success here. I hope that your experience here will be challenging, enjoyable and rewarding.',
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 14,
            height: 1.6,
            color: const Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 24),

        // ── Sincerely Block ──────────────────────────────────────────────
        Center(
          child: Column(
            children: [
              Text(
                'Sincerely,',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Shawn Mathai',
                style: GoogleFonts.dancingScript(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF334155),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Chief Executive Officer',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),

        // ── Divider ──────────────────────────────────────────────────────
        Container(
          height: 1,
          color: const Color(0xFF94A3B8),
        ),
        const SizedBox(height: 32),

        // ── Code of Ethics/Conduct Heading ───────────────────────────────
        Center(
          child: Text(
            'Code of Ethics/Conduct',
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: const Color(0xFFDC2626),
            ),
          ),
        ),
        const SizedBox(height: 20),

        // ── 8 Numbered Ethics Items ──────────────────────────────────────
        _buildEthicsItem(1, 'To avoid real or perceived conflicts of interest'),
        _buildEthicsItem(2, 'To be honest and realistic when documenting services provided'),
        _buildEthicsItem(3, 'To reject bribery in all its forms'),
        _buildEthicsItem(4, 'To improve the understanding of behavioral health services'),
        _buildEthicsItem(5, 'To treat all staff and clients fairly and not engage in any acts of discrimination'),
        _buildEthicsItem(6, 'To provide safe environment for clients and staff'),
        _buildEthicsItem(7, 'Abide by all applicable federal and state laws, including HIPPA'),
        _buildEthicsItem(8, 'To abide by this Code of Ethics'),
        const SizedBox(height: 32),

        // ── Acknowledgment Section ───────────────────────────────────────
        Text(
          'Acknowledgment',
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'I acknowledge that I have received, read, and understood the Code of Ethics/Conduct document',
          style: GoogleFonts.inter(
            fontSize: 14,
            height: 1.6,
            color: const Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'I agree to comply with all applicable laws, regulations, and agency policies, and to conduct myself in a professional and ethical manner consistent with the mission and standards of Bright Horizons Mental Health, LLC.',
          style: GoogleFonts.inter(
            fontSize: 14,
            height: 1.6,
            color: const Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'I understand that failure to comply with these standards may result in disciplinary or corrective action, up to and including termination of employment or contractual agreement.',
          style: GoogleFonts.inter(
            fontSize: 14,
            height: 1.6,
            color: const Color(0xFF334155),
          ),
        ),
      ],
    );
  }

  Widget _buildEthicsItem(int number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            child: Text(
              '$number.',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF0F172A),
              ),
            ),
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// 2. ALLEGED ABUSE FORM VIEW
// =============================================================================
class AllegedAbuseFormView extends StatelessWidget {
  final CompilationSubTask task;
  const AllegedAbuseFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final acknowledgments = (task.formData?['acknowledgments'] as List?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('REPORTING ALLEGED ABUSE OR NEGLECT'),
        const SizedBox(height: 16),
        const _DescriptionText(
          'BHMH is committed to ensuring the safety and well-being of all clients. Employees are mandatory reporters and must follow strict guidelines for reporting any suspected abuse, neglect, or exploitation.',
        ),
        const SizedBox(height: 24),
        ...acknowledgments.map(
          (ack) => _AckItem(
            ack['text'] as String? ?? '',
            checked: ack['checked'] as bool? ?? false,
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// 3. ACKNOWLEDGE OF COMPANY PROPERTY FORM VIEW
// =============================================================================
class AcknowledgeOfCompanyPropertyFormView extends StatelessWidget {
  final CompilationSubTask task;
  const AcknowledgeOfCompanyPropertyFormView({super.key, required this.task});

  Widget _buildBulletItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 8.0),
            child: Icon(Icons.circle, size: 6, color: Color(0xFF64748B)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF334155),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};
    final String position =
        formData['position'] ??
        task.adminFormData?['position'] ??
        'Staff Member';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('POLICY SUMMARY'),
        const SizedBox(height: 12),
        const _DescriptionText(
          'To ensure accountability, security, and proper maintenance of organizational resources, Bright Horizons Mental Health, LLC issues company property to employees and contractors as needed for the performance of their duties.',
        ),
        const SizedBox(height: 8),
        const _DescriptionText(
          'This property is considered the sole property of Bright Horizons Mental Health, LLC and must be used responsibly, only for legitimate business purposes, and in accordance with agency policy.',
        ),
        const SizedBox(height: 24),

        const _SectionHeader('COMPANY PROPERTY COVERED'),
        const SizedBox(height: 12),
        const _DescriptionText(
          'Company property may include, but is not limited to:',
        ),
        const SizedBox(height: 12),
        _buildBulletItem('Identification badges and access cards'),
        _buildBulletItem('Office keys or key fobs'),
        _buildBulletItem('Laptops, tablets, or mobile phones'),
        _buildBulletItem('Agency documents, handbooks, or training materials'),
        _buildBulletItem('Uniforms, equipment, or medical/safety supplies'),
        _buildBulletItem(
          'Software, electronic data, and confidential materials',
        ),
        const SizedBox(height: 8),
        const _DescriptionText(
          'All items remain the property of Bright Horizons Mental Health, LLC and must be returned in good working condition upon request, termination, or contract completion.',
        ),
        const SizedBox(height: 24),

        const _SectionHeader('USAGE AND RESPONSIBILITY'),
        const SizedBox(height: 12),
        const _DescriptionText(
          'By accepting company property, I acknowledge and agree to the following conditions:',
        ),
        const SizedBox(height: 12),
        _buildBulletItem(
          'Property is issued for professional use only and must not be used for personal or non-agency activities.',
        ),
        _buildBulletItem(
          'I am responsible for the care, maintenance, and proper use of all assigned equipment or materials.',
        ),
        _buildBulletItem(
          'Any loss, theft, or damage must be reported immediately to my supervisor or the administrative office.',
        ),
        _buildBulletItem(
          'I understand that misuse, negligence, or unauthorized disclosure of information may result in disciplinary action, including financial liability or contract termination.',
        ),
        _buildBulletItem(
          'Upon termination or at the agency\'s request, I will return all property in my possession to Bright Horizons Mental Health, LLC.',
        ),
        const SizedBox(height: 24),

        const _SectionHeader('ACKNOWLEDGMENT'),
        const SizedBox(height: 12),
        const _DescriptionText(
          'I acknowledge that I have received company property as listed below (if applicable) and agree to the terms of this policy.',
        ),
        const SizedBox(height: 8),
        const _DescriptionText(
          'I understand that failure to return company property or to comply with this policy may result in financial responsibility for replacement and/or legal action.',
        ),
      ],
    );
  }
}

// =============================================================================
// 4. DIRECT DEPOSIT FORM VIEW
// =============================================================================
class DirectDepositFormView extends StatelessWidget {
  final CompilationSubTask task;
  const DirectDepositFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('DIRECT DEPOSIT AUTHORIZATION'),
        const SizedBox(height: 12),
        const _DescriptionText(
          'I hereby authorize BHMH to initiate credit entries to my account at the financial institution indicated below.',
        ),
        const SizedBox(height: 24),
        _InfoRow('Employee Name', formData['fullName'] ?? 'N/A'),
        _InfoRow('Date of Birth', formData['dateOfBirth'] ?? 'N/A'),
        _InfoRow('SSN (Last 4)', formData['ssn'] ?? 'N/A'),
        _InfoRow('Current Address', formData['address'] ?? 'N/A'),
        _InfoRow('Email Address', formData['email'] ?? 'N/A'),
        const SizedBox(height: 16),
        const _SectionHeader('BANK INFORMATION'),
        const SizedBox(height: 12),
        _InfoRow('Bank Name', formData['bankName'] ?? 'N/A'),
        _InfoRow('Account Type', formData['accountType'] ?? 'N/A'),
        _InfoRow('Account Number', formData['accountNumber'] ?? 'N/A'),
        _InfoRow('Routing Number', formData['routingNumber'] ?? 'N/A'),
      ],
    );
  }
}

// ─── Shared Completion Status & File Link Helper ─────────────────────────────
Widget _buildCompletionStatusAndFileLink(
  BuildContext context,
  CompilationSubTask task,
) {
  final formData = task.formData ?? {};
  final hasSubmitted =
      formData.isNotEmpty || (task.fileUrl != null && task.fileUrl!.isNotEmpty);
  final completedVirtually = formData['completedVirtually'] == 'true';
  final fileUrl = task.fileUrl;
  final hasFile = fileUrl != null && fileUrl.isNotEmpty;

  Color bgColor;
  Color borderColor;
  Color textColor;
  IconData icon;
  String text;

  if (!hasSubmitted) {
    bgColor = const Color(0xFFF1F5F9);
    borderColor = const Color(0xFFCBD5E1);
    textColor = const Color(0xFF64748B);
    icon = Icons.hourglass_empty_rounded;
    text = 'Not Submitted Yet';
  } else if (completedVirtually) {
    bgColor = const Color(0xFFE0F2FE);
    borderColor = const Color(0xFFBAE6FD);
    textColor = const Color(0xFF0369A1);
    icon = Icons.computer_rounded;
    text = 'Completed Virtually (Adobe)';
  } else {
    bgColor = const Color(0xFFF0FDF4);
    borderColor = const Color(0xFFBBF7D0);
    textColor = const Color(0xFF15803D);
    icon = Icons.file_present_rounded;
    text = 'Completed Physically';
  }

  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'COMPLETION TYPE',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: Colors.black54,
          letterSpacing: 0.5,
        ),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: textColor),
                const SizedBox(width: 8),
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      if (hasFile) ...[
        const SizedBox(height: 16),
        const Text(
          'UPLOADED DOCUMENT',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: Colors.black54,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.picture_as_pdf_rounded,
                size: 20,
                color: Color(0xFFE11D48),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  fileUrl.getCleanFileName(),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF334155),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: () async {
                  try {
                    final uri = Uri.parse(fileUrl);
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(
                        uri,
                        mode: LaunchMode.externalApplication,
                      );
                    }
                  } catch (_) {}
                },
                icon: const Icon(Icons.open_in_new_rounded, size: 14),
                label: const Text('Open'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF0284C7),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
      const SizedBox(height: 16),
    ],
  );
}

// =============================================================================
// 5. I-9 FORM VIEW
// =============================================================================
class I9FormView extends StatelessWidget {
  final CompilationSubTask task;
  const I9FormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('EMPLOYMENT ELIGIBILITY VERIFICATION (FORM I-9)'),
        const SizedBox(height: 24),
        _buildCompletionStatusAndFileLink(context, task),
        if (formData.containsKey('fullName') ||
            formData.containsKey('dateOfBirth') ||
            formData.containsKey('ssn') ||
            formData.containsKey('address')) ...[
          const _SectionHeader('SUBMITTED METADATA (LEGACY)'),
          const SizedBox(height: 16),
          if (formData.containsKey('fullName'))
            _InfoRow('Full Name', formData['fullName'] ?? 'N/A'),
          if (formData.containsKey('dateOfBirth'))
            _InfoRow('Date of Birth', formData['dateOfBirth'] ?? 'N/A'),
          if (formData.containsKey('ssn'))
            _InfoRow('SSN (Last 4)', formData['ssn'] ?? 'N/A'),
          if (formData.containsKey('address'))
            _InfoRow('Address', formData['address'] ?? 'N/A'),
          const SizedBox(height: 16),
        ],
        if (formData['citizenshipStatus'] != null) ...[
          const Text(
            'ATTESTATION OF CITIZENSHIP/IMMIGRATION STATUS:',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Colors.black54,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            formData['citizenshipStatus'] ?? 'N/A',
            style: const TextStyle(
              fontSize: 14,
              fontStyle: FontStyle.italic,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ],
    );
  }
}

// =============================================================================
// 6. W-9 FORM VIEW
// =============================================================================
class W9FormView extends StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  const W9FormView({super.key, required this.task, required this.employeeName});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(
          'REQUEST FOR TAXPAYER IDENTIFICATION NUMBER (FORM W-9)',
        ),
        const SizedBox(height: 24),
        _buildCompletionStatusAndFileLink(context, task),
        if (formData.containsKey('fullName') ||
            formData.containsKey('businessName') ||
            formData.containsKey('taxClassification') ||
            formData.containsKey('taxId') ||
            formData.containsKey('ssn')) ...[
          const _SectionHeader('SUBMITTED METADATA (LEGACY)'),
          const SizedBox(height: 16),
          if (formData.containsKey('fullName'))
            _InfoRow('Name', formData['fullName'] ?? employeeName),
          if (formData.containsKey('businessName'))
            _InfoRow('Business Name', formData['businessName'] ?? 'N/A'),
          if (formData.containsKey('taxClassification'))
            _InfoRow(
              'Tax Classification',
              formData['taxClassification'] ?? 'N/A',
            ),
          if (formData.containsKey('taxId') || formData.containsKey('ssn'))
            _InfoRow(
              'SSN / EIN',
              formData['taxId'] ?? formData['ssn'] ?? 'N/A',
            ),
          const SizedBox(height: 16),
        ],
        const Text(
          'Certification under penalties of perjury:',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: Colors.black54,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'I certify that the information provided on this form is true, correct, and complete.',
          style: TextStyle(
            fontSize: 14,
            fontStyle: FontStyle.italic,
            color: Color(0xFF334155),
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// 7. COMPETENCY FORM VIEW
// =============================================================================
class CompetencyFormView extends StatelessWidget {
  final CompilationSubTask task;
  const CompetencyFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};
    final skills = (formData['skills'] as List?) ?? [];
    final isQmhp = task.id == 'qmhp_cs_competency';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionHeader(
          isQmhp
              ? 'QMHP-CS CORE COMPETENCY EVALUATION'
              : 'COMPETENCY EVALUATION AND SKILLS CHECKLIST',
        ),
        const SizedBox(height: 24),
        if (skills.isEmpty)
          const _DescriptionText('No competency data has been submitted yet.')
        else
          Table(
            border: TableBorder.all(color: Colors.grey.shade300, width: 0.5),
            columnWidths: const {0: FlexColumnWidth(3), 1: FlexColumnWidth(1)},
            children: [
              TableRow(
                decoration: BoxDecoration(color: Colors.grey.shade100),
                children: const [
                  Padding(
                    padding: EdgeInsets.all(10),
                    child: Text(
                      'Skill/Competency Description',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.all(10),
                    child: Text(
                      'Rating',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              ...skills.map((skill) {
                final text = skill['text'] as String? ?? '';
                final rating = skill['rating'] as String? ?? 'N/A';
                return TableRow(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(10),
                      child: Text(text, style: const TextStyle(fontSize: 13)),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(10),
                      child: Text(
                        rating,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: rating == 'Met'
                              ? const Color(0xFF15803D)
                              : const Color(0xFFB91C1C),
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ],
          ),
      ],
    );
  }
}

// =============================================================================
// 8. ANNUAL TRAINING FORM VIEW
// =============================================================================
class AnnualTrainingFormView extends StatelessWidget {
  final CompilationSubTask task;
  const AnnualTrainingFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};

    final topicsList = [
      'Code of Conduct & Corporate Compliance',
      'Cultural Competency Refresher',
      'Ethics and Professional Conduct',
      'HIPAA and Confidentiality',
      'Workplace Safety & Emergency Preparedness',
      'Abuse, Neglect, and Exploitation Reporting',
      'Infection Control Refresher',
      'Trauma-Informed Care Practices',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('ANNUAL TRAINING AND IN-SERVICE LOG'),
        const SizedBox(height: 24),
        _buildTrainingTable(topicsList, formData, task.signedAt),
      ],
    );
  }
}

// =============================================================================
// 9. INITIAL TRAINING FORM VIEW
// =============================================================================
class InitialTrainingFormView extends StatelessWidget {
  final CompilationSubTask task;
  const InitialTrainingFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};

    final topicsList = [
      'Types of Services',
      'Person Centered Planning',
      'Documentation and Timelines',
      'Client Rights & Responsibilities',
      'Cultural Competency',
      'Crisis Intervention Steps',
      'Corporate Compliance & Ethics',
      'Confidentiality / HIPAA',
      'Mandatory Reporting',
      'Abuse and Neglect Reporting',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('INITIAL TRAINING AND COMPETENCY LOG'),
        const SizedBox(height: 24),
        _buildTrainingTable(topicsList, formData, task.signedAt),
      ],
    );
  }
}

// =============================================================================
// 10. EMERGENCY MEDICAL CARE FORM VIEW
// =============================================================================
class EmergencyMedicalCareFormView extends StatelessWidget {
  final CompilationSubTask task;
  const EmergencyMedicalCareFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('Authorization for Emergency Medical Care'),
        const SizedBox(height: 12),
        const _DescriptionText(
          'I authorize Bright Horizons Mental Health, LLC to seek and obtain emergency medical care on my behalf in the event of an emergency situation rendering me unable to obtain such care for myself.',
        ),
        const SizedBox(height: 24),

        const Text(
          'In case of an emergency please contact:',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildContactRow(
                '1.',
                formData['emergencyContact1Name'] ?? '',
                formData['emergencyContact1Phone'] ?? '',
                formData['emergencyContact1Relation'] ?? '',
              ),
              const SizedBox(height: 16),
              _buildContactRow(
                '2.',
                formData['emergencyContact2Name'] ?? '',
                formData['emergencyContact2Phone'] ?? '',
                formData['emergencyContact2Relation'] ?? '',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildContactRow(String numText, String name, String phone, String relation) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 4.0, right: 8.0),
          child: Text(numText, style: const TextStyle(fontWeight: FontWeight.bold)),
        ),
        Expanded(
          flex: 3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(bottom: 4),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.black26))),
                child: Text(name.isEmpty ? ' ' : name),
              ),
              const SizedBox(height: 4),
              const Text('Print Name', style: TextStyle(fontSize: 11, color: Colors.black54)),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          flex: 2,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(bottom: 4),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.black26))),
                child: Text(phone.isEmpty ? ' ' : phone),
              ),
              const SizedBox(height: 4),
              const Text('Telephone Number', style: TextStyle(fontSize: 11, color: Colors.black54)),
            ],
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          flex: 2,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(bottom: 4),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.black26))),
                child: Text(relation.isEmpty ? ' ' : relation),
              ),
              const SizedBox(height: 4),
              const Text('Relationship', style: TextStyle(fontSize: 11, color: Colors.black54)),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Shared Training Table Builder ───────────────────────────────────────────
Widget _buildTrainingTable(
  List<String> topicsList,
  Map<String, dynamic> formData,
  DateTime? signedAt,
) {
  final signedDateStr = signedAt != null
      ? "${signedAt.month}/${signedAt.day}/${signedAt.year}"
      : '—';

  return Table(
    border: TableBorder.all(color: Colors.grey.shade300, width: 0.5),
    columnWidths: const {
      0: FlexColumnWidth(3),
      1: FlexColumnWidth(2),
      2: FlexColumnWidth(1.5),
    },
    children: [
      TableRow(
        decoration: BoxDecoration(color: Colors.grey.shade100),
        children: const [
          Padding(
            padding: EdgeInsets.all(10),
            child: Text(
              'Training Topic',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(10),
            child: Text(
              'Date Completed',
              textAlign: TextAlign.center,
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
            ),
          ),
          Padding(
            padding: EdgeInsets.all(10),
            child: Text(
              'Score/Status',
              textAlign: TextAlign.center,
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
            ),
          ),
        ],
      ),
      ...topicsList.asMap().entries.map((entry) {
        final idx = entry.key;
        final name = entry.value;
        final fieldId = 'topic_${idx + 1}';

        final isChecked =
            formData[fieldId] == true || formData[fieldId] == 'true';
        final date = isChecked ? signedDateStr : '—';
        final status = isChecked ? 'Verified' : 'Pending';

        return TableRow(
          children: [
            Padding(
              padding: const EdgeInsets.all(10),
              child: Text(name, style: const TextStyle(fontSize: 13)),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Text(
                date,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Text(
                status,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: isChecked ? const Color(0xFF15803D) : Colors.black,
                ),
              ),
            ),
          ],
        );
      }),
    ],
  );
}

// =============================================================================
// 11. ATTESTATION FORM VIEW
// =============================================================================
class AttestationFormView extends StatelessWidget {
  final CompilationSubTask task;
  const AttestationFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};
    final illegalDrugsUsage = formData['illegalDrugsUsage'] ?? '';
    final doUse = illegalDrugsUsage == 'I do use illegal drugs';
    final doNotUse = illegalDrugsUsage == 'I do not use illegal drugs';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('Attestation Form'),
        const SizedBox(height: 12),
        const _DescriptionText(
          'Prior to accepting a position with Bright Horizons Mental Health, LLC, I hereby attest that I am capable of performing essential functions of job with or without accommodation.\n\n'
          'I hereby voluntarily consent to provide a urine specimen (or blood specimen as required for alcohol testing only) at a collection facility designated by Bright Horizons Mental Health, LLC, and further consent to have the specimen tested at a laboratory selected by Bright Horizons Mental Health, LLC.',
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            const Text(
              '(Check one) do ',
              style: TextStyle(fontSize: 14, color: Color(0xFF334155)),
            ),
            Icon(
              doUse ? Icons.check_box : Icons.check_box_outline_blank,
              size: 18,
              color: doUse ? const Color(0xFF109B85) : Colors.grey,
            ),
            const Text(
              ' or do not ',
              style: TextStyle(fontSize: 14, color: Color(0xFF334155)),
            ),
            Icon(
              doNotUse ? Icons.check_box : Icons.check_box_outline_blank,
              size: 18,
              color: doNotUse ? const Color(0xFF109B85) : Colors.grey,
            ),
            const Text(
              ' use illegal drugs.',
              style: TextStyle(fontSize: 14, color: Color(0xFF334155)),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const _DescriptionText(
          'I hereby attest that I possess a current valid professional license/and or have the credentials required to perform the job duties. I will provide a copy of my current license/certification to Bright Horizons Mental Health, LLC.\n\n'
          'I hereby attest that I am not under any limitation of privileges or disciplinary actions associated with my current licensing board.\n\n'
          'I hereby attest that I have reported to Bright Horizons Mental Health, LLC. A current or past adverse actions that may present risk management concerns to include Medicare/Medicaid exclusion, or sanctions; ethical violations, criminal convictions, etc...',
        ),
      ],
    );
  }
}

// =============================================================================
// 12. VEHICLE DOCUMENTATION FORM VIEW
// =============================================================================
class VehicleDocFormView extends StatelessWidget {
  final CompilationSubTask task;
  const VehicleDocFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};
    final fullName = formData['fullName'] ?? task.adminFormData?['employeeName'] ?? 'N/A';
    final positionTitle = formData['positionTitle'] ?? 'N/A';
    final signedDate = formData['signedDate'] ?? 
        (task.updatedAt != null ? "${task.updatedAt!.year}-${task.updatedAt!.month.toString().padLeft(2, '0')}-${task.updatedAt!.day.toString().padLeft(2, '0')}" : 'N/A');

    final fullContent = AppLegalContent.get(task.id) ?? '';
    // Strip the hardcoded header section since we are rendering it dynamically
    final splitIndex = fullContent.indexOf('Policy Summary');
    final policyText = splitIndex != -1 ? fullContent.substring(splitIndex) : fullContent;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader('Acknowledgement of Vehicle Documentation'),
        const SizedBox(height: 16),
        _InfoRow('Employee/Contractor Name', fullName),
        _InfoRow('Position/Title', positionTitle),
        _InfoRow('Date', signedDate),
        const SizedBox(height: 24),
        _DescriptionText(policyText),
      ],
    );
  }
}

