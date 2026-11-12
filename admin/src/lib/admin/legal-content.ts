import { ORG_CONFIG } from "@/lib/config/organization"

/**
 * Legal/policy text registry — port of
 * lib/core/config/app_legal_content.dart.
 *
 * Keep this data VERBATIM with the Flutter source: the employee app renders
 * the same documents and the admin review panel must show what was signed.
 * `annual_training` interpolates the CURRENT year, exactly like Dart
 * (`DateTime.now().year` captured when the map initializes).
 */

const CURRENT_YEAR = new Date().getFullYear()

export const LEGAL_CONTENT: Readonly<Record<string, string>> = {
  // ── CATEGORY 1: Employment Acceptance ──
  onboarding_acknowledgment_form: `
Onboarding Acknowledgment

Purpose
This form explains the key terms for using the onboarding mobile application. Before starting the onboarding process, the employee must review and agree to the following terms and conditions.

Terms and Conditions
I will complete onboarding steps truthfully and accurately.
I will provide required information and upload documents as requested.
I understand that incomplete, inaccurate, or missing information may delay onboarding and may affect my eligibility to proceed.
By submitting a step, I am confirming the information I provided is correct to the best of my knowledge.
I understand that after submission, certain steps may be locked and not editable unless reopened by the Company.
Authorized Company representatives can view my onboarding progress and submitted information.
Submitted documents and forms may be reviewed for completeness and compliance.
I understand that my onboarding information will be collected and stored for employment and compliance purposes and will be handled according to applicable privacy requirements and Company policies.
Completing onboarding does not guarantee employment or continued employment. Employment terms are governed by applicable Company policies and agreements.
I understand the Company may initiate health screenings, criminal background screenings, and driving record screenings as required by Company policy, compliance requirements, and minimum standards, using the data I submit during onboarding.

Acknowledgement
By signing below, I confirm that I have read and understand these Terms and Conditions and agree to start the onboarding process.
`,

  // ── CATEGORY 2: HR Documentation ──
  confidentiality_statement: `
CONFIDENTIALITY STATEMENT

I understand the necessity for the confidentiality of individuals who are or were clients of ${ORG_CONFIG.name} pursuant of State and Federal Laws. I will adhere to the laws, which prohibit any discussion regarding those individuals and their care except with duly authorized representatives of ${ORG_CONFIG.name}.
`,

  corporate_confidentiality_statement: `
CONFIDENTIALITY OF CLIENT / THERAPIST / STAFF

Therapist/Staff shall be expected to keep all information regarding the individuals served in the ${ORG_CONFIG.name} programs confidential. "Keep Confidential" is defined as safeguarding the content of written and verbal information including video, audio and/or computer stored information from unauthorized disclosure without the specific informed consent of the individual, parent of a minor child, or legal guardian and consistent with the advocate's right of access, as required in the Developmental Disabilities Act.

The client will be treated with dignity and respect and as independent individuals with the right to training and treatment. Physical, verbal, sexual and/or psychological abuse or any behavior that is neglectful, abusive, or destructive to the dignity of the recipient is prohibited.

The phone numbers and addresses of any client is confidential. They are not to be given out without the expressed consent of the particular person.

I have read and understand the above statement:
`,

  // Backward-compatible alias for the renamed form
  confidentiality_of_client___therapist___staff: `
CONFIDENTIALITY OF CLIENT / THERAPIST / STAFF

Therapist/Staff shall be expected to keep all information regarding the individuals served in the ${ORG_CONFIG.name} programs confidential. "Keep Confidential" is defined as safeguarding the content of written and verbal information including video, audio and/or computer stored information from unauthorized disclosure without the specific informed consent of the individual, parent of a minor child, or legal guardian and consistent with the advocate's right of access, as required in the Developmental Disabilities Act.

The client will be treated with dignity and respect and as independent individuals with the right to training and treatment. Physical, verbal, sexual and/or psychological abuse or any behavior that is neglectful, abusive, or destructive to the dignity of the recipient is prohibited.

The phone numbers and addresses of any client is confidential. They are not to be given out without the expressed consent of the particular person.

I have read and understand the above statement:
`,

  transportation_acknowledgement_statement: `
ACKNOWLEDGEMENT OF TRANSPORTING CLIENTS

I understand that I may have to transport clients in my own vehicle. I understand that in order to transport clients I must maintain adequate liability insurance as prescribed by law. An up-to-date insurance card will be provided to the agency as evidence of liability insurance. I understand that ${ORG_CONFIG.name} may terminate my contract should the findings of my driving record or lack of liability insurance interfere with the ability to transport clients. Questions regarding the Requirements for Transporting Clients may be directed to the Human Resources Director.

I have read and understand ${ORG_CONFIG.name} to Change Requirements for Transporting Clients.

I acknowledge that I have received a copy of the requirements for transporting clients.
`,

  // Backward-compatible alias for the renamed form
  acknowledgement_of_transporting_clients: `
ACKNOWLEDGEMENT OF TRANSPORTING CLIENTS

I understand that I may have to transport clients in my own vehicle. I understand that in order to transport clients I must maintain adequate liability insurance as prescribed by law. An up-to-date insurance card will be provided to the agency as evidence of liability insurance. I understand that ${ORG_CONFIG.name} may terminate my contract should the findings of my driving record or lack of liability insurance interfere with the ability to transport clients. Questions regarding the Requirements for Transporting Clients may be directed to the Human Resources Director.

I have read and understand ${ORG_CONFIG.name} to Change Requirements for Transporting Clients.

I acknowledge that I have received a copy of the requirements for transporting clients.
`,

  corporate_compliance_acknowledge: `
CORPORATE COMPLIANCE

${ORG_CONFIG.name} provide services that fully comply with all federal, state, local regulations and applicable laws to adhere to explicit ethical standards. ${ORG_CONFIG.shortName} corporate compliance goals are to maintain and enhance the quality of services, demonstrate a sincere effort to comply with all applicable laws, revise and develop new policies and procedures to enhance compliance, enhance communications with governmental entities to ensure compliance, empower all involved parties to prevent, detect, respond to, report, and resolve conduct that does conform to applicable laws and regulations, and the organization's ethical standards/code of conduct.

I acknowledge that I have received and reviewed company ${ORG_CONFIG.name} "Corporate Compliance Policy and Procedure" and possess full understanding.
`,

  code_of_conduct_ethics: `
WELCOME

Welcome to ${ORG_CONFIG.name}. I would like to wish you much success here. I hope that your experience here will be challenging, enjoyable and rewarding.

Sincerely,
${ORG_CONFIG.directorName}
Chief Executive Officer

---

CODE OF ETHICS/CONDUCT

1. To avoid real or perceived conflicts of interest
2. To be honest and realistic when documenting services provided
3. To reject bribery in all its forms
4. To improve the understanding of behavioral health services
5. To treat all staff and clients fairly and not engage in any acts of discrimination
6. To provide safe environment for clients and staff
7. Abide by all applicable federal and state laws, including HIPPA
8. To abide by this Code of Ethics

Acknowledgment
I acknowledge that I have received, read, and understood the Code of Ethics/Conduct document.

I agree to comply with all applicable laws, regulations, and agency policies, and to conduct myself in a professional and ethical manner consistent with the mission and standards of ${ORG_CONFIG.name}.

I understand that failure to comply with these standards may result in disciplinary or corrective action, up to and including termination of employment or contractual agreement.
`,

  "acknowledge_of_eoc_health_&_safety_policy": `
**Acknowledgment of Environment of Care (EOC), Health & Safety Policy**

**Policy Summary**
${ORG_CONFIG.name} values the health and safety of the clients we serve, staff members, employees, and visitors, and maintains a comprehensive safety program to promote a safe environment within our program sites.
It is the policy of ${ORG_CONFIG.shortName} to maintain an environment that conforms to all legal, regulatory, and accreditation health and safety requirements, and to designate persons responsible for the planning, implementation, and oversight of a comprehensive organization-wide health and safety program. ${ORG_CONFIG.name} health and safety procedures will focus on two major areas: the identification, monitoring, evaluation, reduction, or elimination of health and safety risks; and planning and preparation to maximize the health and well-being of individuals in the event of disasters or emergency situations.
To assist in providing a safe and healthful work environment for contractors, employees, clients, and visitors, ${ORG_CONFIG.name} has established a workplace safety program. This program is a top priority for ${ORG_CONFIG.name}, and its success depends on the alertness and personal commitment of all team members.

**Employee and Contractor Involvement:**
Some of the best safety improvement ideas come from employees and contractors. Those with ideas, concerns, or suggestions for improving workplace safety are encouraged to raise them with their supervisor, manager, or agency staff. Reports about safety issues may be made anonymously and without fear of reprisal.
Each contractor is expected to obey safety rules and exercise caution in all work activities. Contractors must immediately report any unsafe condition to the agency. Contractors who violate safety standards, cause hazardous or dangerous situations, or fail to report or remedy such conditions may be subject to contract termination.

**Additional Safety Policies**

**Smoking:**
In keeping with ${ORG_CONFIG.shortName}'s intent to provide a safe and healthful work environment, smoking in the workplace is prohibited. This policy applies equally to all contractors, employees, clients, and visitors.

**Workplace Violence Prevention:**
${ORG_CONFIG.name} is committed to preventing workplace violence and maintaining a safe work environment. All individuals are expected to treat one another with respect and refrain from fighting, "horseplay," or other dangerous conduct.
Firearms, weapons, or other hazardous substances are prohibited on the premises without authorization.
All threats or acts of violence - direct or indirect - must be reported immediately to a supervisor or management. Reports will be handled confidentially, and anyone found responsible for such behavior will be subject to disciplinary action, up to and including termination of employment or contract.

**Drug and Alcohol Use:**
${ORG_CONFIG.name} is a drug-free workplace. Contractors must report to work in appropriate mental and physical condition to perform duties safely and effectively.
While on company premises or conducting business-related activities, no contractor may use, possess, distribute, sell, or be under the influence of alcohol or illegal drugs.
Violations may result in termination and legal consequences. Contractors working on government contracts must notify the agency of any workplace-related drug convictions within five days.

**Sexual and Other Unlawful Harassment:**
${ORG_CONFIG.shortName} maintains a zero-tolerance policy against discrimination or harassment based on sex, race, color, national origin, age, religion, disability, sexual orientation, or any other protected status.
All complaints will be promptly and discreetly investigated, and retaliation is prohibited. Anyone found engaging in unlawful harassment will be subject to disciplinary action, up to and including termination.

**Personal Appearance:**
Contractors are expected to maintain a clean, neat, and professional appearance that aligns with the image ${ORG_CONFIG.shortName} presents to the community. Tattoos must be covered, and body piercings or strong fragrances should be avoided. Shoes must ensure safety and secure footing. The CEO determines the appropriate dress code for specific roles.

**Problem Resolution:**
${ORG_CONFIG.shortName} encourages open communication. Contractors may report complaints or suggestions regarding workplace conditions, conduct, or policies without fear of retaliation.
If a contractor disagrees with a policy or action, they may follow the internal problem resolution steps outlined in the Contractor Handbook, escalating issues up to arbitration if necessary.

**Acknowledgment**
I acknowledge that I have received and reviewed the EOC, Health & Safety Policy for ${ORG_CONFIG.name}. I understand that it is my responsibility to comply with all provisions and report any safety or conduct concerns immediately to my supervisor or Human Resources.
`,

  grievance_procedure: `
Grievance Procedure

Contractors who have concerns they wish to be reviewed under this policy should contact Program Director as outlined below. If their concerns are not met with that Program Director they may contact the Chief Operation Officer (COO) in writing.

In writing:

1. The contractor explains the nature of the problems or situation to the supervisor along with any suggested solution. The supervisor has 7 calendar days to provide an answer to the contractor.

2. If the contractor is not satisfied with the Program Director response, the next review takes place at the next higher management level. Such review must be requested in writing to the COO. The result of this review will be conducted within 14 calendar days.

If the contractor is still not satisfied after following step 2, the final step is a review by an arbitrator from a recognized arbitration service. ${ORG_CONFIG.name} will share the cost for this service equally with the contractor.

The contractor may bring a representative, if desired, when the arbitrator is reviewing the complaint. Any costs associated with bringing such a representative are to be paid by the contractor.

GRIEVANCE PROCEDURE ACKNOWLEDGEMENT

By signing below, the contractor agrees that he/she has read the Grievance Procedure and agrees to the terms therein.
`,

  infection_control_refresher: `
Infection Control Refresher

Purpose
To provide a comprehensive review of infection control practices aimed at preventing the spread of communicable diseases within the healthcare setting.

Core Standards
Standard Precautions: Hand hygiene, use of personal protective equipment (PPE), and respiratory hygiene/cough etiquette.
Environmental Cleaning: Regular disinfection of high-touch surfaces and proper waste management.
Safe Injection Practices: Adherence to aseptic techniques to prevent infection during clinical procedures.
Exposure Protocol: Procedures for reporting and managing potential exposures to bloodborne pathogens or infectious agents.

Acknowledgment
By signing below, I acknowledge that I have completed the Infection Control Refresher training and understand the protocols required to maintain a safe and sterile environment for staff and clients.
`,

  trauma_informed_care_practices: `
Trauma-Informed Care Practices

Purpose
To ensure all staff members are equipped with the knowledge and skills to provide care that acknowledges the widespread impact of trauma and integrates this understanding into all aspects of service delivery.

Core Principles
Safety: Ensuring physical and emotional safety for both clients and staff.
Trustworthiness and Transparency: Building and maintaining trust through clear communication and consistency.
Peer Support: Recognizing the value of shared experiences in the healing process.
Collaboration and Mutuality: Partnering with clients in their care planning and decision-making.
Empowerment, Voice, and Choice: Validating client strengths and providing meaningful opportunities for choice.
Cultural, Historical, and Gender Issues: Addressing and moving past stereotypes and biases.

Acknowledgment
By signing below, I confirm my commitment to applying Trauma-Informed Care principles in my daily interactions with clients and colleagues, fostering an environment of healing and respect.
`,

  types_of_services: `
Types of Services

Purpose
To familiarize staff with the complete spectrum of mental health and supportive services provided by ${ORG_CONFIG.name}.

Acknowledgment
By signing below, I acknowledge that I have received training on the various Types of Services offered by the agency and understand the target demographics and eligibility criteria for each service line.
`,

  person_centered_planning: `
Person Centered Planning

Purpose
To define the process of developing treatment plans that prioritize the client's individual needs, preferences, and goals.

Acknowledgment
By signing below, I acknowledge my understanding of the Person Centered Planning approach and commit to ensuring that all client treatment plans are collaborative, individualized, and driven by the client's self-identified objectives.
`,

  documentation_and_timelines: `
Documentation and Timelines

Purpose
To establish the standards for clinical documentation and the required timeframes for submission.

Acknowledgment
By signing below, I acknowledge my understanding of the Documentation and Timelines policies and agree to maintain accurate, comprehensive, and timely records in accordance with state, federal, and agency guidelines.
`,

  client_rights_responsibilities: `
Client Rights & Responsibilities

Purpose
To outline the fundamental rights of individuals receiving services and their corresponding responsibilities.

Acknowledgment
By signing below, I confirm that I understand the Client Rights & Responsibilities policy and commit to protecting client autonomy, privacy, and dignity at all times while enforcing necessary clinical boundaries.
`,

  crisis_intervention_steps: `
Crisis Intervention Steps

Purpose
To provide clear, actionable procedures for responding to psychiatric or medical emergencies involving clients.

Acknowledgment
By signing below, I acknowledge that I have been trained on the Crisis Intervention Steps, understand the escalation protocols, and know how to access emergency resources effectively to ensure client safety.
`,

  mandatory_reporting: `
Mandatory Reporting

Purpose
To detail the legal obligations of healthcare professionals regarding the reporting of suspected abuse, neglect, or exploitation.

Acknowledgment
By signing below, I certify that I understand my obligations under Mandatory Reporting laws and the specific internal and external procedures required to report any suspected incidents.
`,

  acknowledgement_of_vehicle_documentation: `
Acknowledgement of Vehicle Documentation

Employee/Contractor Name: ______________
Position/Title: ______________
Date: ______________

Policy Summary

To ensure the safety of all clients, employees, and contractors, ${ORG_CONFIG.name} requires all individuals who utilize personal or company vehicles for work-related activities to maintain current, valid, and verifiable documentation related to vehicle operation and insurance.

This policy establishes expectations regarding transportation safety and compliance in accordance with applicable state health and human services regulations and agency procedures.

Vehicle Documentation Requirements

All contractors who may transport clients or perform job duties involving driving must:

- Maintain a current and valid Driver's License.
- Maintain vehicle insurance meeting or exceeding state minimum coverage limits.
- Submit copies of both documents to ${ORG_CONFIG.name} prior to any transportation activity.
- Update and provide new documentation upon renewal or any change in coverage or status.
- Immediately notify the agency of any suspension, expiration, or lapse in insurance coverage.

Transportation Policy Standards

- Contractors are not permitted to transport clients without valid documentation.
- Contractors must comply with all state traffic laws, wear seat belts, and ensure passengers do the same.
- Vehicles must be in safe working condition, free of hazards, and inspected regularly.
- The use of mobile devices while driving is prohibited unless hands-free and compliant with local laws.
- Smoking, vaping, or consuming any intoxicating substance while operating a vehicle for agency business is strictly prohibited.
- In the event of an accident or incident, contractors must notify the agency immediately and submit a written report within 24 hours.

Non-Compliance

Failure to comply with this policy may result in:

- Suspension or loss of transportation privileges
- Contract suspension or termination
- Possible legal or financial responsibility for damages resulting from non-compliance

Acknowledgment

I acknowledge that I have received, read, and understand the Vehicle Documentation Policy of ${ORG_CONFIG.name}.

I agree to provide and maintain current vehicle documentation as required and to comply with all transportation and safety regulations while performing duties for the agency.
`,

  authorization_for_emergency_medical_care: `
Authorization for Emergency Medical Care

I, ____________ authorize ${ORG_CONFIG.name} to seek and obtain emergency medical care on my behalf in the event of an emergency situation rendering me unable to obtain such care for myself.
`,

  acknowledge_of_company_property: `
Acknowledgment of Company Property

Policy Summary

To ensure accountability, security, and proper maintenance of organizational resources, ${ORG_CONFIG.name} issues company property to employees and contractors as needed for the performance of their duties.

This property is considered the sole property of ${ORG_CONFIG.name} and must be used responsibly, only for legitimate business purposes, and in accordance with agency policy.

Company Property Covered

Company property may include, but is not limited to:

- Identification badges and access cards
- Office keys or key fobs
- Laptops, tablets, or mobile phones
- Agency documents, handbooks, or training materials
- Uniforms, equipment, or medical/safety supplies
- Software, electronic data, and confidential materials

All items remain the property of ${ORG_CONFIG.name} and must be returned in good working condition upon request, termination, or contract completion.

Usage and Responsibility

By accepting company property, I acknowledge and agree to the following conditions:

- Property is issued for professional use only and must not be used for personal or non-agency activities.
- I am responsible for the care, maintenance, and proper use of all assigned equipment or materials.
- Any loss, theft, or damage must be reported immediately to my supervisor or the administrative office.
- I understand that misuse, negligence, or unauthorized disclosure of information may result in disciplinary action, including financial liability or contract termination.
- Upon termination or at the agency's request, I will return all property in my possession to ${ORG_CONFIG.name}.

Acknowledgment

I acknowledge that I have received company property as listed below (if applicable) and agree to the terms of this policy.

I understand that failure to return company property or to comply with this policy may result in financial responsibility for replacement and/or legal action.
`,

  // ── CATEGORY 4: Orientation ──
  initial_orientation: `
General Orientation Acknowledgment Form

Effective Date: 01/01/2026
Review Cycle: Annual

Orientation Topics Covered

Mission, Vision, and Values of ${ORG_CONFIG.name}
Code of Conduct and Corporate Compliance
Confidentiality and HIPAA Policy
Cultural Competency and Diversity Awareness
Workplace Safety and Emergency Procedures
Client Rights and Responsibilities
Abuse, Neglect, and Exploitation Reporting
Infection Control and Universal Precautions
Incident and Grievance Reporting Procedures

Acknowledgment

I acknowledge that I have completed the general orientation for ${ORG_CONFIG.name} and understand all topics presented. I have received copies of related policies and procedures.
`,

  initial_training: `
I certify that I have completed all required initial training sessions and understand the agency policies, procedures, and standards required to perform my duties safely and effectively.
`,

  annual_training: `
ANNUAL TRAINING RECORD FORM
Effective Date: ${CURRENT_YEAR}     
Review Cycle: Annual

---
ACKNOWLEDGMENT

I certify that I have completed all required annual training sessions and understand the agency policies, procedures, and standards required to perform my duties safely and effectively.
`,

  job_description_acknowledgment: `
JOB DESCRIPTION ACKNOWLEDGMENT

I acknowledge that I have received and reviewed my official Job Description. I understand the duties, responsibilities, and performance expectations of my role. I attest that I am capable of performing the essential functions of this position with or without reasonable accommodation.
`,

  // ── DRIVER'S VERIFICATION ──
  drivers_verification: `
DRIVER'S VERIFICATION

1. Due to non-presentation of valid Driver's License and/or required liability vehicle insurance, I will not transport any recipients of this agency at any time, for any reason.
2. I have submitted a current Driver's License and liability vehicle insurance.
3. I will provide ${ORG_CONFIG.name} Services with current License and Insurance as updated and upon request.

Employee Vehicle Inspection Form
`,

  cultural_competency: `
CULTURAL COMPETENCY

Policy: It is the policy of ${ORG_CONFIG.name} to promote and ensure the cultural competency, and to provide a good environment free of discrimination by race, sex, creed, color, religious preference or acts.

Cultural Competency Overview

Culture is defined by the Webster's Dictionary as "a particular form of civilization, especially the beliefs, customs, arts, and institutions of a society at a given time". Culture includes folkways, mores, customs, formal and informal helping networks, dialects, traditions, and rituals. Culture may also include thoughts, communications, actions, customs, beliefs, values, and institutions of racial, ethnic, religious, age and social groups.

Competency is the exhibited ability to put personal awareness, knowledge, skill, or expertise into action.

Cultural Competency is therefore the exhibited ability to incorporate one's awareness, knowledge, skills, and expertise regarding an individual's culture into the interactions one has with individuals and groups of differing cultures.
`,

  tax_documents_i_9: `
FORM I-9: EMPLOYMENT ELIGIBILITY VERIFICATION (SECTION 1)

I am aware that federal law provides for imprisonment and/or fines for false statements, or the use of false documents, in connection with the completion of this form.

Section 1: Employee Information and Attestation
I attest, under penalty of perjury, that I have used Section 1 to report that I am (check one of the following):
1. A citizen of the United States
2. A noncitizen national of the United States (See instructions)
3. A lawful permanent resident (Enter Alien Registration Number/USCIS Number)
4. A noncitizen (other than 2. or 3. above) authorized to work (Enter Expiration Date, if any, and Alien Registration Number/USCIS Number OR Form I-94 Admission Number OR Foreign Passport Number and Country of Issuance)

I further attest, under penalty of perjury, that the documents I have provided for the Form I-9 are genuine and relate to me. I understand that my employment is contingent upon the verification of my identity and employment authorization.
`,

  tax_documents_w_4: `
FORM W-4 ACKNOWLEDGEMENT

I certify that the withholding information provided on my W-4 form is correct to the best of my knowledge. I understand that I am responsible for updating this information if my personal or financial situation changes.
`,

  tax_documents_w_1: `
FORM W-1 ACKNOWLEDGEMENT

I certify that the withholding information provided on my W-1 form is correct to the best of my knowledge. I understand that I am responsible for updating this information if my personal or financial situation changes.
`,

  tax_documents_w_9: `
FORM W-9: REQUEST FOR TAXPAYER IDENTIFICATION NUMBER & CERTIFICATION

Purpose of Form
An individual or entity (Form W-9 requester) who is required to file an information return with the IRS must obtain your correct taxpayer identification number (TIN) which may be your social security number (SSN), individual taxpayer identification number (ITIN), adoption taxpayer identification number (ATIN), or employer identification number (EIN), to report on an information return the amount paid to you, or other amount reportable on an information return.

Certification
Under penalties of perjury, I certify that:
1. Correct TIN: The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and
2. Backup Withholding: I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and
3. U.S. Person Status: I am a U.S. citizen or other U.S. person (including U.S. resident aliens); and
4. FATCA Reporting: The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.

Certification Instructions
You must cross out item 2 above if you have been notified by the IRS that you are currently subject to backup withholding because you have failed to report all interest and dividends on your tax return.
`,

  background_checks_clearance: `
BACKGROUND CHECK AUTHORIZATION

I authorize ${ORG_CONFIG.shortName} to conduct a comprehensive background check, including criminal history, employment verification, and educational background. I understand that my continued employment is contingent upon the successful completion of this clearance.
`,

  alleged_abuse_neglect: `
Alleged or Suspected Abuse and Neglect Reporting

It is the policy of ${ORG_CONFIG.name} to report all instances of suspected abuse and neglect to the appropriate protective services department in accordance with applicable state statute. The statute provides immunity from civil or criminal liability for persons making reports of abuse in good faith.

Abuse means any willful and unjustified infliction of pain, injury or mental anguish upon a recipient by a person other than another recipient.

I acknowledge that I have received a copy of the "Alleged or Suspected Abuse and Neglect Reporting" policy and have been trained on agency policy and procedures.
`,

  attestation_form: `
Attestation Form

Prior to accepting a position with ${ORG_CONFIG.name}, I hereby attest that I am capable of performing essential functions of job with or without accommodation.

I hereby voluntarily consent to provide a urine specimen (or blood specimen as required for alcohol testing only) at a collection facility designated by ${ORG_CONFIG.name}, and further consent to have the specimen tested at a laboratory selected by ${ORG_CONFIG.name}. I hereby certify that I do not use illegal drugs.

I hereby attest that I possess a current valid professional license/and or have the credentials required to perform the job duties. I will provide a copy of my current license/certification to ${ORG_CONFIG.name}.

I hereby attest that I am not under any limitation of privileges or disciplinary actions associated with my current licensing board.

I hereby attest that I have reported to ${ORG_CONFIG.name}. A current or past adverse actions that may present risk management concerns to include Medicare/Medicaid exclusion, or sanctions; ethical violations, criminal convictions, etc...
`,

  // ── COMPETENCY EVALUATIONS ──
  cssp_competency: `
CSSP Competency Evaluation Form

Competency Rating Scale
5 – Excellent | 4 – Above Average | 3 – Competent | 2 – Needs Improvement | 1 – Unsatisfactory

Core Competency Evaluation
The following evaluation assesses the employee's performance across key competency areas essential for service delivery and clinical compliance.

Employee Acknowledgment
I have reviewed my competency evaluation and discussed it with my supervisor.
`,
}

const LEGAL_CONTENT_ALIASES: Record<string, string> = {
  "driver's_verification": "drivers_verification",
  "client_rights_&_responsibilities": "client_rights_responsibilities",
  "bhmh_initial_orientation": "initial_orientation",
}

export function getLegalContent(taskId: string): string | null {
  const canonicalId = LEGAL_CONTENT_ALIASES[taskId] ?? taskId
  return LEGAL_CONTENT[canonicalId] ?? null
}
