import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/shared/app_color.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/screens/widgets/training_timer_widget.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class TrainingDetailCard extends StatelessWidget {
  final String title;
  final String description;
  final String durationText;
  final TrainingStatus status;
  final VoidCallback onUploadTap;
  final Future<void> Function() onSubmitTap;
  final bool isLoading;
  final bool hasFile;
  final String? fileName; // Actual internal file name selected
  final String? certificateUrl; // For displaying "View Certificate" button
  final DateTime? assignedAt;

  // --- NEW: Date Selection Fields ---
  final DateTime? completionDate;
  final DateTime? expirationDate;
  final bool noExpiration;
  final Function(DateTime) onCompletionDateChanged;
  final Function(DateTime?) onExpirationDateChanged;
  final Function(bool) onNoExpirationChanged;

  const TrainingDetailCard({
    super.key,
    required this.title,
    required this.description,
    required this.durationText,
    required this.status,
    required this.onUploadTap,
    required this.onSubmitTap,
    this.isLoading = false,
    this.hasFile = false,
    this.fileName,
    this.certificateUrl,
    this.assignedAt,
    this.completionDate,
    this.expirationDate,
    this.noExpiration = false,
    required this.onCompletionDateChanged,
    required this.onExpirationDateChanged,
    required this.onNoExpirationChanged,
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
          TrainingHeader(
            title: title,
            description: description,
            durationText: durationText,
            status: status,
            isMobile: isMobile,
            assignedAt: assignedAt,
          ),
          const SizedBox(height: 24),
          if (status == TrainingStatus.completed || status == TrainingStatus.underReview)
            TrainingCompletedState(
              certificateUrl: certificateUrl,
              isUnderReview: status == TrainingStatus.underReview,
            )
          else ...[
            TrainingUploadZone(
              hasFile: hasFile,
              onTap: onUploadTap,
              fileName: fileName,
            ),
            if (hasFile) ...[
              const SizedBox(height: 24),
              TrainingDateFields(
                completionDate: completionDate,
                expirationDate: expirationDate,
                noExpiration: noExpiration,
                onCompletionDateChanged: onCompletionDateChanged,
                onExpirationDateChanged: onExpirationDateChanged,
                onNoExpirationChanged: onNoExpirationChanged,
              ),
            ],
            const SizedBox(height: 24),
            TrainingSubmitButton(
              hasFile: hasFile && (completionDate != null && (noExpiration || expirationDate != null)),
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
// --- 1. HEADER COMPONENT ---
// =============================================================================

class TrainingHeader extends StatelessWidget {
  final String title;
  final String description;
  final String durationText;
  final TrainingStatus status;
  final bool isMobile;
  final DateTime? assignedAt;

  const TrainingHeader({
    super.key,
    required this.title,
    required this.description,
    required this.durationText,
    required this.status,
    required this.isMobile,
    this.assignedAt,
  });

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    Color badgeBg;
    String badgeText;

    switch (status) {
      case TrainingStatus.completed:
        badgeColor = AppColors.primaryColor;
        badgeBg = const Color(0xFFE6F5F3);
        badgeText = 'COMPLETED';
        break;
      case TrainingStatus.overdue:
        badgeColor = modernRed;
        badgeBg = mediumOrange;
        badgeText = 'OVERDUE';
        break;
      case TrainingStatus.pending:
        badgeColor = modernBlue;
        badgeBg = const Color(0xFFEFF6FF);
        badgeText = 'PENDING';
        break;
      case TrainingStatus.inProgress:
        badgeColor = const Color(0xFF8B5CF6);
        badgeBg = const Color(0xFFF3E8FF);
        badgeText = 'IN PROGRESS';
        break;
      case TrainingStatus.underReview:
        badgeColor = modernBlue;
        badgeBg = const Color(0xFFEFF6FF);
        badgeText = 'UNDER REVIEW';
        break;
      case TrainingStatus.verified:
        badgeColor = AppColors.primaryColor;
        badgeBg = const Color(0xFFE6F5F3);
        badgeText = 'VERIFIED';
        break;
      case TrainingStatus.actionRequired:
        badgeColor = modernRed;
        badgeBg = mediumOrange;
        badgeText = 'ACTION REQUIRED';
        break;
      case TrainingStatus.notStarted:
        badgeColor = const Color(0xFF6B7280);
        badgeBg = const Color(0xFFF3F4F6);
        badgeText = 'NOT STARTED';
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
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
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
                TrainingTimerWidget(
                  assignedAt: assignedAt,
                  durationText: durationText,
                  isCompleted: status == TrainingStatus.completed,
                  style: const TextStyle(
                    fontSize: 14,
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
          style: TextStyle(
            fontSize: isMobile ? 16 : 18,
            fontWeight: FontWeight.w700,
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
// --- 2. COMPLETED STATE COMPONENT ---
// =============================================================================

class TrainingCompletedState extends StatelessWidget {
  final String? certificateUrl; // URL to view/download certificate
  final bool isUnderReview;

  const TrainingCompletedState({
    super.key,
    this.certificateUrl,
    this.isUnderReview = false,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = isUnderReview ? modernBlue : AppColors.primaryColor;
    final statusBg = isUnderReview ? const Color(0xFFEFF6FF) : const Color(0xFFF0FDF4);
    final iconBg = isUnderReview ? const Color(0xFFDBEAFE) : const Color(0xFFDCFCE7);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: statusBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: iconBg, width: 1.5),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isUnderReview ? Icons.hourglass_empty_rounded : Icons.check_rounded,
              color: statusColor,
              size: 32,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            isUnderReview ? 'Training Under Review' : 'Training Completed',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: statusColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isUnderReview
                ? 'Your certificate is being verified by the admin.'
                : 'Certificate uploaded successfully.',
            style: TextStyle(fontSize: 14, color: statusColor),
          ),
          if (certificateUrl != null && certificateUrl!.isNotEmpty) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  // Open certificate URL in browser
                  // TODO: Implement in-app PDF viewer if needed
                  launchUrl(Uri.parse(certificateUrl!));
                },
                icon: const Icon(Icons.open_in_new_rounded, size: 18),
                label: const Text('View Certificate'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryColor,
                  side: const BorderSide(color: AppColors.primaryColor),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// --- 3. UPLOAD ZONE COMPONENT ---
// =============================================================================

class TrainingUploadZone extends StatefulWidget {
  final bool hasFile;
  final String? fileName;
  final VoidCallback onTap;

  const TrainingUploadZone({
    super.key,
    required this.hasFile,
    this.fileName,
    required this.onTap,
  });

  @override
  State<TrainingUploadZone> createState() => _TrainingUploadZoneState();
}

class _TrainingUploadZoneState extends State<TrainingUploadZone> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Upload your downloaded completion certificate here (PDF, JPG, PNG).',
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
                    widget.hasFile
                        ? (widget.fileName ?? 'File ready for upload')
                        : 'Tap to select file',
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
// --- 4. SUBMIT BUTTON COMPONENT ---
// =============================================================================

class TrainingSubmitButton extends StatelessWidget {
  final bool hasFile;
  final bool isLoading;
  final VoidCallback onSubmit;

  const TrainingSubmitButton({
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
          text: 'Submit Certificate',
          backgroundColor: hasFile ? AppColors.primaryColor : null,
        ),
      ),
    );
  }
}

// =============================================================================
// --- 5. DATE FIELDS COMPONENT (NEW) ---
// =============================================================================

class TrainingDateFields extends StatelessWidget {
  final DateTime? completionDate;
  final DateTime? expirationDate;
  final bool noExpiration;
  final Function(DateTime) onCompletionDateChanged;
  final Function(DateTime?) onExpirationDateChanged;
  final Function(bool) onNoExpirationChanged;

  const TrainingDateFields({
    super.key,
    this.completionDate,
    this.expirationDate,
    required this.noExpiration,
    required this.onCompletionDateChanged,
    required this.onExpirationDateChanged,
    required this.onNoExpirationChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Certificate Details',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 16),

        // --- Completion Date ---
        _buildDatePicker(
          context,
          label: 'Completion Date',
          selectedDate: completionDate,
          onDateSelected: onCompletionDateChanged,
        ),

        const SizedBox(height: 16),

        // --- No Expiration Checkbox ---
        Row(
          children: [
            SizedBox(
              height: 24,
              width: 24,
              child: Checkbox(
                value: noExpiration,
                onChanged: (val) => onNoExpirationChanged(val ?? false),
                activeColor: AppColors.primaryColor,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'This certificate does not expire',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF334155),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),

        if (!noExpiration) ...[
          const SizedBox(height: 16),
          // --- Expiration Date ---
          _buildDatePicker(
            context,
            label: 'Expiration Date',
            selectedDate: expirationDate,
            onDateSelected: (date) => onExpirationDateChanged(date),
          ),
        ],
      ],
    );
  }

  Widget _buildDatePicker(
    BuildContext context, {
    required String label,
    required DateTime? selectedDate,
    required Function(DateTime) onDateSelected,
  }) {
    final String dateText = selectedDate != null
        ? '${selectedDate.month}/${selectedDate.day}/${selectedDate.year}'
        : 'Select Date';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final DateTime? picked = await showDatePicker(
              context: context,
              initialDate: selectedDate ?? DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime(2100),
              builder: (context, child) {
                return Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: const ColorScheme.light(
                      primary: AppColors.primaryColor,
                      onPrimary: Colors.white,
                      onSurface: Color(0xFF0F172A),
                    ),
                  ),
                  child: child!,
                );
              },
            );
            if (picked != null) {
              onDateSelected(picked);
            }
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_today_rounded,
                  size: 18,
                  color: selectedDate != null
                      ? AppColors.primaryColor
                      : const Color(0xFF64748B),
                ),
                const SizedBox(width: 12),
                Text(
                  dateText,
                  style: TextStyle(
                    fontSize: 14,
                    color: selectedDate != null
                        ? const Color(0xFF0F172A)
                        : const Color(0xFF94A3B8),
                    fontWeight: selectedDate != null
                        ? FontWeight.w600
                        : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
