import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Ship" className="h-6 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</Link>
            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link href="/founder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Founder</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-all">
                Log in
              </button>
            </Link>
            <Link href="/register">
              <button className="rounded-full bg-ship px-5 py-2 text-sm font-medium text-background hover:bg-ship/90 transition-all">
                Start building
              </button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-32">
        <div className="mx-auto max-w-5xl px-4 relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              For builders aged 13-19
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-[1.1]">
              Build it. Ship it. Prove it.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto md:text-xl leading-relaxed">
              Not a social network. A personal record of every project you ship. No followers. No likes. Just evidence of what you built.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <button className="inline-flex h-12 items-center justify-center rounded-full bg-ship px-8 py-4 text-base font-medium text-background hover:bg-ship/90 transition-all">
                  Start your first build <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </Link>
              <Link href="#how-it-works">
                <button className="inline-flex h-12 items-center justify-center rounded-full border border-border px-8 py-4 text-base font-medium text-muted-foreground hover:bg-accent transition-all">
                  See how it works
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-border py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-3xl text-center mb-20">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              How Ship works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One build at a time. One log per day. Ship when it&apos;s done.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-12 max-w-4xl mx-auto">
            {[
              { number: "01", title: "Start a Build", description: "Give it a title, pick a category (code, design, writing, hardware, AI, other)." },
              { number: "02", title: "Log daily", description: "Every day, write what you built. One log per day. No exceptions." },
              { number: "03", title: "Build your streak", description: "Miss a day and your streak resets to zero. Consistency counts." },
              { number: "04", title: "Ship it", description: "When it&apos;s done, hit Ship. Frozen forever. Proof you built something." },
            ].map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-ship text-background text-sm font-bold">
                  {step.number}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/50 py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Your proof card
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every shipped build generates a shareable proof card. Verified by GitHub. Frozen forever.
            </p>
          </div>
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-ship/5">
            <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-xl">
              <img
                src="/output/sample-card.svg"
                alt="Sample Ship proof card"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Reputation = what you&apos;ve shipped
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No algorithms. No likes. Your score is just math.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <div className="text-3xl font-bold text-ship mb-1">70%</div>
              <div className="text-sm text-muted-foreground">Completed projects</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <div className="text-3xl font-bold text-ocean mb-1">20%</div>
              <div className="text-sm text-muted-foreground">Peer endorsements</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <div className="text-3xl font-bold text-amber mb-1">10%</div>
              <div className="text-sm text-muted-foreground">Consistency (streaks)</div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-border py-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-center mb-16">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {[
              { q: "Is this a social network?", a: "No. No followers, no likes, no comments, no DMs. Ship is a personal record of what you've built." },
              { q: "Who can see my builds?", a: "Shipped builds are public. Active builds are private to you." },
              { q: "What happens if I miss a day?", a: "Your streak resets to zero. No exceptions. That's the point." },
              { q: "Can I edit my logs?", a: "You have 24 hours to edit a log. After that, it's permanent." },
              { q: "Can I delete a shipped build?", a: "No. Shipped builds are frozen forever. That's what makes them meaningful." },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-medium text-foreground mb-1.5">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl mb-4">
            Start building. Ship when it&apos;s done.
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
            No profile setup. No onboarding. Just start your first build.
          </p>
          <Link href="/register">
            <button className="inline-flex h-12 items-center justify-center rounded-full bg-ship px-8 py-4 text-base font-medium text-background hover:bg-ship/90 transition-all">
              Start building <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Ship. Built for builders.
            </p>
            <Link href="/founder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About the founder
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
