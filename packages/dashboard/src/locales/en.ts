export const en = {
  appName: 'Trend Intelligence',

  nav: {
    home: 'Home',
    analysis: 'Analysis',
    history: 'History',
    setup: 'Setup',
    system: 'System',
    settings: 'Settings',
    account: 'Account',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    signOut: 'Sign out',
  },

  auth: {
    tagline: "Spot what's trending before everyone else.",
    description: 'Monitor Instagram hashtags, profiles and trends in real time.',
    signIn: 'Sign in',
    signInSubtitle: 'Use your email and password to access the dashboard',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signingIn: 'Signing in…',
    invalidCredentials: 'Invalid credentials',
    connectionError: 'Could not connect to the API',
    noAccountHint: 'No account configured? Set',
    noAccountHintSuffix: 'on the server and use the email registered in your profile.',
    copyright: '© 2025 Trend Intelligence',
  },

  pages: {
    home: {
      title: 'Home',
      subtitle: 'Collect, detect events and analyze trends',
    },
    analysis: {
      title: 'Analysis',
      subtitle: 'Detected events and AI content analysis',
    },
    history: {
      title: 'History',
      subtitle: 'Past collection runs and analyses',
    },
    setup: {
      title: 'Setup',
      subtitle: 'Campaigns, hashtags and tracked profiles',
      tabs: { campaigns: 'Campaigns', hashtags: 'Hashtags', profiles: 'Profiles' },
    },
    settings: {
      title: 'Settings',
      subtitle: 'Alerts, API access and system',
      tabs: { alerts: 'Alerts', apiTokens: 'API Tokens', system: 'System' },
    },
    account: {
      title: 'My Account',
      subtitle: 'Profile and security',
    },
  },

  profile: {
    title: 'Profile',
    subtitle: 'Name and login email',
    loading: 'Loading…',
    name: 'Name',
    email: 'Email',
    memberSince: 'Member since',
    notSet: 'not set',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@example.com',
    saveError: 'Error saving. Please try again.',
    save: 'Save',
    cancel: 'Cancel',
  },

  password: {
    title: 'Change password',
    subtitle: 'Minimum 8 characters',
    current: 'Current password',
    new: 'New password',
    confirm: 'Confirm new password',
    tooShort: 'Minimum 8 characters',
    mismatch: 'Passwords do not match',
    changeError: 'Error changing password',
    success: 'Password changed successfully.',
    submit: 'Change password',
  },

  apiTokens: {
    title: 'API Tokens',
    subtitle: 'For programmatic access — scripts, automations, integrations',
    namePlaceholder: 'Token name (e.g. CI/CD, Zapier)',
    create: 'Create',
    loading: 'Loading…',
    empty: 'No tokens created.',
    createdLabel: 'created',
    usedLabel: 'used',
    never: 'never',
    revealNotice: 'Token created — copy now, it will not be shown again',
    dismissReveal: 'Already copied, close',
  },

  common: {
    loading: 'Loading…',
  },
} as const;

export type Translations = typeof en;
