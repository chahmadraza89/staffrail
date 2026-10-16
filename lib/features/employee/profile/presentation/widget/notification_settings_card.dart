import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationSettingsCard extends ConsumerStatefulWidget {
  const NotificationSettingsCard({super.key});

  @override
  ConsumerState<NotificationSettingsCard> createState() =>
      _NotificationSettingsCardState();
}

class _NotificationSettingsCardState
    extends ConsumerState<NotificationSettingsCard> {
  bool _pushEnabled = true;
  bool _emailEnabled = true;
  bool _taskReminders = true;
  bool _adminAlerts = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  void _loadPreferences() {
    final user = ref.read(currentUserProvider).value;
    if (user != null && user.notificationPreferences != null) {
      final prefs = user.notificationPreferences!;
      setState(() {
        _pushEnabled = prefs['pushEnabled'] ?? true;
        _emailEnabled = prefs['emailEnabled'] ?? true;
        _taskReminders = prefs['taskReminders'] ?? true;
        _adminAlerts = prefs['adminAlerts'] ?? true;
      });
    }
  }

  Future<void> _updatePreference(String key, bool value) async {
    final user = ref.read(currentUserProvider).value;
    if (user == null) return;

    final updatedPrefs = Map<String, dynamic>.from(
      user.notificationPreferences ?? {},
    );
    updatedPrefs[key] = value;

    final updatedUser = user.copyWith(notificationPreferences: updatedPrefs);

    try {
      await ref.read(userServiceProvider).saveUserData(updatedUser);

      setState(() {
        if (key == 'pushEnabled') _pushEnabled = value;
        if (key == 'emailEnabled') _emailEnabled = value;
        if (key == 'taskReminders') _taskReminders = value;
        if (key == 'adminAlerts') _adminAlerts = value;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Preferences updated successfully.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update: $e')));
      }
      _loadPreferences(); // Revert on failure
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Notification Preferences',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          NotificationSwitchTile(
            title: 'Push Notifications',
            subtitle: 'Receive alerts on your device.',
            value: _pushEnabled,
            onChanged: (val) => _updatePreference('pushEnabled', val),
          ),
          const Divider(),
          NotificationSwitchTile(
            title: 'Email Notifications',
            subtitle: 'Receive updates via email.',
            value: _emailEnabled,
            onChanged: (val) => _updatePreference('emailEnabled', val),
          ),
          const Divider(),
          NotificationSwitchTile(
            title: 'Task Reminders',
            subtitle: 'Alerts for due soon and overdue tasks.',
            value: _taskReminders,
            onChanged: (val) => _updatePreference('taskReminders', val),
          ),
          const Divider(),
          NotificationSwitchTile(
            title: 'Admin Alerts',
            subtitle: 'Alerts when employees submit items for review.',
            value: _adminAlerts,
            onChanged: (val) => _updatePreference('adminAlerts', val),
          ),
        ],
      ),
    );
  }
}

/// A custom switch tile class for notification settings.
class NotificationSwitchTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const NotificationSwitchTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: SwitchListTile(
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
        ),
        value: value,
        contentPadding: EdgeInsets.zero,
        onChanged: onChanged,
      ),
    );
  }
}
