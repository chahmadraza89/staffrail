// =============================================================================
// --- STANDALONE PDF WIDGET COMPONENTS ---
// =============================================================================
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/core/services/pdf/pdf_constants.dart';


class ReportPageHeader extends pw.StatelessWidget {
  final String title;
  final String subtitle;

  ReportPageHeader(this.title, this.subtitle);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 20),
      padding: const pw.EdgeInsets.only(bottom: 10),
      decoration: const pw.BoxDecoration(
        border: pw.Border(
          bottom: pw.BorderSide(
            color: PdfReportConstants.primaryColor,

            width: 2,
          ),
        ),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                'EXAMPLE HEALTH CLINIC',
                style: pw.TextStyle(
                  fontSize: 10,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfReportConstants.primaryColor,

                  letterSpacing: 1.5,
                ),
              ),
              pw.SizedBox(height: 2),
              pw.Text(
                title,
                style: pw.TextStyle(
                  fontSize: 14,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfReportConstants.headerColor,

                ),
              ),
            ],
          ),
          pw.Text(
            subtitle,
            style: const pw.TextStyle(
              fontSize: 10,
              color: PdfReportConstants.subtitleColor,

            ),
          ),
        ],
      ),
    );
  }
}

class ReportPageFooter extends pw.StatelessWidget {
  @override
  pw.Widget build(pw.Context context) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(top: 10),
      padding: const pw.EdgeInsets.only(top: 10),
      decoration: const pw.BoxDecoration(
        border: pw.Border(top: pw.BorderSide(color: PdfColors.grey300)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            'Generated: ${PdfReportConstants.dateTimeFormat.format(DateTime.now())}',

            style: const pw.TextStyle(
              fontSize: 8,
              color: PdfReportConstants.subtitleColor,

            ),
          ),
          pw.Text(
            'Page ${context.pageNumber} of ${context.pagesCount}',
            style: const pw.TextStyle(
              fontSize: 8,
              color: PdfReportConstants.subtitleColor,

            ),
          ),
          pw.Text(
            'CONFIDENTIAL',
            style: pw.TextStyle(
              fontSize: 8,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.red,
            ),
          ),
        ],
      ),
    );
  }
}

class ReportInfoSection extends pw.StatelessWidget {
  final String name;
  final String email;
  final String id;

  ReportInfoSection(this.name, this.email, this.id);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(16),
      decoration: pw.BoxDecoration(
        color: const PdfColor.fromInt(0xFFF0FDFA),
        borderRadius: pw.BorderRadius.circular(8),
        border: pw.Border.all(
          color: PdfReportConstants.primaryColor,

          width: 0.5,
        ),
      ),
      child: pw.Row(
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                ReportInfoRow('Employee Name:', name),
                ReportInfoRow('Email:', email),
                ReportInfoRow('Employee ID:', id),
                ReportInfoRow(
                  'Report Date:',
                  PdfReportConstants.dateFormat.format(DateTime.now()),

                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ReportInfoRow extends pw.StatelessWidget {
  final String label;
  final String value;

  ReportInfoRow(this.label, this.value);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 4),
      child: pw.Row(
        children: [
          pw.SizedBox(
            width: 120,
            child: pw.Text(
              label,
              style: pw.TextStyle(
                fontSize: 10,
                fontWeight: pw.FontWeight.bold,
                color: PdfReportConstants.headerColor,

              ),
            ),
          ),
          pw.Text(
            value,
            style: const pw.TextStyle(
              fontSize: 10,
              color: PdfReportConstants.headerColor,

            ),
          ),
        ],
      ),
    );
  }
}

class ReportSummarySection extends pw.StatelessWidget {
  final List<CompilationTask> categories;
  final List<TrainingEntity> trainings;

  ReportSummarySection(this.categories, this.trainings);

  @override
  pw.Widget build(pw.Context context) {
    final totalTasks = categories.fold<int>(
      0,
      (sum, cat) => sum + cat.subTasks.length,
    );
    final completedTasks = categories.fold<int>(
      0,
      (sum, cat) => sum + cat.subTasks.where((t) => t.isCompleted).length,
    );
    final totalTrainings = trainings.length;
    final completedTrainings = trainings
        .where((t) => t.status == TrainingStatus.completed)
        .length;

    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        borderRadius: pw.BorderRadius.circular(8),
        border: pw.Border.all(color: PdfColors.grey300),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
        children: [
          ReportSummaryBlock(
            'Onboarding',
            '$completedTasks / $totalTasks',
            totalTasks > 0 ? completedTasks / totalTasks : 0,
          ),
          ReportSummaryBlock(
            'Training',
            '$completedTrainings / $totalTrainings',
            totalTrainings > 0 ? completedTrainings / totalTrainings : 0,
          ),
          ReportSummaryBlock(
            'Overall',
            '${((completedTasks + completedTrainings) / (totalTasks + totalTrainings).clamp(1, double.infinity) * 100).toStringAsFixed(0)}%',
            (totalTasks + totalTrainings) > 0
                ? (completedTasks + completedTrainings) /
                      (totalTasks + totalTrainings)
                : 0,
          ),
        ],
      ),
    );
  }
}

class ReportSummaryBlock extends pw.StatelessWidget {
  final String label;
  final String value;
  final double progress;

  ReportSummaryBlock(this.label, this.value, this.progress);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Column(
      children: [
        pw.Text(
          label,
          style: pw.TextStyle(
            fontSize: 10,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.subtitleColor,

          ),
        ),
        pw.SizedBox(height: 6),
        pw.Text(
          value,
          style: pw.TextStyle(
            fontSize: 16,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.headerColor,

          ),
        ),
        pw.SizedBox(height: 4),
        pw.Container(
          width: 80,
          height: 4,
          decoration: pw.BoxDecoration(
            color: PdfColors.grey200,
            borderRadius: pw.BorderRadius.circular(2),
          ),
          child: pw.ClipRRect(
            horizontalRadius: 2,
            verticalRadius: 2,
            child: pw.Container(
              width: 80 * progress,
              color: PdfReportConstants.primaryColor,

            ),
          ),
        ),
      ],
    );
  }
}

class ReportSectionTitle extends pw.StatelessWidget {
  final String title;

  ReportSectionTitle(this.title);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 6),
      decoration: const pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey300)),
      ),
      child: pw.Text(
        title,
        style: pw.TextStyle(
          fontSize: 14,
          fontWeight: pw.FontWeight.bold,
          color: PdfReportConstants.headerColor,

        ),
      ),
    );
  }
}

class ReportCategoryTable extends pw.StatelessWidget {
  final CompilationTask category;

  ReportCategoryTable(this.category);

  @override
  pw.Widget build(pw.Context context) {
    final completedCount = category.subTasks.where((t) => t.isCompleted).length;

    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 16),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          // Category header
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            color: const PdfColor.fromInt(0xFFF1F5F9),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  category.title,
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                    color: PdfReportConstants.headerColor,

                  ),
                ),
                pw.Text(
                  '$completedCount / ${category.subTasks.length} complete',
                  style: const pw.TextStyle(
                    fontSize: 9,
                    color: PdfReportConstants.subtitleColor,

                  ),
                ),
              ],
            ),
          ),

          // Task rows
          pw.TableHelper.fromTextArray(
            cellAlignment: pw.Alignment.centerLeft,
            headerDecoration: const pw.BoxDecoration(
              color: PdfColor.fromInt(0xFFE2E8F0),
            ),
            headerStyle: pw.TextStyle(
              fontSize: 9,
              fontWeight: pw.FontWeight.bold,
              color: PdfReportConstants.headerColor,

            ),
            cellStyle: const pw.TextStyle(
              fontSize: 9,
              color: PdfReportConstants.headerColor,

            ),
            cellPadding: const pw.EdgeInsets.all(4),
            headers: ['Task', 'Status', 'Type', 'Signed At'],
            data: category.subTasks.map((task) {
              return [
                task.title,
                task.status.name.toUpperCase(),
                task.actionType.name,
                task.signedAt != null
                    ? PdfReportConstants.dateFormat.format(task.signedAt!)

                    : '-',
              ];
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class ReportTrainingTable extends pw.StatelessWidget {
  final List<TrainingEntity> trainings;

  ReportTrainingTable(this.trainings);

  @override
  pw.Widget build(pw.Context context) {
    return pw.TableHelper.fromTextArray(
      cellAlignment: pw.Alignment.centerLeft,
      headerDecoration: const pw.BoxDecoration(
        color: PdfColor.fromInt(0xFFE2E8F0),
      ),
      headerStyle: pw.TextStyle(
        fontSize: 9,
        fontWeight: pw.FontWeight.bold,
        color: PdfReportConstants.headerColor,

      ),
      cellStyle: const pw.TextStyle(
        fontSize: 9,
        color: PdfReportConstants.headerColor,

      ),
      cellPadding: const pw.EdgeInsets.all(4),
      headers: ['Training', 'Status', 'Duration', 'Completed', 'Expires'],
      data: trainings.map((t) {
        return [
          t.title,
          t.status.name.toUpperCase(),
          t.durationText,
          t.completedAt != null
              ? PdfReportConstants.dateFormat.format(t.completedAt!)

              : '-',
          t.noExpiration
              ? 'Never'
              : t.expirationDate != null
              ? PdfReportConstants.dateFormat.format(t.expirationDate!)

              : '-',
        ];
      }).toList(),
    );
  }
}

class ReportAttestationSection extends pw.StatelessWidget {
  final String? generatedBy;

  ReportAttestationSection(this.generatedBy);

  @override
  pw.Widget build(pw.Context context) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(top: 20),
      padding: const pw.EdgeInsets.all(16),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.grey300),
        borderRadius: pw.BorderRadius.circular(8),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            'Attestation',
            style: pw.TextStyle(
              fontSize: 12,
              fontWeight: pw.FontWeight.bold,
              color: PdfReportConstants.headerColor,

            ),
          ),
          pw.SizedBox(height: 8),
          pw.Text(
            'This report was generated by the StaffRail Management System '
            'and represents the compliance status as of ${PdfReportConstants.dateTimeFormat.format(DateTime.now())}. '

            'All data is sourced from the employee onboarding and training records.',
            style: const pw.TextStyle(
              fontSize: 9,
              color: PdfReportConstants.subtitleColor,

            ),
          ),
          pw.SizedBox(height: 16),
          pw.Row(
            children: [
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Container(
                      width: 200,
                      decoration: const pw.BoxDecoration(
                        border: pw.Border(
                          bottom: pw.BorderSide(color: PdfColors.grey400),
                        ),
                      ),
                      child: pw.SizedBox(height: 30),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Authorized Signature',
                      style: const pw.TextStyle(
                        fontSize: 8,
                        color: PdfReportConstants.subtitleColor,

                      ),
                    ),
                  ],
                ),
              ),
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Container(
                      width: 200,
                      decoration: const pw.BoxDecoration(
                        border: pw.Border(
                          bottom: pw.BorderSide(color: PdfColors.grey400),
                        ),
                      ),
                      child: pw.SizedBox(height: 30),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Date',
                      style: const pw.TextStyle(
                        fontSize: 8,
                        color: PdfReportConstants.subtitleColor,

                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (generatedBy != null) ...[
            pw.SizedBox(height: 8),
            pw.Text(
              'Generated by: $generatedBy',
              style: const pw.TextStyle(
                fontSize: 8,
                color: PdfReportConstants.subtitleColor,

              ),
            ),
          ],
        ],
      ),
    );
  }
}
