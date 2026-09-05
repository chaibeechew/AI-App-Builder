package ai.laneriq.security;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.IDN;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 4101;
    private static final String TRUTH_URL = "https://laneriq-malware-defense.vercel.app/api/truth-status";
    private TextView status;
    private EditText urlInput;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildUi());
        refreshTruth();
    }

    private View buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(28), dp(20), dp(36));
        root.setBackgroundColor(Color.rgb(247,249,252));
        scroll.addView(root);

        TextView title = text("LANERIQ Security", 30, true);
        root.addView(title);
        TextView subtitle = text("Mobile Financial Scam & Malware Defense v0.1", 15, false);
        subtitle.setTextColor(Color.DKGRAY);
        root.addView(subtitle);

        TextView truth = text("Truth Gate: no real scanner evidence = no CLEAN claim", 13, true);
        truth.setTextColor(Color.rgb(150,85,0));
        truth.setPadding(0, dp(12), 0, dp(18));
        root.addView(truth);

        status = card("Protection status\nChecking Production Truth…");
        root.addView(status);

        urlInput = new EditText(this);
        urlInput.setHint("Paste a link, e.g. https://bank.example");
        urlInput.setSingleLine(true);
        urlInput.setPadding(dp(14), dp(14), dp(14), dp(14));
        root.addView(urlInput, matchWrap(dp(12)));

        Button link = button("Check Link / Phishing Risk");
        link.setOnClickListener(v -> checkLink());
        root.addView(link, matchWrap(dp(10)));

        Button file = button("Scan File / APK Fingerprint");
        file.setOnClickListener(v -> pickFile());
        root.addView(file, matchWrap(dp(10)));

        Button banking = button("Banking Safety Check");
        banking.setOnClickListener(v -> bankingSafety());
        root.addView(banking, matchWrap(dp(10)));

        Button refresh = button("Refresh 15-Layer Protection Status");
        refresh.setOnClickListener(v -> refreshTruth());
        root.addView(refresh, matchWrap(dp(10)));

        TextView note = card("15-layer scope\nSafeLink • Phishing/QR • APK Pre-Install • Sideload • Permissions • Runtime Behavior • Screen/Remote Control • Banking Session • Transaction Risk • Emergency Response • Device Integrity • SIM Takeover • OTP/Notification • Network/DNS/Wi-Fi • Trusted Banking Identity\n\nThis first APK is a security client connected to LANERIQ Production Truth. It does not claim guaranteed theft prevention or full antivirus CLEAN verification while external scanner providers are not configured.");
        note.setTextSize(13);
        root.addView(note);
        return scroll;
    }

    private void checkLink() {
        String raw = urlInput.getText().toString().trim();
        if (raw.isEmpty()) { toast("Paste a link first"); return; }
        try {
            Uri uri = Uri.parse(raw.contains("://") ? raw : "https://" + raw);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            int risk = 0;
            StringBuilder reasons = new StringBuilder();
            if (!"https".equals(scheme)) { risk += 35; reasons.append("• Not HTTPS\n"); }
            if (host.isEmpty()) { risk += 60; reasons.append("• Invalid/missing hostname\n"); }
            if (host.startsWith("xn--") || host.contains(".xn--")) { risk += 25; reasons.append("• Punycode/homograph risk\n"); }
            if (host.matches(".*(^|\\.)\\d{1,3}(\\.\\d{1,3}){3}$")) { risk += 30; reasons.append("• IP-address link\n"); }
            String ascii = IDN.toASCII(host);
            if (ascii.contains("login-") || ascii.contains("secure-") || ascii.contains("verify-") || ascii.contains("wallet-") || ascii.contains("banking-")) { risk += 20; reasons.append("• Credential-lure naming pattern\n"); }
            if (raw.length() > 180) { risk += 15; reasons.append("• Unusually long URL\n"); }
            String verdict = risk >= 50 ? "HIGH RISK — DO NOT OPEN" : risk >= 25 ? "CAUTION — VERIFY BEFORE OPENING" : "LOW LOCAL HEURISTIC RISK — CLOUD VERIFICATION STILL REQUIRED";
            status.setText("SafeLink result\n" + verdict + "\nRisk score: " + Math.min(risk,100) + "/100\n" + (reasons.length()==0 ? "• No local red flags found\n" : reasons) + "\nLANERIQ never treats local heuristics alone as proof of CLEAN.");
        } catch (Exception e) {
            status.setText("SafeLink result\nINVALID / UNVERIFIED LINK\nDo not open it until verified.");
        }
    }

    private void pickFile() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.setType("*/*");
        i.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(i, PICK_FILE);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE || resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        status.setText("File scan\nComputing local SHA-256 fingerprint…");
        new Thread(() -> {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] buf = new byte[8192]; int n; long size = 0;
                while ((n = in.read(buf)) > 0) { md.update(buf,0,n); size += n; }
                StringBuilder hex = new StringBuilder(); for (byte b: md.digest()) hex.append(String.format("%02x", b));
                String name = uri.getLastPathSegment() == null ? "selected file" : uri.getLastPathSegment();
                boolean apk = name.toLowerCase(Locale.ROOT).contains(".apk");
                String verdict = apk ? "APK / SIDELOAD — QUARANTINE UNTIL CLOUD + MULTI-SCANNER VERIFICATION" : "FINGERPRINTED — CLOUD VERIFICATION REQUIRED";
                String output = "File scan\n" + verdict + "\nSize: " + size + " bytes\nSHA-256:\n" + hex + "\n\nRaw file content is not stored by default in LANERIQ Security Intelligence Cloud.";
                runOnUiThread(() -> status.setText(output));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("File scan\nUnable to fingerprint selected file. No CLEAN claim issued."));
            }
        }).start();
    }

    private void bankingSafety() {
        boolean developer = Settings.Global.getInt(getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1;
        String state = developer ? "BANKING CAUTION" : "BANKING STATUS REQUIRES FULL DEVICE EVIDENCE";
        status.setText("Banking Safety\n" + state + "\n" + (developer ? "• Developer options are enabled\n" : "• No local developer-mode signal detected\n") + "• LANERIQ will not declare BANKING_SAFE without sufficient device, network, app identity, permission and threat evidence.\n\nIf you just installed an unknown APK, saw a black screen/overlay, granted Accessibility, screen-sharing or notification access, stop banking activity and remove the suspicious app first.");
    }

    private void refreshTruth() {
        status.setText("Protection status\nChecking Production Truth…");
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(TRUTH_URL).openConnection();
                c.setConnectTimeout(6000); c.setReadTimeout(6000); c.setRequestMethod("GET");
                int code = c.getResponseCode();
                String body;
                try (InputStream in = code >= 200 && code < 400 ? c.getInputStream() : c.getErrorStream()) {
                    body = new String(in.readAllBytes());
                }
                boolean fifteen = body.contains("\"financialScamDefenseLayerCount\":15") || body.contains("\"layerCount\":15");
                boolean intel = body.contains("\"privacyPreserving\":true") && body.contains("SECURITY-INTELLIGENCE-CLOUD");
                boolean noGuarantee = body.contains("\"guaranteedTheftPreventionClaimAllowed\":false");
                boolean rawFalse = body.contains("\"rawMalwareBinaryStoredByDefault\":false");
                String out = "Production Protection\nHTTP " + code + "\n15-layer Financial Scam Defense: " + yes(fifteen) + "\nSecurity Intelligence Cloud: " + yes(intel) + "\nPrivacy-preserving threat learning: " + yes(rawFalse) + "\n100% theft-prevention guarantee claimed: " + (noGuarantee ? "NO (correct Truth Gate)" : "UNVERIFIED") + "\n\nCurrent scanner-provider CLEAN evidence remains governed by Production Truth Gate.";
                runOnUiThread(() -> status.setText(out));
            } catch (Exception e) {
                runOnUiThread(() -> status.setText("Protection status\nProduction Truth endpoint unavailable. Fail closed: do not assume CLEAN or BANKING_SAFE."));
            } finally { if (c != null) c.disconnect(); }
        }).start();
    }

    private String yes(boolean v) { return v ? "VERIFIED" : "EVIDENCE REQUIRED"; }
    private Button button(String s) { Button b = new Button(this); b.setText(s); b.setAllCaps(false); b.setTextSize(16); return b; }
    private TextView text(String s, int size, boolean bold) { TextView t = new TextView(this); t.setText(s); t.setTextSize(size); t.setTextColor(Color.rgb(20,27,38)); if (bold) t.setTypeface(null, android.graphics.Typeface.BOLD); return t; }
    private TextView card(String s) { TextView t = text(s,15,false); t.setPadding(dp(16),dp(16),dp(16),dp(16)); t.setBackgroundColor(Color.WHITE); t.setGravity(Gravity.START); LinearLayout.LayoutParams p = matchWrap(dp(16)); t.setLayoutParams(p); return t; }
    private LinearLayout.LayoutParams matchWrap(int bottom) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2); p.bottomMargin = bottom; return p; }
    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
    private void toast(String s) { Toast.makeText(this,s,Toast.LENGTH_SHORT).show(); }
}
