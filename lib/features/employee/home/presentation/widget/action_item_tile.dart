import 'package:flutter/material.dart';

class ActionItemTile extends StatefulWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  // 🌟 THE SMART PROPERTY: Tells the tile if it is the currently active item
  final bool isSelected;

  const ActionItemTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
    this.isSelected =
        false, // Defaults to false for mobile or unselected states
  });

  @override
  State<ActionItemTile> createState() => _ActionItemTileState();
}

class _ActionItemTileState extends State<ActionItemTile> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    // 🌐 Unified responsive check
    // (Using standard MediaQuery so it works universally, replace with context.screenWidth if preferred)
    final bool isMobile = MediaQuery.sizeOf(context).width < 800;

    // Dynamic sizing for Web vs Mobile
    final double paddingVertical = isMobile ? 14.0 : 18.0;
    final double paddingHorizontal = isMobile ? 16.0 : 20.0;
    final double iconBgSize = isMobile ? 44.0 : 48.0;
    final double titleSize = isMobile ? 15.0 : 16.0;

    // Smart Colors for when the tile is actively selected on Web
    const Color activeBorderColor = Color(0xFF109B85); // Teal
    const Color activeBgColor = Color(0xFFF0FDFA); // Ultra-light Teal tint

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovering = true),
        onExit: (_) => setState(() => _isHovering = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          // Subtle lift on web hover (Disabled if already selected so it feels locked in)
          transform: Matrix4.translationValues(
            0,
            (_isHovering && !isMobile && !widget.isSelected) ? -2 : 0,
            0,
          ),
          decoration: BoxDecoration(
            // 🌟 SMART BACKGROUND: Highlights if selected
            color: widget.isSelected ? activeBgColor : Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              // Only show float shadow if not selected (selected items look pressed/locked in)
              if (!widget.isSelected)
                BoxShadow(
                  color: Colors.black.withValues(alpha: _isHovering ? 0.06 : 0.02),
                  blurRadius: _isHovering ? 12 : 8,
                  offset: const Offset(0, 4),
                ),
            ],
            // 🌟 SMART BORDER: Pops teal when active
            border: Border.all(
              color: widget.isSelected
                  ? activeBorderColor
                  : Colors.grey.shade100,
              width: widget.isSelected ? 1.5 : 1,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onTap,
              borderRadius: BorderRadius.circular(16),
              splashColor: widget.color.withValues(alpha: 0.1),
              highlightColor: Colors.transparent,
              child: Padding(
                padding: EdgeInsets.symmetric(
                  vertical: paddingVertical,
                  horizontal: paddingHorizontal,
                ),
                child: Row(
                  children: [
                    // 1. Color-coded Icon Background
                    Container(
                      width: iconBgSize,
                      height: iconBgSize,
                      decoration: BoxDecoration(
                        color: widget.color.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(widget.icon, color: widget.color, size: 22),
                    ),
                    const SizedBox(width: 16),

                    // 2. Text Column
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title,
                            style: TextStyle(
                              fontSize: titleSize,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF1E293B), // Slate 800
                              letterSpacing: -0.3,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.subtitle,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              color: Color(0xFF64748B), // Slate 500
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    // 3. Smart Trailing Chevron
                    Icon(
                      Icons.chevron_right_rounded,
                      // 🌟 Turns Teal when selected to point directly at the chat panel
                      color: widget.isSelected
                          ? activeBorderColor
                          : const Color(0xFFCBD5E1),
                      size: 24,
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
