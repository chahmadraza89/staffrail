import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:flutter/material.dart';

class ClearanceSubmitButton extends StatelessWidget {
  final bool hasFile;
  final bool isLoading;
  final VoidCallback onSubmit;

  const ClearanceSubmitButton({
    super.key,
    required this.hasFile,
    this.isLoading = false,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: context.screenWidth * 0.6,
        child: CustomButton(
          onPressed: hasFile ? onSubmit : null,
          isLoading: isLoading,
          text: 'Submit Certificate',
          backgroundColor: hasFile ? AppColors.primaryColor : null,
        ),
      ),
    );
  }
}
