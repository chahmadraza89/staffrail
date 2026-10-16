// --- REUSABLE ACCORDION CARD ---
// ignore_for_file: deprecated_member_use

import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/screens/widget/employee_complication_inner_screen.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class EmployeeCompilationCard extends StatefulWidget {
  final CompilationTask task;
  final bool initiallyExpanded;

  const EmployeeCompilationCard({
    super.key,
    required this.task,
    this.initiallyExpanded = false,
  });

  @override
  State<EmployeeCompilationCard> createState() =>
      _EmployeeCompilationCardState();
}

class _EmployeeCompilationCardState extends State<EmployeeCompilationCard>
    with SingleTickerProviderStateMixin {
  late bool _isExpanded;
  late AnimationController _controller;
  late Animation<double> _expandAnimation;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );

    _expandAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOutCubic,
    );

    if (_isExpanded) _controller.value = 1.0;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleExpansion() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;

    const Color greyBorder = Color(0xFFF1F5F9);
    // const Color textMuted = Color(0xFF64748B);

    final double padding = isMobile ? 16.0 : 20.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // --- HEADER ROW (Cleaned up for single, native hover) ---
          Material(
            color: Colors.transparent, // Required for InkWell to show colors
            child: InkWell(
              onTap: _toggleExpansion,
              borderRadius: BorderRadius.circular(16),
              // 🔥 Flutter's native hover! No duplication.
              hoverColor: Colors.grey.shade50,
              // Soft splash when tapped
              splashColor: AppColors.primaryColor.withValues(alpha: 0.05),
              highlightColor: Colors.transparent,
              child: Padding(
                padding: EdgeInsets.all(padding),
                child: Row(
                  children: [
                    Icon(
                      widget.task.isCompleted
                          ? Icons.check_circle_outline_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: widget.task.isCompleted
                          ? AppColors.primaryColor
                          : Colors.grey.shade400,
                      size: 26,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.task.title,
                            style: TextStyle(
                              fontSize: isMobile ? 15 : 16,
                              fontWeight: FontWeight.w600,
                              // color: AppCol,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.task.subtitle,
                            style: TextStyle(
                              fontSize: isMobile ? 13 : 14,
                              color: Colors.grey.withValues(alpha: 0.8),
                            ),
                          ),
                        ],
                      ),
                    ),
                    AnimatedRotation(
                      turns: _isExpanded ? 0.5 : 0.0,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOutCubic,
                      child: Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // --- EXPANDABLE CONTENT ---
          SizeTransition(
            sizeFactor: _expandAnimation,
            child: Column(
              children: [
                const Divider(height: 1, thickness: 1, color: greyBorder),
                Padding(
                  padding: EdgeInsets.fromLTRB(padding, 12, padding, padding),
                  child: Column(
                    children: widget.task.subTasks.map((subTask) {
                      return CompilationSubTaskTile(
                        // espically check this one
                        subTask: subTask,
                        isMobile: isMobile,
                        onTap: () {
                          // ── ROUTE DISPATCHER ──────────────────────────────────────
                          // Dynamically route based on Task ID or Category.

                          // 1. Training Detail Routing (Category 6)
                          if (widget.task.id == 'training_compliance') {
                            context.goNamed(
                              UserRouteNames.trainingDetail,
                              extra: {
                                'trainingId': subTask.id,
                                'trainingTitle': subTask.title,
                                'status': subTask.status == TaskStatus.completed
                                    ? TrainingStatus.completed
                                    : TrainingStatus.pending,
                                // Metadata for individual audit PDF
                                'employeeId': subTask.employeeId,
                                'employeeName': subTask.employeeName,
                              },
                            );
                            return;
                          }

                          // 2. Clearance Detail Routing (Category 7)
                          if (widget.task.id == 'clearance') {
                            context.goNamed(
                              UserRouteNames.clearanceDetail,
                              pathParameters: {'clearanceId': subTask.id},
                            );
                            return;
                          }

                          // 3. Standard Onboarding Task Detail (Categories 1-5)
                          context.goNamed(
                            UserRouteNames.taskDetail,
                            pathParameters: {'taskId': subTask.id},
                            extra: {
                              'taskTitle': subTask.title,
                              'taskSubtitle': subTask.subtitle,
                              'currentStatus': subTask.status,
                              'icon': subTask.subtitleIcon,
                            },
                          );
                        },
                      );
                    }).toList(),
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
