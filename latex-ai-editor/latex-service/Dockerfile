# Stage 1: TeX Live base (cached, rarely changes)
# Alpine 3.19+; texmf-dist-lang required for pdflatex format generation
FROM alpine:3.19 AS texlive-base

RUN apk add --no-cache \
    texlive \
    texlive-xetex \
    texlive-luatex \
    texmf-dist-most \
    texmf-dist-lang \
    fontconfig \
    freetype \
    nodejs \
    npm \
    && rm -rf /var/cache/apk/*

# Stage 2: App layer
FROM texlive-base

WORKDIR /app

# Install Node dependencies first (cached if package.json unchanged)
COPY package.json package-lock.json* ./
RUN npm ci --production 2>/dev/null || npm install --production

COPY server.js .

# Security: run as non-root
RUN adduser -D -u 1000 latex
USER latex

EXPOSE 8080

CMD ["node", "server.js"]