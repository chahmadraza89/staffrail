import 'package:bhmh/core/config/firebase_collection_constant.dart'
    as store_constants;
import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/employee/home/data/model/message_model.dart';
import 'dart:developer' as dev;

class MessageService {
  final LocalDataStore _firestore;

  MessageService({LocalDataStore? firestore})
      : _firestore = firestore ?? LocalDataStore.instance;

  LocalCollectionReference<Map<String, dynamic>> get _messagesRef =>
      _firestore.collection(store_constants.messages);

  Future<void> publishMessage(MessageEntity message) async {
    try {
      dev.log('📤 Publishing message to local store...', name: 'MessageService');

      final data = message.toFirestore();
      data['timestamp'] = LocalFieldValue.serverTimestamp();

      await _messagesRef.add(data);

      dev.log('✅ Message published successfully.', name: 'MessageService');
    } catch (e, st) {
      dev.log(
        '❌ Error publishing message: $e',
        name: 'MessageService',
        error: e,
        stackTrace: st,
      );
      rethrow;
    }
  }

  // ── Read (Streams) ─────────────────────────────────────────────────────────

  /// Streams the 3 most recent messages for dashboard display.
  /// Uses in-memory filtering to avoid index errors on (recipientId + timestamp).
  Stream<List<MessageEntity>> streamRecentMessages({String? currentUserId}) {
    // Fetch last 10 to ensure we find at least 3 relevant ones for this user
    var query = _messagesRef.orderBy('timestamp', descending: true).limit(10);

    return query.snapshots().map((snapshot) {
      final allMessages = snapshot.docs
          .where((doc) => doc.data()['timestamp'] != null)
          .map((doc) => MessageEntity.fromFirestore(doc.data(), doc.id))
          .toList();

      // Filter in memory to avoid "Composite Index Required" errors
      final filtered = allMessages.where((m) {
        if (currentUserId == null) return m.recipientId == 'broadcast';
        return m.recipientId == 'broadcast' || 
               m.recipientId == currentUserId ||
               m.authorId == currentUserId; // Show both received and SENT messages
      }).toList();

      // Return only the top 3 most recent
      return filtered.take(3).toList();
    }).handleError((error, stackTrace) {
      dev.log(
        '❌ Error streaming recent messages: $error',
        name: 'MessageService',
        error: error,
        stackTrace: stackTrace,
      );
    });
  }

  /// Streams a paginated list of messages (for future history feature).
  Stream<List<MessageEntity>> streamMessages({int limit = 20, String? currentUserId}) {
    var query = _messagesRef.orderBy('timestamp', descending: true);

    if (currentUserId != null) {
      query = query.where('recipientId', whereIn: ['broadcast', currentUserId]);
    }

    return query
        .limit(limit)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .where((doc) => doc.data()['timestamp'] != null)
          .map((doc) => MessageEntity.fromFirestore(doc.data(), doc.id))
          .toList();
    }).handleError((error, stackTrace) {
      dev.log(
        '❌ Error streaming messages: $error',
        name: 'MessageService',
        error: error,
        stackTrace: stackTrace,
      );
    });
  }
}
