// ignore_for_file: unrelated_type_equality_checks

import 'dart:developer';
import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/router/route_animation.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/router/admin_shell_route.dart';
import 'package:bhmh/core/router/user_shell_route.dart';
import 'package:bhmh/core/shared/loading_logo.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:bhmh/features/auth/presentation/layout/auth_pages.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/splash_screen/onboarding/on_boarding_screen.dart';
// import 'package:bhmh/features/splash_screen/onboarding/preview_1.dart';
// import 'package:bhmh/features/splash_screen/onboarding/preview_3.dart';
// import 'package:bhmh/features/splash_screen/onboarding/preview_2.dart';
import 'package:bhmh/features/splash_screen/welcome_screen.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Root navigator key — shared with shell routes to prevent GlobalKey conflicts
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'root',
);

/// Main router provider for the application
/// Uses GoRouter with redirect logic for auth and role-based protection
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    // ✅ 1. Standard Web/Mobile Entry Points (preserving kIsWeb behavior)
    initialLocation: kIsWeb ? AuthRoutes.login : AuthRoutes.welcome,

    // ✅ 2. Listen to BOTH Auth and User Data to prevent stale redirects
    refreshListenable: GoRouterRefreshStream(ref),

    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final userDataAsync = ref.read(currentUserProvider);
      final location = state.uri.path;

      // Auth pages + onboarding pages + loading (allowed for non-authenticated users)
      final isPublicPage = [
        AuthRoutes.welcome,
        AuthRoutes.login,
        AuthRoutes.signup,
        AuthRoutes.resetPassword,
        AuthRoutes.loading,
        AppRoutesConstant.onboarding,
      ].contains(location);

      // Check if currently on loading page
      final isOnLoadingPage = location == AuthRoutes.loading;

      // --- AUTH STATE CHECK ---
      // We only care about the actual data or error.
      // If the stream is loading BUT has data (refreshing), we stay on the current page.
      if (authState.isLoading && !authState.hasValue) {
        if (!isOnLoadingPage && location != AuthRoutes.welcome) {
          return AuthRoutes.loading;
        }
        return null;
      }

      if (authState.hasError) {
        if (isOnLoadingPage) {
          return kIsWeb ? AuthRoutes.login : AuthRoutes.welcome;
        }
        return isPublicPage ? null : AuthRoutes.welcome;
      }

      final firebaseUser = authState.value;

      // A. Not Logged In
      if (firebaseUser == null) {
        if (isOnLoadingPage) {
          return kIsWeb ? AuthRoutes.login : AuthRoutes.welcome;
        }
        if (isPublicPage) return null;
        return kIsWeb ? AuthRoutes.login : AuthRoutes.welcome;
      }

      // B. Email Not Verified
      if (!firebaseUser.emailVerified) {
        if (location != AuthRoutes.verifyEmail) {
          return AuthRoutes.verifyEmail;
        }
        return null;
      }

      // --- USER DATA CHECK (Firestore) ---
      // This handles the "Gap" where Auth is ready but Firestore isn't.

      // Senior Fix: Do not show global loading if we are just refreshing data in background.
      if (userDataAsync.isLoading && !userDataAsync.hasValue) {
        if (!isOnLoadingPage) {
          return AuthRoutes.loading;
        }
        return null;
      }

      if (userDataAsync.hasError) return AuthRoutes.login;

      final userData = userDataAsync.value;

      if (userData == null) {
        // Fix for infinite loading deadlock:
        // If data is null and we are no longer loading, it means the document doesn't exist or is inactive.
        if (isOnLoadingPage) {
          // Break out of the loading screen sinkhole
          return kIsWeb ? AuthRoutes.login : AuthRoutes.welcome;
        }

        if (isPublicPage || location == AuthRoutes.verifyEmail) {
          return null; // Safe to stay on strictly public endpoints
        }

        // Boot them out of protected routes if they somehow lost access (e.g. soft-deleted remotely)
        return kIsWeb ? AuthRoutes.login : AuthRoutes.welcome;
      }

      // ✅ C. ADMIN PROTECTION
      if (userData.role == UserRole.admin) {
        // If trying to access public pages or non-admin pages
        if (isPublicPage || !location.startsWith('/admin')) {
          return AdminRoutes.dashboard;
        }
      }

      // ✅ D. USER PROTECTION
      if (userData.role == UserRole.employee) {
        // If trying to access admin pages
        if (location.startsWith('/admin')) {
          return UserRoutes.home;
        }
        // If on public pages
        if (isPublicPage) return UserRoutes.home;
      }

      return null; // Allow navigation
    },

    routes: [
      // --- Auth Routes ---
      GoRoute(
        path: AuthRoutes.welcome,
        name: AuthRouteNames.welcome,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const WelComeScreen()),
      ),
      GoRoute(
        path: AuthRoutes.login,
        name: AuthRouteNames.login,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const LoginPage()),
      ),
      // not comment out it in any way
      /* GoRoute(
        path: AuthRoutes.signup,
        name: AuthRouteNames.signup,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const SigUpPage()),
      ), */
      GoRoute(
        path: AuthRoutes.resetPassword,
        name: AuthRouteNames.resetPassword,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const ForgetPasswordPage()),
      ),
      GoRoute(
        path: AuthRoutes.verifyEmail,
        name: AuthRouteNames.verifyEmail,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const VerifyEmailPage()),
      ),
      GoRoute(
        path: AuthRoutes.loading,
        name: AuthRouteNames.loading,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const LoadingLogo()),
      ),

      // --- Onboarding Routes ---
      GoRoute(
        path: AppRoutesConstant.onboarding,
        name: AppRouteNames.onboarding,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const OnboardingScreen()),
      ),
      /*
      // --- Onboarding Routes (Mobile Preview Screens) ---
      GoRoute(
        path: OnboardingRoutes.preview1,
        name: OnBoardingRouteNames.preview1,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const PreviewScreen1()),
      ),
      GoRoute(
        path: OnboardingRoutes.preview2,
        name: OnBoardingRouteNames.preview2,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const PreviewScreen2()),
      ),
      GoRoute(
        path: OnboardingRoutes.preview3,
        name: OnBoardingRouteNames.preview3,
        pageBuilder: (context, state) =>
            buildSmoothPage(state, const PreviewScreen3()),
      ),
      */

      // --- Admin Shell Route (9 branches) ---
      adminShellRoute(rootNavigatorKey),
      // --- User Routes ---   here is the updated user route
      userShellRoutes(rootNavigatorKey),
    ],
  );
});

/// Helper class to listen to multiple providers
/// Router refreshes when Auth or User Data changes
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Ref ref) {
    // Refresh router when Auth changes (Login/Logout, verified email)
    ref.listen(authStateProvider, (previous, next) {
      final prevUser = previous?.asData?.value;
      final nextUser = next.asData?.value;

      final prevUid = prevUser?.uid;
      final nextUid = nextUser?.uid;

      final prevVerified = prevUser?.emailVerified;
      final nextVerified = nextUser?.emailVerified;

      // Detect the critical loading → resolved transition.
      // Without this, when auth goes from Loading to Data(null) (unauthenticated),
      // prevUid == nextUid (both null), so GoRouter is never told to re-evaluate,
      // leaving the user stuck on the LoadingLogo screen forever.
      final wasLoading = previous?.isLoading ?? true;
      final isNowResolved = !next.isLoading && (next.hasValue || next.hasError);

      if (prevUid != nextUid ||
          prevVerified != nextVerified ||
          (wasLoading && isNowResolved)) {
        notifyListeners();
      }
    });

    // Refresh router when User Data changes (Role update/Profile load)
    ref.listen(currentUserProvider, (previous, next) {
      final prevRole = previous?.asData?.value?.role;
      final nextRole = next.asData?.value?.role;

      final wasLoading = previous?.isLoading ?? true;
      final isNowLoadedWithNull =
          !next.isLoading && next.hasValue && next.value == null;

      // Only notify if the user's role changed, OR if we finished loading
      // and discovered the user document is missing.
      if (prevRole != nextRole || (wasLoading && isNowLoadedWithNull)) {
        log('🔄 [ROUTER] Role transition: $prevRole -> $nextRole');
        notifyListeners();
      }
    });
  }
}
