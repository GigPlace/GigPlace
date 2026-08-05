'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Explore Gigs', href: '/explore' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white/95  border-b border-gray-100 transition-all duration-300 ${
        isScrolled ? 'shadow-lg' : 'shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-20 h-15  rounded-2xl flex items-center justify-center text-white font-bold  transition-transform group-hover:scale-110">
              <Image src='/gig.png' alt='gigplace_logo' width={150} height={150}/>
            </div>
            {/* <div>
              <span className="text-2xl font-semibold tracking-tight text-gray-900">
                GigPlace
              </span>
            </div> */}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-gray-700 hover:text-gray-900 font-medium text-[15px] transition-colors group py-1"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 h-0.5 bg-[#0b3939] w-0 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium text-[15px] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-8 py-3 bg-[#0b3939] hover:bg-[#082d2d] text-white font-semibold text-[15px] rounded-full transition-all duration-300 active:scale-[0.985] shadow-md hover:shadow-lg flex items-center justify-center min-w-[160px]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden w-11 h-11 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors"
            aria-label="Toggle mobile menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0  z-50 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Slide-in Menu */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-80 bg-white z-50 shadow-2xl transform transition-transform duration-500 ease-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col h-full ">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-1">
            <Link href="/" className="flex items-center gap-3" onClick={toggleMobileMenu}>
              <div className="w-20 h-20  rounded-2xl flex items-center justify-center font-bold  transition-transform group-hover:scale-110">
              <Image src='/gig.png' alt='gigplace_logo' width={150} height={150} />
            </div>
              {/* <span className="text-2xl font-semibold tracking-tight">GigPlace</span> */}
            </Link>

            <button
              onClick={toggleMobileMenu}
              className="w-11 h-11 flex items-center font-bold justify-center text-[#0b3939] hover:text-gray-900"
              aria-label="Close mobile menu"
            >
              <X size={28} />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleMobileMenu}
                className="px-6 py-2  text-xs font-medium text-[#0b3939] hover:bg-[#0b3939] hover:text-[#ffffff] rounded-2xl transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile Auth Section */}
          <div className="mt-2 pt-1 border-t border-gray-100 space-y-4">
            <Link
              href="/login"
              onClick={toggleMobileMenu}
              className="block w-full py-2 text-center text-[#0b3939] font-semibold text-lg border border-gray-400 rounded-2xl hover:bg-[#0b3939] hover:text-[#ffffff] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={toggleMobileMenu}
              className="block w-full py-2 text-center bg-[#0b3939] hover:bg-[#ffffff] text-white hover:text-[#0b3939] font-semibold text-lg rounded-2xl transition-all active:scale-[0.985] border-1 border-gray-400 transition-all ease-in-out duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}