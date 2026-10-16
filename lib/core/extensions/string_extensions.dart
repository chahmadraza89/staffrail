extension StringExtension on String {
  /// Converts a snake_case or kebab-case string to Title Case.
  /// Example: 'qmhp_cs_competency' -> 'Qmhp Cs Competency'
  ///
  /// SPECIAL HANDLING: Preserves common abbreviations in uppercase.
  String toTitleCase() {
    if (isEmpty) return this;

    const abbreviations = {'I-9', 'W-4', 'W-1', 'W-9', 'QMHP', 'CSSP', 'LPHA', 'SSC', 'EOC', 'BHMH', 'HIPAA'};

    return replaceAll(RegExp(r'(_|-)'), ' ')
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map((word) {
          final upperWord = word.toUpperCase();
          if (abbreviations.contains(upperWord)) return upperWord;
          
          // Special handle I-9, W-4 etc if they were split by replaceAll above
          if (word.length == 1 && (word == 'I' || word == 'W')) {
            // This is tricky because we split by _ and -
            // Let's try to detect if it was part of an abbreviation
            return upperWord;
          }

          return word[0].toUpperCase() + word.substring(1).toLowerCase();
        })
        .join(' ');
  }

  /// Extracts a clean filename from a Firebase Storage URL.
  /// Example: 'https://.../o/users%2FyHal...%2F1779348558389_i-9.pdf?alt=media' -> 'i-9.pdf'
  String getCleanFileName() {
    if (isEmpty) return '';
    try {
      // 1. Get the segment after /o/ and before ?
      String pathSegment = split('/o/').last.split('?').first;
      if (pathSegment == this) {
        pathSegment = split('/').last.split('?').first;
      }
      // 2. Decode url-encoded characters like %2F
      final decodedPath = Uri.decodeComponent(pathSegment);
      // 3. Get the actual filename (the last part after /)
      final rawFileName = decodedPath.split('/').last;
      // 4. Remove the timestamp prefix (e.g. 1779348558389_)
      return rawFileName.replaceFirst(RegExp(r'^\d+_'), '');
    } catch (_) {
      return split('/').last.split('?').first;
    }
  }
}
