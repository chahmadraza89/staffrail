// ignore_for_file: use_build_context_synchronously
import 'package:bhmh/core/error/app_error.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:bhmh/core/shared/app_messenger.dart';
import 'package:bhmh/features/employee/on_boarding/data/model/on_boarding_model.dart';
import 'package:bhmh/features/employee/on_boarding/presentation/provider/task_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

enum SignatureMode { draw, type }

class SignatureAction extends StatefulWidget {
  final String taskId;
  final String? title; // NEW: Descriptive title
  const SignatureAction({super.key, required this.taskId, this.title});

  @override
  State<SignatureAction> createState() => _SignatureActionState();
}

class _SignatureActionState extends State<SignatureAction>
    with SingleTickerProviderStateMixin {
  final List<Offset> _points = [];
  final TextEditingController _nameController = TextEditingController();
  SignatureMode _mode = SignatureMode.draw;
  bool _isSubmittingSuccessfully = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  bool _isLocked(TaskStatus? status) {
    return status == TaskStatus.submitted ||
        status == TaskStatus.completed ||
        status == TaskStatus.verified ||
        status == TaskStatus.signed ||
        status == TaskStatus.acknowledged ||
        status == TaskStatus.waitingForApprover;
  }

  String _getSignatureData() {
    if (_mode == SignatureMode.type) {
      return 'typed:${_nameController.text.trim()}';
    }
    return _points.map((p) => '${p.dx},${p.dy}').join(';');
  }

  bool get _isSignatureReady {
    if (_mode == SignatureMode.type) {
      return _nameController.text.trim().length >= 2;
    }
    return _points.isNotEmpty;
  }

  void _clearSignature() {
    setState(() {
      if (_mode == SignatureMode.type) {
        _nameController.clear();
      } else {
        _points.clear();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        final taskStatus = ref.watch(taskStatusMapProvider)[widget.taskId];
        final isLoading = ref.watch(taskViewModelProvider).isLoading;
        final isLocked = _isLocked(taskStatus);

        // ── Reactive Error Handling ───────────────────────────────
        ref.listen<AsyncValue<void>>(taskViewModelProvider, (previous, next) {
          next.whenOrNull(
            error: (error, stack) {
              final userFriendlyMessage =
                  FirebaseErrorMapper.getUserFriendlyMessage(error);
              ToastService.showError(context, userFriendlyMessage);
            },
          );
        });

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isLocked)
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.lock_outline,
                          size: 16,
                          color: Color(0xFF64748B),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Task Signed - Locked',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: (isLoading || isLocked)
                              ? null
                              : () {
                                  if (mounted) {
                                    setState(() => _mode = SignatureMode.draw);
                                  }
                                },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            decoration: BoxDecoration(
                              color: _mode == SignatureMode.draw
                                  ? Colors.white
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: _mode == SignatureMode.draw
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.edit_outlined,
                                    size: 18,
                                    color: _mode == SignatureMode.draw
                                        ? const Color(0xFF109B85)
                                        : Colors.grey.shade600,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Draw',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: _mode == SignatureMode.draw
                                          ? const Color(0xFF109B85)
                                          : Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: (isLoading || isLocked)
                              ? null
                              : () {
                                  if (mounted) {
                                    setState(() => _mode = SignatureMode.type);
                                  }
                                },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            decoration: BoxDecoration(
                              color: _mode == SignatureMode.type
                                  ? Colors.white
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: _mode == SignatureMode.type
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.text_fields_outlined,
                                    size: 18,
                                    color: _mode == SignatureMode.type
                                        ? const Color(0xFF109B85)
                                        : Colors.grey.shade600,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Type',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: _mode == SignatureMode.type
                                          ? const Color(0xFF109B85)
                                          : Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (_mode == SignatureMode.draw) ...[
                  Container(
                    height: 200,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: GestureDetector(
                      onPanUpdate: (isLoading || isLocked)
                          ? null
                          : (d) {
                              if (mounted) {
                                setState(() => _points.add(d.localPosition));
                              }
                            },
                      onPanEnd: (isLoading || isLocked)
                          ? null
                          : (d) => _points.add(Offset.infinite),
                      child: CustomPaint(
                        painter: SignaturePainter(_points),
                        size: Size.infinite,
                      ),
                    ),
                  ),
                ] else ...[
                  CustomTextField(
                    controller: _nameController,
                    enabled: !isLoading && !isLocked,
                    onChanged: (_) => setState(() {}),
                    hintText: 'Enter your full name',
                  ),
                  if (_nameController.text.trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F9FA),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Preview:',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _nameController.text.trim(),
                            style: GoogleFonts.dancingScript(
                              fontSize: 32,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _isSignatureReady && !isLoading && !isLocked
                            ? _clearSignature
                            : null,
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text('Clear'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.redAccent,
                          side: const BorderSide(color: Colors.redAccent),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed:
                            _isSignatureReady &&
                                !isLoading &&
                                !isLocked &&
                                !_isSubmittingSuccessfully
                            ? () async {
                                final success = await ref
                                    .read(taskViewModelProvider.notifier)
                                    .signTask(
                                      taskId: widget.taskId,
                                      taskTitle: widget.title,
                                      signatureData: _getSignatureData(),
                                      asDraft: false,
                                    );
                                if (success && mounted) {
                                  setState(
                                    () => _isSubmittingSuccessfully = true,
                                  );
                                  ToastService.showSuccess(
                                    context,
                                    'Signature submitted successfully',
                                  );
                                }
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF109B85),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: (isLoading || _isSubmittingSuccessfully)
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check_rounded, size: 18),
                                  SizedBox(width: 8),
                                  Text('Submit Signature'),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class SignaturePainter extends CustomPainter {
  final List<Offset> points;
  SignaturePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF0F172A)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;
    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != Offset.infinite && points[i + 1] != Offset.infinite) {
        canvas.drawLine(points[i], points[i + 1], paint);
      }
    }
  }

  @override
  bool shouldRepaint(SignaturePainter old) => true;
}
