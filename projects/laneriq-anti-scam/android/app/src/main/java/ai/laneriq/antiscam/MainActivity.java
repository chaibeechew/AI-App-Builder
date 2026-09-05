package ai.laneriq.antiscam;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.text.DateFormat;
import java.util.Date;

public class MainActivity extends Activity {
    private TextView status;
    private TextView eventLog;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(buildUi());
        requestNotificationPermissionIfNeeded();
        refreshStatus();
    }

    @Override protected void onResume() {
        super.onResume();
        refreshStatus();
    }

    private ScrollView buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(28), dp(20), dp(36));
        root.setBackgroundColor(Color.rgb(247, 249, 252));
        scroll.addView(root);

        root.addView(text("LANERIQ Anti Scam", 30, true));
        TextView subtitle = text("P0 Guardian Reliability Test • 0.2.0-p0.1", 15, false);
        subtitle.setTextColor(Color.DKGRAY);
        root.addView(subtitle);

        TextView truth = text("Truth Gate: Guardian status is shown only from a fresh local Protection Lease.", 13, true);
        truth.setTextColor(Color.rgb(150, 85, 0));
        truth.setPadding(0, dp(12), 0, dp(18));
        root.addView(truth);

        status = card("Protection state\nLoading local Guardian evidence…");
        status.setTextIsSelectable(true);
        root.addView(status);

        Button start = button("Enable Always-On Guardian");
        start.setOnClickListener(v -> startGuardian());
        root.addView(start, matchWrap(dp(12)));

        Button stop = button("Pause Guardian");
        stop.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(96, 105, 120)));
        stop.setOnClickListener(v -> stopGuardian());
        root.addView(stop, matchWrap(dp(12)));

        Button refresh = button("Refresh Protection Lease");
        refresh.setOnClickListener(v -> refreshStatus());
        root.addView(refresh, matchWrap(dp(18)));

        TextView note = card(
                "P0 scope\n" +
                "• Guardian lifecycle + user opt-in\n" +
                "• Fresh/stale Protection Lease truth state\n" +
                "• Developer Options / ADB / Accessibility risk signals\n" +
                "• App install/update awareness\n" +
                "• Local event deduplication\n" +
                "• Power-save / thermal-aware cadence\n\n" +
                "This test build does not claim CLEAN, BANKING_SAFE, guaranteed theft prevention, or unrestricted system-wide malware scanning.");
        note.setTextSize(13);
        root.addView(note);

        eventLog = card("Local bounded event log\n[]");
        eventLog.setTextSize(11);
        eventLog.setTextIsSelectable(true);
        root.addView(eventLog);
        return scroll;
    }

    private void startGuardian() {
        ProtectionLeaseStore store = new ProtectionLeaseStore(this);
        store.setUserOptedIn(true);
        Intent i = new Intent(this, GuardianService.class).setAction(GuardianService.ACTION_START);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(i);
            else startService(i);
            toast("Guardian start requested");
        } catch (Exception e) {
            store.serviceStopped();
            toast("Guardian could not start on this device state");
        }
        status.postDelayed(this::refreshStatus, 750L);
    }

    private void stopGuardian() {
        ProtectionLeaseStore store = new ProtectionLeaseStore(this);
        store.setUserOptedIn(false);
        Intent i = new Intent(this, GuardianService.class).setAction(GuardianService.ACTION_STOP);
        try {
            startService(i);
        } catch (Exception ignored) {
            store.serviceStopped();
        }
        toast("Guardian paused");
        status.postDelayed(this::refreshStatus, 300L);
    }

    private void refreshStatus() {
        ProtectionLeaseStore.Lease lease = new ProtectionLeaseStore(this).read();
        String headline;
        switch (lease.state) {
            case ACTIVE:
                headline = "GUARDIAN ACTIVE";
                break;
            case DEGRADED_OFFLINE:
                headline = "PROTECTION DEGRADED — GUARDIAN OFFLINE";
                break;
            case DEGRADED_STALE:
                headline = "PROTECTION DEGRADED — LEASE STALE";
                break;
            case PAUSED:
                headline = "GUARDIAN PAUSED";
                break;
            default:
                headline = "PROTECTION STATE UNKNOWN";
        }

        String heartbeat = lease.lastHeartbeatMs > 0
                ? DateFormat.getDateTimeInstance().format(new Date(lease.lastHeartbeatMs))
                : "none";
        String expiry = lease.expiresAtMs > 0
                ? DateFormat.getDateTimeInstance().format(new Date(lease.expiresAtMs))
                : "none";

        status.setText(
                "Protection state\n" + headline +
                "\n\nLocal risk: " + lease.localRiskLevel +
                "\nActive engines: " + lease.activeEngineSet +
                "\nLast heartbeat: " + heartbeat +
                "\nLease expires: " + expiry +
                "\nPolicy: " + lease.policyVersion +
                "\nReputation snapshot: " + lease.reputationSnapshotVersion +
                "\n\nA stale or missing lease never displays Guardian Active.");

        eventLog.setText("Local bounded event log\n" + new LocalEventStore(this).readLog());
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
        }
    }

    private Button button(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextSize(16);
        b.setTextColor(Color.WHITE);
        b.setMinHeight(dp(54));
        b.setGravity(Gravity.CENTER);
        b.setEnabled(true);
        b.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(20, 104, 215)));
        return b;
    }

    private TextView text(String s, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(size);
        t.setTextColor(Color.rgb(20, 27, 38));
        if (bold) t.setTypeface(null, android.graphics.Typeface.BOLD);
        return t;
    }

    private TextView card(String s) {
        TextView t = text(s, 15, false);
        t.setPadding(dp(16), dp(16), dp(16), dp(16));
        t.setBackgroundColor(Color.WHITE);
        t.setGravity(Gravity.START);
        t.setLayoutParams(matchWrap(dp(16)));
        return t;
    }

    private LinearLayout.LayoutParams matchWrap(int bottom) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.bottomMargin = bottom;
        return p;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private void toast(String s) {
        Toast.makeText(this, s, Toast.LENGTH_SHORT).show();
    }
}
