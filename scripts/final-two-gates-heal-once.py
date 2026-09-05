from pathlib import Path

# Page 12: restore cross-feature entries required by the product/runtime contract.
p = Path('app/studio/page.js')
s = p.read_text()
if '"Pro Game Creator"' not in s:
    anchor = '    ["✦","AI Build","Generate App + Website from your idea.","/create","purple"],\n'
    insert = anchor + '    ["🎮","Pro Game Creator","Professional Fair Price · Fair Use mobile-game creation with playable runtime and iOS + Android targets.","/game-builder","gold"],\n'
    if anchor not in s:
        raise SystemExit('Studio AI Build anchor not found')
    s = s.replace(anchor, insert, 1)
if '"AI Photo & Video Generator"' not in s:
    anchor = '    ["▶","AI Video Generator","Create video projects with truthful render status.","/video-studio","blue"],\n'
    insert = anchor + '    ["◫","AI Photo & Video Generator","Create mixed photo/video concepts, campaign media, game presentation and store media.","/image-studio?mode=create","violet"],\n'
    if anchor not in s:
        raise SystemExit('Studio AI Video anchor not found')
    s = s.replace(anchor, insert, 1)
for marker in ['"AI Art Generator"','"AI Video Generator"','"AI Photo & Video Generator"','"AI Avatar Creator"','"Pro Game Creator"','"/game-builder"']:
    if marker not in s:
        raise SystemExit(f'Studio runtime entry missing after repair: {marker}')
p.write_text(s)

# Login: keep the two-step visual intact while restoring the explicit no-paid-SMS truth boundary.
p = Path('app/auth/page.js')
s = p.read_text()
if 'No paid SMS fallback is used' not in s:
    anchor = '          <div className="trustLine"><i /> Private project access · passwordless verification</div>\n'
    insert = anchor + '          <small className="trustPolicy">No paid SMS fallback is used.</small>\n'
    if anchor not in s:
        raise SystemExit('Login trust-line anchor not found')
    s = s.replace(anchor, insert, 1)
if 'No paid SMS fallback is used' not in s:
    raise SystemExit('Login no-paid-SMS truth statement missing after repair')
p.write_text(s)
