import 'dart:developer';

import 'package:bhmh/core/config/onboarding_constants.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/clearance/data/data_source/clearance_service.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_view_model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final clearanceServiceProvider = Provider<ClearanceService>((ref) {
  final store = ref.watch(localDataStoreProvider);
  return ClearanceService(firestore: store);
});

final clearanceItemsStreamProvider =
    StreamProvider.autoDispose<List<ClearanceEntity>>((ref) {
      final userAsync = ref.watch(currentUserProvider);

      return userAsync.when(
        data: (user) {
          if (user == null) return Stream.value([]);
          log(
            '🔄 [PROVIDER] Switching clearance stream for: ${user.uid}',
          );
          final service = ref.watch(clearanceServiceProvider);
          return service.streamClearanceItems(user.uid).asyncMap((items) async {
            if (items.isEmpty) {
              log('⚠️ [PROVIDER] Clearance items are empty for ${user.uid}. Seeding default clearances...');
              final defaultClearances = OnboardingConstants.getDefaultClearances(
                employeeId: user.uid,
                employeeName: user.name,
                adminId: user.adminId,
              );
              try {
                await service.seedClearanceItems(
                  uid: user.uid,
                  items: defaultClearances,
                );
                return defaultClearances;
              } catch (e) {
                log('❌ [PROVIDER] Error seeding clearance items: $e');
                return items;
              }
            }
            final sortedItems = List<ClearanceEntity>.from(items)
              ..sort((a, b) {
                final dateA = a.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
                final dateB = b.updatedAt ?? DateTime.fromMillisecondsSinceEpoch(0);
                return dateA.compareTo(dateB);
              });
            return sortedItems;
          });
        },
        loading: () => const Stream.empty(),
        error: (e, stack) => Stream.error(e, stack),
      );
    });

final clearanceCompletionProvider =
    Provider.autoDispose<({int total, int completed})>((ref) {
      final itemsAsync = ref.watch(clearanceItemsStreamProvider);

      return itemsAsync.when(
        data: (items) {
          final completed = items.where((i) => i.isCompleted).length;
          return (total: items.length, completed: completed);
        },
        loading: () => (total: 0, completed: 0),
        error: (_, _) => (total: 0, completed: 0),
      );
    });

final clearanceItemProvider =
    Provider.autoDispose.family<AsyncValue<ClearanceEntity?>, String>((ref, id) {
      final itemsAsync = ref.watch(clearanceItemsStreamProvider);

      return itemsAsync.when(
        data: (items) {
          final item = items.where((element) => element.id == id).firstOrNull;
          
          if (item != null) {
            log('🔍 [CLEARANCE-PROVIDER] Found live item for "$id"');
            return AsyncValue.data(item);
          }

          // Smart Fallback: Check defaults if not in Firestore yet
          log('💡 [CLEARANCE-PROVIDER] Item "$id" not in Firestore. Using smart fallback...');
          final defaults = OnboardingConstants.getDefaultClearances();
          final defaultItem = defaults.where((element) => element.id == id).firstOrNull;
          
          if (defaultItem != null) {
            log('✅ [CLEARANCE-PROVIDER] Smart fallback successful for "$id"');
          } else {
            log('⚠️ [CLEARANCE-PROVIDER] Item "$id" not found in live data OR defaults.');
          }
          
          return AsyncValue.data(defaultItem);
        },
        loading: () => const AsyncValue.loading(),
        error: (err, stack) => AsyncValue.error(err, stack),
      );
    });

final clearanceViewModelProvider =
    NotifierProvider<ClearanceViewModel, AsyncValue<void>>(
      ClearanceViewModel.new,
    );
