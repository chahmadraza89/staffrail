import 'dart:developer';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/core/shared/report_widget.dart';

class AuditReportOrchestrator {
  static Future<Uint8List> generate({
    required String employeeName,
    required String employeeEmail,
    required String employeeId,
    required List<CompilationTask> onboardingCategories,
    required List<TrainingEntity> trainings,
    String? generatedBy,
  }) async {
    log('📄 [PDF-AUDIT] Generating report for $employeeName...');

    final pdf = pw.Document(
      title: 'BHMH Compliance Audit - $employeeName',
      author: generatedBy ?? 'BHMH Admin',
      creator: 'BHMH Staff Management v0.2',
    );

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.letter,
        margin: const pw.EdgeInsets.all(40),
        header: (context) =>
            ReportPageHeader('Employee Compliance Audit Report', employeeName),
        footer: (context) => ReportPageFooter(),
        build: (context) => [
          ReportInfoSection(employeeName, employeeEmail, employeeId),
          pw.SizedBox(height: 20),
          ReportSummarySection(onboardingCategories, trainings),
          pw.SizedBox(height: 30),
          ReportSectionTitle('Onboarding Compliance'),
          pw.SizedBox(height: 10),
          ...onboardingCategories.map((cat) => ReportCategoryTable(cat)),
          pw.SizedBox(height: 30),
          ReportSectionTitle('Training Compliance'),
          pw.SizedBox(height: 10),
          ReportTrainingTable(trainings),
          pw.SizedBox(height: 30),
          ReportAttestationSection(generatedBy),
        ],
      ),
    );

    final bytes = await pdf.save();
    log('📄 [PDF-AUDIT] Report generated: ${bytes.length} bytes');
    return bytes;
  }
}
