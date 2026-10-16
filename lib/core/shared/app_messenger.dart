import 'package:bhmh/core/shared/scaffold_messenger_key.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class ToastService {
  // Use a GlobalKey in your MaterialApp to access this from anywhere
  // static final GlobalKey<ScaffoldMessengerState> messengerKey = GlobalKey<ScaffoldMessengerState>();

  static void showSuccess(BuildContext context, String message) {
    _showToast(
      context,
      message,
      color: const Color(0xFF14532D), // Deep Green
      icon: LucideIcons.checkCircle,
      title: "Success",
    );
  }

  static void showError(BuildContext context, String message) {
    _showToast(
      context,
      message,
      color: const Color(0xFFB91C1C), // Deep Red
      icon: LucideIcons.alertCircle,
      title: "Error",
    );
  }

  static void showWarning(BuildContext context, String message) {
    _showToast(
      context,
      message,
      color: const Color(0xFFD97706), // Amber
      icon: LucideIcons.alertTriangle,
      title: "Attention",
    );
  }

  static void _showToast(
    BuildContext context,
    String message, {
    required Color color,
    required IconData icon,
    required String title,
  }) {
    scaffoldMessengerKey.currentState?.hideCurrentSnackBar(); // Clear queue

    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        // 1. FLOATING BEHAVIOR (The Trend)
        behavior: SnackBarBehavior.floating,
        elevation: 0, // We manually handle shadows in the decoration
        backgroundColor:
            Colors.transparent, // Transparent so we can draw our own box
        // 2. LAYOUT & SPACING
        margin: const EdgeInsets.all(16), // Floating off the edges
        padding: EdgeInsets.zero, // Remove default padding
        // 3. CUSTOM DURATION
        duration: const Duration(seconds: 4),

        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
            // boxShadow: [
            //   BoxShadow(
            //     color: Colors.black.withValues(alpha: 0.1),
            //     blurRadius: 10,
            //     offset: const Offset(0, 4),
            //   ),
            // ],
          ),
          child: Row(
            children: [
              // A. Status Indicator (Colored Icon with background)
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),

              const SizedBox(width: 12),

              // B. Text Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Title
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    // Message
                    Text(
                      message,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // C. Dismiss Button (Optional but UX friendly)
              IconButton(
                icon: const Icon(Icons.close, size: 16, color: Colors.grey),
                onPressed: () {
                  ScaffoldMessenger.of(context).hideCurrentSnackBar();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
