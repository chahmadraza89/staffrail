import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:bhmh/core/widgets/validation.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ForgotPasswordWeb extends ConsumerStatefulWidget {
  const ForgotPasswordWeb({super.key});

  @override
  ConsumerState<ForgotPasswordWeb> createState() => _ForgotPasswordWebState();
}

class _ForgotPasswordWebState extends ConsumerState<ForgotPasswordWeb>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  // Animation Variables
  late AnimationController _animationController;
  late Animation<double> _iconFade;
  late Animation<Offset> _iconSlide;
  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;
  late Animation<double> _formFade;
  late Animation<Offset> _formSlide;
  late Animation<double> _footerFade;

  @override
  void initState() {
    super.initState();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    // 1. Icon Animation
    _iconFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.4, curve: Curves.easeOutSine),
      ),
    );
    _iconSlide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.0, 0.4, curve: Curves.easeOutSine),
          ),
        );

    // 2. Title & Subtitle Animation
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
      ),
    );
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.2, 0.6, curve: Curves.easeOutSine),
          ),
        );

    // 3. Form Field & Button Animation
    _formFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.4, 0.8, curve: Curves.easeOutSine),
      ),
    );
    _formSlide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.4, 0.8, curve: Curves.easeOutSine),
          ),
        );

    // 4. Back Button Footer Animation
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
    _animationController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _resetPassword() {
    if (!_formKey.currentState!.validate()) return;
    ref
        .read(authViewModelProvider.notifier)
        .resetPassword(email: _emailController.text.trim());
    ToastService.showSuccess(
      context,
      'Password reset email sent! Check your inbox.',
    );
    context.go(AuthRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authViewModelProvider);

    return Scaffold(
      // Standard background color (will be dark in dark mode like your image)
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Center(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              // Constrain the width to perfectly match the proportion of the card in the image
              constraints: const BoxConstraints(maxWidth: 460),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 48.0,
                  vertical: 56.0,
                ),
                decoration: BoxDecoration(
                  // Slightly elevated surface color to stand out from the deep background
                  color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: theme.colorScheme.outlineVariant.withValues(alpha: 0.2),
                  ),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 1. Icon Container
                      FadeTransition(
                        opacity: _iconFade,
                        child: SlideTransition(
                          position: _iconSlide,
                          child: Container(
                            height: 64,
                            width: 64,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons
                                  .vpn_key_rounded, // Better matches the key icon in your design
                              size: 32,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),

                      // 2. Title & Description
                      FadeTransition(
                        opacity: _textFade,
                        child: SlideTransition(
                          position: _textSlide,
                          child: Column(
                            children: [
                              Text(
                                'Reset Password',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                  color: theme.colorScheme.onSurface,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Enter the email associated with your account\nand we\'ll send a reset link.',
                                textAlign: TextAlign.center,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: theme.colorScheme.onSurface
                                      .withValues(alpha: 0.6),
                                  fontSize: 15,
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 48),

                      // 3. Email Field & Label
                      FadeTransition(
                        opacity: _formFade,
                        child: SlideTransition(
                          position: _formSlide,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Email Address',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                  color: theme.colorScheme.onSurface
                                      .withValues(alpha: 0.9),
                                ),
                              ),
                              const SizedBox(height: 8),
                              CustomTextField(
                                controller: _emailController,
                                hintText:
                                    'name@company.com', // Matching your image hint
                                prefixIcon: const Icon(Icons.email_outlined),
                                keyboardType: TextInputType.emailAddress,
                                validator: ValidateFields.validateEmail,
                              ),
                              const SizedBox(height: 32),

                              // 4. Send Link Button
                              SizedBox(
                                width: double.infinity,
                                height: 50,
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
                      const SizedBox(height: 32),

                      // 5. Back to Sign In Link
                      FadeTransition(
                        opacity: _footerFade,
                        child: TextButton.icon(
                          onPressed: () => context.go(AuthRoutes.login),
                          style: TextButton.styleFrom(
                            foregroundColor: theme.colorScheme.onSurface
                                .withValues(alpha: 0.7),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                          ),
                          icon: const Icon(Icons.arrow_back_rounded, size: 18),
                          label: const Text(
                            'Back to Sign In',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
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
    );
  }
}
