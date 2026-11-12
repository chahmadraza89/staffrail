import 'package:bhmh/core/router/user_route_constant.dart';
import 'package:bhmh/core/extensions/app_text_size.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_bar.dart';
import 'package:bhmh/features/employee/clearance/data/model/clearance_model.dart';
import 'package:bhmh/features/employee/clearance/presentation/provider/clearance_provider.dart';
import 'package:bhmh/features/employee/clearance/presentation/screen/widget/clearance_detail_tile.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EmployeeClearanceDetailMob extends ConsumerStatefulWidget {
  final ClearanceEntity item;

  const EmployeeClearanceDetailMob({super.key, required this.item});

  @override
  ConsumerState<EmployeeClearanceDetailMob> createState() =>
      _EmployeeClearanceDetailMobState();
}

class _EmployeeClearanceDetailMobState
    extends ConsumerState<EmployeeClearanceDetailMob> {
  PlatformFile? _selectedFile;
  bool _isSubmitting = false;

  void _pickFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        withData: true, // Required for Web compatibility
      );

      if (result != null) {
        setState(() {
          _selectedFile = result.files.single;
        });
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(context, 'Failed to pick file: $e');
      }
    }
  }

  Future<void> _submitDocument() async {
    if (_selectedFile == null) return;

    setState(() => _isSubmitting = true);

    final vm = ref.read(clearanceViewModelProvider.notifier);
    final success = await vm.submitDocument(
      itemId: widget.item.id,
      file: _selectedFile!,
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    if (success) {
      ToastService.showSuccess(context, 'Document submitted successfully');
      setState(() => _selectedFile = null);
    } else {
      final error = ref.read(clearanceViewModelProvider).error;
      ToastService.showError(
        context,
        'Failed to submit document: ${error ?? 'Unknown error'}',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomBar(
        title: Text("Clearance Detail", style: context.titleMedium),
        showBackButton: true,
        onLeadingTap: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(UserRoutes.clearance);
          }
        },
      ),
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: context.screenWidth * 0.030,
            vertical: context.screenHeight * 0.01,
          ),
          child: Column(
            children: [
              ClearanceDetailCard(
                title: widget.item.title,
                description: widget.item.description,
                durationText: widget.item.statusText,
                status: widget.item.status,
                rejectionReason: widget.item.rejectionReason,
                onUploadTap: _pickFile,
                onSubmitTap: _submitDocument,
                isLoading: _isSubmitting,
                hasFile: _selectedFile != null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
