"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { ArrowRight, Command, FileInput, FolderOpen, MessageSquare } from "lucide-react"
import { CommandDemo, ImportFilesDemo } from "@/components/features/demos"
import { KeycapChord } from "@/components/features/keycap-chord"
import { TemplateFolder } from "@/components/motion/template-folder"
import { appLinks } from "@/lib/site"

const companyLogos = [
  { name: "Apple", src: "/logo/512px-Apple_logo_white.svg.png" },
  { name: "Google", src: "/logo/google-icon-logo-svgrepo-com.svg" },
  { name: "LinkedIn", src: "/logo/linkedin-icon-2.svg" },
  { name: "Amazon", src: "/logo/logo-amazon.svg" },
  { name: "Meta", src: "/logo/meta-3.svg" },
  { name: "Microsoft", src: "/logo/microsoft-5.svg" },
  { name: "Netflix", src: "/logo/netflix-logo-icon.svg" },
  { name: "OpenAI", src: "/logo/icons8-chatgpt-100.png" },
]

function Card({
  icon: Icon,
  title,
  text,
  className,
  children,
  delay = 0,
  onHover,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
  className?: string
  children: React.ReactNode
  delay?: number
  onHover?: (hovering: boolean) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay }}
      onHoverStart={() => onHover?.(true)}
      onHoverEnd={() => onHover?.(false)}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 transition-colors duration-300 hover:border-zinc-700/60 ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800">
          <Icon className="h-[18px] w-[18px] text-zinc-400 transition-colors group-hover:text-zinc-200" />
        </span>
        <h3 className="font-heading font-semibold text-zinc-100">{title}</h3>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-zinc-500">{text}</p>
      <div className="mt-auto">{children}</div>
    </motion.div>
  )
}

export function FeaturesSection() {
  const [folderOpen, setFolderOpen] = useState(false)

  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">Features</p>
          <h2 className="mb-4 font-display text-3xl font-bold text-zinc-100 md:text-4xl">An AI co-editor that speaks LaTeX</h2>
          <p className="mx-auto max-w-xl text-balance text-zinc-500">
            Say what you want changed, review every edit as a diff, and keep what you like. Everything else is built around getting
            your resume right.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Card
            icon={MessageSquare}
            title="Ask for any change"
            text="Talk to your resume like you would to ChatGPT: tailor it to a job, tighten your bullets, fit it on one page. Every edit shows up as a diff you keep or undo."
            className="md:col-span-3"
            delay={0.05}
          >
            <CommandDemo />
          </Card>

          <Card
            icon={Command}
            title="Edit any line with ⌘K"
            text="Select a line, press ⌘K and say what you want. Vero rewrites just that line, and never makes up numbers you didn't give it."
            className="md:col-span-2"
            delay={0.1}
          >
            <div className="flex min-h-[160px] items-center justify-center">
              <KeycapChord />
            </div>
          </Card>

          <Card
            icon={FolderOpen}
            title="Proven templates"
            text="Jake's Resume, Awesome CV, AltaCV and 11 more open-source classics, ready to edit and compiled for you."
            className="md:col-span-2"
            delay={0.05}
            onHover={setFolderOpen}
          >
            <button
              type="button"
              onClick={() => setFolderOpen((o) => !o)}
              aria-label={folderOpen ? "Close the templates folder" : "Open the templates folder"}
              className="mx-auto mt-16 flex w-full justify-center"
            >
              <TemplateFolder open={folderOpen} />
            </button>
          </Card>

          <Card
            icon={FileInput}
            title="Bring the resume you have"
            text="Drop in your Overleaf project and it stays exactly as it is. PDFs and Word files are rebuilt in LaTeX, with every line checked against your file."
            className="md:col-span-3"
            delay={0.1}
          >
            <ImportFilesDemo />
            <a href={appLinks.import} className="mt-6 flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
              Import your resume <ArrowRight className="h-4 w-4" />
            </a>
          </Card>
        </div>

        {/* where people want to work: aspiration, not partnership */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-28 text-center"
        >
          <p className="text-sm text-zinc-500">Write the resume for the role you want, at companies like</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {companyLogos.map((logo) => (
              <img key={logo.name} src={logo.src} alt={logo.name} className="h-7 w-7 object-contain opacity-50 grayscale transition-[filter,opacity] duration-300 hover:opacity-100 hover:grayscale-0" />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
