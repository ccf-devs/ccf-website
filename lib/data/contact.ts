import { CCF_EYEBROW, CCF_PUBLIC_INFO } from "@/components/site/navigation-data";

export interface ContactChannel {
  id: string;
  label: string;
  value: string;
  href?: string;
  description: string;
  isExternal?: boolean;
  iconName: "Mail" | "Instagram" | "Linkedin" | "MapPin";
}

export interface ContactHeroData {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface ContactLocationData {
  eyebrow: string;
  heading: string;
  institution: string;
  campus: string;
  address: string;
  description: string;
  mapEmbedUrl: string;
  mapTitle: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContactSocialData {
  eyebrow: string;
  heading: string;
  description: string;
}

export interface ContactCtaData {
  eyebrow: string;
  heading: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel: string;
  secondaryActionHref: string;
}

export const CONTACT_HERO: ContactHeroData = {
  eyebrow: CCF_EYEBROW,
  title: "Let’s Connect",
  subtitle:
    "Reach us through our official email or follow our social channels.",
};

export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  {
    id: "channel-email",
    label: "Official Email",
    value: CCF_PUBLIC_INFO.email,
    href: `mailto:${CCF_PUBLIC_INFO.email}`,
    description: "Official email channel for contacting Crescent Club of Finance.",
    iconName: "Mail",
  },
  {
    id: "channel-instagram",
    label: "Instagram",
    value: "@crescentcluboffinance",
    href: CCF_PUBLIC_INFO.socials.instagram,
    description: "Official Instagram channel of Crescent Club of Finance.",
    isExternal: true,
    iconName: "Instagram",
  },
  {
    id: "channel-linkedin",
    label: "LinkedIn",
    value: "Crescent Club of Finance",
    href: CCF_PUBLIC_INFO.socials.linkedin,
    description: "Official LinkedIn channel of Crescent Club of Finance.",
    isExternal: true,
    iconName: "Linkedin",
  },
] as const;

export function getContactChannels(settings?: {
  contactEmail?: string;
  supportEmail?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
}): readonly ContactChannel[] {
  const email = settings?.contactEmail || CCF_PUBLIC_INFO.email;
  const supportEmail = settings?.supportEmail;
  const instagram = settings?.socialInstagram || CCF_PUBLIC_INFO.socials.instagram;
  const linkedin = settings?.socialLinkedin || CCF_PUBLIC_INFO.socials.linkedin;

  const channels: ContactChannel[] = [
    {
      id: "channel-email",
      label: "Official Email",
      value: email,
      href: `mailto:${email}`,
      description: "Official email channel for contacting Crescent Club of Finance.",
      iconName: "Mail",
    },
  ];

  if (supportEmail) {
    channels.push({
      id: "channel-support-email",
      label: "Technical Support",
      value: supportEmail,
      href: `mailto:${supportEmail}`,
      description: "Having trouble with the website? Contact our technical support team.",
      iconName: "Mail",
    });
  }

  channels.push(
    {
      id: "channel-instagram",
      label: "Instagram",
      value: "@crescentcluboffinance",
      href: instagram,
      description: "Official Instagram channel of Crescent Club of Finance.",
      isExternal: true,
      iconName: "Instagram",
    },
    {
      id: "channel-linkedin",
      label: "LinkedIn",
      value: "Crescent Club of Finance",
      href: linkedin,
      description: "Official LinkedIn channel of Crescent Club of Finance.",
      isExternal: true,
      iconName: "Linkedin",
    }
  );

  return channels;
}

export const CONTACT_SOCIAL: ContactSocialData = {
  eyebrow: CCF_EYEBROW,
  heading: "Official Social Channels",
  description:
    "Follow our official pages for event updates and announcements.",
};

export const CRESCENT_CAMPUS_COORDINATES = {
  latitude: 12.87748,
  longitude: 80.08462,
} as const;

export const CONTACT_LOCATION: ContactLocationData = {
  eyebrow: CCF_EYEBROW,
  heading: "Campus Presence",
  institution: CCF_PUBLIC_INFO.affiliation,
  campus: CCF_PUBLIC_INFO.campus,
  address: "GST Road, Vandalur, Chennai – 600 048, Tamil Nadu, India",
  description:
    "Crescent Club of Finance is based at B.S. Abdur Rahman Crescent Institute of Science and Technology.",
  mapEmbedUrl:
    `https://maps.google.com/maps?q=${CRESCENT_CAMPUS_COORDINATES.latitude},${CRESCENT_CAMPUS_COORDINATES.longitude}&hl=en&z=16&output=embed`,
  mapTitle: "Map showing Crescent College, Vandalur",
  coordinates: CRESCENT_CAMPUS_COORDINATES,
};

export const CONTACT_CTA: ContactCtaData = {
  eyebrow: CCF_EYEBROW,
  heading: "Have a Question or Looking to Connect?",
  description:
    "Send us an email or explore membership opportunities.",
  primaryActionLabel: "Send an Email",
  primaryActionHref: `mailto:${CCF_PUBLIC_INFO.email}`,
  secondaryActionLabel: "Explore Membership",
  secondaryActionHref: "/join-us",
};
