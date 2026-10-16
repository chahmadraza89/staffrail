// ignore_for_file: deprecated_member_use

import 'dart:async';

import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class VerifyEmailWeb extends ConsumerStatefulWidget {
  const VerifyEmailWeb({super.key});

  @override
  ConsumerState<VerifyEmailWeb> createState() => _VerifyEmailWebState();
}

class _VerifyEmailWebState extends ConsumerState<VerifyEmailWeb>
    with SingleTickerProviderStateMixin {
  // Added Animation Mixin
  // Cooldown timer state for "Resend"
  int _cooldownSeconds = 0;
  Timer? _cooldownTimer;
  Timer? _verificationTimer;

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
    _startVerificationPolling();

    // Initialize Animations
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

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
    _animationController.dispose(); // Dispose animation controller
    _cooldownTimer?.cancel();
    _verificationTimer?.cancel();
    super.dispose();
  }

  /// Auto-poll for verification status every 3 seconds
  void _startVerificationPolling() {
    _verificationTimer = Timer.periodic(const Duration(seconds: 3), (
      timer,
    ) async {
      final user = FirebaseAuth.instance.currentUser;
      await user?.reload();
      if (user?.emailVerified ?? false) {
        timer.cancel();
        if (mounted) {
          await ref.read(authViewModelProvider.notifier).signOut();
        }
      }
    });
  }

  Future<void> _resendEmail() async {
    final success = await ref
        .read(authViewModelProvider.notifier)
        .resendVerificationEmail();

    if (success) {
      if (mounted) {
        setState(() => _cooldownSeconds = 60);
        _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (_cooldownSeconds > 0) {
            setState(() => _cooldownSeconds--);
          } else {
            timer.cancel();
          }
        });

        ToastService.showSuccess(
          context,
          'Verification email has been resent!',
        );
      }
    } else {
      if (mounted) {
        final state = ref.read(authViewModelProvider);
        state.whenOrNull(
          error: (error, _) {
            final message = FirebaseErrorMapper.getUserFriendlyMessage(error);
            ToastService.showError(context, message);
          },
        );
      }
    }
  }

  Future<void> _onVerifiedPressed() async {
    final user = FirebaseAuth.instance.currentUser;
    await user?.reload();
    if (user?.emailVerified ?? false) {
      if (mounted) {
        await ref.read(authViewModelProvider.notifier).signOut();
      }
    } else {
      if (mounted) {
        ToastService.showWarning(
          context,
          'Your email is not verified yet. Please check your inbox.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final userEmail = FirebaseAuth.instance.currentUser?.email ?? 'your email';
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            // Matches the exact width of the Forgot Password card
            constraints: const BoxConstraints(maxWidth: 460),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 48.0,
                vertical: 56.0,
              ),
              decoration: BoxDecoration(
                // Same modern, elevated surface color
                color: theme.colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.4,
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: theme.colorScheme.outlineVariant.withValues(
                    alpha: 0.2,
                  ),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 1. Icon Section (Animated)
                  FadeTransition(
                    opacity: _iconFade,
                    child: SlideTransition(
                      position: _iconSlide,
                      child: Container(
                        height: 64,
                        width: 64,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withValues(
                            alpha: 0.1,
                          ),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          LucideIcons.mailCheck,
                          size: 32,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // 2. Title & Body Text (Animated)
                  FadeTransition(
                    opacity: _textFade,
                    child: SlideTransition(
                      position: _textSlide,
                      child: Column(
                        children: [
                          Text(
                            'Check Your Inbox',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: theme.colorScheme.onSurface,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 16),
                          RichText(
                            textAlign: TextAlign.center,
                            text: TextSpan(
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(
                                  alpha: 0.6,
                                ),
                                fontSize: 15,
                                height: 1.5,
                              ),
                              children: [
                                const TextSpan(
                                  text: 'We\'ve sent a verification link to\n',
                                ),
                                TextSpan(
                                  text: userEmail,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: theme.colorScheme.onSurface,
                                  ),
                                ),
                                const TextSpan(
                                  text:
                                      '\nClick the link inside to verify your account.',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // 3. Actions (Animated)
                  FadeTransition(
                    opacity: _formFade,
                    child: SlideTransition(
                      position: _formSlide,
                      child: Column(
                        children: [
                          // "I Have Verified" Button (Full width, 50px height matching other screens)
                          SizedBox(
                            width: double.infinity,
                            height: 50,
                            child: CustomButton(
                              onPressed: _onVerifiedPressed,
                              isLoading: false,
                              text: 'I Have Verified My Email',
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Resend Link
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Didn\'t receive the email? ',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: theme.colorScheme.onSurface.withValues(
                                    alpha: 0.7,
                                  ),
                                ),
                              ),
                              TextButton(
                                onPressed: _cooldownSeconds > 0
                                    ? null
                                    : _resendEmail,
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  _cooldownSeconds > 0
                                      ? 'Wait ${_cooldownSeconds}s'
                                      : 'Resend',
                                  style: TextStyle(
                                    color: _cooldownSeconds > 0
                                        ? Colors.grey
                                        : theme.colorScheme.primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // 4. Back to Sign In Link (Animated, placed inside card to match ForgotPassword)
                  FadeTransition(
                    opacity: _footerFade,
                    child: TextButton.icon(
                      onPressed: () async {
                        await ref
                            .read(authViewModelProvider.notifier)
                            .signOut();
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: theme.colorScheme.onSurface.withValues(
                          alpha: 0.7,
                        ),
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
    );
  }
}
