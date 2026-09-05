package ai.laneriq.antiscam;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.UUID;

public final class LocalEventStore {
    private static final String PREFS = "laneriq_guardian_events";
    private static final String K_LOG = "bounded_event_log";
    private static final String K_LAST_PREFIX = "last:";
    private static final int MAX_EVENTS = 64;

    private final SharedPreferences prefs;

    public LocalEventStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public synchronized String recordOnce(String type, String fingerprint, long dedupeWindowMs) {
        long now = System.currentTimeMillis();
        String normalizedType = type == null ? "unknown" : type.trim().toLowerCase();
        String normalizedFingerprint = fingerprint == null ? "unknown" : fingerprint.trim().toLowerCase();
        String dedupeKey = K_LAST_PREFIX + normalizedType + ":" + normalizedFingerprint;
        long last = prefs.getLong(dedupeKey, 0L);
        if (last > 0L && Math.max(0L, now - last) < dedupeWindowMs) return null;

        String eventId = UUID.randomUUID().toString();
        JSONArray oldLog;
        try {
            oldLog = new JSONArray(prefs.getString(K_LOG, "[]"));
        } catch (Exception ignored) {
            oldLog = new JSONArray();
        }

        JSONArray next = new JSONArray();
        int start = Math.max(0, oldLog.length() - (MAX_EVENTS - 1));
        for (int i = start; i < oldLog.length(); i++) {
            next.put(oldLog.opt(i));
        }

        JSONObject event = new JSONObject();
        try {
            event.put("event_id", eventId);
            event.put("type", normalizedType);
            event.put("fingerprint", normalizedFingerprint);
            event.put("at_ms", now);
            next.put(event);
        } catch (Exception ignored) {
            return null;
        }

        prefs.edit()
                .putLong(dedupeKey, now)
                .putString(K_LOG, next.toString())
                .apply();
        return eventId;
    }

    public synchronized String readLog() {
        return prefs.getString(K_LOG, "[]");
    }
}
