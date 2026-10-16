import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/models/delete_account_context.dart';
import 'package:flutter/material.dart';

// NOTE: Import your data file here
// import 'admin_delete_account_data.dart';

// ============================================================================
// 1. THE DANGER ZONE TILE (Expandable UI)
// ============================================================================

class UserDeleteTile extends StatefulWidget {
  final DeleteAccountContext deleteContext;
  final String title;
  final String subtitle;
  final Function(String password) onDeleteConfirmed;

  const UserDeleteTile({
    super.key,
    required this.deleteContext,
    this.title = 'Danger Zone',
    this.subtitle = 'Delete Workspace',
    required this.onDeleteConfirmed,
  });

  @override
  State<UserDeleteTile> createState() => _UserDeleteTileState();
}

class _UserDeleteTileState extends State<UserDeleteTile>
    with SingleTickerProviderStateMixin {
  bool _isExpanded = false;
  late AnimationController _animationController;
  late Animation<double> _chevronAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _chevronAnimation = Tween<double>(begin: 0, end: 0.5).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    });
  }

  void _openConfirmation(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;

    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SafeArea(
              top: false,
              child: _DeleteConfirmationPanel(
                deleteContext: widget.deleteContext,
                isMobile: true,
                onConfirm: widget.onDeleteConfirmed,
              ),
            ),
          ),
        ),
      );
    } else {
      showDialog(
        context: context,
        barrierColor: const Color(0xFF0F172A).withValues(alpha: 0.4),
        builder: (context) => Dialog(
          elevation: 0,
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          child: SizedBox(
            width: 500,
            child: _DeleteConfirmationPanel(
              deleteContext: widget.deleteContext,
              isMobile: false,
              onConfirm: widget.onDeleteConfirmed,
            ),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 600;

    // Theme Colors
    const Color mainDangerColor = Color(0xFFEF4444);
    const Color borderDangerColor = Color(0xFFFECACA);
    const Color backgroundDangerColor = Color(0xFFFEF2F2);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderDangerColor, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: backgroundDangerColor.withValues(alpha: 0.5),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hoverable & Tappable Header
          InkWell(
            onTap: _toggleExpanded,
            borderRadius: BorderRadius.circular(24),
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 24 : 40),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: backgroundDangerColor,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.warning_amber_rounded,
                      color: mainDangerColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: mainDangerColor,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.subtitle,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  RotationTransition(
                    turns: _chevronAnimation,
                    child: const Icon(
                      Icons.expand_more_rounded,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Smooth Expandable Content
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: _isExpanded
                ? Padding(
                    padding: EdgeInsets.fromLTRB(
                      isMobile ? 24 : 40,
                      0,
                      isMobile ? 24 : 40,
                      isMobile ? 24 : 40,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Once deleted, you will:',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF991B1B),
                                ),
                              ),
                              const SizedBox(height: 12),
                              ...widget.deleteContext.consequences.map(
                                (text) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8.0),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Padding(
                                        padding: EdgeInsets.only(top: 4.0),
                                        child: Icon(
                                          Icons.circle,
                                          size: 6,
                                          color: mainDangerColor,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          text,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: Color(0xFF7F1D1D),
                                            height: 1.4,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 32),
                        Align(
                          alignment: isMobile
                              ? Alignment.center
                              : Alignment.centerLeft,
                          child: _AnimatedDangerButton(
                            label: 'Proceed to Deletion',
                            onPressed: () => _openConfirmation(context),
                          ),
                        ),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// 2. THE CONFIRMATION PANEL (The Friction Step)
// ============================================================================

class _DeleteConfirmationPanel extends StatefulWidget {
  final DeleteAccountContext deleteContext;
  final bool isMobile;
  final Function(String) onConfirm;

  const _DeleteConfirmationPanel({
    required this.deleteContext,
    required this.isMobile,
    required this.onConfirm,
  });

  @override
  State<_DeleteConfirmationPanel> createState() =>
      _DeleteConfirmationPanelState();
}

class _DeleteConfirmationPanelState extends State<_DeleteConfirmationPanel> {
  final TextEditingController _confirmController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isWordConfirmed = false;
  bool _obscurePassword = true;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _confirmController.addListener(() {
      setState(() {
        _isWordConfirmed =
            _confirmController.text.trim() ==
            widget.deleteContext.confirmationWord;
      });
    });
    _passwordController.addListener(() {
      setState(() {}); // Trigger rebuild to validate both fields
    });
  }

  @override
  void dispose() {
    _confirmController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    bool canSubmit =
        _isWordConfirmed && _passwordController.text.isNotEmpty && !_isProcessing;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(32, 32, 32, 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Confirm Deletion',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              if (!widget.isMobile)
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      color: Color(0xFF475569),
                      size: 16,
                    ),
                  ),
                  splashRadius: 24,
                ),
            ],
          ),
        ),

        // Body
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'This action is final and irreversible. All your data will be permanently wiped from our servers.',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF475569),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),

              // 1. Friction Step: Type DELETE
              RichText(
                text: TextSpan(
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF0F172A),
                  ),
                  children: [
                    const TextSpan(text: 'Please type '),
                    TextSpan(
                      text: widget.deleteContext.confirmationWord,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFEF4444),
                      ),
                    ),
                    const TextSpan(text: ' to confirm.'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _confirmController,
                enabled: !_isProcessing,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                ),
                decoration: InputDecoration(
                  hintText: widget.deleteContext.confirmationWord,
                  hintStyle: const TextStyle(
                    color: Color(0xFFCBD5E1),
                    letterSpacing: 1.5,
                  ),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: Color(0xFFEF4444),
                      width: 1.5,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // 2. Security Step: Admin Password
              const Text(
                'Enter your password:',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF0F172A),
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _passwordController,
                enabled: !_isProcessing,
                obscureText: _obscurePassword,
                obscuringCharacter: '•',
                decoration: InputDecoration(
                  hintText: 'Your current password',
                  hintStyle: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontWeight: FontWeight.w500,
                  ),
                  prefixIcon: const Icon(
                    Icons.lock_outline_rounded,
                    color: Color(0xFF64748B),
                    size: 20,
                  ),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: const Color(0xFF64748B),
                      size: 20,
                    ),
                    onPressed: _isProcessing
                        ? null
                        : () => setState(
                            () => _obscurePassword = !_obscurePassword),
                  ),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: Color(0xFFEF4444),
                      width: 1.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),

        // Footer Actions
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey.shade200)),
            borderRadius: widget.isMobile
                ? null
                : const BorderRadius.vertical(bottom: Radius.circular(24)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed:
                      _isProcessing ? null : () => Navigator.pop(context),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(
                      color: Color(0xFF475569),
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _isProcessing
                    ? Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: const Color(0xFFFECACA),
                            width: 1.5,
                          ),
                        ),
                        child: const Center(
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Color(0xFFEF4444),
                            ),
                          ),
                        ),
                      )
                    : _AnimatedDangerButton(
                        label: 'Permanently Delete',
                        isDisabled: !canSubmit,
                        isFullWidth: true,
                        onPressed: () async {
                          setState(() => _isProcessing = true);
                          try {
                            await widget.onConfirm(_passwordController.text);
                          } finally {
                            if (context.mounted) {
                              setState(() => _isProcessing = false);
                              Navigator.pop(context);
                            }
                          }
                        },
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ============================================================================
// 3. TACTILE DANGER BUTTON
// ============================================================================

class _AnimatedDangerButton extends StatefulWidget {
  final String label;
  final VoidCallback onPressed;
  final bool isDisabled;
  final bool isFullWidth;

  const _AnimatedDangerButton({
    required this.label,
    required this.onPressed,
    this.isDisabled = false,
    this.isFullWidth = false,
  });

  @override
  State<_AnimatedDangerButton> createState() => _AnimatedDangerButtonState();
}

class _AnimatedDangerButtonState extends State<_AnimatedDangerButton> {
  bool _isHovering = false;
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final Color bgColor = widget.isDisabled
        ? const Color(0xFFF1F5F9)
        : const Color(0xFFFEF2F2);
    final Color textColor = widget.isDisabled
        ? const Color(0xFF94A3B8)
        : const Color(0xFFEF4444);
    final Color borderColor = widget.isDisabled
        ? Colors.transparent
        : const Color(0xFFFECACA);

    return MouseRegion(
      cursor: widget.isDisabled
          ? SystemMouseCursors.forbidden
          : SystemMouseCursors.click,
      onEnter: (_) => {
        if (!widget.isDisabled) setState(() => _isHovering = true),
      },
      onExit: (_) => {
        if (!widget.isDisabled) setState(() => _isHovering = false),
      },
      child: GestureDetector(
        onTapDown: (_) => {
          if (!widget.isDisabled) setState(() => _isPressed = true),
        },
        onTapUp: (_) {
          if (!widget.isDisabled) {
            setState(() => _isPressed = false);
            widget.onPressed();
          }
        },
        onTapCancel: () => {
          if (!widget.isDisabled) setState(() => _isPressed = false),
        },
        child: AnimatedScale(
          scale: _isPressed ? 0.96 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: widget.isFullWidth ? double.infinity : null,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            decoration: BoxDecoration(
              color: _isHovering && !widget.isDisabled
                  ? const Color(0xFFFEE2E2)
                  : bgColor,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: borderColor, width: 1.5),
            ),
            child: Text(
              widget.label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: textColor,
                fontWeight: FontWeight.w700,
                fontSize: 15,
                letterSpacing: 0.3,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
