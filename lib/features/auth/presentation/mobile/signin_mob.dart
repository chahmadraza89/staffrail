import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/shared/app_image.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/widgets/validation.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class SignInScreenMob extends ConsumerStatefulWidget {
  const SignInScreenMob({super.key});

  @override
  ConsumerState<SignInScreenMob> createState() => _SignInScreenMobState();
}

class _SignInScreenMobState extends ConsumerState<SignInScreenMob>
    with SingleTickerProviderStateMixin {
  // Added for animations
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  // Animation Variables
  late AnimationController _animationController;
  late Animation<double> _headerFade;
  late Animation<Offset> _headerSlide;
  late Animation<double> _titleFade;
  late Animation<double> _formFade;
  late Animation<Offset> _formSlide;
  late Animation<double> _footerFade;

  @override
  void initState() {
    super.initState();

    // 1. Snappy but smooth pacing (1200ms total)
    // We want it fast enough to not delay login, but smooth enough to feel premium.
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    // 2. Header slides down from the top slightly
    _headerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.4, curve: Curves.easeOutSine),
      ),
    );
    _headerSlide = Tween<Offset>(begin: const Offset(0, -0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.0, 0.4, curve: Curves.easeOutSine),
          ),
        );

    // 3. Welcome text drifts up
    _titleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
      ),
    );

    // 4. Form fields and button drift up
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

    // 5. Footer (Sign up link) fades in last
    _footerFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.6, 1.0, curve: Curves.easeInSine),
      ),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController
        .dispose(); // Always dispose controllers to prevent memory leaks
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _signIn() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

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

    ref.listen<AsyncValue>(authViewModelProvider, (_, state) {
      if (!state.isLoading && state.hasError) {
        ToastService.showError(
          context,
          AppErrorMapper.getUserFriendlyMessage(state.error),
        );
      }
    });

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: Stack(
        children: [
          // BACKGROUND: Subtle Enterprise SaaS Geometric Accents
          Positioned(
            top: -100,
            left: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: theme.colorScheme.primary.withValues(alpha: 0.05),
              ),
            ),
          ),
          Positioned(
            top: 250,
            right: -150,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: theme.colorScheme.primary.withValues(alpha: 0.03),
              ),
            ),
          ),

          // MAIN CONTENT
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: context.screenWidth * 0.05,
                ),
                child: AnimatedBuilder(
                  animation: _animationController,
                  builder: (context, child) {
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 1. PROMINENT LOGO
                        FadeTransition(
                          opacity: _headerFade,
                          child: SlideTransition(
                            position: _headerSlide,
                            child: Center(
                              child: Image.asset(
                                inAppLogo,
                                height: 130, // Large and in charge
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) {
                                  return Icon(
                                    LucideIcons.shield,
                                    size: 100,
                                    color: theme.colorScheme.primary,
                                  );
                                },
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 30),

                        // 2. ELEVATED SAAS FORM CARD
                        FadeTransition(
                          opacity: _formFade,
                          child: SlideTransition(
                            position: _formSlide,
                            child: Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surface,
                                borderRadius: BorderRadius.circular(24),
                                // Premium glass/elevation shadow
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 24,
                                    spreadRadius: 0,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                                border: Border.all(
                                  color: theme.colorScheme.outline.withValues(
                                    alpha: 0.1,
                                  ),
                                  width: 1,
                                ),
                              ),
                              child: Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Staff Portal Badge
                                    // Container(
                                    //   padding: const EdgeInsets.symmetric(
                                    //     horizontal: 12,
                                    //     vertical: 6,
                                    //   ),
                                    //   decoration: BoxDecoration(
                                    //     color: theme.colorScheme.primary
                                    //         .withValues(alpha: 0.1),
                                    //     borderRadius: BorderRadius.circular(20),
                                    //   ),
                                    //   child: Row(
                                    //     mainAxisSize: MainAxisSize.min,
                                    //     children: [
                                    //       Icon(
                                    //         LucideIcons.lock,
                                    //         size: 14,
                                    //         color: theme.colorScheme.primary,
                                    //       ),
                                    //       const SizedBox(width: 6),
                                    //       Text(
                                    //         'STAFF PORTAL',
                                    //         style: TextStyle(
                                    //           color: theme.colorScheme.primary,
                                    //           fontSize: 11,
                                    //           fontWeight: FontWeight.bold,
                                    //           letterSpacing: 1.2,
                                    //         ),
                                    //       ),
                                    //     ],
                                    //   ),
                                    // ),
                                    // const SizedBox(height: 20),

                                    // Welcome Text
                                    FadeTransition(
                                      opacity: _titleFade,
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Welcome Back',
                                            style: theme.textTheme.headlineSmall
                                                ?.copyWith(
                                                  color: theme
                                                      .colorScheme
                                                      .onSurface,
                                                  fontWeight: FontWeight.bold,
                                                  letterSpacing: -0.5,
                                                ),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            'Sign in to securely access your dashboard',
                                            style: theme.textTheme.bodyMedium
                                                ?.copyWith(
                                                  color: theme
                                                      .colorScheme
                                                      .onSurface
                                                      .withValues(alpha: 0.6),
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),

                                    const SizedBox(height: 28),

                                    // Email Field
                                    CustomTextField(
                                      controller: _emailController,
                                      hintText: 'Email Address',
                                      prefixIcon: const Icon(LucideIcons.mail),
                                      keyboardType: TextInputType.emailAddress,
                                      validator: ValidateFields.validateEmail,
                                    ),
                                    const SizedBox(height: 20),

                                    // Password Field
                                    CustomTextField(
                                      controller: _passwordController,
                                      obscureText: true,
                                      hintText: 'Password',
                                      prefixIcon: const Icon(LucideIcons.lock),
                                      validator:
                                          ValidateFields.validateLoginPassword,
                                    ),

                                    const SizedBox(height: 8),

                                    // Forgot Password
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: TextButton(
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
                                          'Forgot Password?',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                    ),

                                    const SizedBox(height: 28),

                                    // Sign In Button
                                    SizedBox(
                                      width: double.infinity,
                                      height: 54,
                                      child: CustomButton(
                                        text: 'Sign In',
                                        isLoading: authState.isLoading,
                                        onPressed: _signIn,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 24),

                        // SECURE CONNECTION FOOTER
                        FadeTransition(
                          opacity: _footerFade,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                LucideIcons.shieldCheck,
                                size: 16,
                                color: theme.colorScheme.onSurface.withValues(
                                  alpha: 0.4,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                "Secure StaffRail Session",
                                style: TextStyle(
                                  color: theme.colorScheme.onSurface.withValues(
                                    alpha: 0.4,
                                  ),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // FOOTER / SIGN UP LINK (Animated) - Kept commented out as requested
                        /* const SizedBox(height: 16),
                        FadeTransition(
                          opacity: _footerFade,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                "Don't have an account? ",
                                style: TextStyle(
                                  color: theme.colorScheme.onSurface
                                      .withValues(alpha: 0.7),
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.go(AuthRoutes.signup),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  foregroundColor: theme.colorScheme.primary,
                                ),
                                child: const Text(
                                  'Sign Up',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ), */
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
