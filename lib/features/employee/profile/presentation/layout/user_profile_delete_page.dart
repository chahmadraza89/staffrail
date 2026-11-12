import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/employee/profile/presentation/delete_account_data.dart';
import 'package:bhmh/features/employee/profile/presentation/mobile/profile_delete_mobile.dart';
import 'package:bhmh/features/employee/profile/presentation/web/profile_delete_web.dart';
import 'package:flutter/material.dart';

class UserProfileDeletePage extends StatelessWidget {
  const UserProfileDeletePage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (_) => const ProfileDeleteMobile(
        fallbackRoute: UserRoutes.profile,
        content: UserDeleteAccountData(),
      ),
      web: (_) => const ProfileDeleteWeb(
        fallbackRoute: UserRoutes.profile,
        content: UserDeleteAccountData(),
      ),
    );
  }
}
