import 'package:bhmh/core/shared/app_color.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/screens/widgets/training_timer_widget.dart';
import 'package:flutter/material.dart';

class TrainingCompilationTile extends StatefulWidget {
  final String title;
  final String dateText;
  final String durationText;
  final TrainingStatus status;
  final DateTime? assignedAt;
  final VoidCallback onTap;

  const TrainingCompilationTile({
    super.key,
    required this.title,
    required this.dateText,
    required this.durationText,
    required this.status,
    this.assignedAt,
    required this.onTap,
  });

  @override
  State<TrainingCompilationTile> createState() =>
      _TrainingCompilationTileState();
}

class _TrainingCompilationTileState extends State<TrainingCompilationTile> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    // 🌐 Unified responsive check
    final bool isMobile = context.screenWidth < 600;

    // --- Configuration based on Status ---
    Color baseColor;
    IconData icon;
    Color backgroundColor = Colors.white;
    String datePrefix = 'Due: ';
    bool showAction = true;

    switch (widget.status) {
      case TrainingStatus.completed:
        baseColor = const Color(0xFF109B85); // Teal
        icon = Icons.check_circle_outline_rounded;
        showAction = false; // Hide "View Details" if done
        datePrefix = 'Completed: ';
        break;
      case TrainingStatus.underReview:
        baseColor = modernBlue;
        icon = Icons.file_present_rounded;
        datePrefix = 'Submitted: ';
        break;
      case TrainingStatus.overdue:
        baseColor = modernRed; // Soft Red
        icon = Icons.error_outline_rounded;
        backgroundColor = mediumOrange; // 5% Red Tint for urgency
        datePrefix = 'Overdue: ';
        break;
      case TrainingStatus.pending:
        baseColor = modernBlue; // Modern Blue
        icon = Icons.play_circle_outline_rounded;
        break;
      case TrainingStatus.inProgress:
        baseColor = const Color(0xFF8B5CF6); // Purple
        icon = Icons.play_circle_rounded;
        break;
      case TrainingStatus.verified:
        baseColor = const Color(0xFF109B85); // Teal
        icon = Icons.verified_rounded;
        showAction = false;
        datePrefix = 'Verified: ';
        break;
      case TrainingStatus.actionRequired:
        baseColor = modernRed;
        icon = Icons.assignment_late_rounded;
        backgroundColor = mediumOrange;
        datePrefix = 'Rejected: ';
        break;
      case TrainingStatus.notStarted:
        baseColor = const Color(0xFF6B7280); // Grey
        icon = Icons.circle_outlined;
        break;
    }

    final double padding = isMobile ? 16.0 : 20.0;
    final double titleSize = isMobile ? 15.0 : 16.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovering = true),
        onExit: (_) => setState(() => _isHovering = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          // Subtle lift on Web hover
          transform: Matrix4.translationValues(
            0,
            _isHovering && !isMobile ? -3 : 0,
            0,
          ),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: _isHovering ? 0.06 : 0.02),
                blurRadius: _isHovering ? 12 : 8,
                offset: const Offset(0, 4),
              ),
            ],
            // Adds a slightly darker border if overdue to define the edge
            border: Border.all(
              color: widget.status == TrainingStatus.overdue
                  ? const Color(0xFFFECACA) // Soft red border
                  : Colors.grey.shade100,
              width: 1.5,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onTap,
              borderRadius: BorderRadius.circular(16),
              hoverColor: widget.status == TrainingStatus.overdue
                  ? Colors.red.withValues(alpha: 0.02)
                  : Colors.grey.shade50,
              splashColor: baseColor.withValues(alpha: 0.1),
              highlightColor: Colors.transparent,
              child: Padding(
                padding: EdgeInsets.all(padding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- TOP ROW: Icon, Title, Date ---
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status Icon
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: baseColor.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(icon, color: baseColor, size: 24),
                        ),
                        const SizedBox(width: 16),

                        // Text Content
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.title,
                                style: TextStyle(
                                  fontSize: titleSize,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF0F172A),
                                  letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(height: 6),

                              // Meta info row (Date & Duration)
                              Wrap(
                                spacing: 16,
                                runSpacing: 6,
                                children: [
                                  // Date Info
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.access_time_rounded,
                                        size: 14,
                                        color: baseColor,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '$datePrefix${widget.dateText}',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight:
                                              widget.status ==
                                                  TrainingStatus.overdue
                                              ? FontWeight
                                                    .w600 // Bold if overdue
                                              : FontWeight.w400,
                                          color:
                                              widget.status ==
                                                  TrainingStatus.overdue
                                              ? baseColor
                                              : const Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                  // Duration Info
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.description_outlined,
                                        size: 14,
                                        color: Color(0xFF64748B),
                                      ),
                                      const SizedBox(width: 4),
                                      TrainingTimerWidget(
                                        assignedAt: widget.assignedAt,
                                        durationText: widget.durationText,
                                        isCompleted: widget.status == TrainingStatus.completed,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // --- BOTTOM ROW: Action Button (Conditional) ---
                    if (showAction) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: baseColor.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          'View Details',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: baseColor,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
