import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'onboarding_builders.dart';
import 'clinical_builders.dart';
import 'generic_content_builder.dart';

class PdfContentDelegator extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String fullName;
  final String signatureText;
  final String signedDate;
  final String fullContent;
  final bool hasSections;
  final List<CompilationSubTask>? allTasks;

  PdfContentDelegator({
    required this.task,
    required this.fullName,
    required this.signatureText,
    required this.signedDate,
    required this.fullContent,
    required this.hasSections,
    this.allTasks,
  });

  @override
  pw.Widget build(pw.Context context) {
    // 1. Check Specialized Onboarding Builders
    if (task.id.contains('driver') && !task.id.contains('license')) {
      return DriversVerificationContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'code_of_conduct_ethics') {
      return CodeOfConductContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'alleged_abuse_neglect') {
      return AllegedAbuseContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'acknowledge_of_company_property') {
      return AcknowledgeOfCompanyPropertyContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
        allTasks: allTasks,
      );
    } else if (task.id == 'acknowledge_of_eoc_health_&_safety_policy') {
      return EocPolicyContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
        allTasks: allTasks,
      );
    } else if (task.id == 'initial_orientation' ||
        task.id == 'bhmh_initial_orientation') {
      return InitialOrientationContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'direct_deposit_authorization') {
      return DirectDepositContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'tax_documents_i_9') {
      return I9FormContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'tax_documents_w_9') {
      return W9FormContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'authorization_for_emergency_medical_care') {
      return EmergencyMedicalCareContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'acknowledgement_of_vehicle_documentation') {
      return AcknowledgmentOfVehicleDocumentationContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    }
    // 2. Check Clinical Builders
    else if (task.id.contains('competency') && task.id != 'cultural_competency') {
      return CompetencyContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    } else if (task.id == 'annual_training') {
      return AnnualTrainingContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
        allTasks: allTasks,
      );
    } else if (task.id == 'initial_training') {
      return InitialTrainingContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
        allTasks: allTasks,
      );
    } else if (task.id == 'attestation_form') {
      return AttestationContent(task: task);
    } else if (task.id == 'acknowledgement_of_vehicle_documentation') {
      return AcknowledgmentOfVehicleDocumentationContent(
        task: task,
        employeeName: fullName,
        employeeSig: signatureText,
        signedDate: signedDate,
      );
    }

    // 3. Fallback to Generic Markdown-like Content
    if (hasSections) {
      return SectionedContent(fullContent);
    }

    return SimpleContent(fullContent);
  }
}
