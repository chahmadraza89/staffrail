import 'dart:async';
import 'package:flutter/material.dart';

class TrainingTimerWidget extends StatefulWidget {
  final DateTime? assignedAt;
  final String durationText;
  final TextStyle style;
  final bool isCompleted;

  const TrainingTimerWidget({
    super.key,
    this.assignedAt,
    required this.durationText,
    required this.style,
    this.isCompleted = false,
  });

  @override
  State<TrainingTimerWidget> createState() => _TrainingTimerWidgetState();
}

class _TrainingTimerWidgetState extends State<TrainingTimerWidget> {
  Timer? _timer;
  Duration? _totalDuration;
  String _displayString = '';

  @override
  void initState() {
    super.initState();
    _parseDuration();
    if (widget.isCompleted) {
       _displayString = widget.durationText;
    } else if (widget.assignedAt != null && _totalDuration != null) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateTime());
      _updateTime();
    } else {
      _displayString = widget.durationText;
    }
  }

  @override
  void didUpdateWidget(covariant TrainingTimerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isCompleted != oldWidget.isCompleted || widget.assignedAt != oldWidget.assignedAt) {
      _timer?.cancel();
      if (widget.isCompleted) {
         setState(() => _displayString = widget.durationText);
      } else if (widget.assignedAt != null && _totalDuration != null) {
        _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateTime());
        _updateTime();
      } else {
         setState(() => _displayString = widget.durationText);
      }
    }
  }

  void _parseDuration() {
    final text = widget.durationText.toLowerCase();
    if (text.contains('hour')) {
      final match = RegExp(r'(\d+)').firstMatch(text);
      if (match != null) {
        _totalDuration = Duration(hours: int.parse(match.group(1)!));
      }
    } else if (text.contains('min')) {
      final match = RegExp(r'(\d+)').firstMatch(text);
      if (match != null) {
        _totalDuration = Duration(minutes: int.parse(match.group(1)!));
      }
    }
  }

  void _updateTime() {
    if (!mounted) return;
    final now = DateTime.now();
    final endTime = widget.assignedAt!.add(_totalDuration!);
    if (now.isAfter(endTime)) {
      setState(() {
        _displayString = 'Time up';
        _timer?.cancel();
      });
      return;
    }
    final remaining = endTime.difference(now);
    final hours = remaining.inHours;
    final minutes = remaining.inMinutes.remainder(60);
    final seconds = remaining.inSeconds.remainder(60);
    
    setState(() {
      if (hours > 0) {
        _displayString = '${hours}h ${minutes}m remaining';
      } else {
        _displayString = '${minutes}m ${seconds}s remaining';
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _displayString,
      style: widget.style,
    );
  }
}
