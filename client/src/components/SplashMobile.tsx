import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';

const SplashMobile: React.FC = () => {
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    // Redirige vers /login après l'animation (2.5 secondes)
    const timer = setTimeout(() => {
      setRedirect(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (redirect) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="fixed inset-0 bg-[#1a0f0a] flex flex-col items-center justify-center z-9999">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-32 h-32 mb-6"
      >
        <img 
          src="/apple-touch-icon.png" 
          alt="Bamousso Logo" 
          className="w-full h-full object-contain rounded-2xl shadow-lg"
        />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <h1 className="text-3xl font-bold tracking-widest text-[#d4a017]">
          BAMOUSSO<span className="text-[#fdfaf6] ml-2">RH</span>
        </h1>
        <p className="text-[#a1887f] mt-2 text-sm tracking-widest uppercase">
          L'Excellence Africaine
        </p>
      </motion.div>

      {/* Petit spinner natif style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-12"
      >
        <div className="w-6 h-6 border-2 border-[#d4a017] border-t-transparent rounded-full animate-spin"></div>
      </motion.div>
    </div>
  );
};

export default SplashMobile;
