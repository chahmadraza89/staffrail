import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_form_views.dart';
import 'package:flutter/material.dart';

import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class AdminAcknowledgeFormView extends StatelessWidget {
  final CompilationSubTask task;
  const AdminAcknowledgeFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final taskIdNormalized = task.id.toLowerCase().replaceAll('’', "'");
    final isDriversVerification =
        taskIdNormalized.contains('driver') &&
        !taskIdNormalized.contains('license');
    final isInitialOrientation =
        taskIdNormalized.contains('initial_orientation') ||
        taskIdNormalized.contains('initialorientation') ||
        taskIdNormalized.contains('bhmh_initial_orientation');

    final bool showFields = task.status != TaskStatus.notStarted && task.status != TaskStatus.pending;

    final String fullName = showFields ? (task.formData?['fullName'] ?? task.employeeName ?? '') : '';
    final String signedDate = showFields
        ? (task.formData?['signedDate'] ??
            (task.updatedAt != null
                ? DateFormat('MMMM dd, yyyy').format(task.updatedAt!)
                : 'N/A'))
        : '';

    final String effectiveDateShort = showFields
        ? (task.formData?['signedDate'] ??
            (task.updatedAt != null
                ? DateFormat('MM/dd/yyyy').format(task.updatedAt!)
                : '01/01/2026'))
        : '';

    // Extract typed signature strictly if it exists
    final signatureData = task.signatureUrl ?? task.formData?['signatureData'];
    String signatureText = '';
    if (showFields && signatureData != null && signatureData.toString().startsWith('typed:')) {
      signatureText = signatureData.toString().substring(6);
    }

    // Content Sections from AppLegalContent
    final String fullContent = AppLegalContent.get(task.id) ?? '';
    final bool hasSections =
        fullContent.contains('**Purpose**') ||
        fullContent.contains('**Acknowledgement**');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 50),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          Center(
            child: Image.asset(
              'assets/images/a.png',
              height: 100,
              errorBuilder: (context, error, stackTrace) => const Icon(
                Icons.business_rounded,
                size: 80,
                color: Colors.grey,
              ),
            ),
          ),
          const SizedBox(height: 30),

          // Header Title (skip for code_of_conduct as it has its own layout)
          if (task.id != 'code_of_conduct_ethics') ...[
            Center(
              child: Text(
                task.title.toUpperCase(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF991B1B), // Darker Red for professional look
                  letterSpacing: 1.0,
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],

          // Content Rendering
          if (task.id == 'acknowledge_of_eoc_health_&_safety_policy' || 
              task.id == 'acknowledge_of_company_property') ...[
            LayoutBuilder(
              builder: (context, constraints) {
                final isMobile = constraints.maxWidth < 600;
                final position = task.formData?['position'] ?? task.adminFormData?['position'] ?? 'N/A';
                if (isMobile) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildFooterField('Employee/Contractor Name :', fullName),
                      const SizedBox(height: 24),
                      _buildFooterField('Position/Title :', position),
                      const SizedBox(height: 24),
                      _buildFooterField('Date :', signedDate),
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(flex: 3, child: _buildFooterField('Employee/Contractor Name :', fullName)),
                    const SizedBox(width: 32),
                    Expanded(flex: 2, child: _buildFooterField('Position/Title :', position)),
                    const SizedBox(width: 32),
                    Expanded(flex: 2, child: _buildFooterField('Date :', signedDate)),
                  ],
                );
              },
            ),
            const SizedBox(height: 40),
          ],

          if (isDriversVerification) ...[
            DriversVerificationFormView(task: task),
          ] else if (isInitialOrientation) ...[
            InitialOrientationFormView(
              task: task,
              effectiveDate: effectiveDateShort,
            ),
          ] else if (task.id == 'code_of_conduct_ethics') ...[
            CodeOfConductFormView(task: task),
          ] else if (task.id == 'alleged_abuse_neglect') ...[
            AllegedAbuseFormView(task: task),
          ] else if (task.id == 'acknowledge_of_company_property') ...[
            AcknowledgeOfCompanyPropertyFormView(task: task),
          ] else if (task.id == 'direct_deposit_authorization') ...[
            DirectDepositFormView(task: task),
          ] else if (task.id == 'tax_documents_i_9') ...[
            I9FormView(task: task),
          ] else if (task.id == 'tax_documents_w_9') ...[
            W9FormView(task: task, employeeName: fullName),
          ] else if (task.id.contains('competency') && task.id != 'cultural_competency') ...[
            CompetencyFormView(task: task),
          ] else if (task.id == 'annual_training') ...[
            AnnualTrainingFormView(task: task),
          ] else if (task.id == 'initial_training') ...[
            InitialTrainingFormView(task: task),
          ] else if (task.id == 'authorization_for_emergency_medical_care') ...[
            EmergencyMedicalCareFormView(task: task),
          ] else if (task.id == 'attestation_form') ...[
            AttestationFormView(task: task),
          ] else if (task.id == 'acknowledgement_of_vehicle_documentation') ...[
            VehicleDocFormView(task: task),
          ] else if (hasSections) ...[
            _buildLegalSection(
              'Purpose',
              _getSectionContent(fullContent, 'Purpose'),
            ),
            const SizedBox(height: 24),
            _buildLegalSection(
              'Terms and Conditions',
              _getSectionContent(fullContent, 'Terms and Conditions'),
              isList: true,
            ),
            const SizedBox(height: 24),
            _buildLegalSection(
              'Acknowledgement',
              _getSectionContent(fullContent, 'Acknowledgement'),
            ),
          ] else if (fullContent.isNotEmpty) ...[
            Text(
              fullContent.replaceAll('**', ''),
              style: const TextStyle(
                fontSize: 15,
                height: 1.7,
                color: Color(0xFF334155),
              ),
            ),
          ] else if ((task.formData != null && task.formData!.isNotEmpty) ||
              (task.adminFormData != null &&
                  task.adminFormData!.isNotEmpty)) ...[
            // Fallback: Show Form Data if no legal content is found
            const Text(
              'FORM SUBMISSION DATA',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 20),
            if (task.formData != null) ...[
              const Text(
                'EMPLOYEE SUBMISSION:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF109B85),
                ),
              ),
              const SizedBox(height: 12),
              ...task.formData!.entries
                  .where(
                    (e) => e.key != 'signatureData' && e.key != 'signedDate' && e.key != 'witnessSignature',
                  )
                  .map((e) => _buildDataRow(e.key, e.value)),
              const SizedBox(height: 24),
            ],
            if (task.adminFormData != null &&
                task.adminFormData!.isNotEmpty) ...[
              const Text(
                'ADMINISTRATIVE REVIEW:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF3B82F6),
                ),
              ),
              const SizedBox(height: 12),
              ...task.adminFormData!.entries
                  .where(
                    (e) =>
                        e.key != 'adminSignatureData' &&
                        e.key != 'verificationDate',
                  )
                  .map((e) => _buildDataRow(e.key, e.value)),
            ],
          ],

          const SizedBox(height: 80),

          // Footer Details (Signature Section)
          // Use document-specific labels matching original documents
          if (task.id != 'acknowledge_of_eoc_health_&_safety_policy' && 
              task.id != 'acknowledge_of_company_property') ...[
            _buildFooterField(
              _isConfidentialityForm(task.id)
                  ? 'Therapist/Staff Name :'
                  : 'Employee/Contractor Name :',
              fullName,
            ),
            const SizedBox(height: 32),
          ],

          LayoutBuilder(
            builder: (context, constraints) {
              final isMobile = constraints.maxWidth < 600;

              // Check if witness signature exists
              final witnessData = task.formData?['witnessSignature'] as String?;
              String witnessText = '';
              if (witnessData != null && witnessData.startsWith('typed:')) {
                witnessText = witnessData.substring(6);
              }

              final signatureLabel = _isConfidentialityForm(task.id)
                  ? 'Therapist/Staff Signature :'
                  : 'Employee/Contractor Signature :';

              if (isMobile) {
                return Column(
                  children: [
                    _buildSignatureField(
                      signatureLabel,
                      signatureText,
                    ),
                    const SizedBox(height: 24),
                    _buildFooterField('Date :', signedDate),
                    if (witnessText.isNotEmpty) ...[
                      const SizedBox(height: 32),
                      _buildSignatureField('Witness Signature :', witnessText),
                      const SizedBox(height: 24),
                      _buildFooterField('Date :', signedDate),
                    ],
                  ],
                );
              }

              return Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        flex: 2,
                        child: _buildSignatureField(
                          signatureLabel,
                          signatureText,
                        ),
                      ),
                      const SizedBox(width: 60),
                      Expanded(
                        child: _buildFooterField('Date :', signedDate),
                      ),
                    ],
                  ),
                  if (witnessText.isNotEmpty) ...[
                    const SizedBox(height: 32),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          flex: 2,
                          child: _buildSignatureField(
                            'Witness Signature :',
                            witnessText,
                          ),
                        ),
                        const SizedBox(width: 60),
                        Expanded(
                          child: _buildFooterField('Date :', signedDate),
                        ),
                      ],
                    ),
                  ],
                ],
              );
            },
          ),

          // Admin Counter-Signature Section (if exists)
          if (task.adminSignatureUrl != null) ...[
            const SizedBox(height: 64),
            const Divider(height: 40, thickness: 1, color: Colors.black12),
            const SizedBox(height: 24),
            _buildFooterField(
              'Authorized Agency Representative :',
              task.adminFormData?['supervisorName'] ?? 'StaffRail Administrator',
            ),
            const SizedBox(height: 32),
            LayoutBuilder(
              builder: (context, constraints) {
                final isMobile = constraints.maxWidth < 600;
                final adminSig = task.adminSignatureUrl!.replaceFirst(
                  'typed:',
                  '',
                );
                final adminDate =
                    task.adminFormData?['verificationDate'] ?? signedDate;

                if (isMobile) {
                  return Column(
                    children: [
                      _buildSignatureField(
                        'Authorized Agency Representative Signature :',
                        adminSig,
                      ),
                      const SizedBox(height: 24),
                      _buildFooterField('Date :', adminDate),
                    ],
                  );
                }

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      flex: 2,
                      child: _buildSignatureField(
                        'Authorized Agency Representative Signature :',
                        adminSig,
                      ),
                    ),
                    const SizedBox(width: 60),
                    Expanded(child: _buildFooterField('Date :', adminDate)),
                  ],
                );
              },
            ),
          ],

          const SizedBox(height: 40),
          Center(
            child: Column(
              children: [
                Text(
                  'Example Health Clinic Mental Health, LLC',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '100 Main Street, Suite 200',
                  style: TextStyle(
                    fontSize: 10,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                Text(
                  'Anytown, USA 00000',
                  style: TextStyle(
                    fontSize: 10,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDataRow(String key, dynamic value) {
    final label =
        '${key.replaceAll(RegExp(r'(_|(?=[A-Z]))'), ' ').trim().toUpperCase()}:';

    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
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
              value.toString(),
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

  Widget _buildLegalSection(
    String title,
    String content, {
    bool isList = false,
  }) {
    if (content.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 12),
        if (isList)
          ...content.split('\n').where((line) => line.trim().isNotEmpty).map((
            line,
          ) {
            final cleanLine = line.trim().startsWith('*')
                ? line.trim().substring(1).trim()
                : line.trim();
            return Padding(
              padding: const EdgeInsets.only(bottom: 10.0, left: 12.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start, // Fix for context
                children: [
                  const Text(
                    '• ',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Color(0xFF109B85),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      cleanLine,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.6,
                        color: Color(0xFF334155),
                      ),
                    ),
                  ),
                ],
              ),
            );
          })
        else
          Text(
            content,
            style: const TextStyle(
              fontSize: 15,
              height: 1.6,
              color: Color(0xFF334155),
            ),
          ),
      ],
    );
  }

  Widget _buildFooterField(String label, String value) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Use Column for anything less than 500px wide to ensure breathing room
        final useColumn = constraints.maxWidth < 500;

        if (useColumn) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Colors.black54,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(bottom: 6),
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.black26, width: 1.5),
                  ),
                ),
                child: Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.only(bottom: 4),
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.black, width: 1.0),
                  ),
                ),
                child: Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1E293B),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSignatureField(String label, String signatureText) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final useColumn = constraints.maxWidth < 500;

        if (useColumn) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Colors.black54,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                height: 60,
                alignment: Alignment.bottomCenter,
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.black26, width: 1.5),
                  ),
                ),
                child: Text(
                  signatureText,
                  style: GoogleFonts.dancingScript(
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                height: 50,
                alignment: Alignment.bottomCenter,
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.black, width: 1.5),
                  ),
                ),
                child: Text(
                  signatureText,
                  style: GoogleFonts.dancingScript(
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  String _getSectionContent(String fullContent, String sectionTitle) {
    final lines = fullContent.split('\n');

    int startIndex = -1;
    for (int i = 0; i < lines.length; i++) {
      if (lines[i].contains('**$sectionTitle**')) {
        startIndex = i + 1;
        break;
      }
    }

    if (startIndex == -1) return '';

    final result = <String>[];
    for (int i = startIndex; i < lines.length; i++) {
      if (lines[i].trim().startsWith('**') &&
          !lines[i].contains(sectionTitle)) {
        break;
      }
      result.add(lines[i]);
    }

    return result.join('\n').trim();
  }

  /// Returns true for confidentiality forms that need document-specific labels
  bool _isConfidentialityForm(String taskId) {
    return taskId == 'corporate_confidentiality_statement' ||
        taskId == 'confidentiality_of_client___therapist___staff';
  }
}

class InitialOrientationFormView extends StatelessWidget {
  final CompilationSubTask task;
  final String effectiveDate;

  const InitialOrientationFormView({
    super.key,
    required this.task,
    required this.effectiveDate,
  });

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Metadata Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 500) {
                return Column(
                  children: [
                    _buildMetadataItem('Effective Date', effectiveDate),
                    const Divider(height: 20, color: Color(0xFFE2E8F0)),
                    _buildMetadataItem('Review Cycle', 'Annual'),
                  ],
                );
              }
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildMetadataItem('Effective Date', effectiveDate),
                  Container(
                    width: 1,
                    height: 30,
                    color: const Color(0xFFE2E8F0),
                  ),
                  _buildMetadataItem('Review Cycle', 'Annual'),
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 32),

        // Employee Metadata
        if (formData['fullName'] != null || formData['position'] != null) ...[
          const Text(
            'EMPLOYEE INFORMATION',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F172A),
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 16),
          if (formData['fullName'] != null)
            _buildInfoRow('Full Legal Name', formData['fullName']),
          if (formData['position'] != null)
            _buildInfoRow('Position/Title', formData['position']),
          if (formData['startDate'] != null)
            _buildInfoRow('Start Date', formData['startDate']),
          const SizedBox(height: 32),
        ],

        // Orientation Topics Header
        const Text(
          'ORIENTATION TOPICS COVERED',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 20),

        _buildBulletItem(
          'Mission, Vision, and Values of Example Health Clinic Mental Health, LLC',
        ),
        _buildBulletItem('Code of Conduct and Corporate Compliance'),
        _buildBulletItem('Confidentiality and HIPAA Policy'),
        _buildBulletItem('Cultural Competency and Diversity Awareness'),
        _buildBulletItem('Workplace Safety and Emergency Procedures'),
        _buildBulletItem('Client Rights and Responsibilities'),
        _buildBulletItem('Abuse, Neglect, and Exploitation Reporting'),
        _buildBulletItem('Infection Control and Universal Precautions'),
        _buildBulletItem('Incident and Grievance Reporting Procedures'),

        const SizedBox(height: 32),

        // Final Acknowledgment
        const Text(
          'ACKNOWLEDGMENT',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F172A),
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'I acknowledge that I have completed the general orientation for Example Health Clinic Mental Health, LLC and understand all topics presented. I have received copies of related policies and procedures.',
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF334155),
            height: 1.5,
            fontStyle: FontStyle.italic,
          ),
        ),
      ],
    );
  }

  Widget _buildMetadataItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
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

  Widget _buildBulletItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 6.0),
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
}

class DriversVerificationFormView extends StatelessWidget {
  final CompilationSubTask task;

  const DriversVerificationFormView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final formData = task.formData ?? {};
    final isLegacy = formData.containsKey('ack_license');

    // Resolve values based on version
    final refusal = isLegacy ? 'false' : (formData['ack_refusal'] ?? 'false');
    final submitted = isLegacy
        ? (formData['ack_license'] ?? 'false')
        : (formData['ack_submitted'] ?? 'false');
    final future = isLegacy ? 'true' : (formData['ack_future'] ?? 'false');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildAcknowledgmentItem(
          '1. Due to non-presentation of valid Texas Driver\'s License and/or required Texas Liability vehicle insurance, I will not transport any recipients of this agency at any time, for any reason.',
          refusal == 'true',
        ),
        _buildAcknowledgmentItem(
          '2. I have submitted a current Texas Driver\'s License and Texas Liability vehicle insurance.',
          submitted == 'true',
        ),
        _buildAcknowledgmentItem(
          '3. I will provide Example Health Clinic Mental Health, LLC Services with current License and Insurance as updated and upon request.',
          future == 'true',
        ),
        const SizedBox(height: 32),
        const Text(
          'Employee Vehicle Inspection Form',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 12),
        _buildAcknowledgmentItem(
          'I certify that the vehicle used for StaffRail business has been inspected and is in safe operating condition.',
          formData['ack_inspection'] == 'true',
        ),
        const SizedBox(height: 32),
        const Text(
          'VEHICLE DOCUMENTATION EXPIRATION DATES',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: Color(0xFF64748B),
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 20),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 1, // Single column for single date
            childAspectRatio: 5, // Taller for Column layout
            crossAxisSpacing: 30,
            mainAxisSpacing: 15,
          ),
          itemCount: 1,
          itemBuilder: (context, i) {
            final date = formData['exp_date_${i + 1}'] ?? 'N/A';
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'VEHICLE EXPIRATION DATE:',
                  style: TextStyle(
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
                    date,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildAcknowledgmentItem(String text, bool checked) {
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
