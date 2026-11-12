// =============================================================================
// --- ANIMATED TACTILE BUTTON COMPONENT ---
// =============================================================================

import 'package:bhmh/core/extensions/app_size.dart';
import 'package:flutter/material.dart';

class AnimatedActionButton extends StatefulWidget {
  final String label;
  final IconData icon;
  final bool isDestructive;
  final bool isDisabled;
  final VoidCallback onTap;

  const AnimatedActionButton({
    super.key,
    required this.label,
    required this.icon,
    required this.isDestructive,
    required this.isDisabled,
    required this.onTap,
  });

  @override
  State<AnimatedActionButton> createState() => _AnimatedActionButtonState();
}

class _AnimatedActionButtonState extends State<AnimatedActionButton> {
  bool _isHovering = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 800;

    // Define color palettes
    final Color primaryColor = widget.isDestructive
        ? const Color(0xFFEF4444)
        : const Color(0xFF109B85);
    final Color bgColor = widget.isDestructive
        ? const Color(0xFFFEF2F2)
        : primaryColor;
    final Color textColor = widget.isDestructive ? primaryColor : Colors.white;
    final Color borderColor = widget.isDestructive
        ? const Color(0xFFFECACA)
        : primaryColor;

    return MouseRegion(
      onEnter: (_) => {
        if (!widget.isDisabled) setState(() => _isHovering = true),
      },
      onExit: (_) => {
        if (!widget.isDisabled) setState(() => _isHovering = false),
      },
      child: GestureDetector(
        onTapDown: (_) => {
          if (!widget.isDisabled) setState(() => _isPressed = true),
        },
        onTapUp: (_) {
          if (!widget.isDisabled) {
            setState(() => _isPressed = false);
            widget.onTap();
          }
        },
        onTapCancel: () => {
          if (!widget.isDisabled) setState(() => _isPressed = false),
        },

        // Tactile Squish Animation
        child: AnimatedScale(
          scale: _isPressed ? 0.97 : 1.0,
          duration: const Duration(milliseconds: 100),
          curve: Curves.easeOutCubic,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCirc,
            // Web Hover Lift Animation
            transform: Matrix4.translationValues(
              0,
              (_isHovering && !isMobile && !_isPressed) ? -3 : 0,
              0,
            ),
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
              color: widget.isDisabled ? Colors.grey.shade100 : bgColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: widget.isDisabled ? Colors.grey.shade200 : borderColor,
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: primaryColor.withValues(alpha: _isHovering && !_isPressed ? 0.15 : 0.0,
                  ),
                  blurRadius: _isHovering ? 20 : 0,
                  offset: Offset(0, _isHovering ? 8 : 0),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  widget.icon,
                  size: 20,
                  color: widget.isDisabled ? Colors.grey.shade400 : textColor,
                ),
                const SizedBox(width: 8),
                Text(
                  widget.label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: widget.isDisabled ? Colors.grey.shade400 : textColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// --- PRIVATE HELPER WIDGETS ---
// =============================================================================

class EmptyState extends StatelessWidget {
  final String message;
  const EmptyState({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.grey.shade200,
          style: BorderStyle.none,
          width: 2,
        ),
      ),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  final IconData icon;
  final String message;

  const ErrorState({super.key, required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 32, color: const Color(0xFFEF4444)),
          ),
          const SizedBox(height: 16),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
