import Link from "next/link";
import { ArrowRight, ShieldCheck, Target, Layers, BrainCircuit, Play } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-gray-200/60 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2 text-charcoal-800 font-bold text-xl tracking-tight">
          <div className="w-6 h-6 bg-amber-600 rounded-md"></div>
          Jerry
        </div>
        <div className="flex items-center gap-4">
          <Link href="/#how-it-works" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-charcoal-900 transition-colors">
            How it works
          </Link>
          <Link href="/chat" className="bg-charcoal-800 hover:bg-charcoal-900 text-white text-sm font-medium px-4 py-2 rounded-full transition-all">
            Talk to Jerry
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-32 max-w-5xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-charcoal-900 tracking-tight leading-tight mb-6">
            Your personal <span className="text-amber-700 italic pr-2">AI operator.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Jerry turns scattered goals, questions, files, and decisions into clear plans and safe next actions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/chat" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-base font-semibold px-8 py-3.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20">
              Talk to Jerry <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-charcoal-800 text-base font-medium px-8 py-3.5 rounded-full transition-all">
              See How Jerry Works
            </Link>
          </div>
        </section>

        {/* Capabilities Section */}
        <section className="px-6 py-20 bg-white border-y border-gray-200/60">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal-900 mb-4">What Jerry Does</h2>
              <p className="text-gray-600 max-w-xl mx-auto">Jerry isn&apos;t just a chatbot. He&apos;s an operator designed to help you think through problems and build concrete solutions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: BrainCircuit, title: "Ask and understand", desc: "Get thoughtful answers backed by detailed context." },
                { icon: Target, title: "Plan goals", desc: "Break massive projects into actionable, trackable milestones." },
                { icon: Layers, title: "Analyze decisions", desc: "Weigh counterarguments, risks, and evidence for tough choices." },
                { icon: ShieldCheck, title: "Prepare safe actions", desc: "Jerry prepares tool executions but waits for your explicit approval." },
                { icon: Play, title: "Execute projects", desc: "Run complex workflows safely (Coming soon in Build Mode).", comingSoon: true }
              ].map((feat, i) => (
                <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-sm transition-shadow">
                  <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-charcoal-800 mb-2 flex items-center gap-2">
                    {feat.title}
                    {feat.comingSoon && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Planned</span>}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Safety Philosophy */}
        <section id="how-it-works" className="px-6 py-24 max-w-4xl mx-auto text-center">
          <ShieldCheck className="w-12 h-12 text-charcoal-300 mx-auto mb-6" />
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-charcoal-900 mb-6">Safety by Design</h2>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
            Jerry operates on a strict permission model. While he can reason about your files and propose powerful actions, 
            <strong className="text-charcoal-800 font-semibold mx-1">nothing executes without your approval</strong>.
            You always maintain total control over your environment.
          </p>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-24 bg-charcoal-900 text-white text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">Ready to get to work?</h2>
          <Link href="/chat" className="inline-flex bg-amber-600 hover:bg-amber-500 text-white text-base font-semibold px-8 py-4 rounded-full items-center justify-center gap-2 transition-all">
            Start a Conversation <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </main>

      <footer className="px-6 py-8 border-t border-gray-200 text-center text-sm text-gray-500 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>&copy; {new Date().getFullYear()} Jerry AI Operator.</div>
        <div className="flex gap-4">
          <span className="hover:text-charcoal-800 transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-charcoal-800 transition-colors cursor-pointer">Terms</span>
        </div>
      </footer>
    </div>
  );
}
