from pathlib import Path

# Update the canonical 10-language catalog to the approved Login reference copy.
p = Path('lib/i18n/catalog.js')
s = p.read_text()
anchor = '  "SECURE VERIFICATION": ["安全验证","安全驗證","PENGESAHAN SELAMAT","VERIFIKASI AMAN","安全な認証","보안 인증","การยืนยันอย่างปลอดภัย","XÁC MINH AN TOÀN","VERIFICACIÓN SEGURA"],\n'
rows = (
'  "Enter Your Email": ["输入你的邮箱","輸入你的電郵","Masukkan e-mel anda","Masukkan email Anda","メールアドレスを入力","이메일 주소를 입력하세요","กรอกอีเมลของคุณ","Nhập email của bạn","Introduce tu correo electrónico"],\n'
'  "Check Your Email": ["查看你的邮箱","查看你的電郵","Semak e-mel anda","Periksa email Anda","メールを確認","이메일을 확인하세요","ตรวจสอบอีเมลของคุณ","Kiểm tra email của bạn","Revisa tu correo electrónico"],\n'
'  "A BRIGHTER TOMORROW TOGETHER": ["共创更明亮的明天","共創更明亮的明天","MASA DEPAN LEBIH CERAH BERSAMA","MASA DEPAN LEBIH CERAH BERSAMA","ともに、より明るい未来へ","함께 더 밝은 내일로","สู่วันพรุ่งนี้ที่สดใสไปด้วยกัน","CÙNG NHAU HƯỚNG TỚI NGÀY MAI TƯƠI SÁNG HƠN","JUNTOS HACIA UN MAÑANA MÁS BRILLANTE"],\n'
'  "No paid SMS fallback is used.": ["不使用付费短信备用通道。","不使用付費簡訊備援通道。","Tiada sandaran SMS berbayar digunakan.","Tidak ada fallback SMS berbayar yang digunakan.","有料SMSのフォールバックは使用しません。","유료 SMS 대체 경로를 사용하지 않습니다.","ไม่มีการใช้ SMS แบบเสียค่าใช้จ่ายเป็นทางเลือกสำรอง","Không sử dụng SMS trả phí làm phương án dự phòng.","No se utiliza SMS de pago como alternativa."],\n'
)
if '"Enter Your Email":' not in s:
    if anchor not in s:
        raise SystemExit('Canonical auth i18n insertion anchor not found')
    s = s.replace(anchor, anchor + rows, 1)
for marker in ['"Enter Your Email":','"Check Your Email":','"A BRIGHTER TOMORROW TOGETHER":','"No paid SMS fallback is used.":']:
    if marker not in s:
        raise SystemExit(f'Missing approved auth i18n row: {marker}')
p.write_text(s)

# Retarget the strict auth-surface contract from retired Login copy to the user-approved reference copy.
p = Path('scripts/multilingual-contract-tests.mjs')
s = p.read_text()
old = "  [auth,['Checking your session…','Secure sign in','CREATE WITHOUT LIMITS','One code.','Your whole studio.','SECURE VERIFICATION','Enter your code','Welcome back','Email Code','Email address','Verify & Continue','Resend Code','Encrypted session','One-time code','Rate-limit aware']],"
new = "  [auth,['Checking your session…','Secure sign in','CREATE WITHOUT LIMITS','One code.','Your whole studio.','SECURE VERIFICATION','Enter Your Email','Check Your Email','A BRIGHTER TOMORROW TOGETHER','Email Code','Email address','Verify & Continue','Resend Code','Private project access · passwordless verification','No paid SMS fallback is used.']],"
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit('Auth required-surface phrase set not found')
for phrase in ['Enter Your Email','Check Your Email','A BRIGHTER TOMORROW TOGETHER','No paid SMS fallback is used.']:
    if phrase not in s:
        raise SystemExit(f'Approved auth surface phrase missing from i18n contract: {phrase}')
p.write_text(s)
