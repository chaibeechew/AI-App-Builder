from pathlib import Path

p = Path('app/auth/page.js')
s = p.read_text()
replacements = [
    ('<label htmlFor="auth-otp" className="otpLabel">{EMAIL_OTP_POLICY.codeLength}-digit verification code</label>',
     '<label htmlFor="auth-otp" className="otpLabel">{policy.codeLength}-digit verification code</label>'),
    ('<div className="otpCells" aria-label={`${EMAIL_OTP_POLICY.codeLength}-digit verification code`}>',
     '<div className="otpCells" aria-label={`${policy.codeLength}-digit verification code`}>'),
    ('{Array.from({ length: EMAIL_OTP_POLICY.codeLength }, (_, index) => <span key={index} className={otp[index] ? "filled" : ""} aria-hidden="true">{otp[index] || ""}</span>)}',
     '{Array.from({ length: policy.codeLength }, (_, index) => <span key={index} className={otp[index] ? "filled" : ""} aria-hidden="true">{otp[index] || ""}</span>)}'),
    ('onChange={(event) => setOtp(event.target.value.replace(/\\D/g, "").slice(0, EMAIL_OTP_POLICY.codeLength))}',
     'onChange={(event) => setOtp(event.target.value.replace(/\\D/g, "").slice(0, policy.codeLength))}'),
    ('aria-label={`${EMAIL_OTP_POLICY.codeLength}-digit verification code`} pattern="[0-9]*" maxLength={EMAIL_OTP_POLICY.codeLength}',
     'aria-label={`${policy.codeLength}-digit verification code`} pattern="[0-9]*" maxLength={policy.codeLength}'),
]
for old, new in replacements:
    if old in s:
        s = s.replace(old, new, 1)
    elif new not in s:
        raise SystemExit(f'Expected OTP UI marker not found: {old[:100]}')

for marker in [
    '{policy.codeLength}-digit verification code',
    'Array.from({ length: policy.codeLength }',
    'slice(0, policy.codeLength)',
    'maxLength={policy.codeLength}',
    'otp.length !== policy.codeLength',
]:
    if marker not in s:
        raise SystemExit(f'Active OTP policy marker missing after repair: {marker}')

# Email remains 8 digits through EMAIL_OTP_POLICY; WhatsApp remains 6 through WHATSAPP_OTP_POLICY.
if 'const policy = otpPolicyForMethod(method);' not in s:
    raise SystemExit('Active method policy resolution missing')
p.write_text(s)
