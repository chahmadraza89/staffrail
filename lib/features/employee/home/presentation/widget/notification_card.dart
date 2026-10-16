import 'package:bhmh/core/utils/theme.dart';
import 'package:flutter/material.dart';

class NewActivityCard extends StatefulWidget {
  final String title;
  final String message;
  final VoidCallback onTap;

  const NewActivityCard({
    super.key,
    this.title = 'New Activity',
    this.message = 'A new puzzle is available for you to explore!',
    required this.onTap,
  });

  @override
  State<NewActivityCard> createState() => _NewActivityCardState();
}

class _NewActivityCardState extends State<NewActivityCard> {
  // Used to trigger the smooth 2026 hover lift on Web
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    // 🌐 Unified responsive check
    final bool isMobile = MediaQuery.of(context).size.width < 600;

    // Dynamic sizing based on the screen type
    final double paddingVertical = isMobile ? 16.0 : 20.0;
    final double paddingHorizontal = isMobile ? 18.0 : 22.0;
    final double titleSize = isMobile ? 15.0 : 16.0;
    final double messageSize = isMobile ? 13.0 : 14.0;
    final double iconBgSize = isMobile ? 44.0 : 48.0;

    // --- 2026 Entrance Animation: The Soft Depth Fade ---
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      switchInCurve: Curves.easeInOutCubic, // Use the organic curve standard
      transitionBuilder: (Widget child, Animation<double> animation) {
        return FadeTransition(
          opacity: animation,
          child: ScaleTransition(
            // Soft micro-scale: 98% to 100%
            scale: Tween<double>(begin: 0.98, end: 1.0).animate(animation),
            child: child,
          ),
        );
      },
      // We wrap the list item so it can animate into view
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12.0), // Spacing between items
        child: MouseRegion(
          onEnter: (_) => setState(() => _isHovering = true),
          onExit: (_) => setState(() => _isHovering = false),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            // Subtle lift on web hover
            transform: Matrix4.translationValues(
              0,
              _isHovering && !isMobile ? -3 : 0,
              0,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: _isHovering ? 0.06 : 0.02),
                  blurRadius: _isHovering ? 12 : 8,
                  offset: const Offset(0, 4),
                ),
              ],
              // A faint border gives it crispness on white dashboards
              border: Border.all(color: Colors.grey.shade100, width: 1),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: widget.onTap,
                borderRadius: BorderRadius.circular(16),
                splashColor: const Color(
                  0xFF109B85,
                ).withValues(alpha: 0.1), // Gentle Teal ripple
                highlightColor: Colors.transparent,
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    vertical: paddingVertical,
                    horizontal: paddingHorizontal,
                  ),
                  child: Row(
                    children: [
                      // 1. Teal Activity Icon with soft background
                      Container(
                        width: iconBgSize,
                        height: iconBgSize,
                        decoration: BoxDecoration(
                          color: const Color(
                            0xFF109B85,
                          ).withValues(alpha: 0.1), // 10% Teal
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.notifications_active_rounded,
                          color: Color(0xFF109B85), // Teal
                          size: 22,
                        ),
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
                                color: Colors.black87,
                                letterSpacing: -0.3,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 3),
                            Text(
                              widget.message,
                              style: TextStyle(
                                fontSize: messageSize,
                                color: context.textSecondary,
                                height: 1.4,
                              ),
                              maxLines:
                                  2, // Allow message to wrap up to two lines
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(width: 12),

                      // 3. Trailing Chevron (indicates it's tappable)
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: Color(0xFFCBD5E1), // Light grey chevron
                        size: 24,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
