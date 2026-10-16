import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

class DualSignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  DualSignatureSection({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    // Check if witness signature exists
    final witnessData = task.formData?['witnessSignature'] as String?;
    String witnessSig = '';
    if (witnessData != null && witnessData.startsWith('typed:')) {
      witnessSig = witnessData.substring(6);
    }

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
                  'Name (Print): $employeeName',
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

        // Witness Section
        if (witnessSig.isNotEmpty) ...[
          pw.SizedBox(height: 12),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                'WITNESS VERIFICATION',
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
                          'Witness Signature',
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
                            witnessSig,
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
        ],
      ],
    );
  }
}

class AllegedAbuseSignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  AllegedAbuseSignatureSection({
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
        pw.SizedBox(height: 50),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text(
              'Employee/Contractor Name: ',
              style: pw.TextStyle(fontSize: 11, color: PdfColors.black),
            ),
            pw.Expanded(
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(
                    bottom: pw.BorderSide(color: PdfColors.grey400, width: 0.5),
                  ),
                ),
                child: pw.Text(employeeName, style: pw.TextStyle(fontSize: 11)),
              ),
            ),
            pw.SizedBox(width: 80), // To make the line not span the full width
          ],
        ),
        pw.SizedBox(height: 30),
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.end,
          children: [
            pw.Text(
              'Signature: ',
              style: pw.TextStyle(fontSize: 11, color: PdfColors.black),
            ),
            pw.Expanded(
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(
                    bottom: pw.BorderSide(color: PdfColors.grey400, width: 0.5),
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
            pw.SizedBox(width: 40),
            pw.Text(
              'Date: ',
              style: pw.TextStyle(fontSize: 11, color: PdfColors.black),
            ),
            pw.SizedBox(
              width: 100,
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(
                    bottom: pw.BorderSide(color: PdfColors.grey400, width: 0.5),
                  ),
                ),
                child: pw.Text(signedDate, style: pw.TextStyle(fontSize: 11)),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 100),
        pw.Align(
          alignment: pw.Alignment.bottomCenter,
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                'Contact Bright Horizons Mental Health, LLC',
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.black,
                ),
              ),
              pw.SizedBox(height: 15),
              pw.Text(
                '(Main) location',
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.green700,
                ),
              ),
              pw.SizedBox(height: 5),
              pw.Text(
                '3634 Glenn Lakes Lane, Suite 195-B',
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.black,
                ),
              ),
              pw.SizedBox(height: 2),
              pw.Text(
                'Missouri City, Texas 77459-4062',
                style: pw.TextStyle(
                  fontSize: 11,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.black,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

//

class DirectDepositSignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  DirectDepositSignatureSection({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    return pw.Column(
      children: [
        pw.SizedBox(height: 30),
        pw.Row(
          children: [
            pw.Expanded(
              flex: 2,
              child: pw.Padding(
                padding: const pw.EdgeInsets.symmetric(vertical: 2),
                child: pw.Row(
                  children: [
                    pw.Text(
                      'Signature ',
                      style: pw.TextStyle(
                        fontSize: 11,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Expanded(
                      child: pw.Container(
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
                        ),
                        child: pw.Padding(
                          padding: const pw.EdgeInsets.only(left: 5, bottom: 2),
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
                  ],
                ),
              ),
            ),
            pw.SizedBox(width: 30),
            pw.Expanded(
              flex: 1,
              child: pw.Padding(
                padding: const pw.EdgeInsets.symmetric(vertical: 2),
                child: pw.Row(
                  children: [
                    pw.Text(
                      'Date ',
                      style: pw.TextStyle(
                        fontSize: 11,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Expanded(
                      child: pw.Container(
                        decoration: const pw.BoxDecoration(
                          border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
                        ),
                        child: pw.Padding(
                          padding: const pw.EdgeInsets.only(left: 5, bottom: 2),
                          child: pw.Text(
                            signedDate,
                            style: const pw.TextStyle(fontSize: 11),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class TaxDocumentsSignatureSection extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  TaxDocumentsSignatureSection({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final adminSig = task.adminSignatureUrl?.replaceFirst('typed:', '') ?? '';
    final adminDate = task.adminFormData?['verificationDate'] ?? signedDate;
    final isI9 = task.id == 'tax_documents_i_9';

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
                  'Name (Print): $employeeName',
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
                        'Signature',
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
                        isI9
                            ? 'Authorized Representative Signature'
                            : 'Supervisor Signature',
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
