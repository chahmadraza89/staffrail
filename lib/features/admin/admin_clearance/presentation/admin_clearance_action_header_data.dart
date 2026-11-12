import 'package:bhmh/features/admin/admin_clearance/presentation/screen/widget/admin_clearance_action_header.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/provider/admin_clearance_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ============================================================================
// --- SMART DATA WRAPPER (RIVERPOD CONSUMER) ---
// ============================================================================

class AdminClearanceData extends ConsumerWidget {
  const AdminClearanceData({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 🟦 Riverpod 3.0 Reactive Binding
    final actionItems = ref.watch(adminClearanceActionItemsProvider);
    final overviewStats = ref.watch(adminClearanceStatsProvider);
    final recentApprovalsData = ref.watch(
      adminClearanceRecentApprovalsProvider,
    );
    final tasksAsync = ref.watch(adminClearanceTasksProvider);

    return tasksAsync.when(
      data: (tasks) {
        final recentApprovals = recentApprovalsData.$1;
        final additionalApprovals = recentApprovalsData.$2;

        return AdminClearanceActionHeader(
          actionItems: actionItems,
          overviewStats: overviewStats,
          alert: null, // Dynamic system alerts could be wired here
          recentApprovals: recentApprovals,
          additionalApprovals: additionalApprovals,
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 48),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (err, stack) {
        debugPrint('❌ [ADMIN-UI ERROR] $err');

        if (err.toString().contains('requires an index')) {
          debugPrint(
            '🔗 CLICK THIS LINK TO FIX: ${err.toString().split('here: ').last}',
          );
        }

        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  color: Colors.red,
                  size: 48,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Firestore Index Required',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(
                  'A composite index is missing for this collectionGroup query. Check your debug console for the link.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade600),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => ref.invalidate(adminClearanceTasksProvider),
                  child: const Text('Retry After Creating Index'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
