import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/core/config/app_legal_content.dart';
import 'package:bhmh/core/utils/task_lock_helper.dart';
import '../pdf_constants.dart';
import '../pdf_widgets.dart';

class CompetencyContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;

  CompetencyContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
  });

  @override
  pw.Widget build(pw.Context context) {
    final isQmhp = task.id == 'qmhp_cs_competency';
    final areas = AppLegalContent.competencyAreas[task.id] ??
        AppLegalContent.competencyAreas['cssp_competency']!;

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          isQmhp
              ? 'QMHP-CS CORE COMPETENCY EVALUATION'
              : 'COMPETENCY EVALUATION AND SKILLS CHECKLIST',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 15),
        pw.Table(
          border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
          columnWidths: {
            0: const pw.FlexColumnWidth(3),
            1: const pw.FlexColumnWidth(1),
          },
          children: [
            pw.TableRow(
              children: [
                PdfTableHeader('Skill/Competency Description'),
                PdfTableHeader('Rating'),
              ],
            ),
            ...areas.entries.map((entry) {
              final area = entry.key;
              final slug = area.toLowerCase().replaceAll(' ', '_');
              final rating =
                  task.adminFormData?['rating_$slug']?.toString() ?? '-';
                  
              return pw.TableRow(
                children: [
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Text(area, style: const pw.TextStyle(fontSize: 8)),
                  ),
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Center(
                      child: pw.Text(
                        rating,
                        style: pw.TextStyle(
                          fontSize: 8,
                          fontWeight: pw.FontWeight.bold,
                          color: rating == '-'
                              ? PdfColors.black
                              : PdfColors.green700,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }),
          ],
        ),
      ],
    );
  }
}

class AnnualTrainingContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;
  final List<CompilationSubTask>? allTasks;

  AnnualTrainingContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
    this.allTasks,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};
    
    final topicsList = [
      'Code of Conduct & Corporate Compliance',
      'Cultural Competency Refresher',
      'Ethics and Professional Conduct',
      'HIPAA and Confidentiality',
      'Workplace Safety & Emergency Preparedness',
      'Abuse, Neglect, and Exploitation Reporting',
      'Infection Control Refresher',
      'Trauma-Informed Care Practices',
    ];

    final topicToTaskIdMap = const {
      'Code of Conduct & Corporate Compliance': [
        'code_of_conduct_ethics',
        'corporate_compliance_acknowledge',
      ],
      'Cultural Competency Refresher': ['cultural_competency'],
      'Ethics and Professional Conduct': ['code_of_conduct_ethics'],
      'HIPAA and Confidentiality': [
        'confidentiality_statement',
        'corporate_confidentiality_statement',
        'confidentiality_of_client___therapist___staff',
      ],
      'Workplace Safety & Emergency Preparedness': [
        'acknowledge_of_eoc_health_&_safety_policy',
      ],
      'Abuse, Neglect, and Exploitation Reporting': [
        'alleged_abuse_neglect',
      ],
      'Infection Control Refresher': ['infection_control_refresher'],
      'Trauma-Informed Care Practices': [
        'trauma_informed_care_practices',
      ],
    };

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'ANNUAL TRAINING AND IN-SERVICE LOG',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 15),
        pw.Table(
          border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
          children: [
            pw.TableRow(
              children: [
                PdfTableHeader('Training Topic'),
                PdfTableHeader('Date Completed'),
                PdfTableHeader('Score/Status'),
              ],
            ),
            ...topicsList.asMap().entries.map((entry) {
              final idx = entry.key;
              final name = entry.value;
              final fieldId = 'topic_${idx + 1}';
              
              bool isChecked = formData[fieldId] == true || formData[fieldId] == 'true';
              String date = isChecked ? signedDate : '-';
              String status = isChecked ? 'Verified' : 'Pending';

              if (!isChecked && allTasks != null) {
                final mappedIds = topicToTaskIdMap[name] ?? [];
                for (final id in mappedIds) {
                  final targetTask = allTasks!.cast<CompilationSubTask?>().firstWhere(
                    (t) => t?.id == id,
                    orElse: () => null,
                  );

                  if (targetTask != null && isTaskCompleted(targetTask.status)) {
                    isChecked = true;
                    status = 'Verified';
                    final dateVal = targetTask.completedAt ?? targetTask.updatedAt;
                    if (dateVal != null) {
                      date = '${dateVal.month}/${dateVal.day}/${dateVal.year}';
                    } else {
                      date = signedDate;
                    }
                    break;
                  }
                }
              }

              return pw.TableRow(
                children: [
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Text(name, style: const pw.TextStyle(fontSize: 8)),
                  ),
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Center(
                        child: pw.Text(date,
                            style: const pw.TextStyle(fontSize: 8))),
                  ),
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Center(
                      child: pw.Text(
                        status,
                        style: pw.TextStyle(
                          fontSize: 8,
                          fontWeight: pw.FontWeight.bold,
                          color: isChecked
                              ? PdfColors.green700
                              : PdfColors.black,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }),
          ],
        ),
      ],
    );
  }
}

class InitialTrainingContent extends pw.StatelessWidget {
  final CompilationSubTask task;
  final String employeeName;
  final String employeeSig;
  final String signedDate;
  final List<CompilationSubTask>? allTasks;

  InitialTrainingContent({
    required this.task,
    required this.employeeName,
    required this.employeeSig,
    required this.signedDate,
    this.allTasks,
  });

  @override
  pw.Widget build(pw.Context context) {
    final formData = task.formData ?? {};
    
    final topicsList = [
      'Types of Services',
      'Person Centered Planning',
      'Documentation and Timelines',
      'Client Rights & Responsibilities',
      'Cultural Competency',
      'Crisis Intervention Steps',
      'Corporate Compliance & Ethics',
      'Confidentiality / HIPAA',
      'Mandatory Reporting',
      'Abuse and Neglect Reporting',
    ];

    final topicToTaskIdMap = const {
      'Types of Services': ['types_of_services'],
      'Person Centered Planning': ['person_centered_planning'],
      'Documentation and Timelines': [
        'documentation_and_timelines',
      ],
      'Client Rights & Responsibilities': [
        'client_rights_responsibilities',
      ],
      'Cultural Competency': ['cultural_competency'],
      'Crisis Intervention Steps': ['crisis_intervention_steps'],
      'Corporate Compliance & Ethics': [
        'code_of_conduct_ethics',
        'corporate_compliance_acknowledge',
      ],
      'Confidentiality / HIPAA': [
        'confidentiality_statement',
        'corporate_confidentiality_statement',
        'confidentiality_of_client___therapist___staff',
      ],
      'Mandatory Reporting': ['mandatory_reporting'],
      'Abuse and Neglect Reporting': ['alleged_abuse_neglect'],
    };

    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'INITIAL TRAINING AND COMPETENCY LOG',
          style: pw.TextStyle(
            fontSize: 11,
            fontWeight: pw.FontWeight.bold,
            color: PdfReportConstants.primaryColor,
          ),
        ),
        pw.SizedBox(height: 15),
        pw.Table(
          border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
          children: [
            pw.TableRow(
              children: [
                PdfTableHeader('Training Topic'),
                PdfTableHeader('Date Completed'),
                PdfTableHeader('Score/Status'),
              ],
            ),
            ...topicsList.asMap().entries.map((entry) {
              final idx = entry.key;
              final name = entry.value;
              final fieldId = 'topic_${idx + 1}';
              
              bool isChecked = formData[fieldId] == true || formData[fieldId] == 'true';
              String date = isChecked ? signedDate : '-';
              String status = isChecked ? 'Verified' : 'Pending';

              if (!isChecked && allTasks != null) {
                final mappedIds = topicToTaskIdMap[name] ?? [];
                for (final id in mappedIds) {
                  final targetTask = allTasks!.cast<CompilationSubTask?>().firstWhere(
                    (t) => t?.id == id,
                    orElse: () => null,
                  );

                  if (targetTask != null && isTaskCompleted(targetTask.status)) {
                    isChecked = true;
                    status = 'Verified';
                    final dateVal = targetTask.completedAt ?? targetTask.updatedAt;
                    if (dateVal != null) {
                      date = '${dateVal.month}/${dateVal.day}/${dateVal.year}';
                    } else {
                      date = signedDate;
                    }
                    break;
                  }
                }
              }

              return pw.TableRow(
                children: [
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Text(name, style: const pw.TextStyle(fontSize: 8)),
                  ),
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Center(
                        child: pw.Text(date,
                            style: const pw.TextStyle(fontSize: 8))),
                  ),
                  pw.Padding(
                    padding: const pw.EdgeInsets.all(6),
                    child: pw.Center(
                      child: pw.Text(
                        status,
                        style: pw.TextStyle(
                          fontSize: 8,
                          fontWeight: pw.FontWeight.bold,
                          color: isChecked
                              ? PdfColors.green700
                              : PdfColors.black,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }),
          ],
        ),
      ],
    );
  }
}


