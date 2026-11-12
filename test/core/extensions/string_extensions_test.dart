import 'package:bhmh/core/extensions/string_extensions.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('StringExtension.getCleanFileName', () {
    test('strips the legacy timestamp prefix', () {
      const url =
          'https://storage.test/o/users%2Femp%2Ftask%2F1779348558389_i-9.pdf?alt=media';

      expect(url.getCleanFileName(), 'i-9.pdf');
    });

    test('strips the timestamp and per-attempt UUID used by web uploads', () {
      const url =
          'https://storage.test/o/users%2Femp%2Fonboarding%2Ftask%2F'
          '1779348558389_123e4567-e89b-12d3-a456-426614174000_resume.pdf?alt=media';

      expect(url.getCleanFileName(), 'resume.pdf');
    });

    test('keeps names that do not use the timestamp convention', () {
      const url = 'https://storage.test/o/users%2Femp%2Ftask%2Fresume.pdf';

      expect(url.getCleanFileName(), 'resume.pdf');
    });
  });
}
