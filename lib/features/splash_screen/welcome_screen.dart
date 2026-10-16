import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/core/shared/app_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class WelComeScreen extends ConsumerStatefulWidget {
  const WelComeScreen({super.key});

  @override
  ConsumerState<WelComeScreen> createState() => _WelComeScreenState();
}

class _WelComeScreenState extends ConsumerState<WelComeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  // Distinct animations for the logo and text
  late Animation<double> _logoFade;
  late Animation<double> _logoScale;

  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;

  @override
  void initState() {
    super.initState();

    // 1. Calming, deep breath rhythm
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    // 2. Logo Animation (Soft focus entry)
    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.4, curve: Curves.easeInSine),
      ),
    );
    _logoScale = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutSine),
      ),
    );

    // 3. Text Animation (Gentle drift)
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.3, 0.7, curve: Curves.easeInSine),
      ),
    );
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _animationController,
            curve: const Interval(0.3, 0.8, curve: Curves.easeOutSine),
          ),
        );

    // 4. Zero-UI Auto Navigation
    // Once the animation finishes, hold for a moment of calm, then move on.
    _animationController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            context.goNamed(AppRouteNames.onboarding);
          }
        });
      }
    });

    // 5. Start Animation
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 32.0,
              ),
              child: Center(
                // Changed to Center to perfectly balance the layout without the button
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Animated Logo (Fades and Softly Scales)
                    FadeTransition(
                      opacity: _logoFade,
                      child: ScaleTransition(
                        scale: _logoScale,
                        child: Image.asset(inAppLogo, fit: BoxFit.contain, width: 250, height: 250, ),   // here 
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Animated Text Group (Fades and Drifts up subtly)
                    FadeTransition(
                      opacity: _textFade,
                      child: SlideTransition(
                        position: _textSlide,
                        child: Column(
                          children: [
                            Text(
                              'Staff Management',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.headlineSmall?.copyWith(
                                color: theme.colorScheme.onSurface,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Empowering Care Together',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.7,
                                ),
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1.0,
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
