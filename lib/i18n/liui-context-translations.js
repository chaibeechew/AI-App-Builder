const CODES = Object.freeze(["en","zh-CN","zh-TW","ms","id","ja","ko","th","vi","es"]);

const rows = Object.freeze({
  "Page intelligence": ["Page intelligence","页面智能","頁面智能","Kecerdasan halaman","Kecerdasan halaman","ページインテリジェンス","페이지 인텔리전스","ข้อมูลอัจฉริยะของหน้า","Trí tuệ trang","Inteligencia de página"],
  "Open page intelligence": ["Open page intelligence","打开页面智能","開啟頁面智能","Buka kecerdasan halaman","Buka kecerdasan halaman","ページインテリジェンスを開く","페이지 인텔리전스 열기","เปิดข้อมูลอัจฉริยะของหน้า","Mở trí tuệ trang","Abrir inteligencia de página"],
  "Page": ["Page","页面","頁面","Halaman","Halaman","ページ","페이지","หน้า","Trang","Página"],
  "Risk": ["Risk","风险","風險","Risiko","Risiko","リスク","위험","ความเสี่ยง","Rủi ro","Riesgo"],
  "Current stage": ["Current stage","当前阶段","目前階段","Peringkat semasa","Tahap saat ini","現在の段階","현재 단계","ขั้นตอนปัจจุบัน","Giai đoạn hiện tại","Etapa actual"],
  "Evidence": ["Evidence","证据","證據","Bukti","Bukti","エビデンス","증거","หลักฐาน","Bằng chứng","Evidencia"],
  "Approval": ["Approval","批准","批准","Kelulusan","Persetujuan","承認","승인","การอนุมัติ","Phê duyệt","Aprobación"],
  "Approval required": ["Approval required","需要批准","需要批准","Kelulusan diperlukan","Persetujuan diperlukan","承認が必要","승인 필요","ต้องได้รับการอนุมัติ","Cần phê duyệt","Se requiere aprobación"],
  "No separate approval required": ["No separate approval required","无需单独批准","無需另外批准","Tiada kelulusan berasingan diperlukan","Tidak perlu persetujuan terpisah","個別の承認は不要","별도 승인 불필요","ไม่ต้องมีการอนุมัติแยก","Không cần phê duyệt riêng","No se requiere aprobación separada"],
  "Next best action": ["Next best action","下一最佳操作","下一個最佳操作","Tindakan terbaik seterusnya","Tindakan terbaik berikutnya","次の最適アクション","다음 최적 작업","การดำเนินการที่เหมาะสมถัดไป","Hành động tốt nhất tiếp theo","Siguiente mejor acción"],
  "Human approval required before consequential actions.": ["Human approval required before consequential actions.","执行重大操作前需要人工批准。","執行重大操作前需要人工批准。","Kelulusan manusia diperlukan sebelum tindakan berimpak.","Persetujuan manusia diperlukan sebelum tindakan berdampak.","重要な操作の前に人の承認が必要です。","중요한 작업 전에는 사람의 승인이 필요합니다.","ต้องได้รับการอนุมัติจากมนุษย์ก่อนการดำเนินการที่มีผลกระทบ","Cần phê duyệt của con người trước các hành động có hệ quả.","Se requiere aprobación humana antes de acciones con consecuencias."],
  "AI may assist within current permissions.": ["AI may assist within current permissions.","AI 可在当前权限范围内协助。","AI 可在目前權限範圍內協助。","AI boleh membantu dalam kebenaran semasa.","AI dapat membantu dalam izin saat ini.","AI は現在の権限内で支援できます。","AI는 현재 권한 범위에서 지원할 수 있습니다.","AI สามารถช่วยเหลือภายในสิทธิ์ปัจจุบัน","AI có thể hỗ trợ trong phạm vi quyền hiện tại.","La IA puede ayudar dentro de los permisos actuales."],
  "Creation journey": ["Creation journey","创作流程","創作流程","Perjalanan penciptaan","Alur pembuatan","制作ジャーニー","제작 여정","เส้นทางการสร้าง","Hành trình sáng tạo","Recorrido de creación"],
  "Low": ["Low","低","低","Rendah","Rendah","低","낮음","ต่ำ","Thấp","Bajo"],
  "Medium": ["Medium","中","中","Sederhana","Sedang","中","중간","ปานกลาง","Trung bình","Medio"],
  "High": ["High","高","高","Tinggi","Tinggi","高","높음","สูง","Cao","Alto"],
  "Critical": ["Critical","关键","關鍵","Kritikal","Kritis","重大","심각","วิกฤต","Nghiêm trọng","Crítico"],
  "Code evidence": ["Code evidence","代码证据","程式碼證據","Bukti kod","Bukti kode","コード証拠","코드 증거","หลักฐานโค้ด","Bằng chứng mã nguồn","Evidencia de código"],
  "Live runtime evidence": ["Live runtime evidence","实时运行证据","即時執行證據","Bukti runtime langsung","Bukti runtime langsung","ライブ実行証拠","라이브 런타임 증거","หลักฐานรันไทม์จริง","Bằng chứng runtime trực tiếp","Evidencia de ejecución en vivo"],
  "Release evidence": ["Release evidence","发布证据","發布證據","Bukti keluaran","Bukti rilis","リリース証拠","릴리스 증거","หลักฐานการเผยแพร่","Bằng chứng phát hành","Evidencia de lanzamiento"],
  "External publication evidence": ["External publication evidence","外部发布证据","外部發布證據","Bukti penerbitan luaran","Bukti publikasi eksternal","外部公開証拠","외부 게시 증거","หลักฐานการเผยแพร่ภายนอก","Bằng chứng xuất bản bên ngoài","Evidencia de publicación externa"],
});

export const LIUI_CONTEXT_LANGUAGE_CODES = CODES;
export const LIUI_CONTEXT_TRANSLATIONS = Object.freeze(Object.fromEntries(
  Object.entries(rows).map(([key, values]) => [key, Object.freeze(Object.fromEntries(CODES.map((code, index) => [code, values[index]])))])
));

export function liuiContextText(key, language = "en") {
  const row = LIUI_CONTEXT_TRANSLATIONS[String(key || "")];
  if (!row) return String(key || "");
  return row[language] || row.en || String(key || "");
}
