// ============================================================================
// 3. OVERVIEW SECTION (Progress Bars)
// ============================================================================

import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/features/admin/admin_clearance/data/model/admin_clearance_model.dart';
import 'package:flutter/material.dart';

class ClearanceOverviewCard extends StatelessWidget {
  final List<AdminClearanceStat> stats;
  const ClearanceOverviewCard({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Clearance Overview',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.primaryColor.withValues(alpha: 0.5),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 24),
          ...stats.map(
            (stat) => Padding(
              padding: const EdgeInsets.only(bottom: 20.0),
              child: _AnimatedOverviewBar(stat: stat),
            ),
          ),
        ],
      ),
    );
  }
}

class _AnimatedOverviewBar extends StatelessWidget {
  final AdminClearanceStat stat;
  const _AnimatedOverviewBar({required this.stat});

  @override
  Widget build(BuildContext context) {
    final double targetFill = stat.total == 0 ? 0 : stat.value / stat.total;

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: targetFill),
      duration: const Duration(milliseconds: 1200),
      curve: Curves.easeOutExpo,
      builder: (context, animatedValue, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  stat.label,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryColor.withValues(alpha: 0.5),
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${(animatedValue * stat.total).toInt()}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primaryColor,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              height: 6,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: animatedValue,
                child: Container(
                  decoration: BoxDecoration(
                    color: stat.color,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
