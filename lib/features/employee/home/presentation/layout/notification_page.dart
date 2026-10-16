import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/home/presentation/mobile/notification_mobile.dart';
import 'package:bhmh/features/employee/home/presentation/web/notification_web.dart';
import 'package:flutter/material.dart';

class NotificationPage extends StatelessWidget {
  const NotificationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const NotificationMobile(),
      web: (_) => const NotificationWeb(),
    );
  }
}
