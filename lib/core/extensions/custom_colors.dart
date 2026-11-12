import 'package:flutter/material.dart';

class DashboardColors extends ThemeExtension<DashboardColors> {
  final Color onboardingIcon;
  final Color successIcon;
  final Color brandIcon;
  final Color textMuted;

  const DashboardColors({
    required this.onboardingIcon,
    required this.successIcon,
    required this.brandIcon,
    required this.textMuted,
  });

  @override
  DashboardColors copyWith({
    Color? onboardingIcon,
    Color? successIcon,
    Color? brandIcon,
    Color? textMuted,
  }) {
    return DashboardColors(
      onboardingIcon: onboardingIcon ?? this.onboardingIcon,
      successIcon: successIcon ?? this.successIcon,
      brandIcon: brandIcon ?? this.brandIcon,
      textMuted: textMuted ?? this.textMuted,
    );
  }

  @override
  DashboardColors lerp(ThemeExtension<DashboardColors>? other, double t) {
    if (other is! DashboardColors) {
      return this;
    }
    return DashboardColors(
      onboardingIcon: Color.lerp(onboardingIcon, other.onboardingIcon, t)!,
      successIcon: Color.lerp(successIcon, other.successIcon, t)!,
      brandIcon: Color.lerp(brandIcon, other.brandIcon, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
    );
  }
}
