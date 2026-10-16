class PasswordRequirements {
  final int minLength;
  final bool requireUppercase;
  final bool requireLowercase;
  final bool requireSpecialChar;
  final bool requireNumber;

  const PasswordRequirements({
    this.minLength = 12,
    this.requireUppercase = true,
    this.requireLowercase = true,
    this.requireSpecialChar = true,
    this.requireNumber = true,
  });
}
