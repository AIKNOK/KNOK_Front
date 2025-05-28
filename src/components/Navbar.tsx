import Link from 'next/link';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'About us', path: '/about' },
  { name: 'Interview', path: '/interview' },
  { name: 'Library', path: '/library' },
];

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[92px]">
          <Link href="/" className="text-[32px] font-semibold text-primary tracking-tighter">
            Waves
          </Link>

          <div className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.path}
                className={twMerge(
                  'text-base font-medium tracking-tight hover:text-primary transition-colors',
                  location.pathname === item.path ? 'text-primary' : 'text-gray-900'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/login"
                className="bg-primary text-white px-6 py-3 rounded-md text-base font-medium tracking-tight hover:bg-primary/90 transition-colors"
              >
                Login
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </nav>
  );
} 