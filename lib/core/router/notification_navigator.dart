import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/router/user_route_constant.dart';

/// A command object that encapsulates all data needed for GoRouter navigation.
class NotificationNavigationCommand {
  final String routeName;
  final Map<String, String> pathParameters;
  final Map<String, dynamic>? extra;

  NotificationNavigationCommand({
    required this.routeName,
    this.pathParameters = const {},
    this.extra,
  });
}

/// A centralized utility to resolve navigation commands from notification metadata.
/// This follows the Deep-Linking pattern for scalable app navigation.
class NotificationNavigator {
  /// Resolves the target navigation command based on the notification metadata and user role.
  ///
  /// [metadata] - The payload from the notification (e.g., taskId, employeeId, type).
  /// [isAdmin] - Whether the current user is an administrator.
  /// [title] - Optional title from the notification to pass as extra data.
  static NotificationNavigationCommand? resolveCommand({
    required Map<String, dynamic>? metadata,
    required bool isAdmin,
    String? title,
  }) {
    if (metadata == null) return null;

    final type = metadata['type'] as String?;
    final taskId = metadata['taskId'] as String?;
    final employeeId = metadata['employeeId'] as String?;
    final clearanceId = metadata['clearanceId'] as String?;

    // --- Industrial Standard Navigation Mapping ---
    switch (type) {
      // 📝 ONBOARDING TASKS
      case 'onboarding_update':
      case 'onboarding_start':
      case 'admin_review_required':
        if (isAdmin) {
          if (employeeId != null) {
            return NotificationNavigationCommand(
              routeName: AdminRouteNames.employeeProfile,
              pathParameters: {'employeeId': employeeId},
            );
          }
          return NotificationNavigationCommand(
            routeName: AdminRouteNames.dashboard,
          );
        } else {
          if (taskId != null) {
            return NotificationNavigationCommand(
              routeName: UserRouteNames.taskDetail,
              pathParameters: {'taskId': taskId},
              extra: {
                'taskTitle': title ?? 'Task Detail',
                'taskSubtitle': metadata['subtitle'] ?? 'Action required',
              },
            );
          }
          return NotificationNavigationCommand(
            routeName: UserRouteNames.dashboard,
          );
        }

      // 🛡️ CLEARANCE & COMPLIANCE
      case 'clearance_review':
      case 'clearance_update':
      case 'clearance_submission':
      case 'clearance_verified':
      case 'clearance_rejected':
      case 'clearance_seed':
      case 'compliance_warning':
        if (isAdmin) {
          if (employeeId != null && clearanceId != null) {
            return NotificationNavigationCommand(
              routeName: AdminRouteNames.clearanceDetail,
              pathParameters: {
                'employeeId': employeeId,
                'clearanceId': clearanceId,
              },
            );
          }
          return NotificationNavigationCommand(
            routeName: AdminRouteNames.clearance,
          );
        } else {
          if (clearanceId != null) {
            return NotificationNavigationCommand(
              routeName: UserRouteNames.clearanceDetail,
              pathParameters: {'clearanceId': clearanceId},
            );
          }
          return NotificationNavigationCommand(
            routeName: UserRouteNames.clearance,
          );
        }

      // 🎓 TRAINING
      case 'training_assigned':
      case 'trainings_assigned':
      case 'training_update':
      case 'training_complete':
      case 'training_expired':
      case 'training_critical':
      case 'training_urgent':
      case 'training_advisory':
        return NotificationNavigationCommand(
          routeName: isAdmin
              ? AdminRouteNames.training
              : UserRouteNames.trainings,
        );

      // 📣 GENERAL UPDATES / BROADCASTS
      default:
        return null;
    }
  }
}
