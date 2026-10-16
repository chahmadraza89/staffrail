// Unit tests for sealed Failure classes

import 'package:bhmh/core/error/app_failures.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FirestoreFailure', () {
    test('should create with message and code', () {
      const failure = FirestoreFailure(
        message: 'Firestore error',
        code: 'permission-denied',
      );

      expect(failure.message, 'Firestore error');
      expect(failure.code, 'permission-denied');
    });

    test('should create with message only', () {
      const failure = FirestoreFailure(message: 'Generic error');

      expect(failure.message, 'Generic error');
      expect(failure.code, isNull);
    });

    test('should be a Failure subtype', () {
      const failure = FirestoreFailure(message: 'test');
      expect(failure, isA<Failure>());
    });

    test('Equatable should consider equal failures as equal', () {
      const f1 = FirestoreFailure(message: 'Error', code: 'code1');
      const f2 = FirestoreFailure(message: 'Error', code: 'code1');

      expect(f1, f2);
    });

    test('toString should include type, message, and code', () {
      const failure = FirestoreFailure(message: 'Test error', code: 'test-code');
      expect(failure.toString(), contains('FirestoreFailure'));
      expect(failure.toString(), contains('Test error'));
      expect(failure.toString(), contains('test-code'));
    });
  });

  group('StorageFailure', () {
    test('should create with message and code', () {
      const failure = StorageFailure(
        message: 'Upload failed',
        code: 'storage/unauthorized',
      );

      expect(failure.message, 'Upload failed');
      expect(failure.code, 'storage/unauthorized');
    });

    test('should be a Failure subtype', () {
      const failure = StorageFailure(message: 'test');
      expect(failure, isA<Failure>());
    });

    test('Equatable should consider equal failures as equal', () {
      const f1 = StorageFailure(message: 'Upload failed', code: 'unauthorized');
      const f2 = StorageFailure(message: 'Upload failed', code: 'unauthorized');

      expect(f1, f2);
    });
  });

  group('ValidationFailure', () {
    test('should create with message and code', () {
      const failure = ValidationFailure(
        message: 'Invalid input',
        code: 'invalid-field',
      );

      expect(failure.message, 'Invalid input');
      expect(failure.code, 'invalid-field');
    });

    test('should be a Failure subtype', () {
      const failure = ValidationFailure(message: 'test');
      expect(failure, isA<Failure>());
    });
  });

  group('NetworkFailure', () {
    test('should create with message', () {
      const failure = NetworkFailure(message: 'No internet connection');

      expect(failure.message, 'No internet connection');
    });

    test('should be a Failure subtype', () {
      const failure = NetworkFailure(message: 'test');
      expect(failure, isA<Failure>());
    });
  });

  group('UnexpectedFailure', () {
    test('should create with message', () {
      const failure = UnexpectedFailure(message: 'Unknown error');

      expect(failure.message, 'Unknown error');
    });

    test('should be a Failure subtype', () {
      const failure = UnexpectedFailure(message: 'test');
      expect(failure, isA<Failure>());
    });
  });

  group('Exhaustive switch on Failure', () {
    test('should handle all Failure subtypes', () {
      const failures = <Failure>[
        FirestoreFailure(message: 'fs', code: 'fs'),
        StorageFailure(message: 'st', code: 'st'),
        ValidationFailure(message: 'val'),
        NetworkFailure(message: 'net'),
        UnexpectedFailure(message: 'unexpected'),
      ];

      for (final failure in failures) {
        String result;
        switch (failure) {
          case FirestoreFailure():
            result = 'firestore';
          case StorageFailure():
            result = 'storage';
          case ValidationFailure():
            result = 'validation';
          case NetworkFailure():
            result = 'network';
          case UnexpectedFailure():
            result = 'unexpected';
        }
        expect(result, isNotNull);
      }
    });
  });
}
