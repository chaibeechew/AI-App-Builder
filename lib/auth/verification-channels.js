export const verificationChannels = {
  email: { enabled: true, default: true, costModel: "low_cost" },
  whatsapp: { enabled: true, default: false, costModel: "provider_dependent" },
  telegram: { enabled: true, default: false, costModel: "provider_dependent" },
  line: { enabled: true, default: false, costModel: "provider_dependent" },
  wechat: { enabled: true, default: false, costModel: "provider_dependent" },
  sms: { enabled: false, default: false, costModel: "paid" },
};

export function isVerificationChannelEnabled(channel) {
  return Boolean(verificationChannels[channel]?.enabled);
}

export function referralMayQualify({ verified, channel }) {
  return Boolean(verified && isVerificationChannelEnabled(channel));
}
