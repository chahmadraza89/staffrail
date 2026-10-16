import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../pdf_utils.dart';

class SectionedContent extends pw.StatelessWidget {
  final String fullContent;

  SectionedContent(this.fullContent);

  @override
  pw.Widget build(pw.Context context) {
    final lines = fullContent.split('\n');

    String getSectionText(String title) {
      int start = -1;
      for (int i = 0; i < lines.length; i++) {
        if (lines[i].contains('**$title**')) {
          start = i + 1;
          break;
        }
      }
      if (start == -1) return '';
      final res = <String>[];
      for (int i = start; i < lines.length; i++) {
        if (lines[i].trim().startsWith('**')) break;
        res.add(lines[i]);
      }
      return res.join('\n').trim();
    }

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'Purpose',
          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          getSectionText('Purpose'),
          style: const pw.TextStyle(fontSize: 10),
        ),
        pw.SizedBox(height: 20),
        pw.Text(
          'Terms and Conditions',
          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
        ),
        pw.SizedBox(height: 8),
        ...getSectionText(
          'Terms and Conditions',
        ).split('\n').where((l) => l.trim().isNotEmpty).map((line) {
          final clean = line.trim().startsWith('*')
              ? line.trim().substring(1).trim()
              : line.trim();
          return pw.Padding(
            padding: const pw.EdgeInsets.only(bottom: 4, left: 10),
            child: pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Container(
                  width: 3,
                  height: 3,
                  margin: const pw.EdgeInsets.only(top: 4, right: 8),
                  decoration: const pw.BoxDecoration(
                    color: PdfColors.black,
                    shape: pw.BoxShape.circle,
                  ),
                ),
                pw.Expanded(
                  child: pw.Text(clean, style: const pw.TextStyle(fontSize: 9)),
                ),
              ],
            ),
          );
        }),
        pw.SizedBox(height: 20),
        pw.Text(
          'Acknowledgement',
          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
        ),
        pw.SizedBox(height: 8),
        pw.Text(
          getSectionText('Acknowledgement'),
          style: const pw.TextStyle(fontSize: 10),
        ),
      ],
    );
  }
}

class SimpleContent extends pw.StatelessWidget {
  final String fullContent;

  SimpleContent(this.fullContent);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Text(
      PdfReportUtils.sanitizeText(fullContent.replaceAll('**', '')),
      style: pw.TextStyle(fontSize: 10, height: 1.5),
    );
  }
}
