# تشغيل «التقاط مهامي»

الكود والواجهات موجودة في المشروع. هذه الخطوات تربطها بالخدمات الحقيقية من دون وضع مفاتيح سرية داخل تطبيق الجوال.

## 1. قاعدة البيانات

من Supabase افتح **SQL Editor** والصق محتوى الملف:

`supabase/migrations/202609040001_create_smart_scans.sql`

ثم اضغط **Run** مرة واحدة.

## 2. تحليل الصور والصوت

أنشئ مفتاح Gemini API من Google AI Studio، ثم أضفه من:

**Supabase → Edge Functions → Secrets**

بالاسم:

`GEMINI_API_KEY`

لا تضع هذا المفتاح في `.env` الخاص بتطبيق Expo ولا ترسله في المحادثة.

انشر الوظيفة:

```powershell
npx supabase login
npx supabase link --project-ref xucsihjbbgnajzdhzfbw
npx supabase functions deploy analyze-task-image
npx supabase functions deploy analyze-task-voice
```

تحليل الصور والتسجيل الصوتي يستخدمان نفس `GEMINI_API_KEY` ونفس رصيد التحويل الذكي. الملفات تُرسل للتحليل فقط ولا تُحفظ في قاعدة البيانات.

## 3. اشتراك Apple عبر RevenueCat

1. أنشئ Auto-Renewable Subscription في App Store Connect باسم **مهامي بلس**.
2. استخدم Product ID مثل `com.zyad.mahami.plus.monthly` واضبط السعر السعودي الأقرب إلى 7.99 ر.س.
3. في RevenueCat أضف تطبيق iOS، ثم المنتج، ثم Entitlement بالاسم الدقيق `mahami_plus`.
4. أنشئ Offering واجعل الحزمة الشهرية هي Current Offering.
5. ضع مفتاح iOS العام في `.env`:

   `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...`

6. ضع مفتاح RevenueCat السري داخل Supabase Edge Function Secrets باسم:

   `REVENUECAT_SECRET_API_KEY`

7. أنشئ قيمة طويلة وعشوائية لسر الويب هوك، وضع القيمة الكاملة مثل `Bearer ...` في Supabase باسم:

   `REVENUECAT_WEBHOOK_AUTH`

8. انشر وظائف الاشتراك:

```powershell
npx supabase functions deploy sync-revenuecat-subscription
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
```

9. في RevenueCat أضف Webhook إلى:

   `https://xucsihjbbgnajzdhzfbw.supabase.co/functions/v1/revenuecat-webhook`

   واستخدم نفس قيمة Authorization الموجودة في `REVENUECAT_WEBHOOK_AUTH`.

## 4. الاختبار

- Expo Go يعرض واجهة الاشتراك بوضع المعاينة، لكنه لا ينفذ شراء Apple حقيقيًا.
- الشراء الحقيقي يحتاج EAS Development Build وحساب Apple Sandbox للاختبار.
- الحساب المجاني يحصل على عمليتي تحويل ناجحتين فقط.
- المشترك يحصل على 20 عملية في فترة الاشتراك الشهرية.
- فشل التحليل أو عدم العثور على مهام لا يستهلك الرصيد.
