import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

// [NEW] Custom Search Bar Widget
class CustomSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final String searchName;
  final Widget? prefixIcon;
  final VoidCallback? onPrefixPressed;
  final ValueChanged<String>? onSearchChanged;
  final ValueChanged<String>? onSubmitted;

  const CustomSearchBar({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.searchName,
    this.prefixIcon,
    this.onPrefixPressed,
    this.onSearchChanged,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        style: const TextStyle(color: Colors.white),
        onChanged: onSearchChanged,
        onSubmitted: onSubmitted,
        decoration: InputDecoration(
          hintText: searchName,
          hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          prefixIcon: prefixIcon != null
              ? IconButton(
                  icon: prefixIcon!,
                  color: Colors.white70,
                  onPressed: onPrefixPressed,
                )
              : const Icon(LucideIcons.search, color: Colors.white38),
          suffixIcon: controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  color: Colors.white38,
                  onPressed: () {
                    controller.clear();
                    onSearchChanged?.call("");
                  },
                )
              : null,
        ),
      ),
    );
  }
}
