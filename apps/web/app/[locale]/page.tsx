import { Navbar } from "../sections/navbar"
import { Hero } from "../sections/hero"
import { IsometricErpWorld } from "@/components/isometric-erp-world"
import { NewLevelImmersion } from "../sections/new-level-immersion"
import { Stats } from "../sections/stats"
import { ProblemBento } from "../sections/problem-bento"
import { SolutionGrid } from "../sections/solution-grid"
import { ComplianceFeatures } from "../sections/compliance-features"
import { HowItWorks } from "../sections/how-it-works"
import { PlatformWorkflow } from "../sections/platform-workflow"
import { CTA } from "../sections/cta"
import { Footer } from "../sections/footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="h-16" />
      <div className="relative">
        <main id="main" className="relative z-10">
          <Hero />
          <IsometricErpWorld />
          <NewLevelImmersion />
          <PlatformWorkflow />
          <Stats />
          <ProblemBento />
          <SolutionGrid />
          <ComplianceFeatures />
          <HowItWorks />
          <CTA />
        </main>
      </div>
      <Footer />
    </>
  )
}
