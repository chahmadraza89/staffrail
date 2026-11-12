import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/profile_detail_tile.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/profile_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:bhmh/core/router/user_route_constant.dart';

class ProfileCardView extends StatelessWidget {
  const ProfileCardView({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ProfileActionTile(
          leadingIcon: LucideIcons.user,
          label: 'Personal Information',
          onTap: () => context.push(UserRoutes.editProfile),
        ),
        _Divider(),
        ProfileActionTile(
          leadingIcon: LucideIcons.key,
          label: 'Change Password',
          onTap: () {
            context.push(UserRoutes.changePassword);
          },
        ),
        ProfileActionTile(
          leadingIcon: LucideIcons.trash2,
          label: 'Delete Account',
          onTap: () {
            context.push(UserRoutes.profileDelete);
          },
        ),
        ProfileActionTile(
          leadingIcon: LucideIcons.helpCircle,
          label: 'Privacy & Security',
          onTap: () {
            context.push(UserRoutes.privacyPolicy);
          },
        ),
        // ProfileActionTile(
        //   leadingIcon: LucideIcons.info,
        //   label: 'Contact Information',
        //   onTap: () {
        //     context.push(UserRoutes.contactSupport);
        //   },
        // ),
        _Divider(),
        ProfileActionTile(
          leadingIcon: LucideIcons.folder,
          label: 'Document Center',
          onTap: () => context.push(UserRoutes.documentCenter),
        ),
        _Divider(),
        Consumer(
          builder: (context, ref, _) {
            return ProfileActionTile(
              containerColor: const Color(0xFFEF4444),
              leadingIcon: LucideIcons.logOut,
              label: 'Log Out',
              onTap: () {
                showDialog(
                  context: context,
                  builder: (context) {
                    return ModernLogoutDialog(
                      onConfirmLogout: () {
                        ref.read(authViewModelProvider.notifier).signOut();
                      },
                    );
                  },
                );
              },
            );
          },
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      thickness: 1,
      color: Colors.grey.shade100,
      indent: 60,
    );
  }
}
