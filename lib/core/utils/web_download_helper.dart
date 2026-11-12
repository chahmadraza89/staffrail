import 'web_download_stub.dart'
    if (dart.library.html) 'web_download_web.dart';

/// Triggers a direct file download on Web, or does nothing on Mobile.
/// Mobile downloads should be handled separately using url_launcher.
void triggerWebDownload(String url, String fileName) {
  downloadFile(url, fileName);
}

/// Triggers a direct download from bytes on Web.
void triggerBytesDownload(List<int> bytes, String fileName) {
  downloadBytes(bytes, fileName);
}

