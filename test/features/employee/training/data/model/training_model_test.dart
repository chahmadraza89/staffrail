// Unit tests for Training models (TrainingEntity, TrainingStatus)

import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TrainingStatus enum', () {
    test('should have all expected status values', () {
      expect(TrainingStatus.values.length, 5);
      expect(TrainingStatus.completed.name, 'completed');
      expect(TrainingStatus.pending.name, 'pending');
      expect(TrainingStatus.overdue.name, 'overdue');
      expect(TrainingStatus.inProgress.name, 'inProgress');
      expect(TrainingStatus.notStarted.name, 'notStarted');
    });
  });

  group('TrainingEntity', () {
    test('should create with required fields only', () {
      const entity = TrainingEntity(
        id: 'training1',
        title: 'Safety Training',
        description: 'Learn safety protocols',
        durationText: '45 mins',
        status: TrainingStatus.pending,
      );

      expect(entity.id, 'training1');
      expect(entity.title, 'Safety Training');
      expect(entity.description, 'Learn safety protocols');
      expect(entity.durationText, '45 mins');
      expect(entity.status, TrainingStatus.pending);
      expect(entity.certificateUrl, isNull);
      expect(entity.dueDate, isNull);
      expect(entity.completedAt, isNull);
      expect(entity.updatedAt, isNull);
    });

    test('should create with all fields populated', () {
      const entity = TrainingEntity(
        id: 'training1',
        title: 'Advanced Safety',
        description: 'Advanced safety protocols',
        durationText: '90 mins',
        status: TrainingStatus.completed,
        certificateUrl: 'https://example.com/cert.pdf',
      );

      expect(entity.status, TrainingStatus.completed);
      expect(entity.certificateUrl, 'https://example.com/cert.pdf');
      expect(entity.hasCertificate, isTrue);
    });

    test('hasCertificate should return true when URL is present', () {
      const entity = TrainingEntity(
        id: 't1',
        title: 'Test',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.completed,
        certificateUrl: 'https://example.com/cert.pdf',
      );

      expect(entity.hasCertificate, isTrue);
    });

    test('hasCertificate should return false when URL is null', () {
      const entity = TrainingEntity(
        id: 't1',
        title: 'Test',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.pending,
      );

      expect(entity.hasCertificate, isFalse);
    });

    test('hasCertificate should return false when URL is empty string', () {
      const entity = TrainingEntity(
        id: 't1',
        title: 'Test',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.pending,
        certificateUrl: '',
      );

      expect(entity.hasCertificate, isFalse);
    });

    test('dueDateText should format date correctly', () {
      final entity = TrainingEntity(
        id: 't1',
        title: 'Test',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.pending,
        dueDate: DateTime(2026, 6, 15),
      );

      expect(entity.dueDateText, 'Jun 15, 2026');
    });

    test('dueDateText should return "No due date" when null', () {
      const entity = TrainingEntity(
        id: 't1',
        title: 'Test',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.pending,
      );

      expect(entity.dueDateText, 'No due date');
    });

    test('dueDateText should handle December and January', () {
      final janEntity = TrainingEntity(
        id: 't1',
        title: 'Test',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.pending,
        dueDate: DateTime(2027, 1, 5),
      );
      final decEntity = TrainingEntity(
        id: 't2',
        title: 'Test',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.pending,
        dueDate: DateTime(2027, 12, 25),
      );

      expect(janEntity.dueDateText, 'Jan 5, 2027');
      expect(decEntity.dueDateText, 'Dec 25, 2027');
    });

    test('copyWith should update specified fields', () {
      final original = TrainingEntity(
        id: 't1',
        title: 'Original',
        description: 'Original desc',
        durationText: '30m',
        status: TrainingStatus.pending,
      );

      final updated = original.copyWith(
        title: 'Updated',
        status: TrainingStatus.completed,
        certificateUrl: 'https://example.com/cert.pdf',
      );

      expect(updated.title, 'Updated');
      expect(updated.status, TrainingStatus.completed);
      expect(updated.certificateUrl, 'https://example.com/cert.pdf');
      expect(updated.id, 't1'); // unchanged
      expect(updated.description, 'Original desc'); // unchanged
    });

    test('copyWith with no args should return identical copy', () {
      const original = TrainingEntity(
        id: 't1',
        title: 'Title',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.pending,
      );

      final copy = original.copyWith();

      expect(copy, original);
    });

    test('Equatable should consider entities with same values as equal', () {
      const e1 = TrainingEntity(
        id: 't1',
        title: 'Title',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.completed,
      );
      const e2 = TrainingEntity(
        id: 't1',
        title: 'Title',
        description: 'Desc',
        durationText: '30m',
        status: TrainingStatus.completed,
      );

      expect(e1, e2);
    });

    test(
      'Equatable should consider entities with different IDs as not equal',
      () {
        const e1 = TrainingEntity(
          id: 't1',
          title: 'Title',
          description: 'Desc',
          durationText: '30m',
          status: TrainingStatus.completed,
        );
        const e2 = TrainingEntity(
          id: 't2',
          title: 'Title',
          description: 'Desc',
          durationText: '30m',
          status: TrainingStatus.completed,
        );

        expect(e1 == e2, isFalse);
      },
    );
  });
}
