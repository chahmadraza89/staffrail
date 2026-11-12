import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

// =============================================================================
// FILE PICKER SERVICE
// =============================================================================
// Cross-platform file picking service.
// Uses PlatformFile to support both Mobile (path) and Web (bytes).
// =============================================================================

class FilePickerService {
  /// Pick a single file with optional type filtering.
  /// Returns a PlatformFile which contains the name, size, and bytes/path.
  Future<PlatformFile?> pickFile({
    FileType fileType = FileType.any,
    List<String>? allowedExtensions,
    BuildContext? context,
  }) async {
    try {
      // FIX: If extensions are provided, file_picker REQUIRES FileType.custom
      final effectiveType =
          (allowedExtensions != null && allowedExtensions.isNotEmpty)
              ? FileType.custom
              : fileType;

      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: effectiveType,
        allowedExtensions: allowedExtensions,
        allowMultiple: false,
        withData: true, // Required for Web to get bytes
      );

      if (result != null && result.files.isNotEmpty) {
        return result.files.first;
      }
      return null;
    } catch (e) {
      debugPrint('❌ [FILE_PICKER] Error: $e');
      return null;
    }
  }

  /// Pick multiple files.
  Future<List<PlatformFile>> pickMultipleFiles({
    FileType fileType = FileType.any,
    List<String>? allowedExtensions,
    BuildContext? context,
  }) async {
    try {
      // FIX: If extensions are provided, file_picker REQUIRES FileType.custom
      final effectiveType =
          (allowedExtensions != null && allowedExtensions.isNotEmpty)
              ? FileType.custom
              : fileType;

      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: effectiveType,
        allowedExtensions: allowedExtensions,
        allowMultiple: true,
        withData: true,
      );

      if (result != null) {
        return result.files;
      }
      return [];
    } catch (e) {
      debugPrint('❌ [FILE_PICKER] Error: $e');
      return [];
    }
  }

  /// Pick image specifically.
  /// Note: We remove allowedExtensions here because FileType.image already
  /// handles common image types and providing extensions with it causes a crash.
  Future<PlatformFile?> pickImage({BuildContext? context}) async {
    return pickFile(
      fileType: FileType.image,
      context: context,
    );
  }

  /// Pick PDF specifically.
  Future<PlatformFile?> pickPDF({BuildContext? context}) async {
    return pickFile(
      fileType: FileType.custom,
      allowedExtensions: ['pdf'],
      context: context,
    );
  }
}
