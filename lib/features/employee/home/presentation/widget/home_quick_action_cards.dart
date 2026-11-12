// --- INDIVIDUAL CARD WIDGET ---
import 'package:bhmh/features/employee/home/presentation/widget/action_card_data.dart';
import 'package:flutter/material.dart';

class ModernActionCard extends StatefulWidget {
  final ActionCardData data;
  final bool isMobile;

  const ModernActionCard({
    super.key,
    required this.data,
    required this.isMobile,
  });

  @override
  State<ModernActionCard> createState() => _ModernActionCardState();
}

class _ModernActionCardState extends State<ModernActionCard> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    final data = widget.data;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        transform: Matrix4.translationValues(
          0,
          _isHovering && !widget.isMobile ? -4 : 0,
          0,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: _isHovering ? 0.08 : 0.03),
              blurRadius: _isHovering ? 20 : 10,
              offset: Offset(0, _isHovering ? 8 : 4),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: data.onTap,
            borderRadius: BorderRadius.circular(20),
            splashColor: data.baseColor.withValues(alpha: 0.1),
            highlightColor: Colors.transparent,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: widget.isMobile ? _buildMobileLayout() : _buildWebLayout(),
            ),
          ),
        ),
      ),
    );
  }

  // --- MOBILE LAYOUT: Vertical Stack ---
  Widget _buildMobileLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildIcon(),
        const Spacer(),
        _buildTitle(),
        const SizedBox(height: 4),
        _buildSubtitle(),
        if (widget.data.progress != null) ...[
          const SizedBox(height: 12),
          _buildProgressBar(),
        ],
      ],
    );
  }

  // --- WEB LAYOUT: Horizontal Header, Sleek Profile ---
  Widget _buildWebLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _buildIcon(),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildTitle(),
                  const SizedBox(height: 2),
                  _buildSubtitle(),
                ],
              ),
            ),
          ],
        ),
        const Spacer(),
        if (widget.data.progress != null) _buildProgressBar(),
      ],
    );
  }

  // --- REUSABLE CARD COMPONENTS ---
  Widget _buildIcon() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: widget.data.baseColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(widget.data.icon, color: widget.data.baseColor, size: 24),
    );
  }

  Widget _buildTitle() {
    return Text(
      widget.data.title,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: Color(0xFF1E293B), // Slate-800
        letterSpacing: -0.3,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildSubtitle() {
    return Text(
      widget.data.subtitle,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: Color(0xFF64748B), // Slate-500
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }

  Widget _buildProgressBar() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Progress',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
            Text(
              '${(widget.data.progress! * 100).toInt()}%',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0.0, end: widget.data.progress!),
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeOutCubic,
            builder: (context, value, _) {
              return LinearProgressIndicator(
                value: value,
                minHeight: 5,
                backgroundColor: const Color(0xFFF1F5F9),
                valueColor: AlwaysStoppedAnimation<Color>(
                  widget.data.baseColor,
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
