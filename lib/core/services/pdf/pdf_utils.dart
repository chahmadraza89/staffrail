class PdfReportUtils {
  /// Sanitizes text for PDF rendering by replacing non-standard characters
  /// that often cause encoding issues (e.g., curly apostrophes).
  static String sanitizeText(String text) {
    return text
        .replaceAll('\r', '')
        .replaceAll('•', '-')
        .replaceAll('’', "'")
        .replaceAll('‘', "'")
        .replaceAll('“', '"')
        .replaceAll('”', '"')
        .replaceAll('–', "-")
        .replaceAll('—', "-");
  }
}
