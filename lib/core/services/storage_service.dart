import 'dart:developer';
import 'dart:typed_data';

import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/core/error/app_failures.dart';

class StorageService {
  final LocalStorage _storage;

  StorageService({LocalStorage? storage})
    : _storage = storage ?? LocalStorage.instance;

  static const int maxFileSizeBytes = 10 * 1024 * 1024;

  static const List<String> _allowedExtensions = [
    'pdf',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'doc',
    'docx',
  ];

  Future<String> uploadFile({
    required Uint8List fileBytes,
    required String fileName,
    required String storagePath,
    Map<String, String>? customMetadata,
  }) async {
    try {
      _validateFile(fileBytes, fileName);

      final ref = _storage.ref().child(storagePath);

      final extension = _getFileExtension(fileName);
      final metadata = LocalSettableMetadata(
        contentType: _getContentType(extension),
        customMetadata: {
          'uploadedAt': DateTime.now().toIso8601String(),
          'originalName': fileName,
          ...?customMetadata,
        },
      );

      final uploadTask = ref.putData(fileBytes, metadata);

      final subscription = uploadTask.snapshotEvents.listen((snapshot) {
        final rawProgress =
            (snapshot.bytesTransferred /
                (snapshot.totalBytes == 0 ? 1 : snapshot.totalBytes)) *
            100;
        final progress = rawProgress.isNaN || rawProgress.isInfinite
            ? 0.0
            : rawProgress;
        log('📤 [STORAGE] Upload progress: ${progress.toStringAsFixed(1)}%');
      });

      final snapshot = await uploadTask;
      await subscription.cancel();

      final downloadUrl = await snapshot.ref.getDownloadURL();
      log('✅ [STORAGE] Upload complete: $storagePath');

      return downloadUrl;
    } on ValidationFailure {
      rethrow;
    } on LocalDataException catch (e, stack) {
      log('❌ [STORAGE] Upload error: ${e.code}', stackTrace: stack);
      throw StorageFailure(
        message: _mapStorageErrorCode(e.code),
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log('❌ [STORAGE] Unexpected upload error: $e', stackTrace: stack);
      throw UnexpectedFailure(
        message: 'Failed to upload file. Please try again.',
        stackTrace: stack,
      );
    }
  }

  Future<void> deleteFile({required String storagePath}) async {
    try {
      final ref = _storage.ref().child(storagePath);
      await ref.delete();
      log('✅ [STORAGE] Deleted: $storagePath');
    } on LocalDataException catch (e, stack) {
      if (e.code == 'object-not-found') return;
      log('❌ [STORAGE] Delete error: ${e.code}', stackTrace: stack);
      throw StorageFailure(
        message: _mapStorageErrorCode(e.code),
        code: e.code,
        stackTrace: stack,
      );
    } catch (e, stack) {
      log('❌ [STORAGE] Unexpected delete error: $e', stackTrace: stack);
      throw UnexpectedFailure(
        message: 'Failed to delete file. Please try again.',
        stackTrace: stack,
      );
    }
  }

  Future<String> getFileUrl({required String storagePath}) async {
    try {
      final ref = _storage.ref().child(storagePath);
      return await ref.getDownloadURL();
    } on LocalDataException catch (e, stack) {
      log('❌ [STORAGE] Get URL error: ${e.code}', stackTrace: stack);
      throw StorageFailure(
        message: _mapStorageErrorCode(e.code),
        code: e.code,
        stackTrace: stack,
      );
    } catch (e) {
      throw const UnexpectedFailure(
        message: 'Failed to retrieve file. Please try again.',
      );
    }
  }

  // â”€â”€ Private Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Validates file bytes size and extension before upload.
  void _validateFile(Uint8List bytes, String fileName) {
    // Check size
    final sizeBytes = bytes.length;
    if (sizeBytes <= 0) {
      throw const ValidationFailure(
        message: 'The selected file is empty. Please choose a valid file.',
        code: 'file-empty',
      );
    }
    if (sizeBytes > maxFileSizeBytes) {
      final sizeMB = (sizeBytes / (1024 * 1024)).toStringAsFixed(1);
      throw ValidationFailure(
        message:
            'File size ($sizeMB MB) exceeds the maximum allowed size of 10 MB.',
        code: 'file-too-large',
      );
    }

    // Check extension
    final extension = _getFileExtension(fileName);
    if (!_allowedExtensions.contains(extension)) {
      throw ValidationFailure(
        message:
            'File type ".$extension" is not supported. Allowed: ${_allowedExtensions.join(', ')}.',
        code: 'invalid-file-type',
      );
    }

    // Check file signature / magic bytes
    _validateFileSignature(bytes, extension);
  }

  /// Checks file bytes signature (magic bytes) to prevent extension spoofing and block malicious executable files.
  void _validateFileSignature(Uint8List bytes, String extension) {
    // Explicitly reject executable headers to prevent malware renaming attacks
    if (bytes.length >= 2 && bytes[0] == 0x4D && bytes[1] == 0x5A) {
      throw const ValidationFailure(
        message: 'Security Alert: Executable files are not allowed.',
        code: 'invalid-file-signature',
      );
    }
    if (bytes.length >= 4 &&
        bytes[0] == 0x7F &&
        bytes[1] == 0x45 &&
        bytes[2] == 0x4C &&
        bytes[3] == 0x46) {
      throw const ValidationFailure(
        message: 'Security Alert: Executable files are not allowed.',
        code: 'invalid-file-signature',
      );
    }
    if (bytes.length >= 2 && bytes[0] == 0x23 && bytes[1] == 0x21) {
      throw const ValidationFailure(
        message: 'Security Alert: Script files are not allowed.',
        code: 'invalid-file-signature',
      );
    }

    bool isValid = false;
    switch (extension) {
      case 'pdf':
        if (bytes.length >= 4 &&
            bytes[0] == 0x25 &&
            bytes[1] == 0x50 &&
            bytes[2] == 0x44 &&
            bytes[3] == 0x46) {
          isValid = true;
        }
        break;
      case 'png':
        if (bytes.length >= 8 &&
            bytes[0] == 0x89 &&
            bytes[1] == 0x50 &&
            bytes[2] == 0x4E &&
            bytes[3] == 0x47 &&
            bytes[4] == 0x0D &&
            bytes[5] == 0x0A &&
            bytes[6] == 0x1A &&
            bytes[7] == 0x0A) {
          isValid = true;
        }
        break;
      case 'jpg':
      case 'jpeg':
        if (bytes.length >= 3 &&
            bytes[0] == 0xFF &&
            bytes[1] == 0xD8 &&
            bytes[2] == 0xFF) {
          isValid = true;
        }
        break;
      case 'gif':
        if (bytes.length >= 6 &&
            bytes[0] == 0x47 &&
            bytes[1] == 0x49 &&
            bytes[2] == 0x46 &&
            bytes[3] == 0x38 &&
            (bytes[4] == 0x37 || bytes[4] == 0x39) &&
            bytes[5] == 0x61) {
          isValid = true;
        }
        break;
      case 'docx':
        // DOCX is a ZIP-based format: PK\x03\x04
        if (bytes.length >= 4 &&
            bytes[0] == 0x50 &&
            bytes[1] == 0x4B &&
            bytes[2] == 0x03 &&
            bytes[3] == 0x04) {
          isValid = true;
        }
        break;
      case 'doc':
        // DOC format (OLE CF): 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
        if (bytes.length >= 8 &&
            bytes[0] == 0xD0 &&
            bytes[1] == 0xCF &&
            bytes[2] == 0x11 &&
            bytes[3] == 0xE0 &&
            bytes[4] == 0xA1 &&
            bytes[5] == 0xB1 &&
            bytes[6] == 0x1A &&
            bytes[7] == 0xE1) {
          isValid = true;
        }
        break;
    }

    if (!isValid) {
      throw ValidationFailure(
        message:
            'Security Alert: File signature does not match its extension (".$extension").',
        code: 'invalid-file-signature',
      );
    }
  }

  /// Extracts the lowercase file extension from a filename.
  String _getFileExtension(String fileName) {
    if (!fileName.contains('.')) return '';
    return fileName.split('.').last.toLowerCase();
  }

  /// Maps file extension to MIME content type.
  String _getContentType(String extension) {
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
  }

  /// Maps Firebase Storage error codes to user-friendly messages.
  String _mapStorageErrorCode(String code) {
    switch (code) {
      case 'storage/unauthorized':
        return 'You do not have permission to perform this action.';
      case 'storage/canceled':
        return 'Upload was cancelled.';
      case 'storage/retry-limit-exceeded':
        return 'Upload timed out. Please check your connection and try again.';
      case 'storage/invalid-checksum':
        return 'File was corrupted during upload. Please try again.';
      case 'storage/quota-exceeded':
        return 'Storage quota exceeded. Please contact support.';
      case 'storage/object-not-found':
        return 'The requested file was not found.';
      case 'storage/unknown':
      default:
        return 'A storage error occurred. Please try again.';
    }
  }
}
