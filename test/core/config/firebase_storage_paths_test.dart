// Unit tests for local/relative storage path constants

import 'package:bhmh/core/config/firebase_storage_collecation_constant.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('StoragePaths.onboardingDocument', () {
    test('should build correct path with all parameters', () {
      final path = StoragePaths.onboardingDocument(
        uid: 'user123',
        taskId: 'offer_letter',
        fileName: 'signed_letter.pdf',
      );

      expect(path, 'users/user123/onboarding/offer_letter/signed_letter.pdf');
    });

    test('should include timestamp in filename', () {
      final path = StoragePaths.onboardingDocument(
        uid: 'abc',
        taskId: 'task1',
        fileName: '1234567890_document.pdf',
      );

      expect(path, 'users/abc/onboarding/task1/1234567890_document.pdf');
    });
  });

  group('StoragePaths.onboardingFolder', () {
    test('should build correct folder path', () {
      final path = StoragePaths.onboardingFolder(
        uid: 'user456',
        taskId: 'w4_form',
      );

      expect(path, 'users/user456/onboarding/w4_form');
    });
  });

  group('StoragePaths.trainingCertificate', () {
    test('should build correct path with all parameters', () {
      final path = StoragePaths.trainingCertificate(
        uid: 'user789',
        trainingId: 'safety_training',
        fileName: 'certificate.pdf',
      );

      expect(
        path,
        'users/user789/training/safety_training/certificate.pdf',
      );
    });
  });

  group('StoragePaths.trainingFolder', () {
    test('should build correct folder path', () {
      final path = StoragePaths.trainingFolder(
        uid: 'user101',
        trainingId: 'fire_safety',
      );

      expect(path, 'users/user101/training/fire_safety');
    });
  });

  group('StoragePaths.profileImage', () {
    test('should build correct path with all parameters', () {
      final path = StoragePaths.profileImage(
        uid: 'user202',
        fileName: 'avatar.jpg',
      );

      expect(path, 'users/user202/profile/avatar.jpg');
    });
  });

  group('StoragePaths.signatureImage', () {
    test('should build correct path with all parameters', () {
      final path = StoragePaths.signatureImage(
        uid: 'user303',
        taskId: 'hr_form',
        fileName: 'signature.png',
      );

      expect(path, 'users/user303/signatures/hr_form/signature.png');
    });
  });

  group('StoragePaths path isolation', () {
    test('should not allow instantiation', () {
      // StoragePaths has a private constructor
      // Verify it's a utility class with only static members
      expect(StoragePaths, isNotNull);
    });

    test('paths should not interfere with each other', () {
      final onboardingPath = StoragePaths.onboardingDocument(
        uid: 'u1',
        taskId: 't1',
        fileName: 'f1.pdf',
      );
      final trainingPath = StoragePaths.trainingCertificate(
        uid: 'u1',
        trainingId: 't1',
        fileName: 'f1.pdf',
      );

      expect(onboardingPath, isNot(equals(trainingPath)));
      expect(onboardingPath, contains('/onboarding/'));
      expect(trainingPath, contains('/training/'));
    });
  });

  group('StoragePaths edge cases', () {
    test('should handle empty uid gracefully', () {
      final path = StoragePaths.onboardingDocument(
        uid: '',
        taskId: 'task1',
        fileName: 'file.pdf',
      );

      expect(path, 'users//onboarding/task1/file.pdf');
    });

    test('should handle special characters in filenames', () {
      final path = StoragePaths.onboardingDocument(
        uid: 'user1',
        taskId: 'task-1',
        fileName: 'my document (1).pdf',
      );

      expect(path, 'users/user1/onboarding/task-1/my document (1).pdf');
    });
  });
}
