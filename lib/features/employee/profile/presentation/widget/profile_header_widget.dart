import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ProfileHeaderWidget extends StatelessWidget {
  const ProfileHeaderWidget({
    super.key,
    required this.name,
    required this.role,
    required this.imageUrl,
    required this.email,
    this.avatarRadius = 38.0,
    this.isWebSidebar = false,
  });

  final String name;
  final String role;
  final String imageUrl;
  final String email;
  final double avatarRadius;
  final bool isWebSidebar;

  String _initials() {
    final parts = name.trim().split(' ').where((e) => e.isNotEmpty).toList();
    if (parts.length >= 2) {
      return (parts.first[0] + parts.last[0]).toUpperCase();
    }
    if (parts.isNotEmpty) return parts.first[0].toUpperCase();
    return 'U';
  }

  // ImageProvider? _imageProvider() {
  //   if (imageUrl.isEmpty) return null;
  //   return imageUrl.startsWith('http')
  //       ? NetworkImage(imageUrl)
  //       : AssetImage(imageUrl) as ImageProvider;
  // }

  @override
  Widget build(BuildContext context) {
    return isWebSidebar
        ? _WebSidebarHeader(widget: this)
        : _MobileHeader(widget: this);
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MOBILE HEADER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _MobileHeader extends StatelessWidget {
  const _MobileHeader({required this.widget});
  final ProfileHeaderWidget widget;

  static const Color _accentLight = Color(0xFFE1F5EE);
  static const Color _accentDark = Color(0xFF0F6E56);

  @override
  Widget build(BuildContext context) {
    final double radius = widget.avatarRadius;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Modern Avatar with subtle shadow
          Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  // boxShadow: [
                  //   BoxShadow(
                  //     color: _accentDark.withValues(alpha: 0.15),
                  //     blurRadius: 16,
                  //     offset: const Offset(0, 8),
                  //   ),
                  // ],
                ),
                child: Container(
                  width: radius * 2,
                  height: radius * 2,
                  decoration: const BoxDecoration(
                    color: _accentLight,
                    shape: BoxShape.circle,
                  ),
                  child: ClipOval(
                    child: widget.imageUrl.isNotEmpty
                        ? Image.network(
                            widget.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Center(
                                  child: Text(
                                    widget._initials(),
                                    style: TextStyle(
                                      fontSize: radius * 0.7,
                                      fontWeight: FontWeight.w800,
                                      color: _accentDark,
                                      letterSpacing: -1,
                                    ),
                                  ),
                                ),
                          )
                        : Center(
                            child: Text(
                              widget._initials(),
                              style: TextStyle(
                                fontSize: radius * 0.7,
                                fontWeight: FontWeight.w800,
                                color: _accentDark,
                                letterSpacing: -1,
                              ),
                            ),
                          ),
                  ),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: GestureDetector(
                  onTap: () => context.pushNamed(UserRouteNames.editProfile),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.primaryColor,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.edit_rounded,
                      size: 14,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  widget.name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  widget.email,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                _RolePill(role: widget.role, large: false),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// WEB SIDEBAR HEADER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _WebSidebarHeader extends StatelessWidget {
  const _WebSidebarHeader({required this.widget});
  final ProfileHeaderWidget widget;

  static const Color _accentLight = Color(0xFFE1F5EE);
  static const Color _accentDark = Color(0xFF0F6E56);

  @override
  Widget build(BuildContext context) {
    const double radius = 28.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: _accentDark.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Container(
                  width: radius * 2,
                  height: radius * 2,
                  decoration: const BoxDecoration(
                    color: _accentLight,
                    shape: BoxShape.circle,
                  ),
                  child: ClipOval(
                    child: widget.imageUrl.isNotEmpty
                        ? Image.network(
                            widget.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Center(
                                  child: Text(
                                    widget._initials(),
                                    style: TextStyle(
                                      fontSize: radius * 0.6,
                                      fontWeight: FontWeight.w800,
                                      color: _accentDark,
                                    ),
                                  ),
                                ),
                          )
                        : Center(
                            child: Text(
                              widget._initials(),
                              style: TextStyle(
                                fontSize: radius * 0.6,
                                fontWeight: FontWeight.w800,
                                color: _accentDark,
                              ),
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    _RolePill(role: widget.role, large: false),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: TextButton.icon(
              onPressed: () => context.pushNamed(UserRouteNames.editProfile),
              icon: const Icon(Icons.edit_rounded, size: 16),
              label: const Text(
                'Edit Profile',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              ),
              style: TextButton.styleFrom(
                foregroundColor: _accentDark,
                backgroundColor: _accentLight.withValues(alpha: 0.5),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHARED: ROLE PILL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _RolePill extends StatelessWidget {
  const _RolePill({required this.role, required this.large});
  final String role;
  final bool large;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: large ? 16 : 10,
        vertical: large ? 6 : 4,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFF0F6E56).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFF0F6E56).withValues(alpha: 0.15),
          width: 1,
        ),
      ),
      child: Text(
        role.toUpperCase(),
        style: TextStyle(
          fontSize: large ? 12 : 10,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF0F6E56),
          letterSpacing: large ? 1.0 : 0.8,
        ),
      ),
    );
  }
}
