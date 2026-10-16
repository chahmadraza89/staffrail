import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/shell/widgets/animated_navigation_icons.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class AdminMobileBottomNav extends StatefulWidget {
  const AdminMobileBottomNav({
    super.key,
    this.onDestination,
    required this.selectedIndex,
  });
  final void Function(int)? onDestination;
  final int selectedIndex;

  @override
  State<AdminMobileBottomNav> createState() => _AdminMobileBottomNavState();
}

class _AdminMobileBottomNavState extends State<AdminMobileBottomNav> {
  static const Color adminAccent = AppColors.primaryColor;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        splashFactory: NoSplash.splashFactory,
        navigationBarTheme: NavigationBarThemeData(
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const IconThemeData(color: adminAccent);
            }
            return const IconThemeData(color: Colors.black54);
          }),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(
                color: adminAccent,
                fontWeight: FontWeight.bold,
              );
            }
            return const TextStyle(color: Colors.black54);
          }),
        ),
      ),
      child: NavigationBar(
        height: 70,
        selectedIndex: widget.selectedIndex,
        backgroundColor: AppColors.adminNavColor,
        indicatorColor: adminAccent.withAlpha(20),
        animationDuration: AppTheme.medium,
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        elevation:
            8, // Restored subtle elevation for contrast on white background
        shadowColor: Colors.black,
        onDestinationSelected: widget.onDestination,
        destinations: [
          _navDestination(
            context,
            icon: LucideIcons.home,
            label: 'Home',
            isSelected: widget.selectedIndex == 0,
          ),
          _navDestination(
            context,
            icon: LucideIcons.users,
            label: 'Directory',
            isSelected: widget.selectedIndex == 1,
          ),
          _navDestination(
            context,
            icon: LucideIcons.graduationCap,
            label: 'Training',
            isSelected: widget.selectedIndex == 2,
          ),
          _navDestination(
            context,
            icon: LucideIcons.shieldCheck,
            label: 'Verify',
            isSelected: widget.selectedIndex == 3,
          ),
          _navDestination(
            context,
            icon: LucideIcons.user,
            label: 'Profile',
            isSelected: widget.selectedIndex == 4,
          ),
        ],
      ),
    );
  }

  NavigationDestination _navDestination(
    BuildContext context, {
    required IconData icon,
    required String label,
    required bool isSelected,
  }) {
    return NavigationDestination(
      label: label,
      icon: MyAnimatedIcon(
        icon: icon,
        isSelected: isSelected,
        color: isSelected ? adminAccent : Colors.black54,
      ),
    );
  }
}
