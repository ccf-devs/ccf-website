import { Metadata } from "next";
import {
  ContactHero,
  ContactInformation,
  ContactSocial,
  ContactLocation,
  ContactCta,
} from "@/components/contact";

export const metadata: Metadata = {
  title: "Contact — Crescent Club of Finance | Crescent College",
  description:
    "Contact the Crescent Club of Finance at B.S. Abdur Rahman Crescent Institute of Science and Technology. Reach out via email or connect through our official channels.",
  openGraph: {
    title: "Contact — Crescent Club of Finance",
    description:
      "Contact the Crescent Club of Finance at B.S. Abdur Rahman Crescent Institute of Science and Technology. Reach out via email or connect through our official channels.",
    siteName: "Crescent Club of Finance",
    locale: "en_US",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="flex flex-col">
      {/* 1. Hero */}
      <ContactHero />

      {/* 2. Official Contact Information */}
      <ContactInformation />

      {/* 3. Official Social Channels */}
      <ContactSocial />

      {/* 4. Campus Presence / Location */}
      <ContactLocation />

      {/* 5. Contact CTA */}
      <ContactCta />
    </div>
  );
}
