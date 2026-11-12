import 'package:bhmh/core/router/app_routes_constant.dart';
import 'package:bhmh/features/splash_screen/onboarding/custom_painter_preview.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// --- DATA MODEL ---
class OnboardingStep {
  final IconData icon;
  final String title;
  final String description;
  final int effectType;

  OnboardingStep({
    required this.icon,
    required this.title,
    required this.description,
    required this.effectType,
  });
}

// --- MAIN SCREEN ---
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  late PageController _pageController;
  int _currentPage = 0;

  // Animation for the text and button when the page changes
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  final List<OnboardingStep> _steps = [
    OnboardingStep(
      icon: Icons.check_circle_outline_rounded,
      title: 'Track Your Onboarding',
      description:
          'Monitor your progress through each step of the onboarding process with real-time updates and clear milestones.',
      effectType: 0, // Blob
    ),
    OnboardingStep(
      icon: Icons.school_rounded,
      title: 'Manage Training',
      description:
          'Access required training modules, track completion status, and stay compliant with healthcare regulations.',
      effectType: 1, // Squircle
    ),
    OnboardingStep(
      icon: Icons.verified_user_rounded,
      title: 'Background Clearance',
      description:
          'Track your background check status and required clearances all in one secure, HIPAA-compliant platform.',
      effectType: 2, // Alternate Blob
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _fadeController, curve: Curves.easeOut));

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(
          CurvedAnimation(parent: _fadeController, curve: Curves.easeOutCubic),
        );

    _fadeController.forward();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  void _onNextPressed() {
    if (_currentPage < _steps.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeOutQuart, // Modern, snappy swipe curve
      );
    } else {
      context.goNamed(AuthRouteNames.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      // backgroundColor: backgroundColor,
      body: SafeArea(
        bottom: false, // Allows the white card to touch the absolute bottom
        child: Column(
          children: [
            // --- TOP SECTION: Skip Button & Illustrations ---
            Expanded(
              flex: 5,
              child: Stack(
                children: [
                  // Swipable Illustrations
                  PageView.builder(
                    controller: _pageController,
                    onPageChanged: (index) {
                      setState(() {
                        _currentPage = index;
                      });
                      // Re-trigger the text fade/slide animation
                      _fadeController.forward(from: 0.0);
                    },
                    itemCount: _steps.length,
                    itemBuilder: (context, index) {
                      return Center(
                        child: AnimatedOnboardingIcon(
                          icon: _steps[index].icon,
                          iconColor: theme.colorScheme.primary,
                          backgroundColor: theme.colorScheme.primary.withValues(
                            alpha: 0.15,
                          ),
                          effectType: _steps[index].effectType,
                          isActive:
                              _currentPage ==
                              index, // Triggers the bouncy animation
                        ),
                      );
                    },
                  ),

                  // Skip Button (Moved to bottom of Stack so it intercepts taps)
                  Positioned(
                    top: 16,
                    right: 24,
                    child: TextButton(
                      onPressed: () => context.goNamed(AuthRouteNames.login),
                      child: Text(
                        'Skip',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: theme.colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // --- BOTTOM SECTION: The White Card ---
            Expanded(
              flex: 4,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(32, 32, 32, 48),
                decoration: BoxDecoration(
                  color: theme.scaffoldBackgroundColor, // Usually white
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(40),
                    topRight: Radius.circular(40),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 20,
                      offset: const Offset(0, -5),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // 1. The Custom Pill Indicator
                    CustomPillIndicator(
                      itemCount: _steps.length,
                      currentIndex: _currentPage,
                    ),

                    const SizedBox(height: 24),

                    // 2. Animated Title & Description
                    Expanded(
                      child: FadeTransition(
                        opacity: _fadeAnimation,
                        child: SlideTransition(
                          position: _slideAnimation,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _steps[_currentPage].title,
                                textAlign: TextAlign.center,
                                style: theme.textTheme.headlineSmall?.copyWith(
                                  color: theme.colorScheme.onSurface,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _steps[_currentPage].description,
                                textAlign: TextAlign.center,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.colorScheme.onSurface.withValues(
                                    alpha: 0.6,
                                  ),
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // 3. Full Width Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                          elevation: 0,
                        ),
                        onPressed: _onNextPressed,
                        child: Text(
                          _currentPage == _steps.length - 1
                              ? 'Sign in'
                              : 'Next',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
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
  }
}

// =============================================================================
// --- CUSTOM PILL INDICATOR COMPONENT ---
// =============================================================================

class CustomPillIndicator extends StatelessWidget {
  final int itemCount;
  final int currentIndex;

  const CustomPillIndicator({
    super.key,
    required this.itemCount,
    required this.currentIndex,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(itemCount, (index) {
        final isActive = index == currentIndex;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOutBack, // Gives the expanding pill a nice "pop"
          margin: const EdgeInsets.symmetric(horizontal: 4),
          height: 10,
          // Expand width if active to fit the inner dots
          width: isActive ? 28 : 10,
          decoration: BoxDecoration(
            color: isActive
                ? theme.colorScheme.primary
                : theme.colorScheme.onSurface.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: isActive
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    CircleAvatar(
                      radius: 2.5,
                      backgroundColor: theme.scaffoldBackgroundColor,
                    ),
                    CircleAvatar(
                      radius: 2.5,
                      backgroundColor: theme.scaffoldBackgroundColor,
                    ),
                  ],
                )
              : null,
        );
      }),
    );
  }
}
