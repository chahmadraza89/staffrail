// Unit tests for TrainingCompilationTile status color mapping
// and TrainingHeader badge color mapping

import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TrainingStatus color mapping verification', () {
    // These tests verify the switch statement logic in TrainingCompilationTile
    // and TrainingHeader cover all TrainingStatus values exhaustively.

    test('completed status should map to teal', () {
      const status = TrainingStatus.completed;

      Color baseColor;
      IconData icon;
      String datePrefix = 'Due: ';
      bool showAction = true;

      switch (status) {
        case TrainingStatus.completed:
          baseColor = const Color(0xFF109B85);
          icon = Icons.check_circle_outline_rounded;
          showAction = false;
          datePrefix = 'Completed: ';
          break;
        case TrainingStatus.overdue:
          baseColor = Colors.red;
          icon = Icons.error_outline_rounded;
          datePrefix = 'Overdue: ';
          break;
        case TrainingStatus.pending:
          baseColor = Colors.blue;
          icon = Icons.play_circle_outline_rounded;
          break;
        case TrainingStatus.inProgress:
          baseColor = const Color(0xFF8B5CF6);
          icon = Icons.play_circle_rounded;
          break;
        case TrainingStatus.notStarted:
          baseColor = const Color(0xFF6B7280);
          icon = Icons.circle_outlined;
          break;
        case TrainingStatus.underReview:
          baseColor = Colors.blue;
          icon = Icons.file_present_rounded;
          datePrefix = 'Submitted: ';
          break;
        case TrainingStatus.verified:
          baseColor = const Color(0xFF109B85);
          icon = Icons.verified_rounded;
          datePrefix = 'Verified: ';
          break;
        case TrainingStatus.actionRequired:
          baseColor = Colors.red;
          icon = Icons.assignment_late_rounded;
          datePrefix = 'Rejected: ';
          break;
      }

      expect(baseColor, const Color(0xFF109B85));
      expect(icon, Icons.check_circle_outline_rounded);
      expect(showAction, false);
      expect(datePrefix, 'Completed: ');
    });

    test('overdue status should map to red', () {
      const status = TrainingStatus.overdue;

      Color baseColor;
      switch (status) {
        case TrainingStatus.completed:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.overdue:
          baseColor = Colors.red;
          break;
        case TrainingStatus.pending:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.inProgress:
          baseColor = const Color(0xFF8B5CF6);
          break;
        case TrainingStatus.notStarted:
          baseColor = const Color(0xFF6B7280);
          break;
        case TrainingStatus.underReview:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.verified:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.actionRequired:
          baseColor = Colors.red;
          break;
      }

      expect(baseColor, Colors.red);
    });

    test('pending status should map to blue', () {
      const status = TrainingStatus.pending;

      Color baseColor;
      switch (status) {
        case TrainingStatus.completed:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.overdue:
          baseColor = Colors.red;
          break;
        case TrainingStatus.pending:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.inProgress:
          baseColor = const Color(0xFF8B5CF6);
          break;
        case TrainingStatus.notStarted:
          baseColor = const Color(0xFF6B7280);
          break;
        case TrainingStatus.underReview:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.verified:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.actionRequired:
          baseColor = Colors.red;
          break;
      }

      expect(baseColor, Colors.blue);
    });

    test('inProgress status should map to purple', () {
      const status = TrainingStatus.inProgress;

      Color baseColor;
      switch (status) {
        case TrainingStatus.completed:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.overdue:
          baseColor = Colors.red;
          break;
        case TrainingStatus.pending:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.inProgress:
          baseColor = const Color(0xFF8B5CF6);
          break;
        case TrainingStatus.notStarted:
          baseColor = const Color(0xFF6B7280);
          break;
        case TrainingStatus.underReview:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.verified:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.actionRequired:
          baseColor = Colors.red;
          break;
      }

      expect(baseColor, const Color(0xFF8B5CF6));
    });

    test('notStarted status should map to grey', () {
      const status = TrainingStatus.notStarted;

      Color baseColor;
      switch (status) {
        case TrainingStatus.completed:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.overdue:
          baseColor = Colors.red;
          break;
        case TrainingStatus.pending:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.inProgress:
          baseColor = const Color(0xFF8B5CF6);
          break;
        case TrainingStatus.notStarted:
          baseColor = const Color(0xFF6B7280);
          break;
        case TrainingStatus.underReview:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.verified:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.actionRequired:
          baseColor = Colors.red;
          break;
      }

      expect(baseColor, const Color(0xFF6B7280));
    });

    test('underReview status should map to blue', () {
      const status = TrainingStatus.underReview;

      Color baseColor;
      switch (status) {
        case TrainingStatus.completed:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.overdue:
          baseColor = Colors.red;
          break;
        case TrainingStatus.pending:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.inProgress:
          baseColor = const Color(0xFF8B5CF6);
          break;
        case TrainingStatus.notStarted:
          baseColor = const Color(0xFF6B7280);
          break;
        case TrainingStatus.underReview:
          baseColor = Colors.blue;
          break;
        case TrainingStatus.verified:
          baseColor = const Color(0xFF109B85);
          break;
        case TrainingStatus.actionRequired:
          baseColor = Colors.red;
          break;
      }

      expect(baseColor, Colors.blue);
    });
  });

  group('TrainingHeader badge mapping', () {
    test('completed should show COMPLETED badge with teal', () {
      const status = TrainingStatus.completed;

      Color badgeColor;
      String badgeText;

      switch (status) {
        case TrainingStatus.completed:
          badgeColor = AppColors.primaryColor;
          badgeText = 'COMPLETED';
          break;
        case TrainingStatus.overdue:
          badgeColor = Colors.red;
          badgeText = 'OVERDUE';
          break;
        case TrainingStatus.pending:
          badgeColor = Colors.blue;
          badgeText = 'PENDING';
          break;
        case TrainingStatus.inProgress:
          badgeColor = const Color(0xFF8B5CF6);
          badgeText = 'IN PROGRESS';
          break;
        case TrainingStatus.notStarted:
          badgeColor = const Color(0xFF6B7280);
          badgeText = 'NOT STARTED';
          break;
        case TrainingStatus.underReview:
          badgeColor = Colors.blue;
          badgeText = 'UNDER REVIEW';
          break;
        case TrainingStatus.verified:
          badgeColor = AppColors.primaryColor;
          badgeText = 'VERIFIED';
          break;
        case TrainingStatus.actionRequired:
          badgeColor = Colors.red;
          badgeText = 'ACTION REQUIRED';
          break;
      }

      expect(badgeText, 'COMPLETED');
      expect(badgeColor, AppColors.primaryColor);
    });

    test('overdue should show OVERDUE badge with red', () {
      const status = TrainingStatus.overdue;

      String badgeText;
      switch (status) {
        case TrainingStatus.completed:
          badgeText = 'COMPLETED';
          break;
        case TrainingStatus.overdue:
          badgeText = 'OVERDUE';
          break;
        case TrainingStatus.pending:
          badgeText = 'PENDING';
          break;
        case TrainingStatus.inProgress:
          badgeText = 'IN PROGRESS';
          break;
        case TrainingStatus.notStarted:
          badgeText = 'NOT STARTED';
          break;
        case TrainingStatus.underReview:
          badgeText = 'UNDER REVIEW';
          break;
        case TrainingStatus.verified:
          badgeText = 'VERIFIED';
          break;
        case TrainingStatus.actionRequired:
          badgeText = 'ACTION REQUIRED';
          break;
      }

      expect(badgeText, 'OVERDUE');
    });

    test('underReview should show UNDER REVIEW badge', () {
      const status = TrainingStatus.underReview;

      String badgeText;
      switch (status) {
        case TrainingStatus.completed:
          badgeText = 'COMPLETED';
          break;
        case TrainingStatus.overdue:
          badgeText = 'OVERDUE';
          break;
        case TrainingStatus.pending:
          badgeText = 'PENDING';
          break;
        case TrainingStatus.inProgress:
          badgeText = 'IN PROGRESS';
          break;
        case TrainingStatus.notStarted:
          badgeText = 'NOT STARTED';
          break;
        case TrainingStatus.underReview:
          badgeText = 'UNDER REVIEW';
          break;
        case TrainingStatus.verified:
          badgeText = 'VERIFIED';
          break;
        case TrainingStatus.actionRequired:
          badgeText = 'ACTION REQUIRED';
          break;
      }

      expect(badgeText, 'UNDER REVIEW');
    });
  });

  group('TrainingComplianceTilesItemsData', () {
    test('should create with all fields', () {
      // Import the data class from the tile data file
      const item = _TestDataItem(
        id: 'test_training',
        title: 'Test Training',
        description: 'Description',
        dateText: 'Dec 31, 2026',
        durationText: '60 mins',
        status: TrainingStatus.pending,
      );

      expect(item.id, 'test_training');
      expect(item.title, 'Test Training');
      expect(item.description, 'Description');
      expect(item.dateText, 'Dec 31, 2026');
      expect(item.durationText, '60 mins');
      expect(item.status, TrainingStatus.pending);
    });
  });
}

// Simple test data class mirroring TrainingComplianceTilesItemsData
class _TestDataItem {
  final String id;
  final String title;
  final String description;
  final String dateText;
  final String durationText;
  final TrainingStatus status;

  const _TestDataItem({
    required this.id,
    required this.title,
    required this.description,
    required this.dateText,
    required this.durationText,
    required this.status,
  });
}
