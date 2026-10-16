import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:developer';

class AuditService {
  final FirebaseFirestore _firestore;

  AuditService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  Future<void> logAction({
    required String actorId,
    required String actorName,
    required String actionType,
    required String targetId,
    required String description,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _firestore.collection('audit_logs').add({
        'actorId': actorId,
        'actorName': actorName,
        'actionType': actionType,
        'targetId': targetId,
        'description': description,
        'metadata': metadata ?? {},
        'timestamp': FieldValue.serverTimestamp(),
      });
      log('✅ [AUDIT] Action logged: $actionType on $targetId');
    } catch (e, stack) {
      log('❌ [AUDIT] Error logging action: $e', stackTrace: stack);
    }
  }
}
