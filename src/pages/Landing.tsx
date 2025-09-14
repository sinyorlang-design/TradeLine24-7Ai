import InstallAppButton from '@/components/InstallAppButton';

const TL_NUMBER = '+15878839797';

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white">
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-6xl font-bold">TradeLine 24/7</h1>
        <p className="mt-4 text-lg opacity-80">
          AI Receptionist that answers, books, and follows-up — in your customer’s language.
        </p>
        <div className="mt-8 flex gap-3 flex-wrap">
          <a href={`tel:${TL_NUMBER}`} className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400">
            Call Now
          </a>
          <a href="/demo" className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20">
            Request Demo
          </a>
          <InstallAppButton className="bg-emerald-500 hover:bg-emerald-400" />
        </div>
        <p className="mt-3 text-sm opacity-70">Or save the number: {TL_NUMBER}</p>
      </section>
    </main>
  );
}
