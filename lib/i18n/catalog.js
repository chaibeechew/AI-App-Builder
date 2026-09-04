export const I18N_STORAGE_KEY = "laneriq-language";

export const LANGUAGE_DEFINITIONS = Object.freeze([
  { code:"en", short:"EN", label:"English", dir:"ltr" },
  { code:"zh-CN", short:"简", label:"简体中文", dir:"ltr" },
  { code:"zh-TW", short:"繁", label:"繁體中文", dir:"ltr" },
  { code:"ms", short:"BM", label:"Bahasa Melayu", dir:"ltr" },
  { code:"id", short:"ID", label:"Bahasa Indonesia", dir:"ltr" },
  { code:"ja", short:"日", label:"日本語", dir:"ltr" },
  { code:"ko", short:"한", label:"한국어", dir:"ltr" },
  { code:"th", short:"TH", label:"ไทย", dir:"ltr" },
  { code:"vi", short:"VI", label:"Tiếng Việt", dir:"ltr" },
  { code:"es", short:"ES", label:"Español", dir:"ltr" },
]);

export const SUPPORTED_LANGUAGE_CODES = Object.freeze(LANGUAGE_DEFINITIONS.map(item=>item.code));
const NON_ENGLISH_CODES = SUPPORTED_LANGUAGE_CODES.filter(code=>code!=="en");

const rows = {
  "Build App • Game • Web": ["制作 App • 游戏 • 网站","製作 App • 遊戲 • 網站","Bina App • Game • Web","Buat App • Game • Web","App • ゲーム • Webを制作","App • 게임 • 웹 제작","สร้าง App • เกม • เว็บ","Tạo App • Game • Web","Crea App • Juego • Web"],
  "Tell LANERIQ AI what you want to create.": ["告诉 LANERIQ AI 你想创造什么。","告訴 LANERIQ AI 你想創造什麼。","Beritahu LANERIQ AI apa yang anda mahu cipta.","Beri tahu LANERIQ AI apa yang ingin Anda buat.","LANERIQ AIに作りたいものを伝えてください。","LANERIQ AI에게 만들고 싶은 것을 알려주세요.","บอก LANERIQ AI ว่าคุณต้องการสร้างอะไร","Hãy cho LANERIQ AI biết bạn muốn tạo gì.","Dile a LANERIQ AI qué quieres crear."],
  "Powered by": ["由","由","Dikuasakan oleh","Didukung oleh","提供","제공","ขับเคลื่อนโดย","Được hỗ trợ bởi","Impulsado por"],
  "Tell LANERIQ AI what you want to build": ["告诉 LANERIQ AI 你想制作什么","告訴 LANERIQ AI 你想製作什麼","Beritahu LANERIQ AI apa yang anda mahu bina","Beri tahu LANERIQ AI apa yang ingin Anda buat","LANERIQ AIに作りたいものを伝えてください","LANERIQ AI에게 만들고 싶은 것을 알려주세요","บอก LANERIQ AI ว่าคุณต้องการสร้างอะไร","Hãy cho LANERIQ AI biết bạn muốn xây dựng gì","Dile a LANERIQ AI qué quieres crear"],
  "Ṫ Text Idea": ["Ṫ 文字想法","Ṫ 文字想法","Ṫ Idea Teks","Ṫ Ide Teks","Ṫ テキストアイデア","Ṫ 텍스트 아이디어","Ṫ ไอเดียข้อความ","Ṫ Ý tưởng văn bản","Ṫ Idea por texto"],
  "✦ Credits": ["✦ 点数","✦ 點數","✦ Kredit","✦ Kredit","✦ クレジット","✦ 크레딧","✦ เครดิต","✦ Điểm","✦ Créditos"],
  "My projects": ["我的项目","我的專案","Projek saya","Proyek saya","マイプロジェクト","내 프로젝트","โปรเจกต์ของฉัน","Dự án của tôi","Mis proyectos"],
  "Create Image": ["生成图片","生成圖片","Cipta Imej","Buat Gambar","画像を生成","이미지 생성","สร้างภาพ","Tạo hình ảnh","Crear imagen"],
  "Turn ideas into visuals with AI": ["用 AI 将想法变成视觉作品","用 AI 將想法變成視覺作品","Tukar idea menjadi visual dengan AI","Ubah ide menjadi visual dengan AI","AIでアイデアをビジュアルに","AI로 아이디어를 비주얼로 전환","เปลี่ยนไอเดียเป็นภาพด้วย AI","Biến ý tưởng thành hình ảnh với AI","Convierte ideas en imágenes con IA"],
  "Design UI": ["设计 UI","設計 UI","Reka UI","Desain UI","UIをデザイン","UI 디자인","ออกแบบ UI","Thiết kế UI","Diseñar UI"],
  "Craft layouts and visuals with AI": ["用 AI 设计版面与视觉","用 AI 設計版面與視覺","Reka susun atur dan visual dengan AI","Rancang tata letak dan visual dengan AI","AIでレイアウトとビジュアルを設計","AI로 레이아웃과 비주얼 디자인","ออกแบบเลย์เอาต์และภาพด้วย AI","Thiết kế bố cục và hình ảnh bằng AI","Diseña layouts y visuales con IA"],
  "Choose a Template": ["选择模板","選擇範本","Pilih Templat","Pilih Template","テンプレートを選択","템플릿 선택","เลือกเทมเพลต","Chọn mẫu","Elige una plantilla"],
  "BUILD APP • GAME • WEB": ["制作 APP • 游戏 • 网站","製作 APP • 遊戲 • 網站","BINA APP • GAME • WEB","BUAT APP • GAME • WEB","APP • ゲーム • WEBを制作","APP • 게임 • 웹 제작","สร้าง APP • เกม • เว็บ","TẠO APP • GAME • WEB","CREAR APP • JUEGO • WEB"],
  "Home": ["首页","首頁","Utama","Beranda","ホーム","홈","หน้าแรก","Trang chủ","Inicio"],
  "Projects": ["项目","專案","Projek","Proyek","プロジェクト","프로젝트","โปรเจกต์","Dự án","Proyectos"],
  "Create": ["创建","建立","Cipta","Buat","作成","만들기","สร้าง","Tạo","Crear"],
  "Describe the App & Website you want to build": ["描述你想制作的 App 与网站","描述你想製作的 App 與網站","Terangkan App & laman web yang anda mahu bina","Jelaskan App & website yang ingin Anda buat","作りたいAppとWebサイトを説明してください","만들고 싶은 App과 웹사이트를 설명하세요","อธิบาย App และเว็บไซต์ที่คุณต้องการสร้าง","Mô tả App và website bạn muốn tạo","Describe la App y el sitio web que quieres crear"],
  "✦ Improve Prompt": ["✦ 优化提示词","✦ 優化提示詞","✦ Perbaik Prompt","✦ Tingkatkan Prompt","✦ プロンプト改善","✦ 프롬프트 개선","✦ ปรับปรุง Prompt","✦ Cải thiện Prompt","✦ Mejorar prompt"],
  "Ṫ Text to App": ["Ṫ 文字生成 App","Ṫ 文字生成 App","Ṫ Teks ke App","Ṫ Teks ke App","Ṫ テキストからApp","Ṫ 텍스트로 App","Ṫ ข้อความเป็น App","Ṫ Văn bản thành App","Ṫ Texto a App"],
  "▧ Upload Ref": ["▧ 上传参考","▧ 上傳參考","▧ Muat Naik Rujukan","▧ Unggah Referensi","▧ 参考資料をアップロード","▧ 참고자료 업로드","▧ อัปโหลดตัวอย่าง","▧ Tải tài liệu tham khảo","▧ Subir referencia"],
  "◉ Voice Idea": ["◉ 语音想法","◉ 語音想法","◉ Idea Suara","◉ Ide Suara","◉ 音声アイデア","◉ 음성 아이디어","◉ ไอเดียด้วยเสียง","◉ Ý tưởng bằng giọng nói","◉ Idea por voz"],
  "↗ Photo / Video": ["↗ 照片 / 视频","↗ 照片 / 影片","↗ Foto / Video","↗ Foto / Video","↗ 写真 / 動画","↗ 사진 / 동영상","↗ รูป / วิดีโอ","↗ Ảnh / Video","↗ Foto / Video"],
  "Choose a Style": ["选择风格","選擇風格","Pilih Gaya","Pilih Gaya","スタイルを選択","스타일 선택","เลือกสไตล์","Chọn phong cách","Elige un estilo"],
  "Customer colors can change later": ["稍后可更改品牌颜色","稍後可更改品牌顏色","Warna jenama boleh diubah kemudian","Warna merek dapat diubah nanti","ブランドカラーは後で変更できます","브랜드 색상은 나중에 변경 가능","เปลี่ยนสีแบรนด์ภายหลังได้","Có thể đổi màu thương hiệu sau","Los colores de marca pueden cambiarse después"],
  "Or Choose a Template": ["或选择模板","或選擇範本","Atau Pilih Templat","Atau Pilih Template","またはテンプレートを選択","또는 템플릿 선택","หรือเลือกเทมเพลต","Hoặc chọn mẫu","O elige una plantilla"],
  "View All ›": ["查看全部 ›","查看全部 ›","Lihat Semua ›","Lihat Semua ›","すべて表示 ›","모두 보기 ›","ดูทั้งหมด ›","Xem tất cả ›","Ver todo ›"],
  "Create Images": ["生成图片","生成圖片","Cipta Imej","Buat Gambar","画像を生成","이미지 생성","สร้างภาพ","Tạo hình ảnh","Crear imágenes"],
  "Design Images": ["设计图片","設計圖片","Reka Imej","Desain Gambar","画像をデザイン","이미지 디자인","ออกแบบภาพ","Thiết kế hình ảnh","Diseñar imágenes"],
  "BUILD APP + WEBSITE": ["制作 APP + 网站","製作 APP + 網站","BINA APP + LAMAN WEB","BUAT APP + WEBSITE","APP + WEBサイトを制作","APP + 웹사이트 제작","สร้าง APP + เว็บไซต์","TẠO APP + WEBSITE","CREAR APP + SITIO WEB"],
  "Dashboard": ["控制台","控制台","Papan Pemuka","Dasbor","ダッシュボード","대시보드","แดชบอร์ด","Bảng điều khiển","Panel"],
  "Build": ["制作","製作","Bina","Buat","制作","제작","สร้าง","Tạo","Crear"],
  "My Creations": ["我的作品","我的作品","Ciptaan Saya","Kreasi Saya","マイ作品","내 작품","ผลงานของฉัน","Sản phẩm của tôi","Mis creaciones"],
  "Templates": ["模板","範本","Templat","Template","テンプレート","템플릿","เทมเพลต","Mẫu","Plantillas"],
  "More": ["更多","更多","Lagi","Lainnya","その他","더보기","เพิ่มเติม","Thêm","Más"],
  "Checking your session…": ["正在检查登录状态…","正在檢查登入狀態…","Memeriksa sesi anda…","Memeriksa sesi Anda…","セッションを確認中…","세션 확인 중…","กำลังตรวจสอบเซสชัน…","Đang kiểm tra phiên đăng nhập…","Comprobando tu sesión…"],
  "Secure sign in": ["安全登录","安全登入","Log masuk selamat","Masuk aman","安全なログイン","안전한 로그인","เข้าสู่ระบบอย่างปลอดภัย","Đăng nhập an toàn","Inicio de sesión seguro"],
  "CREATE WITHOUT LIMITS": ["无限创造","無限創作","CIPTA TANPA HAD","CIPTAKAN TANPA BATAS","制限なく創造","제한 없이 제작","สร้างสรรค์ได้ไม่จำกัด","SÁNG TẠO KHÔNG GIỚI HẠN","CREA SIN LÍMITES"],
  "One code.": ["一个验证码。","一個驗證碼。","Satu kod.","Satu kode.","コードひとつ。","코드 하나.","รหัสเดียว","Một mã.","Un código."],
  "Your whole studio.": ["进入你的完整创作室。","進入你的完整創作室。","Seluruh studio anda.","Seluruh studio Anda.","スタジオ全体へ。","전체 스튜디오로.","เข้าถึงทั้งสตูดิโอ","Toàn bộ studio của bạn.","Todo tu estudio."],
  "Sign in once, then continue creating apps, websites and mobile games in the same premium workspace.": ["登录一次，即可在同一个高级工作区继续制作 App、网站和手机游戏。","登入一次，即可在同一個高級工作區繼續製作 App、網站和手機遊戲。","Log masuk sekali, kemudian terus cipta App, laman web dan game mudah alih dalam ruang kerja premium yang sama.","Masuk sekali, lalu lanjutkan membuat App, website, dan game seluler di ruang kerja premium yang sama.","一度ログインすれば、同じプレミアムワークスペースでApp、Webサイト、モバイルゲームを作り続けられます。","한 번 로그인하면 같은 프리미엄 작업 공간에서 App, 웹사이트, 모바일 게임을 계속 만들 수 있습니다.","เข้าสู่ระบบครั้งเดียว แล้วสร้าง App เว็บไซต์ และเกมมือถือได้ต่อในพื้นที่ทำงานพรีเมียมเดียวกัน","Đăng nhập một lần rồi tiếp tục tạo App, website và game di động trong cùng không gian cao cấp.","Inicia sesión una vez y sigue creando Apps, sitios web y juegos móviles en el mismo espacio premium."],
  "Private project access · passwordless verification": ["私人项目访问 · 无密码验证","私人專案存取 · 無密碼驗證","Akses projek peribadi · pengesahan tanpa kata laluan","Akses proyek privat · verifikasi tanpa kata sandi","非公開プロジェクトアクセス · パスワードレス認証","비공개 프로젝트 접근 · 비밀번호 없는 인증","เข้าถึงโปรเจกต์ส่วนตัว · ยืนยันแบบไม่ใช้รหัสผ่าน","Truy cập dự án riêng tư · xác minh không mật khẩu","Acceso privado al proyecto · verificación sin contraseña"],
  "SECURE VERIFICATION": ["安全验证","安全驗證","PENGESAHAN SELAMAT","VERIFIKASI AMAN","安全な認証","보안 인증","การยืนยันอย่างปลอดภัย","XÁC MINH AN TOÀN","VERIFICACIÓN SEGURA"],
  "Enter your code": ["输入验证码","輸入驗證碼","Masukkan kod anda","Masukkan kode Anda","認証コードを入力","인증 코드 입력","กรอกรหัสของคุณ","Nhập mã của bạn","Introduce tu código"],
  "Welcome back": ["欢迎回来","歡迎回來","Selamat kembali","Selamat datang kembali","おかえりなさい","다시 오신 것을 환영합니다","ยินดีต้อนรับกลับ","Chào mừng trở lại","Bienvenido de nuevo"],
  "Email Code": ["邮箱验证码","電郵驗證碼","Kod E-mel","Kode Email","メールコード","이메일 코드","รหัสอีเมล","Mã email","Código por email"],
  "SMS Code": ["短信验证码","簡訊驗證碼","Kod SMS","Kode SMS","SMSコード","SMS 코드","รหัส SMS","Mã SMS","Código SMS"],
  "READY": ["可用","可用","SEDIA","SIAP","利用可能","사용 가능","พร้อม","SẴN SÀNG","LISTO"],
  "SOON": ["即将开放","即將開放","AKAN DATANG","SEGERA","近日公開","곧 제공","เร็ว ๆ นี้","SẮP CÓ","PRONTO"],
  "Email address": ["邮箱地址","電郵地址","Alamat e-mel","Alamat email","メールアドレス","이메일 주소","อีเมล","Địa chỉ email","Correo electrónico"],
  "Mobile number": ["手机号码","手機號碼","Nombor mudah alih","Nomor ponsel","携帯番号","휴대폰 번호","หมายเลขมือถือ","Số di động","Número de móvil"],
  "Verify & Continue": ["验证并继续","驗證並繼續","Sahkan & Teruskan","Verifikasi & Lanjutkan","認証して続行","인증 후 계속","ยืนยันและดำเนินการต่อ","Xác minh & Tiếp tục","Verificar y continuar"],
  "Resend Code": ["重新发送验证码","重新發送驗證碼","Hantar Semula Kod","Kirim Ulang Kode","コードを再送","코드 다시 보내기","ส่งรหัสอีกครั้ง","Gửi lại mã","Reenviar código"],
  "Encrypted session": ["加密会话","加密工作階段","Sesi disulitkan","Sesi terenkripsi","暗号化セッション","암호화된 세션","เซสชันเข้ารหัส","Phiên được mã hóa","Sesión cifrada"],
  "One-time code": ["一次性验证码","一次性驗證碼","Kod sekali guna","Kode sekali pakai","ワンタイムコード","일회용 코드","รหัสใช้ครั้งเดียว","Mã dùng một lần","Código de un solo uso"],
  "Rate-limit aware": ["具备频率限制保护","具備頻率限制保護","Dilindungi had kadar","Dilindungi batas laju","レート制限対応","요청 제한 보호","รองรับการจำกัดอัตรา","Có bảo vệ giới hạn tần suất","Con control de frecuencia"],
  "Reference. Reimagine. Build something original.": ["参考、重构、创造原创作品。","參考、重構、創造原創作品。","Rujuk. Bayangkan semula. Bina sesuatu yang asli.","Referensi. Bayangkan ulang. Buat sesuatu yang orisinal.","参考し、再構想し、オリジナルを作る。","참고하고 재해석해 독창적으로 만드세요.","อ้างอิง ตีความใหม่ และสร้างสิ่งที่เป็นต้นฉบับ","Tham khảo. Tái tưởng tượng. Tạo điều nguyên bản.","Referencia. Reimagina. Crea algo original."],
  "Create from scratch →": ["从零开始制作 →","從零開始製作 →","Cipta dari awal →","Buat dari awal →","ゼロから作る →","처음부터 만들기 →","สร้างตั้งแต่ต้น →","Tạo từ đầu →","Crear desde cero →"],
  "🔥 Trending 100": ["🔥 热门 100","🔥 熱門 100","🔥 100 Trending","🔥 100 Tren","🔥 トレンド100","🔥 인기 100","🔥 เทรนด์ 100","🔥 100 xu hướng","🔥 100 tendencias"],
  "All Inspirations": ["全部灵感","全部靈感","Semua Inspirasi","Semua Inspirasi","すべてのアイデア","모든 영감","แรงบันดาลใจทั้งหมด","Tất cả cảm hứng","Todas las inspiraciones"],
  "All industries": ["全部行业","全部行業","Semua industri","Semua industri","すべての業界","모든 산업","ทุกอุตสาหกรรม","Tất cả ngành","Todas las industrias"],
  "All styles": ["全部风格","全部風格","Semua gaya","Semua gaya","すべてのスタイル","모든 스타일","ทุกสไตล์","Tất cả phong cách","Todos los estilos"],
  "AI Reimagine →": ["AI 重新创作 →","AI 重新創作 →","AI Bayangkan Semula →","AI Bayangkan Ulang →","AIで再構想 →","AI 재해석 →","AI ตีความใหม่ →","AI Tái tưởng tượng →","Reimaginar con IA →"],
  "Reference only · AI will reimagine the structure, visuals and copy.": ["仅作参考 · AI 会重新构思结构、视觉与文案。","僅供參考 · AI 會重新構思結構、視覺與文案。","Rujukan sahaja · AI akan membayangkan semula struktur, visual dan teks.","Hanya referensi · AI akan membayangkan ulang struktur, visual, dan teks.","参考専用 · AIが構成、ビジュアル、コピーを再構想します。","참고 전용 · AI가 구조, 비주얼, 문구를 재해석합니다.","ใช้เป็นข้อมูลอ้างอิงเท่านั้น · AI จะตีความโครงสร้าง ภาพ และข้อความใหม่","Chỉ tham khảo · AI sẽ tái tưởng tượng cấu trúc, hình ảnh và nội dung.","Solo referencia · la IA reimaginará la estructura, los elementos visuales y el texto."],
  "No inspiration matched these filters. Try a broader search.": ["没有符合筛选条件的灵感，请扩大搜索范围。","沒有符合篩選條件的靈感，請擴大搜尋範圍。","Tiada inspirasi sepadan. Cuba carian yang lebih luas.","Tidak ada inspirasi yang cocok. Coba pencarian yang lebih luas.","条件に合うアイデアがありません。検索範囲を広げてください。","조건에 맞는 항목이 없습니다. 더 넓게 검색해 보세요.","ไม่พบแรงบันดาลใจที่ตรงกับตัวกรอง ลองค้นหาให้กว้างขึ้น","Không có cảm hứng phù hợp. Hãy thử tìm kiếm rộng hơn.","No hay inspiraciones que coincidan. Amplía la búsqueda."],
  "Language": ["语言","語言","Bahasa","Bahasa","言語","언어","ภาษา","Ngôn ngữ","Idioma"],
  "Change language": ["切换语言","切換語言","Tukar bahasa","Ubah bahasa","言語を変更","언어 변경","เปลี่ยนภาษา","Đổi ngôn ngữ","Cambiar idioma"],
};

export const UI_TRANSLATIONS = Object.freeze(Object.fromEntries(Object.entries(rows).map(([english,values])=>[
  english,
  Object.freeze({ en:english, ...Object.fromEntries(NON_ENGLISH_CODES.map((code,index)=>[code,values[index]])) })
])));

export const HERO_TRANSLATIONS = Object.freeze({
  en:["Build App Web & Game","3-in-1 AI Creation Platform","Create Anything. From One Idea.","Powered by"],
  "zh-CN":["制作 App、网站与游戏","三合一 AI 创作平台","一个想法，创造一切。","由"],
  "zh-TW":["製作 App、網站與遊戲","三合一 AI 創作平台","一個想法，創造一切。","由"],
  ms:["Bina App, Web & Game","Platform Ciptaan AI 3-dalam-1","Cipta apa sahaja daripada satu idea.","Dikuasakan oleh"],
  id:["Buat App, Web & Game","Platform Kreasi AI 3-dalam-1","Ciptakan apa saja dari satu ide.","Didukung oleh"],
  ja:["App・Web・Gameを制作","3-in-1 AI制作プラットフォーム","ひとつのアイデアから、すべてを創る。","Powered by"],
  ko:["App · Web · Game 제작","3-in-1 AI 제작 플랫폼","하나의 아이디어로 무엇이든 만드세요.","Powered by"],
  th:["สร้าง App, Web และ Game","แพลตฟอร์มสร้างสรรค์ AI 3-in-1","สร้างทุกอย่างได้จากไอเดียเดียว","Powered by"],
  vi:["Tạo App, Web & Game","Nền tảng sáng tạo AI 3-trong-1","Tạo mọi thứ từ một ý tưởng.","Powered by"],
  es:["Crea App, Web y Game","Plataforma de creación con IA 3-en-1","Crea cualquier cosa desde una sola idea.","Powered by"],
});

export const ATTRIBUTE_TRANSLATIONS = Object.freeze({
  "Example: Build a property CRM App and a customer Website for my real estate business…": Object.freeze({
    en:"Example: Build a property CRM App and a customer Website for my real estate business…",
    "zh-CN":"例如：为我的房地产公司制作客户 CRM App 和客户网站…","zh-TW":"例如：為我的房地產公司製作客戶 CRM App 和客戶網站…",ms:"Contoh: Bina App CRM hartanah dan laman web pelanggan untuk perniagaan saya…",id:"Contoh: Buat App CRM properti dan website pelanggan untuk bisnis saya…",ja:"例：不動産事業向けの顧客CRM AppとWebサイトを作成…",ko:"예: 부동산 비즈니스를 위한 고객 CRM App과 웹사이트 만들기…",th:"ตัวอย่าง: สร้าง App CRM อสังหาฯ และเว็บไซต์ลูกค้าสำหรับธุรกิจของฉัน…",vi:"Ví dụ: Tạo App CRM bất động sản và website khách hàng cho doanh nghiệp của tôi…",es:"Ejemplo: Crea una App CRM inmobiliaria y un sitio web para clientes…"
  }),
  "Search industry, app type or style…": Object.freeze({
    en:"Search industry, app type or style…","zh-CN":"搜索行业、App 类型或风格…","zh-TW":"搜尋行業、App 類型或風格…",ms:"Cari industri, jenis App atau gaya…",id:"Cari industri, jenis App, atau gaya…",ja:"業界、Appタイプ、スタイルを検索…",ko:"산업, App 유형 또는 스타일 검색…",th:"ค้นหาอุตสาหกรรม ประเภท App หรือสไตล์…",vi:"Tìm ngành, loại App hoặc phong cách…",es:"Busca industria, tipo de App o estilo…"
  }),
});

export const CRITICAL_UI_PHRASES = Object.freeze(Object.keys(UI_TRANSLATIONS));
export const CRITICAL_ATTRIBUTE_PHRASES = Object.freeze(Object.keys(ATTRIBUTE_TRANSLATIONS));

export function normalizeLanguage(value) {
  const lang=String(value||"").trim().toLowerCase();
  if(lang.startsWith("zh-tw")||lang.startsWith("zh-hk")||lang.startsWith("zh-hant"))return"zh-TW";
  if(lang.startsWith("zh"))return"zh-CN";
  for(const code of ["ms","id","ja","ko","th","vi","es"])if(lang.startsWith(code))return code;
  return"en";
}

export function languageDirection(value) {
  const code=normalizeLanguage(value);
  return LANGUAGE_DEFINITIONS.find(item=>item.code===code)?.dir||"ltr";
}

export function translateUiText(source,language) {
  const text=String(source??"");
  const lang=normalizeLanguage(language);
  const exact=UI_TRANSLATIONS[text]?.[lang];
  if(exact)return exact;
  const resend=text.match(/^Resend in (\d+)s$/);
  if(resend){
    const n=resend[1];
    const patterns={en:`Resend in ${n}s`,"zh-CN":`${n} 秒后可重新发送`,"zh-TW":`${n} 秒後可重新發送`,ms:`Hantar semula dalam ${n}s`,id:`Kirim ulang dalam ${n}d`,ja:`${n}秒後に再送`,ko:`${n}초 후 다시 보내기`,th:`ส่งอีกครั้งใน ${n} วินาที`,vi:`Gửi lại sau ${n} giây`,es:`Reenviar en ${n}s`};
    return patterns[lang]||text;
  }
  return text;
}

export function translateAttribute(source,language) {
  const text=String(source??"");
  const lang=normalizeLanguage(language);
  return ATTRIBUTE_TRANSLATIONS[text]?.[lang]||text;
}

export function heroForLanguage(language) {
  return HERO_TRANSLATIONS[normalizeLanguage(language)]||HERO_TRANSLATIONS.en;
}
