import 'package:pdf/pdf.dart';
import 'package:intl/intl.dart';
import 'package:pdf/widgets.dart' as pw;

class PdfReportConstants {
  static final dateFormat = DateFormat('MM/dd/yyyy');
  static final dateTimeFormat = DateFormat('MM/dd/yyyy hh:mm a');

  static const primaryColor = PdfColor.fromInt(0xFF109B85);
  static const redColor = PdfColor.fromInt(0xFF991B1B);
  static const headerColor = PdfColor.fromInt(0xFF0F172A);
  static const subtitleColor = PdfColor.fromInt(0xFF64748B);

  static pw.TextStyle headerStyle({double size = 12, PdfColor color = headerColor}) {
    return pw.TextStyle(
      fontSize: size,
      fontWeight: pw.FontWeight.bold,
      color: color,
    );
  }

  static pw.TextStyle bodyStyle({double size = 9, PdfColor color = subtitleColor}) {
    return pw.TextStyle(
      fontSize: size,
      color: color,
    );
  }
}
