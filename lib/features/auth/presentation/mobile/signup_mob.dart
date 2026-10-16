import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/widgets/validation.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class SignUpScreenMob extends ConsumerStatefulWidget {
  const SignUpScreenMob({super.key});

  @override
  ConsumerState<SignUpScreenMob> createState() => _SignUpScreenMobState();
}

class _SignUpScreenMobState extends ConsumerState<SignUpScreenMob>
    with SingleTickerProviderStateMixin {
  // 1. Added Mixin for animation
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _employeeIdController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Animation Variables
  late AnimationController _animationController;
  late Animation<double> _titleFade;
  late Animation<Offset> _titleSlide;
  late Animation<double> _formFade;
  late Animation<Offset> _formSlide;
  late Animation<double> _footerFade;

  @override
  void initState() {
    super.initState();

    // 2. Initialize Controller with 1200ms duration
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    // 3. Title Animation (Starts immediately)
    _titleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.5, curve: Curves.easeOutSine),
      ),
    );
    _titleSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.0, 0.5, curve: Curves.easeOutSine),
          ),
        );

    // 4. Form Fields Animation (Delayed start)
    _formFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.3, 0.8, curve: Curves.easeOutSine),
      ),
    );
    _formSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.3, 0.8, curve: Curves.easeOutSine),
          ),
        );

    // 5. Footer Animation (Fades in last)
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
    _animationController.dispose(); // Always dispose controllers
    _nameController.dispose();
    _employeeIdController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _signUp() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final termsAccepted = ref.read(termsAcceptedProvider);
    if (!termsAccepted) {
      ToastService.showWarning(
        context,
        'Please accept the Terms of Service to continue.',
      );
      return;
    }

    ref
        .read(authViewModelProvider.notifier)
        .signUp(
          email: _emailController.text.trim(),
          password: _passwordController.text.trim(),
          name: _nameController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authViewModelProvider);
    final termsAccepted = ref.watch(termsAcceptedProvider);

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
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: context.screenWidth * 0.035,
                vertical: context.screenHeight * 0.035,
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // TITLE SECTION (Animated)
                    FadeTransition(
                      opacity: _titleFade,
                      child: SlideTransition(
                        position: _titleSlide,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Create Account',
                              style: theme.textTheme.headlineMedium?.copyWith(
                                color: theme.colorScheme.onSurface,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Join our healthcare team',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(
                                  alpha: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // FORM SECTION (Animated)
                    FadeTransition(
                      opacity: _formFade,
                      child: SlideTransition(
                        position: _formSlide,
                        child: Column(
                          children: [
                            CustomTextField(
                              controller: _nameController,
                              hintText: 'Full Name',
                              prefixIcon: const Icon(LucideIcons.user),
                              validator: ValidateFields.validateName,
                            ),
                            const SizedBox(height: 20),

                            CustomTextField(
                              controller: _employeeIdController,
                              hintText: 'Employee ID (Optional)',
                              prefixIcon: const Icon(LucideIcons.contact),
                            ),
                            const SizedBox(height: 20),

                            // Email
                            CustomTextField(
                              controller: _emailController,
                              hintText: 'Email Address',
                              prefixIcon: const Icon(LucideIcons.mail),
                              keyboardType: TextInputType.emailAddress,
                              validator: ValidateFields.validateEmail,
                            ),
                            const SizedBox(height: 20),

                            // Password
                            CustomTextField(
                              controller: _passwordController,
                              obscureText: true,
                              hintText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline),
                              validator: ValidateFields.validatePassword,
                            ),
                            const SizedBox(height: 20),

                            // Confirm Password
                            CustomTextField(
                              controller: _confirmPasswordController,
                              obscureText: true,
                              hintText: 'Confirm Password',
                              prefixIcon: const Icon(Icons.lock_outline),
                              validator: (value) =>
                                  ValidateFields.validateConfirmPassword(
                                    value,
                                    _passwordController.text,
                                  ),
                            ),
                            const SizedBox(height: 10),

                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Checkbox(
                                  value: termsAccepted,
                                  activeColor: theme.colorScheme.primary,
                                  onChanged: (value) {
                                    ref
                                            .read(
                                              termsAcceptedProvider.notifier,
                                            )
                                            .updateState =
                                        value ?? false;
                                  },
                                ),
                                Expanded(
                                  child: Text(
                                    'I agree to the Terms of Service and Privacy Policy',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: theme.colorScheme.onSurface
                                          .withValues(alpha: 0.7),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),

                            // Full-Width Custom Button
                            SizedBox(
                              width: context.screenWidth * 0.6,
                              child: CustomButton(
                                text: 'Create Account',
                                isLoading: authState.isLoading,
                                onPressed: _signUp,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // FOOTER SECTION (Animated)
                    FadeTransition(
                      opacity: _footerFade,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "Already have an account? ",
                            style: TextStyle(
                              color: theme.colorScheme.onSurface.withValues(
                                alpha: 0.7,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.go(AuthRoutes.login),
                            style: TextButton.styleFrom(
                              foregroundColor: theme.colorScheme.primary,
                            ),
                            child: const Text(
                              'Sign In',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
