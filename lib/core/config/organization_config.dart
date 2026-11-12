/// Organization metadata and demo configuration for the database-free
/// StaffRail runtime. Override these constants for your own organization.
class OrganizationConfig {
  OrganizationConfig._();

  static const String appName = 'StaffRail';
  static const String shortName = 'StaffRail';
  static const String legalName = 'Example Health Clinic, LLC';
  static const String addressLine1 = '100 Main Street, Suite 200';
  static const String addressLine2 = 'Anytown, USA 00000';
  static const String supportEmail = 'support@staffrail.local';
  static const String supportPhone = '+1 (800) 555-0199';
  static const String complianceOfficer = 'Clinic Director';

  static const String demoAdminEmail = 'admin@staffrail.local';
  static const String demoEmployeeEmail = 'employee@staffrail.local';
  static const String demoPassword = 'DemoPassword123!';
}
