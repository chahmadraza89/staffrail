import 'dart:developer';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// =============================================================================
// DYNAMIC FORM BUILDER (v0.1)
// =============================================================================
// Renders form fields dynamically from a Firestore-driven schema.
// Each field in the schema is a Map<String, dynamic> with:
//   - name: field identifier (used as Map key in form data)
//   - label: display label
//   - type: text | date | phone | email | number | textarea
//   - required: whether the field must be filled
//
// Returns collected data as Map<String, String> via the onChanged callback.
// =============================================================================

/// Schema definition for a single form field.
class FormFieldSchema {
  final String name;
  final String label;
  final String type; // text, date, phone, email, number, textarea
  final bool required;
  final String? hint;
  final List<String>? options;

  const FormFieldSchema({
    required this.name,
    required this.label,
    this.type = 'text',
    this.required = true,
    this.hint,
    this.options,
  });

  factory FormFieldSchema.fromMap(Map<String, dynamic> map) {
    return FormFieldSchema(
      name: map['name'] as String? ?? '',
      label: map['label'] as String? ?? '',
      type: map['type'] as String? ?? 'text',
      required: map['required'] as bool? ?? true,
      hint: map['hint'] as String?,
      options: (map['options'] as List?)?.map((e) => e.toString()).toList(),
    );
  }
}

class DynamicFormBuilder extends StatefulWidget {
  final List<FormFieldSchema> fields;
  final Map<String, String>? initialData;
  final ValueChanged<Map<String, String>> onChanged;
  final bool isReadOnly;

  const DynamicFormBuilder({
    super.key,
    required this.fields,
    this.initialData,
    required this.onChanged,
    this.isReadOnly = false,
  });

  @override
  State<DynamicFormBuilder> createState() => _DynamicFormBuilderState();
}

class _DynamicFormBuilderState extends State<DynamicFormBuilder> {
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String> _formData = {};

  @override
  void initState() {
    super.initState();
    for (final field in widget.fields) {
      final initialValue = widget.initialData?[field.name] ?? '';
      _controllers[field.name] = TextEditingController(text: initialValue);
      _formData[field.name] = initialValue;
    }
  }

  @override
  void didUpdateWidget(DynamicFormBuilder oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Only sync controllers if the remote initialData has actually changed
    // compared to what we previously received. This prevents overwriting 
    // local unsaved changes when a background stream update happens 
    // but the data for this specific field is still the same.
    for (final field in widget.fields) {
      final newValue = widget.initialData?[field.name] ?? '';
      final oldValue = oldWidget.initialData?[field.name] ?? '';

      if (newValue != oldValue) {
        if (_controllers[field.name]?.text != newValue) {
          _controllers[field.name]?.text = newValue;
          _formData[field.name] = newValue;
        }
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _onFieldChanged(String name, String value) {
    _formData[name] = value;
    log('📝 [DynamicForm] Field updated: $name = "$value"');
    widget.onChanged(Map.unmodifiable(_formData));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widget.fields
          .map(
            (field) => DynamicFieldNode(
              field: field,
              controller: _controllers[field.name]!,
              isReadOnly: widget.isReadOnly,
              onChanged: (value) => _onFieldChanged(field.name, value),
            ),
          )
          .toList(),
    );
  }
}

// =============================================================================
// --- STANDALONE FIELD COMPONENTS ---
// =============================================================================

/// Acts as the orchestrator for individual fields.
class DynamicFieldNode extends StatelessWidget {
  final FormFieldSchema field;
  final TextEditingController controller;
  final bool isReadOnly;
  final ValueChanged<String> onChanged;

  const DynamicFieldNode({
    super.key,
    required this.field,
    required this.controller,
    required this.isReadOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (field.type == 'header') {
      return Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 8, bottom: 4),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF109B85).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          field.label.toUpperCase(),
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
            color: Color(0xFF109B85),
          ),
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.only(bottom: field.type == 'checkbox' ? 0 : 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (field.type != 'checkbox')
            DynamicFieldLabel(label: field.label, isRequired: field.required),
          if (field.type != 'checkbox') const SizedBox(height: 6),
          DynamicInputWrapper(
            field: field,
            controller: controller,
            isReadOnly: isReadOnly,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

/// Orchestrates which input component to build based on field type.
class DynamicInputWrapper extends StatelessWidget {
  final FormFieldSchema field;
  final TextEditingController controller;
  final bool isReadOnly;
  final ValueChanged<String> onChanged;

  const DynamicInputWrapper({
    super.key,
    required this.field,
    required this.controller,
    required this.isReadOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (field.type == 'header') {
      return const SizedBox.shrink();
    } else if (field.type == 'date') {
      return DynamicDateInput(
        field: field,
        controller: controller,
        isReadOnly: isReadOnly,
        onChanged: onChanged,
      );
    } else if (field.type == 'textarea') {
      return DynamicTextAreaInput(
        field: field,
        controller: controller,
        isReadOnly: isReadOnly,
        onChanged: onChanged,
      );
    } else if (field.type == 'checkbox') {
      return DynamicCheckboxInput(
        field: field,
        controller: controller,
        isReadOnly: isReadOnly,
        onChanged: onChanged,
      );
    } else if (field.type == 'select') {
      return DynamicSelectInput(
        field: field,
        controller: controller,
        isReadOnly: isReadOnly,
        onChanged: onChanged,
      );
    } else {
      return DynamicTextInput(
        field: field,
        controller: controller,
        isReadOnly: isReadOnly,
        onChanged: onChanged,
      );
    }
  }
}

/// Checkbox input field
class DynamicCheckboxInput extends StatefulWidget {
  final FormFieldSchema field;
  final TextEditingController controller;
  final bool isReadOnly;
  final ValueChanged<String> onChanged;

  const DynamicCheckboxInput({
    super.key,
    required this.field,
    required this.controller,
    required this.isReadOnly,
    required this.onChanged,
  });

  @override
  State<DynamicCheckboxInput> createState() => _DynamicCheckboxInputState();
}

class _DynamicCheckboxInputState extends State<DynamicCheckboxInput> {
  late bool _value;

  @override
  void initState() {
    super.initState();
    _value = widget.controller.text == 'true';
  }

  @override
  void didUpdateWidget(DynamicCheckboxInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    final newValue = widget.controller.text == 'true';
    if (_value != newValue) {
      setState(() {
        _value = newValue;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: widget.isReadOnly
          ? null
          : () {
              setState(() {
                _value = !_value;
                widget.controller.text = _value.toString();
                widget.onChanged(_value.toString());
              });
            },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Checkbox(
              value: _value,
              onChanged: widget.isReadOnly
                  ? null
                  : (val) {
                      setState(() {
                        _value = val ?? false;
                        widget.controller.text = _value.toString();
                        widget.onChanged(_value.toString());
                      });
                    },
              activeColor: const Color(0xFF109B85),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                widget.field.hint ?? '',
                style: TextStyle(
                  fontSize: 14,
                  color: _value ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Dropdown/Select input field
class DynamicSelectInput extends StatelessWidget {
  final FormFieldSchema field;
  final TextEditingController controller;
  final bool isReadOnly;
  final ValueChanged<String> onChanged;

  const DynamicSelectInput({
    super.key,
    required this.field,
    required this.controller,
    required this.isReadOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      initialValue: controller.text.isNotEmpty ? controller.text : null,
      isExpanded: true,
      items: (field.options ?? [])
          .map((opt) => DropdownMenuItem(
                value: opt,
                child: Text(
                  opt,
                  style: const TextStyle(fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ))
          .toList(),
      onChanged: isReadOnly
          ? null
          : (val) {
              if (val != null) {
                controller.text = val;
                onChanged(val);
              }
            },
      decoration: DynamicFormUtils.inputDecoration(field, isReadOnly),
      icon: const Icon(Icons.arrow_drop_down_circle_outlined,
          size: 20, color: Color(0xFF109B85)),
      hint: Text(
        field.hint ?? 'Select ${field.label.toLowerCase()}',
        style: const TextStyle(fontSize: 14),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

/// Renders the label and the required asterisk indicator.
class DynamicFieldLabel extends StatelessWidget {
  final String label;
  final bool isRequired;

  const DynamicFieldLabel({
    super.key,
    required this.label,
    required this.isRequired,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Color(0xFF334155),
      ),
    );
  }
}

/// Text input field leveraging CustomTextField
class DynamicTextInput extends StatelessWidget {
  final FormFieldSchema field;
  final TextEditingController controller;
  final bool isReadOnly;
  final ValueChanged<String> onChanged;

  const DynamicTextInput({
    super.key,
    required this.field,
    required this.controller,
    required this.isReadOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    List<TextInputFormatter>? inputFormatters;
    TextInputType keyboardType = DynamicFormUtils.getKeyboardType(field.type);

    if (field.name == 'ssn' ||
        field.name == 'accountNumber' ||
        field.name == 'routingNumber') {
      inputFormatters = [FilteringTextInputFormatter.digitsOnly];
      keyboardType = TextInputType.number;
    }

    return CustomTextField(
      hintText: field.hint ?? 'Enter ${field.label.toLowerCase()}',
      controller: controller,
      readOnly: isReadOnly,
      keyboardType: keyboardType,
      onChanged: onChanged,
      maxLength: field.name == 'ssn' ? 4 : (field.name == 'routingNumber' ? 9 : null),
      inputFormatters: inputFormatters,
      validator: (value) {
        if (field.required && (value == null || value.isEmpty)) {
          return '${field.label} is required';
        }
        if (field.name == 'ssn' && value != null && value.isNotEmpty) {
          if (value.length != 4 || int.tryParse(value) == null) {
            return 'SSN must be exactly 4 numeric digits';
          }
        }
        if (field.name == 'routingNumber' && value != null && value.isNotEmpty) {
          if (value.length != 9 || int.tryParse(value) == null) {
            return 'Routing number must be exactly 9 digits';
          }
        }
        if (field.name == 'accountNumber' && value != null && value.isNotEmpty) {
          if (value.length < 4 || value.length > 17 || int.tryParse(value) == null) {
            return 'Account number must be between 4 and 17 digits';
          }
        }
        if (field.type == 'phone' && value != null && value.isNotEmpty) {
          final phoneRegex = RegExp(r'^(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}$');
          if (!phoneRegex.hasMatch(value)) {
            return 'Enter a valid phone number';
          }
        }
        if (field.type == 'email' && value != null && value.isNotEmpty) {
          final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
          if (!emailRegex.hasMatch(value)) {
            return 'Enter a valid email address';
          }
        }
        return null;
      },
    );
  }
}

/// Multi-line text area input
class DynamicTextAreaInput extends StatelessWidget {
  final FormFieldSchema field;
  final TextEditingController controller;
  final bool isReadOnly;
  final ValueChanged<String> onChanged;

  const DynamicTextAreaInput({
    super.key,
    required this.field,
    required this.controller,
    required this.isReadOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      readOnly: isReadOnly,
      maxLines: 4,
      onChanged: onChanged,
      decoration: DynamicFormUtils.inputDecoration(field, isReadOnly),
    );
  }
}

/// Date picker input field
class DynamicDateInput extends StatelessWidget {
  final FormFieldSchema field;
  final TextEditingController controller;
  final bool isReadOnly;
  final ValueChanged<String> onChanged;

  const DynamicDateInput({
    super.key,
    required this.field,
    required this.controller,
    required this.isReadOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isReadOnly
          ? null
          : () async {
              final isDob = field.name == 'dateOfBirth';
              final lastDate = isDob ? DateTime.now() : DateTime(2100);

              DateTime initialDate = DateTime.now();
              if (initialDate.isAfter(lastDate)) {
                initialDate = lastDate;
              }

              if (controller.text.isNotEmpty) {
                try {
                  final parts = controller.text.split('/');
                  if (parts.length == 3) {
                    final month = int.parse(parts[0]);
                    final day = int.parse(parts[1]);
                    final year = int.parse(parts[2]);
                    var parsed = DateTime(year, month, day);
                    if (parsed.isAfter(lastDate)) {
                      parsed = lastDate;
                    }
                    if (parsed.isAfter(DateTime(1900)) && 
                        (parsed.isBefore(lastDate) || parsed.isAtSameMomentAs(lastDate))) {
                      initialDate = parsed;
                    }
                  }
                } catch (_) {}
              }

              final date = await showDatePicker(
                context: context,
                initialDate: initialDate,
                firstDate: DateTime(1900),
                lastDate: lastDate,
              );
              if (date != null) {
                final formatted =
                    '${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}/${date.year}';
                controller.text = formatted;
                onChanged(formatted);
              }
            },
      child: AbsorbPointer(
        child: TextFormField(
          controller: controller,
          readOnly: true,
          validator: (value) {
            if (field.required && (value == null || value.isEmpty)) {
              return '${field.label} is required';
            }
            if (field.name == 'dateOfBirth' && value != null && value.isNotEmpty) {
              try {
                final parts = value.split('/');
                if (parts.length == 3) {
                  final month = int.parse(parts[0]);
                  final day = int.parse(parts[1]);
                  final year = int.parse(parts[2]);
                  final parsed = DateTime(year, month, day);
                  if (parsed.isAfter(DateTime.now())) {
                    return 'Date of birth cannot be in the future';
                  }
                }
              } catch (_) {
                return 'Invalid date format';
              }
            }
            return null;
          },
          decoration: DynamicFormUtils.inputDecoration(
            field,
            isReadOnly,
          ).copyWith(suffixIcon: const Icon(Icons.calendar_today, size: 18)),
        ),
      ),
    );
  }
}

// =============================================================================
// --- UTILITY HELPER ---
// =============================================================================

/// Contains the shared decoration and type lookup logic to keep components clean.
class DynamicFormUtils {
  static TextInputType getKeyboardType(String type) {
    switch (type) {
      case 'phone':
        return TextInputType.phone;
      case 'email':
        return TextInputType.emailAddress;
      case 'number':
        return TextInputType.number;
      default:
        return TextInputType.text;
    }
  }

  static InputDecoration inputDecoration(
    FormFieldSchema field,
    bool isReadOnly,
  ) {
    return InputDecoration(
      filled: true,
      fillColor: isReadOnly ? Colors.grey.shade50 : Colors.white,
      hintText: field.hint ?? 'Enter ${field.label.toLowerCase()}',
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF109B85), width: 1.5),
      ),
    );
  }
}
