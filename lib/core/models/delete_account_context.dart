class DeleteAccountContext {
  final String accountName;
  final String adminEmail;
  final List<String> consequences;
  final String confirmationWord;

  const DeleteAccountContext({
    required this.accountName,
    required this.adminEmail,
    required this.consequences,
    required this.confirmationWord,
  });
}
