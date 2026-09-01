"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "laneriq-language";

export const SUPPORTED_LANGUAGES = [
  ["en", "EN", "English"],
  ["zh-CN", "简", "简体中文"],
  ["zh-TW", "繁", "繁體中文"],
  ["ms", "BM", "Bahasa Melayu"],
  ["id", "ID", "Bahasa Indonesia"],
  ["ja", "日", "日本語"],
  ["ko", "한", "한국어"],
  ["th", "TH", "ไทย"],
  ["vi", "VI", "Tiếng Việt"],
  ["es", "ES", "Español"],
].map(([code, short, label]) => ({ code, short, label }));

const PHRASES = {
  "Describe the App & Website you want to build": {
    "zh-CN":"描述你想制作的 App 与网站","zh-TW":"描述你想製作的 App 與網站",ms:"Terangkan App & laman web yang anda mahu bina",id:"Jelaskan App & website yang ingin Anda buat",ja:"作りたいAppとWebサイトを説明してください",ko:"만들고 싶은 App과 웹사이트를 설명하세요",th:"อธิบาย App และเว็บไซต์ที่คุณต้องการสร้าง",vi:"Mô tả App và website bạn muốn tạo",es:"Describe la App y el sitio web que quieres crear"
  },
  "✦ Improve Prompt": {"zh-CN":"✦ 优化提示词","zh-TW":"✦ 優化提示詞",ms:"✦ Perbaik Prompt",id:"✦ Tingkatkan Prompt",ja:"✦ プロンプト改善",ko:"✦ 프롬프트 개선",th:"✦ ปรับปรุง Prompt",vi:"✦ Cải thiện Prompt",es:"✦ Mejorar prompt"},
  "Ṫ Text to App": {"zh-CN":"Ṫ 文字生成 App","zh-TW":"Ṫ 文字生成 App",ms:"Ṫ Teks ke App",id:"Ṫ Teks ke App",ja:"Ṫ テキストからApp",ko:"Ṫ 텍스트로 App",th:"Ṫ ข้อความเป็น App",vi:"Ṫ Văn bản thành App",es:"Ṫ Texto a App"},
  "▧ Upload Ref": {"zh-CN":"▧ 上传参考","zh-TW":"▧ 上傳參考",ms:"▧ Muat Naik Rujukan",id:"▧ Unggah Referensi",ja:"▧ 参考資料をアップロード",ko:"▧ 참고자료 업로드",th:"▧ อัปโหลดตัวอย่าง",vi:"▧ Tải tài liệu tham khảo",es:"▧ Subir referencia"},
  "◉ Voice Idea": {"zh-CN":"◉ 语音想法","zh-TW":"◉ 語音想法",ms:"◉ Idea Suara",id:"◉ Ide Suara",ja:"◉ 音声アイデア",ko:"◉ 음성 아이디어",th:"◉ ไอเดียด้วยเสียง",vi:"◉ Ý tưởng bằng giọng nói",es:"◉ Idea por voz"},
  "↗ Photo / Video": {"zh-CN":"↗ 照片 / 视频","zh-TW":"↗ 照片 / 影片",ms:"↗ Foto / Video",id:"↗ Foto / Video",ja:"↗ 写真 / 動画",ko:"↗ 사진 / 동영상",th:"↗ รูป / วิดีโอ",vi:"↗ Ảnh / Video",es:"↗ Foto / Video"},
  "Choose a Style": {"zh-CN":"选择风格","zh-TW":"選擇風格",ms:"Pilih Gaya",id:"Pilih Gaya",ja:"スタイルを選択",ko:"스타일 선택",th:"เลือกสไตล์",vi:"Chọn phong cách",es:"Elige un estilo"},
  "Customer colors can change later": {"zh-CN":"稍后可更改品牌颜色","zh-TW":"稍後可更改品牌顏色",ms:"Warna jenama boleh diubah kemudian",id:"Warna merek dapat diubah nanti",ja:"ブランドカラーは後で変更できます",ko:"브랜드 색상은 나중에 변경 가능",th:"เปลี่ยนสีแบรนด์ภายหลังได้",vi:"Có thể đổi màu thương hiệu sau",es:"Los colores de marca pueden cambiarse después"},
  "Or Choose a Template": {"zh-CN":"或选择模板","zh-TW":"或選擇範本",ms:"Atau Pilih Templat",id:"Atau Pilih Template",ja:"またはテンプレートを選択",ko:"또는 템플릿 선택",th:"หรือเลือกเทมเพลต",vi:"Hoặc chọn mẫu",es:"O elige una plantilla"},
  "View All ›": {"zh-CN":"查看全部 ›","zh-TW":"查看全部 ›",ms:"Lihat Semua ›",id:"Lihat Semua ›",ja:"すべて表示 ›",ko:"모두 보기 ›",th:"ดูทั้งหมด ›",vi:"Xem tất cả ›",es:"Ver todo ›"},
  "Create Images": {"zh-CN":"生成图片","zh-TW":"生成圖片",ms:"Cipta Imej",id:"Buat Gambar",ja:"画像を生成",ko:"이미지 생성",th:"สร้างภาพ",vi:"Tạo hình ảnh",es:"Crear imágenes"},
  "Design Images": {"zh-CN":"设计图片","zh-TW":"設計圖片",ms:"Reka Imej",id:"Desain Gambar",ja:"画像をデザイン",ko:"이미지 디자인",th:"ออกแบบภาพ",vi:"Thiết kế hình ảnh",es:"Diseñar imágenes"},
  "BUILD APP + WEBSITE": {"zh-CN":"制作 APP + 网站","zh-TW":"製作 APP + 網站",ms:"BINA APP + LAMAN WEB",id:"BUAT APP + WEBSITE",ja:"APP + WEBサイトを制作",ko:"APP + 웹사이트 제작",th:"สร้าง APP + เว็บไซต์",vi:"TẠO APP + WEBSITE",es:"CREAR APP + SITIO WEB"},
  Dashboard: {"zh-CN":"控制台","zh-TW":"控制台",ms:"Papan Pemuka",id:"Dasbor",ja:"ダッシュボード",ko:"대시보드",th:"แดชบอร์ด",vi:"Bảng điều khiển",es:"Panel"},
  Build: {"zh-CN":"制作","zh-TW":"製作",ms:"Bina",id:"Buat",ja:"制作",ko:"제작",th:"สร้าง",vi:"Tạo",es:"Crear"},
  "My Creations": {"zh-CN":"我的作品","zh-TW":"我的作品",ms:"Ciptaan Saya",id:"Kreasi Saya",ja:"マイ作品",ko:"내 작품",th:"ผลงานของฉัน",vi:"Sản phẩm của tôi",es:"Mis creaciones"},
  Templates: {"zh-CN":"模板","zh-TW":"範本",ms:"Templat",id:"Template",ja:"テンプレート",ko:"템플릿",th:"เทมเพลต",vi:"Mẫu",es:"Plantillas"},
  More: {"zh-CN":"更多","zh-TW":"更多",ms:"Lagi",id:"Lainnya",ja:"その他",ko:"더보기",th:"เพิ่มเติม",vi:"Thêm",es:"Más"},
  "Secure Verification": {"zh-CN":"安全验证","zh-TW":"安全驗證",ms:"Pengesahan Selamat",id:"Verifikasi Aman",ja:"安全な認証",ko:"보안 인증",th:"ยืนยันตัวตนอย่างปลอดภัย",vi:"Xác minh an toàn",es:"Verificación segura"},
  "Enter your code": {"zh-CN":"输入验证码","zh-TW":"輸入驗證碼",ms:"Masukkan kod anda",id:"Masukkan kode Anda",ja:"認証コードを入力",ko:"인증 코드 입력",th:"กรอกรหัสของคุณ",vi:"Nhập mã của bạn",es:"Introduce tu código"},
  "Verify & Continue": {"zh-CN":"验证并继续","zh-TW":"驗證並繼續",ms:"Sahkan & Teruskan",id:"Verifikasi & Lanjutkan",ja:"認証して続行",ko:"인증 후 계속",th:"ยืนยันและดำเนินการต่อ",vi:"Xác minh & Tiếp tục",es:"Verificar y continuar"},
  "Please verify your account first.": {"zh-CN":"请先完成账号验证。","zh-TW":"請先完成帳號驗證。",ms:"Sila sahkan akaun anda dahulu.",id:"Harap verifikasi akun Anda terlebih dahulu.",ja:"先にアカウント認証を完了してください。",ko:"먼저 계정 인증을 완료해 주세요.",th:"โปรดยืนยันบัญชีก่อน",vi:"Vui lòng xác minh tài khoản trước.",es:"Verifica tu cuenta primero."},
  "Become Pro": {"zh-CN":"升级 Pro","zh-TW":"升級 Pro",ms:"Naik Taraf Pro",id:"Upgrade Pro",ja:"Proにアップグレード",ko:"Pro 업그레이드",th:"อัปเกรดเป็น Pro",vi:"Nâng cấp Pro",es:"Pasar a Pro"},
  "Pro Game Creator": {"zh-CN":"Pro 游戏制作器","zh-TW":"Pro 遊戲製作器",ms:"Pencipta Game Pro",id:"Pembuat Game Pro",ja:"Pro Game Creator",ko:"Pro Game Creator",th:"Pro Game Creator",vi:"Pro Game Creator",es:"Creador de Juegos Pro"}
};

const HERO = {
  en:["Build App Web & Game","3-in-1 AI Creation Platform","Create Anything. From One Idea.","Powered by"],
  "zh-CN":["制作 App、网站与游戏","三合一 AI 创作平台","一个想法，创造一切。","由"],
  "zh-TW":["製作 App、網站與遊戲","三合一 AI 創作平台","一個想法，創造一切。","由"],
  ms:["Bina App, Web & Game","Platform Ciptaan AI 3-dalam-1","Cipta apa sahaja daripada satu idea.","Dikuasakan oleh"],
  id:["Buat App, Web & Game","Platform Kreasi AI 3-dalam-1","Ciptakan apa saja dari satu ide.","Didukung oleh"],
  ja:["App・Web・Gameを制作","3-in-1 AI制作プラットフォーム","ひとつのアイデアから、すべてを創る。","Powered by"],
  ko:["App · Web · Game 제작","3-in-1 AI 제작 플랫폼","하나의 아이디어로 무엇이든 만드세요.","Powered by"],
  th:["สร้าง App, Web และ Game","แพลตฟอร์มสร้างสรรค์ AI 3-in-1","สร้างทุกอย่างได้จากไอเดียเดียว","Powered by"],
  vi:["Tạo App, Web & Game","Nền tảng sáng tạo AI 3-trong-1","Tạo mọi thứ từ một ý tưởng.","Powered by"],
  es:["Crea App, Web y Game","Plataforma de creación con IA 3-en-1","Crea cualquier cosa desde una sola idea.","Powered by"]
};

const PLACEHOLDER = "Example: Build a property CRM App and a customer Website for my real estate business…";
const PLACEHOLDERS = {
  "zh-CN":"例如：为我的房地产公司制作客户 CRM App 和客户网站…","zh-TW":"例如：為我的房地產公司製作客戶 CRM App 和客戶網站…",ms:"Contoh: Bina App CRM hartanah dan laman web pelanggan untuk perniagaan saya…",id:"Contoh: Buat App CRM properti dan website pelanggan untuk bisnis saya…",ja:"例：不動産事業向けの顧客CRM AppとWebサイトを作成…",ko:"예: 부동산 비즈니스를 위한 고객 CRM App과 웹사이트 만들기…",th:"ตัวอย่าง: สร้าง App CRM อสังหาฯ และเว็บไซต์ลูกค้าสำหรับธุรกิจของฉัน…",vi:"Ví dụ: Tạo App CRM bất động sản và website khách hàng cho doanh nghiệp của tôi…",es:"Ejemplo: Crea una App CRM inmobiliaria y un sitio web para clientes…"
};

function normalizeLanguage(value) {
  const lang = String(value || "").toLowerCase();
  if (lang.startsWith("zh-tw") || lang.startsWith("zh-hk") || lang.startsWith("zh-hant")) return "zh-TW";
  if (lang.startsWith("zh")) return "zh-CN";
  for (const code of ["ms","id","ja","ko","th","vi","es"]) if (lang.startsWith(code)) return code;
  return "en";
}

const originalText = new WeakMap();
const originalPlaceholder = new WeakMap();

function translateTextNode(node, lang) {
  if (!originalText.has(node)) {
    const raw = node.nodeValue || "";
    const key = raw.trim();
    if (!key || !PHRASES[key]) return;
    originalText.set(node, { raw, key });
  }
  const record = originalText.get(node);
  const translated = lang === "en" ? record.key : PHRASES[record.key]?.[lang] || record.key;
  const leading = record.raw.match(/^\s*/)?.[0] || "";
  const trailing = record.raw.match(/\s*$/)?.[0] || "";
  const desired = `${leading}${translated}${trailing}`;
  if (node.nodeValue !== desired) node.nodeValue = desired;
}

function translatePlaceholder(el, lang) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  if (!originalPlaceholder.has(el)) {
    const source = el.getAttribute("placeholder") || "";
    if (source !== PLACEHOLDER) return;
    originalPlaceholder.set(el, source);
  }
  const source = originalPlaceholder.get(el);
  const desired = lang === "en" ? source : PLACEHOLDERS[lang] || source;
  if (el.getAttribute("placeholder") !== desired) el.setAttribute("placeholder", desired);
}

function translateTree(root, lang) {
  if (!root) return;
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT","STYLE","NOSCRIPT","CODE","PRE"].includes(parent.tagName)) continue;
    translateTextNode(node, lang);
  }
  if (root.querySelectorAll) for (const el of root.querySelectorAll("input[placeholder],textarea[placeholder]")) translatePlaceholder(el, lang);
}

function applyHeroLanguage(lang) {
  const [hero, platform, idea, powered] = HERO[lang] || HERO.en;
  const root = document.documentElement;
  const cssString = (value) => `"${String(value).replaceAll('"','\\"')}"`;
  root.style.setProperty("--laneriq-i18n-hero", cssString(hero));
  root.style.setProperty("--laneriq-i18n-platform", cssString(platform));
  root.style.setProperty("--laneriq-i18n-idea", cssString(idea));
  root.style.setProperty("--laneriq-i18n-powered", cssString(powered));
}

export default function LanguageRuntime() {
  const [language, setLanguage] = useState("en");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    let next = "en";
    try { next = normalizeLanguage(localStorage.getItem(STORAGE_KEY) || navigator.language || "en"); } catch {}
    setLanguage(next);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(STORAGE_KEY, language); } catch {}
    document.documentElement.lang = language;
    document.documentElement.dataset.laneriqLang = language;
    applyHeroLanguage(language);
    translateTree(document.body, language);

    observerRef.current?.disconnect();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language);
          else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node, language);
        }
      }
    });
    observer.observe(document.body, { subtree:true, childList:true });
    observerRef.current = observer;
    window.__LANERIQ_LANGUAGE__ = language;
    window.dispatchEvent(new CustomEvent("laneriq-language-change", { detail:{ language } }));
    return () => observer.disconnect();
  }, [language, mounted]);

  const current = useMemo(() => SUPPORTED_LANGUAGES.find((item) => item.code === language) || SUPPORTED_LANGUAGES[0], [language]);
  const topActions = mounted ? document.querySelector(".premiumHome .topActions") : null;
  const button = <button className={`laneriqLangButton ${topActions ? "inline" : "floating"}`} onClick={() => setOpen(true)} aria-label="Change language"><span>🌐</span><b>{current.short}</b></button>;

  return <>
    {topActions ? createPortal(button, topActions) : button}
    {open && mounted && createPortal(
      <div className="laneriqLangBackdrop" onClick={() => setOpen(false)}>
        <section className="laneriqLangSheet" onClick={(event) => event.stopPropagation()} aria-label="Language">
          <header><div><small>LANERIQ AI</small><h2>Language</h2></div><button onClick={() => setOpen(false)}>×</button></header>
          <div className="laneriqLangGrid">
            {SUPPORTED_LANGUAGES.map((item) => <button key={item.code} className={language === item.code ? "active" : ""} onClick={() => { setLanguage(item.code); setOpen(false); }}><b>{item.short}</b><span>{item.label}</span>{language === item.code && <em>✓</em>}</button>)}
          </div>
        </section>
      </div>, document.body
    )}
  </>;
}
