from pathlib import Path

# Update the canonical 10-language catalog to the approved Login + Templates reference copy.
p = Path('lib/i18n/catalog.js')
s = p.read_text()
auth_anchor = '  "SECURE VERIFICATION": ["安全验证","安全驗證","PENGESAHAN SELAMAT","VERIFIKASI AMAN","安全な認証","보안 인증","การยืนยันอย่างปลอดภัย","XÁC MINH AN TOÀN","VERIFICACIÓN SEGURA"],\n'
auth_rows = (
'  "Enter Your Email": ["输入你的邮箱","輸入你的電郵","Masukkan e-mel anda","Masukkan email Anda","メールアドレスを入力","이메일 주소를 입력하세요","กรอกอีเมลของคุณ","Nhập email của bạn","Introduce tu correo electrónico"],\n'
'  "Check Your Email": ["查看你的邮箱","查看你的電郵","Semak e-mel anda","Periksa email Anda","メールを確認","이메일을 확인하세요","ตรวจสอบอีเมลของคุณ","Kiểm tra email của bạn","Revisa tu correo electrónico"],\n'
'  "A BRIGHTER TOMORROW TOGETHER": ["共创更明亮的明天","共創更明亮的明天","MASA DEPAN LEBIH CERAH BERSAMA","MASA DEPAN LEBIH CERAH BERSAMA","ともに、より明るい未来へ","함께 더 밝은 내일로","สู่วันพรุ่งนี้ที่สดใสไปด้วยกัน","CÙNG NHAU HƯỚNG TỚI NGÀY MAI TƯƠI SÁNG HƠN","JUNTOS HACIA UN MAÑANA MÁS BRILLANTE"],\n'
'  "No paid SMS fallback is used.": ["不使用付费短信备用通道。","不使用付費簡訊備援通道。","Tiada sandaran SMS berbayar digunakan.","Tidak ada fallback SMS berbayar yang digunakan.","有料SMSのフォールバックは使用しません。","유료 SMS 대체 경로를 사용하지 않습니다.","ไม่มีการใช้ SMS แบบเสียค่าใช้จ่ายเป็นทางเลือกสำรอง","Không sử dụng SMS trả phí làm phương án dự phòng.","No se utiliza SMS de pago como alternativa."],\n'
'  "Verify": ["验证","驗證","Sahkan","Verifikasi","認証","인증","ยืนยัน","Xác minh","Verificar"],\n'
)
if '"Enter Your Email":' not in s:
    if auth_anchor not in s:
        raise SystemExit('Canonical auth i18n insertion anchor not found')
    s = s.replace(auth_anchor, auth_anchor + auth_rows, 1)
elif '"Verify":' not in s:
    verify_anchor = '  "Verify & Continue": ["验证并继续","驗證並繼續","Sahkan & Teruskan","Verifikasi & Lanjutkan","認証して続行","인증 후 계속","ยืนยันและดำเนินการต่อ","Xác minh & Tiếp tục","Verificar y continuar"],\n'
    if verify_anchor not in s:
        raise SystemExit('Verify translation insertion anchor not found')
    s = s.replace(verify_anchor, '  "Verify": ["验证","驗證","Sahkan","Verifikasi","認証","인증","ยืนยัน","Xác minh","Verificar"],\n' + verify_anchor, 1)

# Add current Page 8 template surface phrases without retiring compatible historic translation keys.
template_anchor = '  "Reference. Reimagine. Build something original.": ["参考、重构、创造原创作品。","參考、重構、創造原創作品。","Rujuk. Bayangkan semula. Bina sesuatu yang asli.","Referensi. Bayangkan ulang. Buat sesuatu yang orisinal.","参考し、再構想し、オリジナルを作る。","참고하고 재해석해 독창적으로 만드세요.","อ้างอิง ตีความใหม่ และสร้างสิ่งที่เป็นต้นฉบับ","Tham khảo. Tái tưởng tượng. Tạo điều nguyên bản.","Referencia. Reimagina. Crea algo original."],\n'
template_rows = (
'  "✦ Build From Scratch": ["✦ 从零开始制作","✦ 從零開始製作","✦ Bina Dari Awal","✦ Buat Dari Awal","✦ ゼロから作る","✦ 처음부터 만들기","✦ สร้างตั้งแต่ต้น","✦ Tạo Từ Đầu","✦ Crear Desde Cero"],\n'
'  "Trending": ["热门","熱門","Trending","Tren","トレンド","인기","กำลังนิยม","Xu hướng","Tendencias"],\n'
'  "All Templates": ["全部模板","全部範本","Semua Templat","Semua Template","すべてのテンプレート","모든 템플릿","เทมเพลตทั้งหมด","Tất cả mẫu","Todas las plantillas"],\n'
'  "View details →": ["查看详情 →","查看詳情 →","Lihat butiran →","Lihat detail →","詳細を見る →","세부 정보 보기 →","ดูรายละเอียด →","Xem chi tiết →","Ver detalles →"],\n'
'  "Use Template →": ["使用模板 →","使用範本 →","Guna Templat →","Gunakan Template →","テンプレートを使う →","템플릿 사용 →","ใช้เทมเพลต →","Dùng mẫu →","Usar plantilla →"],\n'
'  "AI Reimagine": ["AI 重新创作","AI 重新創作","AI Bayangkan Semula","AI Bayangkan Ulang","AIで再構想","AI 재해석","AI ตีความใหม่","AI Tái tưởng tượng","Reimaginar con IA"],\n'
'  "No template matched these filters. Try a broader search.": ["没有符合筛选条件的模板，请扩大搜索范围。","沒有符合篩選條件的範本，請擴大搜尋範圍。","Tiada templat sepadan dengan penapis ini. Cuba carian yang lebih luas.","Tidak ada template yang cocok dengan filter ini. Coba pencarian yang lebih luas.","条件に合うテンプレートがありません。検索範囲を広げてください。","필터에 맞는 템플릿이 없습니다. 더 넓게 검색해 보세요.","ไม่พบเทมเพลตที่ตรงกับตัวกรอง ลองค้นหาให้กว้างขึ้น","Không có mẫu phù hợp với bộ lọc này. Hãy thử tìm kiếm rộng hơn.","Ninguna plantilla coincide con estos filtros. Prueba una búsqueda más amplia."],\n'
)
if '"✦ Build From Scratch":' not in s:
    if template_anchor not in s:
        raise SystemExit('Template i18n insertion anchor not found')
    s = s.replace(template_anchor, template_rows + template_anchor, 1)

# Retarget the searchable Templates placeholder to the current approved Page 8 field.
old_attr = '"Search industry, app type or style…": Object.freeze({'
new_attr = '"Search template, industry or style…": Object.freeze({'
if old_attr in s:
    s = s.replace(old_attr, new_attr, 1)
    s = s.replace('en:"Search industry, app type or style…"', 'en:"Search template, industry or style…"', 1)

for marker in ['"Enter Your Email":','"Check Your Email":','"A BRIGHTER TOMORROW TOGETHER":','"No paid SMS fallback is used.":','"Verify":','"✦ Build From Scratch":','"Trending":','"All Templates":','"View details →":','"Use Template →":','"AI Reimagine":','"No template matched these filters. Try a broader search.":','"Search template, industry or style…":']:
    if marker not in s:
        raise SystemExit(f'Missing approved i18n row: {marker}')
p.write_text(s)

# Retarget strict source-surface contracts to the user-approved Login and Templates copy.
p = Path('scripts/multilingual-contract-tests.mjs')
s = p.read_text()
auth_old = "  [auth,['Checking your session…','Secure sign in','CREATE WITHOUT LIMITS','One code.','Your whole studio.','SECURE VERIFICATION','Enter your code','Welcome back','Email Code','Email address','Verify & Continue','Resend Code','Encrypted session','One-time code','Rate-limit aware']],"
auth_intermediate = "  [auth,['Checking your session…','Secure sign in','CREATE WITHOUT LIMITS','One code.','Your whole studio.','SECURE VERIFICATION','Enter Your Email','Check Your Email','A BRIGHTER TOMORROW TOGETHER','Email Code','Email address','Verify & Continue','Resend Code','Private project access · passwordless verification','No paid SMS fallback is used.']],"
auth_new = "  [auth,['Checking your session…','Secure sign in','CREATE WITHOUT LIMITS','One code.','Your whole studio.','SECURE VERIFICATION','Enter Your Email','Check Your Email','A BRIGHTER TOMORROW TOGETHER','Email Code','Email address','Verify','Resend Code','Encrypted session','One-time code','Rate-limit aware','Private project access · passwordless verification','No paid SMS fallback is used.']],"
if auth_old in s:
    s = s.replace(auth_old, auth_new, 1)
elif auth_intermediate in s:
    s = s.replace(auth_intermediate, auth_new, 1)
elif auth_new not in s:
    raise SystemExit('Auth required-surface phrase set not found')

templates_old = "  [templates,['Reference. Reimagine. Build something original.','Create from scratch →','🔥 Trending 100','All Inspirations','All industries','All styles','AI Reimagine →','Reference only · AI will reimagine the structure, visuals and copy.','No inspiration matched these filters. Try a broader search.']],"
templates_new = "  [templates,['Templates','✦ Build From Scratch','Trending','All Templates','All industries','All styles','Choose a Style','View details →','Use Template →','AI Reimagine','No template matched these filters. Try a broader search.']],"
if templates_old in s:
    s = s.replace(templates_old, templates_new, 1)
elif templates_new not in s:
    raise SystemExit('Templates required-surface phrase set not found')

for phrase in ['Enter Your Email','Check Your Email','A BRIGHTER TOMORROW TOGETHER','Verify','Resend Code','Encrypted session','One-time code','Rate-limit aware','No paid SMS fallback is used.','✦ Build From Scratch','Trending','All Templates','View details →','Use Template →','AI Reimagine','No template matched these filters. Try a broader search.']:
    if phrase not in s:
        raise SystemExit(f'Approved surface phrase missing from i18n contract: {phrase}')
p.write_text(s)
