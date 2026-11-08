import { useEffect } from 'react';
import { useAuth, loginWithRedirect } from 'zitejs/auth';
import { Toaster } from '@project/components/ui/sonner';
import Shell from './components/Shell';
import Logo from './components/Logo';
import { motion } from 'framer-motion';
import { applyTheme, setupHead } from './lib/util';
import { setupViewport } from './lib/viewport';

setupHead();
applyTheme(localStorage.getItem('echo-theme') || 'dark');
setupViewport();

function Welcome() {
  return (
    <div className="h-app pt-sat pb-sab relative flex flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="aurora pointer-events-none absolute -inset-[20%] [background:radial-gradient(45%_35%_at_30%_25%,rgba(130,160,255,.22),transparent),radial-gradient(40%_30%_at_75%_35%,rgba(210,140,255,.16),transparent),radial-gradient(40%_30%_at_55%_80%,rgba(255,150,200,.12),transparent)]" />
      <motion.div initial={{ scale: 0.6, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="relative">
        <div className="floaty"><Logo className="h-20 w-20" animated /></div>
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 24 }} className="relative mt-6 text-5xl font-semibold tracking-tight">Echo</motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rainbow-text relative mt-3 text-lg">Your personal intelligence.</motion.p>
      <motion.button initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 22 }} whileTap={{ scale: 0.96 }} onClick={() => loginWithRedirect()} className="no-press relative mt-10 w-full max-w-xs rounded-full bg-foreground py-3.5 font-medium text-background shadow-[0_10px_40px_-10px_rgba(150,170,255,.55)]">Continue</motion.button>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="relative mt-3 text-xs text-muted-foreground">Sign up or log in with your email</motion.p>
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();
  useEffect(() => {}, []);
  return (
    <>
      {isLoading ? (
        <div className="h-app grid place-items-center"><Logo className="h-12 w-12" animated /></div>
      ) : user ? <Shell /> : <Welcome />}
      <Toaster position="top-center" offset="calc(var(--sat, 0px) + 8px)" />
    </>
  );
}
