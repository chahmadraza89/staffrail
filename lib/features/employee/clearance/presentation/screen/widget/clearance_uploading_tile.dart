import 'package:bhmh/core/shared/app_color.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:flutter/material.dart';

// the class
class ClearanceUploadingTile extends StatefulWidget {
  final String title;
  final String subtitle;
  final ClearanceStatus status;
  final VoidCallback? onCardTap;
  final VoidCallback? onUploadTap;

  const ClearanceUploadingTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.status,
    this.onCardTap,
    this.onUploadTap,
  });

  @override
  State<ClearanceUploadingTile> createState() => _ClearanceUploadingTileState();
}

class _ClearanceUploadingTileState extends State<ClearanceUploadingTile> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    // 🌐 Unified responsive check
    final bool isMobile = MediaQuery.of(context).size.width < 600;

    // --- Configuration based on Status ---
    Color themeColor;
    Color badgeBgColor;
    IconData statusIcon;
    String badgeText;
    bool showUploadButton = false;

    switch (widget.status) {
      case ClearanceStatus.verified:
        themeColor = AppColors.primaryColor; // Emerald Green
        badgeBgColor = const Color(0xFFECFDF5);
        statusIcon = Icons.check_circle_outline_rounded;
        badgeText = 'Verified';
        break;
      case ClearanceStatus.underReview:
        themeColor = modernBlue; // Blue
        badgeBgColor = const Color(0xFFEFF6FF);
        statusIcon = Icons.description_outlined;
        badgeText = 'Under Review';
        break;
      case ClearanceStatus.actionRequired:
        themeColor = modernRed; // Red
        badgeBgColor = const Color(0xFFFEF2F2);
        statusIcon = Icons.error_outline_rounded;
        badgeText = 'Action Required';
        showUploadButton = true;
        break;
      case ClearanceStatus.pending:
        themeColor = modernOrange; // Amber / Orange
        badgeBgColor = const Color(0xFFFFFBEB);
        statusIcon = Icons.error_outline_rounded;
        badgeText = 'Pending';
        showUploadButton = true;
        break;
      case ClearanceStatus.expired:
        themeColor = Colors.red.shade700;
        badgeBgColor = const Color(0xFFFEF2F2);
        statusIcon = Icons.error_outline_rounded;
        badgeText = 'Expired';
        showUploadButton = true;
        break;
    }

    final double padding = isMobile ? 16.0 : 20.0;
    final double titleSize = isMobile ? 15.0 : 16.0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovering = true),
        onExit: (_) => setState(() => _isHovering = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          // Subtle lift on Web hover
          transform: Matrix4.translationValues(
            0,
            _isHovering && !isMobile ? -3 : 0,
            0,
          ),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: _isHovering ? 0.05 : 0.02),
                blurRadius: _isHovering ? 12 : 8,
                offset: const Offset(0, 4),
              ),
            ],
            // A crisp, thin border defines the card
            border: Border.all(color: Colors.grey.shade200, width: 1),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onCardTap,
              borderRadius: BorderRadius.circular(16),
              hoverColor: Colors.grey.shade50,
              splashColor: themeColor.withValues(alpha: 0.05),
              highlightColor: Colors.transparent,
              child: Padding(
                padding: EdgeInsets.all(padding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // --- TOP ROW: Icon, Text, Badge ---
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Dynamic Leading Icon
                        Icon(statusIcon, color: themeColor, size: 24),
                        const SizedBox(width: 16),

                        // Text Content
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                maxLines: 2,
                                widget.title,
                                style: TextStyle(
                                  overflow: TextOverflow.ellipsis,

                                  fontSize: titleSize,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF0F172A),
                                  letterSpacing: -0.3,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(width: 12),

                        // Status Badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: badgeBgColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badgeText,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: themeColor,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                      ],
                    ),

                    // --- BOTTOM ROW: Upload Button (Conditional) ---
                    if (showUploadButton) ...[
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: widget.onUploadTap,
                          icon: const Icon(
                            Icons.cloud_upload_outlined,
                            size: 18,
                          ),
                          label: const Text('Upload Results'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(
                              0xFF334155,
                            ), // Dark Slate
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: BorderSide(
                              color: Colors.grey.shade300,
                              width: 1.5,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                12,
                              ), // Softer radius
                            ),
                            // Very subtle background color on hover
                            backgroundColor: Colors.transparent,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
