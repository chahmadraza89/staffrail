import 'dart:developer';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/core/shared/report_widget.dart';
import '../pdf_constants.dart';

class TrainingReportOrchestrator {
  static Future<Uint8List> generate({
    required String employeeName,
    required String employeeId,
    required TrainingEntity training,
    String? adminName,
  }) async {
    log('📄 [PDF-AUDIT] Generating completion record for ${training.title}...');

    final pdf = pw.Document(
      title: 'Training Completion Record - ${training.title}',
    );

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.letter,
        margin: const pw.EdgeInsets.all(40),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            ReportPageHeader('Training Completion Record', employeeName),
            pw.SizedBox(height: 30),
            pw.Center(
              child: pw.Text(
                'CERTIFICATE OF COMPLETION',
                style: pw.TextStyle(
                  fontSize: 22,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfReportConstants.primaryColor,
                ),
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Center(
              child: pw.Text(
                'This document serves as official evidence of training completion.',
                style: const pw.TextStyle(
                  fontSize: 10,
                  color: PdfReportConstants.subtitleColor,
                ),
              ),
            ),
            pw.SizedBox(height: 40),
            pw.Container(
              padding: const pw.EdgeInsets.all(20),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey300),
                borderRadius: pw.BorderRadius.circular(4),
              ),
              child: pw.Column(
                children: [
                  ReportInfoRow('Employee Name:', employeeName),
                  ReportInfoRow('Employee ID:', employeeId),
                  ReportInfoRow('Training Module:', training.title),
                  ReportInfoRow('Description:', training.description),
                  ReportInfoRow('Duration:', training.durationText),
                  ReportInfoRow(
                    'Completion Date:',
                    training.completedAt != null
                        ? PdfReportConstants.dateTimeFormat
                            .format(training.completedAt!)
                        : 'Pending Verification',
                  ),
                  if (!training.noExpiration && training.expirationDate != null)
                    ReportInfoRow(
                      'Expiration Date:',
                      PdfReportConstants.dateFormat
                          .format(training.expirationDate!),
                    ),
                ],
              ),
            ),
            pw.SizedBox(height: 40),
            ReportAttestationSection(
              adminName ?? 'System Automated Verification',
            ),
            pw.SizedBox(height: 20),
            ReportPageFooter(),
          ],
        ),
      ),
    );

    return await pdf.save();
  }
}
