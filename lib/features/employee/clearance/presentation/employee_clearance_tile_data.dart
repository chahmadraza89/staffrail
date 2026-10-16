import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/widget/clearance_uploading_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Background Clearance list — powered by real-time Firestore stream.
class EmployeeClearanceTileData extends ConsumerWidget {
  const EmployeeClearanceTileData({super.key});

  void _onTap(BuildContext context, ClearanceEntity entity) {
    context.goNamed(
      UserRouteNames.clearanceDetail,
      pathParameters: {'clearanceId': entity.id},
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(clearanceItemsStreamProvider);

    return itemsAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (error, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
              const SizedBox(height: 16),
              Text(
                'Failed to load clearance items',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.red.shade700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(clearanceItemsStreamProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      data: (items) {
        if (items.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.verified_user_outlined,
                  size: 64,
                  color: Color(0xFFCBD5E1),
                ),
                SizedBox(height: 16),
                Text(
                  'No clearance items yet',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          itemCount: items.length,
          itemBuilder: (context, index) {
            final entity = items[index];
            return ClearanceUploadingTile(
              title: entity.title,
              subtitle: entity.statusText,
              status: entity.status, // add this one
              onCardTap: () => _onTap(context, entity),
              onUploadTap: entity.canUpload
                  ? () => _onTap(context, entity)
                  : null,
            );
          },
        );
      },
    );
  }
}
