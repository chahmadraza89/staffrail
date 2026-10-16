import 'dart:developer';

import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/home/data/data_source/message_service.dart';
import 'package:bhmh/features/employee/home/data/model/message_model.dart';
import 'package:bhmh/features/employee/home/presentation/provider/message_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// =============================================================================
// ADMIN MESSAGE VIEW MODEL (Riverpod 3.0 Notifier)
// =============================================================================
// Handles publishing broadcast messages to the Firestore `messages` collection.
//
// Architecture matches TrainingViewModel / TaskViewModel:
// - Notifier<AsyncValue<void>> for one-shot action state
// - UID resolved from auth state at call-time
// =============================================================================

class AdminMessageViewModel extends Notifier<AsyncValue<void>> {
  late final MessageService _messageService;

  @override
  AsyncValue<void> build() {
    _messageService = ref.read(messageServiceProvider);
    return const AsyncValue.data(null);
  }

  /// Resolves the current user's UID. Returns 'system' if not authenticated.
  String _resolveAuthorId() {
    final userAsync = ref.read(currentUserProvider);
    final user = userAsync.maybeWhen(data: (user) => user, orElse: () => null);
    return user?.uid ?? 'system';
  }

  /// Resolves the current user's display name.
  String _resolveAuthorName() {
    final userAsync = ref.read(currentUserProvider);
    final user = userAsync.maybeWhen(data: (user) => user, orElse: () => null);
    return user?.name ?? 'Admin';
  }

  // ── Publish Message ──────────────────────────────────────────────────────

  /// Publishes a broadcast message to Firestore.
  /// Returns true on success, false on failure.
  Future<bool> publishMessage({
    required String title,
    required String content,
    required bool isPushEnabled,
    String? recipientId,
  }) async {
    state = const AsyncValue.loading();
    try {
      final authorId = _resolveAuthorId();
      final authorName = _resolveAuthorName();

      final message = MessageEntity(
        id: '', // Firestore auto-generates the document ID
        title: title,
        content: content,
        authorId: authorId,
        authorName: authorName,
        recipientId: recipientId,
        timestamp: DateTime.now(),
        isPushEnabled: isPushEnabled,
      );

      await _messageService.publishMessage(message);

      log('✅ [MSG-VM] Message published: "$title"');
      state = const AsyncValue.data(null);
      return true;
    } catch (e, stack) {
      log('❌ [MSG-VM] Publish error: $e');
      state = AsyncValue.error(e, stack);
      return false;
    }
  }
}

final adminMessageViewModelProvider =
    NotifierProvider<AdminMessageViewModel, AsyncValue<void>>(
      AdminMessageViewModel.new,
    );
