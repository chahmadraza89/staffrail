import 'package:flutter/material.dart';

class AppColors {
  static const Color primaryColor = Color(
    0xFF149C9B,
  ); // The vibrant Bright Horizons teal-green
  static const Color accentColor = Color(
    0xFF6BD0CF,
  ); // A softer, lighter aqua for progress bars
  static const Color backgroundWhite = Color(
    0xFFF4FAFA,
  ); // Airy off-white with a hint of cool teal
  static const Color surfaceWhite = Color(
    0xFFFFFFFF,
  ); // Pure white for crisp cards

  // Neutral Text Colors (Harmonized with the cool teal vibe)
  static const Color textDark = Color(
    0xFF1A3636,
  ); // Deep charcoal/teal for high readability
  static const Color textMuted = Color(
    0xFF6B8A8A,
  ); // Clean slate grey for hints/subtitles
  static const Color errorRed = Color(0xFFD96C6C); // Muted red for errors
    static const Color adminNavColor = Color(
    0xFFFFFFFF,
  );
}

class AppGradients {
  static const LinearGradient primary = LinearGradient(
    colors: [AppColors.primaryColor, AppColors.accentColor],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
