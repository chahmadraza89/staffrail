import 'dart:typed_data';
import 'package:pdf/pdf.dart';

// Internal Framework Imports
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';

// Modular PDF Service Imports
import 'pdf/pdf_constants.dart';
import 'pdf/orchestrators/audit_report_orchestrator.dart';
import 'pdf/orchestrators/training_report_orchestrator.dart';
import 'pdf/orchestrators/acknowledgment_form_orchestrator.dart';

// =============================================================================
// PDF AUDIT REPORT GENERATOR (v0.3 - Fully Modularized)
// =============================================================================
// Clean Architecture Facade. This class serves as the public entry point
// for all PDF generation tasks, delegating logic to domain-specific
// orchestrators while maintaining a stable public API.
// =============================================================================

class PdfAuditReportGenerator {
  // --- Backward Compatibility Constants ---
  static final dateFormat = PdfReportConstants.dateFormat;
  static final dateTimeFormat = PdfReportConstants.dateTimeFormat;
  static const primaryColor = PdfReportConstants.primaryColor;
  static const redColor = PdfColors.red800;
  static const headerColor = PdfReportConstants.headerColor;
  static const subtitleColor = PdfReportConstants.subtitleColor;

  /// Generates a full compliance audit report for a single employee.
  static Future<Uint8List> generateEmployeeReport({
    required String employeeName,
    required String employeeEmail,
    required String employeeId,
    required List<CompilationTask> onboardingCategories,
    required List<TrainingEntity> trainings,
    String? generatedBy,
  }) async {
    return AuditReportOrchestrator.generate(
      employeeName: employeeName,
      employeeEmail: employeeEmail,
      employeeId: employeeId,
      onboardingCategories: onboardingCategories,
      trainings: trainings,
      generatedBy: generatedBy,
    );
  }

  /// Generates a formal completion record for a single training module.
  static Future<Uint8List> generateTrainingSubmissionReport({
    required String employeeName,
    required String employeeId,
    required TrainingEntity training,
    String? adminName,
  }) async {
    return TrainingReportOrchestrator.generate(
      employeeName: employeeName,
      employeeId: employeeId,
      training: training,
      adminName: adminName,
    );
  }

  /// Generates a signed PDF of the onboarding acknowledgment form.
  static Future<Uint8List> generateAcknowledgeFormPdf({
    required CompilationSubTask task,
    required String employeeName,
    List<CompilationSubTask>? allTasks,
    Uint8List? logoBytes,
  }) async {
    return AcknowledgmentFormOrchestrator.generate(
      task: task,
      employeeName: employeeName,
      allTasks: allTasks,
      logoBytes: logoBytes,
    );
  }
}
