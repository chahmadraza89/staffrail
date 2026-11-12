import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as store_constants;
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/employee/home/data/model/notification_model.dart';
import 'dart:developer';

class NotificationService {
  final LocalDataStore _store;

  NotificationService({LocalDataStore? firestore})
      : _store = firestore ?? LocalDataStore.instance;

  LocalCollectionReference<Map<String, dynamic>> _collection(String uid) {
    return _store
        .collection(store_constants.users)
        .doc(uid)
        .collection('notifications');
  }

  Stream<List<NotificationEntity>> streamNotifications(String currentUserId) {
    if (currentUserId.isEmpty) return Stream.value([]);

    return _collection(currentUserId)
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return NotificationEntity.fromFirestore(doc.data(), doc.id);
      }).toList();
    });
  }

  Future<void> markAsRead(String currentUserId, String notificationId) async {
    if (currentUserId.isEmpty) return;
    try {
      await _collection(currentUserId).doc(notificationId).update({'isRead': true});
    } catch (e, stack) {
      log('Error marking notification as read: $e', stackTrace: stack);
    }
  }

  Future<void> markAllAsRead(String currentUserId) async {
    if (currentUserId.isEmpty) return;
    try {
      final unreadDocs = await _collection(currentUserId)
          .where('isRead', isEqualTo: false)
          .get();

      if (unreadDocs.docs.isEmpty) return;

      final batch = _store.batch();
      for (var doc in unreadDocs.docs) {
        batch.update(doc.reference, {'isRead': true});
      }
      await batch.commit();
    } catch (e, stack) {
      log('Error marking all as read: $e', stackTrace: stack);
    }
  }
}
