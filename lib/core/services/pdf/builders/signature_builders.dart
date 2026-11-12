import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';

class OrientationSignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  OrientationSignatureSection({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final adminSig = task.adminSignatureUrl?.replaceFirst('typed:', '') ?? '';
    final adminDate = task.adminFormData?['verificationDate'] ?? signedDate;

    return pw.Column(
      children: [
        // Employee Section
        if (task.id == 'code_of_conduct_ethics') ...[
          pw.Row(
            children: [
              pw.Text(
                'Employee/Contractor Name: ',
                style: pw.TextStyle(fontSize: 10),
              ),
              pw.Expanded(
                child: pw.Container(
                  padding: const pw.EdgeInsets.only(bottom: 2),
                  decoration: const pw.BoxDecoration(
                    border: pw.Border(
                      bottom: pw.BorderSide(color: PdfColors.black, width: 0.5),
                    ),
                  ),
                  child: pw.Text(employeeName, style: const pw.TextStyle(fontSize: 10)),
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 24),
        ],
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              task.id == 'code_of_conduct_ethics'
                  ? 'Signature:'
                  : 'Employee/Contractor Signature:',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
            ),
            pw.SizedBox(height: 8),
            pw.Row(
              children: [
                pw.Expanded(
                  child: pw.Container(
                    decoration: const pw.BoxDecoration(
                      border: pw.Border(
                        bottom: pw.BorderSide(color: PdfColors.black),
                      ),
                    ),
                    child: pw.Text(
                      employeeSig,
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontStyle: pw.FontStyle.italic,
                      ),
                    ),
                  ),
                ),
                pw.SizedBox(width: 20),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Date:',
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 8,
                      ),
                    ),
                    pw.Container(
                      width: 100,
                      decoration: const pw.BoxDecoration(
                        border: pw.Border(
                          bottom: pw.BorderSide(color: PdfColors.black),
                        ),
                      ),
                      child: pw.Text(
                        signedDate,
                        style: const pw.TextStyle(fontSize: 10),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        if (task.id == 'code_of_conduct_ethics') ...[
          pw.SizedBox(height: 40),
          pw.Center(
            child: pw.Column(
              children: [
                pw.Text(
                  'Example Health Clinic, LLC',
                  style: pw.TextStyle(
                    fontSize: 10,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 2),
                pw.Text(
                  '100 Main Street, Suite 200',
                  style: const pw.TextStyle(fontSize: 9),
                ),
                pw.Text(
                  'Anytown, USA 00000',
                  style: const pw.TextStyle(fontSize: 9),
                ),
              ],
            ),
          ),
        ],
        if (task.id != 'code_of_conduct_ethics') ...[
          pw.SizedBox(height: 15),
          // Admin Section
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                'Supervisor/Trainer Signature:',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
              ),
              pw.SizedBox(height: 8),
              pw.Row(
                children: [
                  pw.Expanded(
                    child: pw.Container(
                      decoration: const pw.BoxDecoration(
                        border: pw.Border(
                          bottom: pw.BorderSide(color: PdfColors.black),
                        ),
                      ),
                      child: pw.Text(
                        adminSig,
                        style: pw.TextStyle(
                          fontSize: 16,
                          fontStyle: pw.FontStyle.italic,
                        ),
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 20),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Date:',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 8,
                        ),
                      ),
                      pw.Container(
                        width: 100,
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            bottom: pw.BorderSide(color: PdfColors.black),
                          ),
                        ),
                        child: pw.Text(
                          adminDate,
                          style: const pw.TextStyle(fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class DriversVerificationSignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  DriversVerificationSignatureSection({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final adminSig = task.adminSignatureUrl?.replaceFirst('typed:', '') ?? '';
    final adminDate = task.adminFormData?['verificationDate'] ?? signedDate;

    return pw.Column(
      children: [
        // Employee Section
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'STAFF CERTIFICATION',
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 8,
                    color: PdfColors.grey700,
                  ),
                ),
                pw.Text(
                  'Staff Name (Print): $employeeName',
                  style: pw.TextStyle(
                    fontSize: 8,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 10),
            pw.Row(
              children: [
                pw.SizedBox(
                  width: 300,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Staff Signature',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 7,
                          color: PdfColors.grey600,
                        ),
                      ),
                      pw.Container(
                        margin: const pw.EdgeInsets.only(top: 2),
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            bottom: pw.BorderSide(color: PdfColors.black),
                          ),
                        ),
                        child: pw.Text(
                          employeeSig,
                          style: pw.TextStyle(
                            fontSize: 14,
                            fontStyle: pw.FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(width: 20),
                pw.SizedBox(
                  width: 120,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Date',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 7,
                          color: PdfColors.grey600,
                        ),
                      ),
                      pw.Container(
                        margin: const pw.EdgeInsets.only(top: 2),
                        width: double.infinity,
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            bottom: pw.BorderSide(color: PdfColors.black),
                          ),
                        ),
                        child: pw.Text(
                          signedDate,
                          style: const pw.TextStyle(fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        pw.SizedBox(height: 12),
        // Admin Section
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'AGENCY VERIFICATION',
              style: pw.TextStyle(
                fontWeight: pw.FontWeight.bold,
                fontSize: 8,
                color: PdfColors.grey700,
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Row(
              children: [
                pw.SizedBox(
                  width: 300,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Supervisor Signature',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 7,
                          color: PdfColors.grey600,
                        ),
                      ),
                      pw.Container(
                        margin: const pw.EdgeInsets.only(top: 2),
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            bottom: pw.BorderSide(color: PdfColors.black),
                          ),
                        ),
                        child: pw.Text(
                          adminSig,
                          style: pw.TextStyle(
                            fontSize: 14,
                            fontStyle: pw.FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(width: 20),
                pw.SizedBox(
                  width: 120,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Date',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 7,
                          color: PdfColors.grey600,
                        ),
                      ),
                      pw.Container(
                        margin: const pw.EdgeInsets.only(top: 2),
                        width: double.infinity,
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            bottom: pw.BorderSide(color: PdfColors.black),
                          ),
                        ),
                        child: pw.Text(
                          adminDate,
                          style: const pw.TextStyle(fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class CompetencySignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  CompetencySignatureSection({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final adminSig = task.adminSignatureUrl?.replaceFirst('typed:', '') ?? '';
    final adminDate = task.adminFormData?['verificationDate'] ?? signedDate;
    final isQmhp = task.id == 'qmhp_cs_competency';

    return pw.Column(
      children: [
        // Employee Section
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'Employee Acknowledgment:',
              style: pw.TextStyle(
                fontWeight: pw.FontWeight.bold,
                fontSize: 8,
                color: PdfColors.grey700,
              ),
            ),
            pw.SizedBox(height: 4),
            pw.Text(
              'I have reviewed my competency evaluation and discussed it with my supervisor.',
              style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic),
            ),
            pw.SizedBox(height: 12),
            pw.Row(
              children: [
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Employee Signature:',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 8,
                        ),
                      ),
                      pw.Container(
                        height: 30,
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            bottom: pw.BorderSide(color: PdfColors.black),
                          ),
                        ),
                        child: pw.Text(
                          employeeSig,
                          style: pw.TextStyle(
                            fontSize: 16,
                            fontStyle: pw.FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(width: 20),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Date:',
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 8,
                      ),
                    ),
                    pw.Container(
                      width: 100,
                      decoration: const pw.BoxDecoration(
                        border: pw.Border(
                          bottom: pw.BorderSide(color: PdfColors.black),
                        ),
                      ),
                      child: pw.Text(
                        signedDate,
                        style: const pw.TextStyle(fontSize: 10),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        pw.SizedBox(height: 15),

        // Admin Section
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              isQmhp
                  ? 'EVALUATOR VERIFICATION'
                  : 'SUPERVISOR / EVALUATOR VERIFICATION',
              style: pw.TextStyle(
                fontWeight: pw.FontWeight.bold,
                fontSize: 8,
                color: PdfColors.grey700,
              ),
            ),
            pw.SizedBox(height: 12),
            pw.Row(
              children: [
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        isQmhp
                            ? 'Evaluator Signature:'
                            : 'Supervisor Signature:',
                        style: pw.TextStyle(
                          fontWeight: pw.FontWeight.bold,
                          fontSize: 8,
                        ),
                      ),
                      pw.Container(
                        height: 30,
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(
                            bottom: pw.BorderSide(color: PdfColors.black),
                          ),
                        ),
                        child: pw.Text(
                          adminSig,
                          style: pw.TextStyle(
                            fontSize: 16,
                            fontStyle: pw.FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(width: 20),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'Date:',
                      style: pw.TextStyle(
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 8,
                      ),
                    ),
                    pw.Container(
                      width: 100,
                      height: 30,
                      decoration: const pw.BoxDecoration(
                        border: pw.Border(
                          bottom: pw.BorderSide(color: PdfColors.black),
                        ),
                      ),
                      child: pw.Padding(
                        padding: const pw.EdgeInsets.only(top: 15),
                        child: pw.Text(
                          adminDate,
                          style: const pw.TextStyle(fontSize: 10),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

class EocSignatureSection extends pw.StatelessWidget {
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  EocSignatureSection({
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text(
              'Employee/Contractor Signature: ',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
            ),
            pw.Expanded(
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
                ),
                child: pw.Padding(
                  padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                  child: pw.Text(
                    employeeSig,
                    style: pw.TextStyle(
                      fontSize: 14,
                      fontStyle: pw.FontStyle.italic,
                    ),
                  ),
                ),
              ),
            ),
            pw.SizedBox(width: 30),
            pw.Text(
              'Date: ',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
            ),
            pw.Container(
              width: 120,
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
              ),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 4, bottom: 2),
                child: pw.Text(
                  signedDate,
                  style: const pw.TextStyle(fontSize: 10),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class AttestationSignatureSection extends pw.StatelessWidget {
  final String employeeName;
  final String dateOfBirth;
  final String address;
  final String employeeSig;
  final String signedDate;

  AttestationSignatureSection({
    required this.employeeName,
    required this.dateOfBirth,
    required this.address,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.SizedBox(height: 20),
        pw.Row(
          children: [
            pw.Text(
              'Employee/Contractor Name: ',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
            ),
            pw.Expanded(
              child: pw.Container(
                padding: const pw.EdgeInsets.only(bottom: 2),
                decoration: pw.BoxDecoration(
                  border: pw.Border(
                    bottom: pw.BorderSide(color: PdfColors.black, width: 0.5),
                  ),
                ),
                child: pw.Text(employeeName, style: const pw.TextStyle(fontSize: 10)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 20),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Signature: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Expanded(
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5)),
                ),
                child: pw.Text(
                  employeeSig,
                  style: pw.TextStyle(fontSize: 14, fontStyle: pw.FontStyle.italic),
                ),
              ),
            ),
            pw.SizedBox(width: 20),
            pw.Text('Date: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 100,
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5)),
              ),
              child: pw.Text(signedDate, style: const pw.TextStyle(fontSize: 10)),
            ),
          ],
        ),
      ],
    );
  }
}

class EmergencyMedicalSignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  EmergencyMedicalSignatureSection({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final witnessSig = task.formData?['witnessSignature']?.replaceFirst('typed:', '') ?? '';
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.SizedBox(height: 20),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Employee Signature: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Expanded(
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5)),
                ),
                child: pw.Text(
                  employeeSig,
                  style: pw.TextStyle(fontSize: 14, fontStyle: pw.FontStyle.italic),
                ),
              ),
            ),
            pw.SizedBox(width: 20),
            pw.Text('Date: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 100,
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5)),
              ),
              child: pw.Text(signedDate, style: const pw.TextStyle(fontSize: 10)),
            ),
          ],
        ),
        pw.SizedBox(height: 20),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text('Witness Signature: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Expanded(
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5)),
                ),
                child: pw.Text(
                  witnessSig,
                  style: pw.TextStyle(fontSize: 14, fontStyle: pw.FontStyle.italic),
                ),
              ),
            ),
            pw.SizedBox(width: 20),
            pw.Text('Date: ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            pw.Container(
              width: 100,
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(color: PdfColors.black, width: 0.5)),
              ),
              child: pw.Text(signedDate, style: const pw.TextStyle(fontSize: 10)),
            ),
          ],
        ),
      ],
    );
  }
}
