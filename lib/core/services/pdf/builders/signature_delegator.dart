import 'package:bhmh/core/services/pdf/builders/signature_generation_builder.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'signature_builders.dart';

class PdfSignatureDelegator extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String fullName;
  final String signatureText;
  final String signedDate;
  final bool isDriversVerification;

  PdfSignatureDelegator({
    required this.task,
    required this.fullName,
    required this.signatureText,
    required this.signedDate,
    required this.isDriversVerification,
  });

  @override
  pw.Widget build(pw.Context context) {
    if (isDriversVerification) {
      return DriversVerificationSignatureSection(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'alleged_abuse_neglect') {
      return AllegedAbuseSignatureSection(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'initial_orientation' ||
        task.id == 'bhmh_initial_orientation' ||
        task.id == 'code_of_conduct_ethics' ||
        task.id == 'annual_training' ||
        task.id == 'initial_training' ||
        task.id == 'cultural_competency') {
      return OrientationSignatureSection(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'acknowledge_of_eoc_health_&_safety_policy' ||
        task.id == 'acknowledge_of_company_property') {
      return EocSignatureSection(
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id.contains('competency') &&
        task.id != 'cultural_competency') {
      return CompetencySignatureSection(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'direct_deposit_authorization') {
      return DirectDepositSignatureSection(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id.contains('tax_documents')) {
      return TaxDocumentsSignatureSection(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'authorization_for_emergency_medical_care') {
      return EmergencyMedicalSignatureSection(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'attestation_form') {
      return AttestationSignatureSection(
        employeeName: fullName,
        dateOfBirth: task.formData?['dateOfBirth'] ?? 'N/A',
        address: task.formData?['address'] ?? 'N/A',
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    }

    final isConfidentiality =
        task.id == 'corporate_confidentiality_statement' ||
        task.id == 'confidentiality_of_client___therapist___staff';

    // Default basic signature layout if not specialized
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        if (task.id == 'corporate_compliance_acknowledge' ||
            isConfidentiality) ...[
          pw.Row(
            children: [
              pw.Text(
                isConfidentiality
                    ? 'Therapist/Staff Name: '
                    : 'Employee/Contractor Name: ',
                style: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  fontSize: 9,
                ),
              ),
              pw.Expanded(
                child: pw.Container(
                  padding: const pw.EdgeInsets.only(bottom: 2),
                  decoration: pw.BoxDecoration(
                    border: pw.Border(
                      bottom: pw.BorderSide(color: PdfColors.black, width: 0.5),
                    ),
                  ),
                  child: pw.Text(
                    fullName,
                    style: const pw.TextStyle(fontSize: 10),
                  ),
                ),
              ),
            ],
          ),
          pw.SizedBox(height: 24),
        ],
        pw.Text(
          isConfidentiality
              ? 'Therapist/Staff Signature:'
              : 'Signature of Employee:',
          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
        ),
        pw.SizedBox(height: 4),
        pw.Row(
          children: [
            pw.Expanded(
              child: pw.Container(
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
                ),
                child: pw.Text(
                  signatureText,
                  style: pw.TextStyle(
                    fontSize: 14,
                    fontStyle: pw.FontStyle.italic,
                  ),
                ),
              ),
            ),
            pw.SizedBox(width: 20),
            pw.SizedBox(
              width: 100,
              child: pw.Column(
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
                    decoration: const pw.BoxDecoration(
                      border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
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
    );
  }
}
