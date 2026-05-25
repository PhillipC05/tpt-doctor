# ============================================================================
# TPT Doctor — Patient Portal Dockerfile
# ============================================================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/patient-portal/package.json apps/patient-portal/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter @tpt-doctor/patient-portal

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm run build --filter @tpt-doctor/patient-portal

FROM nginx:1.25-alpine AS runner
COPY --from=builder /app/apps/patient-portal/dist /usr/share/nginx/html
COPY apps/patient-portal/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]