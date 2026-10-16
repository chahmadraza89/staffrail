import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/training/data/model/training_model.dart';
import 'package:bhmh/features/employee/training/presentation/provider/training_provider.dart';
import 'package:bhmh/features/employee/training/presentation/screens/widgets/training_detail_tile.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// =============================================================================
// TRAINING DETAIL MOBILE SCREEN
// =============================================================================
// Displays details for a specific training item and handles certificate uploads.
// Refactored to use PlatformFile for cross-platform consistency.
// =============================================================================

class TrainingDetailMob extends ConsumerStatefulWidget {
  final String trainingId;
  final String title;
  final String description;
  final String durationText;
  final TrainingStatus status;
  final DateTime? assignedAt;
  const TrainingDetailMob({
    super.key,
    required this.trainingId,
    required this.title,
    required this.description,
    required this.durationText,
    required this.status,
    this.assignedAt,
  });

  @override
  ConsumerState<TrainingDetailMob> createState() => _TrainingDetailMobState();
}

class _TrainingDetailMobState extends ConsumerState<TrainingDetailMob> {
  PlatformFile? _selectedFile;
  DateTime? _completionDate;
  DateTime? _expirationDate;
  bool _noExpiration = false;
  bool _isSubmitting = false;

  void _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        withData: true, // Consistent with Web for byte access if needed
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _selectedFile = result.files.first;
        });
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(context, 'Failed to pick file: $e');
      }
    }
  }

  Future<void> _submitCertificate() async {
    if (_selectedFile == null) return;
    if (_completionDate == null) {
      ToastService.showError(context, 'Please select a completion date');
      return;
    }
    if (!_noExpiration && _expirationDate == null) {
      ToastService.showError(context, 'Please select an expiration date');
      return;
    }

    setState(() => _isSubmitting = true);

    final vm = ref.read(trainingViewModelProvider.notifier);
    final success = await vm.submitCertificate(
      trainingId: widget.trainingId,
      file: _selectedFile,
      completionDate: _completionDate,
      expirationDate: _expirationDate,
      noExpiration: _noExpiration,
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    if (success) {
      ToastService.showSuccess(context, 'Certificate uploaded successfully');
      setState(() {
        _selectedFile = null;
        _completionDate = null;
        _expirationDate = null;
        _noExpiration = false;
      });
    } else {
      final error = ref.read(trainingViewModelProvider).error;
      ToastService.showError(
        context,
        'Failed to upload certificate: ${error ?? 'Unknown error'}',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text("Training Details", style: context.titleMedium),
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(UserRoutes.trainings);
          }
        },
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: context.screenWidth * 0.030,
              vertical: context.screenHeight * 0.01,
            ),
            child: Column(
              children: [
                TrainingDetailCard(
                  title: widget.title,
                  description: widget.description,
                  durationText: widget.durationText,
                  status: widget.status,
                  assignedAt: widget.assignedAt,
                  onUploadTap: _pickFile,
                  onSubmitTap: _submitCertificate,
                  isLoading: _isSubmitting,
                  hasFile: _selectedFile != null,
                  fileName: _selectedFile?.name,
                  completionDate: _completionDate,
                  expirationDate: _expirationDate,
                  noExpiration: _noExpiration,
                  onCompletionDateChanged: (date) =>
                      setState(() => _completionDate = date),
                  onExpirationDateChanged: (date) =>
                      setState(() => _expirationDate = date),
                  onNoExpirationChanged: (val) =>
                      setState(() => _noExpiration = val),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
