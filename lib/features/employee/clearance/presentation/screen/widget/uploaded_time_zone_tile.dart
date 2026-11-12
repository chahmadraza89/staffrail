import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';

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
    final bool hasFile = widget.hasFile;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              hasFile ? Icons.info_outline : Icons.upload_file_outlined,
              size: 16,
              color: hasFile ? AppColors.primaryColor : const Color(0xFF64748B),
            ),
            const SizedBox(width: 3),
            Text(
              maxLines: 1,
              hasFile
                  ? 'File selected.You can change it anytime.'
                  : 'Upload your document (PDF, JPG, PNG)',
              style: TextStyle(
                overflow: TextOverflow.ellipsis,

                fontSize: 12,
                color: hasFile
                    ? AppColors.primaryColor
                    : const Color(0xFF64748B),
                fontWeight: hasFile ? FontWeight.w500 : FontWeight.normal,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        MouseRegion(
          onEnter: (_) => setState(() => _isHovering = true),
          onExit: (_) => setState(() => _isHovering = false),
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(20),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
              decoration: BoxDecoration(
                gradient: hasFile
                    ? LinearGradient(
                        colors: [
                          AppColors.primaryColor.withValues(alpha: 0.05),
                          AppColors.accentColor.withValues(alpha: 0.03),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                color: !hasFile
                    ? (_isHovering ? const Color(0xFFF8FAFC) : Colors.white)
                    : null,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: hasFile
                      ? AppColors.primaryColor.withValues(alpha: 0.5)
                      : (_isHovering
                            ? AppColors.primaryColor.withValues(alpha: 0.3)
                            : const Color(0xFFE2E8F0)),
                  width: hasFile ? 2 : 1.5,
                  style: BorderStyle.solid,
                ),
                boxShadow: [
                  BoxShadow(
                    color: hasFile
                        ? AppColors.primaryColor.withValues(alpha: 0.1)
                        : Colors.black.withValues(alpha: 0.02),
                    blurRadius: hasFile ? 12 : 8,
                    offset: const Offset(0, 4),
                    spreadRadius: hasFile ? 0 : -2,
                  ),
                ],
              ),
              child: Column(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: hasFile
                          ? LinearGradient(
                              colors: [
                                AppColors.primaryColor.withValues(alpha: 0.2),
                                AppColors.accentColor.withValues(alpha: 0.15),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            )
                          : null,
                      color: !hasFile ? const Color(0xFFF1F5F9) : null,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: hasFile
                              ? AppColors.primaryColor.withValues(alpha: 0.3)
                              : Colors.black.withValues(alpha: 0.05),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(
                      hasFile
                          ? Icons.insert_drive_file_rounded
                          : Icons.cloud_upload_outlined,
                      color: hasFile
                          ? AppColors.primaryColor
                          : const Color(0xFF64748B),
                      size: 36,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    hasFile
                        ? 'certificate_2026.pdf'
                        : 'Tap to browse or drag & drop',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: hasFile
                          ? AppColors.primaryColor
                          : const Color(0xFF0F172A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    hasFile ? 'Ready to upload' : 'Max file size: 10MB',
                    style: TextStyle(
                      fontSize: 13,
                      color: hasFile
                          ? AppColors.primaryColor.withValues(alpha: 0.8)
                          : const Color(0xFF94A3B8),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (hasFile) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.check_circle_rounded,
                            size: 16,
                            color: AppColors.primaryColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'File validated',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.primaryColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
