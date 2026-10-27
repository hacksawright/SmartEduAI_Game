# Stage 1: build TanStack Start (SSR) -> .output (Nitro preset node-server)
FROM node:22-alpine AS build
WORKDIR /app

# Build-time: base path quyết định URL của asset và router basepath, nên phải có lúc build.
# VITE_* được nhúng vào bundle client.
ARG GAME_BASE_PATH=/
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV GAME_BASE_PATH=${GAME_BASE_PATH}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Stage 2: chỉ cần .output — Nitro đã bundle sẵn dependency của server
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
