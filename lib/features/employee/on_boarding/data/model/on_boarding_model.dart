import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

// =============================================================================
// ONBOARDING MODELS
// =============================================================================
// Domain entities for the Onboarding module.
// These are the canonical data objects used by the presentation layer.
// Firestore serialization is handled by OnboardingDTO (separation of concerns).
// =============================================================================

// ── Status Enum ─────────────────────────────────────────────────────────────
enum TaskStatus {
  notStarted,
  pending,
  submitted,
  waitingForApprover,
  pendingEmployerSignature, // Employee submitted, awaiting admin counter-sign
  rejected, // Task was rejected by admin — needs rework
  acknowledged,
  completed,
  verified,
  signed,
  confirmed,
  cleared,
  required,
  expired,
  underReview,
  noActionRequired,
}

// ── Task Source Enum ────────────────────────────────────────────────────────
enum TaskSource { onboarding, training, clearance }

// ── Task Action Type ────────────────────────────────────────────────────────
/// Defines the type of action a user must perform for a task.
/// Used by TaskActionDispatcher to render the correct widget.
enum TaskActionType {
  acknowledge,
  acknowledgeSign, // Acknowledge + Signature combo
  upload,
  signature,
  form,
  fillAndSign, // Dynamic form fields + Signature
  splitField, // Dual-role form (Employee + Admin fields)
  none,
}

// ── Compilation Task (Category / Accordion Header) ──────────────────────────
class CompilationTask extends Equatable {
  final String id;
  final String title;
  final String subtitle;
  final bool isCompleted;
  final List<CompilationSubTask> subTasks;

  const CompilationTask({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.isCompleted,
    this.subTasks = const [],
  });

  /// Creates a copy with updated fields.
  CompilationTask copyWith({
    String? id,
    String? title,
    String? subtitle,
    bool? isCompleted,
    List<CompilationSubTask>? subTasks,
  }) {
    return CompilationTask(
      id: id ?? this.id,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      isCompleted: isCompleted ?? this.isCompleted,
      subTasks: subTasks ?? this.subTasks,
    );
  }

  @override
  List<Object?> get props => [id, title, subtitle, isCompleted, subTasks];
}

// ── Compilation SubTask (Individual Task Item) ──────────────────────────────
class CompilationSubTask extends Equatable {
  final String id;
  final String title;
  final String subtitle;
  final bool isCompleted;
  final IconData? subtitleIcon;
  final TaskStatus status;
  final TaskActionType actionType;
  final String? employeeName; // Name of the employee who owns this task
  final String? fileUrl; // Download URL of uploaded document
  final String? signatureUrl; // Download URL of signature image
  final Map<String, dynamic>? formData; // Structured data for forms
  final bool isDraft; // True when saved as draft, false when submitted
  final bool isLocked; // True when task is locked (terminal state — no edits)
  final String? rejectionReason; // Reason if task was rejected by admin
  final String? adminId; // Added for admin-level filtering in dashboard
  final String?
  employeeId; // Added to link tasks to employees in dashboard reviews
  final DateTime? completedAt;
  final DateTime? updatedAt;
  final DateTime? dueDate; // Added for compliance tracking/alerts
  final DateTime? signedAt; // Timestamp when signature was captured
  final TaskSource taskSource; // Source of the task (Onboarding, Training, or Clearance)
  // ── v0.1 Split-Field & Dual-Signature Fields ──────────────────────────────
  final Map<String, dynamic>?
  adminFormData; // Admin-side form data for split-field forms
  final String? adminSignatureUrl; // Admin counter-signature image URL
  final List<Map<String, dynamic>>?
  formSchema; // Dynamic form field definitions from Firestore
  final String? policyContent; // HR-defined policy text for acknowledge forms
  final String? blankFormLink;


  const CompilationSubTask({
    required this.id,
    required this.title,
    required this.subtitle,
    this.isCompleted = false,
    this.subtitleIcon,
    this.status = TaskStatus.notStarted,
    this.actionType = TaskActionType.none,
    this.employeeName,
    this.fileUrl,
    this.signatureUrl,
    this.formData,
    this.isDraft = false,
    this.isLocked = false,
    this.rejectionReason,
    this.adminId,
    this.employeeId, // Added to link tasks to employees in dashboard reviews
    this.completedAt,
    this.updatedAt,
    this.dueDate, // Added for compliance tracking/alerts
    this.signedAt,
    this.taskSource = TaskSource.onboarding,
    this.adminFormData,
    this.adminSignatureUrl,
    this.formSchema,
    this.policyContent,
    this.blankFormLink,
  });

  /// Infers the [TaskActionType] based on task title and subtitle keywords.
  /// Follows the Product & Design Specification for automated categorization.
  static TaskActionType inferActionType(String title, String subtitle) {
    final combined = '$title $subtitle'.toLowerCase();

    // ── 1. Split-Field / Dual-Signature Actions ─────────────────────────────
    // High-priority: Requires both Employee and Admin signatures/inputs.
    if (combined.contains('dual-signature') ||
        combined.contains('split-field') ||
        (combined.contains('driver') && !combined.contains('license')) ||
        combined.contains('cultural competency') ||
        combined.contains('i-9') ||
        combined.contains('orientation checklist') ||
        combined.contains('initial orientation') ||
        combined.contains('cssp competency') ||
        combined.contains('qmhp-cs competency') ||
        combined.contains('qmhp cs competency') ||
        combined.contains('lpha competency') ||
        combined.contains('competency assessment') ||
        combined.contains('annual training') ||
        combined.contains('initial training') ||
        combined.contains('tax documents (w-9)') ||
        combined.contains('w-9') ||
        combined.contains('tax documents (w-4)') ||
        combined.contains('w-4') ||
        combined.contains('w-1') ||
        combined.contains('alleged abuse')) {
      return TaskActionType.splitField;
    }

    // ── 2. Fill & Sign Actions ──────────────────────────────────────────────
    // Requires data entry + signature (Employee only).
    if (combined.contains('fill & sign') ||
        combined.contains('fill and sign') ||
        combined.contains('direct deposit') ||
        combined.contains('emergency medical care') ||
        combined.contains('attestation') ||
        combined.contains('alleged abuse')) {
      return TaskActionType.fillAndSign;
    }

    // ── 3. Acknowledge & Sign Actions ────────────────────────────────────────
    // Requires reading a policy + signature.
    if (combined.contains('signature required') ||
        combined.contains('sign required') ||
        combined.contains('terms and conditions acknowledgement') ||
        combined.contains('offer letter')) {
      return TaskActionType.acknowledgeSign;
    }

    // ── 4. Upload Actions ───────────────────────────────────────────────────
    if (combined.contains('upload') ||
        combined.contains('license') ||
        combined.contains('registration') ||
        combined.contains('ssc') ||
        combined.contains('insurance') ||
        combined.contains('resume') ||
        combined.contains('recommendation') ||
        combined.contains('certificate') ||
        combined.contains('certification') ||
        combined.contains('degree') ||
        combined.contains('diploma') ||
        combined.contains('social security') ||
        combined.contains('transcripts')) {
      return TaskActionType.upload;
    }

    // ── 5. Standard Acknowledge & Sign ──────────────────────────────────────
    // Most healthcare policies require a signature for audit compliance.
    if (combined.contains('acknowledge') ||
        combined.contains('acknowledgment') ||
        combined.contains('statement') ||
        combined.contains('policy') ||
        combined.contains('procedure') ||
        combined.contains('conduct') ||
        combined.contains('ethics') ||
        combined.contains('conflict of interest') ||
        combined.contains('agreement') ||
        combined.contains('confidentiality') ||
        combined.contains('grievance') ||
        combined.contains('training') ||
        combined.contains('authority') ||
        combined.contains('consent') ||
        combined.contains('competency') ||
        combined.contains('disclosure') ||
        combined.contains('attestation') ||
        combined.contains('authorization') ||
        combined.contains('signature required') ||
        combined.contains('dual-signature') ||
        combined.contains('sign required')) {
      return TaskActionType.acknowledgeSign;
    }

    // ── 6. Fallback Acknowledge (Checkbox Only) ─────────────────────────────
    // Only used for simple confirmations that don't reach the level of a policy.
    if (combined.contains('confirm only') || combined.contains('check only')) {
      return TaskActionType.acknowledge;
    }

    // ── Default ─────────────────────────────────────────────────────────────
    return TaskActionType.none;
  }

  /// Creates a copy with updated fields.
  CompilationSubTask copyWith({
    String? id,
    String? title,
    String? subtitle,
    bool? isCompleted,
    IconData? subtitleIcon,
    TaskStatus? status,
    TaskActionType? actionType,
    String? employeeName,
    String? fileUrl,
    String? signatureUrl,
    Map<String, dynamic>? formData,
    bool? isDraft,
    bool? isLocked,
    String? rejectionReason,
    String? adminId,
    String? employeeId,
    DateTime? completedAt,
    DateTime? updatedAt,
    DateTime? dueDate,
    DateTime? signedAt,
    TaskSource? taskSource,
    Map<String, dynamic>? adminFormData,
    String? adminSignatureUrl,
    List<Map<String, dynamic>>? formSchema,
    String? policyContent,
    String? blankFormLink,
  }) {
    return CompilationSubTask(
      id: id ?? this.id,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      isCompleted: isCompleted ?? this.isCompleted,
      subtitleIcon: subtitleIcon ?? this.subtitleIcon,
      status: status ?? this.status,
      actionType: actionType ?? this.actionType,
      employeeName: employeeName ?? this.employeeName,
      fileUrl: fileUrl ?? this.fileUrl,
      signatureUrl: signatureUrl ?? this.signatureUrl,
      formData: formData ?? this.formData,
      isDraft: isDraft ?? this.isDraft,
      isLocked: isLocked ?? this.isLocked,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      adminId: adminId ?? this.adminId,
      employeeId: employeeId ?? this.employeeId,
      completedAt: completedAt ?? this.completedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      dueDate: dueDate ?? this.dueDate,
      signedAt: signedAt ?? this.signedAt,
      taskSource: taskSource ?? this.taskSource,
      adminFormData: adminFormData ?? this.adminFormData,
      adminSignatureUrl: adminSignatureUrl ?? this.adminSignatureUrl,
      formSchema: formSchema ?? this.formSchema,
      policyContent: policyContent ?? this.policyContent,
      blankFormLink: blankFormLink ?? this.blankFormLink,
    );
  }

  @override
  List<Object?> get props => [
    id,
    title,
    subtitle,
    isCompleted,
    status,
    actionType,
    employeeName,
    fileUrl,
    signatureUrl,
    formData,
    isDraft,
    isLocked,
    rejectionReason,
    adminId,
    employeeId,
    completedAt,
    updatedAt,
    dueDate,
    signedAt,
    taskSource,
    adminFormData,
    adminSignatureUrl,
    formSchema,
    policyContent,
    blankFormLink,
  ];
}
