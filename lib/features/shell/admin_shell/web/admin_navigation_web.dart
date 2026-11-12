import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/shared/app_image.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class AdminWebNavigation extends ConsumerStatefulWidget {
  const AdminWebNavigation({
    super.key,
    this.onDestination,
    required this.selectedIndex,
  });

  final void Function(int)? onDestination;
  final int selectedIndex;

  @override
  ConsumerState<AdminWebNavigation> createState() => _AdminWebNavigationState();
}

class _AdminWebNavigationState extends ConsumerState<AdminWebNavigation> {
  static const Color adminAccent = AppColors.primaryColor;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(splashFactory: NoSplash.splashFactory),
      child: Container(
        width: 260,
        decoration: BoxDecoration(
          color: AppColors.adminNavColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(10),
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
                    width: 140, // Fixed width for sidebar
                  ),
                ],
              ),
            ),

            // 2. NAVIGATION ITEMS
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                children: [
                  AdminNavMenuItem(
                    icon: LucideIcons.home,
                    label: 'Dashboard',
                    isSelected: widget.selectedIndex == 0,
                    primaryColor: adminAccent,
                    onTap: () => widget.onDestination?.call(0),
                  ),
                  const SizedBox(height: 8),
                  AdminNavMenuItem(
                    icon: LucideIcons.users,
                    label: 'Directory',
                    isSelected: widget.selectedIndex == 1,
                    primaryColor: adminAccent,
                    onTap: () => widget.onDestination?.call(1),
                  ),
                  const SizedBox(height: 8),
                  AdminNavMenuItem(
                    icon: LucideIcons.graduationCap,
                    label: 'Training',
                    isSelected: widget.selectedIndex == 2,
                    primaryColor: adminAccent,
                    onTap: () => widget.onDestination?.call(2),
                  ),
                  const SizedBox(height: 8),
                  AdminNavMenuItem(
                    icon: LucideIcons.shieldCheck,
                    label: 'Verify',
                    isSelected: widget.selectedIndex == 3,
                    primaryColor: adminAccent,
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
              child: AdminProfileBottomCard(
                primaryColor: adminAccent,
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

class AdminNavMenuItem extends StatelessWidget {
  const AdminNavMenuItem({
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

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      hoverColor: primaryColor.withAlpha(13),
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
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AdminProfileBottomCard extends ConsumerWidget {
  const AdminProfileBottomCard({
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

        final initials = user.name.isNotEmpty
            ? user.name[0].toUpperCase()
            : 'A';

        return InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          hoverColor: primaryColor.withAlpha(20),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.symmetric(
              horizontal: 12.0,
              vertical: 12.0,
            ),
            decoration: BoxDecoration(
              color: isSelected ? primaryColor.withAlpha(15) : null,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? primaryColor.withAlpha(100)
                    : Colors.grey.withAlpha(50),
                width: isSelected ? 1.5 : 1,
              ),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: primaryColor.withAlpha(38),
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
                      const Text(
                        'Administrator',
                        style: TextStyle(color: Colors.black54, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Icon(
                  LucideIcons.settings,
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
