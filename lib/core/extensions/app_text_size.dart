import 'package:flutter/material.dart';

extension TypographyExtension on BuildContext {
  // Use a private helper to reduce boilerplate and add a null-safety fallback
  TextTheme get _tt => Theme.of(this).textTheme;
  ColorScheme get _cs => Theme.of(this).colorScheme;

  TextStyle get titleLarge => (_tt.titleLarge ?? const TextStyle()).copyWith(
    fontWeight: FontWeight.bold,
    color: _cs.primary,
  );

  TextStyle get titleMedium => (_tt.titleMedium ?? const TextStyle()).copyWith(
    fontSize: 16,
    fontWeight: FontWeight.bold,
    color: _cs.primary,
  );

  TextStyle get titleMediumRegular => (_tt.titleMedium ?? const TextStyle())
      .copyWith(fontSize: 14, fontWeight: FontWeight.w500, color: _cs.primary);

  TextStyle get titleSmall => (_tt.titleSmall ?? const TextStyle()).copyWith(
    fontWeight: FontWeight.w500,
    color: _cs.primary,
  );
}
