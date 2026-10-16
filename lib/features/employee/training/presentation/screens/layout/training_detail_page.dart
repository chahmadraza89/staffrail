import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/screens/mobile/training_detail_mob.dart';
import 'package:bhmh/features/employee/training/presentation/screens/web/training_detail_web.dart';
import 'package:flutter/material.dart';

class TrainingDetailPage extends StatelessWidget {
  final String trainingId;
  final String trainingTitle;
  final String description;
  final String durationText;
  final TrainingStatus status;
  final DateTime? assignedAt;

  const TrainingDetailPage({
    super.key,
    required this.trainingId,
    required this.trainingTitle,
    required this.description,
    required this.durationText,
    required this.status,
    this.assignedAt,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => TrainingDetailMob(
        trainingId: trainingId,
        title: trainingTitle,
        description: description,
        durationText: durationText,
        status: status,
        assignedAt: assignedAt,
      ),
      web: (_) => TrainingDetailWeb(
        trainingId: trainingId,
        title: trainingTitle,
        description: description,
        durationText: durationText,
        status: status,
        assignedAt: assignedAt,
      ),
    );
  }
}
