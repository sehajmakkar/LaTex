"use client";

import { motion } from "motion/react";
import { TestimonialsColumn } from "@/components/ui/testimonials-column";

const testimonials = [
  {
    text: "TeXel completely changed how I write resumes. The inline AI rewrote my bullet points and I started getting callbacks within a week.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    name: "Sarah Chen",
    role: "Software Engineer",
  },
  {
    text: "As a researcher, I need LaTeX daily. TeXel gives me a beautiful editor with live preview and AI suggestions — no more Overleaf struggles.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    name: "Marcus Johnson",
    role: "PhD Candidate, MIT",
  },
  {
    text: "The ATS scoring feature is a game-changer. I optimized my resume to 95% and landed 3 interviews in one week.",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    name: "Emily Rodriguez",
    role: "Product Manager",
  },
  {
    text: "I went from spending hours formatting in Word to having a polished LaTeX resume in 20 minutes. The templates are incredible.",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    name: "David Park",
    role: "New Grad, CS",
  },
  {
    text: "The inline AI editing is like having a career coach built into my editor. It made every bullet point stronger and more quantified.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    name: "Aisha Patel",
    role: "Data Scientist",
  },
  {
    text: "We rolled out TeXel across our career center. Students love the templates and ATS feedback — our placement rate is up 30%.",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    name: "James Wilson",
    role: "Career Center Director",
  },
  {
    text: "Finally, a LaTeX editor that doesn't feel like it's from 2005. Clean UI, fast preview, and the AI makes editing effortless.",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    name: "Lisa Thompson",
    role: "UX Designer",
  },
  {
    text: "I used TeXel to write my thesis and my resume. Having one tool for both technical writing and job apps is a huge time-saver.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    name: "Michael Brown",
    role: "Graduate Student",
  },
  {
    text: "The real-time ATS score pushed me to rewrite weak sections I would have otherwise missed. Landed my dream role at a FAANG.",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    name: "Rachel Kim",
    role: "Senior Engineer at Google",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const logos = [
  "Stanford",
  "MIT",
  "Google",
  "Microsoft",
  "Y Combinator",
  "Harvard",
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="px-6 py-24 bg-zinc-900/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-xl mx-auto mb-12"
        >
          <div className="border border-zinc-800 py-1.5 px-4 rounded-full text-sm text-zinc-400">
            Testimonials
          </div>

          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-100 mt-6 text-center tracking-tight">
            Loved by job seekers & writers
          </h2>
          <p className="text-center mt-4 text-zinc-500 text-lg text-balance">
            See how TeXel is helping people land interviews and write better
            documents.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>

        <div className="mt-16 pt-16 border-t border-zinc-800/50">
          <p className="text-center text-sm text-zinc-500 mb-8">
            Used by students and professionals at
          </p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
            <motion.div
              className="flex gap-12 md:gap-16"
              animate={{
                x: ["0%", "-50%"],
              }}
              transition={{
                x: {
                  duration: 20,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                },
              }}
            >
              {/* Duplicate logos for seamless loop */}
              {[...logos, ...logos].map((logo, index) => (
                <span
                  key={`${logo}-${index}`}
                  className="text-xl font-semibold text-zinc-700 whitespace-nowrap flex-shrink-0"
                >
                  {logo}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
