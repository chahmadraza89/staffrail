import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/core/error/app_failures.dart';

/// Centralized error mapper that converts store, auth, and domain errors
/// into user-friendly messages suitable for displaying in toasts.
class AppErrorMapper {
  /// Converts any error object into a human-readable, user-friendly message.
  static String getUserFriendlyMessage(Object? error) {
    if (error == null) return 'Something went wrong. Please try again.';

    if (error is Failure) {
      if (error.code != null) {
        return _mapErrorCode(error.code!);
      }
      return error.message;
    }

    if (error is LocalDataException) {
      return _mapErrorCode(error.code);
    }

    final message = error.toString();
    if (message.contains('] ')) {
      return message.split('] ').last.trim();
    }

    return message;
  }

  static String _mapErrorCode(String code) {
    switch (code) {
      case 'wrong-password':
      case 'invalid-credential':
        return 'Incorrect email or password. Please try again.';
      case 'user-not-found':
        return 'No account found with this email address.';
      case 'email-already-in-use':
        return 'An account with this email already exists. Try signing in.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'user-disabled':
        return 'This account has been disabled. Contact support for help.';
      case 'access-denied':
        return 'Access denied. Contact Administrator';
      case 'operation-not-allowed':
        return 'This sign-in method is not enabled. Contact support.';
      case 'requires-recent-login':
        return 'For security, please sign in again before making this change.';
      case 'email-already-verified':
        return 'Your email is already verified. You can sign in now.';
      case 'no-user-logged-in':
        return 'You are not signed in. Please sign in first.';
      case 'network-request-failed':
        return 'No internet connection. Please check your network.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please try again later.';
      case 'internal-error':
        return 'An internal error occurred. Please try again later.';
      case 'invalid-argument':
        return 'Invalid input provided. Please check and try again.';
      case 'incomplete-form':
        return 'Please ensure all required fields are completed before submitting.';
      case 'missing-signature':
        return 'A signature is required to complete this task.';
      case 'invalid-date':
        return 'The selected date is invalid. Please check and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
