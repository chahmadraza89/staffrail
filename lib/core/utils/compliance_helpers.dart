import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';

class ComplianceHelpers {
  static List<CompilationTask> groupTasksIntoCategories({
    required List<CompilationSubTask> tasks,
    required List<CompilationSubTask> trainingSubTasks,
    required List<CompilationSubTask> clearanceSubTasks,
  }) {
    // Helper to create category
    CompilationTask createCategory(
      String id,
      String title,
      List<CompilationSubTask> subTasks,
    ) {
      final completedCount = subTasks.where((st) => st.isCompleted).length;
      final totalCount = subTasks.length;
      final isAllCompleted = totalCount > 0 && completedCount == totalCount;

      return CompilationTask(
        id: id,
        title: title,
        subtitle: '$completedCount of $totalCount completed',
        isCompleted: isAllCompleted,
        subTasks: subTasks,
      );
    }

    // Define Category 1 IDs
    final category1Ids = [
      'onboarding_acknowledgment_form',
      'signed_offer_letter',
      'job_description_acknowledgment',
    ];

    // Define Category 2 IDs
    final category2Ids = [
      'driver\'s_verification',
      'driver\'s_license',
      'confidentiality_statement',
      'proof_of_vehicle_insurance',
      'vehicle_registration',
      'copy_of_ssc',
      'corporate_confidentiality_statement',
      'confidentiality_of_client___therapist___staff',
      'transportation_acknowledgement_statement',
      'acknowledgement_of_transporting_clients',
      'cultural_competency',
      'corporate_compliance_acknowledge',
      'code_of_conduct_ethics',
      'alleged_abuse_neglect',
      'acknowledge_of_eoc_health_&_safety_policy',
      'grievance_procedure',
      'attestation_form',
      'authorization_for_emergency_medical_care',
      'acknowledgement_of_vehicle_documentation',
      'acknowledge_of_company_property',
      'tax_documents_i_9',
      'tax_documents_w_9',
      'direct_deposit_authorization',
    ];

    // Define Category 3 IDs
    final category3Ids = [
      'resume',
      '3_professional_letters_of_recommendation',
      'copy_of_highest_degree_diploma_certificate',
      'copy_of_official_transcripts_of_highest_degree',
      'copy_of_license',
      'copy_of_certification',
    ];

    // Define Category 4 IDs
    final category4Ids = [
      'initial_orientation',
      'bhmh_initial_orientation',
      'initial_training',
      'annual_training',
    ];

    // Define Category 5 IDs
    final category5Ids = [
      'cssp_competency',
      'qmhp_cs_competency',
      'lpha_competency',
    ];

    // Build categories with strict ordering based on ID lists
    return [
      createCategory(
        'employment_acceptance',
        'Category 1: Employment Acceptance',
        category1Ids
            .map(
              (id) => tasks.any((t) => t.id == id)
                  ? tasks.firstWhere((t) => t.id == id)
                  : null,
            )
            .whereType<CompilationSubTask>()
            .toList(),
      ),
      createCategory(
        'hr_documentation',
        'Category 2: HR Documentation',
        category2Ids
            .map(
              (id) => tasks.any((t) => t.id == id)
                  ? tasks.firstWhere((t) => t.id == id)
                  : null,
            )
            .whereType<CompilationSubTask>()
            .toList(),
      ),
      createCategory(
        'professional_documentation',
        'Category 3: Professional Documents',
        category3Ids
            .map(
              (id) => tasks.any((t) => t.id == id)
                  ? tasks.firstWhere((t) => t.id == id)
                  : null,
            )
            .whereType<CompilationSubTask>()
            .toList(),
      ),
      createCategory(
        'orientation',
        'Category 4: Orientation',
        category4Ids
            .map(
              (id) => tasks.any((t) => t.id == id)
                  ? tasks.firstWhere((t) => t.id == id)
                  : null,
            )
            .whereType<CompilationSubTask>()
            .toList(),
      ),
      createCategory(
        'competency_forms',
        'Category 5: Competency Forms',
        category5Ids
            .map(
              (id) => tasks.any((t) => t.id == id)
                  ? tasks.firstWhere((t) => t.id == id)
                  : null,
            )
            .whereType<CompilationSubTask>()
            .toList(),
      ),
      createCategory(
        'training_compliance',
        'Category 6: Training Compliance',
        trainingSubTasks,
      ),
      createCategory('clearance', 'Category 7: Clearance', clearanceSubTasks),
    ];
  }
}
