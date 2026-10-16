import 'package:flutter/material.dart';
import 'package:bhmh/core/utils/colors.dart';

class AdminClearanceActionItem {
  final String id;
  final String title;
  final String subtitle;
  final String timeAgo;
  final IconData icon;
  final Color iconColor;
  final String employeeId;

  const AdminClearanceActionItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.timeAgo,
    required this.icon,
    this.iconColor = AppColors.primaryColor,
    required this.employeeId,
  });
}

class AdminClearanceStat {
  final String label;
  final int value;
  final int total;
  final Color color;

  const AdminClearanceStat({
    required this.label,
    required this.value,
    required this.total,
    this.color = AppColors.primaryColor,
  });
}

class SystemAlert {
  final String title;
  final String description;

  const SystemAlert({required this.title, required this.description});
}

class RecentApproval {
  final String initials;
  final Color color;

  const RecentApproval({required this.initials, required this.color});
}
