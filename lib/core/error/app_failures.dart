import 'package:equatable/equatable.dart';

// =============================================================================
// SEALED FAILURE HIERARCHY
// =============================================================================
// Production-grade error abstraction layer.
// Every service/repository throws a typed Failure instead of raw exceptions.
// The UI layer maps these to user-friendly messages via FirebaseErrorMapper.
//
// Benefits:
// 1. Exhaustive switch() in ViewModels — no uncaught error types at compile time.
// 2. Equatable — duplicate errors won't trigger unnecessary UI rebuilds.
// 3. Structured code field — enables analytics/logging per error category.
// =============================================================================

sealed class Failure extends Equatable implements Exception {
  final String message;
  final String? code;
  final StackTrace? stackTrace;

  const Failure({required this.message, this.code, this.stackTrace});

  @override
  List<Object?> get props => [message, code];

  @override
  String toString() =>
      '${runtimeType.toString()}(message: $message, code: $code)';
}

// ── Firestore Operations ────────────────────────────────────────────────────
/// Thrown when a Firestore read, write, query, or transaction fails.
class FirestoreFailure extends Failure {
  const FirestoreFailure({
    required super.message,
    super.code,
    super.stackTrace,
  });
}

// ── Firebase Storage Operations ─────────────────────────────────────────────
/// Thrown when a file upload, download, or deletion fails in Firebase Storage.
class StorageFailure extends Failure {
  const StorageFailure({required super.message, super.code, super.stackTrace});
}

// ── Input / Business Logic Validation ───────────────────────────────────────
/// Thrown when user input or business rules are violated before hitting Firebase.
/// Examples: empty file, invalid task state transition, null signature data.
class ValidationFailure extends Failure {
  const ValidationFailure({
    required super.message,
    super.code,
    super.stackTrace,
  });
}

// ── Network / Connectivity ──────────────────────────────────────────────────
/// Thrown when the device has no internet or Firebase is unreachable.
class NetworkFailure extends Failure {
  const NetworkFailure({required super.message, super.code, super.stackTrace});
}

// ── Catch-All ───────────────────────────────────────────────────────────────
/// Thrown for any unclassified error that doesn't fit the above categories.
/// Always log these — they indicate a gap in error handling.
class UnexpectedFailure extends Failure {
  const UnexpectedFailure({
    required super.message,
    super.code,
    super.stackTrace,
  });
}
