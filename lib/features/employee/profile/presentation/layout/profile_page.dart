import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/profile/presentation/mobile/profile_mob_screen.dart';
import 'package:bhmh/features/employee/profile/presentation/web/profile_web_screen.dart';
import 'package:flutter/material.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => ProfileMobScreen(),
      web: (_) => ProfileWebScreen(),
    );
  }
}
