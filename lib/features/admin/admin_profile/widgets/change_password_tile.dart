import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';

import 'package:flutter/material.dart';

// ============================================================================
// 1. MAIN CHANGE PASSWORD VIEW (Stateful for Real-Time Validation)
// ============================================================================
// ============================================================================
// 2. SUB-COMPONENTS & MICRO-ANIMATIONS
// ============================================================================

class AnimatedPasswordField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final bool obscureText;
  final VoidCallback onToggleVisibility;
  final FormFieldValidator<String>? validator;
  final bool isValid;
  final bool showSuccessCheck;
  final bool enabled;

  const AnimatedPasswordField({
    super.key,
    required this.controller,
    required this.label,
    required this.hint,
    required this.obscureText,
    required this.onToggleVisibility,
    this.validator,
    this.isValid = false,
    this.showSuccessCheck = false,
    this.enabled = true,
  });

  @override
  State<AnimatedPasswordField> createState() => _AnimatedPasswordFieldState();
}

class _AnimatedPasswordFieldState extends State<AnimatedPasswordField> {
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {});
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              widget.label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            if (widget.showSuccessCheck && widget.isValid) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.all(2),
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 10,
                  color: Colors.white,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 10),
        CustomTextField(
          controller: widget.controller,
          focusNode: _focusNode,
          isObscured: widget.obscureText,
          obscureText: true,
          onVisibilityToggle: (_) => widget.onToggleVisibility(),
          enabled: widget.enabled,
          validator: widget.validator,
          obscuringCharacter: '•',
          hintText: widget.hint,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF334155),
            letterSpacing: widget.obscureText ? 2.0 : 0.5,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: widget.isValid
                  ? const Color(0xFF10B981)
                  : Colors.grey.shade300,
              width: 1.5,
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: AppColors.primaryColor,
              width: 2,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
      ],
    );
  }
}

class ValidationRule extends StatelessWidget {
  final String label;
  final bool isValid;
  final bool isErrorState;

  const ValidationRule({
    super.key,
    required this.label,
    required this.isValid,
    this.isErrorState = false,
  });

  @override
  Widget build(BuildContext context) {
    Color dotColor = const Color(0xFF94A3B8);
    Color textColor = const Color(0xFF94A3B8);

    if (isValid) {
      dotColor = const Color(0xFF10B981);
      textColor = const Color(0xFF10B981);
    } else if (isErrorState) {
      dotColor = const Color(0xFFEF4444);
      textColor = const Color(0xFFEF4444);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              fontSize: 13,
              fontWeight: isValid ? FontWeight.w600 : FontWeight.w500,
              color: textColor,
            ),
            child: Text(label),
          ),
        ],
      ),
    );
  }
}

class AnimatedSaveButton extends StatefulWidget {
  final VoidCallback onPressed;
  final bool isLoading;
  const AnimatedSaveButton({
    super.key,
    required this.onPressed,
    this.isLoading = false,
  });

  @override
  State<AnimatedSaveButton> createState() => _AnimatedSaveButtonState();
}

class _AnimatedSaveButtonState extends State<AnimatedSaveButton> {
  bool _isHovering = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    const primaryGreen = AppColors.primaryColor;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      hitTestBehavior: HitTestBehavior.opaque,
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          widget.onPressed();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: _isPressed ? 0.97 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
              color: primaryGreen,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: primaryGreen.withValues(alpha: 
                    _isHovering && !_isPressed ? 0.3 : 0.0,
                  ),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Center(
              child: widget.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text(
                      'Change Password',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        letterSpacing: 0.5,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
