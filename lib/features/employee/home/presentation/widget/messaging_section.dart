import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/employee/home/presentation/provider/message_provider.dart';
import 'package:bhmh/features/shared/presentation/widgets/compose_message_panel.dart';

// =============================================================================
// MESSAGING SECTION (Employee Dashboard)
// =============================================================================

class MessagingSection extends ConsumerStatefulWidget {
  const MessagingSection({super.key});

  @override
  ConsumerState<MessagingSection> createState() => _MessagingSectionState();
}

class _MessagingSectionState extends ConsumerState<MessagingSection> {
  bool _isComposeMode = false;

  void _toggleCompose(bool value) {
    setState(() {
      _isComposeMode = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.sizeOf(context).width < 800;
    final user = ref.watch(currentUserProvider).value;

    if (!_isComposeMode) {
      return ActiveMessageCard(
        key: const ValueKey('active_card'),
        onComposeTap: () {
          if (isMobile) {
            _openComposeDialog(context, user);
          } else {
            _toggleCompose(true);
          }
        },
      );
    } else {
      return ComposeMessagePanel(
        key: const ValueKey('compose_panel'),
        recipientDisplayName:
            'My Manager', // Specific destination for employees
        recipientId: user?.adminId ?? 'broadcast',
        isMobile: false,
        showRecipientDropdown: false,
        onCancel: () => _toggleCompose(false),
        onSuccess: () => _toggleCompose(false),
      );
    }
  }

  void _openComposeDialog(BuildContext context, dynamic user) {
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
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: ComposeMessagePanel(
              isMobile: true,
              recipientDisplayName: 'My Manager',
              recipientId: user?.adminId ?? 'broadcast',
              showRecipientDropdown: false,
              onCancel: () => Navigator.pop(context),
              onSuccess: () => Navigator.pop(context),
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// ACTIVE MESSAGE CARD (Real-time from Firestore)
// =============================================================================

class ActiveMessageCard extends ConsumerWidget {
  final VoidCallback onComposeTap;

  const ActiveMessageCard({super.key, required this.onComposeTap});

  String _formatTimeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: const [
          Icon(Icons.message_outlined, color: Color(0xFF94A3B8), size: 32),
          SizedBox(height: 12),
          Text(
            'No management updates yet.',
            style: TextStyle(
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error, WidgetRef ref) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECDD3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Failed to sync messages.',
              style: TextStyle(color: Colors.red[800], fontSize: 13),
            ),
          ),
          IconButton(
            onPressed: () => ref.invalidate(recentMessagesProvider),
            icon: const Icon(Icons.refresh, size: 20),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final messagesAsync = ref.watch(recentMessagesProvider);
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Management Updates',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 16),

          // Featured Announcement Section
          messagesAsync.when(
            data: (messages) {
              if (messages.isEmpty) return _buildEmptyState();

              final message = messages.first;
              final bool isBroadcast =
                  message.recipientId == 'broadcast' ||
                  message.recipientId == null;

              return Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isBroadcast
                        ? [const Color(0xFFF0FDFA), Colors.white]
                        : [const Color(0xFFF8FAFC), Colors.white],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isBroadcast
                        ? const Color(0xFFCCFBF1)
                        : const Color(0xFFE2E8F0),
                    width: 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: isBroadcast
                                ? const Color(0xFF0D9488)
                                : const Color(0xFF64748B),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'FEATURED',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Text(
                          _formatTimeAgo(message.timestamp),
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (message.title.isNotEmpty) ...[
                      Text(
                        message.title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 4),
                    ],
                    Text(
                      message.content,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF475569),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: theme.primaryColor.withValues(alpha: 0.1),
                          child: Text(
                            message.authorName[0].toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: theme.primaryColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          "Sender: ${message.authorName}",
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(20.0),
                child: CircularProgressIndicator.adaptive(),
              ),
            ),
            error: (err, st) => _buildErrorState(err.toString(), ref),
          ),

          const SizedBox(height: 20),

          // Compose Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onComposeTap,
              icon: const Icon(Icons.send_rounded, size: 18),
              label: const Text(
                'Direct Contact Manager',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              style:
                  ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF109B85).withValues(alpha: 0.08),
                    foregroundColor: const Color(0xFF109B85),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(
                        color: Color(0xFF109B85),
                        width: 1.5,
                      ),
                    ),
                  ).copyWith(
                    overlayColor: WidgetStateProperty.all(
                      const Color(0xFF109B85).withValues(alpha: 0.1),
                    ),
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
