import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/router/admin_route_constant.dart';
import 'package:bhmh/features/admin/admin_profile/widgets/admin_profile_header.dart';
import 'package:bhmh/features/admin/admin_profile/widgets/admin_profile_view_widgets.dart';
import 'package:bhmh/features/auth/data/model/auth_model.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AdminProfileView extends StatelessWidget {
  final UserEntity user;
  final VoidCallback onLogout;
  const AdminProfileView({
    super.key,
    required this.user,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;

    // Split name into first and last for the UI cards
    final nameParts = user.name.split(' ');
    final firstName = nameParts.first;
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : "";

    // Generate initials for avatar
    final initials = user.name.isNotEmpty
        ? user.name
              .trim()
              .split(RegExp(r'\s+'))
              .map((s) => s[0])
              .take(2)
              .join()
              .toUpperCase()
        : "AD";

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 2. The Header Profile Section
          ProfileHeader(
            isMobile: isMobile,
            name: user.name,
            role: user.role == UserRole.admin ? "Administrator" : "Employee",
            initials: initials,
            avatarUrl: user.photoUrl,
          ),
          const SizedBox(height: 32),

          // 3. Personal Information Card
          ProfileSectionCard(
            title: 'Personal Information',
            child: isMobile
                ? Column(
                    children: [
                      ProfileDataRow(label: 'First Name:', value: firstName),
                      ProfileDataRow(label: 'Last Name:', value: lastName),
                      ProfileDataRow(
                        label: 'Email Address:',
                        value: user.email,
                      ),
                    ],
                  )
                : Row(
                    children: [
                      ProfileDataColumn(label: 'First Name', value: firstName),
                      ProfileDataColumn(label: 'Last Name', value: lastName),
                      ProfileDataColumn(
                        label: 'Email Address',
                        value: user.email,
                      ),
                    ],
                  ),
          ),
          const SizedBox(height: 24),

          // 4. Settings & Preferences Section
          ProfileSectionCard(
            title: 'Settings & Preferences',
            contentPadding: EdgeInsets.zero,
            child: Column(
              children: [
                const SettingsToggleTile(
                  icon: Icons.notifications_none_rounded,
                  title: 'Push Notifications',
                ),
                Divider(height: 1, color: Colors.grey.shade100),
                SettingsRowTile(
                  icon: Icons.lock_outline_rounded,
                  title: 'Change Password',
                  onTap: () {
                    context.push(AdminRoutes.changePassword);
                  },
                ),
                Divider(height: 1, color: Colors.grey.shade100),
                SettingsRowTile(
                  icon: Icons.delete_outline_rounded,
                  title: 'Delete Account ',
                  onTap: () {
                    context.push(AdminRoutes.deleteAccount);
                  },
                ),
                Divider(height: 1, color: Colors.grey.shade100),
                SettingsRowTile(
                  icon: Icons.privacy_tip_outlined,
                  title: 'Privacy & Security',
                  onTap: () {
                    context.push(AdminRoutes.privacyPolicy);
                  },
                ),
                //Divider(height: 1, color: Colors.grey.shade100),
                // SettingsRowTile(
                //   icon: Icons.help_outline_rounded,
                //   title: 'Contact Information',
                //   onTap: () {
                //     context.push(AdminRoutes.contactSupport);
                //   },
                // ),
                Divider(height: 1, color: Colors.grey.shade100),

                LogoutRowTile(
                  icon: Icons.logout_rounded,
                  title: 'Log out',
                  onTap: onLogout,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
