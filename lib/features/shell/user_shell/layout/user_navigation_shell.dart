import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/shell/user_shell/mobile/user_mobile_navigation.dart';
import 'package:bhmh/features/shell/user_shell/web/user_web_navigation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class UserNavigationShell extends StatefulWidget {
  const UserNavigationShell({super.key, required this.child});
  final Widget child;

  @override
  State<UserNavigationShell> createState() => _UserNavigationShellState();
}

class _UserNavigationShellState extends State<UserNavigationShell> {
  int _getSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith(UserRoutes.dashboard)) return 0;
    if (location.startsWith(UserRoutes.guide)) return 1;
    if (location.startsWith(UserRoutes.trainings)) return 2;
    if (location.startsWith(UserRoutes.clearance)) return 3;
    if (location.startsWith(UserRoutes.profile)) return 4;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go(UserRoutes.dashboard);
        break;
      case 1:
        context.go(UserRoutes.guide);
        break;
      case 2:
        context.go(UserRoutes.trainings);
        break;
      case 3:
        context.go(UserRoutes.clearance);
        break;
      case 4:
        context.go(UserRoutes.profile);
        break;
    }
  }

  Future<bool?> _showExitDialog(BuildContext context) {
    final theme = Theme.of(context);
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: theme.colorScheme.surface,
        title: Row(
          children: [
            Icon(
              Icons.exit_to_app_rounded,
              color: theme.colorScheme.error,
            ),
            const SizedBox(width: 12),
            const Text(
              'Exit Application',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to close the app?',
          style: TextStyle(fontSize: 15, color: Colors.black87),
        ),
        actionsPadding: const EdgeInsets.only(bottom: 16, right: 16, left: 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            style: TextButton.styleFrom(
              foregroundColor: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: theme.colorScheme.error,
              foregroundColor: theme.colorScheme.onError,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text('Exit', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _getSelectedIndex(context);

    return ResponsiveLayout(
      mobile: (context) => PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) async {
          if (didPop) return;
          final router = GoRouter.of(context);
          if (router.canPop()) {
            router.pop();
          } else {
            final index = _getSelectedIndex(context);
            if (index != 0) {
              _onItemTapped(0, context);
            } else {
              final shouldExit = await _showExitDialog(context);
              if (shouldExit == true) {
                await SystemNavigator.pop();
              }
            }
          }
        },
        child: Scaffold(
          // Safely passing the child directly from GoRouter
          body: widget.child,
          bottomNavigationBar: UserMobileBottomNav(
            selectedIndex: selectedIndex,
            onDestination: (index) => _onItemTapped(index, context),
          ),
        ),
      ),
      web: (context) => Scaffold(
        body: Row(
          children: [
            UserWebNavigation(
              selectedIndex: selectedIndex,
              onDestination: (index) => _onItemTapped(index, context),
            ),
            // Safely passing the child directly from GoRouter
            Expanded(child: widget.child),
          ],
        ),
      ),
    );
  }
}
