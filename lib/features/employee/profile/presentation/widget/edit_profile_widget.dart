// ============================================================================
// 2. SUB-COMPONENTS & MICRO-ANIMATIONS
// ============================================================================

// The interactive field row (squishes when tapped)
import 'dart:typed_data';

import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';

class EditableFieldRow extends StatefulWidget {
  final String label;
  final String value;
  final bool isPlaceholder;
  final VoidCallback onTap;

  const EditableFieldRow({
    super.key,
    required this.label,
    required this.value,
    this.isPlaceholder = false,
    required this.onTap,
  });

  @override
  State<EditableFieldRow> createState() => _EditableFieldRowState();
}

class _EditableFieldRowState extends State<EditableFieldRow> {
  bool _isHovering = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      // 🚀 FIX 1: Tell MouseRegion to explicitly catch all hits within its bounds
      hitTestBehavior: HitTestBehavior.opaque,
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          widget.onTap();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: _isPressed ? 0.99 : 1.0,
          duration: const Duration(milliseconds: 100),
          curve: Curves.easeOutCubic,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            decoration: BoxDecoration(
              // 🚀 FIX 2: Use Colors.white instead of Colors.transparent.
              // Since the parent card is white, it looks identical, but gives Web a solid block of pixels to hit-test against!
              color: _isHovering ? const Color(0xFFF8FAFC) : Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Text(
                  widget.label,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF334155), // Slate 700
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    widget.value,
                    textAlign: TextAlign.end,
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: widget.isPlaceholder
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF64748B),
                    ),
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

// Avatar with the floating edit pencil badge
class AvatarWithEditBadge extends StatefulWidget {
  final String name;
  final Uint8List? selectedImageBytes;
  final String? photoUrl;
  final VoidCallback onEdit;

  const AvatarWithEditBadge({
    super.key,
    required this.name,
    this.selectedImageBytes,
    this.photoUrl,
    required this.onEdit,
  });

  @override
  State<AvatarWithEditBadge> createState() => _AvatarWithEditBadgeState();
}

class _AvatarWithEditBadgeState extends State<AvatarWithEditBadge> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final initials = widget.name.isNotEmpty
        ? widget.name[0].toUpperCase()
        : '?';

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: const BoxDecoration(
            color: Color(0xFFE2E8F0),
            shape: BoxShape.circle,
          ),
          child: ClipOval(
            child: widget.selectedImageBytes != null
                ? Image.memory(widget.selectedImageBytes!, fit: BoxFit.cover)
                : (widget.photoUrl != null && widget.photoUrl!.isNotEmpty
                    ? Image.network(
                        widget.photoUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Center(
                          child: Text(
                            initials,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF475569),
                            ),
                          ),
                        ),
                      )
                    : Center(
                        child: Text(
                          initials,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF475569),
                          ),
                        ),
                      )),
          ),
        ),
        Positioned(
          bottom: -4,
          right: -4,
          child: MouseRegion(
            cursor: SystemMouseCursors.click,
            child: GestureDetector(
              onTapDown: (_) => setState(() => _isPressed = true),
              onTapUp: (_) {
                setState(() => _isPressed = false);
                widget.onEdit();
              },
              onTapCancel: () => setState(() => _isPressed = false),
              child: AnimatedScale(
                scale: _isPressed ? 0.9 : 1.0,
                duration: const Duration(milliseconds: 100),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.grey.shade200, width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 6,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.edit_rounded,
                    size: 16,
                    color: Color(0xFF475569),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// Tactile animated save button matching the concept design
class AnimatedSaveButton extends StatefulWidget {
  final VoidCallback onPressed;
  final bool isLoading;
  final String label;

  const AnimatedSaveButton({
    super.key,
    required this.onPressed,
    this.isLoading = false,
    this.label = 'Save Changes',
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
      cursor: widget.isLoading
          ? SystemMouseCursors.basic
          : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        onTapDown: widget.isLoading
            ? null
            : (_) => setState(() => _isPressed = true),
        onTapUp: widget.isLoading
            ? null
            : (_) {
                setState(() => _isPressed = false);
                widget.onPressed();
              },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: _isPressed ? 0.97 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            decoration: BoxDecoration(
              color: widget.isLoading ? Colors.grey : primaryGreen,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: primaryGreen.withValues(
                    alpha: _isHovering && !_isPressed && !widget.isLoading
                        ? 0.3
                        : 0.0,
                  ),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
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
                  : Text(
                      widget.label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        letterSpacing: 0.3,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
