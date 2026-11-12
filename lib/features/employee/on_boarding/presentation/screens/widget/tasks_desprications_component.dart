// =============================================================================
// --- STANDALONE UI COMPONENTS ---
// =============================================================================

import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher_string.dart';

class CompletedTaskMetadataRow extends StatelessWidget {
  final String label;
  final String value;

  const CompletedTaskMetadataRow({
    super.key,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF1E293B),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class CompletedTaskFilePreview extends StatelessWidget {
  final String url;

  const CompletedTaskFilePreview({super.key, required this.url});

  @override
  Widget build(BuildContext context) {
    // Extract and decode a cleaner name (e.g. "folder/file.jpg" -> "file.jpg")
    final rawName = url.split('/').last.split('?').first;
    final decodedName = Uri.decodeComponent(rawName);
    final fileName = decodedName.split('/').last;

    final isImage = url.toLowerCase().contains(
      RegExp(r'\.(jpg|jpeg|png|webp|gif|bmp)'),
    );

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isImage)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(14),
              ),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  url,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: const Color(0xFFF1F5F9),
                    child: const Icon(
                      Icons.broken_image_rounded,
                      color: Color(0xFF94A3B8),
                      size: 48,
                    ),
                  ),
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      color: const Color(0xFFF1F5F9),
                      child: const Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF109B85),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Icon(
                    isImage
                        ? Icons.image_rounded
                        : Icons.insert_drive_file_rounded,
                    color: const Color(0xFF109B85),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        fileName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isImage ? 'Image Document' : 'PDF / Document File',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Material(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  child: InkWell(
                    onTap: () async {
                      if (await canLaunchUrlString(url)) {
                        await launchUrlString(
                          url,
                          mode: LaunchMode.externalApplication,
                        );
                      } else {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Could not open file.'),
                            ),
                          );
                        }
                      }
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: const Color(0xFF109B85).withValues(alpha: 0.2),
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'View Full',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF109B85),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class CompletedTaskSignaturePreview extends StatelessWidget {
  final String signature;

  const CompletedTaskSignaturePreview({super.key, required this.signature});

  @override
  Widget build(BuildContext context) {
    final isTyped = signature.startsWith('typed:');
    final signatureText = isTyped
        ? signature.substring(6)
        : 'Digital Signature captured';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          const Icon(Icons.gesture_rounded, color: Color(0xFF64748B), size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              signatureText,
              style: TextStyle(
                fontSize: 13,
                fontStyle: isTyped ? FontStyle.italic : FontStyle.normal,
                fontWeight: isTyped ? FontWeight.w700 : FontWeight.w500,
                color: const Color(0xFF1E293B),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CompletedTaskStatusBadge extends StatelessWidget {
  final TaskStatus status;

  const CompletedTaskStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    String label;
    IconData icon;

    switch (status) {
      case TaskStatus.completed:
        bgColor = const Color(0xFF109B85).withValues(alpha: 0.1);
        textColor = const Color(0xFF109B85);
        label = 'Completed';
        icon = Icons.check_circle_rounded;
        break;
      case TaskStatus.verified:
        bgColor = Colors.green.withValues(alpha: 0.1);
        textColor = Colors.green;
        label = 'Verified';
        icon = Icons.verified_rounded;
        break;
      case TaskStatus.signed:
        bgColor = const Color(0xFF109B85).withValues(alpha: 0.1);
        textColor = const Color(0xFF109B85);
        label = 'Signed';
        icon = Icons.edit_rounded;
        break;
      case TaskStatus.acknowledged:
        bgColor = const Color(0xFF109B85).withValues(alpha: 0.1);
        textColor = const Color(0xFF109B85);
        label = 'Acknowledged';
        icon = Icons.check_box_rounded;
        break;
      default:
        bgColor = Colors.grey.withValues(alpha: 0.1);
        textColor = Colors.grey;
        label = status.name;
        icon = Icons.info_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}
