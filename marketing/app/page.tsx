import { Navbar } from "@/components/ui/navbar"
import { HeroSection } from "@/components/sections/hero-section"
import { ImpactSection } from "@/components/sections/impact-section"
import { FeaturesSection } from "@/components/sections/features-section"
import { TestimonialsSection } from "@/components/sections/testimonials-section"
import { PricingSection } from "@/components/sections/pricing-section"
import { CtaSection } from "@/components/sections/cta-section"
import { FooterSection } from "@/components/sections/footer-section"
import LightRaysWrapper from "@/components/ui/LightRaysWrapper"

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 relative">
      {/* Light rays spotlight from the top of the page */}
      <div className="absolute top-0 left-0 w-full h-[600px] z-1 pointer-events-none">
        <LightRaysWrapper />
      </div>
      <Navbar />
      <HeroSection />
      {/* <ImpactSection /> */}
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
      <FooterSection />
    </main>
  )
}
