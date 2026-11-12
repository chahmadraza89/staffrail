import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/tasks_desprications_component.dart';
import 'package:flutter/material.dart';

class TaskDescriptionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData? icon;

  const TaskDescriptionCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Icon(
            icon ?? Icons.description_outlined,
            size: 24,
            color: Theme.of(context).primaryColor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// instruction

class TaskInstructionsCard extends StatelessWidget {
  final String taskId;
  final String taskTitle;
  final TaskActionType? actionType;

  const TaskInstructionsCard({
    super.key,
    required this.taskId,
    required this.taskTitle,
    this.actionType,
  });

  @override
  Widget build(BuildContext context) {
    // Policy content is displayed in the Required Action section only.
    // This blue card always shows generic task instructions.

    // Generic instructions
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F9FF),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFBAE6FD), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.info_outline_rounded,
                  color: Color(0xFF0EA5E9),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Instructions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0369A1),
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _getInstructions(actionType),
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF0C4A6E),
              height: 1.6,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _getInstructions(TaskActionType? type) {
    // If the provided type is none or acknowledge, try to infer it from the title/subtitle
    // to provide more specific instructions (e.g. if title says "photo", it's an upload).
    final effectiveType =
        (type == null ||
            type == TaskActionType.none ||
            type == TaskActionType.acknowledge)
        ? CompilationSubTask.inferActionType(taskTitle, '')
        : type;

    // Use actionType enum for precise instructions (industry standard)
    switch (effectiveType) {
      case TaskActionType.acknowledge:
        return 'Please read through the entire document carefully. Once completed, check the acknowledgment box and submit.';
      case TaskActionType.upload:
        return 'Upload the required document in PDF, JPG, PNG, DOC, or DOCX format. Ensure the file is clear and all information is visible.';
      case TaskActionType.signature:
        return 'Review the document and provide your digital signature. You can either draw your signature or type your full name.';
      case TaskActionType.form:
        return 'Complete all required fields in the form. Ensure all information is accurate before submitting.';
      default:
        return 'Please complete this task as part of your onboarding process. Contact HR if you need assistance.';
    }
  }
}

// =============================================================================
// --- HELPERS & PAINTERS ---
// =============================================================================

class BadgeData {
  final String label;
  final Color backgroundColor;
  final Color textColor;
  final IconData? icon;
  BadgeData(this.label, this.backgroundColor, this.textColor, this.icon);
}

// deprecation card

class CompletedActionMessage extends StatelessWidget {
  const CompletedActionMessage({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF109B85).withValues(alpha: 0.12),
            const Color(0xFF109B85).withValues(alpha: 0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF109B85).withValues(alpha: 0.3),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Color(0xFF109B85),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_rounded,
              size: 24,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 20),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Task Completed',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF109B85),
                    letterSpacing: -0.2,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'This task has been submitted successfully and is awaiting review.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF475569),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Read-only view of a completed task showing what was submitted.
class CompletedTaskReadOnlyView extends StatelessWidget {
  final CompilationSubTask task;

  const CompletedTaskReadOnlyView({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF109B85).withValues(alpha: 0.08),
            const Color(0xFF109B85).withValues(alpha: 0.02),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF109B85).withValues(alpha: 0.2),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFF109B85),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  size: 20,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Task Completed',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF109B85),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _getStatusText(task.status),
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              CompletedTaskStatusBadge(status: task.status),
            ],
          ),

          const SizedBox(height: 16),

          // Submitted details section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Icon(
                        Icons.assignment_turned_in_rounded,
                        size: 16,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Submitted Details',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E293B),
                        letterSpacing: 0.1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Metadata Grid
                CompletedTaskMetadataRow(
                  label: 'Task Type',
                  value: _getActionTypeText(task.actionType),
                ),
                if (task.completedAt != null)
                  CompletedTaskMetadataRow(
                    label: 'Submitted At',
                    value:
                        '${task.completedAt!.day}/${task.completedAt!.month}/${task.completedAt!.year} ${task.completedAt!.hour}:${task.completedAt!.minute.toString().padLeft(2, '0')}',
                  ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 14),
                  child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                ),

                // Privacy check for Background Clearance (Category 7)
                // These reports must be fully hidden from employees per BRD requirements.
                if (task.id.endsWith('_report')) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.lock_outline_rounded,
                          size: 16,
                          color: Color(0xFF64748B),
                        ),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Report content is restricted to HR/Admin for security and compliance. Only verification status is visible to employees.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF64748B),
                              height: 1.4,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // File/Content Preview (Only shown for non-clearance tasks)
                  if (task.fileUrl != null) ...[
                    const Text(
                      'Attached Document',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 8),
                    CompletedTaskFilePreview(url: task.fileUrl!),
                  ],

                  if (task.signatureUrl != null) ...[
                    const Text(
                      'Digital Signature',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 8),
                    CompletedTaskSignaturePreview(
                      signature: task.signatureUrl!,
                    ),
                  ],

                  if (task.fileUrl == null &&
                      task.signatureUrl == null &&
                      task.actionType == TaskActionType.acknowledge)
                    const Row(
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          size: 16,
                          color: Color(0xFF109B85),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Terms & conditions acknowledged',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getStatusText(TaskStatus status) {
    switch (status) {
      case TaskStatus.completed:
        return 'Submitted and completed';
      case TaskStatus.verified:
        return 'Verified by admin';
      case TaskStatus.signed:
        return 'Signed and submitted';
      case TaskStatus.acknowledged:
        return 'Acknowledged by employee';
      case TaskStatus.submitted:
        return 'Awaiting approval';
      default:
        return 'Status: ${status.name}';
    }
  }

  String _getActionTypeText(TaskActionType actionType) {
    switch (actionType) {
      case TaskActionType.acknowledge:
        return 'Acknowledgment';
      case TaskActionType.upload:
        return 'Document upload';
      case TaskActionType.signature:
        return 'Digital signature';
      case TaskActionType.form:
        return 'Form completion';
      default:
        return 'Task completion';
    }
  }
}
