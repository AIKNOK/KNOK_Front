import React from 'react';
import Image from 'next/image';

const LOGOS = [
  '/logos/logo1.svg',
  '/logos/logo2.svg',
  '/logos/logo3.svg',
  '/logos/logo4.svg',
  '/logos/logo5.svg',
  '/logos/logo6.svg',
  '/logos/logo7.svg',
  '/logos/logo8.svg',
];

export default function TrustedBrands() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-medium text-center text-black mb-20 max-w-3xl mx-auto">
          We are blessed to work with amazing brands worldwide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {LOGOS.map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-6 border border-[#a1aebf] rounded-lg"
            >
              <div className="relative w-[150px] h-[40px]">
                <Image
                  src={logo}
                  alt={`Partner logo ${index + 1}`}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 