//=============================================================================
// --- SUB-COMPONENTS ---
// =============================================================================

import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/features/admin/admin_clearance/presentation/admin_clearance_view_data.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class DocumentHeader extends StatelessWidget {
  final ClearanceDocument document;
  const DocumentHeader({super.key, required this.document});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              Icon(Icons.description_rounded, color: AppColors.primaryColor),
              SizedBox(width: 12),
              Text(
                'Verification Evidence',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,

                  color: AppColors.primaryColor,
                ),
              ),
            ],
          ),
          if (document.url != null)
            TextButton.icon(
              onPressed: () => _launchURL(document.url!),
              icon: const Icon(Icons.download_rounded, size: 18),
              label: const Text('Download PDF'),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF109B85),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _launchURL(String url) async {
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class AdminDocumentPreview extends StatelessWidget {
  final ClearanceDocument document;
  const AdminDocumentPreview({super.key, required this.document});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
          ),
        ],
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.picture_as_pdf_rounded,
              size: 64,
              color: Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              document.fileName,
              style: const TextStyle(
                color: AppColors.primaryColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SubjectProfileCard extends StatelessWidget {
  final ClearanceSubject subject;
  const SubjectProfileCard({super.key, required this.subject});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Container(
          decoration: const BoxDecoration(
            border: Border(
              left: BorderSide(color: AppColors.primaryColor, width: 4),
            ),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Employee Information',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  // color: Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: const Color(0xFFF1F5F9),
                    child: Text(
                      subject.initials,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          subject.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryColor,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subject.roleOrId,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Divider(height: 1, color: Color(0xFFF1F5F9)),
              ),
              InfoRow(
                label: 'CLEARANCE TYPE',
                value: subject.clearanceType,
                icon: Icons.medical_services_rounded,
                iconColor: const Color(0xFF10B981),
              ),
              const SizedBox(height: 16),
              InfoRow(label: 'SUBMITTED', value: subject.submittedDate),
              const SizedBox(height: 16),
              InfoRow(label: 'DEPARTMENT', value: subject.department),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'STATUS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      // color: AppColors.primaryColor.with,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.circle,
                          size: 8,
                          color: AppColors.primaryColor,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          subject.status,
                          style: const TextStyle(
                            color: AppColors.primaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  final Color? iconColor;
  const InfoRow({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            // color: Color(0xFF94A3B8),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: iconColor),
                const SizedBox(width: 6),
              ],
              Flexible(
                child: Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryColor,
                  ),
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class MobileDocumentCard extends StatelessWidget {
  final ClearanceDocument document;
  const MobileDocumentCard({super.key, required this.document});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.description_rounded,
              color: Color(0xFF109B85),
              size: 32,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            document.fileName,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: AppColors.primaryColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${document.fileSize} • ${document.pages} Pages',
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 20),
          if (document.url != null)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _launchURL(document.url!),
                icon: const Icon(Icons.download_rounded, size: 18),
                label: const Text(
                  'DOWNLOAD PDF',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF109B85),
                  side: const BorderSide(color: Color(0xFF109B85)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
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

  Future<void> _launchURL(String url) async {
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class HistoryCard extends StatelessWidget {
  final List<ClearanceHistoryEvent> events;
  const HistoryCard({super.key, required this.events});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
      ),
      child: Column(
        children: events.map((event) {
          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Column(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: event.dotColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    if (!event.isLast)
                      Expanded(
                        child: Container(width: 2, color: Colors.grey.shade200),
                      ),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event.title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${event.timestamp} by ${event.author}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

class ActionButtons extends StatelessWidget {
  final VoidCallback onReject;
  final VoidCallback? onVerifyTrigger;
  final bool isLoading;

  const ActionButtons({
    super.key,
    required this.onReject,
    this.onVerifyTrigger,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          flex: onVerifyTrigger != null ? 4 : 10,
          child: OutlinedButton(
            onPressed: isLoading ? null : onReject,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFEF4444),
              side: const BorderSide(color: Color(0xFFFECACA), width: 1.5),
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            // icon: const Icon(Icons.close_rounded, size: 18),
            child: const Text(
              'Reject',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ),
        ),
        if (onVerifyTrigger != null) ...[
          const SizedBox(width: 16),
          Expanded(
            flex: 6,
            child: CustomButton(
              onPressed: isLoading ? () {} : onVerifyTrigger!,
              text: 'Verify & Sign',
              isLoading: isLoading,
            ),
          ),
        ],
      ],
    );
  }
}
