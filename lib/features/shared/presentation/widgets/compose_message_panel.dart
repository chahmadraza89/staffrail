import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/admin_message_view_model.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ============================================================================
// SHARED COMPOSE MESSAGE PANEL
// ============================================================================
// A unified message composition widget used by both Admin and Employee roles.
// Eliminates code duplication between ComposeMessagePanel and ModernChatPanel.
// ============================================================================

class ComposeMessagePanel extends ConsumerStatefulWidget {
  final bool isMobile;
  final String? recipientId; // null = broadcast, specific uid = direct message
  final String recipientDisplayName;
  final VoidCallback? onCancel;
  final VoidCallback? onSuccess;
  final bool showRecipientDropdown; // Admin shows dropdown, employee may not

  const ComposeMessagePanel({
    super.key,
    required this.isMobile,
    this.recipientId,
    this.recipientDisplayName = 'Broadcast (Everyone)',
    this.onCancel,
    this.onSuccess,
    this.showRecipientDropdown = true,
  });

  @override
  ConsumerState<ComposeMessagePanel> createState() =>
      _ComposeMessagePanelState();
}

class _ComposeMessagePanelState extends ConsumerState<ComposeMessagePanel> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  bool _sendAsPush = false;
  String? _selectedRecipientId;

  @override
  void initState() {
    super.initState();
    _selectedRecipientId = widget.recipientId;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _handleSend() async {
    final title = _titleController.text.trim();
    final content = _messageController.text.trim();

    if (title.isEmpty || content.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in both Title and Message.')),
      );
      return;
    }

    final success = await ref
        .read(adminMessageViewModelProvider.notifier)
        .publishMessage(
          title: title,
          content: content,
          isPushEnabled: _sendAsPush,
          recipientId: _selectedRecipientId ?? 'broadcast',
        );

    if (!mounted) return;

    if (success) {
      if (widget.onSuccess != null) {
        widget.onSuccess!();
      } else if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
      }

      final messenger = ScaffoldMessenger.of(context);
      messenger.showSnackBar(
        const SnackBar(
          content: Text('✅ Message published successfully!'),
          backgroundColor: Color(0xFF109B85),
        ),
      );
    } else {
      final messenger = ScaffoldMessenger.of(context);
      messenger.showSnackBar(
        const SnackBar(
          content: Text('❌ Failed to publish message. Please try again.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryTeal = Color(0xFF109B85);
    final messageState = ref.watch(adminMessageViewModelProvider);
    final isLoading = messageState.isLoading;

    return SingleChildScrollView(
      child: Padding(
        padding: EdgeInsets.all(widget.isMobile ? 24.0 : 36.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Compose Message',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                IconButton(
                  onPressed: isLoading
                      ? null
                      : () {
                          if (widget.onCancel != null) {
                            widget.onCancel!();
                          } else if (Navigator.canPop(context)) {
                            Navigator.pop(context);
                          }
                        },
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      color: Color(0xFF475569),
                      size: 18,
                    ),
                  ),
                  splashRadius: 24,
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Title Field
            const Text(
              'Title',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _titleController,
              enabled: !isLoading,
              decoration: InputDecoration(
                hintText: 'e.g. Urgent Update',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 16,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: primaryTeal, width: 2),
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Recipient Dropdown (Admin only)
            if (widget.showRecipientDropdown) ...[
              const Text(
                'Recipient',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF334155),
                ),
              ),
              const SizedBox(height: 10),
              Consumer(
                builder: (context, ref, child) {
                  final employeesAsync = ref.watch(employeesProvider);

                  return employeesAsync.when(
                    data: (employees) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String?>(
                            value: _selectedRecipientId,
                            isExpanded: true,
                            hint: const Text("Broadcast (Everyone)"),
                            icon: const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              color: primaryTeal,
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text("Broadcast (Everyone)"),
                              ),
                              ...employees.map(
                                (e) => DropdownMenuItem<String?>(
                                  value: e.uid,
                                  child: Text(e.name),
                                ),
                              ),
                            ],
                            onChanged: isLoading
                                ? null
                                : (val) => setState(
                                    () => _selectedRecipientId = val,
                                  ),
                          ),
                        ),
                      );
                    },
                    loading: () => const Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    error: (e, _) {
                      final errorStr = e.toString();
                      if (errorStr.contains('failed-precondition')) {
                        return Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              '⚠️ Index Required',
                              style: TextStyle(
                                color: Colors.red,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Please check your console for the index link.',
                              style: TextStyle(fontSize: 10),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        );
                      }
                      return Text(
                        'Error: $e',
                        style: const TextStyle(fontSize: 10),
                      );
                    },
                  );
                },
              ),
              const SizedBox(height: 24),
            ] else ...[
              // Recipient Display (Employee view - no dropdown)
              const Text(
                'Recipient',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF334155),
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  widget.recipientDisplayName,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Message Field
            const Text(
              'Message',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _messageController,
              enabled: !isLoading,
              maxLines: widget.isMobile ? 4 : 5,
              decoration: InputDecoration(
                hintText: 'Type your message here...',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                contentPadding: const EdgeInsets.all(20),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: primaryTeal, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Push Toggle
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Colors.grey.shade200),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Send as Push Notification',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.showRecipientDropdown
                              ? 'Notify all staff immediately'
                              : 'Notify staff immediately',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  CupertinoSwitch(
                    value: _sendAsPush,
                    activeTrackColor: primaryTeal,
                    onChanged: isLoading
                        ? null
                        : (val) => setState(() => _sendAsPush = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: isLoading ? null : () => Navigator.pop(context),
                    style: TextButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(100),
                      ),
                    ),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _handleSend,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryTeal,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(100),
                      ),
                    ),
                    child: isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Publish',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
