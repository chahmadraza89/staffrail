import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/annual_training_form_view.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/initial_training_form_view.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/acknowledge_sign_action.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/fill_and_sign_action.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/form_action.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/signature_action.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/upload_action.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/split_field_form_view.dart';
import 'package:flutter/material.dart';

class CompletedActionMessage extends StatelessWidget {
  const CompletedActionMessage({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF109B85).withValues(alpha: 0.12),
            const Color(0xFF109B85).withValues(alpha: 0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF109B85).withValues(alpha: 0.3),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Color(0xFF109B85),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_rounded,
              size: 24,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 20),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Task Completed',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF109B85),
                    letterSpacing: -0.2,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'This task has been submitted successfully and is awaiting review.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF475569),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// 2nd
class ActionWidgetResolver extends StatelessWidget {
  final TaskStatus? taskStatus;
  final CompilationSubTask? task;
  final String title;
  final String taskId;

  const ActionWidgetResolver({
    super.key,
    required this.taskStatus,
    required this.task,
    required this.title,
    required this.taskId,
  });

  @override
  Widget build(BuildContext context) {
    if (task == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    final inferredAction = CompilationSubTask.inferActionType(
      title,
      task!.subtitle,
    );
    final actionType = (inferredAction == TaskActionType.splitField)
        ? TaskActionType.splitField
        : (task!.actionType == TaskActionType.none ||
              task!.actionType == TaskActionType.acknowledge)
        ? inferredAction
        : task!.actionType;

    // Explicit overrides for specialized forms that need FillAndSignAction schemas
    if (taskId == 'attestation_form' ||
        taskId == 'acknowledgement_of_vehicle_documentation' ||
        taskId == 'acknowledge_of_eoc_health_&_safety_policy' ||
        taskId == 'acknowledge_of_company_property') {
      return FillAndSignAction(
        key: ValueKey('fillsign_$taskId'),
        taskId: taskId,
        title: title,
      );
    }

    switch (actionType) {
      case TaskActionType.acknowledge:
      case TaskActionType.acknowledgeSign:
        return AcknowledgeSignAction(
          key: ValueKey('acksign_$taskId'),
          taskId: taskId,
          title: title,
        );
      case TaskActionType.upload:
        return UploadAction(
          key: ValueKey('upload_$taskId'),
          taskId: taskId,
          title: title,
        );
      case TaskActionType.signature:
        return SignatureAction(
          key: ValueKey('sig_$taskId'),
          taskId: taskId,
          title: title,
        );
      case TaskActionType.form:
        return FormAction(
          key: ValueKey('form_$taskId'),
          taskId: taskId,
          title: title,
        );
      case TaskActionType.none:
        return AcknowledgeSignAction(
          key: ValueKey('fallback_$taskId'),
          taskId: taskId,
          title: title,
        );
      case TaskActionType.fillAndSign:
        return FillAndSignAction(
          key: ValueKey('fillsign_$taskId'),
          taskId: taskId,
          title: title,
        );
      case TaskActionType.splitField:
        if (task!.id.toLowerCase().contains('annual')) {
          return AnnualTrainingFormView(
            taskId: task!.id,
            employeeId: task!.employeeId,
            title: title,
          );
        }
        if (task!.id.toLowerCase().contains('initial_training')) {
          return InitialTrainingFormView(
            taskId: task!.id,
            employeeId: task!.employeeId,
            title: title,
          );
        }
        return SplitFieldFormView(
          taskId: task!.id,
          employeeId: task!.employeeId,
          title: title,
        );
    }
  }
}
