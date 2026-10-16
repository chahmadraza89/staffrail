// Unit tests for StorageService validation logic
// Uses mock FirebaseStorage to avoid Firebase initialization requirement

import 'dart:typed_data';

import 'package:bhmh/core/error/app_failures.dart';
import 'package:bhmh/core/services/storage_service.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockFirebaseStorage extends Mock implements FirebaseStorage {}

class MockReference extends Mock implements Reference {}

class FakeSettableMetadata extends Fake implements SettableMetadata {}

void main() {
  late MockFirebaseStorage mockStorage;
  late MockReference mockRef;
  late StorageService storageService;

  setUp(() {
    mockStorage = MockFirebaseStorage();
    mockRef = MockReference();
    storageService = StorageService(storage: mockStorage);

    registerFallbackValue(Uint8List.fromList([]));
    registerFallbackValue(FakeSettableMetadata());
  });

  group('StorageService.uploadFile validation', () {
    test('should throw ValidationFailure for empty bytes', () async {
      expect(
        () => storageService.uploadFile(
          fileBytes: Uint8List.fromList([]),
          fileName: 'test.pdf',
          storagePath: 'users/uid/test.pdf',
        ),
        throwsA(isA<ValidationFailure>()),
      );
    });

    test('should throw ValidationFailure for file exceeding 10MB', () async {
      final largeBytes = Uint8List(11 * 1024 * 1024);

      expect(
        () => storageService.uploadFile(
          fileBytes: largeBytes,
          fileName: 'test.pdf',
          storagePath: 'users/uid/test.pdf',
        ),
        throwsA(isA<ValidationFailure>()),
      );
    });

    test('should throw ValidationFailure for unsupported extension', () async {
      expect(
        () => storageService.uploadFile(
          fileBytes: Uint8List.fromList([1, 2, 3]),
          fileName: 'test.exe',
          storagePath: 'users/uid/test.exe',
        ),
        throwsA(isA<ValidationFailure>()),
      );
    });

    test('should reject .docx with invalid signature', () async {
      expect(
        () => storageService.uploadFile(
          fileBytes: Uint8List.fromList([1, 2, 3]),
          fileName: 'document.docx',
          storagePath: 'users/uid/document.docx',
        ),
        throwsA(isA<ValidationFailure>()),
      );
    });

    test(
      'should pass validation for PDF and throw StorageFailure on upload',
      () async {
        final pdfBytes = Uint8List.fromList([0x25, 0x50, 0x44, 0x46]);

        // Mock storage ref chain
        when(() => mockStorage.ref()).thenReturn(mockRef);
        when(() => mockRef.child(any())).thenReturn(mockRef);
        when(
          () => mockRef.putData(any<Uint8List>(), any<SettableMetadata>()),
        ).thenThrow(
          FirebaseException(
            plugin: 'storage',
            code: 'storage/unauthorized',
            message: 'Permission denied',
          ),
        );

        expect(
          () => storageService.uploadFile(
            fileBytes: pdfBytes,
            fileName: 'test.pdf',
            storagePath: 'users/uid/test.pdf',
          ),
          throwsA(isA<StorageFailure>()),
        );
      },
    );

    test(
      'should pass validation for PNG and throw StorageFailure on upload',
      () async {
        final pngBytes = Uint8List.fromList([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        when(() => mockStorage.ref()).thenReturn(mockRef);
        when(() => mockRef.child(any())).thenReturn(mockRef);
        when(
          () => mockRef.putData(any<Uint8List>(), any<SettableMetadata>()),
        ).thenThrow(
          FirebaseException(
            plugin: 'storage',
            code: 'storage/unauthorized',
            message: 'Permission denied',
          ),
        );

        expect(
          () => storageService.uploadFile(
            fileBytes: pngBytes,
            fileName: 'image.png',
            storagePath: 'users/uid/image.png',
          ),
          throwsA(isA<StorageFailure>()),
        );
      },
    );

    test('should reject Windows PE executable disguised as PDF', () async {
      final fakePdfBytes = Uint8List.fromList([0x4D, 0x5A, 0x00, 0x00]); // MZ header
      expect(
        () => storageService.uploadFile(
          fileBytes: fakePdfBytes,
          fileName: 'invoice.pdf',
          storagePath: 'users/uid/invoice.pdf',
        ),
        throwsA(
          isA<ValidationFailure>().having(
            (f) => f.message,
            'message',
            contains('Executable files are not allowed'),
          ),
        ),
      );
    });

    test('should reject ELF executable disguised as PNG', () async {
      final fakePngBytes = Uint8List.fromList([0x7F, 0x45, 0x4C, 0x46]); // ELF header
      expect(
        () => storageService.uploadFile(
          fileBytes: fakePngBytes,
          fileName: 'avatar.png',
          storagePath: 'users/uid/avatar.png',
        ),
        throwsA(
          isA<ValidationFailure>().having(
            (f) => f.message,
            'message',
            contains('Executable files are not allowed'),
          ),
        ),
      );
    });

    test('should reject shebang script disguised as JPEG', () async {
      final fakeJpgBytes = Uint8List.fromList([0x23, 0x21, 0x2F, 0x62, 0x69, 0x6E]); // #!/bin
      expect(
        () => storageService.uploadFile(
          fileBytes: fakeJpgBytes,
          fileName: 'photo.jpeg',
          storagePath: 'users/uid/photo.jpeg',
        ),
        throwsA(
          isA<ValidationFailure>().having(
            (f) => f.message,
            'message',
            contains('Script files are not allowed'),
          ),
        ),
      );
    });

    test('should reject spoofed extension (e.g. PDF bytes for PNG filename)', () async {
      final pdfBytes = Uint8List.fromList([0x25, 0x50, 0x44, 0x46]);
      expect(
        () => storageService.uploadFile(
          fileBytes: pdfBytes,
          fileName: 'image.png',
          storagePath: 'users/uid/image.png',
        ),
        throwsA(
          isA<ValidationFailure>().having(
            (f) => f.message,
            'message',
            contains('File signature does not match its extension'),
          ),
        ),
      );
    });

    test('should accept DOCX with valid ZIP header and throw on upload', () async {
      final docxBytes = Uint8List.fromList([0x50, 0x4B, 0x03, 0x04]);

      when(() => mockStorage.ref()).thenReturn(mockRef);
      when(() => mockRef.child(any())).thenReturn(mockRef);
      when(
        () => mockRef.putData(any<Uint8List>(), any<SettableMetadata>()),
      ).thenThrow(
        FirebaseException(
          plugin: 'storage',
          code: 'storage/unauthorized',
          message: 'Permission denied',
        ),
      );

      expect(
        () => storageService.uploadFile(
          fileBytes: docxBytes,
          fileName: 'document.docx',
          storagePath: 'users/uid/document.docx',
        ),
        throwsA(isA<StorageFailure>()),
      );
    });

    test('should accept DOC with valid OLE CF header and throw on upload', () async {
      final docBytes = Uint8List.fromList([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);

      when(() => mockStorage.ref()).thenReturn(mockRef);
      when(() => mockRef.child(any())).thenReturn(mockRef);
      when(
        () => mockRef.putData(any<Uint8List>(), any<SettableMetadata>()),
      ).thenThrow(
        FirebaseException(
          plugin: 'storage',
          code: 'storage/unauthorized',
          message: 'Permission denied',
        ),
      );

      expect(
        () => storageService.uploadFile(
          fileBytes: docBytes,
          fileName: 'document.doc',
          storagePath: 'users/uid/document.doc',
        ),
        throwsA(isA<StorageFailure>()),
      );
    });

    test('should accept GIF with valid GIF87a/GIF89a header and throw on upload', () async {
      final gifBytes = Uint8List.fromList([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

      when(() => mockStorage.ref()).thenReturn(mockRef);
      when(() => mockRef.child(any())).thenReturn(mockRef);
      when(
        () => mockRef.putData(any<Uint8List>(), any<SettableMetadata>()),
      ).thenThrow(
        FirebaseException(
          plugin: 'storage',
          code: 'storage/unauthorized',
          message: 'Permission denied',
        ),
      );

      expect(
        () => storageService.uploadFile(
          fileBytes: gifBytes,
          fileName: 'animation.gif',
          storagePath: 'users/uid/animation.gif',
        ),
        throwsA(isA<StorageFailure>()),
      );
    });
  });

  group('StorageService constants', () {
    test('maxFileSizeBytes constant should be 10MB', () {
      expect(StorageService.maxFileSizeBytes, 10 * 1024 * 1024);
    });

    test('10MB equals 10485760 bytes', () {
      expect(StorageService.maxFileSizeBytes, 10485760);
    });
  });

  group('StorageService validation error messages', () {
    test('empty bytes should have descriptive message', () async {
      try {
        await storageService.uploadFile(
          fileBytes: Uint8List(0),
          fileName: 'test.pdf',
          storagePath: 'users/uid/test.pdf',
        );
        fail('Should have thrown');
      } on ValidationFailure catch (e) {
        expect(e.message, contains('empty'));
      }
    });

    test('large file bytes should show size in error message', () async {
      try {
        await storageService.uploadFile(
          fileBytes: Uint8List(11 * 1024 * 1024),
          fileName: 'test.pdf',
          storagePath: 'users/uid/test.pdf',
        );
        fail('Should have thrown');
      } on ValidationFailure catch (e) {
        expect(e.message, contains('10 MB'));
      }
    });

    test('unsupported extension in filename should list allowed types', () async {
      try {
        await storageService.uploadFile(
          fileBytes: Uint8List.fromList([1, 2, 3]),
          fileName: 'test.exe',
          storagePath: 'users/uid/test.exe',
        );
        fail('Should have thrown');
      } on ValidationFailure catch (e) {
        expect(e.message, contains('pdf'));
        expect(e.message, contains('png'));
      }
    });
  });
}
