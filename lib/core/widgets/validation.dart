class ValidateFields {
  static String? validateFirstName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return "First name is required";
    } else if (value.length < 2) {
      return "Enter at least 2 characters";
    }
    return null;
  }

  static String? validateLastName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return "Last name is required";
    } else if (value.length < 2) {
      return "Enter at least 2 characters";
    }
    return null;
  }

  static String? validateName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return "Name is required";
    } else if (value.length < 2) {
      return "Enter at least 2 characters";
    }
    return null;
  }

  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return "Email is required";
    } else if (!RegExp(r"^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$").hasMatch(value)) {
      return "Enter a valid email";
    }
    return null;
  }

  static String? validatePassword(String? value, {int minLength = 8}) {
    if (value == null || value.isEmpty) {
      return "Password is required";
    } else if (value.length < minLength) {
      return "Password must be at least $minLength characters";
    } else if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return "Password must contain at least one uppercase letter";
    } else if (!RegExp(r'[a-z]').hasMatch(value)) {
      return "Password must contain at least one lowercase letter";
    } else if (!RegExp(r'[0-9]').hasMatch(value)) {
      return "Password must contain at least one number";
    } else if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value)) {
      return "Password must contain at least one special character";
    }
    return null;
  }

  /// Returns a map of rule IDs to their validity for the given password
  static Map<String, bool> getPasswordRules(String value, {int minLength = 8}) {
    return {
      'minLength': value.length >= minLength,
      'uppercase': RegExp(r'[A-Z]').hasMatch(value),
      'lowercase': RegExp(r'[a-z]').hasMatch(value),
      'number': RegExp(r'[0-9]').hasMatch(value),
      'special': RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value),
    };
  }

  /// Validate password for login/change password (less strict - just check not empty)
  static String? validateLoginPassword(String? value) {
    if (value == null || value.isEmpty) {
      return "Password is required";
    } else if (value.length < 6) {
      return "Password must be at least 6 characters";
    }
    return null;
  }

  static String? validateMainClub(String? value) {
    if (value == null || value.isEmpty) {
      return "Please select Your main club";
    }
    return null;
  }

  /// Validate confirm password matches original password
  static String? validateConfirmPassword(String? value, String password) {
    if (value == null || value.isEmpty) {
      return "Please confirm your password";
    } else if (value != password) {
      return "Passwords do not match";
    }
    return null;
  }
}
