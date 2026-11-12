import 'package:bhmh/core/services/pdf/builders/signature_generation_builder.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import '../pdf_constants.dart';
import '../pdf_widgets.dart';

class EmergencyMedicalCareContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  EmergencyMedicalCareContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'Authorization for Emergency Medical Care',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.SizedBox(height: 15),
        pw.Text(
          'I, $employeeName authorize Example Health Clinic, LLC to seek and obtain emergency medical care on my behalf in the event of an emergency situation rendering me unable to obtain such care for myself.',
          style: const pw.TextStyle(fontSize: 10),
        ),
        pw.SizedBox(height: 25),
        pw.Text(
          'In case of an emergency please contact:',
          style: const pw.TextStyle(fontSize: 10),
        ),
        pw.SizedBox(height: 10),
        pw.Table(
          border: null,
          columnWidths: {
            0: const pw.FlexColumnWidth(1),
            1: const pw.FlexColumnWidth(3),
            2: const pw.FlexColumnWidth(3),
            3: const pw.FlexColumnWidth(3),
          },
          children: [
            pw.TableRow(
              children: [
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 4),
                  child: pw.Text('1.', style: const pw.TextStyle(fontSize: 10)),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 4),
                  child: pw.Container(
                    decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5))),
                    child: pw.Text(formData['emergencyContact1Name'] ?? '', style: const pw.TextStyle(fontSize: 10)),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 4),
                  child: pw.Container(
                    decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5))),
                    child: pw.Text(formData['emergencyContact1Phone'] ?? '', style: const pw.TextStyle(fontSize: 10)),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 4),
                  child: pw.Container(
                    decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5))),
                    child: pw.Text(formData['emergencyContact1Relation'] ?? '', style: const pw.TextStyle(fontSize: 10)),
                  ),
                ),
              ],
            ),
            pw.TableRow(
              children: [
                pw.SizedBox(),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 12),
                  child: pw.Text('Print Name', style: const pw.TextStyle(fontSize: 8)),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 12),
                  child: pw.Text('Telephone Number', style: const pw.TextStyle(fontSize: 8)),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 12),
                  child: pw.Text('Relationship', style: const pw.TextStyle(fontSize: 8)),
                ),
              ],
            ),
            pw.TableRow(
              children: [
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 4),
                  child: pw.Text('2.', style: const pw.TextStyle(fontSize: 10)),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 4),
                  child: pw.Container(
                    decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5))),
                    child: pw.Text(formData['emergencyContact2Name'] ?? '', style: const pw.TextStyle(fontSize: 10)),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8, bottom: 4),
                  child: pw.Container(
                    decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5))),
                    child: pw.Text(formData['emergencyContact2Phone'] ?? '', style: const pw.TextStyle(fontSize: 10)),
                  ),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 4),
                  child: pw.Container(
                    decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5))),
                    child: pw.Text(formData['emergencyContact2Relation'] ?? '', style: const pw.TextStyle(fontSize: 10)),
                  ),
                ),
              ],
            ),
            pw.TableRow(
              children: [
                pw.SizedBox(),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8),
                  child: pw.Text('Print Name', style: const pw.TextStyle(fontSize: 8)),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 8),
                  child: pw.Text('Telephone Number', style: const pw.TextStyle(fontSize: 8)),
                ),
                pw.Text('Relationship', style: const pw.TextStyle(fontSize: 8)),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class DriversVerificationContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  DriversVerificationContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};
    final isLegacy = formData.containsKey('ack_license');

    // Resolve values based on version
    final refusal = isLegacy ? 'false' : (formData['ack_refusal'] ?? 'false');
    final submitted = isLegacy
        ? (formData['ack_license'] ?? 'false')
        : (formData['ack_submitted'] ?? 'false');
    final future = isLegacy ? 'true' : (formData['ack_future'] ?? 'false');
    final inspection = formData['ack_inspection'] ?? 'false';
    final expDate = formData['exp_date_1'] ?? 'N/A';

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        PdfAcknowledgmentItem(
          '1. Due to non-presentation of valid Texas Driver\'s License and/or required Texas Liability vehicle insurance, I will not transport any recipients of this agency at any time, for any reason.',
          checked: refusal == 'true',
        ),
        pw.SizedBox(height: 10),
        PdfAcknowledgmentItem(
          '2. I have submitted a current Texas Driver\'s License and Texas Liability vehicle insurance.',
          checked: submitted == 'true',
        ),
        pw.SizedBox(height: 10),
        PdfAcknowledgmentItem(
          '3. I will provide Example Health Clinic, LLC Services with current License and Insurance as updated and upon request.',
          checked: future == 'true',
        ),
        pw.SizedBox(height: 25),
        pw.Text(
          'Employee Vehicle Inspection Form',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 10),
        PdfAcknowledgmentItem(
          'I certify that the vehicle used for StaffRail business has been inspected and is in safe operating condition.',
          checked: inspection == 'true',
        ),
        pw.SizedBox(height: 25),
        pw.Text(
          'VEHICLE DOCUMENTATION EXPIRATION DATES',
          style: pw.TextStyle(
            fontSize: 10,
            fontWeight: pw.FontWeight.bold,
            color: PdfColors.grey700,
          ),
        ),
        pw.SizedBox(height: 10),
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'VEHICLE EXPIRATION DATE:',
              style: pw.TextStyle(
                fontSize: 9,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.grey600,
              ),
            ),
            pw.SizedBox(height: 4),
            pw.Container(
              width: double.infinity,
              padding: const pw.EdgeInsets.only(bottom: 4),
              decoration: const pw.BoxDecoration(
                border: pw.Border(
                  bottom: pw.BorderSide(color: PdfColors.grey300, width: 0.5),
                ),
              ),
              child: pw.Text(
                expDate,
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.grey800,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class CodeOfConductContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  CodeOfConductContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        // ── WELCOME Section ──────────────────────────────────────────────
        pw.Center(
          child: pw.Text(
            'WELCOME',
            style: pw.TextStyle(
              fontSize: 18,
              fontWeight: pw.FontWeight.bold,
              color: PdfReportConstants.primaryColor,
            ),
          ),
        ),
        pw.SizedBox(height: 15),
        pw.Text(
          'Welcome to Example Health Clinic, LLC. I would like to wish you much success here. I hope that your experience here will be challenging, enjoyable and rewarding.',
          style: const pw.TextStyle(
            fontSize: 11,
            lineSpacing: 3,
            color: PdfColors.black,
          ),
          textAlign: pw.TextAlign.center,
        ),
        pw.SizedBox(height: 20),

        // ── Sincerely Block ──────────────────────────────────────────────
        pw.Center(
          child: pw.Column(
            children: [
              pw.Text(
                'Sincerely,',
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.black,
                ),
              ),
              pw.SizedBox(height: 4),
              pw.Text(
                'Clinic Director',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontStyle: pw.FontStyle.italic,
                  color: PdfColors.grey700,
                ),
              ),
              pw.SizedBox(height: 2),
              pw.Text(
                'Chief Executive Officer',
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.black,
                ),
              ),
            ],
          ),
        ),
        pw.SizedBox(height: 20),

        // ── Divider ──────────────────────────────────────────────────────
        pw.Container(
          height: 1,
          color: PdfColors.grey400,
        ),
        pw.SizedBox(height: 20),

        // ── Code of Ethics/Conduct Heading ───────────────────────────────
        pw.Center(
          child: pw.Text(
            'Code of Ethics/Conduct',
            style: pw.TextStyle(
              fontSize: 16,
              fontWeight: pw.FontWeight.bold,
              color: PdfReportConstants.primaryColor,
            ),
          ),
        ),
        pw.SizedBox(height: 15),

        // ── 8 Numbered Ethics Items ──────────────────────────────────────
        _buildNumberedItem(1, 'To avoid real or perceived conflicts of interest'),
        _buildNumberedItem(2, 'To be honest and realistic when documenting services provided'),
        _buildNumberedItem(3, 'To reject bribery in all its forms'),
        _buildNumberedItem(4, 'To improve the understanding of behavioral health services'),
        _buildNumberedItem(5, 'To treat all staff and clients fairly and not engage in any acts of discrimination'),
        _buildNumberedItem(6, 'To provide safe environment for clients and staff'),
        _buildNumberedItem(7, 'Abide by all applicable federal and state laws, including HIPPA'),
        _buildNumberedItem(8, 'To abide by this Code of Ethics'),
        pw.SizedBox(height: 20),

        // ── Acknowledgment Section ───────────────────────────────────────
        pw.Text(
          'Acknowledgment',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
            color: PdfColors.black,
          ),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          'I acknowledge that I have received, read, and understood the Code of Ethics/Conduct document',
          style: const pw.TextStyle(
            fontSize: 10,
            lineSpacing: 3,
            color: PdfColors.black,
          ),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          'I agree to comply with all applicable laws, regulations, and agency policies, and to conduct myself in a professional and ethical manner consistent with the mission and standards of Example Health Clinic, LLC.',
          style: const pw.TextStyle(
            fontSize: 10,
            lineSpacing: 3,
            color: PdfColors.black,
          ),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          'I understand that failure to comply with these standards may result in disciplinary or corrective action, up to and including termination of employment or contractual agreement.',
          style: const pw.TextStyle(
            fontSize: 10,
            lineSpacing: 3,
            color: PdfColors.black,
          ),
        ),
      ],
    );
  }

  pw.Widget _buildNumberedItem(int number, String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6, left: 20),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 20,
            child: pw.Text(
              '$number.',
              style: pw.TextStyle(
                fontSize: 11,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.black,
              ),
            ),
          ),
          pw.SizedBox(width: 4),
          pw.Expanded(
            child: pw.Text(
              text,
              style: pw.TextStyle(
                fontSize: 11,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AllegedAbuseContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  AllegedAbuseContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.SizedBox(height: 10),
        pw.Text(
          'It is the policy of Example Health Clinic, LLC to report all instances of suspected abuse and neglect to the appropriate protective services department in accordance with Texas statute. The statute provides immunity from civil or criminal liability for persons making reports of abuse in good faith.',
          style: const pw.TextStyle(
            fontSize: 11,
            lineSpacing: 3,
            color: PdfColors.black,
          ),
          textAlign: pw.TextAlign.justify,
        ),
        pw.SizedBox(height: 25),
        pw.Padding(
          padding: const pw.EdgeInsets.symmetric(horizontal: 40),
          child: pw.Text(
            'Abuse means any willful and unjustified infliction of pain, injury or mental anguish upon a recipient by a person other than another recipient.',
            style: pw.TextStyle(
              fontSize: 11,
              fontStyle: pw.FontStyle.italic,
              lineSpacing: 3,
              color: PdfColors.black,
            ),
            textAlign: pw.TextAlign.center,
          ),
        ),
        pw.SizedBox(height: 25),
        pw.Text(
          'I acknowledge that I have received a copy of the "Alleged or Suspected Abuse and Neglect Reporting" policy and have been trained on agency policy and procedures.',
          style: const pw.TextStyle(
            fontSize: 11,
            lineSpacing: 3,
            color: PdfColors.black,
          ),
          textAlign: pw.TextAlign.justify,
        ),
      ],
    );
  }
}

class AcknowledgeOfCompanyPropertyContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;
  final List<CompilationSubTask>? allTasks;

  AcknowledgeOfCompanyPropertyContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
    this.allTasks,
  });

  String _resolveEmployeePosition() {
    if (task.formData?['position'] != null &&
        (task.formData!['position'] as String).isNotEmpty) {
      return task.formData!['position'];
    }
    if (allTasks != null) {
      for (final t in allTasks!) {
        final pos = t.formData?['position'] ?? t.adminFormData?['position'];
        if (pos != null && pos.toString().isNotEmpty) {
          return pos.toString();
        }
      }
    }
    return 'Staff Member'; // Fallback
  }

  pw.Widget _buildSectionHeader(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(top: 16, bottom: 6),
      child: pw.Text(
        title,
        style: pw.TextStyle(
          fontSize: 11,
          fontWeight: pw.FontWeight.bold,
          color: PdfColors.black,
        ),
      ),
    );
  }

  pw.Widget _buildParagraph(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Text(
        text,
        style: const pw.TextStyle(
          fontSize: 9.5,
          color: PdfColors.grey900,
          height: 1.3,
        ),
        textAlign: pw.TextAlign.justify,
      ),
    );
  }

  pw.Widget _buildBulletItem(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6, left: 15),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('- ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
          pw.Expanded(
            child: pw.Text(
              text,
              style: const pw.TextStyle(
                fontSize: 9.5,
                color: PdfColors.grey900,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  pw.Widget build(pw.Context context) {
    final position = _resolveEmployeePosition();

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        // Title
        pw.Center(
          child: pw.Text(
            'Acknowledgment of Company Property',
            style: pw.TextStyle(
              fontSize: 16,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.black,
            ),
          ),
        ),
        pw.SizedBox(height: 25),

        // Metadata fields
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Employee/Contractor Name: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 300,
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(width: 0.5))),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                child: pw.Text(employeeName, style: const pw.TextStyle(fontSize: 10)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 16),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Position/Title: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 220,
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(width: 0.5))),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                child: pw.Text(position, style: const pw.TextStyle(fontSize: 10)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 16),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Date: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 180,
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(width: 0.5))),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                child: pw.Text(signedDate, style: const pw.TextStyle(fontSize: 10)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 25),

        // Policy Summary
        _buildSectionHeader('Policy Summary'),
        _buildParagraph(
          'To ensure accountability, security, and proper maintenance of organizational resources, Example Health Clinic, LLC issues company property to employees and contractors as needed for the performance of their duties.',
        ),
        _buildParagraph(
          'This property is considered the sole property of Example Health Clinic, LLC and must be used responsibly, only for legitimate business purposes, and in accordance with agency policy.',
        ),

        // Company Property Covered
        _buildSectionHeader('Company Property Covered'),
        _buildParagraph(
          'Company property may include, but is not limited to:',
        ),
        _buildBulletItem('Identification badges and access cards'),
        _buildBulletItem('Office keys or key fobs'),
        _buildBulletItem('Laptops, tablets, or mobile phones'),
        _buildBulletItem('Agency documents, handbooks, or training materials'),
        _buildBulletItem('Uniforms, equipment, or medical/safety supplies'),
        _buildBulletItem('Software, electronic data, and confidential materials'),
        pw.SizedBox(height: 4),
        _buildParagraph(
          'All items remain the property of Example Health Clinic, LLC and must be returned in good working condition upon request, termination, or contract completion.',
        ),

        // Force page break to match screenshot
        pw.NewPage(),

        // Usage and Responsibility
        _buildSectionHeader('Usage and Responsibility'),
        _buildParagraph(
          'By accepting company property, I acknowledge and agree to the following conditions:',
        ),
        _buildBulletItem('Property is issued for professional use only and must not be used for personal or non-agency activities.'),
        _buildBulletItem('I am responsible for the care, maintenance, and proper use of all assigned equipment or materials.'),
        _buildBulletItem('Any loss, theft, or damage must be reported immediately to my supervisor or the administrative office.'),
        _buildBulletItem('I understand that misuse, negligence, or unauthorized disclosure of information may result in disciplinary action, including financial liability or contract termination.'),
        _buildBulletItem('Upon termination or at the agency\'s request, I will return all property in my possession to Example Health Clinic, LLC.'),

        // Acknowledgment
        _buildSectionHeader('Acknowledgment'),
        _buildParagraph(
          'I acknowledge that I have received company property as listed below (if applicable) and agree to the terms of this policy.',
        ),
        _buildParagraph(
          'I understand that failure to return company property or to comply with this policy may result in financial responsibility for replacement and/or legal action.',
        ),
        pw.SizedBox(height: 20),
      ],
    );
  }
}

class InitialOrientationContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  InitialOrientationContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        // Metadata Banner
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: pw.BoxDecoration(
            color: PdfColor.fromHex('#F8FAFC'),
            borderRadius: pw.BorderRadius.circular(8),
            border: pw.Border.all(color: PdfColor.fromHex('#E2E8F0')),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
            children: [
              pw.Column(
                children: [
                  pw.Text(
                    'Effective Date',
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColor.fromHex('#64748B'),
                    ),
                  ),
                  pw.SizedBox(height: 4),
                  pw.Text(
                    signedDate,
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColor.fromHex('#0F172A'),
                    ),
                  ),
                ],
              ),
              pw.Container(
                width: 1,
                height: 30,
                color: PdfColor.fromHex('#E2E8F0'),
              ),
              pw.Column(
                children: [
                  pw.Text(
                    'Review Cycle',
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColor.fromHex('#64748B'),
                    ),
                  ),
                  pw.SizedBox(height: 4),
                  pw.Text(
                    'Annual',
                    style: pw.TextStyle(
                      fontSize: 12,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColor.fromHex('#0F172A'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        pw.SizedBox(height: 25),

        // Employee Metadata
        if (formData['fullName'] != null || formData['position'] != null) ...[
          pw.Text(
            'EMPLOYEE INFORMATION',
            style: pw.TextStyle(
              fontSize: 12,
              fontWeight: pw.FontWeight.bold,
              color: PdfColor.fromHex('#0F172A'),
            ),
          ),
          pw.SizedBox(height: 10),
          if (formData['fullName'] != null)
            _buildPdfInfoRow('Full Legal Name', formData['fullName']),
          if (formData['position'] != null)
            _buildPdfInfoRow('Position/Title', formData['position']),
          if (formData['startDate'] != null)
            _buildPdfInfoRow('Start Date', formData['startDate']),
          pw.SizedBox(height: 25),
        ],

        // Orientation Topics Header
        pw.Text(
          'ORIENTATION TOPICS COVERED',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
            color: PdfColor.fromHex('#0F172A'),
          ),
        ),
        pw.SizedBox(height: 10),

        _buildPdfBulletItem(
          'Mission, Vision, and Values of Example Health Clinic, LLC',
        ),
        _buildPdfBulletItem('Code of Conduct and Corporate Compliance'),
        _buildPdfBulletItem('Confidentiality and HIPAA Policy'),
        _buildPdfBulletItem('Cultural Competency and Diversity Awareness'),
        _buildPdfBulletItem('Workplace Safety and Emergency Procedures'),
        _buildPdfBulletItem('Client Rights and Responsibilities'),
        _buildPdfBulletItem('Abuse, Neglect, and Exploitation Reporting'),
        _buildPdfBulletItem('Infection Control and Universal Precautions'),
        _buildPdfBulletItem('Incident and Grievance Reporting Procedures'),

        pw.SizedBox(height: 25),

        // Final Acknowledgment
        pw.Text(
          'ACKNOWLEDGMENT',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
            color: PdfColor.fromHex('#0F172A'),
          ),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          'I acknowledge that I have completed the general orientation for Example Health Clinic, LLC and understand all topics presented. I have received copies of related policies and procedures.',
          style: pw.TextStyle(
            fontSize: 11,
            color: PdfColor.fromHex('#334155'),
            fontStyle: pw.FontStyle.italic,
          ),
        ),
      ],
    );
  }

  pw.Widget _buildPdfInfoRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 12),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            label.toUpperCase(),
            style: pw.TextStyle(
              fontSize: 9,
              fontWeight: pw.FontWeight.bold,
              color: PdfColor.fromHex('#64748B'),
            ),
          ),
          pw.SizedBox(height: 2),
          pw.Container(
            width: double.infinity,
            padding: const pw.EdgeInsets.only(bottom: 4),
            decoration: const pw.BoxDecoration(
              border: pw.Border(
                bottom: pw.BorderSide(color: PdfColors.grey300, width: 0.5),
              ),
            ),
            child: pw.Text(
              value,
              style: pw.TextStyle(
                fontSize: 11,
                fontWeight: pw.FontWeight.bold,
                color: PdfColor.fromHex('#1E293B'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  pw.Widget _buildPdfBulletItem(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(
            margin: const pw.EdgeInsets.only(top: 4, right: 8),
            width: 4,
            height: 4,
            decoration: const pw.BoxDecoration(
              color: PdfColors.grey600,
              shape: pw.BoxShape.circle,
            ),
          ),
          pw.Expanded(
            child: pw.Text(
              text,
              style: const pw.TextStyle(fontSize: 11, color: PdfColors.grey800),
            ),
          ),
        ],
      ),
    );
  }
}

class DirectDepositContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  DirectDepositContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'DIRECT DEPOSIT AUTHORIZATION',
          style: pw.TextStyle(
            fontSize: 14,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 10),
        pw.Text(
          'I hereby authorize StaffRail to initiate credit entries to my account at the financial institution indicated below.',
          style: const pw.TextStyle(fontSize: 11),
        ),
        pw.SizedBox(height: 20),
        PdfFieldLine('Employee Name', employeeName),
        PdfFieldLine('Date of Birth', formData['dateOfBirth'] ?? 'N/A'),
        PdfFieldLine('SSN (Last 4)', formData['ssn'] ?? 'N/A'),
        PdfFieldLine('Current Address', formData['address'] ?? 'N/A'),
        PdfFieldLine('Email Address', formData['email'] ?? 'N/A'),
        pw.SizedBox(height: 15),
        pw.Text(
          'BANK INFORMATION',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.SizedBox(height: 8),
        PdfFieldLine('Bank Name', formData['bankName'] ?? 'N/A'),
        PdfFieldLine('Account Type', formData['accountType'] ?? 'N/A'),
        PdfFieldLine('Account Number', formData['accountNumber'] ?? 'N/A'),
        PdfFieldLine('Routing Number', formData['routingNumber'] ?? 'N/A'),
      ],
    );
  }
}

class I9FormContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  I9FormContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'EMPLOYMENT ELIGIBILITY VERIFICATION (FORM I-9)',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 15),
        PdfFieldLine('Full Name', formData['fullName'] ?? employeeName),
        PdfFieldLine('Date of Birth', formData['dateOfBirth'] ?? 'N/A'),
        PdfFieldLine('SSN (Last 4)', formData['ssn'] ?? 'N/A'),
        PdfFieldLine('Address', formData['address'] ?? 'N/A'),
        pw.SizedBox(height: 15),
        pw.Text(
          'Attestation of Citizenship/Immigration Status:',
          style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
        ),
        pw.Padding(
          padding: const pw.EdgeInsets.all(8),
          child: pw.Text(
            formData['citizenshipStatus'] ?? 'N/A',
            style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic),
          ),
        ),
        pw.SizedBox(height: 25),
        TaxDocumentsSignatureSection(
          task: task,
          employeeName: employeeName,
          employeeSig: employeeSig,
          signedDate: signedDate,
        ),
      ],
    );
  }
}

class W9FormContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  W9FormContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'REQUEST FOR TAXPAYER IDENTIFICATION NUMBER (FORM W-9)',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 15),
        PdfFieldLine(
          'Name',
          formData['fullName'] ?? formData['name'] ?? employeeName,
        ),
        PdfFieldLine('Business Name', formData['businessName'] ?? 'N/A'),
        PdfFieldLine(
          'Tax Classification',
          formData['taxClassification'] ?? 'N/A',
        ),
        PdfFieldLine(
          'SSN / EIN',
          formData['taxId'] ?? formData['ssn'] ?? 'N/A',
        ),
        pw.SizedBox(height: 15),
        pw.Text(
          'Certification under penalties of perjury:',
          style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
        ),
        pw.Padding(
          padding: const pw.EdgeInsets.all(8),
          child: pw.Text(
            'I certify that the information provided on this form is true, correct, and complete.',
            style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic),
          ),
        ),
        pw.SizedBox(height: 25),
        TaxDocumentsSignatureSection(
          task: task,
          employeeName: employeeName,
          employeeSig: employeeSig,
          signedDate: signedDate,
        ),
      ],
    );
  }
}

class EocPolicyContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;
  final List<CompilationSubTask>? allTasks;

  EocPolicyContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
    this.allTasks,
  });

  String _resolveEmployeePosition() {
    if (task.formData?['position'] != null &&
        (task.formData!['position'] as String).isNotEmpty) {
      return task.formData!['position'];
    }
    if (allTasks != null) {
      for (final t in allTasks!) {
        final pos = t.formData?['position'] ?? t.adminFormData?['position'];
        if (pos != null && pos.toString().isNotEmpty) {
          return pos.toString();
        }
      }
    }
    return 'Staff Member'; // Fallback
  }

  @override
  pw.Widget build(pw.Context context) {
    final position = _resolveEmployeePosition();

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        // Metadata fields
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Employee/Contractor Name: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 300,
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(width: 0.5))),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                child: pw.Text(employeeName, style: const pw.TextStyle(fontSize: 10)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 16),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Position/Title: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 220,
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(width: 0.5))),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                child: pw.Text(position, style: const pw.TextStyle(fontSize: 10)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 16),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Date: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 180,
              decoration: const pw.BoxDecoration(border: pw.Border(bottom: pw.BorderSide(width: 0.5))),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                child: pw.Text(signedDate, style: const pw.TextStyle(fontSize: 10)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 15),

        // Policy Summary
        _buildSectionHeader('Policy Summary'),
        _buildParagraph(
          'Example Health Clinic, LLC values the health and safety of the clients we serve, staff members, employees, and visitors, and maintains a comprehensive safety program to promote a safe environment within our program sites.',
        ),
        _buildParagraph(
          'It is the policy of StaffRail to maintain an environment that conforms to all legal, regulatory, and accreditation health and safety requirements, and to designate persons responsible for the planning, implementation, and oversight of a comprehensive organization-wide health and safety program. Example Health Clinic, LLC health and safety procedures will focus on two major areas: the identification, monitoring, evaluation, reduction, or elimination of health and safety risks; and planning and preparation to maximize the health and well-being of individuals in the event of disasters or emergency situations.',
        ),
        _buildParagraph(
          'To assist in providing a safe and healthful work environment for contractors, employees, clients, and visitors, Example Health Clinic has established a workplace safety program. This program is a top priority for Example Health Clinic, and its success depends on the alertness and personal commitment of all team members.',
        ),
        pw.SizedBox(height: 10),

        // Employee and Contractor Involvement
        _buildSectionHeader('Employee and Contractor Involvement:'),
        _buildParagraph(
          'Some of the best safety improvement ideas come from employees and contractors. Those with ideas, concerns, or suggestions for improving workplace safety are encouraged to raise them with their supervisor, manager, or agency staff. Reports about safety issues may be made anonymously and without fear of reprisal.',
        ),
        _buildParagraph(
          'Each contractor is expected to obey safety rules and exercise caution in all work activities. Contractors must immediately report any unsafe condition to the agency. Contractors who violate safety standards, cause hazardous or dangerous situations, or fail to report or remedy such conditions may be subject to contract termination.',
        ),
        pw.SizedBox(height: 10),

        // Additional Safety Policies Header
        pw.Text(
          'Additional Safety Policies',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
            decoration: pw.TextDecoration.underline,
          ),
        ),
        pw.SizedBox(height: 10),

        // Smoking
        _buildSubSectionHeader('Smoking:'),
        _buildParagraph(
          "In keeping with Example Health Clinic' intent to provide a safe and healthful work environment, smoking in the workplace is prohibited. This policy applies equally to all contractors, employees, clients, and visitors.",
        ),
        pw.SizedBox(height: 10),

        // Workplace Violence Prevention
        _buildSubSectionHeader('Workplace Violence Prevention:'),
        _buildParagraph(
          'Example Health Clinic is committed to preventing workplace violence and maintaining a safe work environment. All individuals are expected to treat one another with respect and refrain from fighting, "horseplay," or other dangerous conduct.',
        ),
        _buildParagraph(
          'Firearms, weapons, or other hazardous substances are prohibited on the premises without authorization.',
        ),
        _buildParagraph(
          'All threats or acts of violence - direct or indirect - must be reported immediately to a supervisor or management. Reports will be handled confidentially, and anyone found responsible for such behavior will be subject to disciplinary action, up to and including termination of employment or contract.',
        ),
        pw.SizedBox(height: 10),

        // Drug and Alcohol Use
        _buildSubSectionHeader('Drug and Alcohol Use:'),
        _buildParagraph(
          'Example Health Clinic is a drug-free workplace. Contractors must report to work in appropriate mental and physical condition to perform duties safely and effectively.',
        ),
        _buildParagraph(
          'While on company premises or conducting business-related activities, no contractor may use, possess, distribute, sell, or be under the influence of alcohol or illegal drugs.',
        ),
        _buildParagraph(
          'Violations may result in termination and legal consequences. Contractors working on government contracts must notify the agency of any workplace-related drug convictions within five days.',
        ),
        pw.SizedBox(height: 10),

        // Sexual and Other Unlawful Harassment
        _buildSectionHeader('Sexual and Other Unlawful Harassment:'),
        _buildParagraph(
          'Example Health Clinic maintains a zero-tolerance policy against discrimination or harassment based on sex, race, color, national origin, age, religion, disability, sexual orientation, or any other protected status.',
        ),
        _buildParagraph(
          'All complaints will be promptly and discreetly investigated, and retaliation is prohibited. Anyone found engaging in unlawful harassment will be subject to disciplinary action, up to and including termination.',
        ),
        pw.SizedBox(height: 10),

        // Personal Appearance
        _buildSectionHeader('Personal Appearance:'),
        _buildParagraph(
          'Contractors are expected to maintain a clean, neat, and professional appearance that aligns with the image Example Health Clinic presents to the community. Tattoos must be covered, and body piercings or strong fragrances should be avoided. Shoes must ensure safety and secure footing. The CEO determines the appropriate dress code for specific roles.',
        ),
        pw.SizedBox(height: 10),

        // Problem Resolution
        _buildSectionHeader('Problem Resolution:'),
        _buildParagraph(
          'Example Health Clinic encourages open communication. Contractors may report complaints or suggestions regarding workplace conditions, conduct, or policies without fear of retaliation.',
        ),
        _buildParagraph(
          'If a contractor disagrees with a policy or action, they may follow the internal problem resolution steps outlined in the Contractor Handbook, escalating issues up to arbitration if necessary.',
        ),
        pw.SizedBox(height: 15),

        // Acknowledgment Statement Box
        pw.Container(
          padding: const pw.EdgeInsets.all(10),
          decoration: pw.BoxDecoration(
            color: PdfColors.grey100,
            borderRadius: pw.BorderRadius.circular(6),
            border: pw.Border.all(color: PdfColors.grey300, width: 0.5),
          ),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                'Acknowledgment',
                style: pw.TextStyle(
                  fontSize: 10,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfReportConstants.primaryColor,
                ),
              ),
              pw.SizedBox(height: 4),
              pw.Text(
                'I acknowledge that I have received and reviewed the EOC, Health & Safety Policy for Example Health Clinic, LLC. I understand that it is my responsibility to comply with all provisions and report any safety or conduct concerns immediately to my supervisor or Human Resources.',
                style: pw.TextStyle(
                  fontSize: 9.5,
                  fontStyle: pw.FontStyle.italic,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  pw.Widget _buildSectionHeader(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6),
      child: pw.Text(
        title,
        style: pw.TextStyle(
          fontSize: 10.5,
          fontWeight: pw.FontWeight.bold,
          color: PdfColors.black,
        ),
      ),
    );
  }

  pw.Widget _buildSubSectionHeader(String title) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 4),
      child: pw.Text(
        title,
        style: pw.TextStyle(
          fontSize: 9.5,
          fontWeight: pw.FontWeight.bold,
          color: PdfColors.grey900,
        ),
      ),
    );
  }

  pw.Widget _buildParagraph(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Text(
        text,
        style: const pw.TextStyle(
          fontSize: 9,
          color: PdfColors.grey800,
          height: 1.3,
        ),
        textAlign: pw.TextAlign.justify,
      ),
    );
  }
}

class AttestationContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  AttestationContent({required this.task});

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};
    final illegalDrugsUsage = formData['illegalDrugsUsage'] ?? '';
    final doUse = illegalDrugsUsage == 'I do use illegal drugs';
    final doNotUse = illegalDrugsUsage == 'I do not use illegal drugs';

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'Attestation Form',
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.SizedBox(height: 15),
        pw.Text(
          'Prior to accepting a position with Example Health Clinic, LLC, I hereby attest that I am capable of performing essential functions of job with or without accommodation.',
          style: const pw.TextStyle(fontSize: 10),
        ),
        pw.SizedBox(height: 10),
        pw.Text(
          'I hereby voluntarily consent to provide a urine specimen (or blood specimen as required for alcohol testing only) at a collection facility designated by Example Health Clinic, LLC, and further consent to have the specimen tested at a laboratory selected by Example Health Clinic, LLC.',
          style: const pw.TextStyle(fontSize: 10),
        ),
        pw.SizedBox(height: 10),
        pw.Row(
          children: [
            pw.Text(
              '(Check one) do ',
              style: const pw.TextStyle(fontSize: 10),
            ),
            pw.Container(
              width: 10,
              height: 10,
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.black, width: 0.5),
              ),
              child: doUse ? pw.Center(
                child: pw.CustomPaint(
                  size: const PdfPoint(8, 8),
                  painter: (PdfGraphics canvas, PdfPoint size) {
                    canvas
                      ..moveTo(1, size.y * 0.4)
                      ..lineTo(size.x * 0.4, 1)
                      ..lineTo(size.x - 1, size.y - 1)
                      ..setStrokeColor(PdfColors.black)
                      ..setLineWidth(1.0)
                      ..strokePath();
                  },
                ),
              ) : pw.SizedBox(),
            ),
            pw.Text(
              ' or do not ',
              style: const pw.TextStyle(fontSize: 10),
            ),
            pw.Container(
              width: 10,
              height: 10,
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.black, width: 0.5),
              ),
              child: doNotUse ? pw.Center(
                child: pw.CustomPaint(
                  size: const PdfPoint(8, 8),
                  painter: (PdfGraphics canvas, PdfPoint size) {
                    canvas
                      ..moveTo(1, size.y * 0.4)
                      ..lineTo(size.x * 0.4, 1)
                      ..lineTo(size.x - 1, size.y - 1)
                      ..setStrokeColor(PdfColors.black)
                      ..setLineWidth(1.0)
                      ..strokePath();
                  },
                ),
              ) : pw.SizedBox(),
            ),
            pw.Text(
              ' use illegal drugs.',
              style: const pw.TextStyle(fontSize: 10),
            ),
          ],
        ),
        pw.SizedBox(height: 10),
        pw.Text(
          'I hereby attest that I possess a current valid professional license/and or have the credentials required to perform the job duties. I will provide a copy of my current license/certification to Example Health Clinic, LLC.',
          style: const pw.TextStyle(fontSize: 10),
        ),
        pw.SizedBox(height: 10),
        pw.Text(
          'I hereby attest that I am not under any limitation of privileges or disciplinary actions associated with my current licensing board.',
          style: const pw.TextStyle(fontSize: 10),
        ),
        pw.SizedBox(height: 10),
        pw.Text(
          'I hereby attest that I have reported to Example Health Clinic, LLC. A current or past adverse actions that may present risk management concerns to include Medicare/Medicaid exclusion, or sanctions; ethical violations, criminal convictions, etc...',
          style: const pw.TextStyle(fontSize: 10),
        ),
      ],
    );
  }
}


class AcknowledgmentOfVehicleDocumentationContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  AcknowledgmentOfVehicleDocumentationContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};
    final positionTitle = formData['positionTitle'] ?? 'N/A';

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'ACKNOWLEDGMENT OF VEHICLE DOCUMENTATION',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 15),
        pw.Text('Employee/Contractor Name: $employeeName', style: const pw.TextStyle(fontSize: 10)),
        pw.SizedBox(height: 4),
        pw.Text('Position/Title: $positionTitle', style: const pw.TextStyle(fontSize: 10)),
        pw.SizedBox(height: 4),
        pw.Text('Date: $signedDate', style: const pw.TextStyle(fontSize: 10)),
        pw.SizedBox(height: 15),
        pw.Text(
          'Policy Summary',
          style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 4),
        pw.Text(
          'To ensure the safety of all clients, employees, and contractors, Example Health Clinic, LLC requires all individuals who utilize personal or company vehicles for work-related activities to maintain current, valid, and verifiable documentation related to vehicle operation and insurance.',
          style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800),
        ),
        pw.SizedBox(height: 12),
        pw.Text(
          'Vehicle Documentation Requirements',
          style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 4),
        pw.Bullet(text: 'Maintain a current and valid Texas Driver\'s License.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Maintain vehicle insurance meeting or exceeding Texas state minimum coverage limits.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Submit copies of both documents to StaffRail prior to any transportation activity.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Update and provide new documentation upon renewal or any change in coverage or status.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Immediately notify the agency of any suspension, expiration, or lapse in insurance coverage.', style: const pw.TextStyle(fontSize: 9)),
        pw.SizedBox(height: 12),
        pw.Text(
          'Transportation Policy Standards',
          style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
        ),
        pw.Bullet(text: 'Contractors are not permitted to transport clients without valid documentation.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Contractors must comply with all state traffic laws, wear seat belts, and ensure passengers do the same.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Vehicles must be in safe working condition, free of hazards, and inspected regularly.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'The use of mobile devices while driving is prohibited unless hands-free and compliant with local laws.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Smoking, vaping, or consuming any intoxicating substance while operating a vehicle for agency business is strictly prohibited.', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'In the event of an accident or incident, contractors must notify the agency immediately and submit a written report within 24 hours.', style: const pw.TextStyle(fontSize: 9)),
        pw.SizedBox(height: 12),
        pw.Text(
          'Non-Compliance',
          style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 4),
        pw.Text(
          'Failure to comply with this policy may result in:',
          style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800),
        ),
        pw.Bullet(text: 'Suspension or loss of transportation privileges', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Contract suspension or termination', style: const pw.TextStyle(fontSize: 9)),
        pw.Bullet(text: 'Possible legal or financial responsibility for damages resulting from non-compliance', style: const pw.TextStyle(fontSize: 9)),
        pw.SizedBox(height: 12),
        pw.Text(
          'Acknowledgment',
          style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 4),
        pw.Text(
          'I acknowledge that I have received, read, and understand the Vehicle Documentation Policy of Example Health Clinic, LLC.',
          style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800),
        ),
        pw.SizedBox(height: 4),
        pw.Text(
          'I agree to provide and maintain current vehicle documentation as required and to comply with all transportation and safety regulations while performing duties for the agency.',
          style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey800),
        ),
      ],
    );
  }
}
