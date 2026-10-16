import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/router/route_animation.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/layout/admin_clearance_page.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/layout/admin_review_clearance_page.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/layout/admin_directory_page.dart';
import 'package:bhmh/features/admin/admin_directory/presentation/layout/admin_inner_card_page.dart';
import 'package:bhmh/features/admin/admin_profile/layout/admin_change_password_page.dart';
import 'package:bhmh/features/admin/admin_profile/layout/admin_delete_account_page.dart';
import 'package:bhmh/features/admin/admin_profile/layout/admin_profile_page.dart';
import 'package:bhmh/features/admin/admin_training/presentation/layout/admin_training_page.dart';
import 'package:bhmh/features/admin/admin_home/presentation/layout/admin_home_page.dart';
import 'package:bhmh/features/admin/admin_profile/layout/admin_edit_profile_page.dart';
import 'package:bhmh/features/auth/presentation/privacy/contact_support_page.dart';
import 'package:bhmh/features/auth/presentation/privacy/privacy_policy_page.dart';
import 'package:bhmh/features/shell/admin_shell/layout/admin_navigation_shell.dart';
import 'package:bhmh/features/employee/home/presentation/layout/notification_page.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

RouteBase adminShellRoute(GlobalKey<NavigatorState> rootNavigatorKey) {
  return ShellRoute(
    builder: (context, state, child) => AdminNavigationShell(child: child),
    routes: [
      GoRoute(
        path: AdminRoutes.dashboard,
        name: AdminRouteNames.dashboard,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminHomePage()),
      ),
      GoRoute(
        path: AdminRoutes.notifications,
        name: AdminRouteNames.notifications,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const NotificationPage()),
      ),
      GoRoute(
        path: AdminRoutes.directory,
        name: AdminRouteNames.directory,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminDirectoryPage()),
      ),
      GoRoute(
        path: AdminRoutes.training,
        name: AdminRouteNames.training,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminTrainingPage()),
      ),
      GoRoute(
        path: AdminRoutes.clearance,
        name: AdminRouteNames.clearance,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminClearancePage()),
      ),
      GoRoute(
        path: AdminRoutes.clearanceDetail,
        name: AdminRouteNames.clearanceDetail,
        pageBuilder: (context, state) {
          final employeeId = state.pathParameters['employeeId']!;
          final clearanceId = state.pathParameters['clearanceId']!;
          return buildSmoothPage(
            state,
            AdminReviewClearancePage(
              employeeId: employeeId,
              clearanceId: clearanceId,
            ),
          );
        },
      ),
      GoRoute(
        path: AdminRoutes.profile,
        name: AdminRouteNames.profile,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminProfilePage()),
      ),
      GoRoute(
        path: AdminRoutes.employeeProfile,
        name: AdminRouteNames.employeeProfile,
        pageBuilder: (context, state) {
          final employeeId = state.pathParameters['employeeId']!;
          return buildSmoothPage(
            state,
            AdminInnerCardPage(employeeId: employeeId),
          );
        },
      ),
      GoRoute(
        path: AdminRoutes.editProfile,
        name: AdminRouteNames.editProfile,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminEditProfilePage()),
      ),
      GoRoute(
        path: AdminRoutes.changePassword,
        name: AdminRouteNames.changePassword,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminChangePasswordPage()),
      ),
      GoRoute(
        path: AdminRoutes.deleteAccount,
        name: AdminRouteNames.deleteAccount,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const AdminDeleteAccountPage()),
      ),
      GoRoute(
        path: AdminRoutes.privacyPolicy,
        name: AdminRouteNames.privacyPolicy,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const PrivacyPolicyPage()),
      ),
      GoRoute(
        path: AdminRoutes.contactSupport,
        name: AdminRouteNames.contactSupport,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const ContactSupportPage()),
      ),
    ],
  );
}
