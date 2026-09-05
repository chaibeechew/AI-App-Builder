package ai.laneriq.antiscam;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        ProtectionLeaseStore leaseStore = new ProtectionLeaseStore(context);
        if (!leaseStore.isUserOptedIn()) return;

        new LocalEventStore(context).recordOnce(
                "guardian_restore_request",
                intent == null ? "unknown" : String.valueOf(intent.getAction()),
                10_000L);

        Intent service = new Intent(context, GuardianService.class)
                .setAction(GuardianService.ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(service);
        } else {
            context.startService(service);
        }
    }
}
