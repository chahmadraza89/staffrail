// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/admin_clearance_view_data.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/provider/admin_clearance_view_model.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/screen/widget/admin_clearance_cards_view.dart';
import 'package:bhmh/features/shared/presentation/widgets/app_signature_pad.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class AdminClearanceView extends ConsumerStatefulWidget {
  final String employeeId;
  final String clearanceId;
  final ClearanceSubject subject;
  final List<ClearanceHistoryEvent> historyEvents;
  final ClearanceDocument document;
  final ClearanceStatus status;

  const AdminClearanceView({
    super.key,
    required this.employeeId,
    required this.clearanceId,
    required this.subject,
    required this.historyEvents,
    required this.document,
    required this.status,
  });

  @override
  ConsumerState<AdminClearanceView> createState() => _AdminClearanceViewState();
}

class _AdminClearanceViewState extends ConsumerState<AdminClearanceView> {
  bool _showSignaturePad = false;

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 900;
    final vmState = ref.watch(adminClearanceViewModelProvider);

    return Stack(
      children: [
        isMobile
            ? AdminMobileLayout(
                widget: widget,
                showSignaturePad: _showSignaturePad,
                isLoading: vmState.isLoading,
                onVerify: _handleVerify,
                onReject: _handleReject,
                onVerifyTrigger: () => setState(() => _showSignaturePad = true),
              )
            : AdminWebLayout(
                widget: widget,
                showSignaturePad: _showSignaturePad,
                isLoading: vmState.isLoading,
                onVerify: _handleVerify,
                onReject: _handleReject,
                onVerifyTrigger: () => setState(() => _showSignaturePad = true),
              ),
        
      ],
    );
  }

  Future<void> _handleVerify(String signatureData) async {
    final success = await ref
        .read(adminClearanceViewModelProvider.notifier)
        .verifyClearance(
          employeeId: widget.employeeId,
          clearanceId: widget.clearanceId,
          signatureData: signatureData,
        );
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Clearance Verified & Signed')),
      );
      context.pop();
    }
  }

  void _handleReject() {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Verification'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            hintText: 'Please specify the reason for rejection...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final reason = reasonController.text.trim();
              if (reason.isEmpty) return;
              final success = await ref
                  .read(adminClearanceViewModelProvider.notifier)
                  .rejectClearance(
                    employeeId: widget.employeeId,
                    clearanceId: widget.clearanceId,
                    reason: reason,
                  );
              if (success && mounted) {
                Navigator.pop(context);
                context.pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Clearance Rejected')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Reject', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// --- LAYOUT COMPONENTS ---
// =============================================================================

class AdminMobileLayout extends StatelessWidget {
  final AdminClearanceView widget;
  final bool showSignaturePad;
  final bool isLoading;
  final Function(String) onVerify;
  final VoidCallback onReject;
  final VoidCallback onVerifyTrigger;

  const AdminMobileLayout({
    super.key,
    required this.widget,
    required this.showSignaturePad,
    required this.isLoading,
    required this.onVerify,
    required this.onReject,
    required this.onVerifyTrigger,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SubjectProfileCard(subject: widget.subject),
                const SizedBox(height: 20),
                const Text(
                  'Verification Evidence',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    //color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                MobileDocumentCard(document: widget.document),
                const SizedBox(height: 24),
                if (showSignaturePad) ...[
                  const Text(
                    'Reviewer Signature Required',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      //color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  AppSignaturePad(onSigned: onVerify, onClear: () {}, isSubmitting: isLoading),
                  const SizedBox(height: 24),
                ],
                const Text(
                  'History',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    //color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 12),
                HistoryCard(events: widget.historyEvents),
              ],
            ),
          ),
        ),
        if ((widget.status == ClearanceStatus.underReview || widget.status == ClearanceStatus.verified) && !showSignaturePad)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              child: ActionButtons(
                onReject: onReject,
                onVerifyTrigger: widget.status == ClearanceStatus.underReview ? onVerifyTrigger : null,
                isLoading: isLoading,
              ),
            ),
          ),
      ],
    );
  }
}

class AdminWebLayout extends StatelessWidget {
  final AdminClearanceView widget;
  final bool showSignaturePad;
  final bool isLoading;
  final Function(String) onVerify;
  final VoidCallback onReject;
  final VoidCallback onVerifyTrigger;

  const AdminWebLayout({
    super.key,
    required this.widget,
    required this.showSignaturePad,
    required this.isLoading,
    required this.onVerify,
    required this.onReject,
    required this.onVerifyTrigger,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 35,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SubjectProfileCard(subject: widget.subject),
                  const SizedBox(height: 24),
                  const Text(
                    'History',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      //color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  HistoryCard(events: widget.historyEvents),
                ],
              ),
            ),
          ),
          const SizedBox(width: 32),
          Expanded(
            flex: 65,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.grey.shade200, width: 1.5),
              ),
              child: Column(
                children: [
                  DocumentHeader(document: widget.document),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      color: const Color(0xFFF8FAFC),
                      padding: const EdgeInsets.all(32),
                      child: AdminDocumentPreview(document: widget.document),
                    ),
                  ),
                  if (widget.status == ClearanceStatus.underReview || widget.status == ClearanceStatus.verified)
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: const BorderRadius.vertical(
                          bottom: Radius.circular(24),
                        ),
                        border: Border(
                          top: BorderSide(color: Colors.grey.shade200),
                        ),
                      ),
                      child: showSignaturePad
                          ? AppSignaturePad(onSigned: onVerify, onClear: () {}, isSubmitting: isLoading)
                          : ActionButtons(
                              onReject: onReject,
                              onVerifyTrigger: widget.status == ClearanceStatus.underReview ? onVerifyTrigger : null,
                              isLoading: isLoading,
                            ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
