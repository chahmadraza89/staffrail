import 'package:flutter/material.dart';

class ModernLogoutDialog extends StatelessWidget {
  final VoidCallback onConfirmLogout;

  const ModernLogoutDialog({super.key, required this.onConfirmLogout});

  @override
  Widget build(BuildContext context) {
    // 🌐 Web/Mobile unified check to prevent giant dialogs on desktop
    final isMobile = MediaQuery.of(context).size.width < 600;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      elevation: 0,
      backgroundColor:
          Colors.transparent, // We use the container below for the background
      child: Container(
        width: isMobile ? double.infinity : 400, // Constrain width on Web
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor, // Adapts to light/dark mode
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min, // Wrap content tightly
          children: [
            // 1. Soft Icon Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.08,
                ), // Soft, non-threatening red
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.logout_rounded,
                color: Color(0xFFE57373), // A muted, calming rose/coral color
                size: 32,
              ),
            ),
            const SizedBox(height: 24),

            // 2. Empathetic Title
            const Text(
              "Leaving so soon?",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Colors.black87,
                letterSpacing: -0.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),

            // 3. Clear, supportive subtitle
            const Text(
              "Are you sure you want to log out? You will need to sign back in to access your personal dashboard.",
              style: TextStyle(
                fontSize: 14,
                color: Colors.black54,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // 4. Action Buttons
            Row(
              children: [
                // Cancel Button (Safe Action)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      side: BorderSide(color: Colors.grey.shade300, width: 1.5),
                    ),
                    child: const Text(
                      "Cancel",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // Log Out Button (Destructive Action)
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context); // Dismiss dialog first
                      onConfirmLogout(); // Trigger the Riverpod sign out
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(
                        0xFFE57373,
                      ), // Matching soft rose
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      "Log Out",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
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
