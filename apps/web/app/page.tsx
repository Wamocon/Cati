import { TopBar } from "./sections/top-bar"
import { Navbar } from "./sections/navbar"
import { Hero } from "./sections/hero"
import { Stats } from "./sections/stats"
import { ProblemBento } from "./sections/problem-bento"
import { SolutionGrid } from "./sections/solution-grid"
import { Services } from "./sections/services"
import { HowItWorks } from "./sections/how-it-works"
import { CTA } from "./sections/cta"
import { Footer } from "./sections/footer"

export default function HomePage() {
  return (
    <>
      <TopBar />
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <ProblemBento />
        <SolutionGrid />
        <Services />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
