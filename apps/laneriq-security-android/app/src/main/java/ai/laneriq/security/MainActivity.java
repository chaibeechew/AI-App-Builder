package ai.laneriq.security;

import android.app.Activity;
import android.content.Intent;
import android.content.res.ColorStateList;
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

    private ScrollView scroll;
    private TextView status;
    private EditText urlInput;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildUi());
        refreshTruth(false);
    }

    private View buildUi() {
        scroll = new ScrollView(this);
        scroll.setFillViewport(true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(28), dp(20), dp(36));
        root.setBackgroundColor(Color.rgb(247,249,252));
        scroll.addView(root);

        TextView title = text("LANERIQ Anti Scam", 30, true);
        root.addView(title);

        TextView subtitle = text("Mobile Anti-Scam & Malware Defense • Test v0.1", 15, false);
        subtitle.setTextColor(Color.DKGRAY);
        root.addView(subtitle);

        TextView truth = text("Truth Gate: no real scanner evidence = no CLEAN claim", 13, true);
        truth.setTextColor(Color.rgb(150,85,0));
        truth.setPadding(0, dp(12), 0, dp(18));
        root.addView(truth);

        status = card("Protection status\nChecking Production Truth…");
        status.setTextIsSelectable(true);
        root.addView(status);

        urlInput = new EditText(this);
        urlInput.setHint("Paste a link, e.g. https://bank.example");
        urlInput.setSingleLine(true);
        urlInput.setPadding(dp(14), dp(14), dp(14), dp(14));
        root.addView(urlInput, matchWrap(dp(12)));

        Button link = button("Check Link / Phishing Risk");
        link.setOnClickListener(v -> {
            toast("Checking link…");
            checkLink();
        });
        root.addView(link, matchWrap(dp(12)));

        Button file = button("Scan File / APK Fingerprint");
        file.setOnClickListener(v -> {
            toast("Opening file picker…");
            pickFile();
        });
        root.addView(file, matchWrap(dp(12)));

        Button banking = button("Banking Safety Check");
        banking.setOnClickListener(v -> {
            toast("Running banking safety check…");
            bankingSafety();
        });
        root.addView(banking, matchWrap(dp(12)));

        Button refresh = button("Refresh 15-Layer Protection Status");
        refresh.setOnClickListener(v -> {
            toast("Refreshing protection status…");
            refreshTruth(true);
        });
        root.addView(refresh, matchWrap(dp(18)));

        TextView hint = text("Tap any action above. LANERIQ will immediately show progress and automatically move the result card into view.", 13, false);
        hint.setTextColor(Color.rgb(60,75,95));
        hint.setPadding(dp(4), 0, dp(4), dp(18));
        root.addView(hint);

        TextView note = card("15-layer scope\nSafeLink • Phishing/QR • APK Pre-Install • Sideload • Permissions • Runtime Behavior • Screen/Remote Control • Banking Session • Transaction Risk • Emergency Response • Device Integrity • SIM Takeover • OTP/Notification • Network/DNS/Wi-Fi • Trusted Banking Identity\n\nLANERIQ Anti Scam is connected to LANERIQ Production Truth. It does not claim guaranteed theft prevention or full malware CLEAN verification without sufficient scanner evidence.");
        note.setTextSize(13);
        root.addView(note);
        return scroll;
    }

    private void checkLink() {
        String raw = urlInput.getText().toString().trim();
        if (raw.isEmpty()) {
            showStatus("SafeLink\nINPUT REQUIRED\nPaste or type a link first, then tap Check Link / Phishing Risk.", true);
            return;
        }

        showStatus("SafeLink\nCHECKING\nAnalyzing local phishing and URL risk signals…", true);
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
            String ascii = host.isEmpty() ? "" : IDN.toASCII(host);
            if (ascii.contains("login-") || ascii.contains("secure-") || ascii.contains("verify-") || ascii.contains("wallet-") || ascii.contains("banking-")) { risk += 20; reasons.append("• Credential-lure naming pattern\n"); }
            if (raw.length() > 180) { risk += 15; reasons.append("• Unusually long URL\n"); }
            String verdict = risk >= 50 ? "HIGH RISK — DO NOT OPEN" : risk >= 25 ? "CAUTION — VERIFY BEFORE OPENING" : "LOW LOCAL HEURISTIC RISK — CLOUD VERIFICATION STILL REQUIRED";
            showStatus("SafeLink result\n" + verdict + "\nRisk score: " + Math.min(risk,100) + "/100\n" + (reasons.length()==0 ? "• No local red flags found\n" : reasons) + "\nLANERIQ never treats local heuristics alone as proof of CLEAN.", true);
        } catch (Exception e) {
            showStatus("SafeLink result\nINVALID / UNVERIFIED LINK\nDo not open it until verified.", true);
        }
    }

    private void pickFile() {
        showStatus("File scan\nOPENING FILE PICKER\nChoose a file or APK. LANERIQ will compute its local SHA-256 fingerprint.", true);
        try {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.setType("*/*");
            i.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(i, PICK_FILE);
        } catch (Exception e) {
            showStatus("File scan\nUNAVAILABLE\nUnable to open the Android file picker on this device.", true);
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE) return;

        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            showStatus("File scan\nCANCELLED\nNo file was selected.", true);
            return;
        }

        Uri uri = data.getData();
        showStatus("File scan\nSCANNING\nComputing local SHA-256 fingerprint…", true);
        new Thread(() -> {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                if (in == null) throw new IllegalStateException("No readable stream");
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] buf = new byte[8192]; int n; long size = 0;
                while ((n = in.read(buf)) > 0) { md.update(buf,0,n); size += n; }
                StringBuilder hex = new StringBuilder();
                for (byte b: md.digest()) hex.append(String.format("%02x", b));
                String name = uri.getLastPathSegment() == null ? "selected file" : uri.getLastPathSegment();
                boolean apk = name.toLowerCase(Locale.ROOT).contains(".apk");
                String verdict = apk ? "APK / SIDELOAD — QUARANTINE UNTIL CLOUD + MULTI-SCANNER VERIFICATION" : "FINGERPRINTED — CLOUD VERIFICATION REQUIRED";
                String output = "File scan\n" + verdict + "\nSize: " + size + " bytes\nSHA-256:\n" + hex + "\n\nRaw file content is not stored by default in LANERIQ Security Intelligence Cloud.";
                runOnUiThread(() -> showStatus(output, true));
            } catch (Exception e) {
                runOnUiThread(() -> showStatus("File scan\nFAILED CLOSED\nUnable to fingerprint selected file. No CLEAN claim issued.", true));
            }
        }).start();
    }

    private void bankingSafety() {
        showStatus("Banking Safety\nCHECKING\nReviewing available local device safety signals…", true);
        boolean developer = Settings.Global.getInt(getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1;
        String state = developer ? "BANKING CAUTION" : "BANKING STATUS REQUIRES FULL DEVICE EVIDENCE";
        showStatus("Banking Safety\n" + state + "\n" + (developer ? "• Developer options are enabled\n" : "• No local developer-mode signal detected\n") + "• LANERIQ will not declare BANKING_SAFE without sufficient device, network, app identity, permission and threat evidence.\n\nIf you just installed an unknown APK, saw a black screen/overlay, granted Accessibility, screen-sharing or notification access, stop banking activity and remove the suspicious app first.", true);
    }

    private void refreshTruth(boolean focusResult) {
        showStatus("Protection status\nCHECKING\nContacting LANERIQ Production Truth…", focusResult);
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(TRUTH_URL).openConnection();
                c.setConnectTimeout(6000);
                c.setReadTimeout(6000);
                c.setRequestMethod("GET");
                int code = c.getResponseCode();
                String body;
                try (InputStream in = code >= 200 && code < 400 ? c.getInputStream() : c.getErrorStream()) {
                    body = in == null ? "" : new String(in.readAllBytes());
                }
                boolean fifteen = body.contains("\"financialScamDefenseLayerCount\":15") || body.contains("\"layerCount\":15");
                boolean intel = body.contains("\"privacyPreserving\":true") && body.contains("SECURITY-INTELLIGENCE-CLOUD");
                boolean noGuarantee = body.contains("\"guaranteedTheftPreventionClaimAllowed\":false");
                boolean rawFalse = body.contains("\"rawMalwareBinaryStoredByDefault\":false");
                String out = "Production Protection\nHTTP " + code + "\n15-layer Financial Scam Defense: " + yes(fifteen) + "\nSecurity Intelligence Cloud: " + yes(intel) + "\nPrivacy-preserving threat learning: " + yes(rawFalse) + "\n100% theft-prevention guarantee claimed: " + (noGuarantee ? "NO (correct Truth Gate)" : "UNVERIFIED") + "\n\nCurrent scanner-provider CLEAN evidence remains governed by Production Truth Gate.";
                runOnUiThread(() -> showStatus(out, focusResult));
            } catch (Exception e) {
                runOnUiThread(() -> showStatus("Protection status\nFAIL CLOSED\nProduction Truth endpoint unavailable. Do not assume CLEAN or BANKING_SAFE.", focusResult));
            } finally {
                if (c != null) c.disconnect();
            }
        }).start();
    }

    private void showStatus(String message, boolean focus) {
        status.setText(message);
        if (focus) {
            status.post(() -> scroll.smoothScrollTo(0, Math.max(0, status.getTop() - dp(12))));
        }
    }

    private String yes(boolean v) { return v ? "VERIFIED" : "EVIDENCE REQUIRED"; }

    private Button button(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setAllCaps(false);
        b.setTextSize(16);
        b.setTextColor(Color.WHITE);
        b.setMinHeight(dp(54));
        b.setGravity(Gravity.CENTER);
        b.setClickable(true);
        b.setEnabled(true);
        b.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(20,104,215)));
        return b;
    }

    private TextView text(String s, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(size);
        t.setTextColor(Color.rgb(20,27,38));
        if (bold) t.setTypeface(null, android.graphics.Typeface.BOLD);
        return t;
    }

    private TextView card(String s) {
        TextView t = text(s,15,false);
        t.setPadding(dp(16),dp(16),dp(16),dp(16));
        t.setBackgroundColor(Color.WHITE);
        t.setGravity(Gravity.START);
        LinearLayout.LayoutParams p = matchWrap(dp(16));
        t.setLayoutParams(p);
        return t;
    }

    private LinearLayout.LayoutParams matchWrap(int bottom) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1,-2);
        p.bottomMargin = bottom;
        return p;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }
    private void toast(String s) { Toast.makeText(this,s,Toast.LENGTH_SHORT).show(); }
}
