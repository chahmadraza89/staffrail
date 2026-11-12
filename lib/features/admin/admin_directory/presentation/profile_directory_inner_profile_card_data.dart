import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/core/utils/compliance_helpers.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart' as task_lock_helper;
import 'package:bhmh/features/admin/admin_directory/presentation/admin_inner_profile_card_data.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/provider/admin_directory_provider.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/screens/widgets/admin_directory_task_manager.dart';
import 'package:bhmh/features/admin/admin_home/data/model/admin_dashboard_models.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/widgets/admin_directory_inner_profile_card.dart';

class AdminDirectoryInnerProfileCard extends ConsumerWidget {
  final String employeeId;
  const AdminDirectoryInnerProfileCard({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final employeeAsync = ref.watch(employeeDetailProvider(employeeId));
    final tasksAsync = ref.watch(employeeTasksProvider(employeeId));
    final trainingsAsync = ref.watch(employeeTrainingsProvider(employeeId));
    final clearanceAsync = ref.watch(employeeClearanceProvider(employeeId));

    final AdminEmployeeProgress? employee = employeeAsync.hasValue
        ? employeeAsync.value
        : null;

    if (employee == null && employeeAsync.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF109B85)),
      );
    }

    if (employee == null && employeeAsync.hasError) {
      return Center(child: Text('Error: ${employeeAsync.error}'));
    }

    if (employee == null) {
      return const Center(
        child: Text('Employee not found', style: TextStyle(color: Colors.grey)),
      );
    }

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ProfileHeader(employee: employee),
          const SizedBox(height: 24),
          ProgressOverview(employee: employee),
          const SizedBox(height: 32),

          // ── CATEGORIZED COMPLIANCE VIEW (Unified 7-Category Model) ───────────
          const Text(
            'Compliance Categories',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),

          Builder(
            builder: (context) {
              final tasks = tasksAsync.value ?? [];
              final trainings = trainingsAsync.value ?? [];
              final clearances = clearanceAsync.value ?? [];

              // --- MERGE LOGIC: Align with OnboardingConstants (Employee Side parity) ---

              // 1. Merge Onboarding Tasks
              final defaultTasks = OnboardingConstants.getDefaultTasks(
                employeeId: employeeId,
                employeeName: employee.name,
              );

              // Strict ID-based de-duplication to prevent UI clutter
              final Map<String, CompilationSubTask> actualTasksMap = {
                for (var t in tasks) t.id: t,
              };

              final List<CompilationSubTask> mergedTasks = defaultTasks.map((
                dt,
              ) {
                if (actualTasksMap.containsKey(dt.id)) {
                  final actual = actualTasksMap[dt.id]!;
                  // 🔥 CRITICAL: Preserve template title and icon to prevent "Onboarding Task" duplicates
                  return actual.copyWith(
                    title: dt.title,
                    subtitleIcon: dt.subtitleIcon,
                    actionType: dt.actionType,
                  );
                }
                return dt;
              }).toList();

              // ── NEW: Dynamic Task Support ─────────────────────────────────
              // Include any tasks from Firestore that are NOT in defaultTasks.
              // This ensures that manually assigned or newly added forms
              // (like QMHP-CS Competency) are always visible on the admin side.
              final defaultIds = defaultTasks.map((t) => t.id).toSet();
              final extraTasks = tasks
                  .where((t) => !defaultIds.contains(t.id))
                  .toList();

              if (extraTasks.isNotEmpty) {
                mergedTasks.addAll(extraTasks);
              }
              // ──────────────────────────────────────────────────────────────

              // 2. Merge Trainings
              final defaultTrainings = OnboardingConstants.getDefaultTrainings(
                employeeId: employeeId,
              );
              final actualTrainingsMap = {for (var t in trainings) t.id: t};
              final mergedTrainings = defaultTrainings.map((dt) {
                if (actualTrainingsMap.containsKey(dt.id)) {
                  final actual = actualTrainingsMap[dt.id]!;
                  return actual.copyWith(
                    title: dt.title,
                    description: dt.description,
                    durationText: dt.durationText,
                  );
                }
                return dt;
              }).toList();

              // Convert Trainings to SubTasks
              final trainingSubTasks = mergedTrainings.map((t) {
                final taskStatus =
                    t.status == TrainingStatus.verified ||
                        t.status == TrainingStatus.completed
                    ? TaskStatus.completed
                    : (t.status == TrainingStatus.underReview
                          ? TaskStatus.submitted
                          : (t.status == TrainingStatus.inProgress
                                ? TaskStatus.pending
                                : TaskStatus.notStarted));
                return CompilationSubTask(
                  id: t.id,
                  title: t.title,
                  subtitle: t.description,
                  status: taskStatus,
                  isCompleted:
                      t.status == TrainingStatus.verified ||
                      t.status == TrainingStatus.completed,
                  fileUrl: t.certificateUrl,
                  employeeId: employeeId,
                  employeeName: employee.name,
                  subtitleIcon: Icons.school_rounded,
                  taskSource: TaskSource.training,
                  actionType: TaskActionType.upload,
                );
              }).toList();

              // 3. Merge Clearances
              final defaultClearances =
                  OnboardingConstants.getDefaultClearances(
                    employeeId: employeeId,
                    employeeName: employee.name,
                  );
              final actualClearancesMap = {for (var c in clearances) c.id: c};
              final mergedClearances = defaultClearances.map((dc) {
                if (actualClearancesMap.containsKey(dc.id)) {
                  final actual = actualClearancesMap[dc.id]!;
                  return actual.copyWith(
                    title: dc.title,
                    description: dc.description,
                  );
                }
                return dc;
              }).toList();

              // Convert Clearances to SubTasks
              final clearanceSubTasks = mergedClearances.map((c) {
                final taskStatus = c.status == ClearanceStatus.verified
                    ? TaskStatus.completed
                    : (c.status == ClearanceStatus.underReview
                          ? TaskStatus.submitted
                          : (c.status == ClearanceStatus.pending
                                ? TaskStatus.pending
                                : TaskStatus.notStarted));
                return CompilationSubTask(
                  id: c.id,
                  title: c.title,
                  subtitle: c.description,
                  status: taskStatus,
                  isCompleted: c.status == ClearanceStatus.verified,
                  fileUrl: c.fileUrl,
                  employeeId: employeeId,
                  employeeName: employee.name,
                  subtitleIcon: Icons.verified_user_rounded,
                  taskSource: TaskSource.clearance,
                  actionType: TaskActionType.upload,
                );
              }).toList();

              // 4. Final Filter: Remove duplicates between general tasks and specific training/clearance items
              final trainingIds = trainingSubTasks.map((t) => t.id).toSet();
              final clearanceIds = clearanceSubTasks.map((c) => c.id).toSet();

              final finalTasks = mergedTasks.where((t) {
                return !trainingIds.contains(t.id) &&
                    !clearanceIds.contains(t.id);
              }).toList();

              final finalSubTasks = finalTasks.map((t) {
                final isDone = task_lock_helper.isTaskCompleted(t.status);
                return t.copyWith(
                  subtitle: isDone
                      ? 'Completed on ${t.updatedAt?.toString().split(' ')[0] ?? 'Recently'}'
                      : 'Pending completion',
                  isCompleted: isDone,
                  employeeId: employeeId,
                  employeeName: employee.name,
                  taskSource: TaskSource.onboarding,
                );
              }).toList();

              // Group everything into 7 categories using the filtered lists
              final groupedCategories =
                  ComplianceHelpers.groupTasksIntoCategories(
                    tasks: finalSubTasks,
                    trainingSubTasks: trainingSubTasks,
                    clearanceSubTasks: clearanceSubTasks,
                  );

              if (groupedCategories.every((c) => c.subTasks.isEmpty) &&
                  !tasksAsync.isLoading) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Text(
                      'No compliance requirements found.',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                  ),
                );
              }

              return TaskManagerSection(
                categories: groupedCategories,
                employeeId: employeeId,
              );
            },
          ),

          const SizedBox(height: 48),
        ],
      ),
    );
  }
}
