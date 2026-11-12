import 'dart:ui'; // Required for ImageFilter
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart'; // For kIsWeb
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CustomBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget title;
  final Widget? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final bool showBackButton;
  final VoidCallback? onLeadingTap;
  final bool enableBlur;

  const CustomBar({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.showBackButton = false,
    this.onLeadingTap,
    this.enableBlur = true,
  });

  @override
  Size get preferredSize => const Size.fromHeight(70);

  @override
  Widget build(BuildContext context) {
    // Standard MediaQuery for portability
    final screenWidth = MediaQuery.sizeOf(context).width;
    final bool isDesktop = kIsWeb || screenWidth > 800;
    final double avatarSize = isDesktop ? 48.0 : 40.0;

    // final isDark = Theme.of(context).brightness == Brightness.dark;

    // final backgroundColor = isDark
    //     ? const Color(0xFF121212).withValues(alpha: enableBlur ? 0.8 : 1.0)
    //     : Colors.white.withValues(alpha: enableBlur ? 0.8 : 1.0);

    return Container(
      decoration: BoxDecoration(
        // color: backgroundColor,
        // border: Border(
        //   bottom: BorderSide(
        //     color: isDark
        //         ? Colors.white.withValues(alpha: 0.05)
        //         : Colors.black.withValues(alpha: 0.05),
        //     width: 1,
        //   ),
        // ),
      ),
      child: ClipRRect(
        child: BackdropFilter(
          filter: enableBlur
              ? ImageFilter.blur(sigmaX: 10, sigmaY: 10)
              : ImageFilter.blur(sigmaX: 0, sigmaY: 0),
          child: SafeArea(
            bottom: false,
            // ✅ FIX: Removed Align and ConstrainedBox.
            // Now padding applies directly to the full-width row.
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // --- NAVIGATION BUTTONS ---
                  if (showBackButton &&
                      (onLeadingTap != null || context.canPop())) ...[
                    CircleButton(
                      icon: CupertinoIcons.arrow_left,
                      tooltip: "Back",
                      onTap: onLeadingTap ?? () => context.pop(),
                    ),
                    const SizedBox(width: 12),
                  ] else if (Scaffold.maybeOf(context)?.hasDrawer ?? false) ...[
                    CircleButton(
                      icon: Icons.menu_rounded,
                      tooltip: "Menu",
                      onTap: () => Scaffold.of(context).openDrawer(),
                    ),
                    const SizedBox(width: 12),
                  ],

                  // --- AVATAR / LEADING ---
                  if (leading != null) ...[
                    GestureDetector(
                      onTap: onLeadingTap,
                      child: Container(
                        width: avatarSize,
                        height: avatarSize,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Theme.of(
                              context,
                            ).dividerColor.withValues(alpha: 0.2),
                            width: 1.5,
                          ),
                        ),
                        child: ClipOval(child: leading!),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],

                  // --- TITLE SECTION ---
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        DefaultTextStyle(
                          style: Theme.of(context).textTheme.titleMedium!
                              .copyWith(
                                fontWeight: FontWeight.w700,
                                fontSize: isDesktop ? 18 : 16,
                              ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          child: title,
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 2),
                          DefaultTextStyle(
                            style: Theme.of(context).textTheme.bodySmall!
                                .copyWith(
                                  color: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.color
                                      ?.withValues(alpha: 0.7),
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            child: subtitle!,
                          ),
                        ],
                      ],
                    ),
                  ),

                  // --- TRAILING ---
                  // ✅ Since we removed the constraint, this will now
                  // sit at the true far-right edge of the screen.
                  if (trailing != null) ...[
                    const SizedBox(width: 8),
                    trailing!,
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ✅ FIXED CircleButton
class CircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final String? tooltip;

  const CircleButton({
    super.key,
    required this.icon,
    required this.onTap,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip ?? "",
      child: Material(
        color: Theme.of(context).canvasColor.withValues(alpha: 0.5),
        shape: const CircleBorder(),
        child: InkWell(
          borderRadius: BorderRadius.circular(50),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(8),
            child: Icon(
              icon,
              size: 20,
              color: Theme.of(context).iconTheme.color,
            ),
          ),
        ),
      ),
    );
  }
}
