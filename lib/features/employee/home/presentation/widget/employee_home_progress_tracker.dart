import 'package:bhmh/core/utils/theme.dart';
import 'package:flutter/material.dart';

class EmployeeHomeProgressTracker extends StatelessWidget {
  final int totalSteps;
  final int completedSteps;
  final String title;

  const EmployeeHomeProgressTracker({
    super.key,
    this.totalSteps = 6,
    this.completedSteps = 3,
    this.title = 'Onboarding Progress',
  });

  @override
  Widget build(BuildContext context) {
    // 🌐 Unified responsive check
    final bool isMobile = context.screenWidth < 600;

    // Calculations
    final double progress = totalSteps == 0 ? 0 : completedSteps / totalSteps;

    // Exact colors from your image
    const Color primaryTeal = Color(0xFF109B85); // The rich teal
    const Color trackColor = Color(0xFFE2E8F0); // The light grey background
    const Color titleColor = Color(0xFF0F172A); // The dark navy/black
    const Color subtitleColor = Color(0xFF64748B); // The muted grey-blue

    // Responsive sizing
    final double padding = isMobile ? 16.0 : 18.0;
    final double circleSize = isMobile ? 50.0 : 60.0;
    final double titleSize = isMobile ? 16.0 : 18.0;
    final double subtitleSize = isMobile ? 13.0 : 14.0;

    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // --- TOP ROW: Text & Circular Progress ---
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Text Column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: titleSize,
                        fontWeight: FontWeight.w600,
                        color: titleColor,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$completedSteps of $totalSteps steps completed',
                      style: TextStyle(
                        fontSize: subtitleSize,
                        fontWeight: FontWeight.w400,
                        color: subtitleColor,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 16),

              // Animated Circular Progress
              SizedBox(
                width: circleSize,
                height: circleSize,
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0.0, end: progress),
                  duration: const Duration(milliseconds: 1200),
                  curve: Curves.easeOutCubic,
                  builder: (context, animatedValue, child) {
                    final percentage = (animatedValue * 100).toInt();
                    return Stack(
                      fit: StackFit.expand,
                      children: [
                        CircularProgressIndicator(
                          value: animatedValue,
                          strokeWidth: 5,
                          backgroundColor: trackColor,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            primaryTeal,
                          ),
                          strokeCap: StrokeCap.round, // Rounded ends!
                        ),
                        Center(
                          child: Text(
                            '$percentage%',
                            style: TextStyle(
                              fontSize: isMobile ? 12 : 14,
                              fontWeight: FontWeight.w600,
                              color: primaryTeal,
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // --- BOTTOM ROW: Segmented Progress Bar ---
          Row(
            children: List.generate(totalSteps, (index) {
              final isCompleted = index < completedSteps;
              return Expanded(
                child: Container(
                  height: 6,
                  margin: EdgeInsets.only(
                    // Add spacing between segments, but not after the last one
                    right: index == totalSteps - 1 ? 0 : 6.0,
                  ),
                  decoration: BoxDecoration(
                    color: isCompleted ? primaryTeal : trackColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
