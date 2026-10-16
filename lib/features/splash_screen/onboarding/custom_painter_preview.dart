import 'package:flutter/material.dart';

class OnboardingIconPainter extends CustomPainter {
  final Color backgroundColor;
  final int effectType;

  OnboardingIconPainter({
    required this.backgroundColor,
    required this.effectType,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.fill;

    final path = Path();

    if (effectType == 0) {
      // Organic Blob (Smooth and asymmetrical)
      path.moveTo(size.width * 0.3, size.height * 0.1);
      path.cubicTo(size.width * 0.7, size.height * 0.0, size.width * 0.9, size.height * 0.3, size.width * 0.95, size.height * 0.6);
      path.cubicTo(size.width * 1.0, size.height * 0.9, size.width * 0.6, size.height * 1.0, size.width * 0.3, size.height * 0.85);
      path.cubicTo(size.width * 0.0, size.height * 0.7, size.width * 0.05, size.height * 0.3, size.width * 0.3, size.height * 0.1);
    } else if (effectType == 1) {
      // Squircle (Continuous rounded shape)
      final rect = Rect.fromLTWH(size.width * 0.05, size.height * 0.05, size.width * 0.9, size.height * 0.9);
      path.addRRect(RRect.fromRectAndRadius(rect, Radius.circular(size.width * 0.35)));
    } else {
      // Alternate Blob (A bit taller, soft shield/teardrop hybrid)
      path.moveTo(size.width * 0.5, size.height * 0.05);
      path.cubicTo(size.width * 0.95, size.height * 0.1, size.width * 1.0, size.height * 0.7, size.width * 0.5, size.height * 0.95);
      path.cubicTo(size.width * 0.0, size.height * 0.7, size.width * 0.05, size.height * 0.1, size.width * 0.5, size.height * 0.05);
    }

    path.close();
    canvas.drawPath(path, bgPaint);
  }

  @override
  bool shouldRepaint(covariant OnboardingIconPainter oldDelegate) {
    return oldDelegate.backgroundColor != backgroundColor ||
           oldDelegate.effectType != effectType;
  }
}

class AnimatedOnboardingIcon extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color backgroundColor;
  final int effectType;
  final bool isActive;

  const AnimatedOnboardingIcon({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.backgroundColor,
    required this.effectType,
    this.isActive = true, // Defaults to true if not provided
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedScale(
        scale: isActive ? 1.0 : 0.7,
        duration: const Duration(milliseconds: 600),
        curve: Curves.elasticOut, // Modern trendy bounce
        child: AnimatedOpacity(
          opacity: isActive ? 1.0 : 0.3,
          duration: const Duration(milliseconds: 300),
          child: SizedBox(
            height: 140,
            width: 140,
            child: CustomPaint(
              painter: OnboardingIconPainter(
                backgroundColor: backgroundColor,
                effectType: effectType,
              ),
              child: Center(child: Icon(icon, size: 64, color: iconColor)),
            ),
          ),
        ),
      ),
    );
  }
}
