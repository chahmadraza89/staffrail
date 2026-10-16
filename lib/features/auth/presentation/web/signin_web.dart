import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/shared/app_image.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:bhmh/core/widgets/validation.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class SignInWeb extends ConsumerStatefulWidget {
  const SignInWeb({super.key});

  @override
  ConsumerState<SignInWeb> createState() => _SignInWebState();
}

class _SignInWebState extends ConsumerState<SignInWeb>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _rememberMe = false;

  // Animation Variables
  late AnimationController _animationController;
  late Animation<double> _leftPanelFade;
  late Animation<Offset> _leftPanelSlide;
  late Animation<double> _titleFade;
  late Animation<Offset> _titleSlide;
  late Animation<double> _formFade;
  late Animation<Offset> _formSlide;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _leftPanelFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
      ),
    );
    _leftPanelSlide =
        Tween<Offset>(begin: const Offset(-0.05, 0), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
          ),
        );

    _titleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
      ),
    );
    _titleSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
          ),
        );

    _formFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.4, 0.8, curve: Curves.easeOutSine),
      ),
    );
    _formSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.4, 0.8, curve: Curves.easeOutSine),
          ),
        );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _signIn() {
    if (!_formKey.currentState!.validate()) return;
    ref
        .read(authViewModelProvider.notifier)
        .login(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authViewModelProvider);
    final isSmallScreen = context.screenWidth < 900;

    ref.listen<AsyncValue>(authViewModelProvider, (_, state) {
      if (!state.isLoading && state.hasError) {
        ToastService.showError(
          context,
          FirebaseErrorMapper.getUserFriendlyMessage(state.error),
        );
      }
    });

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Row(
        children: [
          // ==========================================
          // LEFT SIDE: BRANDING PANEL (Animated & Responsive)
          // ==========================================
          if (!isSmallScreen)
            Expanded(
              flex: 1,
              child: FadeTransition(
                opacity: _leftPanelFade,
                child: SlideTransition(
                  position: _leftPanelSlide,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          theme.colorScheme.primary.withValues(alpha: 0.05),
                          theme.colorScheme.primary.withValues(alpha: 0.15),
                        ],
                      ),
                    ),
                    child: Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(48.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              inAppLogo,
                              height: 280,
                              fit: BoxFit.contain,
                            ),
                            const SizedBox(height: 40),
                            Text(
                              'Bright Horizons\nMental Health',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.displaySmall?.copyWith(
                                color: theme.colorScheme.primary,
                                fontWeight: FontWeight.bold,
                                height: 1.2,
                                letterSpacing: -1.0,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 32.0,
                              ),
                              child: Text(
                                'Empowering Care Together. Sign in to access your staff dashboard and complete your onboarding.',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: theme.colorScheme.onSurface.withValues(
                                    alpha: 0.7,
                                  ),
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // ==========================================
          // RIGHT SIDE: THE FORM (Expanded Width)
          // ==========================================
          Expanded(
            flex: isSmallScreen
                ? 1
                : 1, // Full width on small screens, half on large
            child: Center(
              child: SingleChildScrollView(
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: isSmallScreen ? 24.0 : 48.0,
                    vertical: 24.0,
                  ),
                  child: ConstrainedBox(
                    // INCREASED WIDTH to 540 to stretch out the fields
                    constraints: const BoxConstraints(maxWidth: 540),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Title Section
                          FadeTransition(
                            opacity: _titleFade,
                            child: SlideTransition(
                              position: _titleSlide,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Welcome Back',
                                    style: theme.textTheme.headlineMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w800,
                                          color: theme.colorScheme.onSurface,
                                          letterSpacing: -0.5,
                                        ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Sign in to continue your journey.',
                                    style: theme.textTheme.titleMedium
                                        ?.copyWith(
                                          color: theme.colorScheme.onSurface
                                              .withValues(alpha: 0.6),
                                          fontSize: 15,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 48),

                          // Form Fields Section
                          FadeTransition(
                            opacity: _formFade,
                            child: SlideTransition(
                              position: _formSlide,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Email Label
                                  Text(
                                    'Email Address',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: theme.colorScheme.onSurface
                                          .withValues(alpha: 0.9),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CustomTextField(
                                    controller: _emailController,
                                    hintText: 'Email',
                                    keyboardType: TextInputType.emailAddress,
                                    validator: ValidateFields.validateEmail,
                                  ),
                                  const SizedBox(height: 24),

                                  // Password Label
                                  Text(
                                    'Password',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: theme.colorScheme.onSurface
                                          .withValues(alpha: 0.9),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  CustomTextField(
                                    controller: _passwordController,
                                    obscureText: true,
                                    hintText: 'Password',
                                    validator:
                                        ValidateFields.validateLoginPassword,
                                  ),
                                  const SizedBox(height: 16),

                                  // Remember Me & Forgot Password Row
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      // Checkbox & Remember Me
                                      Row(
                                        children: [
                                          SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: Checkbox(
                                              value: _rememberMe,
                                              activeColor:
                                                  theme.colorScheme.primary,
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              onChanged: (value) {
                                                setState(() {
                                                  _rememberMe = value ?? false;
                                                });
                                              },
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Remember me',
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w500,
                                              color: theme.colorScheme.onSurface
                                                  .withValues(alpha: 0.8),
                                            ),
                                          ),
                                        ],
                                      ),

                                      // Forgot Password Link
                                      TextButton(
                                        onPressed: () => context.go(
                                          AuthRoutes.resetPassword,
                                        ),
                                        style: TextButton.styleFrom(
                                          padding: EdgeInsets.zero,
                                          minimumSize: Size.zero,
                                          tapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                          foregroundColor:
                                              theme.colorScheme.primary,
                                        ),
                                        child: const Text(
                                          'Forgot password?',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 32),

                                  // Login Button (Full Width)
                                  Center(
                                    child: SizedBox(
                                      width: isSmallScreen
                                          ? double.infinity
                                          : 340, // Let it expand on mobile sized web
                                      height: 50,
                                      child: CustomButton(
                                        text: 'Login',
                                        isLoading: authState.isLoading,
                                        onPressed: _signIn,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Footer Section
                          /* FadeTransition(
                            opacity: _footerFade,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Need to create an account? ",
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: theme.colorScheme.onSurface
                                        .withValues(alpha: 0.7),
                                  ),
                                ),
                                TextButton(
                                  onPressed: () =>
                                      context.go(AuthRoutes.signup),
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                    foregroundColor: theme.colorScheme.primary,
                                  ),
                                  child: const Text(
                                    'Register',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ), */
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
