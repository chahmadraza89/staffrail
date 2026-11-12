import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class PdfGenerationService {
  static final PdfGenerationService _instance = PdfGenerationService._internal();
  factory PdfGenerationService() => _instance;
  PdfGenerationService._internal();

  /// Generates a professional PDF for a completed onboarding task.
  Future<Uint8List> generateTaskPdf(CompilationSubTask task) async {
    final pdf = pw.Document(
      title: task.title,
      author: 'StaffRail Onboarding System',
    );

    // Fetch images if available
    pw.MemoryImage? employeeSignature;
    if (task.signatureUrl != null) {
      employeeSignature = await _fetchImage(task.signatureUrl!);
    }

    pw.MemoryImage? adminSignature;
    if (task.adminSignatureUrl != null) {
      adminSignature = await _fetchImage(task.adminSignatureUrl!);
    }

    // Modern StaffRail Brand Colors
    const primaryColor = PdfColor.fromInt(0xFF109B85); // Teal from app
    const secondaryColor = PdfColor.fromInt(0xFF64748B);

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        header: (context) => _buildHeader(task, primaryColor, secondaryColor),
        footer: (context) => _buildFooter(context, secondaryColor),
        build: (context) => [
          _buildEmployeeInfo(task, secondaryColor),
          pw.SizedBox(height: 20),
          _buildFormSection(task, primaryColor, secondaryColor),
          pw.SizedBox(height: 40),
          _buildSignatureSection(task, employeeSignature, adminSignature, primaryColor, secondaryColor),
        ],
      ),
    );

    return pdf.save();
  }

  pw.Widget _buildHeader(CompilationSubTask task, PdfColor primary, PdfColor secondary) {
    return pw.Column(
      children: [
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  'StaffRail',
                  style: pw.TextStyle(
                    fontSize: 28,
                    fontWeight: pw.FontWeight.bold,
                    color: primary,
                  ),
                ),
                pw.Text(
                  'BEHAVIORAL HEALTH MANAGEMENT & HOLDINGS',
                  style: pw.TextStyle(
                    fontSize: 10,
                    color: secondary,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
            pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Text(
                  'OFFICIAL AUDIT DOCUMENT',
                  style: pw.TextStyle(
                    fontSize: 10,
                    fontWeight: pw.FontWeight.bold,
                    color: primary,
                  ),
                ),
                pw.Text(
                  'Generated: ${DateFormat('MMM dd, yyyy').format(DateTime.now())}',
                  style: pw.TextStyle(fontSize: 8, color: secondary),
                ),
              ],
            ),
          ],
        ),
        pw.Divider(thickness: 1, color: primary),
        pw.SizedBox(height: 10),
      ],
    );
  }

  pw.Widget _buildEmployeeInfo(CompilationSubTask task, PdfColor secondary) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(15),
      decoration: pw.BoxDecoration(
        color: PdfColors.grey100,
        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          _buildInfoItem('EMPLOYEE NAME', task.employeeName ?? 'N/A', secondary),
          _buildInfoItem('DOCUMENT TITLE', task.title, secondary),
          _buildInfoItem('COMPLETED DATE', task.updatedAt != null ? DateFormat('MMM dd, yyyy').format(task.updatedAt!) : 'N/A', secondary),
        ],
      ),
    );
  }

  pw.Widget _buildInfoItem(String label, String value, PdfColor secondary) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(label, style: pw.TextStyle(fontSize: 8, color: secondary, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 4),
        pw.Text(value, style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
      ],
    );
  }

  pw.Widget _buildFormSection(CompilationSubTask task, PdfColor primary, PdfColor secondary) {
    final data = task.formData ?? {};
    if (data.isEmpty) return pw.SizedBox();

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'SUBMISSION DATA',
          style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: primary),
        ),
        pw.SizedBox(height: 10),
        pw.Table(
          border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
          columnWidths: {
            0: const pw.FlexColumnWidth(2),
            1: const pw.FlexColumnWidth(3),
          },
          children: data.entries.map((e) {
            return pw.TableRow(
              children: [
                pw.Padding(
                  padding: const pw.EdgeInsets.all(10),
                  child: pw.Text(e.key.replaceAll('_', ' ').toUpperCase(), style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                ),
                pw.Padding(
                  padding: const pw.EdgeInsets.all(10),
                  child: pw.Text(e.value.toString(), style: const pw.TextStyle(fontSize: 10)),
                ),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }

  pw.Widget _buildSignatureSection(
    CompilationSubTask task,
    pw.MemoryImage? employeeSig,
    pw.MemoryImage? adminSig,
    PdfColor primary,
    PdfColor secondary,
  ) {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        // Employee Signature
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text('EMPLOYEE SIGNATURE', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: secondary)),
            pw.SizedBox(height: 10),
            pw.Container(
              width: 180,
              height: 80,
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey300),
              ),
              child: employeeSig != null 
                ? pw.Center(child: pw.Image(employeeSig, fit: pw.BoxFit.contain))
                : pw.Center(child: pw.Text('NOT SIGNED', style: pw.TextStyle(color: PdfColors.red))),
            ),
            pw.SizedBox(height: 5),
            pw.Text(task.employeeName ?? 'N/A', style: const pw.TextStyle(fontSize: 10)),
          ],
        ),

        // Admin/Employer Signature
        pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text('ADMIN / SUPERVISOR REVIEW', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: secondary)),
            pw.SizedBox(height: 10),
            pw.Container(
              width: 180,
              height: 80,
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColors.grey300),
              ),
              child: adminSig != null 
                ? pw.Center(child: pw.Image(adminSig, fit: pw.BoxFit.contain))
                : pw.Center(child: pw.Text('PENDING REVIEW', style: pw.TextStyle(color: PdfColors.orange))),
            ),
            pw.SizedBox(height: 5),
            pw.Text('StaffRail Administrator', style: const pw.TextStyle(fontSize: 10)),
          ],
        ),
      ],
    );
  }

  pw.Widget _buildFooter(pw.Context context, PdfColor secondary) {
    return pw.Column(
      children: [
        pw.Divider(thickness: 0.5, color: PdfColors.grey300),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('Confidential Business Record - StaffRail', style: pw.TextStyle(fontSize: 8, color: secondary)),
            pw.Text('Page ${context.pageNumber} of ${context.pagesCount}', style: pw.TextStyle(fontSize: 8, color: secondary)),
          ],
        ),
      ],
    );
  }

  Future<pw.MemoryImage?> _fetchImage(String url) async {
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return pw.MemoryImage(response.bodyBytes);
      }
    } catch (e) {
      debugPrint('Error fetching image for PDF: $e');
    }
    return null;
  }
}
