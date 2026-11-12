import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/shell/admin_shell/mobile/admin_navigation_mobile.dart';
import 'package:bhmh/features/shell/admin_shell/web/admin_navigation_web.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

class AdminNavigationShell extends StatefulWidget {
  const AdminNavigationShell({super.key, required this.child});
  final Widget child;

  static const Color adminAccent = Color(0xFF6B8A8A);

  @override
  State<AdminNavigationShell> createState() => _AdminNavigationShellState();
}

class _AdminNavigationShellState extends State<AdminNavigationShell> {
  int _getSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith(AdminRoutes.dashboard)) return 0;
    if (location.startsWith(AdminRoutes.directory)) return 1;
    if (location.startsWith(AdminRoutes.training)) return 2;
    if (location.startsWith(AdminRoutes.clearance)) return 3;
    if (location.startsWith(AdminRoutes.profile)) return 4;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go(AdminRoutes.dashboard);
        break;
      case 1:
        context.go(AdminRoutes.directory);
        break;
      case 2:
        context.go(AdminRoutes.training);
        break;
      case 3:
        context.go(AdminRoutes.clearance);
        break;
      case 4:
        context.go(AdminRoutes.profile);
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
          body: widget.child,
          bottomNavigationBar: AdminMobileBottomNav(
            selectedIndex: selectedIndex,
            onDestination: (index) => _onItemTapped(index, context),
          ),
        ),
      ),
      web: (context) => Scaffold(
        body: Row(
          children: [
            AdminWebNavigation(
              selectedIndex: selectedIndex,
              onDestination: (index) => _onItemTapped(index, context),
            ),
            Expanded(child: widget.child),
          ],
        ),
      ),
    );
  }
}
