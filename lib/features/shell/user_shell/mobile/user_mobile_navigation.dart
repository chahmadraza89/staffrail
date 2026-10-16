import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/shell/widgets/animated_navigation_icons.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class UserMobileBottomNav extends StatefulWidget {
  const UserMobileBottomNav({
    super.key,
    this.onDestination,
    required this.selectedIndex,
  });
  final void Function(int)? onDestination;
  final int selectedIndex;

  @override
  State<UserMobileBottomNav> createState() => _UserMobileBottomNavState();
}

class _UserMobileBottomNavState extends State<UserMobileBottomNav> {
  int selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(splashFactory: NoSplash.splashFactory),
      child: NavigationBar(
        height: 70,
        // backgroundColor: context.cardColor,
        selectedIndex: widget.selectedIndex,
        indicatorColor: Colors.transparent,
        animationDuration: AppTheme.medium,
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        elevation: 22,
        shadowColor: Colors.black,
        onDestinationSelected: widget.onDestination,
        destinations: [
          navDestination(
            context,
            icon: LucideIcons.home,
            label: 'Home',
            isSelected: widget.selectedIndex == 0,
          ),
          navDestination(
            context,
            icon: LucideIcons.clipboardList,
            label: 'Guide',
            isSelected: widget.selectedIndex == 1,
          ),
          navDestination(
            context,
            icon: LucideIcons.graduationCap,
            label: 'Trainings',
            isSelected: widget.selectedIndex == 2,
          ),
          navDestination(
            context,
            icon: LucideIcons.shieldCheck,
            label: 'Verify',
            isSelected: widget.selectedIndex == 3,
          ),
          navDestination(
            context,
            icon: LucideIcons.user,
            label: 'Profile',
            isSelected: widget.selectedIndex == 4,
          ),
        ],
      ),
    );
  }
}

NavigationDestination navDestination(
  BuildContext context, {
  required IconData icon,
  required String label,
  required bool isSelected,
}) {
  return NavigationDestination(
    label: label,
    icon: MyAnimatedIcon(icon: icon, isSelected: isSelected),
  );
}

NavigationRailDestination railDestination(
  BuildContext context, {
  required IconData icon,
  required String label,
  required bool isSelected,
}) {
  return NavigationRailDestination(
    label: Text(label, style: TextStyle(fontWeight: .bold)),
    icon: MyAnimatedIcon(icon: icon, isSelected: isSelected, padding: 12),
  );
}
