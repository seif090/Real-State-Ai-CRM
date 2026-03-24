# Data Model

## الكيانات الأساسية

## Company

يمثل شركة عقارية مشتركة في المنصة.

حقول مقترحة:

- `id`
- `name`
- `slug`
- `country`
- `timezone`
- `status`
- `subscription_plan_id`
- `created_at`
- `updated_at`

## User

- `id`
- `company_id`
- `full_name`
- `email`
- `phone`
- `password_hash`
- `role`
- `status`
- `last_login_at`
- `created_at`

## Lead

- `id`
- `company_id`
- `assigned_to_user_id`
- `source` (`whatsapp`, `manual`, `import`)
- `full_name`
- `phone`
- `email`
- `budget_min`
- `budget_max`
- `preferred_location`
- `property_type`
- `intent` (`buy`, `rent`, `invest`, `unknown`)
- `status`
- `temperature` (`cold`, `warm`, `hot`)
- `last_contact_at`
- `created_at`
- `updated_at`

الحالات المقترحة:

- `new`
- `contacted`
- `interested`
- `viewing_scheduled`
- `negotiation`
- `won`
- `lost`

## Lead Note

- `id`
- `lead_id`
- `author_user_id`
- `content`
- `created_at`

## Lead Tag

- `id`
- `company_id`
- `name`

## Property

- `id`
- `company_id`
- `code`
- `title`
- `location_text`
- `property_type`
- `listing_type`
- `price`
- `currency`
- `area_sqm`
- `bedrooms`
- `bathrooms`
- `description`
- `status`
- `owner_name`
- `owner_phone`
- `created_by_user_id`
- `created_at`
- `updated_at`

## Property Media

- `id`
- `property_id`
- `file_url`
- `sort_order`

## Deal

- `id`
- `company_id`
- `lead_id`
- `property_id`
- `owner_user_id`
- `stage`
- `value`
- `expected_close_date`
- `closed_at`
- `loss_reason`
- `created_at`
- `updated_at`

المراحل المقترحة:

- `lead`
- `qualified`
- `viewing`
- `negotiation`
- `closed_won`
- `closed_lost`

## Conversation

- `id`
- `company_id`
- `lead_id`
- `channel`
- `external_thread_id`
- `status`
- `last_message_at`
- `created_at`

## Message

- `id`
- `conversation_id`
- `sender_type` (`customer`, `agent`, `system`, `ai`)
- `sender_user_id`
- `direction` (`inbound`, `outbound`)
- `content`
- `message_type`
- `external_message_id`
- `delivery_status`
- `created_at`

## AI Run

- `id`
- `company_id`
- `lead_id`
- `conversation_id`
- `task_type`
- `input_snapshot`
- `result_snapshot`
- `status`
- `created_at`

## العلاقة بين الكيانات

- الشركة لديها عدة مستخدمين وعملاء وعقارات وصفقات ومحادثات.
- العميل يمكن أن يكون لديه عدة ملاحظات ومحادثات وصفقات.
- الصفقة ترتبط بعميل واحد ويمكن أن ترتبط بعقار واحد.
- المحادثة ترتبط بعميل واحد وتحتوي عدة رسائل.

## قواعد مهمة

- فهرسة `company_id + phone` في جدول العملاء لمنع التكرار.
- لا يسمح لمستخدم بالوصول إلى بيانات شركة أخرى.
- يجب الاحتفاظ بسجل تغيرات مراحل الصفقة وحالة العميل.
- الرسائل الواردة لا تحذف منطقيًا إلا وفق سياسة احتفاظ واضحة.
