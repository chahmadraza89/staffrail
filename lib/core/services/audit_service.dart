import 'dart:developer';

import 'package:bhmh/core/data/local_data_store.dart';

class AuditService {
  final LocalDataStore _store;

  AuditService({LocalDataStore? firestore})
      : _store = firestore ?? LocalDataStore.instance;

  Future<void> logAction({
    required String actorId,
    required String actorName,
    required String actionType,
    required String targetId,
    required String description,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _store.collection('audit_logs').add({
        'actorId': actorId,
        'actorName': actorName,
        'actionType': actionType,
        'targetId': targetId,
        'description': description,
        'metadata': metadata ?? {},
        'timestamp': LocalFieldValue.serverTimestamp(),
      });
      log('✅ [AUDIT] Action logged: $actionType on $targetId');
    } catch (e, stack) {
      log('❌ [AUDIT] Error logging action: $e', stackTrace: stack);
    }
  }
}
