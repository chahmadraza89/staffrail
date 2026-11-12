import 'package:bhmh/core/widgets/custom_search_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// [NEW] Universal Search Bar implementation
class UniversalSearchBar extends ConsumerStatefulWidget {
  final String hintText;
  final dynamic queryProvider; // Dynamic to support various NotifierProviders
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<String> onSubmitted;
  final ValueChanged<bool> onFocusChanged;

  const UniversalSearchBar({
    super.key,
    required this.hintText,
    required this.queryProvider,
    required this.onQueryChanged,
    required this.onSubmitted,
    required this.onFocusChanged,
  });

  @override
  ConsumerState<UniversalSearchBar> createState() => _UniversalSearchBarState();
}

class _UniversalSearchBarState extends ConsumerState<UniversalSearchBar> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      widget.onFocusChanged(_focusNode.hasFocus);
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 1. Listen to the provider to sync external changes
    ref.listen(widget.queryProvider, (prev, next) {
      final String textValue = next != null ? next.toString() : "";

      if (_controller.text != textValue) {
        _controller.text = textValue;
        _controller.selection = TextSelection.fromPosition(
          TextPosition(offset: textValue.length),
        );
      }
    });

    // Reuse existing CustomSearchBar but wrap with provider logic
    return CustomSearchBar(
      controller: _controller,
      focusNode: _focusNode,
      searchName: widget.hintText,
      prefixIcon: _focusNode.hasFocus ? const Icon(Icons.arrow_back) : null,
      onPrefixPressed: _focusNode.hasFocus ? () => _focusNode.unfocus() : null,
      onSearchChanged: widget.onQueryChanged,
      onSubmitted: (value) {
        widget.onSubmitted(value);
        _focusNode.unfocus();
      },
    );
  }
}
