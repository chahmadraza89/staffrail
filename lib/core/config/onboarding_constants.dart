import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter/material.dart';

class OnboardingConstants {
  static List<CompilationSubTask> getDefaultTasks({
    String? employeeId,
    String? employeeName,
    String? adminId,
  }) {
    CompilationSubTask create(
      String title,
      String subtitle,
      IconData icon, {
      TaskActionType? actionType,
    }) {
      final id = title
          .toLowerCase()
          .replaceAll(' ', '_')
          .replaceAll('/', '_')
          .replaceAll('(', '')
          .replaceAll(')', '')
          .replaceAll(',', '')
          .replaceAll('-', '_')
          .replaceAll('’', '\'');
      return CompilationSubTask(
        id: id,
        title: title,
        subtitle: subtitle,
        subtitleIcon: icon,
        status: TaskStatus.notStarted,
        actionType: actionType ?? CompilationSubTask.inferActionType(title, subtitle),
        employeeId: employeeId,
        employeeName: employeeName,
        adminId: adminId,
        updatedAt: DateTime.now(),
      );
    }

    return [
      // ── CATEGORY 1: Employment Acceptance ─────────────────────────
      create('Onboarding Acknowledgment form', 'Signature Required', Icons.history_edu_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Signed offer letter', 'Upload Required', Icons.file_present_rounded, actionType: TaskActionType.upload),
      create('Job Description Acknowledgment', 'Acknowledge Required', Icons.description_rounded, actionType: TaskActionType.acknowledgeSign),

      // ── CATEGORY 2: HR Documentation ──────────────────────────────
      create('Driver’s Verification', 'Dual-Signature Required', Icons.badge_rounded, actionType: TaskActionType.splitField),
      create('Driver’s License', 'Upload Required', Icons.badge_rounded, actionType: TaskActionType.upload),
      create('Confidentiality Statement', 'Acknowledge Required', Icons.lock_person_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Proof of vehicle insurance', 'Upload Required', Icons.policy_rounded, actionType: TaskActionType.upload),
      create('Vehicle Registration', 'Upload Required', Icons.directions_car_rounded, actionType: TaskActionType.upload),
      create('Copy of SSC', 'Upload Required', Icons.credit_card_rounded, actionType: TaskActionType.upload),
      create('Confidentiality of Client / Therapist / Staff', 'Acknowledge Required', Icons.security_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Acknowledgement of Transporting Clients', 'Acknowledge Required', Icons.local_shipping_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Cultural Competency', 'Dual-Signature Required', Icons.public_rounded, actionType: TaskActionType.splitField),
      create('Corporate Compliance Acknowledge', 'Acknowledge Required', Icons.assignment_turned_in_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Code of Conduct/Ethics', 'Acknowledge Required', Icons.gavel_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Alleged Abuse/Neglect', 'Dual-Signature Required', Icons.report_problem_rounded, actionType: TaskActionType.splitField),
      create('Acknowledge of EOC, Health & Safety policy', 'Acknowledge Required', Icons.health_and_safety_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Grievance Procedure', 'Acknowledge Required', Icons.rule_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Infection Control Refresher', 'Acknowledge Required', Icons.health_and_safety_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Trauma-Informed Care Practices', 'Acknowledge Required', Icons.psychology_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Types of Services', 'Acknowledge Required', Icons.category_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Person Centered Planning', 'Acknowledge Required', Icons.people_alt_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Documentation and Timelines', 'Acknowledge Required', Icons.schedule_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Client Rights & Responsibilities', 'Acknowledge Required', Icons.gavel_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Crisis Intervention Steps', 'Acknowledge Required', Icons.warning_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Mandatory Reporting', 'Acknowledge Required', Icons.report_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Attestation form', 'Fill & Sign Required', Icons.fact_check_rounded, actionType: TaskActionType.fillAndSign),
      create('Authorization for Emergency Medical Care', 'Fill & Sign Required', Icons.medical_services_rounded, actionType: TaskActionType.fillAndSign),
      create('Acknowledgement of Vehicle Documentation', 'Acknowledge Required', Icons.car_repair_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Acknowledge of Company Property', 'Acknowledge Required', Icons.business_center_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Tax Documents (I-9)', 'Dual-Signature Required', Icons.description_rounded, actionType: TaskActionType.splitField),
      create('Tax Documents (W-4)', 'Dual-Signature Required', Icons.description_rounded, actionType: TaskActionType.splitField),
      create('Tax Documents (W-1)', 'Dual-Signature Required', Icons.description_rounded, actionType: TaskActionType.splitField),
      create('Tax Documents (W-9)', 'Dual-Signature Required', Icons.description_rounded, actionType: TaskActionType.splitField),
      create('Direct Deposit Authorization', 'Fill & Sign Required', Icons.account_balance_rounded, actionType: TaskActionType.fillAndSign),

      // ── CATEGORY 3: Professional Documents ───────────────────────
      create('Resume', 'Upload Required', Icons.description_outlined, actionType: TaskActionType.upload),
      create('3 Professional Letters of Recommendation', 'Upload Required', Icons.recommend_rounded, actionType: TaskActionType.upload),
      create('Copy of Highest Degree/Diploma certificate', 'Upload Required', Icons.school_rounded, actionType: TaskActionType.upload),
      create('Copy of Official transcripts of Highest Degree', 'Upload Required', Icons.description_rounded, actionType: TaskActionType.upload),
      create('Copy of License', 'Upload Required', Icons.verified_rounded, actionType: TaskActionType.upload),
      create('Copy of Certification', 'Upload Required', Icons.card_membership_rounded, actionType: TaskActionType.upload),

      // ── CATEGORY 4: Orientation ──────────────────────────────────
      create('Initial Orientation', 'Acknowledge & Signature Required', Icons.school_rounded, actionType: TaskActionType.acknowledgeSign),
      create('Initial Training', 'Dual-Signature Required', Icons.history_edu_rounded, actionType: TaskActionType.splitField),
      create('Annual Training', 'Dual-Signature Required', Icons.history_edu_rounded, actionType: TaskActionType.splitField),

      // ── CATEGORY 5: Competency Forms ─────────────────────────────
      create('CSSP Competency', 'Dual-Signature Required', Icons.assessment_rounded, actionType: TaskActionType.splitField),
      create('QMHP-CS Competency', 'Dual-Signature Required', Icons.emergency_rounded, actionType: TaskActionType.splitField),
      create('LPHA Competency', 'Dual-Signature Required', Icons.edit_note_rounded, actionType: TaskActionType.splitField),
    ];
  }

  static List<TrainingEntity> getDefaultTrainings({String? employeeId, String? adminId}) {
    return [
      _createTraining('START', '8 hours', employeeId, adminId),
      _createTraining('PAYA', '6 hours', employeeId, adminId),
      _createTraining('Seeking Safety', '4 hours', employeeId, adminId),
      _createTraining('Nurturing Parenting', '6 hours', employeeId, adminId),
      _createTraining('Barkley’s', '4 hours', employeeId, adminId),
      _createTraining('Wraparound Planning', '8 hours', employeeId, adminId),
      _createTraining('ANSA', '4 hours', employeeId, adminId),
      _createTraining('CANS', '4 hours', employeeId, adminId),
      _createTraining('IMR', '6 hours', employeeId, adminId),
      _createTraining('ACT', '8 hours', employeeId, adminId),
      _createTraining('Supported Employment', '4 hours', employeeId, adminId),
      _createTraining('PSH', '4 hours', employeeId, adminId),
      _createTraining('Recovery Plan', '4 hours', employeeId, adminId),
      _createTraining('CPS Reporting', '2 hours', employeeId, adminId),
      _createTraining('Skills-Streaming', '6 hours', employeeId, adminId),
      _createTraining('Trauma Informed Care', '4 hours', employeeId, adminId),
      _createTraining('CPR / First Aid', '4 hours', employeeId, adminId),
      _createTraining('HIPAA', '2 hours', employeeId, adminId),
      _createTraining('PAPH', '8 hours', employeeId, adminId),
    ];
  }

  static TrainingEntity _createTraining(String title, String duration, String? employeeId, String? adminId) {
    return TrainingEntity(
      id: title.toLowerCase().replaceAll(' ', '_').replaceAll('(', '').replaceAll(')', '').replaceAll('’', '\'').replaceAll('/', '_'),
      title: title,
      description: 'Mandatory Training Module.',
      durationText: duration,
      status: TrainingStatus.notStarted,
      noExpiration: false,
      employeeId: employeeId,
      adminId: adminId,
      assignedAt: DateTime.now(),
    );
  }

  static List<ClearanceEntity> getDefaultClearances({
    String? employeeId,
    String? employeeName,
    String? adminId,
  }) {
    return [
      ClearanceEntity(
        id: 'driving_background_verification_report',
        title: 'Driving Background Verification Report',
        description: 'Official driving record verification.',
        status: ClearanceStatus.pending,
        employeeId: employeeId,
        employeeName: employeeName,
        adminId: adminId,
        updatedAt: DateTime.now(),
      ),
      ClearanceEntity(
        id: 'criminal_background_verification_report',
        title: 'Criminal Background Verification Report',
        description: 'Official state/federal criminal history report.',
        status: ClearanceStatus.pending,
        employeeId: employeeId,
        employeeName: employeeName,
        adminId: adminId,
        updatedAt: DateTime.now(),
      ),
      ClearanceEntity(
        id: 'drug_screening_results',
        title: 'Drug Screening Results',
        description: 'Official drug screening results verification.',
        status: ClearanceStatus.pending,
        employeeId: employeeId,
        employeeName: employeeName,
        adminId: adminId,
        updatedAt: DateTime.now(),
      ),
      ClearanceEntity(
        id: 'tb_status_report',
        title: 'TB Status Report',
        description: 'Official TB test results verification.',
        status: ClearanceStatus.pending,
        employeeId: employeeId,
        employeeName: employeeName,
        adminId: adminId,
        updatedAt: DateTime.now(),
      ),
    ];
  }
}
