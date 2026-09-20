"use client";

export type Locale = "en" | "ar";

export const LOCALE_KEY = "open-support:locale:v1";

export function getStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(LOCALE_KEY);
    return raw === "ar" || raw === "en" ? raw : null;
  } catch {
    return null;
  }
}

export function detectLocale(): Locale {
  const stored = getStoredLocale();
  if (stored) return stored;
  try {
    const nav = navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("ar")) return "ar";
  } catch {
    // ignore
  }
  return "en";
}

export function applyLocaleToDocument(locale: Locale) {
  try {
    document.documentElement.lang = locale === "ar" ? "ar" : "en";
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  } catch {
    // ignore (SSR)
  }
}

export function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
}

const en = {
  brand: "open Support",
  languageToggleToArabic: "Switch to Arabic",
  languageToggleToEnglish: "Switch to English",
  languageShortEn: "EN",
  languageShortAr: "عربي",
  close: "Close",
  done: "Done",
  cancel: "Cancel",
  copy: "Copy",
  copied: "Copied",

  health: {
    checking: "Checking AI status",
    connected: "AI connected",
    notConfigured: "AI not configured",
  },

  landing: {
    kicker: "AI Screen Support",
    title: "AI That Can See Your Screen",
    sub: "Share your screen, ask questions, and get technical help based on what is actually visible.",
    startSession: "Start Session",
    howItWorks: "How it works",
    previewLabel: "Product preview",
    previewTitle: "Support Workspace — shared screen + AI chat",
    previewScreen: "Live screen preview appears here after you share",
    previewUser: "You: Where is the problem?",
    previewAi: "AI: I can see a terminal error on your screen…",
    privacy: "Screen sharing is opt-in. Captured frames are sent to Groq for analysis only — never stored.",
    unsupported: "This browser does not support screen capture. Use Chrome, Edge, or Firefox on desktop.",
  },

  sessionState: {
    idle: "Idle",
    starting: "Starting",
    "waiting-permission": "Waiting for permission",
    sharing: "Screen sharing active",
    analyzing: "Analyzing screen",
    thinking: "AI thinking",
    ready: "Ready",
    error: "Error",
    stopped: "Stopped",
  } as Record<string, string>,

  aiStatus: {
    ready: "Ready",
    analyzing: "Analyzing screen",
    thinking: "Thinking",
    "waiting-input": "Waiting for input",
    error: "Error",
  } as Record<string, string>,

  screen: {
    startSharing: "Start Sharing",
    stopSharing: "Stop Sharing",
    capture: "Capture",
    analyze: "Analyze",
    compare: "Compare",
    captureTitle: "Capture a frame from the live screen",
    captureTitleDisabled: "Start sharing first",
    analyzeTitleHas: "Send the current frame to AI vision",
    analyzeTitleNeeds: "Capture a frame first",
    compareTitleHas: "Compare previous and current frames",
    compareTitleNeeds: "Needs at least two captured frames",
    noScreen: "No screen shared",
    noScreenSub: "Choose Start Sharing, then pick a screen, window, or tab in the browser dialog.",
    history: "Screen history",
    historyEmpty: "Events from this session will appear here.",
    sharedPreview: "Live shared screen preview",
    notSharingPreview: "Screen preview (not sharing)",
    screenControls: "Screen controls",
    sharedScreen: "Shared screen",
  },

  timeline: {
    sessionStart: "Session started",
    sharing: "Screen sharing active",
    screenChanged: "Screen changed",
    stoppedUser: "Screen sharing stopped",
    stoppedBrowser: "Screen sharing ended in browser",
    compare: "Frames compared",
    analysis: "Screen analyzed",
    chat: "Question sent",
    summary: "Session summary updated",
    error: "Error",
    captureManual: "Screen captured (Manual capture)",
    captureAuto: "Screen captured (Auto capture)",
  },

  chat: {
    title: "AI Chat",
    technical: "Technical",
    analyzeScreen: "Analyze Screen",
    explainError: "Explain Error",
    whatChanged: "What Changed?",
    nextStep: "Next Step",
    summarize: "Summarize",
    quickActions: "Quick AI actions",
    conversation: "Conversation",
    emptyTitle: "Ask about what is on your screen",
    emptySub: "Share your screen, capture a frame, then ask for example: “Where is the problem?” or “What should I do next?”",
    you: "You",
    ai: "AI",
    system: "System",
    fromScreen: "from screen",
    streaming: "streaming",
    read: "Read",
    stop: "Stop",
    copyMessage: "Copy message",
    readAloud: "Read response aloud",
    placeholderCanAsk: "Ask AI about your screen...",
    placeholderGeneric: "Ask AI (works without screen sharing too)...",
    askLabel: "Ask AI about your screen",
    send: "Send message",
    sendShort: "Send",
    regenerate: "Regenerate last answer",
    hint: "Enter to send · Shift+Enter for a new line",
    micStart: "Start voice input",
    micStop: "Stop voice input",
    micListening: "Stop listening",
    micSpeak: "Speak your question",
    copyCode: "Copy code",
  },

  sidebar: {
    label: "Application sidebar",
    closeSidebar: "Close sidebar",
    newSession: "New Session",
    sessions: "Sessions",
    empty: "No saved sessions yet. Sessions are stored on this device only.",
    settings: "Settings",
    documentation: "Documentation",
    secondary: "Secondary",
    deleteSession: "Delete session",
    footActive: "Session active on this device.",
    footIdle: "No personal data leaves this device except frames you send to Groq for analysis.",
    openSession: "Open session",
  },

  statusbar: {
    label: "Session status",
    openSidebar: "Open sidebar",
    session: "Session",
    ai: "AI",
    duration: "Duration",
    frames: "Frames",
    messages: "Messages",
    groq: "Groq",
    checking: "checking",
    connected: "connected",
    notConfigured: "not configured",
  },

  privacy: {
    title: "Before you share your screen",
    cancelSharing: "Cancel screen sharing",
    body: "Only share information you are comfortable showing. Avoid passwords, private keys, personal messages, or sensitive information.",
    li1: "Your browser will ask which screen, window, or tab to share. Nothing is shared until you confirm.",
    li2: "Frames you capture are sent to the Groq API for vision analysis. They are not stored on our servers.",
    li3: "Chat sessions are saved in this browser only (localStorage), without screenshots.",
    li4: "Stop sharing at any time. Tracks are closed and analysis stops immediately.",
    accept: "Start Screen Sharing",
  },

  settings: {
    title: "Settings",
    closeSettings: "Close settings",
    techName: "Technical Mode",
    techDesc: "Structured answers: Error, Root Cause, Evidence, Recommended Action, Verification.",
    groqStatus: "Groq status",
    checking: "Checking...",
    connected: "Connected",
    notConfigured: "API key not configured on the server",
    visionModel: "Vision model",
    textModel: "Text model",
    note: "Models are configured server-side via GROQ_VISION_MODEL and GROQ_TEXT_MODEL. The API key never leaves the server.",
  },

  docsModal: {
    title: "Documentation",
    closeDocs: "Close documentation",
    howTitle: "How screen sharing works",
    howBody:
      "Start Sharing calls the browser Screen Capture API (navigator.mediaDevices.getDisplayMedia). The browser shows its own picker for a screen, window, or tab. The granted MediaStream is rendered in a local <video> element. No stream ever leaves your device except individual frames you explicitly capture and send for analysis.",
    privacyTitle: "Privacy",
    privacyBody:
      "Captured frames are JPEG-compressed in your browser (max 1280px wide) and POSTed to /api/ai/analyze or /api/ai/chat, which forward them to the Groq API. Frames are not stored server-side. Sessions persisted in your browser contain messages and event labels only — never screenshots.",
    visionTitle: "AI vision",
    visionBody:
      "Frames go to a Groq vision model (default qwen/qwen3.8-27b). Each analysis request sends at most the current frame plus the previous frame, the recent conversation (last 12 messages), and an optional session summary. The assistant only reports what it can observe and says so when it cannot tell.",
    frameTitle: "Frame processing",
    frameBody:
      "Capture resizes to 1280px JPEG at 0.82 quality. Change detection samples a 32x32 signature every 2 seconds and logs a “Screen changed” event when the mean difference exceeds the threshold — this never triggers API calls by itself.",
    contextTitle: "AI context",
    contextBody:
      "Context per request: current frame, previous frame (for Compare), recent messages, and a summary that is generated from the real conversation once it grows past 16 messages. Image payloads are capped to protect rate limits.",
    browsersTitle: "Supported browsers",
    browsersBody:
      "Screen capture requires a Chromium-based desktop browser (Chrome, Edge) or Firefox with screen-sharing permission. Safari and most mobile browsers either restrict or block getDisplayMedia — the app shows a clear message instead of a fake preview.",
    limitsTitle: "Limitations",
    limit1: "AI reads pixels, not a live stream — it knows only the frames you capture.",
    limit2: "Small or blurred text may be misread; zoom the relevant panel and capture again.",
    limit3: "Voice input/output use built-in browser speech APIs where available.",
    limit4: "Rate limits apply: 20 chat and 10 analysis requests per minute per client.",
  },

  docsPage: {
    back: "Back to open Support",
    title: "Documentation",
    intro: "open Support is a visual technical support assistant. Share your screen, and the AI answers from what is actually visible.",
    howTitle: "How screen sharing works",
    howBody:
      "Start Sharing calls the browser Screen Capture API (navigator.mediaDevices.getDisplayMedia). The browser shows its own picker for a screen, window, or tab. The granted MediaStream is rendered in a local video element. No stream leaves your device except individual frames you capture and send for analysis.",
    privacyTitle: "Privacy",
    privacyBody:
      "Captured frames are JPEG-compressed in your browser (max 1280px wide) and sent to /api/ai/analyze or /api/ai/chat, which forward them to the Groq API. Frames are not stored server-side. Sessions saved in your browser contain messages and event labels only — never screenshots. Do not share passwords, keys, or personal messages.",
    visionTitle: "AI vision",
    visionBody:
      "Frames go to a Groq vision model (default qwen/qwen3.8-27b). Each request sends at most the current frame plus the previous frame, the recent conversation, and an optional session summary. The assistant reports only what it can observe and says so when it cannot tell.",
    frameTitle: "Frame processing",
    frameBody:
      "Capture resizes to 1280px JPEG at 0.82 quality. Change detection samples a 32x32 signature every 2 seconds and logs a “Screen changed” event past the threshold — this never triggers API calls by itself. Frames refresh automatically when you ask a question after the screen changed or after 30 seconds.",
    contextTitle: "AI context",
    contextBody:
      "Context per request: current frame, previous frame for Compare, the last 12 messages, and a summary generated from the real conversation once it grows past 16 messages. Image payloads are capped to protect rate limits (20 chat and 10 analysis requests per minute per client).",
    browsersTitle: "Supported browsers",
    browsersBody:
      "Screen capture needs a Chromium-based desktop browser (Chrome, Edge) or Firefox. Safari and most mobile browsers restrict getDisplayMedia — the app shows a clear message instead of a fake preview.",
    limitsTitle: "Limitations",
    limit1: "The AI reads captured pixels, not a live stream — it knows only the frames you capture.",
    limit2: "Small or blurred text may be misread; zoom the relevant panel and capture again.",
    limit3: "Voice input/output use built-in browser speech APIs where available.",
  },

  errors: {
    aiNotConfigured:
      "AI is not configured: the Groq API key is missing or invalid on the server. Set GROQ_API_KEY and try again.",
    rateLimited: "Rate limit reached. Wait a moment and try again.",
    clipboard: "Clipboard is unavailable in this browser context.",
    noLiveScreen: "No live screen to capture. Start sharing first.",
    compareNeedsTwo: "Compare needs at least two captured frames. Capture again after the screen changes, then compare.",
    nothingToSummarize: "Nothing to summarize yet — send a message first.",
    noFrameShareFirst: "No frame captured yet. Start sharing and capture a frame first.",
    shareCaptureFirst: "Share your screen and capture a frame first, or just ask your question in chat.",
    analysisEmpty: "Analysis returned an empty response. Try again.",
    aiEmpty: "AI returned an empty response. Try again.",
    chatFailed: "Chat request failed.",
    analysisFailed: "Analysis failed.",
    captureFailed: "Frame capture failed.",
    sharingUnsupported:
      "Screen sharing is not supported in this browser. Use a Chromium-based desktop browser (Chrome or Edge) or Firefox.",
    noVideoTrack: "No video track was granted. Try again and select a screen, window, or tab.",
    permissionDenied: "Permission denied. Screen sharing starts only when you allow it in the browser dialog — nothing was shared.",
    selectionCancelled: "Screen selection was cancelled. Press Start Sharing to try again.",
    sharingFailed: "Could not start screen sharing. Try again.",
    voiceTtsUnsupported: "Text-to-speech is not supported in this browser.",
    voiceSttUnsupported:
      "Voice input is not supported in this browser. Use Chrome on desktop for speech recognition.",
    voiceStartFailed: "Could not start voice input. Check microphone permission.",
    savedNoScreenshots:
      "Opened a saved session. Screenshots are never stored — share your screen again to give AI fresh context.",
  },

  misc: {
    messagesUnit: "messages",
    capturedAt: "Captured",
    jpegAt: "at",
  },
};

export type Strings = typeof en;

const ar: Strings = {
  brand: "open Support",
  languageToggleToArabic: "التحويل إلى العربية",
  languageToggleToEnglish: "التبديل إلى الإنجليزية",
  languageShortEn: "EN",
  languageShortAr: "عربي",
  close: "إغلاق",
  done: "تم",
  cancel: "إلغاء",
  copy: "نسخ",
  copied: "تم النسخ",

  health: {
    checking: "جارٍ التحقق من حالة الذكاء الاصطناعي",
    connected: "الذكاء الاصطناعي متصل",
    notConfigured: "الذكاء الاصطناعي غير مهيأ",
  },

  landing: {
    kicker: "دعم بالذكاء الاصطناعي عبر الشاشة",
    title: "ذكاء اصطناعي يرى شاشتك",
    sub: "شارك شاشتك، اطرح أسئلتك، واحصل على مساعدة تقنية مبنية على ما هو ظاهر فعلاً.",
    startSession: "بدء الجلسة",
    howItWorks: "كيف يعمل؟",
    previewLabel: "معاينة المنتج",
    previewTitle: "مساحة الدعم — شاشة مشاركة + محادثة ذكاء اصطناعي",
    previewScreen: "ستظهر هنا معاينة الشاشة المباشرة بعد المشاركة",
    previewUser: "أنت: أين المشكلة؟",
    previewAi: "الذكاء الاصطناعي: أرى خطأ في الطرفية على شاشتك…",
    privacy: "مشاركة الشاشة اختيارية. اللقطات المرسلة تُستخدم للتحليل عبر Groq فقط — ولا تُخزَّن أبداً.",
    unsupported: "هذا المتصفح لا يدعم التقاط الشاشة. استخدم Chrome أو Edge أو Firefox على سطح المكتب.",
  },

  sessionState: {
    idle: "خامل",
    starting: "جارٍ البدء",
    "waiting-permission": "بانتظار الإذن",
    sharing: "مشاركة الشاشة نشطة",
    analyzing: "جارٍ تحليل الشاشة",
    thinking: "الذكاء الاصطناعي يفكر",
    ready: "جاهز",
    error: "خطأ",
    stopped: "متوقف",
  },

  aiStatus: {
    ready: "جاهز",
    analyzing: "يحلل الشاشة",
    thinking: "يفكر",
    "waiting-input": "بانتظار الإدخال",
    error: "خطأ",
  },

  screen: {
    startSharing: "بدء المشاركة",
    stopSharing: "إيقاف المشاركة",
    capture: "التقاط",
    analyze: "تحليل",
    compare: "مقارنة",
    captureTitle: "التقاط لقطة من الشاشة المباشرة",
    captureTitleDisabled: "ابدأ المشاركة أولاً",
    analyzeTitleHas: "إرسال اللقطة الحالية إلى رؤية الذكاء الاصطناعي",
    analyzeTitleNeeds: "التقط لقطة أولاً",
    compareTitleHas: "مقارنة اللقطة السابقة مع الحالية",
    compareTitleNeeds: "يلزم لقطتان على الأقل للمقارنة",
    noScreen: "لا توجد شاشة مشاركة",
    noScreenSub: "اختر بدء المشاركة، ثم حدد شاشة أو نافذة أو تبويباً من نافذة المتصفح.",
    history: "سجل الشاشة",
    historyEmpty: "ستظهر هنا أحداث هذه الجلسة.",
    sharedPreview: "معاينة الشاشة المشاركة المباشرة",
    notSharingPreview: "معاينة الشاشة (لا توجد مشاركة)",
    screenControls: "أدوات الشاشة",
    sharedScreen: "الشاشة المشاركة",
  },

  timeline: {
    sessionStart: "بدأت الجلسة",
    sharing: "مشاركة الشاشة نشطة",
    screenChanged: "تغيّرت الشاشة",
    stoppedUser: "تم إيقاف مشاركة الشاشة",
    stoppedBrowser: "انتهت مشاركة الشاشة من المتصفح",
    compare: "تمت مقارنة اللقطتين",
    analysis: "تم تحليل الشاشة",
    chat: "تم إرسال السؤال",
    summary: "تم تحديث ملخص الجلسة",
    error: "خطأ",
    captureManual: "تم التقاط الشاشة (التقاط يدوي)",
    captureAuto: "تم التقاط الشاشة (التقاط تلقائي)",
  },

  chat: {
    title: "محادثة الذكاء الاصطناعي",
    technical: "تقني",
    analyzeScreen: "تحليل الشاشة",
    explainError: "شرح الخطأ",
    whatChanged: "ما الذي تغيّر؟",
    nextStep: "الخطوة التالية",
    summarize: "تلخيص",
    quickActions: "إجراءات سريعة للذكاء الاصطناعي",
    conversation: "المحادثة",
    emptyTitle: "اسأل عمّا يظهر على شاشتك",
    emptySub: "شارك شاشتك، والتقط لقطة، ثم اسأل مثلاً: «أين المشكلة؟» أو «ما الذي يجب أن أفعله بعد ذلك؟»",
    you: "أنت",
    ai: "الذكاء الاصطناعي",
    system: "النظام",
    fromScreen: "من الشاشة",
    streaming: "جارٍ البث",
    read: "قراءة",
    stop: "إيقاف",
    copyMessage: "نسخ الرسالة",
    readAloud: "قراءة الرد بصوت عالٍ",
    placeholderCanAsk: "اسأل الذكاء الاصطناعي عن شاشتك...",
    placeholderGeneric: "اسأل الذكاء الاصطناعي (يعمل بدون مشاركة الشاشة أيضاً)...",
    askLabel: "اسأل الذكاء الاصطناعي عن شاشتك",
    send: "إرسال الرسالة",
    sendShort: "إرسال",
    regenerate: "إعادة توليد آخر إجابة",
    hint: "Enter للإرسال · Shift+Enter لسطر جديد",
    micStart: "بدء الإدخال الصوتي",
    micStop: "إيقاف الإدخال الصوتي",
    micListening: "إيقاف الاستماع",
    micSpeak: "تحدث بسؤالك",
    copyCode: "نسخ الكود",
  },

  sidebar: {
    label: "الشريط الجانبي للتطبيق",
    closeSidebar: "إغلاق الشريط الجانبي",
    newSession: "جلسة جديدة",
    sessions: "الجلسات",
    empty: "لا توجد جلسات محفوظة بعد. تُحفظ الجلسات على هذا الجهاز فقط.",
    settings: "الإعدادات",
    documentation: "التوثيق",
    secondary: "ثانوي",
    deleteSession: "حذف الجلسة",
    footActive: "الجلسة نشطة على هذا الجهاز.",
    footIdle: "لا تغادر أي بيانات شخصية هذا الجهاز باستثناء اللقطات التي ترسلها إلى Groq للتحليل.",
    openSession: "فتح الجلسة",
  },

  statusbar: {
    label: "حالة الجلسة",
    openSidebar: "فتح الشريط الجانبي",
    session: "الجلسة",
    ai: "الذكاء الاصطناعي",
    duration: "المدة",
    frames: "اللقطات",
    messages: "الرسائل",
    groq: "Groq",
    checking: "جارٍ التحقق",
    connected: "متصل",
    notConfigured: "غير مهيأ",
  },

  privacy: {
    title: "قبل أن تشارك شاشتك",
    cancelSharing: "إلغاء مشاركة الشاشة",
    body: "شارك فقط المعلومات التي لا تمانع في عرضها. تجنّب كلمات المرور والمفاتيح الخاصة والرسائل الشخصية أو المعلومات الحساسة.",
    li1: "سيطلب منك المتصفح اختيار الشاشة أو النافذة أو التبويب للمشاركة. لن تتم المشاركة حتى تؤكد.",
    li2: "اللقطات التي تلتقطها تُرسل إلى واجهة Groq لتحليل الرؤية. ولا تُخزَّن على خوادمنا.",
    li3: "تُحفظ جلسات المحادثة في هذا المتصفح فقط (localStorage)، بدون لقطات شاشة.",
    li4: "أوقف المشاركة في أي وقت. تُغلق المسارات ويتوقف التحليل فوراً.",
    accept: "بدء مشاركة الشاشة",
  },

  settings: {
    title: "الإعدادات",
    closeSettings: "إغلاق الإعدادات",
    techName: "الوضع التقني",
    techDesc: "إجابات منظمة: الخطأ، السبب الجذري، الدليل، الإجراء الموصى به، التحقق.",
    groqStatus: "حالة Groq",
    checking: "جارٍ التحقق...",
    connected: "متصل",
    notConfigured: "مفتاح API غير مهيأ على الخادم",
    visionModel: "نموذج الرؤية",
    textModel: "النموذج النصي",
    note: "تُهيَّأ النماذج على الخادم عبر GROQ_VISION_MODEL و GROQ_TEXT_MODEL. مفتاح API لا يغادر الخادم أبداً.",
  },

  docsModal: {
    title: "التوثيق",
    closeDocs: "إغلاق التوثيق",
    howTitle: "كيف تعمل مشاركة الشاشة",
    howBody:
      "يستدعي زر بدء المشاركة واجهة التقاط الشاشة في المتصفح (navigator.mediaDevices.getDisplayMedia). يعرض المتصفح نافذة اختيار شاشة أو نافذة أو تبويب. يُعرض البث الممنوح في عنصر <video> محلي. لا يغادر أي بث جهازك باستثناء اللقطات التي تلتقطها وترسلها للتحليل.",
    privacyTitle: "الخصوصية",
    privacyBody:
      "تُضغط اللقطات الملتقطة بصيغة JPEG في متصفحك (بعرض أقصى 1280px) وتُرسل إلى /api/ai/analyze أو /api/ai/chat، التي تحوّلها إلى واجهة Groq. لا تُخزَّن اللقطات على الخادم. الجلسات المحفوظة في متصفحك تحتوي على الرسائل وتسميات الأحداث فقط — وليست لقطات شاشة أبداً.",
    visionTitle: "رؤية الذكاء الاصطناعي",
    visionBody:
      "تُرسل اللقطات إلى نموذج رؤية من Groq (الافتراضي qwen/qwen3.8-27b). كل طلب تحليل يرسل اللقطة الحالية مع السابقة كحد أقصى، والمحادثة الأخيرة (آخر 12 رسالة)، وملخصاً اختيارياً للجلسة. يذكر المساعد فقط ما يمكنه ملاحظته ويصرح بذلك عندما يتعذر عليه التحديد.",
    frameTitle: "معالجة اللقطات",
    frameBody:
      "يُغيَّر حجم الالتقاط إلى JPEG بعرض 1280px بجودة 0.82. يكشف التغيّر عينة بتوقيع 32x32 كل ثانيتين ويسجل حدث «تغيّرت الشاشة» عند تجاوز العتبة — وهذا لا يؤدي إلى أي استدعاء API بذاته.",
    contextTitle: "سياق الذكاء الاصطناعي",
    contextBody:
      "السياق لكل طلب: اللقطة الحالية، والسابقة (للمقارنة)، والرسائل الأخيرة، وملخص يُولَّد من المحادثة الحقيقية عندما تتجاوز 16 رسالة. حمولة الصور محدودة لحماية حدود المعدل.",
    browsersTitle: "المتصفحات المدعومة",
    browsersBody:
      "يتطلب التقاط الشاشة متصفح سطح مكتب مبنياً على Chromium (Chrome أو Edge) أو Firefox مع إذن مشاركة الشاشة. متصفح Safari ومعظم متصفحات الجوال تقيّد getDisplayMedia أو تحظره — يعرض التطبيق رسالة واضحة بدل معاينة وهمية.",
    limitsTitle: "القيود",
    limit1: "يقرأ الذكاء الاصطناعي البكسلات وليس بثاً مباشراً — فهو يعرف فقط اللقطات التي تلتقطها.",
    limit2: "قد يُساء قراءة النصوص الصغيرة أو الضبابية؛ كبّر اللوحة المعنية والتقط مجدداً.",
    limit3: "يستخدم الإدخال/الإخراج الصوتي واجهات الكلام المدمجة في المتصفح حيثما توفرت.",
    limit4: "تُطبق حدود المعدل: 20 طلب محادثة و10 طلبات تحليل في الدقيقة لكل عميل.",
  },

  docsPage: {
    back: "العودة إلى open Support",
    title: "التوثيق",
    intro: "open Support مساعد دعم تقني بصري. شارك شاشتك، وسيجيب الذكاء الاصطناعي من ما هو ظاهر فعلاً.",
    howTitle: "كيف تعمل مشاركة الشاشة",
    howBody:
      "يستدعي زر بدء المشاركة واجهة التقاط الشاشة في المتصفح (navigator.mediaDevices.getDisplayMedia). يعرض المتصفح نافذة اختيار شاشة أو نافذة أو تبويب. يُعرض البث الممنوح في عنصر فيديو محلي. لا يغادر أي بث جهازك باستثناء اللقطات التي تلتقطها وترسلها للتحليل.",
    privacyTitle: "الخصوصية",
    privacyBody:
      "تُضغط اللقطات الملتقطة بصيغة JPEG في متصفحك (بعرض أقصى 1280px) وتُرسل إلى /api/ai/analyze أو /api/ai/chat، التي تحوّلها إلى واجهة Groq. لا تُخزَّن اللقطات على الخادم. الجلسات المحفوظة في متصفحك تحتوي على الرسائل وتسميات الأحداث فقط — وليست لقطات شاشة أبداً. لا تشارك كلمات المرور أو المفاتيح أو الرسائل الشخصية.",
    visionTitle: "رؤية الذكاء الاصطناعي",
    visionBody:
      "تُرسل اللقطات إلى نموذج رؤية من Groq (الافتراضي qwen/qwen3.8-27b). كل طلب يرسل اللقطة الحالية مع السابقة كحد أقصى، والمحادثة الأخيرة، وملخصاً اختيارياً للجلسة. يذكر المساعد فقط ما يمكنه ملاحظته ويصرح بذلك عندما يتعذر عليه التحديد.",
    frameTitle: "معالجة اللقطات",
    frameBody:
      "يُغيَّر حجم الالتقاط إلى JPEG بعرض 1280px بجودة 0.82. يكشف التغيّر عينة بتوقيع 32x32 كل ثانيتين ويسجل حدث «تغيّرت الشاشة» بعد تجاوز العتبة — وهذا لا يؤدي إلى أي استدعاء API بذاته. تتحدث اللقطات تلقائياً عندما تسأل بعد تغيّر الشاشة أو بعد 30 ثانية.",
    contextTitle: "سياق الذكاء الاصطناعي",
    contextBody:
      "السياق لكل طلب: اللقطة الحالية، والسابقة للمقارنة، وآخر 12 رسالة، وملخص يُولَّد من المحادثة الحقيقية عندما تتجاوز 16 رسالة. حمولة الصور محدودة لحماية حدود المعدل (20 طلب محادثة و10 طلبات تحليل في الدقيقة لكل عميل).",
    browsersTitle: "المتصفحات المدعومة",
    browsersBody:
      "يتطلب التقاط الشاشة متصفح سطح مكتب مبنياً على Chromium (Chrome أو Edge) أو Firefox. متصفح Safari ومعظم متصفحات الجوال تقيّد getDisplayMedia — يعرض التطبيق رسالة واضحة بدل معاينة وهمية.",
    limitsTitle: "القيود",
    limit1: "يقرأ الذكاء الاصطناعي البكسلات الملتقطة وليس بثاً مباشراً — فهو يعرف فقط اللقطات التي تلتقطها.",
    limit2: "قد يُساء قراءة النصوص الصغيرة أو الضبابية؛ كبّر اللوحة المعنية والتقط مجدداً.",
    limit3: "يستخدم الإدخال/الإخراج الصوتي واجهات الكلام المدمجة في المتصفح حيثما توفرت.",
  },

  errors: {
    aiNotConfigured: "الذكاء الاصطناعي غير مهيأ: مفتاح Groq API مفقود أو غير صالح على الخادم. اضبط GROQ_API_KEY وحاول مجدداً.",
    rateLimited: "تم الوصول إلى حد المعدل. انتظر قليلاً وحاول مجدداً.",
    clipboard: "الحافظة غير متاحة في سياق هذا المتصفح.",
    noLiveScreen: "لا توجد شاشة مباشرة للالتقاط. ابدأ المشاركة أولاً.",
    compareNeedsTwo: "المقارنة تحتاج لقطتين على الأقل. التقط مجدداً بعد تغيّر الشاشة ثم قارن.",
    nothingToSummarize: "لا يوجد ما يُلخَّص بعد — أرسل رسالة أولاً.",
    noFrameShareFirst: "لا توجد لقطة بعد. ابدأ المشاركة والتقط لقطة أولاً.",
    shareCaptureFirst: "شارك شاشتك والتقط لقطة أولاً، أو اطرح سؤالك في المحادثة مباشرة.",
    analysisEmpty: "أعاد التحليل رداً فارغاً. حاول مجدداً.",
    aiEmpty: "أعاد الذكاء الاصطناعي رداً فارغاً. حاول مجدداً.",
    chatFailed: "فشل طلب المحادثة.",
    analysisFailed: "فشل التحليل.",
    captureFailed: "فشل التقاط اللقطة.",
    sharingUnsupported: "مشاركة الشاشة غير مدعومة في هذا المتصفح. استخدم متصفح سطح مكتب مبنياً على Chromium (Chrome أو Edge) أو Firefox.",
    noVideoTrack: "لم يُمنح أي مسار فيديو. حاول مجدداً واختر شاشة أو نافذة أو تبويباً.",
    permissionDenied: "تم رفض الإذن. تبدأ مشاركة الشاشة فقط عندما تسمح بذلك في نافذة المتصفح — لم تتم مشاركة أي شيء.",
    selectionCancelled: "تم إلغاء اختيار الشاشة. اضغط بدء المشاركة للمحاولة مجدداً.",
    sharingFailed: "تعذر بدء مشاركة الشاشة. حاول مجدداً.",
    voiceTtsUnsupported: "تحويل النص إلى كلام غير مدعوم في هذا المتصفح.",
    voiceSttUnsupported: "الإدخال الصوتي غير مدعوم في هذا المتصفح. استخدم Chrome على سطح المكتب للتعرف على الكلام.",
    voiceStartFailed: "تعذر بدء الإدخال الصوتي. تحقق من إذن الميكروفون.",
    savedNoScreenshots: "تم فتح جلسة محفوظة. لا تُخزَّن لقطات الشاشة أبداً — شارك شاشتك مجدداً لمنح الذكاء الاصطناعي سياقاً جديداً.",
  },

  misc: {
    messagesUnit: "رسالة",
    capturedAt: "تم الالتقاط",
    jpegAt: "في",
  },
};

export const dictionaries: Record<Locale, Strings> = { en, ar };

export function getStrings(locale: Locale): Strings {
  return dictionaries[locale] ?? en;
}

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}
