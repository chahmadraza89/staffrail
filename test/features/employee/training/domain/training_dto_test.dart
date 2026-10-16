// Unit tests for TrainingDTO

import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/domain/training_dto.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

// ignore: subtype_of_sealed_class
class MockDocumentSnapshot extends Mock implements DocumentSnapshot {}

void main() {
  late MockDocumentSnapshot mockDoc;

  setUp(() {
    mockDoc = MockDocumentSnapshot();
  });

  group('TrainingDTO.fromFirestore', () {
    test('should throw FormatException when document data is null', () {
      when(() => mockDoc.id).thenReturn('training_1');
      when(() => mockDoc.data()).thenReturn(null);

      expect(
        () => TrainingDTO.fromFirestore(mockDoc),
        throwsA(isA<FormatException>()),
      );
    });

    test('should parse all fields from Firestore map', () {
      when(() => mockDoc.id).thenReturn('training_1');
      when(() => mockDoc.data()).thenReturn({
        'title': 'Safety Training',
        'description': 'Learn safety protocols',
        'durationText': '45 mins',
        'status': 'pending',
        'certificateUrl': null,
        'dueDate': Timestamp.fromDate(DateTime(2026, 12, 31)),
        'completedAt': null,
        'updatedAt': null,
      });

      final result = TrainingDTO.fromFirestore(mockDoc);

      expect(result.id, 'training_1');
      expect(result.title, 'Safety Training');
      expect(result.description, 'Learn safety protocols');
      expect(result.durationText, '45 mins');
      expect(result.status, TrainingStatus.pending);
      expect(result.certificateUrl, isNull);
      expect(result.dueDate, DateTime(2026, 12, 31));
    });

    test('should parse completed status with certificate URL', () {
      when(() => mockDoc.id).thenReturn('training_2');
      when(() => mockDoc.data()).thenReturn({
        'title': 'Completed Training',
        'description': 'Done',
        'durationText': '30m',
        'status': 'completed',
        'certificateUrl': 'https://example.com/cert.pdf',
      });

      final result = TrainingDTO.fromFirestore(mockDoc);

      expect(result.status, TrainingStatus.completed);
      expect(result.certificateUrl, 'https://example.com/cert.pdf');
      expect(result.hasCertificate, isTrue);
    });

    test('should handle unknown status gracefully', () {
      when(() => mockDoc.id).thenReturn('training_1');
      when(() => mockDoc.data()).thenReturn({
        'title': 'Test',
        'description': 'Test',
        'durationText': '30m',
        'status': 'invalid_unknown',
      });

      final result = TrainingDTO.fromFirestore(mockDoc);

      expect(result.status, TrainingStatus.notStarted);
    });

    test('should default all string fields to empty when null', () {
      when(() => mockDoc.id).thenReturn('training_1');
      when(() => mockDoc.data()).thenReturn(<String, dynamic>{});

      final result = TrainingDTO.fromFirestore(mockDoc);

      expect(result.title, '');
      expect(result.description, '');
      expect(result.durationText, '');
    });
  });

  group('TrainingDTO.toFirestore', () {
    test('should serialize all fields correctly', () {
      final training = TrainingEntity(
        id: 'training_1',
        title: 'Safety Training',
        description: 'Learn safety protocols',
        durationText: '45 mins',
        status: TrainingStatus.pending,
        dueDate: DateTime(2026, 12, 31),
      );

      final map = TrainingDTO.toFirestore(training);

      expect(map['title'], 'Safety Training');
      expect(map['description'], 'Learn safety protocols');
      expect(map['durationText'], '45 mins');
      expect(map['status'], 'pending');
      expect(map['certificateUrl'], isNull);
      expect(map['dueDate'], isA<Timestamp>());
      expect(map['updatedAt'], isA<FieldValue>());
    });

    test('should serialize completed training with certificate', () {
      final training = TrainingEntity(
        id: 'training_1',
        title: 'Completed Training',
        description: 'Done',
        durationText: '30m',
        status: TrainingStatus.completed,
        certificateUrl: 'https://example.com/cert.pdf',
        completedAt: DateTime(2026, 1, 1),
      );

      final map = TrainingDTO.toFirestore(training);

      expect(map['certificateUrl'], 'https://example.com/cert.pdf');
      expect(map['status'], 'completed');
      expect(map['completedAt'], isA<Timestamp>());
    });
  });

  group('TrainingDTO.updateCertificateToFirestore', () {
    test('should include certificateUrl, status, and completedAt', () {
      final map = TrainingDTO.updateCertificateToFirestore(
        certificateUrl: 'https://example.com/cert.pdf',
        status: TrainingStatus.completed,
      );

      expect(map['certificateUrl'], 'https://example.com/cert.pdf');
      expect(map['status'], 'completed');
      expect(map['completedAt'], isA<FieldValue>());
      expect(map['updatedAt'], isA<FieldValue>());
    });
  });

  group('TrainingDTO.updateStatusToFirestore', () {
    test('should include only status and updatedAt', () {
      final map = TrainingDTO.updateStatusToFirestore(
        status: TrainingStatus.overdue,
      );

      expect(map['status'], 'overdue');
      expect(map['updatedAt'], isA<FieldValue>());
      expect(map.containsKey('certificateUrl'), isFalse);
      expect(map.containsKey('completedAt'), isFalse);
    });

    test('should handle all status values', () {
      for (final status in TrainingStatus.values) {
        final map = TrainingDTO.updateStatusToFirestore(status: status);
        expect(map['status'], status.name);
        expect(map['updatedAt'], isA<FieldValue>());
      }
    });
  });

  group('TrainingDTO._parseTimestamp', () {
    test('should parse int milliseconds', () {
      final map = {
        'title': 'Test',
        'description': 'Test',
        'durationText': '30m',
        'dueDate': Timestamp.fromDate(
          DateTime.fromMillisecondsSinceEpoch(1712390400000),
        ),
      };

      when(() => mockDoc.id).thenReturn('training_1');
      when(() => mockDoc.data()).thenReturn(map);

      final result = TrainingDTO.fromFirestore(mockDoc);

      expect(result.dueDate, isNotNull);
    });

    test('should parse string ISO dates', () {
      final map = {
        'title': 'Test',
        'description': 'Test',
        'durationText': '30m',
        'completedAt': '2026-04-06T10:30:00.000Z',
      };

      when(() => mockDoc.id).thenReturn('training_1');
      when(() => mockDoc.data()).thenReturn(map);

      final result = TrainingDTO.fromFirestore(mockDoc);

      expect(result.completedAt, DateTime.parse('2026-04-06T10:30:00.000Z'));
    });

    test('should return null for null input', () {
      final map = {
        'title': 'Test',
        'description': 'Test',
        'durationText': '30m',
      };

      when(() => mockDoc.id).thenReturn('training_1');
      when(() => mockDoc.data()).thenReturn(map);

      final result = TrainingDTO.fromFirestore(mockDoc);

      expect(result.dueDate, isNull);
      expect(result.completedAt, isNull);
      expect(result.updatedAt, isNull);
    });
  });
}
