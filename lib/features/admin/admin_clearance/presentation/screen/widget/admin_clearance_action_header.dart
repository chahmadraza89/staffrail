import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_clearance/data/model/admin_clearance_model.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/admin_clearance_view_tile.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/widget/admin_clearance_cards.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/widget/recent_approval_card.dart';
import 'package:flutter/material.dart';

// ============================================================================
// 1. MAIN WRAPPER (Responsive Layout Manager)
// ============================================================================

class AdminClearanceActionHeader extends StatelessWidget {
  // The UI now explicitly asks for its data without relying on defaults
  final List<AdminClearanceActionItem> actionItems;
  final List<AdminClearanceStat> overviewStats;
  final SystemAlert? alert;
  final List<RecentApproval> recentApprovals;
  final int additionalApprovals;

  const AdminClearanceActionHeader({
    super.key,
    required this.actionItems,
    required this.overviewStats,
    this.alert, // Nullable, doesn't need 'required' if null is acceptable
    required this.recentApprovals,
    required this.additionalApprovals,
  });

  @override
  Widget build(BuildContext context) {
    // 🌐 RULE #1: Custom Responsive Check
    final bool isMobile = context.screenWidth < 600;

    if (isMobile) {
      // 📱 MOBILE LAYOUT: Smart Vertical Stack
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (alert != null) ...[
            _SystemAlertCard(alert: alert!),
            const SizedBox(height: 24),
          ],
          ClearanceOverviewCard(stats: overviewStats),
          const SizedBox(height: 24),
          ActionRequiredCard(items: actionItems),
          const SizedBox(height: 24),
          RecentApprovalsCard(
            approvals: recentApprovals,
            additionalCount: additionalApprovals,
          ),
        ],
      );
    }

    // 💻 WEB/TABLET LAYOUT: 60/40 Split
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left Column
        Expanded(
          flex: 6,
          child: Column(
            children: [
              ActionRequiredCard(items: actionItems),
              if (alert != null) ...[
                const SizedBox(height: 24),
                _SystemAlertCard(alert: alert!),
              ],
            ],
          ),
        ),
        const SizedBox(width: 24),
        // Right Column
        Expanded(
          flex: 4,
          child: Column(
            children: [
              ClearanceOverviewCard(stats: overviewStats),
              const SizedBox(height: 24),
              RecentApprovalsCard(
                approvals: recentApprovals,
                additionalCount: additionalApprovals,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// 4. SUPPLEMENTARY CARDS (Alerts & Approvals)
// ============================================================================

class _SystemAlertCard extends StatelessWidget {
  final SystemAlert alert;
  const _SystemAlertCard({required this.alert});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2), // Soft Red Background
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFEE2E2), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.info_outline_rounded,
                color: Color(0xFFEF4444),
                size: 20,
              ),
              const SizedBox(width: 10),
              Text(
                alert.title,
                style: const TextStyle(
                  color: Color(0xFF991B1B),
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            alert.description,
            style: const TextStyle(
              color: Color(0xFFB91C1C),
              fontSize: 13,
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
