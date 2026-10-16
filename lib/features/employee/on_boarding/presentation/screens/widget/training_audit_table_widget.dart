import 'package:bhmh/core/utils/task_lock_helper.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TrainingAuditTableWidget extends StatelessWidget {
  final Map<String, List<String>> topicToTaskIdMap;
  final CompilationSubTask? task;
  final List<CompilationSubTask>? allTasks;
  final bool isLocked;
  final bool isAdmin;
  final bool isPending;
  final Map<String, dynamic> employeeFormData;
  final void Function(String fieldId, bool value) onChanged;

  const TrainingAuditTableWidget({
    super.key,
    required this.topicToTaskIdMap,
    required this.task,
    required this.allTasks,
    required this.isLocked,
    required this.isAdmin,
    required this.isPending,
    required this.employeeFormData,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final topics = topicToTaskIdMap.keys.toList();
    final readOnly = isLocked || isAdmin || isPending;
    // Calculate completion count for summary
    int completedCount = 0;
    for (final topic in topics) {
      final idx = topics.indexOf(topic);
      final fieldId = 'topic_${idx + 1}';
      final rawValue = task?.formData?[fieldId];
      final localValue = employeeFormData[fieldId];
      bool isChecked = (rawValue == true || rawValue == 'true') ||
          (localValue == 'true' || localValue == true);

      if (!isChecked && allTasks != null) {
        final mappedIds = topicToTaskIdMap[topic] ?? [];
        for (final id in mappedIds) {
          final targetTask = allTasks!.cast<CompilationSubTask?>().firstWhere(
                (t) => t?.id == id,
                orElse: () => null,
              );
          if (targetTask != null && isTaskCompleted(targetTask.status)) {
            isChecked = true;
            break;
          }
        }
      }
      if (isChecked) completedCount++;
    }

    final progress = topics.isEmpty ? 0.0 : completedCount / topics.length;
    final supervisorName =
        task?.adminFormData?['supervisorTrainer'] as String? ?? 'Verified';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
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
        children: [
          // --- PROGRESS SUMMARY HEADER ---
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Column(
              children: [
                LayoutBuilder(
                  builder: (context, constraints) {
                    final progressColumn = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Completion Progress',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$completedCount of ${topics.length} training topics verified',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    );
                    final percentageBadge = Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: progress == 1.0
                            ? const Color(0xFF109B85).withValues(alpha: 0.1)
                            : const Color(0xFF6366F1).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${(progress * 100).toInt()}%',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: progress == 1.0
                              ? const Color(0xFF109B85)
                              : const Color(0xFF6366F1),
                        ),
                      ),
                    );

                    if (constraints.maxWidth < 400) {
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: progressColumn),
                          const SizedBox(width: 8),
                          percentageBadge,
                        ],
                      );
                    }

                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        progressColumn,
                        percentageBadge,
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      progress == 1.0
                          ? const Color(0xFF6366F1)
                          : const Color(0xFF6366F1),
                    ),
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ),

          // Table Column Headers
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                Expanded(flex: 2, child: _tableHeaderText('Training Topic')),
                Expanded(flex: 1, child: _tableHeaderText('Trainer')),
                Expanded(flex: 1, child: _tableHeaderText('Date')),
                Expanded(flex: 1, child: _tableHeaderText('Signature')),
              ],
            ),
          ),
          // Table Rows
          ...topics.asMap().entries.map((entry) {
            final idx = entry.key;
            final topic = entry.value;
            final fieldId = 'topic_${idx + 1}';
            final isLast = idx == topics.length - 1;

            // 1. Check local manual form data override
            final rawValue = task?.formData?[fieldId];
            final localValue = employeeFormData[fieldId];
            bool isChecked = (rawValue == true || rawValue == 'true') ||
                (localValue == 'true');

            // 2. SMART SYNC: Cross-reference other tasks for auto-completion
            String trainerDisplay = isChecked ? supervisorName : '-';
            String completionDate = isChecked
                ? (task?.completedAt != null
                    ? "${task?.completedAt?.month}/${task?.completedAt?.day}/${task?.completedAt?.year}"
                    : (task?.updatedAt != null
                        ? "${task?.updatedAt?.month}/${task?.updatedAt?.day}/${task?.updatedAt?.year}"
                        : '-'))
                : '-';

            if (!isChecked && allTasks != null) {
              final mappedIds = topicToTaskIdMap[topic] ?? [];
              for (final id in mappedIds) {
                final targetTask = allTasks!.cast<CompilationSubTask?>().firstWhere(
                  (t) => t?.id == id,
                  orElse: () => null,
                );

                if (targetTask != null && isTaskCompleted(targetTask.status)) {
                  isChecked = true;
                  trainerDisplay =
                      targetTask.adminFormData?['supervisorTrainer'] as String? ??
                          'Verified';

                  final date = targetTask.completedAt ?? targetTask.updatedAt;
                  if (date != null) {
                    completionDate = "${date.month}/${date.day}/${date.year}";
                  }
                  break;
                }
              }
            }

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                border: isLast
                    ? null
                    : const Border(
                        bottom: BorderSide(color: Color(0xFFF1F5F9)),
                      ),
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      topic,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF334155),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Text(
                      trainerDisplay,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: isChecked
                            ? const Color(0xFF64748B)
                            : const Color(0xFF94A3B8),
                        fontStyle: isChecked ? null : FontStyle.italic,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Text(
                      completionDate,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: isChecked
                            ? const Color(0xFF64748B)
                            : const Color(0xFF94A3B8),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 1,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: readOnly
                          ? (isChecked
                              ? const Icon(Icons.check_circle_rounded,
                                  color: Color(0xFF6366F1), size: 20)
                              : const Icon(Icons.radio_button_unchecked_rounded,
                                  color: Color(0xFFE2E8F0), size: 20))
                          : Transform.scale(
                              scale: 0.9,
                              child: Checkbox(
                                value: isChecked,
                                activeColor: const Color(0xFF6366F1),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                onChanged: (val) => onChanged(fieldId, val ?? false),
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _tableHeaderText(String text) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: const Color(0xFF475569),
        letterSpacing: 0.5,
      ),
    );
  }
}
