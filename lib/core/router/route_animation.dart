import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Smooth page transition helper
/// Smooth 2026 "Soft Depth Fade" page transition helper
CustomTransitionPage<void> buildSmoothPage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    // Slightly longer duration for a calming effect
    transitionDuration: const Duration(milliseconds: 400),
    reverseTransitionDuration: const Duration(milliseconds: 300),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      // 2026 Trend: easeInOutCubic for organic, non-robotic motion
      final curve = CurvedAnimation(
        parent: animation,
        curve: Curves.easeInOutCubic,
      );

      return FadeTransition(
        opacity: curve,
        child: ScaleTransition(
          // Soft micro-scale: 98% to 100%
          scale: Tween<double>(begin: 0.98, end: 1.0).animate(curve),
          child: child,
        ),
      );
    },
  );
}
