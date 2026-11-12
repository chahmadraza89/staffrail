import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';

// =============================================================================
// TASK LOCK HELPER
// =============================================================================
// Centralized utility for determining task lock state.
// Replaces the duplicated `_isLocked()` method across action widgets.
// =============================================================================

/// Returns `true` if the task is in a terminal state that prevents further edits.
/// Used by all action widgets to disable inputs and show the "Locked" banner.
bool isTaskLocked(TaskStatus? status) {
  return status == TaskStatus.submitted ||
      status == TaskStatus.completed ||
      status == TaskStatus.verified ||
      status == TaskStatus.signed ||
      status == TaskStatus.acknowledged ||
      status == TaskStatus.confirmed ||
      status == TaskStatus.cleared ||
      status == TaskStatus.waitingForApprover ||
      status == TaskStatus.pendingEmployerSignature ||
      status == TaskStatus.noActionRequired;
}

/// Returns `true` if the status is a "completed" terminal state (for progress tracking).
bool isTaskCompleted(TaskStatus? status) {
  return status == TaskStatus.completed ||
      status == TaskStatus.verified ||
      status == TaskStatus.cleared ||
      status == TaskStatus.signed ||
      status == TaskStatus.acknowledged ||
      status == TaskStatus.confirmed;
}
