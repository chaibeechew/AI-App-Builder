"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "laneriq-language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", short: "EN", label: "English" },
  { code: "zh-CN", short: "简", label: "简体中文" },
  { code: "zh-TW", short: "繁", label: "繁體中文" },
  { code: "ms", short: "BM", label: "Bahasa Melayu" },
  { code: "id", short: "ID", label: "Bahasa Indonesia" },
  { code: "ja", short: "日", label: "日本語" },
  { code: "ko", short: "한", label: "한국어" },
  { code: "th", short: "TH", label: "ไทย" },
  { code: "vi", short: "VI", label: "Tiếng Việt" },
  { code: "es", short: "ES", label: "Español" },
];

const ENGLISH = {
  "Build App Web & Game": "Build App Web & Game",
  "3-in-1 AI Creation Platform": "3-in-1 AI Creation Platform",
  "Create Anything. From One Idea.": "Create Anything. From One Idea.",
  "Powered by": "Powered by",
  "Describe the App & Website you want to build": "Describe the App & Website you want to build",
  "✦ Improve Prompt": "✦ Improve Prompt",
  "Ṫ Text to App": "Ṫ Text to App",
  "▧ Upload Ref": "▧ Upload Ref",
  "◉ Voice Idea": "◉ Voice Idea",
  "↗ Photo / Video": "↗ Photo / Video",
  "Choose a Style": "Choose a Style",
  "Customer colors can change later": "Customer colors can change later",
  "Or Choose a Template": "Or Choose a Template",
  "View All ›": "View All ›",
  "Create Images": "Create Images",
  "Design Images": "Design Images",
  "BUILD APP + WEBSITE": "BUILD APP + WEBSITE",
  "✓ First project free until publish": "✓ First project free until publish",
  "✓ Premium design included": "✓ Premium design included",
  "✓ Version history & undo": "✓ Version history & undo",
  "✓ Production stays locked until approved": "✓ Production stays locked until approved",
  Dashboard: "Dashboard",
  Build: "Build",
  "My Creations": "My Creations",
  Templates: "Templates",
  More: "More",
  "Secure Verification": "Secure Verification",
  "Enter your code": "Enter your code",
  "Email Code": "Email Code",
  "SMS Code": "SMS Code",
  "Verify & Continue": "Verify & Continue",
  "Change email": "Change email",
  "Please verify your account first.": "Please verify your account first.",
  "Game creation is a Pro feature. Become Pro to continue.": "Game creation is a Pro feature. Become Pro to continue.",
  "Become Pro": "Become Pro",
  "Pro Game Creator": "Pro Game Creator",
  "Cinematic": "Cinematic",
  "Cyberpunk": "Cyberpunk",
  "Fantasy": "Fantasy",
  "Minimal": "Minimal",
  "3D Render": "3D Render",
  "Watercolor": "Watercolor",
  "Social Media": "Social Media",
  "Business CRM": "Business CRM",
  "App Promo": "App Promo",
  "Adventure": "Adventure",
};

const TRANSLATIONS = {
  "zh-CN": {
    "Build App Web & Game": "制作 App、网站与游戏",
    "3-in-1 AI Creation Platform": "三合一 AI 创作平台",
    "Create Anything. From One Idea.": "一个想法，创造一切。",
    "Powered by": "由",
    "Describe the App & Website you want to build": "描述你想制作的 App 与网站",
    "✦ Improve Prompt": "✦ 优化提示词",
    "Ṫ Text to App": "Ṫ 文字生成 App",
    "▧ Upload Ref": "▧ 上传参考",
    "◉ Voice Idea": "◉ 语音想法",
    "↗ Photo / Video": "↗ 照片 / 视频",
    "Choose a Style": "选择风格",
    "Customer colors can change later": "稍后可更改品牌颜色",
    "Or Choose a Template": "或选择模板",
    "View All ›": "查看全部 ›",
    "Create Images": "生成图片",
    "Design Images": "设计图片",
    "BUILD APP + WEBSITE": "制作 APP + 网站",
    "✓ First project free until publish": "✓ 首个项目发布前免费",
    "✓ Premium design included": "✓ 包含高级设计",
    "✓ Version history & undo": "✓ 版本历史与撤销",
    "✓ Production stays locked until approved": "✓ 未确认前不会发布正式版",
    Dashboard: "控制台",
    Build: "制作",
    "My Creations": "我的作品",
    Templates: "模板",
    More: "更多",
    "Secure Verification": "安全验证",
    "Enter your code": "输入验证码",
    "Email Code": "邮箱验证码",
    "SMS Code": "短信验证码",
    "Verify & Continue": "验证并继续",
    "Change email": "更换邮箱",
    "Please verify your account first.": "请先完成账号验证。",
    "Game creation is a Pro feature. Become Pro to continue.": "游戏制作仅限 Pro。升级 Pro 后继续。",
    "Become Pro": "升级 Pro",
    "Pro Game Creator": "Pro 游戏制作器",
    Cinematic: "电影感",
    Cyberpunk: "赛博朋克",
    Fantasy: "奇幻",
    Minimal: "极简",
    "3D Render": "3D 渲染",
    Watercolor: "水彩",
    "Social Media": "社交媒体",
    "Business CRM": "商务 CRM",
    "App Promo": "App 推广",
    Adventure: "探索旅行",
  },
  "zh-TW": {
    "Build App Web & Game": "製作 App、網站與遊戲",
    "3-in-1 AI Creation Platform": "三合一 AI 創作平台",
    "Create Anything. From One Idea.": "一個想法，創造一切。",
    "Powered by": "由",
    "Describe the App & Website you want to build": "描述你想製作的 App 與網站",
    "✦ Improve Prompt": "✦ 優化提示詞",
    "Ṫ Text to App": "Ṫ 文字生成 App",
    "▧ Upload Ref": "▧ 上傳參考",
    "◉ Voice Idea": "◉ 語音想法",
    "↗ Photo / Video": "↗ 照片 / 影片",
    "Choose a Style": "選擇風格",
    "Customer colors can change later": "稍後可更改品牌顏色",
    "Or Choose a Template": "或選擇範本",
    "View All ›": "查看全部 ›",
    "Create Images": "生成圖片",
    "Design Images": "設計圖片",
    "BUILD APP + WEBSITE": "製作 APP + 網站",
    "✓ First project free until publish": "✓ 首個專案發佈前免費",
    "✓ Premium design included": "✓ 包含高級設計",
    "✓ Version history & undo": "✓ 版本記錄與復原",
    "✓ Production stays locked until approved": "✓ 未確認前不會正式發佈",
    Dashboard: "控制台",
    Build: "製作",
    "My Creations": "我的作品",
    Templates: "範本",
    More: "更多",
    "Secure Verification": "安全驗證",
    "Enter your code": "輸入驗證碼",
    "Email Code": "電郵驗證碼",
    "SMS Code": "簡訊驗證碼",
    "Verify & Continue": "驗證並繼續",
    "Change email": "更換電郵",
    "Please verify your account first.": "請先完成帳號驗證。",
    "Game creation is a Pro feature. Become Pro to continue.": "遊戲製作僅限 Pro。升級 Pro 後繼續。",
    "Become Pro": "升級 Pro",
    "Pro Game Creator": "Pro 遊戲製作器",
    Cinematic: "電影感",
    Cyberpunk: "賽博龐克",
    Fantasy: "奇幻",
    Minimal: "極簡",
    "3D Render": "3D 渲染",
    Watercolor: "水彩",
    "Social Media": "社群媒體",
    "Business CRM": "商務 CRM",
    "App Promo": "App 推廣",
    Adventure: "探索旅行",
  },
  ms: {
    "Build App Web & Game": "Bina App, Web & Game",
    "3-in-1 AI Creation Platform": "Platform Ciptaan AI 3-dalam-1",
    "Create Anything. From One Idea.": "Cipta apa sahaja daripada satu idea.",
    "Powered by": "Dikuasakan oleh",
    "Describe the App & Website you want to build": "Terangkan App & laman web yang anda mahu bina",
    "✦ Improve Prompt": "✦ Perbaik Prompt",
    "Ṫ Text to App": "Ṫ Teks ke App",
    "▧ Upload Ref": "▧ Muat Naik Rujukan",
    "◉ Voice Idea": "◉ Idea Suara",
    "↗ Photo / Video": "↗ Foto / Video",
    "Choose a Style": "Pilih Gaya",
    "Customer colors can change later": "Warna jenama boleh diubah kemudian",
    "Or Choose a Template": "Atau Pilih Templat",
    "View All ›": "Lihat Semua ›",
    "Create Images": "Cipta Imej",
    "Design Images": "Reka Imej",
    "BUILD APP + WEBSITE": "BINA APP + LAMAN WEB",
    "✓ First project free until publish": "✓ Projek pertama percuma sehingga diterbitkan",
    "✓ Premium design included": "✓ Reka bentuk premium disertakan",
    "✓ Version history & undo": "✓ Sejarah versi & buat asal",
    "✓ Production stays locked until approved": "✓ Produksi kekal terkunci sehingga diluluskan",
    Dashboard: "Papan Pemuka",
    Build: "Bina",
    "My Creations": "Ciptaan Saya",
    Templates: "Templat",
    More: "Lagi",
    "Secure Verification": "Pengesahan Selamat",
    "Enter your code": "Masukkan kod anda",
    "Email Code": "Kod E-mel",
    "SMS Code": "Kod SMS",
    "Verify & Continue": "Sahkan & Teruskan",
    "Change email": "Tukar e-mel",
    "Please verify your account first.": "Sila sahkan akaun anda dahulu.",
    "Game creation is a Pro feature. Become Pro to continue.": "Penciptaan game ialah ciri Pro. Naik taraf ke Pro untuk meneruskan.",
    "Become Pro": "Naik Taraf Pro",
    "Pro Game Creator": "Pencipta Game Pro",
    Cinematic: "Sinematik",
    Cyberpunk: "Cyberpunk",
    Fantasy: "Fantasi",
    Minimal: "Minimal",
    "3D Render": "Render 3D",
    Watercolor: "Cat Air",
    "Social Media": "Media Sosial",
    "Business CRM": "CRM Perniagaan",
    "App Promo": "Promosi App",
    Adventure: "Pengembaraan",
  },
  id: {
    "Build App Web & Game": "Buat App, Web & Game",
    "3-in-1 AI Creation Platform": "Platform Kreasi AI 3-dalam-1",
    "Create Anything. From One Idea.": "Ciptakan apa saja dari satu ide.",
    "Powered by": "Didukung oleh",
    "Describe the App & Website you want to build": "Jelaskan App & website yang ingin Anda buat",
    "✦ Improve Prompt": "✦ Tingkatkan Prompt",
    "Ṫ Text to App": "Ṫ Teks ke App",
    "▧ Upload Ref": "▧ Unggah Referensi",
    "◉ Voice Idea": "◉ Ide Suara",
    "↗ Photo / Video": "↗ Foto / Video",
    "Choose a Style": "Pilih Gaya",
    "Customer colors can change later": "Warna merek dapat diubah nanti",
    "Or Choose a Template": "Atau Pilih Template",
    "View All ›": "Lihat Semua ›",
    "Create Images": "Buat Gambar",
    "Design Images": "Desain Gambar",
    "BUILD APP + WEBSITE": "BUAT APP + WEBSITE",
    Dashboard: "Dasbor",
    Build: "Buat",
    "My Creations": "Kreasi Saya",
    Templates: "Template",
    More: "Lainnya",
    "Secure Verification": "Verifikasi Aman",
    "Enter your code": "Masukkan kode Anda",
    "Email Code": "Kode Email",
    "SMS Code": "Kode SMS",
    "Verify & Continue": "Verifikasi & Lanjutkan",
    "Change email": "Ganti email",
    "Please verify your account first.": "Harap verifikasi akun Anda terlebih dahulu.",
    "Game creation is a Pro feature. Become Pro to continue.": "Pembuatan game adalah fitur Pro. Upgrade ke Pro untuk melanjutkan.",
    "Become Pro": "Upgrade Pro",
    "Pro Game Creator": "Pembuat Game Pro",
    Cinematic: "Sinematik",
    Fantasy: "Fantasi",
    Minimal: "Minimal",
    Watercolor: "Cat Air",
  },
  ja: {
    "Build App Web & Game": "App・Web・Gameを制作",
    "3-in-1 AI Creation Platform": "3-in-1 AI制作プラットフォーム",
    "Create Anything. From One Idea.": "ひとつのアイデアから、すべてを創る。",
    "Powered by": "Powered by",
    "Describe the App & Website you want to build": "作りたいAppとWebサイトを説明してください",
    "✦ Improve Prompt": "✦ プロンプト改善",
    "Ṫ Text to App": "Ṫ テキストからApp",
    "▧ Upload Ref": "▧ 参考資料をアップロード",
    "◉ Voice Idea": "◉ 音声アイデア",
    "↗ Photo / Video": "↗ 写真 / 動画",
    "Choose a Style": "スタイルを選択",
    "Customer colors can change later": "ブランドカラーは後で変更できます",
    "Or Choose a Template": "またはテンプレートを選択",
    "View All ›": "すべて表示 ›",
    "Create Images": "画像を生成",
    "Design Images": "画像をデザイン",
    "BUILD APP + WEBSITE": "APP + WEBサイトを制作",
    Dashboard: "ダッシュボード",
    Build: "制作",
    "My Creations": "マイ作品",
    Templates: "テンプレート",
    More: "その他",
    "Secure Verification": "安全な認証",
    "Enter your code": "認証コードを入力",
    "Email Code": "メールコード",
    "SMS Code": "SMSコード",
    "Verify & Continue": "認証して続行",
    "Change email": "メールを変更",
    "Please verify your account first.": "先にアカウント認証を完了してください。",
    "Game creation is a Pro feature. Become Pro to continue.": "ゲーム制作はPro機能です。Proにアップグレードして続行してください。",
    "Become Pro": "Proにアップグレード",
    "Pro Game Creator": "Pro Game Creator",
    Cinematic: "シネマティック",
    Fantasy: "ファンタジー",
    Minimal: "ミニマル",
    Watercolor: "水彩",
  },
  ko: {
    "Build App Web & Game": "App · Web · Game 제작",
    "3-in-1 AI Creation Platform": "3-in-1 AI 제작 플랫폼",
    "Create Anything. From One Idea.": "하나의 아이디어로 무엇이든 만드세요.",
    "Describe the App & Website you want to build": "만들고 싶은 App과 웹사이트를 설명하세요",
    "✦ Improve Prompt": "✦ 프롬프트 개선",
    "Ṫ Text to App": "Ṫ 텍스트로 App 만들기",
    "▧ Upload Ref": "▧ 참고자료 업로드",
    "◉ Voice Idea": "◉ 음성 아이디어",
    "↗ Photo / Video": "↗ 사진 / 동영상",
    "Choose a Style": "스타일 선택",
    "Customer colors can change later": "브랜드 색상은 나중에 변경 가능",
    "Or Choose a Template": "또는 템플릿 선택",
    "View All ›": "모두 보기 ›",
    "Create Images": "이미지 생성",
    "Design Images": "이미지 디자인",
    "BUILD APP + WEBSITE": "APP + 웹사이트 제작",
    Dashboard: "대시보드",
    Build: "제작",
    "My Creations": "내 작품",
    Templates: "템플릿",
    More: "더보기",
    "Secure Verification": "보안 인증",
    "Enter your code": "인증 코드 입력",
    "Verify & Continue": "인증 후 계속",
    "Please verify your account first.": "먼저 계정 인증을 완료해 주세요.",
    "Game creation is a Pro feature. Become Pro to continue.": "게임 제작은 Pro 기능입니다. Pro로 업그레이드하여 계속하세요.",
    "Become Pro": "Pro 업그레이드",
  },
  th: {
    "Build App Web & Game": "สร้าง App, Web และ Game",
    "3-in-1 AI Creation Platform": "แพลตฟอร์มสร้างสรรค์ AI 3-in-1",
    "Create Anything. From One Idea.": "สร้างทุกอย่างได้จากไอเดียเดียว",
    "Describe the App & Website you want to build": "อธิบาย App และเว็บไซต์ที่คุณต้องการสร้าง",
    "✦ Improve Prompt": "✦ ปรับปรุง Prompt",
    "Ṫ Text to App": "Ṫ ข้อความเป็น App",
    "▧ Upload Ref": "▧ อัปโหลดตัวอย่าง",
    "◉ Voice Idea": "◉ ไอเดียด้วยเสียง",
    "↗ Photo / Video": "↗ รูป / วิดีโอ",
    "Choose a Style": "เลือกสไตล์",
    "Or Choose a Template": "หรือเลือกเทมเพลต",
    "View All ›": "ดูทั้งหมด ›",
    "Create Images": "สร้างภาพ",
    "Design Images": "ออกแบบภาพ",
    "BUILD APP + WEBSITE": "สร้าง APP + เว็บไซต์",
    Dashboard: "แดชบอร์ด",
    Build: "สร้าง",
    "My Creations": "ผลงานของฉัน",
    Templates: "เทมเพลต",
    More: "เพิ่มเติม",
    "Secure Verification": "ยืนยันตัวตนอย่างปลอดภัย",
    "Enter your code": "กรอกรหัสของคุณ",
    "Verify & Continue": "ยืนยันและดำเนินการต่อ",
    "Become Pro": "อัปเกรดเป็น Pro",
  },
  vi: {
    "Build App Web & Game": "Tạo App, Web & Game",
    "3-in-1 AI Creation Platform": "Nền tảng sáng tạo AI 3-trong-1",
    "Create Anything. From One Idea.": "Tạo mọi thứ từ một ý tưởng.",
    "Describe the App & Website you want to build": "Mô tả App và website bạn muốn tạo",
    "✦ Improve Prompt": "✦ Cải thiện Prompt",
    "Ṫ Text to App": "Ṫ Văn bản thành App",
    "▧ Upload Ref": "▧ Tải tài liệu tham khảo",
    "◉ Voice Idea": "◉ Ý tưởng bằng giọng nói",
    "↗ Photo / Video": "↗ Ảnh / Video",
    "Choose a Style": "Chọn phong cách",
    "Or Choose a Template": "Hoặc chọn mẫu",
    "View All ›": "Xem tất cả ›",
    "Create Images": "Tạo hình ảnh",
    "Design Images": "Thiết kế hình ảnh",
    "BUILD APP + WEBSITE": "TẠO APP + WEBSITE",
    Dashboard: "Bảng điều khiển",
    Build: "Tạo",
    "My Creations": "Sản phẩm của tôi",
    Templates: "Mẫu",
    More: "Thêm",
    "Secure Verification": "Xác minh an toàn",
    "Enter your code": "Nhập mã của bạn",
    "Verify & Continue": "Xác minh & Tiếp tục",
    "Become Pro": "Nâng cấp Pro",
  },
  es: {
    "Build App Web & Game": "Crea App, Web y Game",
    "3-in-1 AI Creation Platform": "Plataforma de creación con IA 3-en-1",
    "Create Anything. From One Idea.": "Crea cualquier cosa desde una sola idea.",
    "Describe the App & Website you want to build": "Describe la App y el sitio web que quieres crear",
    "✦ Improve Prompt": "✦ Mejorar prompt",
    "Ṫ Text to App": "Ṫ Texto a App",
    "▧ Upload Ref": "▧ Subir referencia",
    "◉ Voice Idea": "◉ Idea por voz",
    "↗ Photo / Video": "↗ Foto / Video",
    "Choose a Style": "Elige un estilo",
    "Customer colors can change later": "Los colores de marca pueden cambiarse después",
    "Or Choose a Template": "O elige una plantilla",
    "View All ›": "Ver todo ›",
    "Create Images": "Crear imágenes",
    "Design Images": "Diseñar imágenes",
    "BUILD APP + WEBSITE": "CREAR APP + SITIO WEB",
    Dashboard: "Panel",
    Build: "Crear",
    "My Creations": "Mis creaciones",
    Templates: "Plantillas",
    More: "Más",
    "Secure Verification": "Verificación segura",
    "Enter your code": "Introduce tu código",
    "Verify & Continue": "Verificar y continuar",
    "Please verify your account first.": "Verifica tu cuenta primero.",
    "Game creation is a Pro feature. Become Pro to continue.": "La creación de juegos es una función Pro. Pásate a Pro para continuar.",
    "Become Pro": "Pasar a Pro",
  },
};

const PLACEHOLDERS = {
  "Example: Build a property CRM App and a customer Website for my real estate business…": {
    "zh-CN": "例如：为我的房地产公司制作客户 CRM App 和客户网站…",
    "zh-TW": "例如：為我的房地產公司製作客戶 CRM App 和客戶網站…",
    ms: "Contoh: Bina App CRM hartanah dan laman web pelanggan untuk perniagaan saya…",
    id: "Contoh: Buat App CRM properti dan website pelanggan untuk bisnis saya…",
    ja: "例：不動産事業向けの顧客CRM AppとWebサイトを作成…",
    ko: "예: 부동산 비즈니스를 위한 고객 CRM App과 웹사이트 만들기…",
    th: "ตัวอย่าง: สร้าง App CRM อสังหาฯ และเว็บไซต์ลูกค้าสำหรับธุรกิจของฉัน…",
    vi: "Ví dụ: Tạo App CRM bất động sản và website khách hàng cho doanh nghiệp của tôi…",
    es: "Ejemplo: Crea una App CRM inmobiliaria y un sitio web para clientes…",
  },
};

function normalizeLanguage(value) {
  const lang = String(value || "").toLowerCase();
  if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk") || lang.startsWith("zh-hant")) return "zh-TW";
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("ms")) return "ms";
  if (lang.startsWith("id")) return "id";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("th")) return "th";
  if (lang.startsWith("vi")) return "vi";
  if (lang.startsWith("es")) return "es";
  return "en";
}

function translatedValue(source, lang) {
  if (lang === "en") return source;
  return TRANSLATIONS[lang]?.[source] || source;
}

const originalText = new WeakMap();
const originalPlaceholder = new WeakMap();

function translateTextNode(node, lang) {
  if (!originalText.has(node)) {
    const raw = node.nodeValue || "";
    const trimmed = raw.trim();
    if (!trimmed || !ENGLISH[trimmed]) return;
    originalText.set(node, { raw, key: trimmed });
  }
  const record = originalText.get(node);
  const next = translatedValue(record.key, lang);
  const leading = record.raw.match(/^\s*/)?.[0] || "";
  const trailing = record.raw.match(/\s*$/)?.[0] || "";
  node.nodeValue = `${leading}${next}${trailing}`;
}

function translatePlaceholder(el, lang) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  if (!originalPlaceholder.has(el)) {
    const placeholder = el.getAttribute("placeholder") || "";
    if (!PLACEHOLDERS[placeholder]) return;
    originalPlaceholder.set(el, placeholder);
  }
  const source = originalPlaceholder.get(el);
  el.setAttribute("placeholder", lang === "en" ? source : PLACEHOLDERS[source]?.[lang] || source);
}

function translateTree(root, lang) {
  if (!root) return;
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"].includes(parent.tagName)) continue;
    translateTextNode(node, lang);
  }
  if (root.querySelectorAll) {
    for (const el of root.querySelectorAll("input[placeholder],textarea[placeholder]")) translatePlaceholder(el, lang);
  }
  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) translatePlaceholder(root, lang);
}

function languageCssVars(lang) {
  const map = TRANSLATIONS[lang] || {};
  const root = document.documentElement;
  const quote = (value) => `"${String(value).replaceAll('"', '\\"')}"`;
  root.style.setProperty("--laneriq-i18n-hero", quote(map["Build App Web & Game"] || ENGLISH["Build App Web & Game"]));
  root.style.setProperty("--laneriq-i18n-platform", quote(map["3-in-1 AI Creation Platform"] || ENGLISH["3-in-1 AI Creation Platform"]));
  root.style.setProperty("--laneriq-i18n-idea", quote(map["Create Anything. From One Idea."] || ENGLISH["Create Anything. From One Idea."]));
  root.style.setProperty("--laneriq-i18n-powered", quote(map["Powered by"] || ENGLISH["Powered by"]));
}

export default function LanguageRuntime() {
  const [language, setLanguage] = useState("en");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    let next = "en";
    try {
      next = normalizeLanguage(localStorage.getItem(STORAGE_KEY) || navigator.language || "en");
    } catch {}
    setLanguage(next);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(STORAGE_KEY, language); } catch {}
    document.documentElement.lang = language;
    document.documentElement.dataset.laneriqLang = language;
    languageCssVars(language);
    translateTree(document.body, language);

    observerRef.current?.disconnect();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTextNode(mutation.target, language);
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
          else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node, language);
        }
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    observerRef.current = observer;
    window.__LANERIQ_LANGUAGE__ = language;
    window.dispatchEvent(new CustomEvent("laneriq-language-change", { detail: { language } }));
    return () => observer.disconnect();
  }, [language, mounted]);

  const current = useMemo(() => SUPPORTED_LANGUAGES.find((item) => item.code === language) || SUPPORTED_LANGUAGES[0], [language]);
  const topActions = mounted ? document.querySelector(".premiumHome .topActions") : null;

  const button = (
    <button className={`laneriqLangButton ${topActions ? "inline" : "floating"}`} onClick={() => setOpen(true)} aria-label="Change language">
      <span>🌐</span><b>{current.short}</b>
    </button>
  );

  return (
    <>
      {topActions ? createPortal(button, topActions) : button}
      {open && createPortal(
        <div className="laneriqLangBackdrop" onClick={() => setOpen(false)}>
          <section className="laneriqLangSheet" onClick={(event) => event.stopPropagation()} aria-label="Language">
            <header><div><small>LANERIQ AI</small><h2>Language</h2></div><button onClick={() => setOpen(false)}>×</button></header>
            <div className="laneriqLangGrid">
              {SUPPORTED_LANGUAGES.map((item) => (
                <button key={item.code} className={language === item.code ? "active" : ""} onClick={() => { setLanguage(item.code); setOpen(false); }}>
                  <b>{item.short}</b><span>{item.label}</span>{language === item.code && <em>✓</em>}
                </button>
              ))}
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
