import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/employee/home/presentation/provider/message_provider.dart';
import 'package:bhmh/features/shared/presentation/widgets/compose_message_panel.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/employee/home/presentation/provider/notification_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_dashboard_directory_section.dart';

// ============================================================================
// 1. MAIN WRAPPER (Handles Web vs Mobile Layout)
// ============================================================================

class AdminDashboardActionsSection extends StatelessWidget {
  const AdminDashboardActionsSection({super.key});

  @override
  Widget build(BuildContext context) {
    // 🌐 RULE: Handle Web Split-View vs Mobile Single View
    final bool isDesktop = MediaQuery.of(context).size.width >= 1024;

    if (isDesktop) {
      return const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left Side: Latest Directory (replacing old tracking)
          Expanded(flex: 6, child: AdminDashboardDirectorySection()),
          SizedBox(width: 24),
          // Right Side: Notifications (Pushed down to align with testing containers)
          Expanded(
            flex: 4,
            child: Column(
              children: [
                SizedBox(
                  height: 38,
                ), // Offset to match "Latest Activity" header
                AdminNotificationCard(),
              ],
            ),
          ),
        ],
      );
    }

    // Mobile fallback (Notification only - Directory is shown separately above)
    return const AdminNotificationCard();
  }
}

// ============================================================================
// 2. ACTIVE NOTIFICATION CARD (Upgraded UI)
// ============================================================================

class AdminNotificationCard extends ConsumerWidget {
  const AdminNotificationCard({super.key});

  void _openComposeMessage(BuildContext context) {
    final bool isMobile = context.screenWidth < 800;

    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
            child: SafeArea(
              top: false,
              child: ComposeMessagePanel(
                isMobile: true,
                showRecipientDropdown: true,
              ),
            ),
          ),
        ),
      );
    } else {
      showDialog(
        context: context,
        barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.4),
        builder: (context) => Dialog(
          elevation: 0,
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          child: const SizedBox(
            width: 520,
            child: ComposeMessagePanel(
              isMobile: false,
              showRecipientDropdown: true,
            ),
          ),
        ),
      );
    }
  }

  String _formatTimeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final messagesAsync = ref.watch(recentMessagesProvider);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200, width: 1),
        boxShadow: [
          BoxShadow(
            color: const Color(
              0xFF64748B,
            ).withValues(alpha: 0.04), // Slate tinted shadow
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Notifications',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              if (messagesAsync.value?.isNotEmpty ?? false)
                Tooltip(
                  message: 'Clear All',
                  child: IconButton(
                    icon: const Icon(Icons.clear_all_rounded, color: Colors.grey),
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Clear Notifications'),
                          content: const Text('Are you sure you want to clear all notifications?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(false),
                              child: const Text('Cancel'),
                            ),
                            ElevatedButton(
                              onPressed: () => Navigator.of(context).pop(true),
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                              child: const Text('Clear', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      );
                      
                      if (confirm == true) {
                        final authValue = ref.read(currentUserProvider).value;
                        if (authValue?.uid != null) {
                          await ref.read(notificationServiceProvider).clearAllNotifications(authValue!.uid);
                        }
                      }
                    },
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),

          // Upgraded Message List — connected to Firestore
          messagesAsync.when(
            data: (messages) {
              if (messages.isEmpty) {
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'No messages published yet. Compose one below.',
                    style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
                  ),
                );
              }
              return Column(
                children: messages.map((message) {
                  final bool isBroadcast =
                      message.recipientId == 'broadcast' ||
                      message.recipientId == null;

                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isBroadcast
                          ? const Color(0xFFF0FDFA)
                          : const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isBroadcast
                            ? const Color(0xFFCCFBF1).withValues(alpha: 0.5)
                            : const Color(0xFFE0E7FF),
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isBroadcast
                                  ? 'Broadcast'
                                  : 'Message from ${message.authorName}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: isBroadcast
                                    ? const Color(0xFF0F766E)
                                    : const Color(0xFF4338CA),
                                letterSpacing: 0.2,
                              ),
                            ),
                            Text(
                              _formatTimeAgo(message.timestamp),
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey.shade400,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (message.title.isNotEmpty) ...[
                          Text(
                            message.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                        ],
                        Text(
                          message.content,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF334155),
                            height: 1.4,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const Padding(
              padding: EdgeInsets.all(16.0),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (err, st) => Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F0),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFFCCCC), width: 1),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    size: 32,
                    color: Colors.red.shade300,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Failed to load messages',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.red.shade400,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      ref.invalidate(recentMessagesProvider);
                    },
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Retry'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF109B85),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Upgraded Pill Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _openComposeMessage(context),
              icon: const Icon(Icons.add_comment_rounded, size: 18),
              label: const Text(
                'Compose New Message',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF109B85),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(100),
                ), // Trendy Pill Shape
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// 4. THE SMART ACTION TILE (Upgraded to use Status Pills)
// ============================================================================

class AdminActionTile extends StatefulWidget {
  final String name;
  final String task;
  final String statusText;
  final Color statusColor;
  final VoidCallback onReviewPressed;

  const AdminActionTile({
    super.key,
    required this.name,
    required this.task,
    required this.statusText,
    required this.statusColor,
    required this.onReviewPressed,
  });

  @override
  State<AdminActionTile> createState() => _AdminActionTileState();
}

class _AdminActionTileState extends State<AdminActionTile> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 800;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovering = true),
        onExit: (_) => setState(() => _isHovering = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOutCirc,
          transform: Matrix4.translationValues(
            0,
            _isHovering && !isMobile ? -3 : 0,
            0,
          ),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: _isHovering
                  ? widget.statusColor.withValues(alpha: 0.4)
                  : Colors.grey.shade200,
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.statusColor.withValues(alpha: _isHovering ? 0.08 : 0.0),
                blurRadius: _isHovering ? 20 : 0,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.task,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Modern Status Pill instead of a dot
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: widget.statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        widget.statusText,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: widget.statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Outlined Review Button (Cleaner, less visually heavy until hovered)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: widget.onReviewPressed,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF109B85),
                      side: BorderSide(
                        color: _isHovering
                            ? const Color(0xFF109B85)
                            : Colors.grey.shade300,
                        width: 1.5,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Review Now',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 16),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
