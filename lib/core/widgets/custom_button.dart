import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final bool isLoading;
  final String text;
  final Color? backgroundColor;
  final IconData? icon;

  const CustomButton({
    super.key,
    required this.onPressed,
    required this.isLoading,
    required this.text,
    this.backgroundColor,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    //const Color brandBlue = Color(0xFF0464EF);
    const Color brandBlue = AppColors.primaryColor;
    final Color activeColor = backgroundColor ?? brandBlue;

    return ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: activeColor,
        // ✅ MODERN: Maintains brand color but lowers opacity for "Busy" state
        disabledBackgroundColor: activeColor.withValues(alpha: 0.6),
        // ✅ MODERN: Remove shadow when loading/disabled for a flatter look
        elevation: isLoading ? 0 : 4,
        shadowColor: AppColors.primaryColor.withValues(alpha: 0.4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16), // Slightly rounder (Trend)
        ),
      ),
      child: AnimatedSwitcher(
        // ✅ SMOOTH TRANSITION: Fades between text and spinner
        duration: const Duration(milliseconds: 250),
        child: isLoading
            ? SizedBox(
                width: 20, // ✅ SMALLER: 20px is cleaner than 24px
                height: 20,
                child: const CircularProgressIndicator(
                  strokeWidth: 2.5, // ✅ THINNER: Looks more refined
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeCap: StrokeCap.round,
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: Colors.white),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    text,
                    // ✅ Key is required for AnimatedSwitcher to detect change
                    key: const ValueKey("btnText"),
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.white,
                      fontWeight: FontWeight.w700, // Thicker text is trendy
                      // fontFamily: 'Tajawal', // Suggested if using Arabic
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
