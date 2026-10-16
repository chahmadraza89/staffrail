import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_quick_action_card_tile.dart';
import 'package:flutter/material.dart';

// ============================================================================
// 1. MAIN WRAPPER (Handles Responsive Reflow and the Grid)
// ============================================================================

class AdminQuickActionView extends StatelessWidget {
  const AdminQuickActionView({super.key});

  @override
  Widget build(BuildContext context) {
    // 🌐 RULE #1: Custom Responsive Check
    final bool isMobile = context.screenWidth < 600;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Smart reflow logic
        int crossAxisCount = 2; // Mobile
        if (constraints.maxWidth >= 600) crossAxisCount = 3; // Tablet
        if (constraints.maxWidth >= 900) crossAxisCount = 4; // Web

        return Container(
          padding: EdgeInsets.all(isMobile ? 16 : 24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.grey.shade200, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: const Color(
                  0xFF64748B,
                ).withValues(alpha: 0.04), // Slate-tinted shadow
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Quick Actions',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 24),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: isMobile ? 1.3 : 1.1,
                children: [
                  QuickActionCard(
                    index: 0, // Passed for the staggered animation delay
                    title: 'Manage Employees',
                    icon: Icons.manage_accounts_rounded,
                    onTap: () {},
                  ),
                  QuickActionCard(
                    index: 1,
                    title: 'Add New Employee',
                    icon: Icons.person_add_rounded,
                    onTap: () {},
                  ),
                  QuickActionCard(
                    index: 2,
                    title: 'View Clinic Reports',
                    icon: Icons.bar_chart_rounded,
                    onTap: () {},
                  ),
                  QuickActionCard(
                    index: 3,
                    title: 'Update System Settings',
                    icon: Icons.settings_applications_rounded,
                    onTap: () {},
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
