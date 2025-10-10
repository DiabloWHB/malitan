# מבנה הפרויקט - מעליתן (Malitan)

## סקירה כללית
פרויקט Malitan הוא מערכת ניהול מקיפה לחברות מעליות, הבנויה בארכיטקטורת monorepo.

## מבנה התיקיות הראשי

```
malitan/
├── apps/                      # אפליקציות
│   ├── web/                   # אפליקציית Next.js ראשית
│   ├── tech-app/              # אפליקציה לטכנאים
│   └── functions/             # Cloud Functions
├── packages/                  # חבילות משותפות
│   ├── core/                  # לוגיקה עסקית מרכזית
│   ├── ports/                 # ממשקים
│   └── adapters/              # מתאמים
├── automations/               # אוטומציות
│   ├── n8n_data/              # נתוני n8n
│   └── workflows/             # זרימות עבודה
└── whatsapp-bot/              # בוט WhatsApp

```

## apps/web - אפליקציית Web ראשית

### מבנה App Directory (Next.js 15)

```
apps/web/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Layout ראשי
│   ├── page.tsx               # דף בית
│   ├── globals.css            # סגנונות גלובליים
│   │
│   ├── login/                 # התחברות
│   │   └── page.tsx
│   │
│   ├── admin/                 # ניהול מערכת
│   │   └── page.tsx
│   │
│   ├── clients/               # ניהול לקוחות
│   │   └── page.tsx
│   │
│   ├── buildings/             # ניהול בניינים
│   │   └── page.tsx
│   │
│   ├── elevators/             # ניהול מעליות
│   │   └── page.tsx
│   │
│   ├── tickets/               # קריאות שירות
│   │   └── page.tsx
│   │
│   ├── technicians/           # ניהול טכנאים
│   │   ├── page.tsx           # רשימת טכנאים
│   │   └── [id]/              # פרטי טכנאי
│   │       └── page.tsx
│   │
│   ├── parts/                 # מלאי חלפים
│   │   └── page.tsx
│   │
│   ├── purchase-orders/       # הזמנות רכש
│   │   └── page.tsx
│   │
│   ├── suppliers/             # ניהול ספקים
│   │   ├── page.tsx           # רשימת ספקים
│   │   └── [id]/              # פרטי ספק
│   │       └── page.tsx
│   │
│   ├── projects/              # ניהול פרויקטים
│   │   ├── page.tsx           # רשימת פרויקטים
│   │   └── [id]/              # פרטי פרויקט
│   │       └── page.tsx
│   │
│   ├── client-hub/            # פורטל לקוחות
│   │   └── page.tsx
│   │
│   └── site-hub/              # ניהול אתרים
│       └── page.tsx
│
├── components/                # קומפוננטות React
│   ├── PartsIntegration.tsx   # אינטגרציה של חלפים
│   │
│   └── ui/                    # קומפוננטות UI
│       ├── layout/            # קומפוננטות Layout
│       │   ├── DashboardLayout.tsx
│       │   ├── Header.tsx
│       │   └── Sidebar.tsx
│       │
│       ├── attachments/       # ניהול קבצים מצורפים
│       │   ├── AttachmentList.tsx
│       │   └── UploadAttachment.tsx
│       │
│       ├── icons/             # אייקונים מותאמים
│       │   └── icons.tsx
│       │
│       ├── autocomplete.tsx   # שדה השלמה אוטומטית
│       ├── avatar.tsx         # תמונת פרופיל
│       ├── badge.tsx          # תגיות
│       ├── button.tsx         # כפתורים
│       ├── card.tsx           # כרטיסיות
│       ├── checkbox.tsx       # תיבות סימון
│       ├── command.tsx        # פקודות
│       ├── dialog.tsx         # דיאלוגים
│       ├── input.tsx          # שדות קלט
│       ├── label.tsx          # תוויות
│       ├── popover.tsx        # חלונות קופצים
│       ├── progress.tsx       # פסי התקדמות
│       ├── select.tsx         # רשימות נפתחות
│       ├── separator.tsx      # מפרידים
│       ├── StatsCard.tsx      # כרטיסי סטטיסטיקה
│       ├── tabs.tsx           # טאבים
│       ├── textarea.tsx       # שדות טקסט
│       ├── toast.tsx          # התראות
│       ├── toaster.tsx        # מנהל התראות
│       ├── top-bar.tsx        # סרגל עליון
│       ├── use-toast.ts       # Hook להתראות
│       └── PartsIntegration.tsx
│
├── lib/                       # ספריות עזר
│   ├── pdf/                   # יצירת PDF
│   │   ├── components/        # קומפוננטות PDF
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── RTLText.tsx
│   │   │   └── Table.tsx
│   │   │
│   │   ├── templates/         # תבניות PDF
│   │   │   ├── maintenanceReport.tsx
│   │   │   ├── purchaseOrder.tsx
│   │   │   └── workReport.tsx
│   │   │
│   │   ├── utils/             # עזרים ל-PDF
│   │   │   ├── fonts.ts
│   │   │   ├── formatting.ts
│   │   │   └── styles.ts
│   │   │
│   │   └── pdfGenerator.ts   # מחולל PDF ראשי
│   │
│   ├── supabaseClient.ts      # Client של Supabase
│   ├── useUserRole.ts         # Hook לתפקידי משתמש
│   └── utils.ts               # פונקציות עזר כלליות
│
├── public/                    # קבצים סטטיים
│
├── package.json               # תלויות הפרויקט
├── tsconfig.json              # הגדרות TypeScript
├── next.config.ts             # הגדרות Next.js
├── components.json            # הגדרות קומפוננטות
└── tailwind.config.js         # הגדרות Tailwind CSS

```

## packages/ - חבילות משותפות

```
packages/
├── core/                      # לוגיקה עסקית מרכזית
├── ports/                     # ממשקים וחוזים
└── adapters/                  # מתאמים למערכות חיצוניות
```

## automations/ - אוטומציות

```
automations/
├── n8n_data/                  # נתוני n8n
│   ├── binaryData/
│   ├── git/
│   ├── nodes/
│   ├── node_modules/
│   └── ssh/
└── workflows/                 # זרימות עבודה מוגדרות
```

## טכנולוגיות עיקריות

### Frontend
- **Next.js 15.5.4** - Framework React עם App Router
- **React 19** - ספריית UI
- **TypeScript** - שפת תכנות מוקלדת
- **Tailwind CSS v4** - Framework CSS
- **Radix UI** - קומפוננטות UI נגישות
- **Lucide React** - אייקונים
- **Recharts** - תרשימים וגרפים

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL Database
  - Authentication
  - Storage
  - Real-time subscriptions

### PDF Generation
- **@react-pdf/renderer** - יצירת PDF מ-React components
- פונטים RTL (עברית)

### Development Tools
- **Turbopack** - Bundler מהיר
- **ESLint** - Linting
- **Git** - ניהול קוד מקור

## תכונות מרכזיות

### ניהול לקוחות
- רשימת לקוחות
- פרטי לקוח מלאים
- אנשי קשר
- בניינים ומעליות
- היסטוריית קריאות

### ניהול קריאות שירות (Tickets)
- יצירה וניהול קריאות
- הקצאה לטכנאים
- מעקב סטטוס
- העלאת קבצים
- אינטגרציה עם חלפים

### ניהול מלאי
- מלאי חלפים
- הזמנות רכש
- ניהול ספקים
- מעקב מלאי בזמן אמת

### ניהול פרויקטים
- פרויקטים פעילים
- מעקב התקדמות
- קישור להזמנות רכש

### פורטלים
- Client Hub - פורטל ללקוחות
- Site Hub - ניהול אתרים
- Technician App - אפליקציה לטכנאים

### דוחות ומסמכים
- יצירת דוחות תחזוקה
- הזמנות רכש PDF
- דוחות עבודה
- תמיכה מלאה ב-RTL (עברית)

## אבטחה והרשאות
- אימות משתמשים דרך Supabase Auth
- Role-based access control (RBAC)
- Row Level Security (RLS) ב-PostgreSQL
- Multi-tenant architecture

## תכונות UI/UX
- עיצוב רספונסיבי
- תמיכה מלאה ב-RTL
- Dark mode support
- Toast notifications
- Modal dialogs
- Autocomplete search
- Real-time updates

---

**גרסה:** 1.0.0
**תאריך עדכון אחרון:** 2025-10-10
**מנהל פרויקט:** מערכת מעליתן
