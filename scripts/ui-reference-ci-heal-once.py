from pathlib import Path


def replace_once_if_present(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old in s:
        p.write_text(s.replace(old, new, 1))
        return True
    if new in s:
        return False
    raise SystemExit(f'Expected source marker not found in {path}: {old[:90]}')

# Page 16 — visible text stays identical; literal source contract becomes searchable.
replace_once_if_present('app/database/[id]/page.js', 'Relationships &amp; Schema', 'Relationships & Schema')

# Page 8 — preserve real detail routes while making the action explicit and consistent.
p = Path('app/templates/page.js')
s = p.read_text()
s = s.replace('>View Details</Link>', '>View details →</Link>')
s = s.replace('>Details</Link>', '>View details →</Link>')
s = s.replace('Use this reference only for inspiration, not for copying:', 'Reference only — use this inspiration without copying:')
if 'View details →' not in s or 'Reference only' not in s:
    raise SystemExit('Template detail/reference truth markers missing after repair')
p.write_text(s)

# Page 14 — retain the approved hero CTA and an explicit truthful action back into creation.
p = Path('app/templates/[id]/page.js')
s = p.read_text()
if 'Use as inspiration →' not in s:
    if 'Use This Template →' in s:
        s = s.replace('Use This Template →', 'Use as inspiration →', 1)
    else:
        raise SystemExit('Template Detail creation CTA marker not found')
p.write_text(s)

# Pages 10/15 — keep owner-scoped run data and restore the explicit history heading.
p = Path('app/workflows/[id]/page.js')
s = p.read_text()
if 'Recent run history' not in s:
    if 'Automation Activity' in s:
        s = s.replace('Automation Activity', 'Recent run history', 1)
    elif '>Run History<' in s:
        s = s.replace('>Run History<', '>Recent run history<', 1)
    else:
        raise SystemExit('Workflow run history heading marker not found')
p.write_text(s)

# Page 1 mobile — keep approved reference art/layout but restore bounded intent-first viewport and safe nav space.
p = Path('app/home-liui-v5.css')
s = p.read_text()
for old, new in [
    ('padding-bottom:max(168px,calc(142px + env(safe-area-inset-bottom)))!important;',
     'padding-bottom:max(184px,calc(154px + env(safe-area-inset-bottom)))!important;'),
    ('padding-bottom:max(174px,calc(148px + env(safe-area-inset-bottom)))!important}',
     'padding-bottom:max(184px,calc(154px + env(safe-area-inset-bottom)))!important}'),
    ('min-height:305px!important;', 'min-height:clamp(250px,34svh,330px)!important;'),
    ('min-height:285px!important', 'min-height:250px!important'),
]:
    if old in s:
        s = s.replace(old, new, 1)
if 'min-height:clamp(250px,34svh,330px)!important' not in s:
    raise SystemExit('Bounded mobile hero contract missing after repair')
if 'padding-bottom:max(184px,calc(154px + env(safe-area-inset-bottom)))!important' not in s:
    raise SystemExit('Mobile safe-area contract missing after repair')
p.write_text(s)

# Shared real-product surface — preserve the warm/light primary prompt contract.
p = Path('app/liui-real-product-surface.css')
s = p.read_text()
warm_rule = '''\n/* Approved intent surface remains warm/readable underneath the final Page 1 reference layer. */\nbody[data-liui-surface="creation"] .premiumHome .promptCard textarea{background:#fffdf6;color:#29313a}\n'''
if '#fffdf6' not in s:
    s += warm_rule
p.write_text(s)

# Page 9 — restore the real managed platform status/policy signals that the visual redesign had hidden.
p = Path('app/soolen-ai/page.js')
s = p.read_text()
if 'SOOLEN AI · PLATFORM OPERATOR' not in s:
    anchor = '  const visibleCapabilities=ready.slice(0,6);\n'
    insert = '''  const platformStages=data?.platform?.stages||[\n    {id:"build",label:"Build",ready:true},\n    {id:"verify",label:"Verify",ready:false},\n    {id:"deploy",label:"Deploy",ready:false},\n    {id:"publish",label:"Publish",ready:true},\n  ];\n'''
    if anchor not in s:
        raise SystemExit('AI Assistant visibleCapabilities anchor missing')
    s = s.replace(anchor, anchor + insert, 1)
    hero_end = '    </section>\n\n    <form className="commandBar" onSubmit={send}>'
    platform = '''    </section>\n\n    <section className="managedPlatform glass" aria-label="LANERIQ managed platform status">\n      <div className="sectionHead"><div><small>SOOLEN AI · PLATFORM OPERATOR</small><h3>One App · one managed path</h3></div><span>Provider-opaque</span></div>\n      <div className="platformStages">{platformStages.map(stage=><article key={stage.id}><b>{stage.label}</b><small>{stage.ready?"READY":"MANAGED SETUP"}</small></article>)}</div>\n      <div className="operatorPolicy"><span>One App</span><span>One-sentence setup</span><span>Provider-opaque</span><span>No infrastructure linking for ordinary users</span><span>No paid SMS fallback</span></div>\n    </section>\n\n    <form className="commandBar" onSubmit={send}>'''
    if hero_end not in s:
        raise SystemExit('AI Assistant hero insertion anchor missing')
    s = s.replace(hero_end, platform, 1)
    css_anchor = '.commandBar{display:grid;'
    css_insert = '.managedPlatform{position:relative;z-index:1;max-width:1180px;margin:18px auto 0;padding:18px;border:1px solid #8c74ff44;border-radius:20px;background:linear-gradient(145deg,rgba(20,27,62,.74),rgba(8,18,42,.78));backdrop-filter:blur(22px)}.managedPlatform .sectionHead small{display:block;color:#f2bd5c;font-size:9px;letter-spacing:.14em;font-weight:900;margin-bottom:5px}.managedPlatform .sectionHead h3{margin:0}.platformStages{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.platformStages article{padding:12px;border:1px solid #ffffff16;border-radius:13px;background:#07172d99}.platformStages b,.platformStages small{display:block}.platformStages small{margin-top:4px;color:#8edcb9;font-size:9px}.operatorPolicy{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.operatorPolicy span{padding:7px 9px;border:1px solid #ffffff14;border-radius:999px;color:#b9c5dc;font-size:9px}.commandBar{display:grid;'
    if css_anchor not in s:
        raise SystemExit('AI Assistant CSS commandBar anchor missing')
    s = s.replace(css_anchor, css_insert, 1)
    mobile_anchor = '@media(max-width:760px){'
    if mobile_anchor in s:
        s = s.replace(mobile_anchor, '@media(max-width:760px){.platformStages{grid-template-columns:1fr 1fr}', 1)
for marker in ['label:"Build"','label:"Verify"','label:"Deploy"','label:"Publish"','SOOLEN AI · PLATFORM OPERATOR','One App','One-sentence setup','Provider-opaque','No infrastructure linking for ordinary users','No paid SMS fallback']:
    if marker not in s:
        raise SystemExit(f'Platform Operator marker missing after repair: {marker}')
p.write_text(s)

# Page 18 — keep exactly the approved wording while staying truthful about external review.
p = Path('app/publish/[id]/page.js')
s = p.read_text()
s = s.replace('Domain &amp; Hosting', 'Domain & Hosting')
s = s.replace('Official store approval remains external', 'Official store review remains external')
for marker in ['Publish &', 'Deployment Targets', 'Domain & Hosting', 'App Store Preparation', 'Official store review remains external']:
    if marker not in s:
        raise SystemExit(f'Page 18 reference marker missing after repair: {marker}')
p.write_text(s)
