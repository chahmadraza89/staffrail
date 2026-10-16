import 'package:bhmh/core/shared/app_image.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class UserWebNavigation extends ConsumerStatefulWidget {
  const UserWebNavigation({
    super.key,
    this.onDestination,
    required this.selectedIndex,
  });

  final void Function(int)? onDestination;
  final int selectedIndex;

  @override
  ConsumerState<UserWebNavigation> createState() => _UserWebNavigationState();
}

class _UserWebNavigationState extends ConsumerState<UserWebNavigation> {
  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor != Colors.transparent
        ? Theme.of(context).primaryColor
        : const Color(0xFF00897B);

    return Theme(
      data: Theme.of(context).copyWith(splashFactory: NoSplash.splashFactory),
      child: Container(
        width: 260,
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 24,
              offset: const Offset(4, 0),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. APP LOGO & HEADER
            Padding(
              padding: const EdgeInsets.only(
                top: 32.0,
                left: 24.0,
                bottom: 24.0,
              ),
              child: Row(
                children: [
                  Image.asset(
                    inAppLogo,
                    fit: BoxFit.contain,
                    width: context.screenWidth * 0.1,
                  ),
                  const SizedBox(width: 12),
                ],
              ),
            ),

            // 2. NAVIGATION ITEMS
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                children: [
                  CustomNavMenuItem(
                    icon: LucideIcons.home,
                    label: 'Dashboard',
                    isSelected: widget.selectedIndex == 0,
                    primaryColor: primaryColor,
                    onTap: () => widget.onDestination?.call(0),
                  ),
                  const SizedBox(height: 4),
                  CustomNavMenuItem(
                    icon: LucideIcons.clipboardList,
                    label: 'Guide',
                    isSelected: widget.selectedIndex == 1,
                    primaryColor: primaryColor,
                    onTap: () => widget.onDestination?.call(1),
                  ),
                  const SizedBox(height: 4),
                  CustomNavMenuItem(
                    icon: LucideIcons.graduationCap,
                    label: 'Trainings',
                    isSelected: widget.selectedIndex == 2,
                    primaryColor: primaryColor,
                    onTap: () => widget.onDestination?.call(2),
                  ),
                  const SizedBox(height: 4),
                  CustomNavMenuItem(
                    icon: LucideIcons.shieldCheck,
                    label: 'Verify',
                    isSelected: widget.selectedIndex == 3,
                    primaryColor: primaryColor,
                    onTap: () => widget.onDestination?.call(3),
                  ),
                ],
              ),
            ),

            // 3. BOTTOM USER PROFILE SECTION
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 12.0,
                vertical: 16.0,
              ),
              child: UserProfileBottomCard(
                primaryColor: primaryColor,
                onTap: () => widget.onDestination?.call(4),
                isSelected: widget.selectedIndex == 4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- CUSTOM MENU ITEM WIDGET ---
class CustomNavMenuItem extends StatelessWidget {
  const CustomNavMenuItem({
    super.key,
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.primaryColor,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isSelected;
  final Color primaryColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final Color bgColor = isSelected ? primaryColor : Colors.transparent;
    final Color contentColor = isSelected ? Colors.white : Colors.black87;
    final FontWeight fontWeight = isSelected
        ? FontWeight.w600
        : FontWeight.w500;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      hoverColor: primaryColor.withValues(alpha: 0.05),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOutCubic,
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: contentColor, size: 22),
            const SizedBox(width: 16),
            Text(
              label,
              style: TextStyle(
                color: contentColor,
                fontWeight: fontWeight,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- UPDATED: REAL USER PROFILE CARD ---
class UserProfileBottomCard extends ConsumerWidget {
  const UserProfileBottomCard({
    super.key,
    required this.primaryColor,
    this.onTap,
    this.isSelected = false,
  });

  final Color primaryColor;
  final VoidCallback? onTap;
  final bool isSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(currentUserProvider);

    return userAsync.when(
      data: (user) {
        if (user == null) return const SizedBox.shrink();

        final parts = user.name
            .trim()
            .split(' ')
            .where((e) => e.isNotEmpty)
            .toList();
        String initials = 'U';
        if (parts.length >= 2) {
          initials = (parts.first[0] + parts.last[0]).toUpperCase();
        } else if (parts.isNotEmpty) {
          initials = parts.first[0].toUpperCase();
        }

        return InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          hoverColor: primaryColor.withValues(alpha: 0.08),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.symmetric(
              horizontal: 12.0,
              vertical: 12.0,
            ),
            decoration: BoxDecoration(
              color: isSelected ? primaryColor.withValues(alpha: 0.06) : null,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? primaryColor.withValues(alpha: 0.4)
                    : Colors.grey.withValues(alpha: 0.2),
                width: isSelected ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: primaryColor.withValues(alpha: 0.15),
                  child: Text(
                    initials,
                    style: TextStyle(
                      color: primaryColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        user.name,
                        style: const TextStyle(
                          color: Colors.black87,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        user.email,
                        style: const TextStyle(
                          color: Colors.black54,
                          fontSize: 12,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Icon(
                  LucideIcons.chevronsUpDown,
                  color: isSelected ? primaryColor : Colors.black54,
                  size: 20,
                ),
              ],
            ),
          ),
        );
      },
      loading: () => const SizedBox(
        height: 50,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (e, st) => const Icon(LucideIcons.alertCircle, color: Colors.red),
    );
  }
}
