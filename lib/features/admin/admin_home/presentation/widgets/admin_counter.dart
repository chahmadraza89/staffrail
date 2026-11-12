// ignore_for_file: non_constant_identifier_names

import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/extensions/custom_colors.dart';
import 'package:flutter/material.dart';
// import 'package:bhmh/core/theme/dashboard_colors.dart'; // Import your extension

class AdminCounter extends StatelessWidget {
  final int employee_OnBoarding;
  final int completedTasks;
  final int activeEmployee;

  const AdminCounter({
    super.key,
    required this.employee_OnBoarding,
    required this.completedTasks,
    required this.activeEmployee,
  });

  @override
  Widget build(BuildContext context) {
    // 🌐 Unified responsive check
    final bool isMobile = context.screenWidth < 600;

    // 🎨 Grab our custom theme extension with sensible fallbacks
    final dashColors = Theme.of(context).extension<DashboardColors>();
    final onboardingColor =
        dashColors?.onboardingIcon ?? const Color(0xFF3B82F6);
    final successColor = dashColors?.successIcon ?? const Color(0xFF10B981);
    final brandColor = dashColors?.brandIcon ?? const Color(0xFF109B85);

    // 🛡️ DART 3 RECORDS: 100% Type-Safe Data Structure
    final counterData = [
      (
        title: 'Employees Onboarding',
        value: employee_OnBoarding.toString(),
        icon: Icons.person_add_alt_1_rounded,
        color: onboardingColor,
      ),
      (
        title: 'Completed Today',
        value: completedTasks.toString(),
        icon: Icons.check_circle_outline_rounded,
        color: successColor,
      ),
      (
        title: 'Active Employees',
        value: activeEmployee.toString(),
        icon: Icons.groups_rounded,
        color: brandColor,
      ),
    ];

    // 📱 MOBILE LAYOUT: Vertical Stack
    if (isMobile) {
      return Column(
        children: counterData.map((data) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16.0),
            child: _ModernStatCard(
              title: data.title, // ⬅️ Type-safe dot notation!
              value: data.value,
              icon: data.icon,
              color: data.color,
              isMobile: true,
            ),
          );
        }).toList(),
      );
    }

    // 💻 WEB/TABLET LAYOUT: Horizontal Row
    return Row(
      children: counterData.asMap().entries.map((entry) {
        final int index = entry.key;
        final data = entry.value;
        final bool isLast = index == counterData.length - 1;

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: isLast ? 0 : 20.0),
            child: _ModernStatCard(
              title: data.title, // ⬅️ Type-safe dot notation!
              value: data.value,
              icon: data.icon,
              color: data.color,
              isMobile: false,
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ============================================================================
// --- COMPONENT: THE MODERN STAT CARD (THEME AWARE) ---
// ============================================================================

class _ModernStatCard extends StatefulWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final bool isMobile;

  const _ModernStatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.isMobile,
  });

  @override
  State<_ModernStatCard> createState() => _ModernStatCardState();
}

class _ModernStatCardState extends State<_ModernStatCard> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    // 🎨 Native Material 3 Tokens for structural elements
    final colorScheme = Theme.of(context).colorScheme;

    // 🎨 Custom Theme Tokens for specific UI elements
    final dashColors = Theme.of(context).extension<DashboardColors>();
    final textMutedColor = dashColors?.textMuted ?? const Color(0xFF64748B);

    final int targetValue = int.tryParse(widget.value) ?? 0;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        transform: Matrix4.translationValues(
          0,
          _isHovering && !widget.isMobile ? -4 : 0,
          0,
        ),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: colorScheme.surface, // Adapts to light/dark mode automatically
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: colorScheme.outlineVariant.withValues(
              alpha: 0.5,
            ), // Semantic border color
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: textMutedColor, // Semantic text color
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  TweenAnimationBuilder<int>(
                    tween: IntTween(begin: 0, end: targetValue),
                    duration: const Duration(milliseconds: 1200),
                    curve: Curves.easeOutExpo,
                    builder: (context, currentValue, child) {
                      return Text(
                        targetValue == 0 && widget.value != '0'
                            ? widget.value
                            : currentValue.toString(),
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface, // Semantic text color
                          letterSpacing: -1.0,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: widget.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(widget.icon, color: widget.color, size: 26),
            ),
          ],
        ),
      ),
    );
  }
}
