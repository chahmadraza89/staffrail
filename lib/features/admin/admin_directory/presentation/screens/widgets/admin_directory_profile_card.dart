// ignore_for_file: deprecated_member_use

import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class AdminDirectoryProfileCard extends StatefulWidget {
  final String name;
  final String email;
  final String statusText; // e.g., "LAST ACTIVE: 2H AGO"
  final Color statusColor; // e.g., Green or Red
  final double progress; // Overall average
  final double onboardingProgress;
  final double trainingProgress;
  final String phaseText; // e.g., "Documentation Phase"
  final Color phaseColor; // e.g., Orange, Teal, Purple
  final String avatarInitials;
  final VoidCallback onTap;
  final bool isActive;

  const AdminDirectoryProfileCard({
    super.key,
    required this.name,
    required this.email,
    required this.statusText,
    required this.statusColor,
    required this.progress,
    required this.onboardingProgress,
    required this.trainingProgress,
    required this.phaseText,
    required this.phaseColor,
    required this.avatarInitials,
    required this.onTap,
    this.isActive = true,
  });

  @override
  State<AdminDirectoryProfileCard> createState() =>
      _AdminDirectoryProfileCardState();
}

class _AdminDirectoryProfileCardState extends State<AdminDirectoryProfileCard> {
  bool _isHovering = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    // 🌐 RULE #1: Custom Responsive Check
    final bool isMobile = context.screenWidth < 600;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        onTap: widget.onTap,
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),

        // 🚀 MICRO-ANIMATION 1: Tactile Squish
        child: AnimatedScale(
          scale: _isPressed ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 100),
          curve: Curves.easeOutCubic,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCirc,
            // 🚀 MICRO-ANIMATION 2: Hover Lift
            transform: Matrix4.translationValues(
              0,
              (_isHovering && !isMobile && !_isPressed) ? -4 : 0,
              0,
            ),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20), // 🎨 Squircles
              border: Border.all(
                color: _isHovering
                    ? const Color(0xFF109B85).withValues(alpha: 0.3)
                    : Colors.grey.shade200,
                width: 1.5,
              ),
              boxShadow: [
                // 🚀 MICRO-ANIMATION 3: Shadow Bloom
                BoxShadow(
                  color: Colors.black.withValues(
                    alpha: _isHovering && !_isPressed ? 0.04 : 0.0,
                  ),
                  blurRadius: _isHovering ? 20 : 0,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // --- TOP SECTION: Avatar & User Info ---
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Modern Squircle Avatar
                    Container(
                      width: 40,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9), // Slate 100
                        borderRadius: BorderRadius.circular(14), // Squircle
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Center(
                        child: Text(
                          widget.avatarInitials,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF475569), // Slate 600
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                widget.name,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A), // Slate 900
                                  letterSpacing: -0.3,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (!widget.isActive) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.red.shade50,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                      color: Colors.red.shade200,
                                      width: 0.5,
                                    ),
                                  ),
                                  child: Text(
                                    'Inactive',
                                    style: TextStyle(
                                      color: Colors.red.shade700,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.email,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF64748B), // Slate 500
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          // Status Indicator
                          Row(
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: widget.statusColor,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                widget.statusText.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: widget.statusColor,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Action Menu
                    Icon(
                      Icons.more_vert_rounded,
                      color: Colors.grey.shade400,
                      size: 20,
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // --- MIDDLE SECTION: Progress Bar (Animated) ---
                // 🚀 MICRO-ANIMATION 4: Value Tweening (Progress Bar & Numbers)
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0.0, end: widget.progress),
                  duration: const Duration(milliseconds: 1200),
                  curve: Curves.easeOutExpo,
                  builder: (context, animatedValue, child) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Overall Compliance',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1E293B), // Slate 800
                              ),
                            ),
                            Text(
                              '${(animatedValue * 100).toInt()}%',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppColors
                                    .primaryColor, // Modern Indigo/Purple
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        // The Progress Track
                        Container(
                          height: 6,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9), // Track color
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: animatedValue, // Grows with animation
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.primaryColor, // Fill color
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 24),

                // --- BOTTOM SECTION: Status Pills (Industry Standard Exception-Based) ---
                Builder(
                  builder: (context) {
                    // Modern Tinted Phase Badge
                    final Widget phaseBadge = Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: widget.phaseColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        widget.phaseText,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: widget.phaseColor,
                        ),
                      ),
                    );

                    // INDUSTRY STANDARD: Action-Based status pills
                    final Widget actionPills = SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      reverse: !isMobile, // Keep reverse on desktop only
                      child: Row(
                        mainAxisAlignment: isMobile
                            ? MainAxisAlignment.start
                            : MainAxisAlignment.end,
                        children: [
                          if (!isMobile) const SizedBox(width: 8),
                          if (widget.onboardingProgress < 1.0)
                            _StatusActionPill(
                              icon: LucideIcons.fileText,
                              label: 'Onboarding',
                              color: Colors.amber.shade700,
                            )
                          else if (widget.trainingProgress < 1.0)
                            const SizedBox.shrink(),

                          const SizedBox(width: 8),

                          if (widget.trainingProgress < 1.0)
                            _StatusActionPill(
                              icon: LucideIcons.graduationCap,
                              label: 'Trainings',
                              color: Colors.blue.shade700,
                            ),

                          // If everything is done, show a subtle success indicator
                          if (widget.onboardingProgress >= 1.0 &&
                              widget.trainingProgress >= 1.0)
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFF10B981,
                                ).withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                LucideIcons.check,
                                size: 14,
                                color: Color(0xFF10B981),
                              ),
                            ),
                        ],
                      ),
                    );

                    // 📱 MOBILE LAYOUT (Stacked)
                    if (isMobile) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          phaseBadge,
                          const SizedBox(height: 12),
                          actionPills,
                        ],
                      );
                    }

                    // 💻 DESKTOP LAYOUT (Side-by-side)
                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        phaseBadge,
                        Expanded(child: actionPills),
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

class _StatusActionPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StatusActionPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC), // Slate 50
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)), // Slate 200
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFF475569), // Slate 600
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
