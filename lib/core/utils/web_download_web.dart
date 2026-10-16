import 'dart:html' as html;

void downloadFile(String url, String fileName) {
  // Create a hidden anchor element and trigger a download
  final anchor = html.AnchorElement(href: url)
    ..setAttribute("download", fileName)
    ..setAttribute("target", "_blank")
    ..setAttribute("rel", "noopener noreferrer");
  anchor.click();
}

void downloadBytes(List<int> bytes, String fileName) {
  final blob = html.Blob([bytes], 'application/pdf');
  final url = html.Url.createObjectUrlFromBlob(blob);
  final anchor = html.AnchorElement(href: url)
    ..setAttribute("download", fileName)
    ..setAttribute("target", "_blank")
    ..setAttribute("rel", "noopener noreferrer");
  anchor.click();
  html.Url.revokeObjectUrl(url);
}

