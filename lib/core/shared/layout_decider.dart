import 'package:flutter/material.dart';

// Use a typedef for cleaner code
typedef ResponsiveBuilder = Widget Function(BuildContext context);

class ResponsiveLayout extends StatelessWidget {
  final ResponsiveBuilder mobile;
  final ResponsiveBuilder? tablet; // Optional: fallback to mobile if null
  final ResponsiveBuilder web;

  const ResponsiveLayout({
    super.key,
    required this.mobile,
    this.tablet,
    required this.web,
  });

  // Silicon Valley Pro-Tip: Add static helpers to check screen size anywhere
  static bool isMobile(BuildContext context) =>
      MediaQuery.sizeOf(context).width < 768;

  static bool isTablet(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= 768 &&
      MediaQuery.sizeOf(context).width < 1200;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= 1200;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 1200) {
          return web(context);
        }
        if (constraints.maxWidth >= 768) {
          return (tablet ?? mobile)(context);
        }
        return mobile(context);
      },
    );
  }
}
