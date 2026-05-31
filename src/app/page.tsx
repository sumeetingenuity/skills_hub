import HeroSection from "@/components/landing/HeroSection";
import WhatIsAmtp from "@/components/landing/WhatIsAmtp";
import EcosystemMetrics from "@/components/landing/EcosystemMetrics";
import FeaturedCapabilities from "@/components/landing/FeaturedCapabilities";
import WhyAmtp from "@/components/landing/WhyAmtp";
import CtaSection from "@/components/landing/CtaSection";

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <WhatIsAmtp />
      <EcosystemMetrics />
      <FeaturedCapabilities />
      <WhyAmtp />
      <CtaSection />
    </div>
  );
}
