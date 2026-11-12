import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:bhmh/core/widgets/validation.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ForgotPasswordScreenMob extends ConsumerStatefulWidget {
  const ForgotPasswordScreenMob({super.key});

  @override
  ConsumerState<ForgotPasswordScreenMob> createState() =>
      _ForgotPasswordScreenMobState();
}

class _ForgotPasswordScreenMobState
    extends ConsumerState<ForgotPasswordScreenMob>
    with SingleTickerProviderStateMixin {
  // 1. Added Animation Mixin
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  // Animation Variables
  late AnimationController _animationController;
  late Animation<double> _backButtonFade;
  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;
  late Animation<double> _formFade;
  late Animation<Offset> _formSlide;

  @override
  void initState() {
    super.initState();

    // 2. Slightly faster duration for a simpler screen
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    // 3. Back Button gently fades in first
    _backButtonFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.4, curve: Curves.easeOutSine),
      ),
    );

    // 4. Title and Description drift up
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
      ),
    );
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
          ),
        );

    // 5. Input Field and Button drift up
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
    super.dispose();
  }

  void _resetPassword() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final email = _emailController.text.trim();

    ref.read(authViewModelProvider.notifier).resetPassword(email: email);

    ToastService.showSuccess(context, 'Password reset link sent to your email');
    context.go(AuthRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authViewModelProvider);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(32.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),

                    // Animated Premium Back Button
                    FadeTransition(
                      opacity: _backButtonFade,
                      child: Container(
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surface,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            size: 20,
                          ),
                          color: theme.colorScheme.onSurface,
                          onPressed: () => context.go(AuthRoutes.login),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Animated Title & Description
                    FadeTransition(
                      opacity: _textFade,
                      child: SlideTransition(
                        position: _textSlide,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Reset Password',
                              style: theme.textTheme.headlineMedium?.copyWith(
                                color: theme.colorScheme.onSurface,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Enter the email associated with your account and we\'ll send you a link to reset your password.',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Animated Form Field & Button
                    FadeTransition(
                      opacity: _formFade,
                      child: SlideTransition(
                        position: _formSlide,
                        child: Column(
                          children: [
                            // Email Field
                            CustomTextField(
                              controller: _emailController,
                              hintText: 'Email Address',
                              prefixIcon: const Icon(Icons.email_outlined),
                              keyboardType: TextInputType.emailAddress,
                              validator: ValidateFields.validateEmail,
                            ),
                            const SizedBox(height: 32),

                            // Submit Button (Full Width)
                            SizedBox(
                              width: double.infinity,
                              child: CustomButton(
                                text: 'Send Reset Link',
                                isLoading: authState.isLoading,
                                onPressed: _resetPassword,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
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
