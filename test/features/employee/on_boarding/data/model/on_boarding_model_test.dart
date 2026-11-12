// Unit tests for Onboarding models (CompilationTask, CompilationSubTask, TaskStatus, TaskActionType)

import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TaskStatus enum', () {
    test('should have all expected status values', () {
      expect(TaskStatus.values.length, 16);
      expect(TaskStatus.notStarted.name, 'notStarted');
      expect(TaskStatus.pending.name, 'pending');
      expect(TaskStatus.submitted.name, 'submitted');
      expect(TaskStatus.waitingForApprover.name, 'waitingForApprover');
      expect(
        TaskStatus.pendingEmployerSignature.name,
        'pendingEmployerSignature',
      );
      expect(TaskStatus.rejected.name, 'rejected');
      expect(TaskStatus.acknowledged.name, 'acknowledged');
      expect(TaskStatus.completed.name, 'completed');
      expect(TaskStatus.verified.name, 'verified');
      expect(TaskStatus.signed.name, 'signed');
      expect(TaskStatus.confirmed.name, 'confirmed');
      expect(TaskStatus.cleared.name, 'cleared');
      expect(TaskStatus.required.name, 'required');
      expect(TaskStatus.expired.name, 'expired');
      expect(TaskStatus.underReview.name, 'underReview');
      expect(TaskStatus.noActionRequired.name, 'noActionRequired');
    });

    test('should return correct enum by index', () {
      expect(TaskStatus.values[0], TaskStatus.notStarted);
      expect(TaskStatus.values.byName('completed'), TaskStatus.completed);
    });
  });

  group('TaskActionType enum', () {
    test('should have all expected action types', () {
      expect(TaskActionType.values.length, 8);
      expect(TaskActionType.acknowledge.name, 'acknowledge');
      expect(TaskActionType.acknowledgeSign.name, 'acknowledgeSign');
      expect(TaskActionType.upload.name, 'upload');
      expect(TaskActionType.signature.name, 'signature');
      expect(TaskActionType.form.name, 'form');
      expect(TaskActionType.fillAndSign.name, 'fillAndSign');
      expect(TaskActionType.splitField.name, 'splitField');
      expect(TaskActionType.none.name, 'none');
    });
  });

  group('CompilationTask', () {
    test('should create with default empty subTasks', () {
      const task = CompilationTask(
        id: 'test_task',
        title: 'Test Task',
        subtitle: 'Subtitle',
        isCompleted: false,
      );

      expect(task.id, 'test_task');
      expect(task.title, 'Test Task');
      expect(task.subtitle, 'Subtitle');
      expect(task.isCompleted, false);
      expect(task.subTasks, isEmpty);
    });

    test('should create with subTasks', () {
      const subTask = CompilationSubTask(
        id: 'sub1',
        title: 'Sub Task 1',
        subtitle: 'Required',
      );

      const task = CompilationTask(
        id: 'parent',
        title: 'Parent Task',
        subtitle: '0 of 1 completed',
        isCompleted: false,
        subTasks: [subTask],
      );

      expect(task.subTasks.length, 1);
      expect(task.subTasks.first.id, 'sub1');
    });

    test('copyWith should update specified fields', () {
      const original = CompilationTask(
        id: 'task1',
        title: 'Original',
        subtitle: 'Old subtitle',
        isCompleted: false,
      );

      final updated = original.copyWith(
        title: 'Updated Title',
        isCompleted: true,
      );

      expect(updated.title, 'Updated Title');
      expect(updated.isCompleted, true);
      expect(updated.id, 'task1'); // unchanged
      expect(updated.subtitle, 'Old subtitle'); // unchanged
    });

    test('copyWith with no args should return identical copy', () {
      const original = CompilationTask(
        id: 'task1',
        title: 'Title',
        subtitle: 'Subtitle',
        isCompleted: false,
      );

      final copy = original.copyWith();

      expect(copy, original);
    });

    test('Equatable should consider tasks with same values as equal', () {
      const task1 = CompilationTask(
        id: 'task1',
        title: 'Title',
        subtitle: 'Subtitle',
        isCompleted: true,
      );
      const task2 = CompilationTask(
        id: 'task1',
        title: 'Title',
        subtitle: 'Subtitle',
        isCompleted: true,
      );

      expect(task1, task2);
    });

    test('Equatable should consider tasks with different ids as not equal', () {
      const task1 = CompilationTask(
        id: 'task1',
        title: 'Title',
        subtitle: 'Subtitle',
        isCompleted: true,
      );
      const task2 = CompilationTask(
        id: 'task2',
        title: 'Title',
        subtitle: 'Subtitle',
        isCompleted: true,
      );

      expect(task1 == task2, isFalse);
    });
  });

  group('CompilationSubTask', () {
    test('should create with default values', () {
      const subTask = CompilationSubTask(
        id: 'sub1',
        title: 'Sub Task',
        subtitle: 'Required',
      );

      expect(subTask.id, 'sub1');
      expect(subTask.title, 'Sub Task');
      expect(subTask.subtitle, 'Required');
      expect(subTask.isCompleted, false);
      expect(subTask.status, TaskStatus.notStarted);
      expect(subTask.actionType, TaskActionType.none);
      expect(subTask.fileUrl, isNull);
      expect(subTask.signatureUrl, isNull);
      expect(subTask.completedAt, isNull);
      expect(subTask.updatedAt, isNull);
    });

    test('should create with all fields populated', () {
      const subTask = CompilationSubTask(
        id: 'sub1',
        title: 'Full Task',
        subtitle: 'Complete',
        isCompleted: true,
        status: TaskStatus.completed,
        actionType: TaskActionType.upload,
        fileUrl: 'https://example.com/file.pdf',
        signatureUrl: 'https://example.com/signature.png',
      );

      expect(subTask.isCompleted, true);
      expect(subTask.status, TaskStatus.completed);
      expect(subTask.actionType, TaskActionType.upload);
      expect(subTask.fileUrl, 'https://example.com/file.pdf');
      expect(subTask.signatureUrl, 'https://example.com/signature.png');
    });

    test('copyWith should update specified fields', () {
      const original = CompilationSubTask(
        id: 'sub1',
        title: 'Sub Task',
        subtitle: 'Pending',
        status: TaskStatus.pending,
      );

      final updated = original.copyWith(
        status: TaskStatus.completed,
        isCompleted: true,
        fileUrl: 'https://example.com/doc.pdf',
      );

      expect(updated.status, TaskStatus.completed);
      expect(updated.isCompleted, true);
      expect(updated.fileUrl, 'https://example.com/doc.pdf');
      expect(updated.id, 'sub1'); // unchanged
      expect(updated.subtitle, 'Pending'); // unchanged
    });

    test('copyWith with no args should return identical copy', () {
      const original = CompilationSubTask(
        id: 'sub1',
        title: 'Sub Task',
        subtitle: 'Subtitle',
      );

      final copy = original.copyWith();

      expect(copy, original);
    });

    test('should support subtitleIcon as IconData', () {
      const subTask = CompilationSubTask(
        id: 'sub1',
        title: 'Icon Task',
        subtitle: 'With icon',
        subtitleIcon: Icons.person_outline,
      );

      expect(subTask.subtitleIcon, Icons.person_outline);
    });

    test('Equatable should consider subtasks with same values as equal', () {
      const sub1 = CompilationSubTask(
        id: 'sub1',
        title: 'Title',
        subtitle: 'Subtitle',
        isCompleted: true,
        status: TaskStatus.completed,
      );
      const sub2 = CompilationSubTask(
        id: 'sub1',
        title: 'Title',
        subtitle: 'Subtitle',
        isCompleted: true,
        status: TaskStatus.completed,
      );

      expect(sub1, sub2);
    });

    test(
      'Equatable should consider subtasks with different status as not equal',
      () {
        const sub1 = CompilationSubTask(
          id: 'sub1',
          title: 'Title',
          subtitle: 'Subtitle',
          status: TaskStatus.pending,
        );
        const sub2 = CompilationSubTask(
          id: 'sub1',
          title: 'Title',
          subtitle: 'Subtitle',
          status: TaskStatus.completed,
        );

        expect(sub1 == sub2, isFalse);
      },
    );
  });
}
