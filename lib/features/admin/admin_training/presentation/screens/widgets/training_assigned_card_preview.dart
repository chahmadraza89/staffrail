import 'package:bhmh/core/extensions/app_size.dart';
import 'package:flutter/material.dart';

class TrainingAssignedCardPreview extends StatefulWidget {
  final String title;
  final String subtitle;
  final String badgeText;
  final Color badgeColor;
  final IconData icon;
  final Color themeColor;
  final int currentProgress;
  final int totalProgress;

  const TrainingAssignedCardPreview({
    super.key,
    required this.title,
    required this.subtitle,
    required this.badgeText,
    required this.badgeColor,
    required this.icon,
    required this.themeColor,
    required this.currentProgress,
    required this.totalProgress,
  });

  @override
  State<TrainingAssignedCardPreview> createState() => _TrainingAssignedCardPreviewState();
}

class _TrainingAssignedCardPreviewState extends State<TrainingAssignedCardPreview> {
  bool _isHovering = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    // 🌐 RULE #1: Custom Responsive Check
    final bool isMobile = context.screenWidth < 600;
    
    // Calculate progress percentage safely
    final double progressPercent = widget.totalProgress == 0 
        ? 0.0 
        : (widget.currentProgress / widget.totalProgress).clamp(0.0, 1.0);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        
        // 🚀 MICRO-ANIMATION 1: Tactile Squish
        child: AnimatedScale(
          scale: _isPressed ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 100),
          curve: Curves.easeOutCubic,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOutCirc,
            // 🚀 MICRO-ANIMATION 2: Hover Lift (Web Only)
            transform: Matrix4.translationValues(
              0,
              (_isHovering && !isMobile && !_isPressed) ? -4 : 0,
              0,
            ),
            padding: EdgeInsets.all(isMobile ? 20 : 24), // Tighter padding on mobile
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20), // 🎨 Squircles
              border: Border.all(
                color: _isHovering 
                    ? widget.themeColor.withValues(alpha: 0.4) 
                    : Colors.grey.shade200, 
                width: 1.5,
              ),
              boxShadow: [
                // 🚀 MICRO-ANIMATION 3: Shadow Bloom
                BoxShadow(
                  color: widget.themeColor.withValues(alpha: _isHovering && !_isPressed ? 0.08 : 0.02),
                  blurRadius: _isHovering ? 24 : 16,
                  offset: Offset(0, _isHovering ? 8 : 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                
                // ==========================================
                // HEADER SECTION (Adapts based on screen size)
                // ==========================================
                if (!isMobile) ...[
                  // 💻 WEB HEADER: Big Icon on left, Badge on Right
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: widget.themeColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(widget.icon, color: widget.themeColor, size: 24),
                      ),
                      _StatusBadge(text: widget.badgeText, color: widget.badgeColor),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    widget.title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: -0.3),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.subtitle,
                    style: const TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.4),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ] else ...[
                  // 📱 MOBILE HEADER: Title & Badge inline, tight subtitle, no big icon
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          widget.title,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), letterSpacing: -0.3),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                      _StatusBadge(text: widget.badgeText, color: widget.badgeColor),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.subtitle,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],

                // Pushes the progress bar to the bottom if inside a fixed-height grid
                if (!isMobile) const SizedBox(height: 32) else const SizedBox(height: 24),

                // ==========================================
                // PROGRESS BAR SECTION (Animated)
                // ==========================================
                
                // 🚀 MICRO-ANIMATION 4: Smooth Bar Fill & Number Count
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0.0, end: progressPercent),
                  duration: const Duration(milliseconds: 1200),
                  curve: Curves.easeOutExpo,
                  builder: (context, animatedValue, child) {
                    // Calculate the animated current progress number
                    final int animatedCurrent = (animatedValue * widget.totalProgress).round();

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isMobile ? 'Completion' : 'Progress',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                            ),
                            RichText(
                              text: TextSpan(
                                children: [
                                  TextSpan(
                                    text: '$animatedCurrent',
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                                  ),
                                  TextSpan(
                                    text: ' / ${widget.totalProgress}${isMobile ? ' Staff' : ''}',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        // The Track
                        Container(
                          height: 6,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9), // Light Slate track
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: animatedValue, // Grows with animation
                            child: Container(
                              decoration: BoxDecoration(
                                color: widget.themeColor, // Theme-colored fill
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- Helper Component for the Badge ---
class _StatusBadge extends StatelessWidget {
  final String text;
  final Color color;

  const _StatusBadge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1), // Soft 10% tint
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
