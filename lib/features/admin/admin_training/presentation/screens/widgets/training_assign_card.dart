import 'package:bhmh/core/extensions/app_size.dart';
import 'package:bhmh/core/utils/colors.dart';
import 'package:bhmh/core/widgets/custom_button.dart';
import 'package:bhmh/core/widgets/custom_text_field.dart';
import 'package:bhmh/features/admin/admin_training/presentation/provider/admin_training_provider.dart';
import 'package:bhmh/features/admin/admin_home/presentation/provider/dashboard_provider.dart';
import 'package:bhmh/features/auth/presentation/provider/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bhmh/features/admin/admin_training/presentation/provider/admin_training_view_model.dart';

// ignore_for_file: use_build_context_synchronously
class TrainingAssignCard extends StatefulWidget {
  const TrainingAssignCard({super.key});

  @override
  State<TrainingAssignCard> createState() => _TrainingAssignCardState();
}

class _TrainingAssignCardState extends State<TrainingAssignCard> {
  bool _isHovering = false;
  bool _isPressed = false;

  // 🚀 RULE #5: Smart Layout Routing for Details
  void _openAssignForm(BuildContext context) {
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
            height: MediaQuery.sizeOf(context).height * 0.9, // 90% height
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: const SafeArea(
              top: false,
              child: AssignTrainingPanel(isMobile: true),
            ),
          ),
        ),
      );
    } else {
      showDialog(
        context: context,
        barrierColor: AppColors.primaryColor.withValues(alpha: 0.4),
        builder: (context) => Dialog(
          elevation: 0,
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          child: const SizedBox(
            width: 650, // Perfect width for the form on web
            child: AssignTrainingPanel(isMobile: false),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = context.screenWidth < 800;
    const Color primaryIndigo =
        AppColors.primaryColor; // Matches your concept image

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          _openAssignForm(context);
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: _isPressed ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            transform: Matrix4.translationValues(
              0,
              (_isHovering && !isMobile && !_isPressed) ? -3 : 0,
              0,
            ),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _isHovering
                    ? primaryIndigo.withValues(alpha: 0.5)
                    : Colors.grey.shade200,
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: primaryIndigo.withValues(alpha: _isHovering && !_isPressed ? 0.08 : 0.0),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: primaryIndigo.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.rocket_launch_rounded,
                    color: primaryIndigo,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Assign New Training',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          // color: Color(0xFF0F172A),
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Configure and deploy modules to your team.',
                        style: TextStyle(
                          fontSize: 13,
                          // color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_rounded,
                  color: Color(0xFF94A3B8),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// 2. THE ASSIGN TRAINING FORM PANEL (Matches image_39ac08.png)
// ============================================================================

class AssignTrainingPanel extends ConsumerStatefulWidget {
  final bool isMobile;
  const AssignTrainingPanel({super.key, required this.isMobile});

  @override
  ConsumerState<AssignTrainingPanel> createState() =>
      _AssignTrainingPanelState();
}

class _AssignTrainingPanelState extends ConsumerState<AssignTrainingPanel> {
  //final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  String? _selectedTemplateId;
  DateTime? _deadline;
  final List<String> _selectedEmployeeIds = [];
  String _searchQuery = '';
  bool _isAllStaff = false; // New Mode Toggle

  void _submitTraining() async {
    if (_selectedTemplateId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a training template')),
      );
      return;
    }

    final List<String> targetUserIds = [];

    if (_isAllStaff) {
      // ✨ PREMIUM IMPROVEMENT: Instead of blocking with a SnackBar, we await the list completion
      try {
        final employees = await ref.read(adminEmployeesProgressProvider.future);
        targetUserIds.addAll(employees.map((e) => e.uid));
      } catch (e, stack) {
        // 🔍 DIAGNOSTIC LOGGING: Capturing exact error for analysis
        debugPrint('❌ [TRAINING-ASSIGN-CARD] Error fetching employee list: $e');
        debugPrint('StackTrace: $stack');

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error fetching employee list: $e'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
        return;
      }
    } else {
      targetUserIds.addAll(_selectedEmployeeIds);
    }

    if (targetUserIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No employees found to assign. Ensure users are linked to your clinic.',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final currentUser = ref.read(currentUserProvider).value;
    if (currentUser == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session expired. Please login again.')),
        );
      }
      return;
    }

    final viewModel = ref.read(adminTrainingViewModelProvider.notifier);

    await viewModel.assignTraining(
      templateId: _selectedTemplateId!,
      userIds: targetUserIds,
      deadline: _deadline,
      instructions: _descController.text,
      adminId: currentUser.uid,
    );

    if (mounted) {
      final state = ref.read(adminTrainingViewModelProvider);

      if (state is AsyncData) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✨ Training successfully assigned!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      } else if (state is AsyncError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: ${state.error}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _deadline = picked);
    }
  }

  @override
  void dispose() {
    _descController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(adminTrainingViewModelProvider) is AsyncLoading;
    // 🔒 Keep employee provider alive even in "All Staff" mode so data is ready for submission.
    // Without this, autoDispose kills the provider when we're not rendering the employee list.
    ref.watch(adminEmployeesProgressProvider);
    // const Color primaryIndigo = Color(0xFF4F46E5);

    return Column(
      children: [
        // --- Header ---
        Padding(
          padding: const EdgeInsets.fromLTRB(32, 32, 32, 24),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Assign New Training',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Color(
                          0xFF0F172A,
                        ), // Deeper navy for premium feel
                        letterSpacing: -1.0,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Configure and deploy professional training modules to your team.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                        height: 1.4,
                      ),
                    ),
                  ],
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

        // --- Scrollable Form Content ---
        Expanded(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionTitle(title: '1. Training Details'),
                const SizedBox(height: 16),
                // Template Selection
                const Text(
                  'Select Training Template *',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 8),
                ref
                    .watch(adminClinicTrainingsProvider)
                    .when(
                      data: (trainings) => DropdownButtonFormField<String>(
                        initialValue: _selectedTemplateId,
                        hint: const Text('Choose a template'),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                          prefixIcon: const Icon(
                            Icons.description_outlined,
                            color: Color(0xFF64748B),
                            size: 20,
                          ),
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
                            borderSide: const BorderSide(
                              color: AppColors.primaryColor,
                              width: 1.5,
                            ),
                          ),
                        ),
                        items: trainings
                            .map(
                              (t) => DropdownMenuItem(
                                value: t.id,
                                child: Text(
                                  t.title,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: Color(0xFF1E293B),
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (val) =>
                            setState(() => _selectedTemplateId = val),
                      ),
                      loading: () => const CircularProgressIndicator(),
                      error: (_, _) => const Text('Error loading templates'),
                    ),
                const SizedBox(height: 16),

                if (widget.isMobile) ...[
                  const Text(
                    'Requirement Type *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: 'certificate',
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 16,
                      ),
                      prefixIcon: const Icon(
                        Icons.verified_user_outlined,
                        color: Color(0xFF64748B),
                        size: 20,
                      ),
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
                        borderSide: const BorderSide(
                          color: AppColors.primaryColor,
                          width: 1.5,
                        ),
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'certificate',
                        child: Text(
                          'Certificate Upload',
                          style: TextStyle(fontSize: 14),
                        ),
                      ),
                      DropdownMenuItem(
                        value: 'acknowledgement',
                        child: Text(
                          'Digital Acknowledgement',
                          style: TextStyle(fontSize: 14),
                        ),
                      ),
                    ],
                    onChanged: (val) {},
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Set Deadline *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: _pickDate,
                    child: IgnorePointer(
                      child: _CustomDatePicker(
                        label: '',
                        hint: _deadline == null
                            ? 'Select Date'
                            : '${_deadline!.month}/${_deadline!.day}/${_deadline!.year}',
                      ),
                    ),
                  ),
                ] else ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Requirement Type *',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              initialValue: 'certificate',
                              isDense: true,
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: const Color(0xFFF8FAFC),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                prefixIcon: const Icon(
                                  Icons.verified_user_outlined,
                                  color: Color(0xFF64748B),
                                  size: 18,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Colors.grey.shade200,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Colors.grey.shade200,
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: AppColors.primaryColor,
                                    width: 1.5,
                                  ),
                                ),
                              ),
                              items: const [
                                DropdownMenuItem(
                                  value: 'certificate',
                                  child: Text(
                                    'Certificate Upload',
                                    style: TextStyle(fontSize: 14),
                                  ),
                                ),
                                DropdownMenuItem(
                                  value: 'acknowledgement',
                                  child: Text(
                                    'Digital Acknowledgement',
                                    style: TextStyle(fontSize: 14),
                                  ),
                                ),
                              ],
                              onChanged: (val) {},
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Set Deadline *',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: _pickDate,
                              child: IgnorePointer(
                                child: _CustomDatePicker(
                                  label: '',
                                  hint: _deadline == null
                                      ? 'Select Date'
                                      : '${_deadline!.month}/${_deadline!.day}/${_deadline!.year}',
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 32),

                const SectionTitle(title: '2. Audience Selection'),
                const SizedBox(height: 12),

                // --- Selection Mode Switcher (Matching Compose Message Pattern) ---
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _SelectionTab(
                          label: 'All Staff',
                          icon: Icons.groups_rounded,
                          isSelected: _isAllStaff,
                          onTap: () => setState(() => _isAllStaff = true),
                        ),
                      ),
                      Expanded(
                        child: _SelectionTab(
                          label: 'Individually',
                          icon: Icons.person_search_rounded,
                          isSelected: !_isAllStaff,
                          onTap: () => setState(() => _isAllStaff = false),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                if (_isAllStaff)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.primaryColor.withValues(alpha: 0.08),
                          AppColors.primaryColor.withValues(alpha: 0.02),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.primaryColor.withValues(alpha: 0.15),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryColor.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.hub_rounded,
                            color: AppColors.primaryColor,
                            size: 28,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Universal Assignment Mode',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 17,
                            color: Color(0xFF0F172A),
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'This module will be automatically deployed to every active staff member in your clinic.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  )
                else ...[
                  const Text(
                    'Select Individuals to Assign *',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // --- Search & Select All Actions ---
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF1E293B),
                          ),
                          onChanged: (val) =>
                              setState(() => _searchQuery = val.toLowerCase()),
                          decoration: InputDecoration(
                            hintText: 'Search team members...',
                            hintStyle: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF94A3B8),
                            ),
                            prefixIcon: const Icon(
                              Icons.search_rounded,
                              size: 20,
                              color: Color(0xFF64748B),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14.5,
                            ), // Fine-tuned for exact 48px matching
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide(
                                color: Colors.grey.shade200,
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide(
                                color: Colors.grey.shade200,
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(
                                color: AppColors.primaryColor,
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ref
                          .watch(adminEmployeesProgressProvider)
                          .when(
                            data: (employees) {
                              final bool allSelected =
                                  employees.isNotEmpty &&
                                  _selectedEmployeeIds.length ==
                                      employees.length;
                              return SizedBox(
                                height: 48,
                                child: TextButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      if (allSelected) {
                                        _selectedEmployeeIds.clear();
                                      } else {
                                        _selectedEmployeeIds.clear();
                                        _selectedEmployeeIds.addAll(
                                          employees.map((e) => e.uid),
                                        );
                                      }
                                    });
                                  },
                                  icon: Icon(
                                    allSelected
                                        ? Icons.deselect_rounded
                                        : Icons.select_all_rounded,
                                    size: 18,
                                  ),
                                  label: Text(
                                    allSelected ? 'Clear' : 'Select All',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppColors.primaryColor,
                                    backgroundColor: AppColors.primaryColor
                                        .withValues(alpha: 0.08),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                ),
                              );
                            },
                            loading: () => const SizedBox.shrink(),
                            error: (_, _) => const SizedBox.shrink(),
                          ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // --- Employee List ---
                  Container(
                    constraints: const BoxConstraints(maxHeight: 300),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey.shade100),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: ref
                          .watch(adminEmployeesProgressProvider)
                          .when(
                            data: (employees) {
                              final filtered = employees
                                  .where(
                                    (e) => e.name.toLowerCase().contains(
                                      _searchQuery,
                                    ),
                                  )
                                  .toList();

                              if (filtered.isEmpty) {
                                return const Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(32.0),
                                    child: Text(
                                      'No employees found',
                                      style: TextStyle(color: Colors.grey),
                                    ),
                                  ),
                                );
                              }

                              return ListView.separated(
                                shrinkWrap: true,
                                itemCount: filtered.length,
                                separatorBuilder: (_, _) => Divider(
                                  height: 1,
                                  color: Colors.grey.shade50,
                                ),
                                itemBuilder: (context, index) {
                                  final emp = filtered[index];
                                  final isSelected = _selectedEmployeeIds
                                      .contains(emp.uid);

                                  return InkWell(
                                    onTap: () {
                                      setState(() {
                                        if (isSelected) {
                                          _selectedEmployeeIds.remove(emp.uid);
                                        } else {
                                          _selectedEmployeeIds.add(emp.uid);
                                        }
                                      });
                                    },
                                    child: Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? AppColors.primaryColor
                                                  .withValues(alpha: 0.03)
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: isSelected
                                              ? AppColors.primaryColor
                                                    .withValues(alpha: 0.2)
                                              : Colors.transparent,
                                        ),
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 16,
                                          vertical: 12,
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 36,
                                              height: 36,
                                              decoration: BoxDecoration(
                                                color: AppColors.primaryColor
                                                    .withValues(alpha: 0.1),
                                                shape: BoxShape.circle,
                                              ),
                                              alignment: Alignment.center,
                                              child: Text(
                                                emp.name[0].toUpperCase(),
                                                style: const TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w900,
                                                  color: AppColors.primaryColor,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    emp.name,
                                                    style: TextStyle(
                                                      fontSize: 14,
                                                      fontWeight: isSelected
                                                          ? FontWeight.w700
                                                          : FontWeight.w600,
                                                      color: const Color(
                                                        0xFF1E293B,
                                                      ),
                                                    ),
                                                  ),
                                                  if (emp.email != null)
                                                    Text(
                                                      emp.email!,
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                        color: Colors
                                                            .grey
                                                            .shade500,
                                                      ),
                                                    ),
                                                ],
                                              ),
                                            ),
                                            Checkbox(
                                              value: isSelected,
                                              activeColor:
                                                  AppColors.primaryColor,
                                              checkColor: Colors.white,
                                              materialTapTargetSize:
                                                  MaterialTapTargetSize
                                                      .shrinkWrap,
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(5),
                                              ),
                                              onChanged: (val) {
                                                setState(() {
                                                  if (val == true) {
                                                    _selectedEmployeeIds.add(
                                                      emp.uid,
                                                    );
                                                  } else {
                                                    _selectedEmployeeIds.remove(
                                                      emp.uid,
                                                    );
                                                  }
                                                });
                                              },
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              );
                            },
                            loading: () => const Center(
                              child: Padding(
                                padding: EdgeInsets.all(32.0),
                                child: CircularProgressIndicator(),
                              ),
                            ),
                            error: (_, _) => const Center(
                              child: Padding(
                                padding: EdgeInsets.all(32.0),
                                child: Text('Error loading employees'),
                              ),
                            ),
                          ),
                    ),
                  ),
                ],
                const SizedBox(height: 32),

                const SectionTitle(title: '3. Additional Information'),
                const SizedBox(height: 8),
                const Text(
                  'Instructions or Context (Optional)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 8),
                CustomTextField(
                  controller: _descController,
                  hintText:
                      'Provide any specific context or instructions for this training assignment...',
                  maxLines: 4,
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),

        // --- Footer Actions ---
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
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Cancel',
                  style: TextStyle(
                    color: Color(0xFF475569),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              CustomButton(
                text: isLoading ? 'Assigning...' : 'Assign Training',
                onPressed: _submitTraining,
                isLoading: isLoading,
                icon: Icons.send_rounded,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
// ============================================================================
// 3. UI HELPER COMPONENTS (Inputs, Chips, Titles)
// ============================================================================

class SectionTitle extends StatelessWidget {
  final String title;
  const SectionTitle({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 16,
          decoration: BoxDecoration(
            color: AppColors.primaryColor,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            color: AppColors.primaryColor,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }
}

class _CustomDatePicker extends StatelessWidget {
  final String label;
  final String hint;

  const _CustomDatePicker({required this.label, required this.hint});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label.isNotEmpty) ...[
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
        ],
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.event_note_outlined,
                color: Color(0xFF64748B),
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  hint,
                  style: TextStyle(
                    color: hint == 'Select Date'
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFF1E293B),
                    fontSize: 14,
                  ),
                ),
              ),
              const Icon(
                Icons.calendar_month_rounded,
                color: AppColors.primaryColor,
                size: 18,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SelectionTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _SelectionTab({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected
                  ? AppColors.primaryColor
                  : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected
                    ? AppColors.primaryColor
                    : const Color(0xFF64748B),
                letterSpacing: -0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
