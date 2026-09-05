from pathlib import Path

# 1) Page 16: preserve the approved visible title while keeping the literal contract text searchable.
p = Path('app/database/[id]/page.js')
s = p.read_text()
old = 'Relationships &amp; Schema'
new = 'Relationships & Schema'
if old not in s:
    raise SystemExit('Page 16 Relationships &amp; Schema marker not found')
p.write_text(s.replace(old, new, 1))

# 2) Page 8: keep the real detail routes, but make the action explicit and consistent.
p = Path('app/templates/page.js')
s = p.read_text()
count = 0
for old, new in [
    ('>View Details</Link>', '>View details →</Link>'),
    ('>Details</Link>', '>View details →</Link>'),
]:
    if old in s:
        s = s.replace(old, new)
        count += 1
if count == 0:
    raise SystemExit('Template detail action labels not found')
p.write_text(s)

# 3) Page 1 mobile: keep the approved artwork/layout but restore the bounded intent-first viewport contract.
p = Path('app/home-liui-v5.css')
s = p.read_text()
replacements = [
    ('padding-bottom:max(168px,calc(142px + env(safe-area-inset-bottom)))!important;',
     'padding-bottom:max(184px,calc(154px + env(safe-area-inset-bottom)))!important;'),
    ('padding-bottom:max(174px,calc(148px + env(safe-area-inset-bottom)))!important;',
     'padding-bottom:max(184px,calc(154px + env(safe-area-inset-bottom)))!important;'),
    ('min-height:305px!important;', 'min-height:clamp(250px,34svh,330px)!important;'),
    ('min-height:285px!important;', 'min-height:250px!important;'),
]
for old, new in replacements:
    if old not in s:
        raise SystemExit(f'Homepage mobile contract marker not found: {old}')
    s = s.replace(old, new, 1)
p.write_text(s)
