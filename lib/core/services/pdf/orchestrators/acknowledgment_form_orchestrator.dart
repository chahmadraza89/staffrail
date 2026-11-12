import 'dart:developer';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import '../pdf_constants.dart';
import '../pdf_utils.dart';
import '../builders/content_delegator.dart';
import '../builders/signature_delegator.dart';

class AcknowledgmentFormOrchestrator {
  static Future<Uint8List> generate({
    required CompilationSubTask task,
    required String employeeName,
    List<CompilationSubTask>? allTasks,
    Uint8List? logoBytes,
  }) async {
    log('📄 [PDF-AUDIT] Generating acknowledgment form for $employeeName...');

    final pdf = pw.Document(title: 'Onboarding Acknowledgment - $employeeName');

    final fullName = task.formData?['fullName'] ?? employeeName;
    final signedDate =
        task.formData?['signedDate'] ??
        (task.updatedAt != null
            ? PdfReportConstants.dateFormat.format(task.updatedAt!)
            : 'N/A');

    final signatureData = task.signatureUrl ?? task.formData?['signatureData'];
    String signatureText = '';
    if (signatureData != null && signatureData.toString().startsWith('typed:')) {
      signatureText = signatureData.toString().substring(6);
    }

    final String fullContent = PdfReportUtils.sanitizeText(
      AppLegalContent.get(task.id) ?? '',
    );
    final bool hasSections =
        fullContent.contains('**Purpose**') ||
        fullContent.contains('**Acknowledgement**');

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.letter,
        margin: const pw.EdgeInsets.all(50),
        build: (context) {
          final taskIdNormalized = task.id
              .toLowerCase()
              .replaceAll('’', "'")
              .replaceAll('\'', "'");
          final isDriversVerification =
              taskIdNormalized.contains('driver') &&
              !taskIdNormalized.contains('license');

          return [
            if (logoBytes != null)
              pw.Align(
                alignment: pw.Alignment.center,
                child: pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 20),
                  child: pw.Image(pw.MemoryImage(logoBytes), width: 120),
                ),
              ),
            // Skip generic title for Code of Conduct (it has its own layout)
            if (task.id != 'code_of_conduct_ethics') ...[
              pw.Center(
                child: pw.Text(
                  task.id == 'direct_deposit_authorization'
                      ? 'DIRECT DEPOSIT FORM'
                      : task.id == 'alleged_abuse_neglect'
                          ? 'Alleged or Suspected Abuse and Neglect Reporting'
                          : task.id == 'acknowledge_of_eoc_health_&_safety_policy'
                              ? 'ACKNOWLEDGMENT OF ENVIRONMENT OF CARE (EOC), HEALTH & SAFETY POLICY'
                              : PdfReportUtils.sanitizeText(task.title).toUpperCase(),
                  style: pw.TextStyle(
                    fontSize: task.id == 'alleged_abuse_neglect' ? 16 : 18,
                    fontWeight: task.id == 'alleged_abuse_neglect'
                        ? pw.FontWeight.normal
                        : pw.FontWeight.bold,
                    color: (isDriversVerification ||
                            task.id == 'alleged_abuse_neglect')
                        ? PdfColors.red800
                        : PdfColors.black,
                  ),
                ),
              ),
              pw.SizedBox(height: 30),
            ],
            PdfContentDelegator(
              task: task,
              fullName: fullName,
              signatureText: signatureText,
              signedDate: signedDate,
              fullContent: fullContent,
              hasSections: hasSections,
              allTasks: allTasks,
            ),
            pw.SizedBox(height: 30),
            PdfSignatureDelegator(
              task: task,
              fullName: fullName,
              signatureText: signatureText,
              signedDate: signedDate,
              isDriversVerification: isDriversVerification,
            ),
          ];
        },
      ),
    );

    return await pdf.save();
  }
}
