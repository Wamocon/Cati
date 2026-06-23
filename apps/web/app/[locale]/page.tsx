import { TopBar } from "../sections/top-bar"
import { Navbar } from "../sections/navbar"
import { Hero } from "../sections/hero"
import { Stats } from "../sections/stats"
import { ProblemBento } from "../sections/problem-bento"
import { SolutionGrid } from "../sections/solution-grid"
import { ComplianceFeatures } from "../sections/compliance-features"
import { Services } from "../sections/services"
import { HowItWorks } from "../sections/how-it-works"
import { PlatformDemo } from "../sections/platform-demo"
import { CTA } from "../sections/cta"
import { Footer } from "../sections/footer"

export default function HomePage() {
  return (
    <>
      <TopBar />
      <Navbar />
      <div className="h-[104px]" />
      <div className="relative">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[20%] left-1/2 h-[900px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/[0.035] blur-[140px]" />
          <div className="absolute top-[30%] -right-[10%] h-[600px] w-[600px] rounded-full bg-accent/[0.03] blur-[120px]" />
          <div className="absolute top-[60%] -left-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
          <div className="absolute right-1/4 bottom-[5%] h-[500px] w-[500px] rounded-full bg-accent/[0.025] blur-[100px]" />
        </div>
        <main id="main" className="relative z-10">
          <Hero />
          <Stats />
          <ProblemBento />
          <SolutionGrid />
          <ComplianceFeatures />
          <Services />
          <PlatformDemo />
          <HowItWorks />
          <CTA />
        </main>
      </div>
      <Footer />
    </>
  )
}
