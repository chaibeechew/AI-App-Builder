"use client";

import Link from "next/link";
import { useState } from "react";

export default function ProEditTools({ groups = [] }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return <section className="editGate">
      <div>
        <small>PRO MODE · OPTIONAL DEEP CONTROL</small>
        <h2>Need exact changes?</h2>
        <p>Keep using SoolenAI for normal changes. Press Edit only when you want the advanced controls to appear.</p>
      </div>
      <button type="button" onClick={() => setEditing(true)} aria-expanded="false">Edit</button>
      <style jsx>{`
        .editGate{margin-top:18px;border:1px solid #e7c45b44;background:linear-gradient(145deg,#d8bf6210,#051813e8);border-radius:28px;padding:26px;display:flex;justify-content:space-between;gap:24px;align-items:center;backdrop-filter:blur(18px)}
        small{color:#e9c968;letter-spacing:.18em;font-weight:950}.editGate h2{font-size:34px;margin:8px 0}.editGate p{margin:0;color:#9fb2aa;line-height:1.65;max-width:720px}.editGate button{min-width:120px;min-height:52px;border:0;border-radius:14px;background:linear-gradient(135deg,#f3dc88,#c79733);color:#07130e;font-size:16px;font-weight:950;cursor:pointer}
        @media(max-width:700px){.editGate{align-items:flex-start;flex-direction:column}.editGate button{width:100%}}
      `}</style>
    </section>;
  }

  return <section className="toolSection">
    <div className="sectionHead">
      <div><small>PRO EDIT MODE</small><h2>Design · Logic · Release</h2></div>
      <button type="button" className="close" onClick={() => setEditing(false)} aria-expanded="true">Done</button>
    </div>
    <p className="intro">Advanced controls are visible because you opened Edit. LANERIQ AI still manages infrastructure and providers behind the scenes.</p>
    <div className="groups">{groups.map((group)=><article className="group" key={group.name}>
      <h3>{group.name}</h3>
      {group.items.map((item)=><Link href={item.href} key={item.name}><strong>{item.name}</strong><span>{item.note}</span><b>→</b></Link>)}
    </article>)}</div>
    <style jsx>{`
      .toolSection{margin-top:18px;border:1px solid #ffffff12;background:#051813d9;border-radius:28px;padding:26px;backdrop-filter:blur(18px)}.sectionHead{display:flex;justify-content:space-between;gap:20px;align-items:end}.sectionHead small{color:#e9c968;letter-spacing:.18em;font-weight:950}.sectionHead h2{font-size:34px;margin:7px 0}.intro{color:#9fb2aa;line-height:1.65}.close{min-height:44px;padding:0 18px;border-radius:12px;border:1px solid #e6c76866;background:#0a241b;color:#e8d598;font-weight:900;cursor:pointer}.groups{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}.group{border:1px solid #ffffff12;background:#ffffff07;border-radius:20px;padding:16px}.group h3{color:#e6c768;font-size:20px;margin:3px 4px 13px}.group a{display:grid;grid-template-columns:1fr auto;gap:4px 12px;color:#fff;text-decoration:none;padding:13px 8px;border-top:1px solid #ffffff0d}.group a strong{font-size:14px}.group a span{grid-column:1;color:#96aaa1;font-size:12px;line-height:1.45}.group a b{grid-column:2;grid-row:1/3;color:#e6c768;align-self:center}@media(max-width:820px){.groups{grid-template-columns:1fr}.sectionHead{align-items:flex-start;flex-direction:column}}
    `}</style>
  </section>;
}
