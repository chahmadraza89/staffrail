import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/mobile/employee_clearance_detail_mob.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/web/employee_clearance_detail_web.dart';
import 'package:flutter/material.dart';

import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EmployeeClearanceDetailPage extends ConsumerWidget {
  final String clearanceId;
  const EmployeeClearanceDetailPage({super.key, required this.clearanceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemAsync = ref.watch(clearanceItemProvider(clearanceId));
    
    return itemAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text('Error loading clearance: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(clearanceItemProvider(clearanceId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      data: (item) {
        if (item == null) {
          return const Scaffold(
            body: Center(child: Text('Clearance item not found.')),
          );
        }
        return ResponsiveLayout(
          mobile: (_) => EmployeeClearanceDetailMob(item: item),
          web: (_) => EmployeeClearanceDetailWeb(item: item),
        );
      },
    );
  }
}
