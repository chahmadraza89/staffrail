import 'package:bhmh/features/admin/admin_clearance/presentation/provider/admin_clearance_provider.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/admin_clearance_view.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:flutter/material.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

// ============================================================================
// --- DATA MODELS ---
// ============================================================================

class ClearanceSubject {
  final String name;
  final String roleOrId;
  final String clearanceType;
  final String submittedDate;
  final String status;
  final String department;
  final String initials;

  const ClearanceSubject({
    required this.name,
    required this.roleOrId,
    required this.clearanceType,
    required this.submittedDate,
    required this.status,
    required this.department,
    required this.initials,
  });
}

class ClearanceHistoryEvent {
  final String title;
  final String timestamp;
  final String author;
  final Color dotColor;
  final bool isLast;

  const ClearanceHistoryEvent({
    required this.title,
    required this.timestamp,
    required this.author,
    required this.dotColor,
    this.isLast = false,
  });
}

class ClearanceDocument {
  final String fileName;
  final String fileSize;
  final int pages;
  final String? url;

  const ClearanceDocument({
    required this.fileName,
    required this.fileSize,
    required this.pages,
    this.url,
  });
}

// ============================================================================
// --- SMART DATA WRAPPER (RIVERPOD CONSUMER) ---
// ============================================================================

class AdminClearanceViewData extends ConsumerWidget {
  final String employeeId;
  final String clearanceId;

  const AdminClearanceViewData({
    super.key,
    required this.employeeId,
    required this.clearanceId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(adminClearanceTasksProvider);
    final userAsync = ref.watch(userDataProvider(employeeId));

    return tasksAsync.when(
      data: (tasks) {
        final task = tasks.firstWhere(
          (t) => t.id == clearanceId && t.employeeId == employeeId,
          orElse: () => const ClearanceEntity(
            id: '',
            title: '',
            description: '',
            status: ClearanceStatus.pending,
          ),
        );

        if (task.id.isEmpty) {
          return const Center(child: Text("Clearance record not found."));
        }

        final user = userAsync.value;

        final subject = ClearanceSubject(
          name: user?.name ?? task.employeeName ?? 'Unknown Employee',
          roleOrId: user?.department != null
              ? '${user!.department} Department'
              : 'Staff Member',
          clearanceType: task.title,
          submittedDate: task.submittedAt != null
              ? DateFormat('MMM dd, yyyy at hh:mm a').format(task.submittedAt!)
              : 'N/A',
          status: task.statusText,
          department: user?.department ?? 'Clinical Staff',
          initials: _getInitials(user?.name ?? task.employeeName ?? '??'),
        );

        final historyEvents = _buildHistory(task);

        final document = ClearanceDocument(
          fileName: '${task.title.replaceAll(' ', '_')}.pdf',
          fileSize: 'Verified PDF',
          pages: 1,
          url: task.fileUrl,
        );

        return AdminClearanceView(
          employeeId: employeeId,
          clearanceId: clearanceId,
          subject: subject,
          historyEvents: historyEvents,
          document: document,
          status: task.status,
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) =>
          Center(child: Text("Error loading clearance details: $err")),
    );
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '??';
  }

  List<ClearanceHistoryEvent> _buildHistory(ClearanceEntity task) {
    final List<ClearanceHistoryEvent> events = [];

    if (task.submittedAt != null) {
      events.add(
        ClearanceHistoryEvent(
          title: 'Document Uploaded',
          timestamp: DateFormat('MMM dd, hh:mm a').format(task.submittedAt!),
          author: 'Employee',
          dotColor: const Color(0xFF10B981),
        ),
      );
    }

    if (task.verifiedAt != null) {
      events.add(
        ClearanceHistoryEvent(
          title: 'Clearance Verified',
          timestamp: DateFormat('MMM dd, hh:mm a').format(task.verifiedAt!),
          author: 'Admin',
          dotColor: const Color(0xFF3B82F6),
          isLast: true,
        ),
      );
    } else if (task.status == ClearanceStatus.actionRequired) {
      events.add(
        ClearanceHistoryEvent(
          title: 'Clearance Rejected',
          timestamp: task.updatedAt != null
              ? DateFormat('MMM dd, hh:mm a').format(task.updatedAt!)
              : 'Recently',
          author: 'Admin',
          dotColor: const Color(0xFFEF4444),
          isLast: true,
        ),
      );
    } else if (task.status == ClearanceStatus.underReview) {
      events.add(
        const ClearanceHistoryEvent(
          title: 'Pending Review',
          timestamp: 'Awaiting signature',
          author: 'Admin',
          dotColor: Color(0xFFF59E0B),
          isLast: true,
        ),
      );
    }

    return events;
  }
}
