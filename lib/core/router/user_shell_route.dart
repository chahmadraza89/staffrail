import 'package:bhmh/core/router/route_animation.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/layout/employee_clearance_detail_page.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/layout/employee_clearance_page.dart';
import 'package:bhmh/features/employee/home/presentation/layout/employee_home_page.dart';
import 'package:bhmh/features/employee/home/presentation/layout/messages_page.dart';
import 'package:bhmh/features/employee/home/presentation/layout/notification_page.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/layout/employee_pages.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/layout/task_detail_page.dart';
import 'package:bhmh/features/employee/profile/presentation/layout/profile_page.dart';
import 'package:bhmh/features/employee/profile/presentation/layout/user_edit_profile_page.dart';
import 'package:bhmh/features/employee/profile/presentation/layout/user_change_password_page.dart';
import 'package:bhmh/features/employee/profile/presentation/layout/user_profile_delete_page.dart';
import 'package:bhmh/features/auth/presentation/privacy/contact_support_page.dart';
import 'package:bhmh/features/auth/presentation/privacy/privacy_policy_page.dart';
import 'package:bhmh/features/employee/profile/presentation/screens/document_center_screen.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/screens/layout/training_pages.dart';
import 'package:bhmh/features/employee/training/presentation/screens/layout/training_detail_page.dart';
import 'package:bhmh/features/shell/user_shell/layout/user_navigation_shell.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

// --- Shell Route ---
RouteBase userShellRoutes(GlobalKey<NavigatorState> rootNavigatorKey) {
  return ShellRoute(
    builder: (context, state, child) => UserNavigationShell(child: child),
    routes: [
      GoRoute(
        path: UserRoutes.dashboard,
        name: UserRouteNames.dashboard,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const EmployeeHomePage()),
      ),
      GoRoute(
        path: UserRoutes.guide,
        name: UserRouteNames.guide,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, EmployeeOnBoardingPages()),
      ),
      GoRoute(
        path: UserRoutes.taskDetail,
        name: UserRouteNames.taskDetail,
        pageBuilder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return buildSmoothPage(
            state,
            TaskDetailPage(
              taskId: state.pathParameters['taskId'] ?? extra?['taskId'] ?? '',
              taskTitle: extra?['taskTitle'] ?? '',
              taskSubtitle: extra?['taskSubtitle'] ?? '',
              currentStatus: extra?['currentStatus'],
              icon: extra?['icon'],
            ),
          );
        },
      ),
      GoRoute(
        path: UserRoutes.trainings,
        name: UserRouteNames.trainings,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, TrainingPages()),
      ),
      GoRoute(
        path: UserRoutes.trainingDetail,
        name: UserRouteNames.trainingDetail,
        pageBuilder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return buildSmoothPage(
            state,
            TrainingDetailPage(
              trainingId: extra?['trainingId'] ?? '',
              trainingTitle: extra?['trainingTitle'] ?? 'Training Detail',
              description: extra?['description'] ?? '',
              durationText: extra?['durationText'] ?? '',
              status: extra?['status'] ?? TrainingStatus.pending,
              assignedAt: extra?['assignedAt'],
            ),
          );
        },
      ),
      GoRoute(
        path: UserRoutes.clearance,
        name: UserRouteNames.clearance,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const EmployeeClearancePage()),
      ),
      GoRoute(
        path: UserRoutes.clearanceDetail,
        name: UserRouteNames.clearanceDetail,
        pageBuilder: (context, state) {
          final clearanceId = state.pathParameters['clearanceId']!;
          return buildSmoothPage(
            state,
            EmployeeClearanceDetailPage(clearanceId: clearanceId),
          );
        },
      ),
      GoRoute(
        path: UserRoutes.profile,
        name: UserRouteNames.profile,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const ProfilePage()),
      ),
      GoRoute(
        path: UserRoutes.notifications,
        name: UserRouteNames.notifications,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const NotificationPage()),
      ),
      GoRoute(
        path: UserRoutes.messages,
        name: UserRouteNames.messages,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const MessagesPage()),
      ),
      GoRoute(
        path: UserRoutes.documentCenter,
        name: UserRouteNames.documentCenter,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const DocumentCenterScreen()),
      ),
      GoRoute(
        path: UserRoutes.editProfile,
        name: UserRouteNames.editProfile,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const EditProfilePage()),
      ),
      GoRoute(
        path: UserRoutes.changePassword,
        name: UserRouteNames.changePassword,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const UserChangePasswordPage()),
      ),
      GoRoute(
        path: UserRoutes.profileDelete,
        name: UserRouteNames.profileDelete,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const UserProfileDeletePage()),
      ),
      GoRoute(
        path: UserRoutes.privacyPolicy,
        name: UserRouteNames.privacyPolicy,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const PrivacyPolicyPage()),
      ),
      GoRoute(
        path: UserRoutes.contactSupport,
        name: UserRouteNames.contactSupport,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const ContactSupportPage()),
      ),
    ],
  );
}
