const CODES = Object.freeze(["en","zh-CN","zh-TW","ms","id","ja","ko","th","vi","es"]);

const rows = Object.freeze({
  "Skip to main content": ["Skip to main content","跳到主要内容","跳到主要內容","Langkau ke kandungan utama","Lewati ke konten utama","メインコンテンツへ移動","주요 콘텐츠로 건너뛰기","ข้ามไปยังเนื้อหาหลัก","Chuyển đến nội dung chính","Saltar al contenido principal"],
  "Current LANERIQ context": ["Current LANERIQ context","当前 LANERIQ 情境","目前 LANERIQ 情境","Konteks LANERIQ semasa","Konteks LANERIQ saat ini","現在の LANERIQ コンテキスト","현재 LANERIQ 컨텍스트","บริบท LANERIQ ปัจจุบัน","Ngữ cảnh LANERIQ hiện tại","Contexto actual de LANERIQ"],
  "Creation journey step": ["Creation journey step","创作流程步骤","創作流程步驟","Langkah perjalanan penciptaan","Langkah alur pembuatan","制作ジャーニーのステップ","제작 여정 단계","ขั้นตอนเส้นทางการสร้าง","Bước trong hành trình sáng tạo","Paso del recorrido de creación"],
  "Continue where you left off": ["Continue where you left off","继续上次进度","繼續上次進度","Sambung dari tempat terakhir","Lanjutkan dari posisi terakhir","前回の続きから再開","이어서 계속하기","ทำต่อจากจุดเดิม","Tiếp tục từ nơi bạn dừng lại","Continuar donde lo dejaste"],
  "Last workspace": ["Last workspace","上次工作区","上次工作區","Ruang kerja terakhir","Ruang kerja terakhir","前回のワークスペース","마지막 작업 공간","พื้นที่ทำงานล่าสุด","Không gian làm việc gần nhất","Último espacio de trabajo"],
  "Continue": ["Continue","继续","繼續","Teruskan","Lanjutkan","続ける","계속","ดำเนินการต่อ","Tiếp tục","Continuar"],
  "Offline. Some actions need a connection; LANERIQ will not pretend they completed.": ["Offline. Some actions need a connection; LANERIQ will not pretend they completed.","当前离线。部分操作需要网络；LANERIQ 不会假装它们已经完成。","目前離線。部分操作需要網路；LANERIQ 不會假裝它們已完成。","Luar talian. Sesetengah tindakan memerlukan sambungan; LANERIQ tidak akan berpura-pura ia telah selesai.","Offline. Beberapa tindakan memerlukan koneksi; LANERIQ tidak akan berpura-pura bahwa tindakan itu sudah selesai.","オフラインです。一部の操作には接続が必要です。LANERIQ は完了したふりをしません。","오프라인입니다. 일부 작업은 연결이 필요하며 LANERIQ는 완료된 것처럼 표시하지 않습니다.","ออฟไลน์ การทำงานบางอย่างต้องใช้อินเทอร์เน็ต และ LANERIQ จะไม่แสดงว่าเสร็จแล้วหากยังไม่เสร็จจริง","Đang ngoại tuyến. Một số thao tác cần kết nối; LANERIQ sẽ không giả vờ rằng chúng đã hoàn tất.","Sin conexión. Algunas acciones requieren conexión; LANERIQ no fingirá que se completaron."],
  "Build ready. Review the result before release.": ["Build ready. Review the result before release.","构建已就绪。发布前请先检查结果。","建置已就緒。發布前請先檢查結果。","Binaan sedia. Semak hasil sebelum keluaran.","Build siap. Tinjau hasil sebelum rilis.","ビルドの準備ができました。リリース前に結果を確認してください。","빌드가 준비되었습니다. 출시 전에 결과를 검토하세요.","บิลด์พร้อมแล้ว โปรดตรวจสอบผลลัพธ์ก่อนเผยแพร่","Bản dựng đã sẵn sàng. Hãy kiểm tra kết quả trước khi phát hành.","La compilación está lista. Revisa el resultado antes de publicar."],
  "Building the App + Website and preparing connected project modules.": ["Building the App + Website and preparing connected project modules.","正在构建 App + Website，并准备关联的项目模块。","正在建置 App + Website，並準備關聯的專案模組。","Sedang membina App + Website dan menyediakan modul projek yang berkaitan.","Sedang membangun App + Website dan menyiapkan modul proyek terkait.","App + Website を構築し、関連するプロジェクトモジュールを準備しています。","App + Website를 빌드하고 연결된 프로젝트 모듈을 준비하고 있습니다.","กำลังสร้าง App + Website และเตรียมโมดูลโครงการที่เชื่อมโยงกัน","Đang xây dựng App + Website và chuẩn bị các mô-đun dự án liên quan.","Creando la App + Website y preparando los módulos conectados del proyecto."],
  "Planning pages, features, data and workflows.": ["Planning pages, features, data and workflows.","正在规划页面、功能、数据和工作流程。","正在規劃頁面、功能、資料和工作流程。","Sedang merancang halaman, ciri, data dan aliran kerja.","Sedang merencanakan halaman, fitur, data, dan alur kerja.","ページ、機能、データ、ワークフローを計画しています。","페이지, 기능, 데이터 및 워크플로를 계획하고 있습니다.","กำลังวางแผนหน้า ฟีเจอร์ ข้อมูล และเวิร์กโฟลว์","Đang lập kế hoạch trang, tính năng, dữ liệu và quy trình làm việc.","Planificando páginas, funciones, datos y flujos de trabajo."],
  "loading": ["Loading","加载中","載入中","Memuatkan","Memuat","読み込み中","로딩 중","กำลังโหลด","Đang tải","Cargando"],
  "ai-thinking": ["AI thinking","AI 思考中","AI 思考中","AI sedang berfikir","AI sedang berpikir","AI が思考中","AI가 생각 중","AI กำลังคิด","AI đang suy nghĩ","IA pensando"],
  "ai-working": ["AI working","AI 工作中","AI 工作中","AI sedang bekerja","AI sedang bekerja","AI が作業中","AI가 작업 중","AI กำลังทำงาน","AI đang làm việc","IA trabajando"],
  "queued": ["Queued","排队中","排隊中","Dalam giliran","Dalam antrean","待機中","대기열","อยู่ในคิว","Đang xếp hàng","En cola"],
  "offline": ["Offline","离线","離線","Luar talian","Offline","オフライン","오프라인","ออฟไลน์","Ngoại tuyến","Sin conexión"],
  "reconnecting": ["Reconnecting","重新连接中","重新連線中","Menyambung semula","Menghubungkan kembali","再接続中","재연결 중","กำลังเชื่อมต่อใหม่","Đang kết nối lại","Reconectando"],
  "empty": ["Empty","暂无内容","暫無內容","Kosong","Kosong","空です","비어 있음","ว่าง","Trống","Vacío"],
  "partial": ["Partial","部分完成","部分完成","Separa","Sebagian","一部のみ","부분 완료","บางส่วน","Một phần","Parcial"],
  "stale": ["Needs refresh","需要刷新","需要重新整理","Perlu dimuat semula","Perlu disegarkan","更新が必要","새로 고침 필요","ต้องรีเฟรช","Cần làm mới","Necesita actualizarse"],
  "permission-required": ["Permission required","需要权限","需要權限","Kebenaran diperlukan","Izin diperlukan","権限が必要","권한 필요","ต้องมีสิทธิ์","Cần quyền truy cập","Se requiere permiso"],
  "approval-required": ["Approval required","需要批准","需要批准","Kelulusan diperlukan","Persetujuan diperlukan","承認が必要","승인 필요","ต้องได้รับการอนุมัติ","Cần phê duyệt","Se requiere aprobación"],
  "blocked": ["Blocked","已阻止","已阻止","Disekat","Diblokir","ブロック中","차단됨","ถูกบล็อก","Bị chặn","Bloqueado"],
  "error": ["Error","错误","錯誤","Ralat","Kesalahan","エラー","오류","ข้อผิดพลาด","Lỗi","Error"],
  "retry": ["Retry","重试","重試","Cuba lagi","Coba lagi","再試行","다시 시도","ลองอีกครั้ง","Thử lại","Reintentar"],
  "success": ["Ready","已就绪","已就緒","Sedia","Siap","準備完了","준비됨","พร้อม","Sẵn sàng","Listo"],
});

export const LIUI_RUNTIME_LANGUAGE_CODES = CODES;
export const LIUI_RUNTIME_TRANSLATIONS = Object.freeze(Object.fromEntries(
  Object.entries(rows).map(([key, values]) => [key, Object.freeze(Object.fromEntries(CODES.map((code, index) => [code, values[index]])))])
));

export function liuiRuntimeText(key, language = "en") {
  const normalizedKey = String(key || "");
  const row = LIUI_RUNTIME_TRANSLATIONS[normalizedKey];
  if (!row) return normalizedKey;
  return row[language] || row.en || normalizedKey;
}
