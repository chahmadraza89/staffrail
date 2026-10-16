// ============================================================================
// --- THE SPLIT SCREEN MANAGER (HANDLES THE SHRINK & EMBED LOGIC) ---
// ============================================================================

import 'package:bhmh/core/utils/task_lock_helper.dart' as task_lock_helper;
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_onboarding_check_list.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/task_panel_tile_data.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';

class TaskManagerSection extends StatefulWidget {
  final List<CompilationTask> categories;
  final String employeeId;

  const TaskManagerSection({
    super.key,
    required this.categories,
    required this.employeeId,
  });

  @override
  State<TaskManagerSection> createState() => _TaskManagerSectionState();
}

class _TaskManagerSectionState extends State<TaskManagerSection> {
  String? _selectedTaskId;

  void _handleTaskTap(
    BuildContext context,
    CompilationSubTask task,
    bool isMobile,
  ) {
    final allSubTasks = widget.categories.expand((c) => c.subTasks).toList();

    if (isMobile) {
      // 📱 MOBILE: Slide up bottom sheet
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Container(
          height: MediaQuery.sizeOf(context).height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: TaskDetailPanel(
            task: task,
            isMobile: true,
            employeeId: widget.employeeId,
            allTasks: allSubTasks,
          ),
        ),
      );
    } else {
      // 💻 WEB: Update the right-side detail panel
      setState(() {
        _selectedTaskId = task.id;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.sizeOf(context).width < 800;

    // Flatten all subtasks to find the selected one
    final allSubTasks = widget.categories.expand((c) => c.subTasks).toList();
    final selectedTask = _selectedTaskId == null
        ? null
        : allSubTasks.firstWhere(
            (t) => t.id == _selectedTaskId,
            orElse: () => allSubTasks.first,
          );

    if (isMobile) {
      return Column(
        children: [
          TaskProgressHeader(allTasks: allSubTasks),
          ...widget.categories.map((category) {
            if (category.subTasks.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 16, 4, 12),
                  child: Text(
                    category.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                ...category.subTasks.map((task) {
                  return OnboardingTaskTile(
                    task: task,
                    isMobile: true,
                    onTap: () => _handleTaskTap(context, task, true),
                  );
                }),
              ],
            );
          }),
        ],
      );
    }

    return SizedBox(
      height: 700,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Left: Grouped Task List
          Expanded(
            flex: 4,
            child: SingleChildScrollView(
              child: Column(
                children: [
                  TaskProgressHeader(allTasks: allSubTasks),
                  ...widget.categories.map((category) {
                    if (category.subTasks.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(8, 24, 8, 12),
                          child: Text(
                            category.title,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF94A3B8),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        ...category.subTasks.map((task) {
                          final isSelected = _selectedTaskId == task.id;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: OnboardingTaskTile(
                              task: task,
                              isMobile: false,
                              isSelected: isSelected,
                              onTap: () => _handleTaskTap(context, task, false),
                            ),
                          );
                        }),
                      ],
                    );
                  }),
                ],
              ),
            ),
          ),
          const SizedBox(width: 24),
          // Right: Detail Panel (Web only)
          Expanded(
            flex: 6,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.grey.shade200, width: 1.5),
              ),
              child: selectedTask == null
                  ? const Center(
                      child: Text(
                        'Select a task to view details',
                        style: TextStyle(color: Color(0xFF94A3B8)),
                      ),
                    )
                  : TaskDetailPanel(
                      task: selectedTask,
                      isMobile: false,
                      employeeId: widget.employeeId,
                      allTasks: allSubTasks,
                      onClose: () => setState(() => _selectedTaskId = null),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// --- STANDALONE UI COMPONENTS FOR TASK MANAGER ---
// ============================================================================

class TaskProgressHeader extends StatelessWidget {
  final List<CompilationSubTask> allTasks;

  const TaskProgressHeader({super.key, required this.allTasks});

  @override
  Widget build(BuildContext context) {
    final relevantTasks = allTasks
        .where((t) => t.status != TaskStatus.noActionRequired)
        .toList();
    final completed = relevantTasks
        .where((t) => task_lock_helper.isTaskCompleted(t.status))
        .length;
    final total = relevantTasks.length;
    final remaining = total - completed;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF3B82F6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6366F1).withValues(alpha: 0.15),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          TaskProgressStat(
            label: 'Completed',
            value: '$completed',
            icon: Icons.check_circle_outline,
          ),
          Container(
            width: 1,
            height: 32,
            color: Colors.white.withValues(alpha: 0.2),
            margin: const EdgeInsets.symmetric(horizontal: 20),
          ),
          TaskProgressStat(
            label: 'Remaining',
            value: '$remaining',
            icon: Icons.pending_actions,
          ),
        ],
      ),
    );
  }
}

class TaskProgressStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const TaskProgressStat({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 22),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.8),
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
