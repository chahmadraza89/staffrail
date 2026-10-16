import 'package:flutter/material.dart';
import 'package:bhmh/features/admin/admin_clearance/data/model/admin_clearance_model.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';

class AdminClearanceDomain {
  static List<AdminClearanceActionItem> mapToActions(List<ClearanceEntity> tasks) {
    return tasks
        .where((t) => t.status == ClearanceStatus.underReview)
        .map((t) => AdminClearanceActionItem(
              id: t.id,
              employeeId: t.employeeId ?? '',
              title: t.title,
              subtitle: 'Submitted by ${t.employeeName ?? 'Unknown'}',
              timeAgo: t.updatedAt != null 
                  ? _formatTimeAgo(t.updatedAt!) 
                  : 'Recently',
              icon: Icons.verified_user_rounded,
            ))
        .toList();
  }

  static List<AdminClearanceStat> computeStats(List<ClearanceEntity> tasks) {
    int pendingReview = 0;
    int verified = 0;
    int actionRequired = 0;

    for (var task in tasks) {
      if (task.status == ClearanceStatus.underReview) pendingReview++;
      if (task.status == ClearanceStatus.verified) verified++;
      if (task.status == ClearanceStatus.actionRequired ||
          task.status == ClearanceStatus.expired) {
        actionRequired++;
      }
    }

    final total = tasks.isEmpty ? 1 : tasks.length;

    return [
      AdminClearanceStat(
        label: 'Pending Review',
        value: pendingReview,
        total: total,
        color: const Color(0xFFF59E0B),
      ),
      AdminClearanceStat(
        label: 'Verified',
        value: verified,
        total: total,
        color: const Color(0xFF10B981),
      ),
      AdminClearanceStat(
        label: 'Action Required',
        value: actionRequired,
        total: total,
        color: const Color(0xFFEF4444),
      ),
    ];
  }

  /// Extracts unique employees who recently had clearances verified.
  static (List<RecentApproval>, int) mapToRecentApprovals(List<ClearanceEntity> tasks) {
    // 1. Filter only verified tasks and sort by verifiedAt
    final verifiedTasks = tasks
        .where((t) => t.status == ClearanceStatus.verified && t.verifiedAt != null)
        .toList();
    
    verifiedTasks.sort((a, b) => b.verifiedAt!.compareTo(a.verifiedAt!));

    // 2. Group by employeeId to show unique employee avatars
    final Map<String, String> uniqueEmployees = {};
    for (var t in verifiedTasks) {
      if (t.employeeId != null && !uniqueEmployees.containsKey(t.employeeId)) {
        uniqueEmployees[t.employeeId!] = t.employeeName ?? '??';
      }
    }

    final employeeNames = uniqueEmployees.values.toList();
    
    // 3. Map to RecentApproval models (Top 3)
    final List<RecentApproval> approvals = [];
    final int limit = employeeNames.length > 3 ? 3 : employeeNames.length;
    
    for (int i = 0; i < limit; i++) {
      approvals.add(RecentApproval(
        initials: _getInitials(employeeNames[i]),
        color: _getAvatarColor(i),
      ));
    }

    final int additionalCount = employeeNames.length > 3 ? employeeNames.length - 3 : 0;

    return (approvals, additionalCount);
  }

  static String _formatTimeAgo(DateTime dateTime) {
    final difference = DateTime.now().difference(dateTime);
    if (difference.inDays > 0) return '${difference.inDays}d ago';
    if (difference.inHours > 0) return '${difference.inHours}h ago';
    if (difference.inMinutes > 0) return '${difference.inMinutes}m ago';
    return 'Just now';
  }

  static String _getInitials(String name) {
    if (name.isEmpty) return '??';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  static Color _getAvatarColor(int index) {
    final colors = [
      const Color(0xFFDBEAFE), // Blue
      const Color(0xFFDCFCE7), // Green
      const Color(0xFFF3E8FF), // Purple
      const Color(0xFFFEF9C3), // Yellow
      const Color(0xFFFFE4E6), // Rose
    ];
    return colors[index % colors.length];
  }
}
