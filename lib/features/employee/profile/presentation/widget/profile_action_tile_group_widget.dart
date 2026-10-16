import 'package:bhmh/core/utils/theme.dart';
import 'package:bhmh/features/employee/profile/presentation/widget/profile_detail_tile.dart';

import 'package:flutter/material.dart';

// ─────────────────────────────────────────────
// GROUP CONTAINER (web only)
// Wraps multiple web tiles with shared card border + dividers
// ─────────────────────────────────────────────

class ProfileActionTileGroup extends StatelessWidget {
  final List<({IconData icon, String label, VoidCallback onTap})> tiles;

  const ProfileActionTileGroup({super.key, required this.tiles});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withValues(alpha: 0.08), width: 0.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: List.generate(tiles.length * 2 - 1, (i) {
          // Even indices → tiles, odd indices → dividers
          if (i.isOdd) {
            return const Divider(
              height: 0,
              thickness: 0.5,
              color: Color(0x14000000),
            );
          }

          final tileIndex = i ~/ 2;
          final tile = tiles[tileIndex];

          return ProfileActionWebTile(
            leadingIcon: tile.icon,
            label: tile.label,
            onTap: tile.onTap,
            isFirst: tileIndex == 0,
            isLast: tileIndex == tiles.length - 1,
          );
        }),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// ADAPTIVE WRAPPER
// Auto-picks mobile or web based on screen width
// ─────────────────────────────────────────────

class AdaptiveProfileSection extends StatelessWidget {
  final String sectionLabel;
  final List<({IconData icon, String label, VoidCallback onTap})> tiles;

  const AdaptiveProfileSection({
    super.key,
    required this.sectionLabel,
    required this.tiles,
  });

  @override
  Widget build(BuildContext context) {
    final bool isWeb = context.screenWidth >= 600;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section label
        Padding(
          padding: const EdgeInsets.only(bottom: 10, left: 2),
          child: Text(
            sectionLabel.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.08 * 11,
              color: Colors.black38,
            ),
          ),
        ),

        if (isWeb)
          // Web: all tiles in one grouped card
          ProfileActionTileGroup(tiles: tiles)
        else
          // Mobile: individual floating tiles
          Column(
            children: tiles
                .map(
                  (t) => ProfileActionTile(
                    leadingIcon: t.icon,
                    label: t.label,
                    onTap: t.onTap,
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}
