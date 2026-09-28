"use client"

import { motion, useReducedMotion } from "motion/react"

/**
 * A folder that opens to fan out three real template previews: "three resumes
 * from a pocket". Adapted from uselayouts' folder-interaction, restyled in
 * zinc, with the folder's open state controlled by the card around it.
 */

const PAGES = [
  { src: "/templates/awesome-cv-resume.webp", closed: { rotate: -3, x: -38, y: 2 }, open: { rotate: -9, x: -78, y: -58 }, spring: { stiffness: 160, damping: 22 }, z: "z-10" },
  { src: "/templates/jakes-resume.webp", closed: { rotate: 0, x: 0, y: 0 }, open: { rotate: 1, x: 0, y: -80 }, spring: { stiffness: 190, damping: 24 }, z: "z-20" },
  { src: "/templates/altacv.webp", closed: { rotate: 3.5, x: 42, y: 1 }, open: { rotate: 9, x: 80, y: -62 }, spring: { stiffness: 170, damping: 21 }, z: "z-10" },
]

export function TemplateFolder({ open }: { open: boolean }) {
  const reduceMotion = useReducedMotion()
  const isOpen = open && !reduceMotion

  return (
    <div aria-hidden className="relative h-52 w-80">
      {/* back of the folder, with the pages inside */}
      <div
        className="relative mx-auto flex h-full w-[87.5%] items-center justify-center rounded-[10px] bg-zinc-900"
        style={{ boxShadow: "0 0 16px 14px rgba(63,63,70,0.35) inset" }}
      >
        {PAGES.map((page) => (
          <motion.div
            key={page.src}
            initial={false}
            animate={isOpen ? page.open : page.closed}
            transition={{ type: "spring", bounce: 0.15, ...page.spring }}
            className={`absolute top-2 w-28 overflow-hidden rounded-lg bg-white shadow-lg shadow-black/40 ring-1 ring-black/10 ${page.z}`}
          >
            <img src={page.src} alt="" className="block aspect-[210/297] w-full object-cover object-top" draggable={false} />
          </motion.div>
        ))}
      </div>

      {/* front flap, glassy, tilting back as it opens */}
      <motion.div
        initial={false}
        animate={{ rotateX: isOpen ? -40 : 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className="absolute -bottom-px -left-px -right-px z-30 h-44 origin-bottom"
        style={{ transformPerspective: 800 }}
      >
        <svg className="h-full w-full overflow-visible" viewBox="0 0 235 121" fill="none" preserveAspectRatio="none">
          <path
            d="M104.615 0.350494L33.1297 0.838776C32.7542 0.841362 32.3825 0.881463 32.032 0.918854C31.6754 0.956907 31.3392 0.992086 31.0057 0.992096H31.0047C30.6871 0.99235 30.3673 0.962051 30.0272 0.929596C29.6927 0.897686 29.3384 0.863802 28.9803 0.866119L13.2693 0.967682H13.2527L13.2352 0.969635C13.1239 0.981406 13.0121 0.986674 12.9002 0.986237H9.91388C8.33299 0.958599 6.76052 1.22345 5.27423 1.76651H5.27325C4.33579 2.11246 3.48761 2.66213 2.7879 3.37393L2.49689 3.68839L2.492 3.69424C1.62667 4.73882 1.00023 5.96217 0.656067 7.27725C0.653324 7.28773 0.654065 7.29886 0.652161 7.30948C0.3098 8.62705 0.257231 10.0048 0.499817 11.3446L12.2147 114.399L12.2156 114.411L12.2176 114.423C12.6046 116.568 13.7287 118.508 15.3934 119.902C17.058 121.297 19.1572 122.056 21.3231 122.049V122.05H215.379C217.76 122.02 220.064 121.192 221.926 119.698V119.697C223.657 118.384 224.857 116.485 225.305 114.35L225.307 114.339L235.914 53.3798L235.968 53.1093L235.97 53.0985L235.971 53.0888C236.134 51.8978 236.044 50.685 235.705 49.5321C235.307 48.1669 234.63 46.9005 233.717 45.8144L233.383 45.4296C232.58 44.5553 231.614 43.8449 230.539 43.3398C229.311 42.7628 227.971 42.4685 226.616 42.4774H146.746C144.063 42.4705 141.423 41.8004 139.056 40.5263C136.691 39.2522 134.671 37.4127 133.175 35.1689L113.548 5.05948L113.544 5.05362L113.539 5.04776C112.545 3.65165 111.238 2.51062 109.722 1.72061C108.266 0.886502 106.627 0.422235 104.952 0.365143V0.364166L104.633 0.350494H104.615Z"
            fill="url(#vero-folder-fill)"
            fillOpacity="0.55"
            stroke="url(#vero-folder-stroke)"
            strokeWidth="0.7"
          />
          <defs>
            <linearGradient id="vero-folder-fill" x1="115" y1="0" x2="115" y2="122" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3f3f46" />
              <stop offset="1" stopColor="#27272a" />
            </linearGradient>
            <linearGradient id="vero-folder-stroke" x1="115" y1="0" x2="115" y2="122" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a1a1aa" stopOpacity="0.25" />
              <stop offset="1" stopColor="#52525b" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
        <div className="pointer-events-none absolute inset-0 rounded-3xl backdrop-blur-[3px] [clip-path:inset(28%_0_0_0_round_24px)]" />
      </motion.div>
    </div>
  )
}
