import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/core/services/compliance_service.dart';
import 'package:bhmh/features/employee/home/presentation/provider/notification_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final complianceServiceProvider = Provider<ComplianceService>((ref) {
  final notificationService = ref.watch(notificationServiceProvider);
  return ComplianceService(
    firestore: LocalDataStore.instance,
    notificationService: notificationService,
  );
});
