package ai.laneriq.antiscam;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;

public class GuardianService extends Service {
    public static final String ACTION_START = "ai.laneriq.antiscam.guardian.START";
    public static final String ACTION_STOP = "ai.laneriq.antiscam.guardian.STOP";
    public static final String ACTION_PACKAGE_CHANGED = "ai.laneriq.antiscam.guardian.PACKAGE_CHANGED";
    public static final String EXTRA_PACKAGE = "package";

    private static final String CHANNEL_PROTECTION = "laneriq_guardian_protection";
    private static final String CHANNEL_ALERTS = "laneriq_guardian_alerts";
    private static final int NOTIFICATION_ID = 5201;
    private static final int ALERT_ID = 5202;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private ProtectionLeaseStore leaseStore;
    private LocalEventStore eventStore;
    private ResourceGovernor governor;
    private String lastAlertFingerprint = "";

    private final Runnable monitor = new Runnable() {
        @Override public void run() {
            runRiskCheck();
            handler.postDelayed(this, governor.nextGuardianIntervalMs());
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        leaseStore = new ProtectionLeaseStore(this);
        eventStore = new LocalEventStore(this);
        governor = new ResourceGovernor(this);
        createChannels();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();

        if (ACTION_STOP.equals(action)) {
            leaseStore.setUserOptedIn(false);
            leaseStore.serviceStopped();
            eventStore.recordOnce("guardian_stop", "user", 1_000L);
            handler.removeCallbacks(monitor);
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        leaseStore.serviceStarted();
        eventStore.recordOnce("guardian_start", "local", 5_000L);
        startForeground(NOTIFICATION_ID,
                buildProtectionNotification("Guardian starting • verifying local protection state"));

        handler.removeCallbacks(monitor);
        handler.post(monitor);

        if (ACTION_PACKAGE_CHANGED.equals(action)) {
            String packageName = intent == null ? null : intent.getStringExtra(EXTRA_PACKAGE);
            if (packageName != null && !packageName.trim().isEmpty()) {
                String eventId = eventStore.recordOnce(
                        "package_change", packageName, 30_000L);
                if (eventId != null) {
                    showAlert(
                            "New app activity detected",
                            "Installed or updated: " + packageName +
                                    ". Review it before sensitive banking or payment activity.");
                }
            }
        }
        return START_STICKY;
    }

    private void runRiskCheck() {
        boolean developer = Settings.Global.getInt(
                getContentResolver(), Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) == 1;
        boolean adb = Settings.Global.getInt(
                getContentResolver(), Settings.Global.ADB_ENABLED, 0) == 1;
        boolean accessibility = Settings.Secure.getInt(
                getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1;

        int riskCount = 0;
        StringBuilder signals = new StringBuilder();
        if (developer) {
            riskCount++;
            signals.append("Developer options enabled");
        }
        if (adb) {
            if (signals.length() > 0) signals.append(" • ");
            riskCount++;
            signals.append("ADB enabled");
        }
        if (accessibility) {
            if (signals.length() > 0) signals.append(" • ");
            riskCount++;
            signals.append("Accessibility enabled — review active services");
        }

        String riskLevel = riskCount >= 2 ? "elevated" : riskCount == 1 ? "review" : "low-local-signal";
        leaseStore.heartbeat(riskLevel, "guardian,device-signals,event-dedup,resource-governor");

        ProtectionLeaseStore.Lease lease = leaseStore.read();
        String summary = riskCount == 0
                ? "Guardian active • no elevated local signals"
                : "Guardian review needed • " + signals;
        if (governor.shouldReduceBackgroundWork()) {
            summary += " • reduced background cadence";
        }

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(NOTIFICATION_ID, buildProtectionNotification(summary));

        if (riskCount > 0) {
            String fingerprint = developer + ":" + adb + ":" + accessibility;
            if (!fingerprint.equals(lastAlertFingerprint)) {
                String eventId = eventStore.recordOnce("risk_signal_set", fingerprint, 120_000L);
                if (eventId != null) {
                    showAlert(
                            "LANERIQ Guardian review needed",
                            signals + ". These signals are not proof of malware. Review them before banking or payments.");
                }
                lastAlertFingerprint = fingerprint;
            }
        } else {
            lastAlertFingerprint = "";
        }

        if (lease.state != ProtectionTruth.State.ACTIVE) {
            eventStore.recordOnce("lease_not_active", lease.state.name(), 60_000L);
        }
    }

    private Notification buildProtectionNotification(String text) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(
                this, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent stop = new Intent(this, GuardianService.class).setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(
                this, 2, stop,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new Notification.Builder(this, CHANNEL_PROTECTION)
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("LANERIQ Anti Scam • Guardian")
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(openPi)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .addAction(android.R.drawable.ic_menu_view, "Open", openPi)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Guardian", stopPi)
                .build();
    }

    private void showAlert(String title, String message) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent openPi = PendingIntent.getActivity(
                this, 3, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification alert = new Notification.Builder(this, CHANNEL_ALERTS)
                .setSmallIcon(android.R.drawable.stat_sys_warning)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new Notification.BigTextStyle().bigText(message))
                .setContentIntent(openPi)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_ALARM)
                .build();
        ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).notify(ALERT_ID, alert);
    }

    private void createChannels() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        NotificationChannel protection = new NotificationChannel(
                CHANNEL_PROTECTION,
                "Guardian Protection Status",
                NotificationManager.IMPORTANCE_LOW);
        protection.setDescription("Persistent LANERIQ Anti Scam Guardian status");
        protection.enableLights(false);
        protection.enableVibration(false);
        nm.createNotificationChannel(protection);

        NotificationChannel alerts = new NotificationChannel(
                CHANNEL_ALERTS,
                "Guardian Risk Alerts",
                NotificationManager.IMPORTANCE_HIGH);
        alerts.setDescription("Important LANERIQ Anti Scam device-risk alerts");
        alerts.enableLights(true);
        alerts.setLightColor(Color.CYAN);
        nm.createNotificationChannel(alerts);
    }

    @Override public void onDestroy() {
        handler.removeCallbacks(monitor);
        if (leaseStore != null) leaseStore.serviceStopped();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) {
        return null;
    }
}
