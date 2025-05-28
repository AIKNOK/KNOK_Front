import React from 'react';
import InterviewHero from '@/components/interview/InterviewHero';
import TrustedBrands from '@/components/interview/TrustedBrands';
import CTASection from '@/components/interview/CTASection';
import Footer from '@/components/common/Footer';

export default function InterviewPage() {
  return (
    <main className="min-h-screen bg-white">
      <InterviewHero />
      <TrustedBrands />
      <CTASection />
      <Footer />
    </main>
  );
} 