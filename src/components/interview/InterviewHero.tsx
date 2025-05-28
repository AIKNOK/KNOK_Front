import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { PlayCircleIcon } from '@heroicons/react/24/solid';

export default function InterviewHero() {
  return (
    <section className="relative py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-semibold text-gray-900 leading-tight mb-8">
              Global<br />
              Brandmakers<br />
              making Waves
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href="/interview/start"
                className="inline-flex items-center px-8 py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <span className="mr-2">Interview Start</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              <button
                className="inline-flex items-center text-gray-900 hover:text-primary transition-colors"
              >
                <PlayCircleIcon className="w-6 h-6 mr-2" />
                <span>Watch How To Use</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 