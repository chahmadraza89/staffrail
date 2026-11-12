import 'package:flutter/cupertino.dart'; // Required for the modern toggle switch
import 'package:flutter/material.dart';

// ==========================================================================
// --- NEW COMPONENTS: SETTINGS TILES ---
// ==========================================================================

// Clickable row with a chevron (for Change Password, Language, etc.)
class SettingsRowTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const SettingsRowTile({
    super.key,
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
          child: Row(
            children: [
              Icon(icon, size: 22, color: const Color(0xFF64748B)), // Slate 500
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1E293B), // Slate 800
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 22,
                color: Color(0xFFCBD5E1),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Stateful row with a Toggle Switch (for Notifications)
class SettingsToggleTile extends StatefulWidget {
  final IconData icon;
  final String title;

  const SettingsToggleTile({
    super.key,
    required this.icon,
    required this.title,
  });

  @override
  State<SettingsToggleTile> createState() => _SettingsToggleTileState();
}

class _SettingsToggleTileState extends State<SettingsToggleTile> {
  bool _isToggled = true; // Default state

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        children: [
          Icon(widget.icon, size: 22, color: const Color(0xFF64748B)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              widget.title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: Color(0xFF1E293B),
              ),
            ),
          ),
          CupertinoSwitch(
            value: _isToggled,
            activeTrackColor: const Color(0xFF109B85), // Teal to match theme
            onChanged: (value) {
              setState(() => _isToggled = value);
            },
          ),
        ],
      ),
    );
  }
}

// The specialized Log Out Tile matching your attached design
class LogoutRowTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const LogoutRowTile({
    super.key,
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        splashColor: const Color(0xFFFEF2F2), // Light red splash
        highlightColor: const Color(0xFFFEF2F2).withAlpha((0.5 * 255).toInt()),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFFFEF2F2), // Ultra-soft red background
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: const Color(0xFFEF4444), // Solid red icon
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFEF4444), // Solid red text
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================================================
// --- EXISTING COMPONENTS (MAINTAINED EXACTLY) ---
// ==========================================================================

class ProfileDataRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool isLast;
  final VoidCallback? onTap; // Added for interactivity

  const ProfileDataRow({
    super.key,
    required this.label,
    required this.value,
    this.valueColor,
    this.isLast = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Flexible(
                  child: Text(
                    value,
                    textAlign: TextAlign.end,
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: valueColor ?? const Color(0xFF1E293B),
                    ),
                  ),
                ),
                if (onTap != null) ...[
                  const SizedBox(width: 8),
                  const Icon(Icons.edit_outlined,
                      size: 16, color: Color(0xFF109B85)),
                ],
              ],
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: content,
      );
    }

    return content;
  }
}

class ProfileDataColumn extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final VoidCallback? onTap; // Added for interactivity

  const ProfileDataColumn({
    super.key,
    required this.label,
    required this.value,
    this.valueColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: valueColor ?? const Color(0xFF1E293B),
                ),
              ),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 4),
              const Icon(Icons.edit_outlined,
                  size: 16, color: Color(0xFF109B85)),
            ],
          ],
        ),
      ],
    );

    if (onTap != null) {
      content = InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(4.0),
          child: content,
        ),
      );
    }

    return Expanded(child: content);
  }
}

class ProfileSectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final EdgeInsetsGeometry? contentPadding; // Added to allow edge-to-edge lists

  const ProfileSectionCard({
    super.key,
    required this.title,
    required this.child,
    this.contentPadding,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      // Default padding is 24, but we can override it (e.g. for edge-to-edge lists)
      padding: contentPadding ?? const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha((0.02 * 255).toInt()),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title needs manual padding if we set contentPadding to zero
          Padding(
            padding: contentPadding == EdgeInsets.zero
                ? const EdgeInsets.only(left: 24, top: 24, right: 24, bottom: 8)
                : EdgeInsets.zero,
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
                letterSpacing: -0.3,
              ),
            ),
          ),
          if (contentPadding == null) const SizedBox(height: 24),
          child,
          // Bottom padding if we set contentPadding to zero
          if (contentPadding == EdgeInsets.zero) const SizedBox(height: 8),
        ],
      ),
    );
  }
}
