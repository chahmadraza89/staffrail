import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_quick_action_button.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_task_info_card.dart';
import 'package:bhmh/features/admin/admin_home/presentation/widgets/admin_tasks_review_widget.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/core/services/pdf_audit_report_generator.dart';
import 'package:printing/printing.dart';

class AdminReviewTaskPage extends ConsumerWidget {
  final String employeeId;
  final String taskId;

  const AdminReviewTaskPage({
    super.key,
    required this.employeeId,
    required this.taskId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 🌐 RULE #1: Custom Responsive Check
    final bool isMobile = context.screenWidth < 600;

    final taskAsync = ref.watch(
      reviewTaskProvider((employeeId: employeeId, taskId: taskId)),
    );
    final processing = ref.watch(adminReviewProcessingProvider).state;

    return Scaffold(
      appBar: CustomBar(
        title: taskAsync.maybeWhen(
          data: (task) => Text(task?.title ?? 'Review Task'),
          orElse: () => const Text('Review Task'),
        ),
        subtitle: const Text('Review Submission Details'),
        showBackButton: true,
        trailing: taskAsync.maybeWhen(
          data: (task) {
            if (task == null) return const SizedBox();
            return IconButton(
              tooltip: 'Download Signed PDF',
              icon: const Icon(
                Icons.download_for_offline_rounded,
                color: Color(0xFF109B85),
              ),
              onPressed: () async {
                Uint8List? logoBytes;
                try {
                  final ByteData logoData = await rootBundle.load(
                    'assets/images/a.png',
                  );
                  logoBytes = logoData.buffer.asUint8List();
                } catch (e) {
                  debugPrint('Logo load failed: $e');
                }

                final pdfBytes = await PdfAuditReportGenerator.generateAcknowledgeFormPdf(
                  task: task,
                  employeeName: task.employeeName ?? 'Employee',
                  logoBytes: logoBytes,
                );

                await Printing.layoutPdf(
                  onLayout: (format) async => pdfBytes,
                  name: '${task.title}_${task.employeeName ?? 'Employee'}'.replaceAll(
                    ' ',
                    '_',
                  ),
                );
              },
            );
          },
          orElse: () => const SizedBox(),
        ),
      ),
      body: taskAsync.when(
        skipLoadingOnRefresh: true,
        data: (task) {
          if (task == null) {
            return const Center(child: Text("Task not found."));
          }

          return Stack(
            children: [
              SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: EdgeInsets.all(isMobile ? 16 : 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ReviewInfoCard(task: task, employeeId: employeeId),
                    const SizedBox(height: 32),
                    const Text(
                      'SUBMITTED CONTENT',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF64748B),
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ReviewContentDisplay(task: task),
                    const SizedBox(height: 48),
                    ReviewActionButtons(
                      task: task,
                      employeeId: employeeId,
                      taskId: taskId,
                      isProcessing: processing,
                    ),
                    const SizedBox(height: 24), // Bottom padding buffer
                  ],
                ),
              ),
              if (processing)
                Positioned.fill(
                  child: Container(
                    color: Colors.white.withValues(
                      alpha: 0.6,
                    ), // Modern blur overlay
                    child: const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF109B85),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: Color(0xFF109B85)),
        ),
        error: (e, stack) => Center(
          child: ErrorState(
            icon: Icons.error_outline_rounded,
            message: "Error loading submission:\n$e",
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// --- CONTENT DISPLAY COMPONENT (MODERNIZED) ---
// =============================================================================

class ReviewContentDisplay extends StatelessWidget {
  final CompilationSubTask task;

  const ReviewContentDisplay({super.key, required this.task});

  Widget _buildModernContainer({required Widget child}) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(borderRadius: BorderRadius.circular(18), child: child),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (task.actionType) {
      case TaskActionType.upload:
        if (task.fileUrl != null) {
          return _buildModernContainer(
            child: Image.network(
              task.fileUrl!,
              fit: BoxFit.contain,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return const SizedBox(
                  height: 200,
                  child: Center(
                    child: CircularProgressIndicator(color: Color(0xFF109B85)),
                  ),
                );
              },
              errorBuilder: (context, error, stackTrace) => const ErrorState(
                icon: Icons.broken_image_rounded,
                message: "Failed to load document image",
              ),
            ),
          );
        }
        return const EmptyState(message: "No file uploaded.");

      case TaskActionType.signature:
        if (task.signatureUrl != null) {
          return _buildModernContainer(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Image.network(
                task.signatureUrl!,
                errorBuilder: (context, error, stackTrace) => const ErrorState(
                  icon: Icons.gesture_rounded,
                  message: "Signature image not available",
                ),
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return const SizedBox(
                    height: 100,
                    child: Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Color(0xFF109B85),
                      ),
                    ),
                  );
                },
              ),
            ),
          );
        }
        return const EmptyState(message: "No signature provided.");

      case TaskActionType.form:
      case TaskActionType.splitField:
      case TaskActionType.fillAndSign:
      case TaskActionType.acknowledgeSign:
        final hasData = task.formData != null && task.formData!.isNotEmpty;
        final hasSignature = task.signatureUrl != null;

        if (!hasData && !hasSignature) {
          return const EmptyState(message: "No submission data found.");
        }

        return Column(
          children: [
            if (hasData)
              _buildModernContainer(
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: task.formData!.length,
                  separatorBuilder: (context, index) =>
                      Divider(height: 1, color: Colors.grey.shade100),
                  itemBuilder: (context, index) {
                    final key = task.formData!.keys.elementAt(index);
                    final value = task.formData![key];
                    return Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            key.replaceAll('_', ' ').toUpperCase(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF64748B),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            value.toString(),
                            style: const TextStyle(
                              fontSize: 16,
                              color: Color(0xFF0F172A),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            if (hasData && hasSignature) const SizedBox(height: 20),
            if (hasSignature) ...[
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'EMPLOYEE SIGNATURE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF94A3B8),
                    letterSpacing: 1.0,
                  ),
                ),
              ),
              _buildModernContainer(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Image.network(
                    task.signatureUrl!,
                    height: 100,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) =>
                        const ErrorState(
                          icon: Icons.gesture_rounded,
                          message: "Signature image not available",
                        ),
                  ),
                ),
              ),
            ],
          ],
        );

      default:
        return const EmptyState(
          message: "This task type does not have viewable content.",
        );
    }
  }
}
