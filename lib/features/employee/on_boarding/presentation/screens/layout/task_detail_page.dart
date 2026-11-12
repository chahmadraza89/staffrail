import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/mobile/task_detail_mobile.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/web/tasks_detail_web.dart';
import 'package:flutter/material.dart';

class TaskDetailPage extends StatelessWidget {
  final String taskId;
  final String taskTitle;
  final String taskSubtitle;
  final TaskStatus? currentStatus;
  final IconData? icon;

  const TaskDetailPage({
    super.key,
    required this.taskId,
    required this.taskTitle,
    required this.taskSubtitle,
    this.currentStatus,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => TaskDetailMobile(
        taskId: taskId,
        taskTitle: taskTitle,
        taskSubtitle: taskSubtitle,
        currentStatus: currentStatus,
        icon: icon,
      ),
      web: (_) => TasksDetailWeb(
        taskId: taskId,
        taskTitle: taskTitle,
        taskSubtitle: taskSubtitle,
        currentStatus: currentStatus,
        icon: icon,
      ),
    );
  }
}
