import 'package:bhmh/core/config/firebase_collection_constant.dart' as firebase_constant;
import 'package:bhmh/features/employee/home/data/model/notification_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:developer';

class NotificationService {
  final FirebaseFirestore _firestore;

  NotificationService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  CollectionReference<Map<String, dynamic>> _collection(String uid) {
    return _firestore
        .collection(firebase_constant.users)
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

      final batch = _firestore.batch();
      for (var doc in unreadDocs.docs) {
        batch.update(doc.reference, {'isRead': true});
      }
      await batch.commit();
    } catch (e, stack) {
      log('Error marking all as read: $e', stackTrace: stack);
    }
  }
}
