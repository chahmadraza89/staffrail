class AppRoutesConstant {
  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String signin = '/signin';
  static const String signup = '/signup';
  static const String forgotPassword = '/forgotPassword';
}

class OnboardingRoutes {
  // static const String preview1 = '/preview1';
  // static const String preview2 = '/preview2';
  // static const String preview3 = '/preview3';
}

class OnBoardingRouteNames {
  // static const String preview1 = 'preview1';
  // static const String preview2 = 'preview2';
  // static const String preview3 = 'preview3';
}

class AppRouteNames {
  static const String splash = 'splash';
  static const String onboarding = 'onboarding';
  static const String signin = 'signin';
  static const String signup = 'signup';
  static const String forgotPassword = 'forgotPassword';
}

// Authentication routes
class AuthRoutes {
  static const String welcome = '/';
  static const String login = '/login';
  static const String signup = '/signup';
  static const String resetPassword = '/reset-password';
  static const String verifyEmail = '/verify-email';
  static const String loading =
      '/loading'; // Loading screen for auth transitions
}

// Named routes for type-safe navigation with context.goNamed()
class AuthRouteNames {
  static const String welcome = 'welcome';
  static const String login = 'login';
  static const String signup = 'signup';
  static const String resetPassword = 'resetPassword';
  static const String verifyEmail = 'verifyEmail';
  static const String loading = 'loading';
}
