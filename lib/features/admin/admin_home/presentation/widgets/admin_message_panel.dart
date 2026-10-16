// ============================================================================
// 5. COMPOSE MESSAGE PANEL (Upgraded UI)
// ============================================================================

import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/admin_message_view_model.dart';

class ComposeMessagePanel extends ConsumerStatefulWidget {
  final bool isMobile;
  const ComposeMessagePanel({super.key, required this.isMobile});

  @override
  ConsumerState<ComposeMessagePanel> createState() =>
      _ComposeMessagePanelState();
}

class _ComposeMessagePanelState extends ConsumerState<ComposeMessagePanel> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  bool _sendAsPush = false;
  String? _selectedRecipientId; // null or 'broadcast' means everyone

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const Color primaryTeal = Color(0xFF109B85);

    return Padding(
      padding: EdgeInsets.all(widget.isMobile ? 24.0 : 36.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                onPressed: () => Navigator.pop(context),
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
            decoration: InputDecoration(
              hintText: 'e.g. Urgent Update',
              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFFF1F5F9), // Soft Slate Fill
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
                        onChanged: (val) =>
                            setState(() => _selectedRecipientId = val),
                      ),
                    ),
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                error: (e, _) {
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red),
                      const SizedBox(height: 8),
                      Text(
                        'Unable to load employees: $e',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: Colors.red),
                      ),
                      TextButton(
                        onPressed: () {
                          ref.invalidate(employeesProvider);
                        },
                        child: const Text('Try Again'),
                      ),
                    ],
                  );
                },
              );
            },
          ),
          const SizedBox(height: 24),

          const Text(
            'Message',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 10),
          // Borderless soft input
          TextField(
            controller: _messageController,
            maxLines: widget.isMobile ? 4 : 5,
            decoration: InputDecoration(
              hintText: 'Type your message here...',
              hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
              filled: true,
              fillColor: const Color(0xFFF1F5F9), // Soft Slate Fill
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

          // Clean Push Toggle
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
                        'Notify all staff immediately',
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
                  onChanged: (val) => setState(() => _sendAsPush = val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),

          // Upgraded Action Buttons
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
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
                child: Consumer(
                  builder: (context, ref, child) {
                    final messageState = ref.watch(
                      adminMessageViewModelProvider,
                    );
                    final isLoading = messageState.isLoading;

                    return ElevatedButton(
                      onPressed: isLoading
                          ? null
                          : () async {
                              final title = _titleController.text.trim();
                              final content = _messageController.text.trim();
                              if (title.isEmpty || content.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Please fill in both Title and Message.',
                                    ),
                                  ),
                                );
                                return;
                              }

                              final success = await ref
                                  .read(adminMessageViewModelProvider.notifier)
                                  .publishMessage(
                                    title: title,
                                    content: content,
                                    isPushEnabled: _sendAsPush,
                                    recipientId:
                                        _selectedRecipientId ?? 'broadcast',
                                  );

                              if (!context.mounted) return;

                              if (success) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      '✅ Message published successfully!',
                                    ),
                                    backgroundColor: Color(0xFF109B85),
                                  ),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      '❌ Failed to publish message. Please try again.',
                                    ),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            },
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
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
