import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/core/services/compliance_service.dart';
import 'package:bhmh/features/employee/home/presentation/provider/notification_provider.dart';

final complianceServiceProvider = Provider<ComplianceService>((ref) {
  final notificationService = ref.watch(notificationServiceProvider);
  return ComplianceService(
    firestore: FirebaseFirestore.instance,
    notificationService: notificationService,
  );
});
