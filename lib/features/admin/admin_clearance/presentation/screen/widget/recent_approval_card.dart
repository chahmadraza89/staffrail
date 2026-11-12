import 'package:bhmh/features/admin/admin_clearance/data/model/admin_clearance_model.dart';
import 'package:flutter/material.dart';

class RecentApprovalsCard extends StatelessWidget {
  final List<RecentApproval> approvals;
  final int additionalCount;

  const RecentApprovalsCard({
    super.key,
    required this.approvals,
    required this.additionalCount,
  });

  @override
  Widget build(BuildContext context) {
    final bool hasApprovals = approvals.isNotEmpty || additionalCount > 0;

    return Container(
      width: double.infinity,
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
          const Text(
            'Recent Approvals',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 16),
          if (hasApprovals) ...[
            Row(
              children: [
                SizedBox(
                  width: 32.0 * approvals.length + 38.0,
                  height: 40,
                  child: Stack(
                    children: [
                      ...approvals.asMap().entries.map((entry) {
                        return Positioned(
                          left: entry.key * 24.0,
                          child: _OverlapAvatar(
                            color: entry.value.color,
                            text: entry.value.initials,
                          ),
                        );
                      }),
                      if (additionalCount > 0)
                        Positioned(
                          left: approvals.length * 24.0,
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 3),
                            ),
                            child: Center(
                              child: Text(
                                '+$additionalCount',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Approved recently',
              style: TextStyle(
                fontSize: 12,
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.w500,
              ),
            ),
          ] else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'No recent approvals to show.',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w500,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _OverlapAvatar extends StatelessWidget {
  final Color color;
  final String text;

  const _OverlapAvatar({required this.color, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Color(0xFF334155),
          ),
        ),
      ),
    );
  }
}
