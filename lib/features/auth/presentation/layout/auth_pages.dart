import 'package:bhmh/features/auth/presentation/mobile/verify_email_mobile.dart';
import 'package:bhmh/features/auth/presentation/web/forget_password_web.dart';
import 'package:bhmh/features/auth/presentation/mobile/forgot_password_mob.dart';
import 'package:bhmh/core/shared/layout_decider.dart';
import 'package:bhmh/features/auth/presentation/web/verify_email_web.dart';
import 'package:flutter/material.dart';

import 'package:bhmh/features/auth/presentation/web/Signin_web.dart';
import 'package:bhmh/features/auth/presentation/mobile/signin_mob.dart';

import 'package:bhmh/features/auth/presentation/web/Signup_web.dart';
import 'package:bhmh/features/auth/presentation/mobile/signup_mob.dart';

// sign page

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (context) => SignInScreenMob(),

      tablet: (context) => SignInWeb(),
      web: (context) => SignInWeb(),
    );
  }
}

// sign up page

class SigUpPage extends StatelessWidget {
  const SigUpPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (context) => SignUpScreenMob(),
      tablet: (context) => SignUpWeb(),
      web: (context) => SignUpWeb(),
    );
  }
}

// forget password page

class ForgetPasswordPage extends StatelessWidget {
  const ForgetPasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (context) => ForgotPasswordScreenMob(),
      tablet: (context) => ForgotPasswordWeb(),
      web: (context) => ForgotPasswordWeb(),
    );
  }
}

class VerifyEmailPage extends StatelessWidget {
  const VerifyEmailPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobile: (context) => VerifyMobileEmail(),
      tablet: (context) => VerifyEmailWeb(),
      web: (context) => VerifyEmailWeb(),
    );
  }
}
