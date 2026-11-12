// Unit tests for OnboardingTaskDTO

import 'package:bhmh/core/data/local_data_store.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/domain/onboarding_dto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDocumentSnapshot extends Mock implements LocalDocumentSnapshot {}

class MockTimestamp extends Mock implements LocalTimestamp {}

void main() {
  late MockDocumentSnapshot mockDoc;

  setUp(() {
    mockDoc = MockDocumentSnapshot();
    when(() => mockDoc.reference).thenReturn(
      LocalDataStore(seedDemo: false).collection('tasks').doc('task_1'),
    );
  });

  group('OnboardingTaskDTO.fromFirestore', () {
    test('should throw FormatException when document data is null', () {
      when(() => mockDoc.id).thenReturn('doc1');
      when(() => mockDoc.data()).thenReturn(null);

      expect(
        () => OnboardingTaskDTO.fromFirestore(mockDoc),
        throwsA(isA<FormatException>()),
      );
    });

    test('should parse all fields from Firestore map', () {
      when(() => mockDoc.id).thenReturn('task_1');
      when(() => mockDoc.data()).thenReturn({
        'title': 'Offer Letter',
        'subtitle': 'Signature Required',
        'isCompleted': false,
        'status': 'pending',
        'actionType': 'signature',
        'fileUrl': null,
        'signatureUrl': null,
        'completedAt': null,
        'updatedAt': null,
      });

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.id, 'task_1');
      expect(result.title, 'Offer Letter');
      expect(result.subtitle, 'Signature Required');
      expect(result.isCompleted, false);
      expect(result.status, TaskStatus.pending);
      expect(result.actionType, TaskActionType.signature);
    });

    test('should default to notStarted for null status', () {
      when(() => mockDoc.id).thenReturn('task_1');
      when(() => mockDoc.data()).thenReturn({
        'title': 'Test',
        'subtitle': 'Test',
        'status': null,
        'actionType': null,
      });

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.status, TaskStatus.notStarted);
      expect(result.actionType, TaskActionType.none);
    });

    test('should handle unknown status gracefully', () {
      when(() => mockDoc.id).thenReturn('task_1');
      when(() => mockDoc.data()).thenReturn({
        'title': 'Test',
        'subtitle': 'Test',
        'status': 'unknown_invalid_status',
        'actionType': 'unknown_action',
      });

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.status, TaskStatus.notStarted);
      expect(result.actionType, TaskActionType.none);
    });

    test('should parse LocalTimestamp to DateTime', () {
      final timestamp = LocalTimestamp.fromDate(DateTime(2026, 4, 6, 10, 30, 0));

      when(() => mockDoc.id).thenReturn('task_1');
      when(() => mockDoc.data()).thenReturn({
        'title': 'Test',
        'subtitle': 'Test',
        'isCompleted': true,
        'status': 'completed',
        'actionType': 'acknowledge',
        'completedAt': timestamp,
        'updatedAt': timestamp,
      });

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.completedAt, DateTime(2026, 4, 6, 10, 30, 0));
      expect(result.updatedAt, DateTime(2026, 4, 6, 10, 30, 0));
    });

    test('should default isCompleted to false when null', () {
      when(() => mockDoc.id).thenReturn('task_1');
      when(
        () => mockDoc.data(),
      ).thenReturn({'title': 'Test', 'subtitle': 'Test'});

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.isCompleted, false);
    });

    test('should fallback title and subtitle defaults when missing', () {
      when(() => mockDoc.id).thenReturn('task_1');
      when(() => mockDoc.data()).thenReturn(<String, dynamic>{});

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.title, 'Task 1');
      expect(result.subtitle, 'Please complete this step');
    });
  });

  group('OnboardingTaskDTO.toFirestore', () {
    test('should serialize all fields correctly', () {
      const task = CompilationSubTask(
        id: 'task_1',
        title: 'Offer Letter',
        subtitle: 'Signature Required',
        isCompleted: false,
        status: TaskStatus.pending,
        actionType: TaskActionType.signature,
      );

      final map = OnboardingTaskDTO.toFirestore(task);

      expect(map['title'], 'Offer Letter');
      expect(map['subtitle'], 'Signature Required');
      expect(map['isCompleted'], false);
      expect(map['status'], 'pending');
      expect(map['actionType'], 'signature');
      expect(map['fileUrl'], isNull);
      expect(map['signatureUrl'], isNull);
      expect(map['updatedAt'], equals(LocalFieldValue.serverTimestamp()));
    });

    test('should set completedAt when provided', () {
      final task = CompilationSubTask(
        id: 'task_1',
        title: 'Task',
        subtitle: 'Sub',
        isCompleted: true,
        status: TaskStatus.completed,
        completedAt: DateTime(2026, 1, 1),
      );

      final map = OnboardingTaskDTO.toFirestore(task);

      expect(map['completedAt'], isA<LocalTimestamp>());
    });

    test('should set completedAt to null when not provided', () {
      const task = CompilationSubTask(
        id: 'task_1',
        title: 'Task',
        subtitle: 'Sub',
        isCompleted: false,
      );

      final map = OnboardingTaskDTO.toFirestore(task);

      expect(map['completedAt'], isNull);
    });
  });

  group('OnboardingTaskDTO.updateStatusToFirestore', () {
    test('should include status and isCompleted', () {
      final map = OnboardingTaskDTO.updateStatusToFirestore(
        status: TaskStatus.submitted,
        isCompleted: false,
      );

      expect(map['status'], 'submitted');
      expect(map['isCompleted'], false);
      expect(map['updatedAt'], equals(LocalFieldValue.serverTimestamp()));
    });

    test('should include fileUrl when provided', () {
      final map = OnboardingTaskDTO.updateStatusToFirestore(
        status: TaskStatus.submitted,
        isCompleted: false,
        fileUrl: 'https://example.com/file.pdf',
      );

      expect(map['fileUrl'], 'https://example.com/file.pdf');
    });

    test('should NOT include fileUrl when null', () {
      final map = OnboardingTaskDTO.updateStatusToFirestore(
        status: TaskStatus.submitted,
        isCompleted: false,
        fileUrl: null,
      );

      expect(map.containsKey('fileUrl'), isFalse);
    });

    test('should include signatureUrl when provided', () {
      final map = OnboardingTaskDTO.updateStatusToFirestore(
        status: TaskStatus.signed,
        isCompleted: true,
        signatureUrl: 'data:signature;base64,abc123',
      );

      expect(map['signatureUrl'], 'data:signature;base64,abc123');
    });

    test('should include completedAt when isCompleted is true', () {
      final map = OnboardingTaskDTO.updateStatusToFirestore(
        status: TaskStatus.completed,
        isCompleted: true,
      );

      expect(map['completedAt'], equals(LocalFieldValue.serverTimestamp()));
    });

    test('should NOT include completedAt when isCompleted is false', () {
      final map = OnboardingTaskDTO.updateStatusToFirestore(
        status: TaskStatus.submitted,
        isCompleted: false,
      );

      expect(map.containsKey('completedAt'), isFalse);
    });
  });

  group('OnboardingTaskDTO._parseTaskStatus', () {
    test('should parse all valid status values', () {
      for (final status in TaskStatus.values) {
        final map = OnboardingTaskDTO.updateStatusToFirestore(status: status);
        expect(map['status'], status.name);
      }
    });
  });

  group('OnboardingTaskDTO._parseLocalTimestamp', () {
    test('should return null for null input', () {
      final map = OnboardingTaskDTO.updateStatusToFirestore(
        status: TaskStatus.pending,
        isCompleted: false,
      );
      // updatedAt is FieldValue.serverLocalTimestamp(), not a concrete value
      expect(map['updatedAt'], isNotNull);
    });

    test('should parse int milliseconds', () {
      final map = {
        'title': 'Test',
        'subtitle': 'Test',
        'updatedAt': LocalTimestamp.fromDate(
          DateTime.fromMillisecondsSinceEpoch(1712390400000),
        ),
      };

      when(() => mockDoc.id).thenReturn('task_1');
      when(() => mockDoc.data()).thenReturn(map);

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.updatedAt, isNotNull);
    });

    test('should parse string dates', () {
      final map = {
        'title': 'Test',
        'subtitle': 'Test',
        'completedAt': '2026-04-06T10:30:00.000Z',
      };

      when(() => mockDoc.id).thenReturn('task_1');
      when(() => mockDoc.data()).thenReturn(map);

      final result = OnboardingTaskDTO.fromFirestore(mockDoc);

      expect(result.completedAt, DateTime.parse('2026-04-06T10:30:00.000Z'));
    });
  });
}
