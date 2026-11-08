import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, CheckCircle2, LoaderCircle, Crown, Image, Code2, Globe2, Gauge, Sparkles, X, WandSparkles, CreditCard, ShieldCheck, XCircle } from 'lucide-react';
import { plan, type PlanOutputType } from 'zitejs/api';
import { PRO_PRICE_AED } from '../lib/plan';
import Logo from './Logo';
const FREE = ['Echo and Echo Fast models', 'Uses Echo I1 basic image generation', '5 generated images each day', '2 saved website projects', 'Solid, capable websites and code'];
const PRO = ['Echo Pro model — faster thinking, stronger results', 'Uses Echo I1 Pro image creation', 'Outstanding photorealistic photos (max realism)', 'Faster responses and sharper creative output', 'Agency-grade websites, dashboards, games & apps', 'Production-quality code and polished UI', 'Unlimited saved website projects'];
type Props = {
  open: boolean;
  onClose: () => void;
  onUpgraded: (p: PlanOutputType) => void;
  email?: string;
  isPro: boolean;
};
type VerifyState = 'idle' | 'checking' | 'success' | 'failed';
function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}
function formatCard(v: string) {
  const d = onlyDigits(v).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
function formatExp(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
export default function UpgradeDialog({
  open,
  onClose,
  onUpgraded,
  isPro
}: Props) {
  const [loading, setLoading] = useState(false);
  const [verify, setVerify] = useState<VerifyState>('idle');
  const [error, setError] = useState('');
  const [stage, setStage] = useState<'plan' | 'checkout'>('plan');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const digits = onlyDigits(number);
  const formReady = name.trim().length >= 2 && digits.length >= 12 && onlyDigits(exp).length === 4 && onlyDigits(cvc).length >= 3;
  const previewLast4 = useMemo(() => digits.length >= 4 ? digits.slice(-4) : '4242', [digits]);
  const close = () => {
    setStage('plan');
    setError('');
    setVerify('idle');
    setLoading(false);
    onClose();
  };
  const resetCheckout = () => {
    setError('');
    setVerify('idle');
    setLoading(false);
  };
  const activatePreview = async () => {
    if (loading || isPro || !formReady) return;
    setLoading(true);
    setVerify('checking');
    setError('');
    try {
      // Visual demo only — no real card is sent anywhere.
      await new Promise(r => setTimeout(r, 900));
      // Demo failure path: any card ending in 0000 fails.
      if (digits.endsWith('0000')) {
        setVerify('failed');
        setError('Payment failed. Please check the card details and try again.');
        setLoading(false);
        return;
      }
      await new Promise(r => setTimeout(r, 700));
      setVerify('success');
      await new Promise(r => setTimeout(r, 650));
      const result = await plan({
        action: 'upgrade'
      });
      onUpgraded(result);
      setStage('plan');
      setVerify('idle');
    } catch {
      setVerify('failed');
      setError('Payment failed. Echo could not activate the Pro preview. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return <AnimatePresence>
      {open && <motion.div key="upgrade" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} transition={{
      duration: 0.18
    }} className="pt-sat pb-sab fixed inset-0 z-[100] overflow-y-auto bg-[#070707] text-white">
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full bg-indigo-400/[.09] blur-[140px]" />
            <div className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-fuchsia-300/[.07] blur-[140px]" />
          </div>

          <AnimatePresence>
            {(verify === 'checking' || verify === 'success' || verify === 'failed') && stage === 'checkout' && <motion.div key="verification" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} className="fixed inset-0 z-30 grid place-items-center bg-[#050506]/95 px-6 text-center backdrop-blur-2xl">
                <motion.div initial={{
            scale: 0.94,
            y: 8
          }} animate={{
            scale: 1,
            y: 0
          }} className="flex max-w-sm flex-col items-center">
                  <div className={`relative grid h-28 w-28 place-items-center rounded-full border shadow-[0_0_90px_-30px_rgba(255,255,255,.25)] ${verify === 'success' ? 'border-emerald-400/35 bg-emerald-400/[.07]' : verify === 'failed' ? 'border-red-400/35 bg-red-400/[.08]' : 'border-white/15 bg-white/[.035]'}`}>
                    {verify === 'success' ? <CheckCircle2 className="h-12 w-12 text-emerald-400" strokeWidth={1.75} /> : verify === 'failed' ? <XCircle className="h-12 w-12 text-red-400" strokeWidth={1.75} /> : <>
                        <span className="absolute inset-[-7px] rounded-full border-2 border-transparent border-t-white/90 border-r-white/35 animate-spin" />
                        <span className="absolute inset-[8px] rounded-full border border-white/10" />
                        <LoaderCircle className="h-9 w-9 animate-spin text-white/85" />
                      </>}
                  </div>
                  <div className="mt-8 text-xl font-semibold tracking-tight">
                    {verify === 'success' ? 'Payment confirmed' : verify === 'failed' ? 'Payment failed' : 'Verifying your card'}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/45">
                    {verify === 'success' ? 'Demo checkout complete. Echo Pro is now active on this account.' : verify === 'failed' ? 'The demo card could not be verified. Use a different test number or try again.' : 'Contacting your bank and confirming availability…'}
                  </p>
                  {verify === 'checking' && <div className="mt-5 space-y-1.5 text-[11px] leading-5 text-white/35">
                      <div>Checking card availability</div>
                      <div>Contacting issuing bank</div>
                      <div>Securing Echo Pro membership</div>
                    </div>}
                  {verify === 'failed' && <button onClick={resetCheckout} className="mt-7 rounded-full border border-white/15 bg-white/[.06] px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/[.1]">
                      Try again
                    </button>}
                  <div className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-white/30">
                    <ShieldCheck className="h-3.5 w-3.5" /> Demo only · no real charge
                  </div>
                </motion.div>
              </motion.div>}
          </AnimatePresence>

          <button onClick={close} aria-label="Close" className="fixed right-5 top-[max(1rem,var(--sat,0px))] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[.06] text-white/65 backdrop-blur-xl transition hover:bg-white/[.12] hover:text-white">
            <X className="h-5 w-5" />
          </button>

          <motion.div initial={{
        y: 14,
        opacity: 0
      }} animate={{
        y: 0,
        opacity: 1
      }} transition={{
        type: 'spring',
        stiffness: 280,
        damping: 30
      }} className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
            <div className="flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[.24em] text-white/40">
              <Logo className="h-6 w-6" /> Echo membership
            </div>

            {stage === 'checkout' ? <motion.div key="checkout" initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} className="mx-auto mt-10 max-w-xl">
                <button onClick={() => {
            setStage('plan');
            resetCheckout();
          }} className="mb-6 inline-flex items-center gap-2 text-xs text-white/45 transition hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to plans
                </button>

                <div className="rounded-[28px] border border-white/[.1] bg-[#0c0c0d] p-5 shadow-[0_30px_90px_-45px_rgba(0,0,0,.95)] sm:p-8">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.055]">
                      <CreditCard className="h-5 w-5 text-white/80" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Checkout</div>
                      <div className="mt-0.5 text-xs text-white/40">Echo Pro · AED {PRO_PRICE_AED}/month</div>
                    </div>
                  </div>

                  <div className="mt-7 rounded-2xl border border-white/[.1] bg-[#050505] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-semibold tracking-[.18em] text-white/45">ECHO MEMBERSHIP</div>
                      <span className="pro-text text-xs font-semibold">PRO</span>
                    </div>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-semibold">Echo Pro</div>
                        <div className="mt-1 text-xs text-white/40">Monthly plan</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold">AED {PRO_PRICE_AED}</div>
                        <div className="text-[10px] text-white/40">per month · planned price</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-medium text-white/50">Name on card</span>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Rivera" autoComplete="cc-name" className="w-full rounded-xl border border-white/[.1] bg-white/[.04] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[.06]" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-medium text-white/50">Card number</span>
                      <input value={number} onChange={e => setNumber(formatCard(e.target.value))} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" className="w-full rounded-xl border border-white/[.1] bg-white/[.04] px-3.5 py-3 font-mono text-sm tracking-wider text-white outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[.06]" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-medium text-white/50">Expiry</span>
                        <input value={exp} onChange={e => setExp(formatExp(e.target.value))} placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" className="w-full rounded-xl border border-white/[.1] bg-white/[.04] px-3.5 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[.06]" />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-medium text-white/50">CVC</span>
                        <input value={cvc} onChange={e => setCvc(onlyDigits(e.target.value).slice(0, 4))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" className="w-full rounded-xl border border-white/[.1] bg-white/[.04] px-3.5 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[.06]" />
                      </label>
                    </div>
                  </div>

                  {/* Live demo card preview */}
                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/[.1] bg-gradient-to-br from-[#1a1a22] via-[#121218] to-[#0a0a0c] p-4 shadow-inner">
                    <div className="flex items-start justify-between">
                      <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/40">Demo card preview</div>
                      <CreditCard className="h-4 w-4 text-white/35" />
                    </div>
                    <div className="mt-5 font-mono text-lg tracking-[.2em] text-white/90">{number || '•••• •••• •••• 4242'}</div>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-white/35">Name</div>
                        <div className="mt-0.5 text-xs font-medium text-white/75">{name.trim() || 'YOUR NAME'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-white/35">Expires</div>
                        <div className="mt-0.5 font-mono text-xs text-white/75">{exp || 'MM/YY'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-white/35">Last 4</div>
                        <div className="mt-0.5 font-mono text-xs text-white/75">{previewLast4}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/[.08] bg-white/[.025] p-3 text-[11px] leading-5 text-white/45">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/65" />
                    Demo checkout only. Details stay in this browser session and are never stored or charged. Cards ending in 0000 simulate a failed payment.
                  </div>

                  <button onClick={activatePreview} disabled={isPro || loading || !formReady} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-sm font-semibold text-black shadow-[0_12px_36px_-14px_rgba(255,255,255,.28)] transition hover:bg-white/85 disabled:opacity-50">
                    {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Verifying…</> : isPro ? 'Echo Pro is active' : <>
                        Pay AED {PRO_PRICE_AED}
                        <ArrowRight className="h-4 w-4" />
                      </>}
                  </button>
                  {error && verify !== 'failed' && <p className="mt-3 text-center text-xs text-red-300">{error}</p>}
                  <p className="mt-3 text-center text-[10px] leading-5 text-white/35">
                    Visual demo. No payment provider is connected — activating enables the Pro preview only.
                  </p>
                </div>
              </motion.div> : <>
                <div className="mx-auto mt-8 max-w-2xl text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] border border-white/15 bg-white/[.055] shadow-[0_0_60px_rgba(210,190,255,.12)]">
                    <Crown className="h-7 w-7 text-white/85" />
                  </div>
                  <h1 className="mt-6 text-4xl font-semibold tracking-[-.055em] sm:text-6xl">
                    <span className="pro-text">Make more with Echo.</span>
                  </h1>
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/48 sm:text-base">
                    Faster thinking, stronger websites, apps, games and images — a clear step up from Free.
                  </p>
                </div>

                <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-2">
                  <section className="order-2 rounded-[28px] border border-white/[.09] bg-white/[.025] p-6 sm:p-8 lg:order-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">Free</div>
                        <p className="mt-1 text-xs text-white/40">For everyday ideas</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-medium text-white/45">{isPro ? 'Available' : 'Current plan'}</span>
                    </div>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-5xl font-semibold tracking-tight">AED 0</span>
                      <span className="text-xs text-white/40">/ month</span>
                    </div>
                    <div className="mt-7 space-y-4">
                      {FREE.map(f => <div key={f} className="flex items-start gap-3 text-sm text-white/60">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[.08]">
                            <Check className="h-3 w-3" />
                          </span>
                          {f}
                        </div>)}
                    </div>
                    <div className="mt-8 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-xs leading-5 text-white/40">
                      Your existing chats and saved projects remain available if you switch plans.
                    </div>
                  </section>

                  <section className="rainbow-border relative order-1 overflow-hidden rounded-[28px] bg-[#101012] p-6 shadow-[0_35px_100px_-45px_rgba(205,185,255,.4)] sm:p-8 lg:order-2">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-300/[.08] blur-[70px]" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <span className="pro-text">Echo Pro</span>
                          <WandSparkles className='h-4 w-4 text-[#ffffffb3] opacity-[0.79]' />
                        </div>
                        <p className="mt-1 text-xs text-white/45">For bigger builds and richer ideas</p>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/[.06] px-3 py-1 text-[10px] font-semibold text-white/75">PRO</span>
                    </div>
                    <div className="relative mt-6 flex items-baseline gap-1">
                      <span className="text-5xl font-semibold tracking-tight">AED {PRO_PRICE_AED}</span>
                      <span className="text-xs text-white/40">/ month planned price</span>
                    </div>
                    <div className="relative mt-7 grid grid-cols-2 gap-2">
                      {[{
                  Icon: Image,
                  label: 'Image studio'
                }, {
                  Icon: Globe2,
                  label: 'Website builder'
                }, {
                  Icon: Code2,
                  label: 'Code engine'
                }, {
                  Icon: Gauge,
                  label: 'Pro intelligence'
                }].map(({
                  Icon,
                  label
                }) => <div key={label} className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-3 text-xs text-white/70">
                          <Icon className="h-4 w-4 text-white/65" />
                          {label}
                        </div>)}
                    </div>
                    <div className="relative mt-6 space-y-3.5">
                      {PRO.map(f => <div key={f} className="flex items-start gap-3 text-sm text-white/85">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-black">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          {f}
                        </div>)}
                    </div>
                    <button onClick={() => {
                resetCheckout();
                setStage('checkout');
              }} disabled={isPro} className="no-press relative mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-sm font-semibold text-black shadow-[0_12px_36px_-14px_rgba(255,255,255,.35)] transition hover:bg-white/85 disabled:cursor-default disabled:opacity-65">
                      {isPro ? 'Echo Pro is active' : 'Continue to payment'}
                      {!isPro && <ArrowRight className="h-4 w-4" />}
                    </button>
                    <p className="relative mt-3 text-center text-[11px] leading-5 text-white/40">
                      Enter demo card details on the next step. Billing is not connected — no real charge.
                    </p>
                  </section>
                </div>

                <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-white/30">
                  <span className="flex items-center gap-1.5"><WandSparkles className="h-3.5 w-3.5" />Built for creating</span>
                  <span>Images in Free and Pro</span>
                  <span>Projects stay yours</span>
                </div>
              </>}
          </motion.div>
        </motion.div>}
    </AnimatePresence>;
}