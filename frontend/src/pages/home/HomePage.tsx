import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { HeroSection } from './sections/HeroSection'
import { CoursesSection } from './sections/CoursesSection'
import { WorkshopSection } from './sections/WorkshopSection'
import { EbookSection } from './sections/EbookSection'
import { AboutSection } from './sections/AboutSection'
import { TestimonialsSection } from './sections/TestimonialsSection'
import { GiftCtaSection } from './sections/GiftCtaSection'

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activeTab="home" />
      <main>
        <HeroSection />
        <CoursesSection />
        <EbookSection />
        <AboutSection />
        <TestimonialsSection />
        <GiftCtaSection />
        <WorkshopSection />
      </main>
      <SiteFooter />
    </div>
  )
}
