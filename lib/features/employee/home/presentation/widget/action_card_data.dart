import 'package:flutter/material.dart';

/// Data model for action cards on the dashboard.
class ActionCardData {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color baseColor;
  final double? progress;
  final VoidCallback onTap;

  ActionCardData({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.baseColor,
    this.progress,
    required this.onTap,
  });
}
