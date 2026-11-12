import 'package:bhmh/core/utils/colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class CustomTextField extends StatefulWidget {
  final String hintText;
  final TextEditingController? controller;
  final bool obscureText; // Base value
  final bool readOnly;
  final bool? enabled;
  final TextInputType keyboardType;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final FormFieldValidator<String>? validator;
  final int? maxLines;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputAction? textInputAction;
  final TextAlign textAlign;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;
  final bool? isObscured;
  final ValueChanged<bool>? onVisibilityToggle;
  final TextStyle? style;
  final String obscuringCharacter;
  final InputBorder? enabledBorder;
  final InputBorder? focusedBorder;
  final InputBorder? errorBorder;
  final Color? fillColor;
  final bool? filled;

  const CustomTextField({
    super.key,
    required this.hintText,
    this.controller,
    this.obscureText = false,
    this.readOnly = false,
    this.enabled,
    this.keyboardType = TextInputType.text,
    this.prefixIcon,
    this.suffixIcon,
    this.validator,
    this.maxLines = 1,
    this.maxLength,
    this.inputFormatters,
    this.textInputAction,
    this.textAlign = TextAlign.start,
    this.focusNode,
    this.onChanged,
    this.onTap,
    this.isObscured,
    this.onVisibilityToggle,
    this.style,
    this.obscuringCharacter = '•',
    this.enabledBorder,
    this.focusedBorder,
    this.errorBorder,
    this.fillColor,
    this.filled,
    this.contentPadding,
  });

  final EdgeInsetsGeometry? contentPadding;

  @override
  CustomTextFieldState createState() => CustomTextFieldState();
}

class CustomTextFieldState extends State<CustomTextField>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animationController;
  late Animation<double> _animation;

  late bool _internalIsObscured;
  bool get _isObscured => widget.isObscured ?? _internalIsObscured;

  @override
  void initState() {
    super.initState();
    _internalIsObscured = widget.obscureText;

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _animation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 10.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 10.0, end: -10.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -10.0, end: 10.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 10.0, end: 0.0), weight: 1),
    ]).chain(CurveTween(curve: Curves.easeInOut)).animate(_animationController);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void shake() {
    _animationController.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDarkMode = theme.brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(_animation.value, 0),
          child: child,
        );
      },
      child: TextFormField(
        controller: widget.controller,
        obscureText: _isObscured,
        validator: widget.validator,
        keyboardType: widget.keyboardType,
        maxLines: widget.maxLines,
        maxLength: widget.maxLength,
        inputFormatters: widget.inputFormatters,
        readOnly: widget.readOnly,
        enabled: widget.enabled,
        textInputAction: widget.textInputAction,
        textAlign: widget.textAlign,
        focusNode: widget.focusNode,
        onChanged: widget.onChanged,
        onTap: widget.onTap,
        obscuringCharacter: widget.obscuringCharacter,
        style:
            widget.style ??
            TextStyle(color: isDarkMode ? Colors.white : Colors.black),
        decoration: InputDecoration(
          hintText: widget.hintText,
          hintStyle: TextStyle(
            color: isDarkMode ? Colors.white54 : Colors.black54,
          ),

          // ✅ CLEAN UPDATE: Removed filled/fillColor
          filled: widget.filled ?? false,
          fillColor: widget.fillColor,

          prefixIcon: widget.prefixIcon,

          suffixIcon: widget.obscureText
              ? IconButton(
                  icon: Icon(
                    _isObscured ? LucideIcons.eyeOff : LucideIcons.eye,
                    color: Colors.grey,
                  ),
                  onPressed: () {
                    if (widget.onVisibilityToggle != null) {
                      widget.onVisibilityToggle!(!_isObscured);
                    } else {
                      setState(() {
                        _internalIsObscured = !_internalIsObscured;
                      });
                    }
                  },
                )
              : widget.suffixIcon,

          counterText: "",
          contentPadding:
              widget.contentPadding ??
              const EdgeInsets.symmetric(vertical: 16, horizontal: 20),

          enabledBorder:
              widget.enabledBorder ??
              OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: BorderSide(
                  color: isDarkMode ? AppColors.primaryColor : Colors.black12,
                  width: 1.5,
                ),
              ),

          focusedBorder:
              widget.focusedBorder ??
              OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: BorderSide(color: theme.primaryColor, width: 2),
              ),
          errorBorder:
              widget.errorBorder ??
              OutlineInputBorder(
                borderRadius: BorderRadius.circular(15),
                borderSide: const BorderSide(color: Colors.red, width: 1.5),
              ),
          focusedErrorBorder: widget.errorBorder != null
              ? (widget.errorBorder as OutlineInputBorder).copyWith(
                  borderSide: (widget.errorBorder as OutlineInputBorder)
                      .borderSide
                      .copyWith(width: 2),
                )
              : OutlineInputBorder(
                  borderRadius: BorderRadius.circular(15),
                  borderSide: const BorderSide(color: Colors.red, width: 2),
                ),
        ),
      ),
    );
  }
}
