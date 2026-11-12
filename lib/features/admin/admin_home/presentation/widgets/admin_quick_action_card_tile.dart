// ============================================================================
// 2. THE MODERN ACTION CARD (WITH 4 MICRO-ANIMATIONS)
// ============================================================================

import 'package:bhmh/core/extensions/app_size.dart';
import 'package:flutter/material.dart';

class QuickActionCard extends StatefulWidget {
  final int index;
  final String title;
  final IconData icon;
  final VoidCallback onTap;

  const QuickActionCard({
    super.key,
    required this.index,
    required this.title,
    required this.icon,
    required this.onTap,
  });

  @override
  State<QuickActionCard> createState() => _QuickActionCardState();
}

class _QuickActionCardState extends State<QuickActionCard> {
  bool _isHovering = false;
  bool _isPressed = false; // Tracks physical taps

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;
    const Color primaryTeal = Color(0xFF109B85); // Brand Teal

    // 🚀 MICRO-ANIMATION 1: Staggered Entrance
    // Uses the widget's index to calculate a delay, making them cascade in sequentially.
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 400 + (widget.index * 150)),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - value)), // Slides up 20px
          child: Opacity(
            opacity: value, // Fades in
            child: child,
          ),
        );
      },
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovering = true),
        onExit: (_) => setState(() => _isHovering = false),
        child: GestureDetector(
          // 🚀 MICRO-ANIMATION 2: Tactile Press Tracking
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapUp: (_) {
            setState(() => _isPressed = false);
            widget.onTap(); // Fire the actual tap event
          },
          onTapCancel: () => setState(() => _isPressed = false),

          // The Scale Animation handles the "Squish" effect
          child: AnimatedScale(
            scale: _isPressed ? 0.96 : 1.0, // Shrinks to 96% when tapped
            duration: const Duration(milliseconds: 100),
            curve: Curves.easeOutCubic,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOutCirc,
              // 🚀 MICRO-ANIMATION 3: Hover Lift (Disabled if currently pressing)
              transform: Matrix4.translationValues(
                0,
                (_isHovering && !isMobile && !_isPressed) ? -4 : 0,
                0,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20), // Squircles
                border: Border.all(
                  color: _isHovering
                      ? primaryTeal.withValues(alpha: 0.4)
                      : Colors.grey.shade200,
                  width: 1.5,
                ),
                boxShadow: [
                  // 🚀 MICRO-ANIMATION 4: Dynamic Shadow Bloom
                  BoxShadow(
                    color: primaryTeal.withValues(alpha: _isHovering && !_isPressed ? 0.08 : 0.0,
                    ),
                    blurRadius: _isHovering ? 20 : 0,
                    offset: Offset(0, _isHovering ? 8 : 4),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Modern Tinted Icon Container
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: primaryTeal.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(widget.icon, color: primaryTeal, size: 26),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      widget.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
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
