import 'package:bhmh/core/shared/app_color.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:flutter/material.dart';

class ClearanceDetailCard extends StatelessWidget {
  final String title;
  final String description;
  final String durationText;
  final ClearanceStatus status;
  final String? rejectionReason;
  final VoidCallback onUploadTap;
  final Future<void> Function() onSubmitTap;
  final bool isLoading;
  final bool hasFile;

  const ClearanceDetailCard({
    super.key,
    required this.title,
    required this.description,
    required this.durationText,
    required this.status,
    this.rejectionReason,
    required this.onUploadTap,
    required this.onSubmitTap,
    this.isLoading = false,
    this.hasFile = false,
  });

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;
    final double padding = isMobile ? 20.0 : 28.0;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClearanceHeader(
            title: title,
            description: description,
            durationText: durationText,
            status: status,
            isMobile: isMobile,
          ),
          if (status == ClearanceStatus.actionRequired &&
              rejectionReason != null &&
              rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 24),
            _RejectionReasonPanel(reason: rejectionReason!),
          ],
          const SizedBox(height: 24),
          if (status == ClearanceStatus.verified)
            const ClearanceCompletedState()
          else ...[
            ClearanceUploadZone(hasFile: hasFile, onTap: onUploadTap),
            const SizedBox(height: 20),
            ClearanceSubmitButton(
              hasFile: hasFile,
              isLoading: isLoading,
              onSubmit: onSubmitTap,
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// REJECTION PANEL
// =============================================================================

class _RejectionReasonPanel extends StatelessWidget {
  final String reason;
  const _RejectionReasonPanel({required this.reason});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFEE2E2), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.error_outline_rounded, color: Color(0xFFB91C1C), size: 18),
              SizedBox(width: 8),
              Text(
                'Rejection Reason',
                style: TextStyle(
                  color: Color(0xFF991B1B),
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            reason,
            style: const TextStyle(
              color: Color(0xFFB91C1C),
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// HEADER
// =============================================================================

class ClearanceHeader extends StatelessWidget {
  final String title;
  final String description;
  final String durationText;
  final ClearanceStatus status;
  final bool isMobile;

  const ClearanceHeader({
    super.key,
    required this.title,
    required this.description,
    required this.durationText,
    required this.status,
    required this.isMobile,
  });

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    Color badgeBg;
    String badgeText;

    switch (status) {
      case ClearanceStatus.verified:
        badgeColor = AppColors.primaryColor;
        badgeBg = const Color(0xFFE6F5F3);
        badgeText = 'VERIFIED';
        break;
      case ClearanceStatus.actionRequired:
        badgeColor = modernRed;
        badgeBg = const Color(0xFFFEF2F2);
        badgeText = 'ACTION REQUIRED';
        break;
      case ClearanceStatus.pending:
        badgeColor = modernBlue;
        badgeBg = const Color(0xFFEFF6FF);
        badgeText = 'PENDING';
        break;
      case ClearanceStatus.underReview:
        badgeColor = const Color(0xFF7C3AED);
        badgeBg = const Color(0xFFF3E8FF);
        badgeText = 'UNDER REVIEW';
        break;
      case ClearanceStatus.expired:
        badgeColor = Colors.red.shade700;
        badgeBg = const Color(0xFFFEF2F2);
        badgeText = 'EXPIRED';
        break;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: badgeBg,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                badgeText,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: badgeColor,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            Row(
              children: [
                const Icon(
                  Icons.access_time_rounded,
                  size: 16,
                  color: Color(0xFF64748B),
                ),
                const SizedBox(width: 4),
                Text(
                  durationText,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: isMobile ? 18 : 20,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          description,
          style: const TextStyle(
            fontSize: 15,
            color: Color(0xFF64748B),
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// COMPLETED STATE
// =============================================================================

class ClearanceCompletedState extends StatelessWidget {
  const ClearanceCompletedState({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDCFCE7), width: 1.5),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFFDCFCE7),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_rounded,
              color: AppColors.primaryColor,
              size: 32,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Clearance Verified',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryColor,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Document submitted and verified successfully.',
            style: TextStyle(fontSize: 14, color: AppColors.primaryColor),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// UPLOAD ZONE
// =============================================================================

class ClearanceUploadZone extends StatefulWidget {
  final bool hasFile;
  final VoidCallback onTap;

  const ClearanceUploadZone({
    super.key,
    required this.hasFile,
    required this.onTap,
  });

  @override
  State<ClearanceUploadZone> createState() => _ClearanceUploadZoneState();
}

class _ClearanceUploadZoneState extends State<ClearanceUploadZone> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Upload your clearance document here (PDF, JPG, PNG).',
          style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
        ),
        const SizedBox(height: 12),
        MouseRegion(
          onEnter: (_) => setState(() => _isHovering = true),
          onExit: (_) => setState(() => _isHovering = false),
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(16),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
              decoration: BoxDecoration(
                color: widget.hasFile
                    ? const Color(0xFFF0FDF4)
                    : (_isHovering ? const Color(0xFFF8FAFC) : Colors.white),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: widget.hasFile
                      ? AppColors.primaryColor
                      : (_isHovering
                            ? const Color(0xFF94A3B8)
                            : const Color(0xFFCBD5E1)),
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: widget.hasFile
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFF1F5F9),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      widget.hasFile
                          ? Icons.file_present_rounded
                          : Icons.cloud_upload_outlined,
                      color: widget.hasFile
                          ? AppColors.primaryColor
                          : const Color(0xFF64748B),
                      size: 28,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.hasFile ? 'Document selected' : 'Tap to select file',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: widget.hasFile
                          ? AppColors.primaryColor
                          : const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// SUBMIT BUTTON
// =============================================================================

class ClearanceSubmitButton extends StatelessWidget {
  final bool hasFile;
  final bool isLoading;
  final VoidCallback onSubmit;

  const ClearanceSubmitButton({
    super.key,
    required this.hasFile,
    this.isLoading = false,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: context.screenWidth * 0.6,
        child: CustomButton(
          onPressed: hasFile ? onSubmit : null,
          isLoading: isLoading,
          text: 'Submit Document',
          backgroundColor: hasFile ? AppColors.primaryColor : null,
        ),
      ),
    );
  }
}
