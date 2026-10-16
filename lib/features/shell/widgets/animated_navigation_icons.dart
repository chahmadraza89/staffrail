import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:flutter/material.dart';

class MyAnimatedIcon extends StatelessWidget {
  const MyAnimatedIcon({
    super.key,
    required this.icon,
    required this.isSelected,
    this.padding = 8,
    this.color,
  });
  final IconData icon;
  final bool isSelected;
  final double padding;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    Widget iconWidget = Padding(
      padding: EdgeInsets.symmetric(vertical: padding),
      child: Icon(
        icon,
        color: isSelected ? (color ?? Colors.white) : context.textSecondary,
      ),
    );

    if (isSelected && color == null) {
      iconWidget = ShaderMask(
        shaderCallback: (bounds) => AppGradients.primary.createShader(bounds),
        child: iconWidget,
      );
    }

    return AnimatedScale(
      duration: AppTheme.medium,
      scale: isSelected ? 1.10 : 1,
      child: iconWidget,
    );
  }
}
