import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

// [NEW] Universal Search Suggestions implementation
class UniversalSearchSuggestions extends StatelessWidget {
  final String query;
  final List<String> history;
  final List<String> suggestions;
  final ValueChanged<String> onSelect;
  final ValueChanged<String> onRemoveHistory;

  const UniversalSearchSuggestions({
    super.key,
    required this.query,
    required this.history,
    required this.suggestions,
    required this.onSelect,
    required this.onRemoveHistory,
  });

  @override
  Widget build(BuildContext context) {
    // A. Autocomplete Mode (Query is not empty)
    if (query.isNotEmpty) {
      if (suggestions.isEmpty) {
        return _buildStatusMessage("No matches found");
      }

      return ListView.builder(
        itemCount: suggestions.length,
        itemBuilder: (context, index) {
          final suggestion = suggestions[index];
          return ListTile(
            leading: const Icon(
              LucideIcons.search,
              size: 20,
              color: Colors.grey,
            ),
            title: Text(suggestion),
            onTap: () => onSelect(suggestion),
          );
        },
      );
    }

    // B. History Mode (Query is empty)
    if (history.isEmpty) {
      return _buildStatusMessage("No recent searches");
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(12.0),
          child: Text(
            "Recent",
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: history.length,
            itemBuilder: (context, index) {
              final term = history[index];
              return ListTile(
                leading: const Icon(
                  LucideIcons.history,
                  size: 20,
                  color: Colors.grey,
                ),
                title: Text(term),
                trailing: IconButton(
                  icon: const Icon(LucideIcons.x, size: 18, color: Colors.grey),
                  onPressed: () => onRemoveHistory(term),
                ),
                onTap: () => onSelect(term),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStatusMessage(String msg) {
    return Center(
      child: Text(msg, style: TextStyle(color: Colors.grey[400])),
    );
  }
}
