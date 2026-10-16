// ignore_for_file: deprecated_member_use

import 'dart:async';
import 'dart:developer';

import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class VerifyMobileEmail extends ConsumerStatefulWidget {
  const VerifyMobileEmail({super.key});

  @override
  ConsumerState<VerifyMobileEmail> createState() => _VerifyMobileEmailState();
}

class _VerifyMobileEmailState extends ConsumerState<VerifyMobileEmail>
    with SingleTickerProviderStateMixin {
  // 1. Added Animation Mixin
  // Cooldown timer state
  int _cooldownSeconds = 0;
  Timer? _cooldownTimer;
  Timer? _verificationTimer;

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
    _startVerificationPolling();

    // 2. Initialize Animations (Matching ForgotPasswordMob speed)
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _backButtonFade = Tween<double>(begin: 0.0, end: 1.0).animate(
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
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
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
        log(
          "[VerifyMobileEmail] Polling: Email verified. Signing out - GoRouter will redirect.",
        );
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
    log("[VerifyMobileEmail] 'I Have Verified' button pressed.");
    final user = FirebaseAuth.instance.currentUser;
    await user?.reload();
    final isVerified = user?.emailVerified ?? false;
    log("[VerifyMobileEmail] User: ${user?.email}, Verified: $isVerified");

    if (isVerified) {
      log(
        "[VerifyMobileEmail] User is verified. Signing out - GoRouter will redirect.",
      );
      if (mounted) {
        await ref.read(authViewModelProvider.notifier).signOut();
      }
    } else {
      log("[VerifyMobileEmail] User NOT verified. Showing snackbar.");
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
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment
                    .start, // Left-aligned like ForgotPassword
                children: [
                  const SizedBox(height: 8),

                  // 1. Premium Back Button (Animated)
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
                        onPressed: () async {
                          // Keep your original back button sign-out logic
                          await ref
                              .read(authViewModelProvider.notifier)
                              .signOut();
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // 2. Title & Description (Animated)
                  FadeTransition(
                    opacity: _textFade,
                    child: SlideTransition(
                      position: _textSlide,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Small left-aligned icon for context
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withValues(
                                alpha: 0.1,
                              ),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              LucideIcons.mailCheck,
                              size: 28,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 24),

                          Text(
                            'Check Your Inbox',
                            style: theme.textTheme.headlineMedium?.copyWith(
                              color: theme.colorScheme.onSurface,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 12),

                          RichText(
                            text: TextSpan(
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(
                                  alpha: 0.6,
                                ),
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
                                      '.\nClick the link inside to verify your account.',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // 3. Actions & Button (Animated)
                  FadeTransition(
                    opacity: _formFade,
                    child: SlideTransition(
                      position: _formSlide,
                      child: Column(
                        children: [
                          // Full-Width Verification Button
                          SizedBox(
                            width: double.infinity,
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
                                  foregroundColor: theme.colorScheme.primary,
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
                                    fontWeight: FontWeight.bold,
                                    color: _cooldownSeconds > 0
                                        ? Colors.grey
                                        : theme.colorScheme.primary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
