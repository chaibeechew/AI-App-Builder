export const verificationChannels = {
  email: { enabled: true, default: true, costModel: "low_cost" },
  whatsapp: { enabled: true, default: false, costModel: "meta_cloud_api" },
};

export function isVerificationChannelEnabled(channel) {
  return Boolean(verificationChannels[channel]?.enabled);
}

export function referralMayQualify({ verified, channel }) {
  return Boolean(verified && isVerificationChannelEnabled(channel));
}