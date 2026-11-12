import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/features/employee/profile/presentation/mobile/edit_profile_mobile.dart';
import 'package:bhmh/features/employee/profile/presentation/web/edit_profile_web.dart';
import 'package:flutter/material.dart';

class EditProfilePage extends StatelessWidget {
  const EditProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const EditProfileMobile(fallbackRoute: UserRoutes.profile),
      web: (_) => const EditProfileWeb(fallbackRoute: UserRoutes.profile),
    );
  }
}
