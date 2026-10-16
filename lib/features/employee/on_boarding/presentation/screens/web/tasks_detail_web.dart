import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/task_detail_data.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class TasksDetailWeb extends StatelessWidget {
  final String taskId;
  final String taskTitle;
  final String taskSubtitle;
  final TaskStatus? currentStatus;
  final IconData? icon;

  const TasksDetailWeb({
    super.key,
    required this.taskId,
    required this.taskTitle,
    required this.taskSubtitle,
    this.currentStatus,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: const Text("Tasks Detail"),
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(UserRoutes.guide);
          }
        },
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(
              vertical: context.screenHeight * 0.02,
              horizontal: context.screenWidth * 0.01,
            ),
            child: TaskDetailScreen(
              taskId: taskId,
              taskTitle: taskTitle,
              taskSubtitle: taskSubtitle,
              currentStatus: currentStatus,
              icon: icon,
            ),
          ),
        ),
      ),
    );
  }
}
