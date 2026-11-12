// ignore_for_file: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
// ─────────────────────────────────────────────
// MOBILE TILE
// ─────────────────────────────────────────────

class ProfileActionTile extends StatefulWidget {
  final IconData leadingIcon;
  final String label;
  final Color containerColor;
  final VoidCallback onTap;

  const ProfileActionTile({
    super.key,
    required this.leadingIcon,
    required this.label,
    required this.onTap,
    this.containerColor = const Color(0xFF1D9E75),
  });

  @override
  State<ProfileActionTile> createState() => _ProfileActionTileState();
}

class _ProfileActionTileState extends State<ProfileActionTile> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    const Color accentColor = Color(0xFF1D9E75);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          curve: Curves.easeOut,
          transform: Matrix4.identity()..scale(_isPressed ? 0.97 : 1.0),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            color: _isPressed ? const Color(0xFFE1F5EE) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _isPressed
                  ? const Color(0xFF9FE1CB)
                  : Colors.black.withValues(alpha: 0.07),
              width: 0.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: _isPressed
                        ? const Color(0xFFB8E8D8)
                        // : const Color(0xFFF0F0F0),
                        : widget.containerColor.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    widget.leadingIcon,
                    size: 18,
                    color: _isPressed ? accentColor : Colors.black,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    widget.label,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                      letterSpacing: 0.1,
                    ),
                  ),
                ),
                AnimatedRotation(
                  turns: _isPressed ? 0.03 : 0,
                  duration: const Duration(milliseconds: 160),
                  child: Icon(
                    LucideIcons.chevronRight,
                    size: 16,
                    color: _isPressed ? accentColor : Colors.black26,
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

// ─────────────────────────────────────────────
// WEB TILE (used inside ProfileActionTileGroup)
// ─────────────────────────────────────────────

class ProfileActionWebTile extends StatefulWidget {
  final IconData leadingIcon;
  final String label;
  final VoidCallback onTap;
  final bool isFirst;
  final bool isLast;

  const ProfileActionWebTile({
    super.key,
    required this.leadingIcon,
    required this.label,
    required this.onTap,
    this.isFirst = false,
    this.isLast = false,
  });

  @override
  State<ProfileActionWebTile> createState() => _ProfileActionWebTileState();
}

class _ProfileActionWebTileState extends State<ProfileActionWebTile> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    const Color accentColor = Color(0xFF1D9E75);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: _isHovering ? const Color(0xFFF4FAF8) : Colors.white,
            borderRadius: BorderRadius.vertical(
              top: widget.isFirst ? const Radius.circular(12) : Radius.zero,
              bottom: widget.isLast ? const Radius.circular(12) : Radius.zero,
            ),
            border: Border(
              left: BorderSide(
                color: _isHovering ? accentColor : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _isHovering
                        ? const Color(0xFFE1F5EE)
                        : const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Icon(
                    widget.leadingIcon,
                    size: 16,
                    color: _isHovering ? accentColor : Colors.black45,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: AnimatedDefaultTextStyle(
                    duration: const Duration(milliseconds: 180),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.1,
                      color: _isHovering ? Colors.black87 : Colors.black54,
                    ),
                    child: Text(widget.label),
                  ),
                ),
                AnimatedSlide(
                  offset: _isHovering ? const Offset(0.25, 0) : Offset.zero,
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOut,
                  child: Icon(
                    LucideIcons.chevronRight,
                    size: 16,
                    color: _isHovering ? accentColor : Colors.black26,
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
