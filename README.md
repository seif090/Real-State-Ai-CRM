# Real Estate AI CRM

منصة SaaS لإدارة علاقات العملاء العقارية مع تكامل واتساب ومساعد ذكاء اصطناعي.

## الهدف

تحويل وثيقة المتطلبات التجارية (BRD) إلى أساس تنفيذي واضح يمكن لفريق المنتج والتطوير البدء منه مباشرة.

## النطاق الحالي

هذا المستودع يحتوي على حزمة تأسيس للمشروع تشمل:

- تصور المنتج والـ MVP
- معمارية تقنية أولية
- نموذج البيانات الأساسي
- صلاحيات المستخدمين
- خطة تنفيذ مرحلية
- API فعلي للـ CRM
- واجهة ويب أولية لتجربة النظام

## الوثائق

- [ملخص المنتج](./docs/product-overview.md)
- [المعمارية التقنية](./docs/architecture.md)
- [نموذج البيانات](./docs/data-model.md)
- [خطة MVP والتنفيذ](./docs/mvp-plan.md)

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env`
2. عدل `DATABASE_URL` و `JWT_SECRET`
   ويمكن إضافة `OPENAI_API_KEY` لتفعيل AI حقيقي عبر OpenAI
3. ثبّت الحزم عبر `npm install`
4. ولّد Prisma Client عبر `npx prisma generate`
5. نفّذ migration عبر `npx prisma migrate dev --name init`
6. حمّل بيانات الديمو عبر `npm run prisma:seed`
7. شغّل الخادم عبر `npm run dev`

بعد التشغيل افتح `http://localhost:4000` للوصول إلى الواجهة.

## بيانات ديمو جاهزة

الـ seed يضيف بيانات تشغيلية واقعية للسوق العقاري، تشمل:

- شركتين: واحدة في مصر وواحدة في الإمارات
- حساب `super admin`
- مدراء شركات ومندوبي مبيعات
- عقارات بأسعار ومواقع وسيناريوهات قريبة من السوق
- عملاء محتملين وواتساب conversations وصفقات فعلية داخل الـ pipeline

حسابات الدخول:

- `superadmin@realestateai.crm` / `Admin@123`
- `mariam@nilekeys.com` / `Admin@123`
- `omar@gulfnest.ae` / `Admin@123`

ملاحظة:

البيانات seeded واقعية من حيث النوع والسياق والأسعار التقريبية، لكنها بيانات ديمو آمنة وليست بيانات أشخاص أو شركات حقيقية داخل النظام.

## الذكاء الاصطناعي

النظام يدعم وضعين:

- `OpenAI mode`: عند ضبط `OPENAI_API_KEY` سيستخدم التكامل الرسمي مع OpenAI عبر Responses API
- `Fallback mode`: عند عدم وجود المفتاح سيستخدم محلل محلي بسيط حتى تظل المنصة قابلة للتجربة

## الـ API الحالية

- `POST /api/auth/register-company`
- `POST /api/auth/login`
- `GET/POST /api/companies`
- `GET/POST /api/users`
- `GET/POST/PATCH /api/leads`
- `GET/POST/PATCH /api/properties`
- `GET/POST/PATCH /api/deals`
- `GET /api/conversations`
- `GET /api/dashboard/summary`
- `GET/POST /api/whatsapp/webhook`

## المستخدمون الأساسيون

- `super_admin`: إدارة المنصة والشركات والاشتراكات
- `company_admin`: إدارة شركة عقارية واحدة وفرقها وعقاراتها وصفقاتها
- `sales_agent`: متابعة العملاء والمحادثات والصفقات

## الوظائف الأساسية في الـ MVP

- إدارة الشركات والمستخدمين
- إدارة العملاء المحتملين `Leads`
- إدارة العقارات `Properties`
- خط أنابيب الصفقات `Deals Pipeline`
- استقبال رسائل واتساب وحفظ المحادثات
- التوزيع اليدوي أو التلقائي للعملاء على مندوبي المبيعات
- لوحة مؤشرات أولية

## اقتراح تقني مبدئي

- Frontend: `Next.js`
- Backend API: `NestJS` أو `Next.js API`
- Database: `PostgreSQL`
- ORM: `Prisma`
- Auth: `JWT` مع `RBAC`
- Queue/Jobs: `BullMQ + Redis`
- WhatsApp Integration: `WhatsApp Business API`
- AI Layer: خدمة وسيطة للتصنيف والردود الأولية والاقتراحات

## ملاحظات مهمة

- الذكاء الاصطناعي في المرحلة الأولى يجب أن يكون مساعدًا للردود والتصنيف، وليس بديلًا كاملًا عن موظف المبيعات.
- دعم تعدد الشركات `Multi-tenant` يجب أن يكون جزءًا من التصميم من البداية.
- كل الرسائل والكيانات المرتبطة بها يجب أن تكون قابلة للتدقيق `Audit-friendly`.
