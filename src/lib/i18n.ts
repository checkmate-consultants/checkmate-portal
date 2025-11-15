import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      brand: {
        name: 'Checkmate Portal',
      },
      ui: {
        toggleTheme: 'Toggle theme',
        changeLanguage: 'Change language',
      },
      signin: {
        title: 'Welcome back',
        subtitle: 'Sign in to orchestrate every customer milestone with confidence.',
        email: 'Email address',
        emailPlaceholder: 'team@company.com',
        password: 'Password',
        passwordPlaceholder: '••••••••',
        remember: 'Keep me signed in',
        forgot: 'Forgot password?',
        submit: 'Sign in',
        noAccount: "Don't have an account?",
        createAccount: 'Create one',
        resetSuccess: 'Password reset link sent! Check your inbox.',
      },
      signup: {
        title: 'Create your account',
        subtitle: 'Join Checkmate Portal to orchestrate customer success',
        name: 'Full name',
        namePlaceholder: 'Taylor Founder',
        email: 'Work email',
        emailPlaceholder: 'team@company.com',
        password: 'Password',
        passwordPlaceholder: '••••••••',
        passwordStrength: '{{value}}% secure',
        confirmPassword: 'Confirm password',
        terms: 'I agree to the terms and privacy policy',
        submit: 'Create account',
        successTitle: 'Check your inbox',
        successBody:
          'We sent you a verification email. Confirm it to access your workspace.',
        alreadyHaveAccount: 'Already have an account?',
        signIn: 'Sign in',
      },
      validation: {
        required: 'This field is required',
        email: 'Enter a valid email',
        passwordMismatch: 'Passwords must match',
        passwordLength: 'Use at least 8 characters',
        nameLength: 'Name must be at least 2 characters',
        terms: 'You must accept the terms',
        generic: 'Something went wrong. Please try again.',
      },
      hero: {
        badge: 'Beta access',
        highlight: 'Build trust faster with guided onboarding journeys.',
        points: [
          'Automated onboarding playbooks',
          'Health scoring built-in',
          'Rich collaboration for customer teams',
        ],
      },
      workspace: {
        title: 'Workspace preview',
        subtitle: 'You are authenticated. Replace this view with your dashboard.',
        back: 'Back to onboarding',
        signOut: 'Sign out',
      },
    },
  },
  ar: {
    translation: {
      brand: {
        name: 'Checkmate Portal',
      },
      ui: {
        toggleTheme: 'تبديل الوضع',
        changeLanguage: 'تغيير اللغة',
      },
      signin: {
        title: 'مرحباً بعودتك',
        subtitle: 'سجّل دخولك لتقُد تجارب عملاء موثوقة في كل مرحلة.',
        email: 'البريد الإلكتروني',
        emailPlaceholder: 'team@company.com',
        password: 'كلمة المرور',
        passwordPlaceholder: '••••••••',
        remember: 'تذكرني',
        forgot: 'نسيت كلمة المرور؟',
        submit: 'تسجيل الدخول',
        noAccount: 'لا تملك حساباً؟',
        createAccount: 'أنشئ حساباً',
        resetSuccess: 'تم إرسال رابط إعادة التعيين. تفقد بريدك.',
      },
      signup: {
        title: 'أنشئ حسابك',
        subtitle:
          'انضم إلى Checkmate Portal لتقود تجارب ترحيب متسقة وموثوقة',
        name: 'الاسم الكامل',
        namePlaceholder: 'عمر المؤسس',
        email: 'البريد المهني',
        emailPlaceholder: 'team@company.com',
        password: 'كلمة المرور',
        passwordPlaceholder: '••••••••',
        passwordStrength: '{{value}}٪ آمن',
        confirmPassword: 'تأكيد كلمة المرور',
        terms: 'أوافق على البنود وسياسة الخصوصية',
        submit: 'إنشاء الحساب',
        successTitle: 'تحقق من بريدك',
        successBody:
          'أرسلنا لك رسالة تأكيد. فعّلها للوصول إلى مساحة العمل.',
        alreadyHaveAccount: 'هل لديك حساب؟',
        signIn: 'تسجيل الدخول',
      },
      validation: {
        required: 'هذا الحقل مطلوب',
        email: 'أدخل بريداً صحيحاً',
        passwordMismatch: 'كلمتا المرور غير متطابقتين',
        passwordLength: 'استخدم 8 أحرف على الأقل',
        nameLength: 'يجب أن لا يقل الاسم عن حرفين',
        terms: 'يجب الموافقة على البنود',
        generic: 'حدث خطأ ما. حاول مرة أخرى.',
      },
      hero: {
        badge: 'وصول مبكر',
        highlight:
          'ابنِ الثقة أسرع عبر مسارات ترحيب موجّهة للعميل.',
        points: [
          'بلايبكس ترحيب مؤتمتة',
          'مؤشرات صحة مدمجة',
          'تعاون غني مع فرق العميل',
        ],
      },
      workspace: {
        title: 'لمحة عن مساحة العمل',
        subtitle: 'أنت مسجل الدخول. استبدل هذه الصفحة بلوحة التحكم لاحقاً.',
        back: 'العودة إلى الترحيب',
        signOut: 'تسجيل الخروج',
      },
    },
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    resources,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n

