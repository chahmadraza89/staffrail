import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';

class AppSignaturePad extends StatefulWidget {
  final Function(String signatureData) onSigned;
  final VoidCallback onClear;
  final bool isSubmitting;

  const AppSignaturePad({
    super.key,
    required this.onSigned,
    required this.onClear,
    this.isSubmitting = false,
  });

  @override
  State<AppSignaturePad> createState() => _AppSignaturePadState();
}

class _AppSignaturePadState extends State<AppSignaturePad> {
  final SignatureController _controller = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (_controller.isEmpty) return;

    final bytes = await _controller.toPngBytes();
    if (bytes != null) {
      final base64Signature = base64Encode(bytes);
      widget.onSigned(base64Signature);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(12),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Signature(
              controller: _controller,
              height: 200,
              backgroundColor: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton(
              onPressed: () {
                _controller.clear();
                widget.onClear();
              },
              child: const Text('Clear'),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _handleSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF109B85),
                foregroundColor: Colors.white,
              ),
              child: const Text('Confirm Signature'),
            ),
          ],
        ),
      ],
    );
  }
}
