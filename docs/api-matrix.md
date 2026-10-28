# ماتریس قرارداد اجرایی

Snapshot: 2026-10-27، سرور http://94.184.32.84:8090. تولیدشده از OpenAPI؛ وضعیت پوشش رابط در delivery.md ثبت می‌شود.

تمام صفحات: loading / empty / error / forbidden / offline / rate limit / session expired. mutationها: conflict / policy rejection، حفظ فرم و refetch صریح. نسخه فقط طبق DTO و به صورت opaque ارسال می‌شود.

| Context | عملیات | Request DTO | Response | Query / pagination | دسترسی |
|---|---|---|---|---|---|
| سازمان / Manager | `POST /api/v1/academic/periods` | CreateAcademicPeriodCommand | AcademicPeriodResult | — | نشست و Context معتبر؛ کنترل Backend |
| پلتفرم | `GET /api/admin/v1/audit-logs` | بدون بدنه | AdminAuditLogPage | actorUserId, action, targetType, targetId, result, fromUtc, toUtc, page, pageSize, sortBy, sortDirection | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| حساب | `POST /api/v1/auth/otp/challenges` | RequestOtpCommand | RequestOtpResult | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `POST /api/v1/auth/otp/verify` | VerifyOtpCommand | VerifyOtpResult | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `POST /api/v1/auth/refresh` | RefreshSessionCommand | RefreshSessionResult | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `GET /api/v1/auth/sessions` | بدون بدنه | array | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `DELETE /api/v1/auth/sessions/{sessionId}` | بدون بدنه | بدون JSON / باینری | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `POST /api/v1/auth/sessions/revoke-others` | بدون بدنه | بدون JSON / باینری | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `POST /api/v1/auth/logout` | بدون بدنه | بدون JSON / باینری | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/classes` | CreateClassCommand | ClassResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/academic/classes` | بدون بدنه | array | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/classes/{classId}/enrollments` | EnrollLearnerCommand | EnrollmentResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/classes/{classId}/enrollments/{enrollmentId}/end` | EndEnrollmentCommand | EnrollmentResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/classes/{classId}/teachers` | AssignTeacherCommand | TeacherAssignmentResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/classes/{classId}/teachers/{teacherAssignmentId}/end` | بدون بدنه | TeacherAssignmentResult | — | نشست و Context معتبر؛ کنترل Backend |
| پلتفرم | `GET /api/admin/v1/users/{userId}/communication-age` | بدون بدنه | CommunicationAgeResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/users/{userId}/communication-age/verifications` | VerifyCommunicationAgeCommand | CommunicationAgeResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| سازمان / Manager | `GET /api/v1/organization/people/{personId}/communication-age` | بدون بدنه | CommunicationAgeResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/people/{personId}/communication-age/verify` | VerifyCommunicationAgeCommand | CommunicationAgeResult | — | نشست و Context معتبر؛ کنترل Backend |
| پلتفرم | `POST /api/admin/v1/users/{userId}/communication-age/resolve` | VerifyCommunicationAgeCommand | CommunicationAgeResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| سازمان / Manager | `POST /api/v1/academic/courses` | CreateCourseCommand | CourseResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/dashboards/manager` | بدون بدنه | ManagerDashboardDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/notifications/devices/web-push/configuration` | بدون بدنه | WebPushClientConfiguration | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/notifications/devices` | بدون بدنه | PushDevicePageResult | page, pageSize, includeRevoked | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/notifications/devices` | RegisterPushDeviceCommand | PushDeviceRegistrationResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/notifications/devices/web-push` | RegisterWebPushCommand | PushDeviceRegistrationResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `DELETE /api/v1/notifications/devices/{registrationId}` | بدون بدنه | بدون JSON / باینری | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/notifications` | بدون بدنه | NotificationPage | Page, PageSize, UnreadOnly, Category, OrganizationId | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/notifications/unread-count` | بدون بدنه | NotificationUnreadCount | organizationId | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/notifications/{notificationId}/read` | بدون بدنه | NotificationItem | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/people` | CreateOrganizationPersonCommand | OrganizationPersonDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/organization/people` | بدون بدنه | OrganizationPeoplePage | search, page, pageSize | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/organization/people/{id}` | بدون بدنه | OrganizationPersonDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `PATCH /api/v1/organization/people/{id}` | UpdateOrganizationPersonNamesCommand | OrganizationPersonDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/people/{id}/end` | OnboardingStateCommand | OrganizationPersonDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/people/{id}/invitations` | CreatePersonLinkInvitationCommand | PersonLinkInvitationDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/people/{id}/invitations/{invitationId}/revoke` | OnboardingStateCommand | PersonLinkInvitationDto | — | نشست و Context معتبر؛ کنترل Backend |
| پلتفرم | `GET /api/admin/v1/commerce/plans` | بدون بدنه | PlatformPlanPage | search, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/commerce/plans` | CreatePlatformPlanCommand | PlatformPlanDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/commerce/plans/{planId}` | بدون بدنه | PlatformPlanDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/commerce/plans/{planId}/versions` | CreatePlatformPlanVersionCommand | PlatformPlanVersionItem | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/commerce/plan-versions/{planVersionId}/publish` | PublishPlatformPlanVersionCommand | PlatformPlanVersionItem | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/commerce/subscriptions` | بدون بدنه | PlatformSubscriptionPage | organizationId, status, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/commerce/organizations/{organizationId}/subscription-override` | OverridePlatformSubscriptionCommand | PlatformSubscriptionOverrideResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/education/classes` | بدون بدنه | PlatformClassPage | organizationId, search, status, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/education/classes/{classId}` | بدون بدنه | PlatformClassDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/education/teachers` | بدون بدنه | PlatformTeacherAssignmentPage | organizationId, classId, search, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/education/enrollments` | بدون بدنه | PlatformEnrollmentPage | organizationId, classId, search, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/education/assignments` | بدون بدنه | PlatformAssignmentPage | organizationId, classId, search, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/education/exams` | بدون بدنه | PlatformExamPage | organizationId, classId, search, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/finance/orders` | بدون بدنه | PlatformOrderPage | organizationId, status, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/finance/orders/{orderId}` | بدون بدنه | PlatformOrderItem | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/me` | بدون بدنه | PlatformMeResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/roles` | بدون بدنه | array | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/role-assignments` | بدون بدنه | PlatformRoleAssignmentPage | userId, roleKey, activeOnly, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/role-assignments` | GrantPlatformRoleCommand | PlatformRoleMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `DELETE /api/admin/v1/role-assignments/{assignmentId}` | EndPlatformRoleAssignmentCommand | PlatformRoleMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/messaging/conversations` | بدون بدنه | PlatformConversationMetadataPage | organizationId, type, scope, visibility, status, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/moderation/cases` | بدون بدنه | PlatformModerationCasePage | status, priority, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/moderation/cases/{caseId}` | بدون بدنه | PlatformModerationCaseDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/expanded-context` | PlatformModerationVersionCommand | PlatformModerationCaseDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/actions` | PlatformModerationActionCommand | PlatformModerationCaseDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/start-review` | PlatformModerationVersionCommand | PlatformModerationCaseDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/resolve` | PlatformCompleteModerationCommand | PlatformModerationCaseDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/dismiss` | PlatformCompleteModerationCommand | PlatformModerationCaseDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/enforce-content-removal` | PlatformModerationVersionCommand | PlatformModerationCaseDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/moderation/cases/{caseId}/evidence/files/{fileAssetId}` | بدون بدنه | بدون JSON / باینری | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/organizations` | بدون بدنه | PlatformOrganizationPage | search, status, page, pageSize, sortBy, sortDirection | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/organizations` | CreatePlatformOrganizationCommand | PlatformProvisioningResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/organizations/{organizationId}` | بدون بدنه | PlatformOrganizationDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/organizations/{organizationId}/suspension-impact` | بدون بدنه | PlatformOrganizationImpactPreview | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/organizations/{organizationId}/suspend` | PlatformOrganizationStateCommand | PlatformOrganizationMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/organizations/{organizationId}/reactivate` | PlatformOrganizationStateCommand | PlatformOrganizationMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/organizations/{organizationId}/memberships` | بدون بدنه | PlatformMembershipPage | activeOnly, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/organizations/{organizationId}/invitations` | CreatePlatformInvitationCommand | PlatformInvitationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `PUT /api/admin/v1/organizations/{organizationId}/memberships/{membershipId}/role` | ChangePlatformMembershipRoleCommand | PlatformMembershipMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `DELETE /api/admin/v1/organizations/{organizationId}/memberships/{membershipId}` | EndPlatformMembershipCommand | PlatformMembershipMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/provisioning` | بدون بدنه | PlatformProvisioningPage | status, page, pageSize | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/provisioning` | ProvisionOrganizationCommand | PlatformProvisioningResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/operations/notifications` | بدون بدنه | PlatformNotificationOperations | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/operations/jobs` | بدون بدنه | PlatformJobOperations | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/operations/health` | بدون بدنه | PlatformSystemHealth | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/users` | بدون بدنه | PlatformUserPage | search, status, page, pageSize, sortBy, sortDirection | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `GET /api/admin/v1/users/{userId}` | بدون بدنه | PlatformUserDetail | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/users/{userId}/suspend` | PlatformUserStateCommand | PlatformUserMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/users/{userId}/reactivate` | PlatformUserStateCommand | PlatformUserMutationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/users/{userId}/sessions/revoke` | RevokePlatformSessionsCommand | PlatformSessionRevocationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| پلتفرم | `POST /api/admin/v1/users/{userId}/sessions/{sessionId}/revoke` | RevokePlatformSessionsCommand | PlatformSessionRevocationResult | — | نگاشت دقیق permission نیازمند تأیید؛ مرجع نهایی Backend |
| حساب | `GET /api/v1/me` | بدون بدنه | CurrentUserResult | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `PATCH /api/v1/me/profile` | CompleteProfileCommand | CurrentUserResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/reports/manager/enrollments` | بدون بدنه | ReportPageOfManagerEnrollmentReportItem | CourseId, AcademicPeriodId, Status, PageNumber, PageSize, FromUtc, ToUtc, ClassId, Sort | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/reports/manager/attendance` | بدون بدنه | ReportPageOfManagerAttendanceReportItem | PageNumber, PageSize, FromUtc, ToUtc, ClassId, Sort | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/reports/manager/assessments` | بدون بدنه | ReportPageOfManagerAssessmentReportItem | CourseId, AcademicPeriodId, Kind, PageNumber, PageSize, FromUtc, ToUtc, ClassId, Sort | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/reports/manager/classes/{classId}` | بدون بدنه | ManagerClassPerformanceDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/reports/manager/teacher-workload` | بدون بدنه | ReportPageOfManagerTeacherWorkloadReportItem | CourseId, AcademicPeriodId, PageNumber, PageSize, FromUtc, ToUtc, ClassId, Sort | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/academic/schedule` | بدون بدنه | array | fromUtc, toUtc | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/classes/{classId}/schedule-rules` | CreateScheduleRuleCommand | ScheduleRuleResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `PATCH /api/v1/academic/schedule-rules/{scheduleRuleId}` | UpdateScheduleRuleCommand | ScheduleRuleResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/guardian-relations` | CreateSchoolGuardianRelationCommand | SchoolGuardianRelationDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/organization/guardian-relations` | بدون بدنه | SchoolGuardianRelationsPage | learnerId, page, pageSize | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/organization/guardian-relations/{id}` | بدون بدنه | SchoolGuardianRelationDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/guardian-relations/{id}/activate` | OnboardingStateCommand | SchoolGuardianRelationDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/guardian-relations/{id}/end` | OnboardingStateCommand | SchoolGuardianRelationDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/organization/guardian-relations/{id}/revoke` | OnboardingStateCommand | SchoolGuardianRelationDto | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/classes/{classId}/sessions` | CreateSessionCommand | SessionResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/academic/sessions/{sessionId}` | بدون بدنه | SessionResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `PATCH /api/v1/academic/sessions/{sessionId}` | UpdateSessionCommand | SessionResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/sessions/{sessionId}/cancel` | SessionVersionCommand | SessionResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `POST /api/v1/academic/sessions/{sessionId}/complete` | SessionVersionCommand | SessionResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `GET /api/v1/academic/sessions/{sessionId}/attendance` | بدون بدنه | SessionAttendanceResult | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `PUT /api/v1/academic/sessions/{sessionId}/attendance` | RecordAttendanceCommand | array | — | نشست و Context معتبر؛ کنترل Backend |
| سازمان / Manager | `PATCH /api/v1/academic/sessions/{sessionId}/attendance/{attendanceId}` | CorrectAttendanceCommand | AttendanceEntryResult | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `GET /api/v1/workspaces/me` | بدون بدنه | array | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `POST /api/v1/workspaces/select` | SelectWorkspaceCommand | AccessContext | — | نشست و Context معتبر؛ کنترل Backend |
| حساب | `GET /api/v1/workspaces/current` | بدون بدنه | AccessContext | — | نشست و Context معتبر؛ کنترل Backend |

برای required/nullable، enum و جزئیات فیلدها، contracts/openapi.json مرجع دقیق snapshot است. فهرست تاریخی PDF مبنای تولید نیست.
