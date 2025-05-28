import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function CTASection() {
  return (
    <section className="bg-gray-900 py-24">
      <div className="container mx-auto px-4">
        {/* CTA 섹션 */}
        <div className="relative overflow-hidden rounded-2xl bg-[url('/images/cta-bg.jpg')] bg-cover bg-center mb-32">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative py-24 px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-medium text-white mb-8">
              Ready for your project
            </h2>
            <Link
              href="/contact"
              className="inline-flex items-center px-12 py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-2xl"
            >
              Get in touch
            </Link>
          </div>
        </div>

        {/* 로고와 네비게이션 */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="flex items-center">
            <div className="relative w-[94px] h-[238px] mr-8">
              <Image
                src="/images/logo-vertical.png"
                alt="Waves vertical logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative w-[266px] h-[93px]">
              <Image
                src="/images/logo-horizontal.png"
                alt="Waves horizontal logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <nav className="flex justify-end items-center">
            <ul className="flex gap-8 text-2xl text-white">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">About us</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
            </ul>
          </nav>
        </div>

        {/* 구분선 */}
        <div className="h-[2px] bg-[#bdb0ec] mb-8" />

        {/* 푸터 정보 */}
        <div className="flex flex-wrap justify-between items-center text-white">
          <div className="text-base">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <span className="mx-2">|</span>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">
              <span className="sr-only">Facebook</span>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              <span className="sr-only">Instagram</span>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01" />
              </svg>
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              <span className="sr-only">LinkedIn</span>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          </div>
          <div className="text-base">
            © 2022 Waves. All rights reserved.
          </div>
        </div>
      </div>
    </section>
  );
} 