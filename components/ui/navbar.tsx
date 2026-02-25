"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 p-4">
      <nav className="max-w-5xl mx-auto flex items-center justify-between h-14 md:h-12 px-4 md:px-6 rounded-full bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-md">
        <Link
          href="/"
          className="font-display text-lg font-semibold text-zinc-100"
        >
          TeXel
        </Link>
        <div className="flex items-center gap-2 md:gap-1">
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-1.5 text-sm rounded-full transition-colors text-zinc-400 hover:text-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          {/* Get Started button - always visible, but smaller on mobile */}
          <Link
            href="#pricing"
            className="ml-0 md:ml-2 px-3 py-1.5 md:px-4 text-xs md:text-sm whitespace-nowrap rounded-full bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors"
          >
            Get Started
          </Link>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col items-center justify-center w-8 h-8 gap-[4px] rounded-full transition-colors hover:bg-zinc-800 ml-1"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`block w-4 h-[2px] bg-zinc-300 rounded-full transition-all duration-300 ease-in-out ${
                mobileMenuOpen ? "rotate-45 translate-y-[6px]" : ""
              }`}
            />
            <span
              className={`block w-4 h-[2px] bg-zinc-300 rounded-full transition-all duration-300 ease-in-out ${
                mobileMenuOpen ? "opacity-0 scale-x-0" : ""
              }`}
            />
            <span
              className={`block w-4 h-[2px] bg-zinc-300 rounded-full transition-all duration-300 ease-in-out ${
                mobileMenuOpen ? "-rotate-45 -translate-y-[6px]" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out px-2 ${
          mobileMenuOpen
            ? "max-h-60 opacity-100 mt-2"
            : "max-h-0 opacity-0 mt-0"
        }`}
      >
        <div className="max-w-5xl mx-auto rounded-2xl bg-zinc-900/90 border border-zinc-800/50 backdrop-blur-md p-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 text-sm rounded-xl transition-colors text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
