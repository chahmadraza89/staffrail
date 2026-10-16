import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'pdf_constants.dart';

class PdfInfoRow extends pw.StatelessWidget {
  final String label;
  final String value;

  PdfInfoRow(this.label, this.value);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        children: [
          pw.SizedBox(
            width: 150,
            child: pw.Text(
              label,
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
            ),
          ),
          pw.Expanded(
            child: pw.Text(value, style: const pw.TextStyle(fontSize: 9)),
          ),
        ],
      ),
    );
  }
}

class PdfMetadataRow extends pw.StatelessWidget {
  final String label;
  final String value;

  PdfMetadataRow(this.label, this.value);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Row(
      children: [
        pw.Text(
          label,
          style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(width: 5),
        pw.Container(
          width: 250,
          decoration: const pw.BoxDecoration(
            border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
          ),
          child: pw.Text(value, style: const pw.TextStyle(fontSize: 9)),
        ),
      ],
    );
  }
}

class PdfRatingItem extends pw.StatelessWidget {
  final String label;

  PdfRatingItem(this.label);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Row(
      mainAxisSize: pw.MainAxisSize.min,
      children: [
        pw.Container(
          width: 8,
          height: 8,
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: PdfColors.black, width: 0.5),
          ),
        ),
        pw.SizedBox(width: 4),
        pw.Text(label, style: const pw.TextStyle(fontSize: 8)),
      ],
    );
  }
}

class PdfAcknowledgmentItem extends pw.StatelessWidget {
  final String text;
  final bool checked;

  PdfAcknowledgmentItem(this.text, {this.checked = false});

  @override
  pw.Widget build(pw.Context context) {
    // Logic for "box between it" (placing box after number if present)
    final match = RegExp(r'^(\d+\.)\s*(.*)$').firstMatch(text);
    final String number = match != null ? match.group(1)! : '';
    final String restOfText = match != null ? match.group(2)! : text;

    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          if (number.isNotEmpty)
            pw.Padding(
              padding: const pw.EdgeInsets.only(top: 1, right: 5),
              child: pw.Text(
                number,
                style: pw.TextStyle(
                  fontSize: 10,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfReportConstants.headerColor,
                ),
              ),
            ),
          // Render a visual checkbox icon (☑ / ☐) instead of a dash
          pw.Padding(
            padding: const pw.EdgeInsets.only(top: 0, right: 8),
            child: pw.Container(
              width: 12,
              height: 12,
              decoration: pw.BoxDecoration(
                border: pw.Border.all(
                  color: checked
                      ? PdfReportConstants.primaryColor
                      : PdfColors.grey400,
                  width: 1,
                ),
                color: checked
                    ? PdfReportConstants.primaryColor
                    : PdfColors.white,
                borderRadius: pw.BorderRadius.circular(2),
              ),
              child: checked
                  ? pw.Center(
                      child: pw.CustomPaint(
                        size: const PdfPoint(8, 8),
                        painter: (PdfGraphics canvas, PdfPoint size) {
                          canvas
                            ..moveTo(2, size.y * 0.4)
                            ..lineTo(size.x * 0.4, 2)
                            ..lineTo(size.x - 2, size.y - 2)
                            ..setStrokeColor(PdfColors.white)
                            ..setLineWidth(1.5)
                            ..strokePath();
                        },
                      ),
                    )
                  : pw.SizedBox(),
            ),
          ),
          pw.Expanded(
            child: pw.Text(
              restOfText,
              style: pw.TextStyle(
                fontSize: 10,
                color: checked
                    ? PdfReportConstants.headerColor
                    : PdfReportConstants.subtitleColor,
                fontWeight: checked ? pw.FontWeight.bold : pw.FontWeight.normal,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PdfFieldLine extends pw.StatelessWidget {
  final String label;
  final String value;

  PdfFieldLine(this.label, this.value);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        children: [
          pw.Text(
            '$label ',
            style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
          ),
          pw.Expanded(
            child: pw.Container(
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(width: 0.5)),
              ),
              child: pw.Padding(
                padding: const pw.EdgeInsets.only(left: 5, bottom: 2),
                child: pw.Text(value, style: const pw.TextStyle(fontSize: 11)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PdfTableCell extends pw.StatelessWidget {
  final String label;
  final String value;

  PdfTableCell(this.label, this.value);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            label,
            style: const pw.TextStyle(
              fontSize: 7,
              color: PdfReportConstants.subtitleColor,
            ),
          ),
          pw.SizedBox(height: 2),
          pw.Text(
            value,
            style: pw.TextStyle(
              fontSize: 9,
              fontWeight: pw.FontWeight.bold,
              color: PdfReportConstants.headerColor,
            ),
          ),
        ],
      ),
    );
  }
}

class PdfTableHeader extends pw.StatelessWidget {
  final String label;

  PdfTableHeader(this.label);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Center(
        child: pw.Text(
          label,
          style: pw.TextStyle(
            fontSize: 8,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.headerColor,
          ),
        ),
      ),
    );
  }
}

class PdfSlotCell extends pw.StatelessWidget {
  final MapEntry<int, String> entry;

  PdfSlotCell(this.entry);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(6),
      child: pw.Row(
        children: [
          pw.Text(
            'Slot ${entry.key}: ',
            style: pw.TextStyle(
              fontSize: 8,
              color: PdfReportConstants.subtitleColor,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.Text(
            entry.value,
            style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

