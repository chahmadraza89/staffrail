import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';

class TrainingCounterCard extends StatefulWidget {
  final int index;
  final String title;
  final double targetValue;
  final String valueSuffix;
  final String? trendText;
  final IconData? icon;
  final Color
  themeColor; // You can pass AppColors.primary here or default to it
  final Color? valueColor;
  final bool hasDecor;
  final VoidCallback? onTap;

  const TrainingCounterCard({
    super.key,
    required this.index,
    required this.title,
    required this.targetValue,
    this.valueSuffix = '',
    this.trendText,
    this.icon,
    this.themeColor = AppColors.primaryColor, // Defaulted to primary
    this.valueColor,
    this.hasDecor = false,
    this.onTap,
  });

  @override
  State<TrainingCounterCard> createState() => _TrainingCounterCardState();
}

class _TrainingCounterCardState extends State<TrainingCounterCard> {
  bool _isHovering = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 400 + (widget.index * 150)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - value)),
          child: Opacity(opacity: value, child: child),
        );
      },
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovering = true),
        onExit: (_) => setState(() => _isHovering = false),
        child: GestureDetector(
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapUp: (_) {
            setState(() => _isPressed = false);
            widget.onTap?.call();
          },
          onTapCancel: () => setState(() => _isPressed = false),
          child: AnimatedScale(
            scale: _isPressed ? 0.97 : 1.0,
            duration: const Duration(milliseconds: 100),
            curve: Curves.easeOutCubic,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCirc,
              transform: Matrix4.translationValues(
                0,
                (_isHovering && !isMobile && !_isPressed) ? -4 : 0,
                0,
              ),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _isHovering
                      ? widget.themeColor.withValues(alpha: 0.4)
                      : widget.themeColor.withValues(alpha: 0.1), // Replaced Grey with Primary tint
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: widget.themeColor.withValues(alpha: _isHovering && !_isPressed ? 0.08 : 0.02),
                    blurRadius: _isHovering ? 24 : 16,
                    offset: Offset(0, _isHovering ? 8 : 4),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  if (widget.hasDecor)
                    Positioned(
                      right: -20,
                      top: -10,
                      child: Transform.rotate(
                        angle: 0.5,
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: widget.themeColor.withValues(alpha: 0.15), // Subtle decor
                              width: 6,
                            ),
                            borderRadius: BorderRadius.circular(24),
                          ),
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                widget.title,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,

                                  letterSpacing: -0.2,
                                ),
                              ),
                            ),
                            if (widget.icon != null)
                              Container(
                                padding: const EdgeInsets.all(8),
                                margin: const EdgeInsets.only(left: 12),
                                decoration: BoxDecoration(
                                  color: widget.themeColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  widget.icon,
                                  color: widget.themeColor,
                                  size: 16,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            TweenAnimationBuilder<double>(
                              tween: Tween<double>(
                                begin: 0.0,
                                end: widget.targetValue.toDouble(),
                              ),
                              duration: const Duration(milliseconds: 1500),
                              curve: Curves.easeOutExpo,
                                builder: (context, currentValue, child) {
                                  final safeValue = currentValue.isNaN || currentValue.isInfinite ? 0.0 : currentValue;
                                  return Text(
                                    '${widget.valueSuffix == '%' ? safeValue.toStringAsFixed(1) : safeValue.toInt()}${widget.valueSuffix}',
                                  style: TextStyle(
                                    fontSize: 36,
                                    fontWeight: FontWeight.w800,
                                    // color:
                                    //     widget.valueColor ??
                                    //     widget.themeColor, // Primary based
                                    letterSpacing: -1.0,
                                    height: 1.0,
                                  ),
                                );
                              },
                            ),
                            if (widget.trendText != null) ...[
                              const SizedBox(width: 12),
                              Padding(
                                padding: const EdgeInsets.only(bottom: 4.0),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.trending_up_rounded,
                                      color: widget
                                          .themeColor, // Using primary for trend
                                      size: 16,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      widget.trendText!,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        // color: widget
                                        //     .themeColor, // Using primary for trend
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
