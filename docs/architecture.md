# Architecture

## المبادئ المعمارية

- تصميم `Multi-tenant` منذ البداية
- فصل واضح بين العمليات المتزامنة `API` وغير المتزامنة `Jobs`
- تتبع كامل للأحداث الحساسة
- عزل طبقة الذكاء الاصطناعي عن منطق الأعمال الأساسي

## البنية المقترحة

### 1. Web App

واجهة لإدارة:

- لوحة التحكم
- العملاء
- العقارات
- الصفقات
- المحادثات
- المستخدمين
- الاشتراكات والإعدادات

### 2. API Layer

خدمات REST أو GraphQL تغطي:

- Authentication
- Companies
- Users
- Leads
- Properties
- Conversations
- Deals
- Reports
- Subscriptions

### 3. WhatsApp Integration Service

مسؤول عن:

- استقبال Webhooks
- التحقق من الرسائل
- ربط الرسائل بالشركة المناسبة
- إنشاء Lead تلقائيًا عند الحاجة
- إرسال الردود

### 4. AI Service Layer

مسؤول عن:

- تصنيف نية العميل
- توليد رد أولي
- استخراج بيانات من الرسائل
- اقتراح عقارات مناسبة بناءً على المعايير

### 5. Background Jobs

للعمليات التالية:

- توزيع العملاء تلقائيًا
- إرسال رسائل المتابعة
- تحديث المؤشرات والتقارير
- تشغيل مهام الذكاء الاصطناعي غير العاجلة

## التصميم المنطقي للوحدات

### Identity and Access

- `auth`
- `roles_permissions`
- `session_audit`

### Tenant Management

- `companies`
- `subscriptions`
- `billing_plans`

### CRM Core

- `leads`
- `lead_notes`
- `lead_tags`
- `lead_assignments`
- `deals`
- `deal_stage_history`

### Inventory

- `properties`
- `property_media`
- `property_features`

### Communication

- `channels`
- `conversations`
- `messages`
- `message_templates`

### AI

- `ai_intents`
- `ai_runs`
- `ai_recommendations`

### Analytics

- `daily_metrics`
- `agent_performance_snapshots`

## تدفق أساسي للرسائل

1. العميل يرسل رسالة واتساب.
2. الـ webhook يستقبل الرسالة.
3. النظام يحدد الشركة المالكة للرقم.
4. يتم البحث عن `Lead` مطابق للهاتف.
5. عند عدم وجوده يتم إنشاء `Lead` جديد.
6. يتم إنشاء أو تحديث `Conversation`.
7. يتم تسجيل الرسالة في `Messages`.
8. يمكن تشغيل AI لتصنيف النية وصياغة رد أولي.
9. يتم تعيين العميل لمندوب مبيعات وفق قاعدة توزيع.
10. تظهر المحادثة والتحديثات داخل لوحة الموظف.

## الأمن

- `JWT` للوصول إلى الـ API
- `RBAC` حسب الدور والصلاحيات
- تشفير القيم الحساسة
- `Webhook signature validation`
- تسجيل العمليات الحساسة `Audit Log`
- عزل بيانات كل شركة في كل استعلام

## متطلبات الأداء

- الاستجابة لطلبات الـ API الشائعة أقل من ثانيتين
- استقبال webhook يجب أن يكون سريعًا ثم يفوض المعالجة الثقيلة إلى queue
- الفهارس الأساسية مطلوبة على الهواتف ومعرفات الشركات ومراحل الصفقات وتواريخ الإنشاء

## قرار تقني مبدئي

المرحلة الأولى يمكن تنفيذها كـ `modular monolith` لتقليل التعقيد التشغيلي.

التقسيم إلى microservices يفضل تأجيله حتى تظهر حاجة تشغيلية حقيقية مثل:

- ضغط عالٍ على تكامل واتساب
- أحمال مستقلة على الذكاء الاصطناعي
- متطلبات توسع منفصلة لوحدة التقارير
