const env = (key: string, fallback = ''): string => process.env[key] ?? fallback;

export const config = {
  port: Number(env('PORT', '4000')),
  publicUrl: env('PUBLIC_URL', 'http://localhost:4000'),
  jwtSecret: env('JWT_SECRET', 'change-me-in-env'),
  databaseUrl: env('DATABASE_URL', 'postgres://simupbx:simupbx@localhost:5432/simupbx'),

  // FreeSWITCH Event Socket
  esl: {
    host: env('FS_ESL_HOST', 'freeswitch'),
    port: Number(env('FS_ESL_PORT', '8021')),
    password: env('FS_ESL_PASSWORD', 'ClueCon'),
  },
  sipDomain: env('SIP_DOMAIN', 'simupbx.local'),

  // Africa's Talking (voice + SMS). Sandbox: username 'sandbox'.
  at: {
    username: env('AT_USERNAME'),
    apiKey: env('AT_API_KEY'),
    voiceNumber: env('AT_VOICE_NUMBER'), // e.g. +254709100100
    smsSenderId: env('AT_SMS_SENDER_ID'),
  },

  // Safaricom Daraja (M-Pesa)
  mpesa: {
    consumerKey: env('MPESA_CONSUMER_KEY'),
    consumerSecret: env('MPESA_CONSUMER_SECRET'),
    shortCode: env('MPESA_SHORTCODE'),
    passkey: env('MPESA_PASSKEY'),
    baseUrl: env('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke'),
  },

  // Anthropic — powers Zuri, summaries, urgency detection
  anthropic: {
    apiKey: env('ANTHROPIC_API_KEY'),
    model: env('ANTHROPIC_MODEL', 'claude-opus-4-8'),
  },

  security: {
    allowInternational: env('ALLOW_INTERNATIONAL', 'false') === 'true',
    intlAllowlist: env('INTL_ALLOWLIST', '').split(',').filter(Boolean), // e.g. "+44,+1"
    maxOutboundPerHourPerUser: Number(env('MAX_OUTBOUND_PER_HOUR', '60')),
  },
};

export const hasAT = () => Boolean(config.at.username && config.at.apiKey);
export const hasAnthropic = () => Boolean(config.anthropic.apiKey);
export const hasMpesa = () => Boolean(config.mpesa.consumerKey && config.mpesa.consumerSecret);
