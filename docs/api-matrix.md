# ماتریس قرارداد اجرایی

Snapshot: 2026-11-05، سرور http://94.184.32.84:8090. تولیدشده از OpenAPI واقعی محیط. شناسه نسخه سند اثبات نسخه مستقرشده سرور نیست.

این ماتریس فقط عملیات مجاز پنل مالک و حساب جاری اپراتور را پوشش می‌دهد. وجود API گروه و کانال رسمی در OpenAPI کامل، آن را به قابلیت این پنل تبدیل نمی‌کند؛ مسیرهای مدرسه، گفتگوی خصوصی، پاسخ آموزشی و Repair/Backfill در واسط پنل ارائه نمی‌شوند. مجوزهای زیر نگاشت پیش‌فرض مستند هستند؛ تنظیمات صریح محیط و مجوز جاری پاسخ سرور نیز بررسی می‌شوند.

تمام صفحات: loading / empty / error / forbidden / offline / rate limit / session expired. mutationها: conflict / policy rejection، حفظ فرم و refetch صریح. نسخه فقط طبق DTO و به صورت opaque ارسال می‌شود.

| Context | عملیات | Request DTO | Response | Query / pagination | دسترسی |
|---|---|---|---|---|---|
| پلتفرم | `GET /api/admin/v1/audit-logs` | بدون بدنه | AdminAuditLogPage | actorUserId, action, targetType, targetId, result, fromUtc, toUtc, page, pageSize, sortBy, sortDirection | platform.audit.read |
| حساب اپراتور | `POST /api/v1/auth/otp/challenges` | RequestOtpCommand | RequestOtpResult | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `POST /api/v1/auth/otp/verify` | VerifyOtpCommand | VerifyOtpResult | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `POST /api/v1/auth/refresh` | RefreshSessionCommand | RefreshSessionResult | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `GET /api/v1/auth/sessions` | بدون بدنه | array | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `DELETE /api/v1/auth/sessions/{sessionId}` | بدون بدنه | بدون JSON / باینری | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `POST /api/v1/auth/sessions/revoke-others` | بدون بدنه | بدون JSON / باینری | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `POST /api/v1/auth/logout` | بدون بدنه | بدون JSON / باینری | — | فقط حساب جاری؛ کنترل Backend |
| پلتفرم | `GET /api/admin/v1/users/{userId}/communication-age` | بدون بدنه | CommunicationAgeResult | — | platform.users.manage |
| پلتفرم | `POST /api/admin/v1/users/{userId}/communication-age/verifications` | VerifyCommunicationAgeCommand | CommunicationAgeResult | — | platform.users.manage |
| پلتفرم | `POST /api/admin/v1/users/{userId}/communication-age/resolve` | VerifyCommunicationAgeCommand | CommunicationAgeResult | — | platform.users.manage |
| پلتفرم | `GET /api/v1/sources/{id}` | بدون بدنه | EducationalSourceResult | revision | platform.library.sources.manage |
| پلتفرم | `GET /api/v1/sources/{id}/processing` | بدون بدنه | EducationalSourceResult | revision | platform.library.sources.manage |
| پلتفرم | `PATCH /api/v1/sources/{id}/draft` | UpdateSourceDraftCommand | EducationalSourceResult | — | platform.library.sources.manage |
| پلتفرم | `POST /api/v1/sources/{id}/versions` | CreateSourceVersionCommand | EducationalSourceResult | — | platform.library.sources.manage |
| پلتفرم | `POST /api/v1/sources/{id}/publish` | SourceMutationCommand | EducationalSourceResult | — | platform.library.sources.manage |
| پلتفرم | `POST /api/v1/sources/{id}/archive` | SourceMutationCommand | EducationalSourceResult | — | platform.library.sources.manage |
| پلتفرم | `PUT /api/v1/sources/{id}/visibility` | SourceVisibilityCommand | EducationalSourceResult | — | platform.library.sources.manage |
| پلتفرم | `GET /api/v1/sources/{id}/content` | بدون بدنه | بدون JSON / باینری | revision | platform.library.sources.manage |
| حساب اپراتور | `GET /api/v1/notifications/devices/web-push/configuration` | بدون بدنه | WebPushClientConfiguration | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `GET /api/v1/notifications/devices` | بدون بدنه | PushDevicePageResult | page, pageSize, includeRevoked | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `POST /api/v1/notifications/devices` | RegisterPushDeviceCommand | PushDeviceRegistrationResult | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `POST /api/v1/notifications/devices/web-push` | RegisterWebPushCommand | PushDeviceRegistrationResult | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `DELETE /api/v1/notifications/devices/{registrationId}` | بدون بدنه | بدون JSON / باینری | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `GET /api/v1/notifications` | بدون بدنه | NotificationPage | Page, PageSize, UnreadOnly, Category, OrganizationId | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `GET /api/v1/notifications/unread-count` | بدون بدنه | NotificationUnreadCount | organizationId | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `POST /api/v1/notifications/{notificationId}/read` | بدون بدنه | NotificationItem | — | فقط حساب جاری؛ کنترل Backend |
| پلتفرم | `GET /api/admin/v1/commerce/plans` | بدون بدنه | PlatformPlanPage | search, page, pageSize | platform.commerce.read |
| پلتفرم | `POST /api/admin/v1/commerce/plans` | CreatePlatformPlanCommand | PlatformPlanDetail | — | platform.commerce.manage |
| پلتفرم | `GET /api/admin/v1/commerce/plans/{planId}` | بدون بدنه | PlatformPlanDetail | — | platform.commerce.read |
| پلتفرم | `POST /api/admin/v1/commerce/plans/{planId}/versions` | CreatePlatformPlanVersionCommand | PlatformPlanVersionItem | — | platform.commerce.manage |
| پلتفرم | `POST /api/admin/v1/commerce/plan-versions/{planVersionId}/publish` | PublishPlatformPlanVersionCommand | PlatformPlanVersionItem | — | platform.commerce.manage |
| پلتفرم | `GET /api/admin/v1/commerce/subscriptions` | بدون بدنه | PlatformSubscriptionPage | organizationId, status, page, pageSize | platform.commerce.read |
| پلتفرم | `POST /api/admin/v1/commerce/organizations/{organizationId}/subscription-override` | OverridePlatformSubscriptionCommand | PlatformSubscriptionOverrideResult | — | platform.commerce.manage |
| پلتفرم | `GET /api/admin/v1/commerce/users/{ownerId}/subscription` | بدون بدنه | CommercialSummaryDto | — | platform.commerce.read |
| پلتفرم | `GET /api/admin/v1/commerce/organizations/{ownerId}/subscription` | بدون بدنه | CommercialSummaryDto | — | platform.commerce.read |
| پلتفرم | `PUT /api/admin/v1/commerce/plans/{planId}/availability` | CommercialAvailabilityCommand | بدون JSON / باینری | — | platform.commerce.manage |
| پلتفرم | `PUT /api/admin/v1/commerce/plan-versions/{versionId}/draft` | CommercialDraftCommand | CommercialValidationDto | — | platform.commerce.manage |
| پلتفرم | `GET /api/admin/v1/commerce/plan-versions/{versionId}/validation` | بدون بدنه | CommercialValidationDto | — | platform.commerce.read |
| پلتفرم | `POST /api/admin/v1/commerce/organizations/{ownerId}/commercial-contracts` | RegisterCommercialContractCommand | CommercialSummaryDto | — | platform.commerce.manage |
| پلتفرم | `POST /api/admin/v1/commerce/users/{ownerId}/commercial-contracts` | RegisterCommercialContractCommand | CommercialSummaryDto | — | platform.commerce.manage |
| پلتفرم | `GET /api/admin/v1/commerce/history/{targetId}` | بدون بدنه | array | — | platform.commerce.read |
| پلتفرم | `GET /api/admin/v1/education/classes` | بدون بدنه | PlatformClassPage | organizationId, search, status, page, pageSize | platform.education.read |
| پلتفرم | `GET /api/admin/v1/education/classes/{classId}` | بدون بدنه | PlatformClassDetail | — | platform.education.read |
| پلتفرم | `GET /api/admin/v1/education/teachers` | بدون بدنه | PlatformTeacherAssignmentPage | organizationId, classId, search, page, pageSize | platform.education.read |
| پلتفرم | `GET /api/admin/v1/education/enrollments` | بدون بدنه | PlatformEnrollmentPage | organizationId, classId, search, page, pageSize | platform.education.read |
| پلتفرم | `GET /api/admin/v1/education/assignments` | بدون بدنه | PlatformAssignmentPage | organizationId, classId, search, page, pageSize | platform.education.read |
| پلتفرم | `GET /api/admin/v1/education/exams` | بدون بدنه | PlatformExamPage | organizationId, classId, search, page, pageSize | platform.education.read |
| پلتفرم | `GET /api/admin/v1/finance/orders` | بدون بدنه | PlatformOrderPage | organizationId, status, page, pageSize | platform.finance.read |
| پلتفرم | `GET /api/admin/v1/finance/orders/{orderId}` | بدون بدنه | PlatformOrderItem | — | platform.finance.read |
| پلتفرم | `GET /api/admin/v1/me` | بدون بدنه | PlatformMeResult | — | platform.access |
| پلتفرم | `GET /api/admin/v1/roles` | بدون بدنه | array | — | platform.roles.read |
| پلتفرم | `GET /api/admin/v1/role-assignments` | بدون بدنه | PlatformRoleAssignmentPage | userId, roleKey, activeOnly, page, pageSize | platform.roles.read |
| پلتفرم | `POST /api/admin/v1/role-assignments` | GrantPlatformRoleCommand | PlatformRoleMutationResult | — | platform.roles.manage |
| پلتفرم | `DELETE /api/admin/v1/role-assignments/{assignmentId}` | EndPlatformRoleAssignmentCommand | PlatformRoleMutationResult | — | platform.roles.manage |
| پلتفرم | `GET /api/admin/v1/library/sources` | بدون بدنه | SourcePage | Scope, ClassId, Search, Page, PageSize, Status, SourceType | platform.library.sources.manage |
| پلتفرم | `POST /api/admin/v1/library/sources` | CreateEducationalSourceCommand | EducationalSourceResult | — | platform.library.sources.manage |
| پلتفرم | `GET /api/admin/v1/messaging/conversations` | بدون بدنه | PlatformConversationMetadataPage | organizationId, type, scope, visibility, status, page, pageSize | platform.messaging.read_metadata |
| پلتفرم | `GET /api/admin/v1/moderation/cases` | بدون بدنه | PlatformModerationCasePage | status, priority, page, pageSize | platform.moderation.review |
| پلتفرم | `GET /api/admin/v1/moderation/cases/{caseId}` | بدون بدنه | PlatformModerationCaseDetail | — | platform.moderation.review |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/expanded-context` | PlatformModerationVersionCommand | PlatformModerationCaseDetail | — | platform.moderation.enforce + platform.moderation.review |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/actions` | PlatformModerationActionCommand | PlatformModerationCaseDetail | — | platform.moderation.review |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/start-review` | PlatformModerationVersionCommand | PlatformModerationCaseDetail | — | platform.moderation.review |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/resolve` | PlatformCompleteModerationCommand | PlatformModerationCaseDetail | — | platform.moderation.review |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/dismiss` | PlatformCompleteModerationCommand | PlatformModerationCaseDetail | — | platform.moderation.review |
| پلتفرم | `POST /api/admin/v1/moderation/cases/{caseId}/enforce-content-removal` | PlatformModerationVersionCommand | PlatformModerationCaseDetail | — | platform.moderation.enforce + platform.moderation.review |
| پلتفرم | `GET /api/admin/v1/moderation/cases/{caseId}/evidence/files/{fileAssetId}` | بدون بدنه | بدون JSON / باینری | — | platform.moderation.review |
| پلتفرم | `GET /api/admin/v1/organizations` | بدون بدنه | PlatformOrganizationPage | search, status, page, pageSize, sortBy, sortDirection | platform.organizations.read |
| پلتفرم | `POST /api/admin/v1/organizations` | CreatePlatformOrganizationCommand | PlatformProvisioningResult | — | platform.organizations.manage |
| پلتفرم | `GET /api/admin/v1/organizations/{organizationId}` | بدون بدنه | PlatformOrganizationDetail | — | platform.organizations.read |
| پلتفرم | `GET /api/admin/v1/organizations/{organizationId}/suspension-impact` | بدون بدنه | PlatformOrganizationImpactPreview | — | platform.organizations.read |
| پلتفرم | `POST /api/admin/v1/organizations/{organizationId}/suspend` | PlatformOrganizationStateCommand | PlatformOrganizationMutationResult | — | platform.organizations.manage |
| پلتفرم | `POST /api/admin/v1/organizations/{organizationId}/reactivate` | PlatformOrganizationStateCommand | PlatformOrganizationMutationResult | — | platform.organizations.manage |
| پلتفرم | `GET /api/admin/v1/organizations/{organizationId}/memberships` | بدون بدنه | PlatformMembershipPage | activeOnly, page, pageSize | platform.organizations.read |
| پلتفرم | `POST /api/admin/v1/organizations/{organizationId}/invitations` | CreatePlatformInvitationCommand | PlatformInvitationResult | — | platform.organizations.manage |
| پلتفرم | `PUT /api/admin/v1/organizations/{organizationId}/memberships/{membershipId}/role` | ChangePlatformMembershipRoleCommand | PlatformMembershipMutationResult | — | platform.organizations.manage |
| پلتفرم | `DELETE /api/admin/v1/organizations/{organizationId}/memberships/{membershipId}` | EndPlatformMembershipCommand | PlatformMembershipMutationResult | — | platform.organizations.manage |
| پلتفرم | `PUT /api/admin/v1/personal-classes/{classId}/academic-permissions/{membershipId}` | SetPersonalClassAcademicPermissionCommand | PersonalClassAcademicPermissionDto | — | platform.personal_classes.academic_permissions.manage |
| پلتفرم | `GET /api/admin/v1/personal-classes/{classId}/academic-permissions` | بدون بدنه | PersonalClassPageOfPersonalClassAcademicPermissionDto | page, pageSize | platform.personal_classes.academic_permissions.manage |
| پلتفرم | `GET /api/admin/v1/personal-classes/{classId}/history` | بدون بدنه | PersonalClassPageOfPersonalClassHistoryItem | page, pageSize | platform.personal_classes.read |
| پلتفرم | `GET /api/admin/v1/personal-classes/{classId}/memberships` | بدون بدنه | PersonalClassPageOfPlatformPersonalClassMembershipDto | search, role, activeOnly, page, pageSize | platform.personal_classes.read |
| پلتفرم | `GET /api/admin/v1/personal-class-requests` | بدون بدنه | PersonalClassPageOfPersonalClassRequestDto | status, page, pageSize | platform.personal_classes.read |
| پلتفرم | `GET /api/admin/v1/personal-class-requests/{id}` | بدون بدنه | PersonalClassRequestDto | — | platform.personal_classes.read |
| پلتفرم | `POST /api/admin/v1/personal-class-requests/{id}/review` | ReviewPersonalClassRequestCommand | PersonalClassRequestDto | — | platform.personal_classes.review |
| پلتفرم | `GET /api/admin/v1/personal-class-requests/{id}/history` | بدون بدنه | PersonalClassPageOfPersonalClassDecisionDto | page, pageSize | platform.personal_classes.read |
| پلتفرم | `GET /api/admin/v1/provisioning` | بدون بدنه | PlatformProvisioningPage | status, page, pageSize, clientOperationId | platform.provisioning.read |
| پلتفرم | `POST /api/admin/v1/provisioning` | ProvisionOrganizationCommand | PlatformProvisioningResult | — | platform.provisioning.manage |
| پلتفرم | `GET /api/admin/v1/operations/notifications` | بدون بدنه | PlatformNotificationOperations | — | platform.notifications.read |
| پلتفرم | `GET /api/admin/v1/operations/jobs` | بدون بدنه | PlatformJobOperations | — | platform.operations.read |
| پلتفرم | `GET /api/admin/v1/operations/health` | بدون بدنه | PlatformSystemHealth | — | platform.operations.read |
| پلتفرم | `GET /api/admin/v1/users` | بدون بدنه | PlatformUserPage | search, status, page, pageSize, sortBy, sortDirection | platform.users.read |
| پلتفرم | `GET /api/admin/v1/users/{userId}` | بدون بدنه | PlatformUserDetail | — | platform.users.read |
| پلتفرم | `POST /api/admin/v1/users/{userId}/suspend` | PlatformUserStateCommand | PlatformUserMutationResult | — | platform.users.manage |
| پلتفرم | `POST /api/admin/v1/users/{userId}/reactivate` | PlatformUserStateCommand | PlatformUserMutationResult | — | platform.users.manage |
| پلتفرم | `POST /api/admin/v1/users/{userId}/sessions/revoke` | RevokePlatformSessionsCommand | PlatformSessionRevocationResult | — | platform.sessions.manage |
| پلتفرم | `POST /api/admin/v1/users/{userId}/sessions/{sessionId}/revoke` | RevokePlatformSessionsCommand | PlatformSessionRevocationResult | — | platform.sessions.manage |
| حساب اپراتور | `GET /api/v1/me` | بدون بدنه | CurrentUserResult | — | فقط حساب جاری؛ کنترل Backend |
| حساب اپراتور | `PATCH /api/v1/me/profile` | CompleteProfileCommand | CurrentUserResult | — | فقط حساب جاری؛ کنترل Backend |

علامت + یعنی همه مجوزهای ذکرشده با هم لازم‌اند. مسیر اختصاصی GET /api/realtime فقط اعلان تغییر access و کلاس شخصی را از جریان حساب دریافت می‌کند؛ محتوای گفتگو، Hub token و جریان خام به مرورگر منتقل نمی‌شوند. رویداد منبع وضعیت نهایی نیست و فقط refetch را راه می‌اندازد.


بارگذاری فایل کتابخانه از مسیر اختصاصی POST /api/library/upload به POST /api/v1/files با multipart و فیلد File انجام می‌شود. این مسیر فقط برای مالک دارای مجوز مستقل کتابخانه است؛ فایل‌های عمومی و مسیرهای منابع شخصی/مدرسه در واسط عمومی باز نمی‌شوند. دانلود منابع Library به scope و canDownload جاری وابسته است.

برای required/nullable، enum و جزئیات فیلدها، contracts/openapi.json مرجع دقیق snapshot است. فهرست تاریخی PDF مبنای تولید نیست.
