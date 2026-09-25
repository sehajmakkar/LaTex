# Vero LaTeX compile service
#
# Alpine's TeX Live packages: texmf-dist-most + texmf-dist-lang together are
# Alpine's "full" TeX Live minus documentation, close to Overleaf's coverage,
# at about 3.6 GB unpacked. That fits Railway Free's 4 GB image limit, so check
# the size (see replenish-guide.md) before adding anything large.

# ── Node dependencies (npm stays out of the final image) ─────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM alpine:3.19

# TeX Live (engines + nearly all packages and fonts), latexmk's perl, biber for
# biblatex, Ghostscript for EPS graphics, a few metric-compatible system fonts
# (Arial/Times/Calibri-like), and tini as PID 1 (reaps killed TeX processes,
# forwards signals).
RUN apk add --no-cache \
      texlive texlive-xetex texlive-luatex texmf-dist-most texmf-dist-lang \
      perl biber ghostscript \
      fontconfig freetype font-liberation font-dejavu font-carlito \
      nodejs tini

# Let xelatex/lualatex find TeX Live's own OpenType/TrueType fonts by name
# (Alpine doesn't ship TeX Live's fontconfig file), and build the font caches
# now so the first compile is fast and stays within 512 MB of RAM.
RUN printf '%s\n' '<?xml version="1.0"?>' '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">' '<fontconfig>' \
      '  <dir>/usr/share/texmf-dist/fonts/opentype</dir>' \
      '  <dir>/usr/share/texmf-dist/fonts/truetype</dir>' \
      '</fontconfig>' > /etc/fonts/conf.d/09-texlive.conf \
 && fc-cache -f \
 && TEXMFVAR="$(kpsewhich -var-value TEXMFSYSVAR)" luaotfload-tool --update --force

# One unprivileged user per compile slot. The server (root) runs each compile
# as one of these, so TeX/Lua can't read the server's memory or environment
# (where the secret lives) or another job's files. Temp dirs are made root-only
# so a compile can write nowhere except its own job folder.
RUN for i in 0 1 2 3 4 5 6 7; do \
      adduser -D -H -h /nonexistent -s /sbin/nologin -u $((20000 + i)) "texjob$i"; \
    done \
 && chmod 0755 /tmp /var/tmp \
 && install -d -m 0711 /var/lib/vero-jobs

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json engine-detect.js server.js ./
RUN chmod -R go-rwx /app

ENV NODE_ENV=production
EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--", "node", "/app/server.js"]
