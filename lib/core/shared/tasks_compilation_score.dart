import 'package:bhmh/core/utils/theme.dart';
import 'package:flutter/material.dart';

class TasksCompilationScore extends StatefulWidget {
  final int totalTasks;
  final int completedTasks;

  const TasksCompilationScore({
    super.key,
    required this.totalTasks, // Default values matching your image
    required this.completedTasks,
  });

  @override
  State<TasksCompilationScore> createState() => _TasksCompilationScoreState();
}

class _TasksCompilationScoreState extends State<TasksCompilationScore> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    // 🌐 Unified responsive check
    final bool isMobile = context.screenWidth < 600;

    // Safety check to avoid division by zero
    final double targetProgress = widget.totalTasks == 0
        ? 0.0
        : widget.completedTasks / widget.totalTasks;

    // Colors matching your design
    const Color tealColor = Color(0xFF109B85); // Main Teal
    const Color trackColor = Color(
      0xFFF1F5F9,
    ); // Light Grey for the bar background
    const Color textDark = Color(0xFF1E293B); // Slate-800 for the title

    // Dynamic Sizing
    final double padding = isMobile ? 16.0 : 20.0;
    final double titleSize = isMobile ? 16.0 : 18.0;
    final double percentSize = isMobile ? 16.0 : 18.0;
    final double footerSize = isMobile ? 12.0 : 13.0;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        // Subtle Web Hover Lift
        transform: Matrix4.translationValues(
          0,
          _isHovering && !isMobile ? -2 : 0,
          0,
        ),
        padding: EdgeInsets.all(padding),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: _isHovering ? 0.05 : 0.02),
              blurRadius: _isHovering ? 16 : 8,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: Colors.grey.shade100, width: 1),
        ),

        // 🌟 The Magic: TweenAnimationBuilder handles both the bar and the text!
        child: TweenAnimationBuilder<double>(
          tween: Tween<double>(begin: 0.0, end: targetProgress),
          duration: const Duration(milliseconds: 1200),
          curve: Curves.easeOutCubic, // Organic deceleration
          builder: (context, animatedValue, child) {
            final currentPercentage = (animatedValue * 100).toInt();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // --- TOP ROW: Title & Percentage ---
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Overall Progress',
                      style: TextStyle(
                        fontSize: titleSize,
                        fontWeight: FontWeight.w600,
                        color: textDark,
                      ),
                    ),
                    Text(
                      '$currentPercentage%',
                      style: TextStyle(
                        fontSize: percentSize,
                        fontWeight: FontWeight.bold,
                        color: tealColor,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // --- MIDDLE: Thick Linear Progress Bar ---
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: animatedValue,
                    minHeight: 8, // A nice thick bar like the image
                    backgroundColor: trackColor,
                    valueColor: const AlwaysStoppedAnimation<Color>(tealColor),
                  ),
                ),

                const SizedBox(height: 12),

                // --- BOTTOM ROW: Context Footer ---
                Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline_rounded,
                      color: tealColor,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${widget.completedTasks} of ${widget.totalTasks} tasks completed',
                      style: TextStyle(
                        fontSize: footerSize,
                        color: tealColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
