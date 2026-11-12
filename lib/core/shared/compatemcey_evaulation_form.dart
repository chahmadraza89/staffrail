import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/core/widgets/dynamic_form_builder.dart';

/// Schemas for Competency Evaluation forms (Category 5).
///
/// These schemas are used by the [SplitFieldFormView] to dynamically
/// generate the evaluation table for both Employees (read-only) and
/// Admins (editable).
class CompetencyEvaluationSchemas {
  /// Fields filled by the employee at the start of the process.
  static List<FormFieldSchema> getEmployeeFields(String taskId) {
    return [
      const FormFieldSchema(
        name: 'fullName',
        label: 'Employee/Contractor Name',
        required: true,
      ),
      if (taskId == 'lpha_competency')
        const FormFieldSchema(
          name: 'licenseType',
          label: 'License Type',
          required: true,
        ),
      const FormFieldSchema(
        name: 'position',
        label: 'Position/Title',
        required: true,
      ),
      const FormFieldSchema(
        name: 'evaluatorName',
        label: 'Evaluator/Supervisor',
        required: true,
      ),
      const FormFieldSchema(
        name: 'evaluationDate',
        label: 'Date of Evaluation',
        type: 'date',
        required: true,
      ),
    ];
  }

  /// Fields filled by the Admin/Supervisor during the evaluation.
  static List<FormFieldSchema> getAdminFields(String taskId) {
    final areas = AppLegalContent.competencyAreas[taskId] ??
        AppLegalContent.competencyAreas['cssp_competency']!;

    final List<FormFieldSchema> fields = [];

    // Header field (Trainer name/Verification Date) to match SplitFieldFormView expectations
    fields.add(const FormFieldSchema(
      name: 'supervisorName',
      label: 'Supervisor Name',
      required: true,
    ));
    fields.add(const FormFieldSchema(
      name: 'verificationDate',
      label: 'Verification Date',
      type: 'date',
      required: true,
    ));

    // Dynamic rating/comment pairs for each area
    areas.forEach((area, description) {
      final slug = area.toLowerCase().replaceAll(' ', '_');
      fields.add(FormFieldSchema(
        name: 'rating_$slug',
        label: '$area Rating (1-5)',
        type: 'select',
        options: ['1', '2', '3', '4', '5'],
        required: true,
      ));
      fields.add(FormFieldSchema(
        name: 'comments_$slug',
        label: '$area Comments',
        type: 'textarea',
        required: false,
      ));
    });

    fields.add(const FormFieldSchema(
      name: 'overall_comments',
      label: "Evaluator's Overall Comments",
      type: 'textarea',
      required: false,
    ));

    return fields;
  }
}
