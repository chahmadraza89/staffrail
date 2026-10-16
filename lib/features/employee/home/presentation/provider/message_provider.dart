import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/home/data/data_source/message_service.dart';
import 'package:bhmh/features/employee/home/data/model/message_model.dart';

// =============================================================================
// MESSAGE PROVIDERS (Riverpod 3.0)
// =============================================================================
// - messageServiceProvider: DI for MessageService (singleton pattern).
// - latestMessageProvider: Non-autoDispose stream so it stays alive across
//   navigation between Admin and Employee dashboards.
// - messagesProvider: Streams all messages for the notification page.
// =============================================================================

/// Dependency injection for the MessageService.
final messageServiceProvider = Provider<MessageService>((ref) {
  return MessageService();
});

/// Streams the 3 most recent published messages from Firestore.
/// Non-autoDispose to avoid re-fetching on every widget rebuild.
final recentMessagesProvider = StreamProvider<List<MessageEntity>>((ref) {
  final service = ref.watch(messageServiceProvider);
  final uid = ref.watch(
    authStateProvider.select((asyncValue) => asyncValue.value?.uid),
  );
  return service.streamRecentMessages(currentUserId: uid);
});

/// Streams all messages from Firestore for the notification page.
/// Non-autoDispose to keep the stream alive during navigation.
final messagesProvider = StreamProvider<List<MessageEntity>>((ref) {
  final service = ref.watch(messageServiceProvider);
  final uid = ref.watch(
    authStateProvider.select((asyncValue) => asyncValue.value?.uid),
  );
  return service.streamMessages(currentUserId: uid);
});
