# Contributing to TPT Doctor

Thank you for your interest in contributing! TPT Doctor is MIT-licensed and welcomes contributions from everyone.

## How to Contribute

### 1. Reporting Issues

- Check [existing issues](https://github.com/PhillipC05/tpt-doctor/issues) first
- Use a clear, descriptive title
- Include steps to reproduce, expected behavior, and actual behavior
- Include environment details (OS, Node version, Docker version)

### 2. Feature Requests

- Explain the use case and why it would be valuable
- If possible, describe how you'd implement it
- Tag with `enhancement`

### 3. Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm run test`
5. Run linting: `pnpm run lint`
6. Run type checking: `pnpm run typecheck`
7. Commit with a descriptive message
8. Push to your fork
9. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/tpt-doctor.git
cd tpt-doctor

# Install dependencies
pnpm install

# Start database services
docker compose up -d

# Run migrations
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# Start dev servers
pnpm run dev
```

### Code Style

- TypeScript strict mode
- ESLint + Prettier configured in the project
- Run `pnpm run format` before committing
- Follow NestJS conventions for the API
- Follow React functional component patterns for frontend

### Testing

- Write unit tests for new packages/modules
- Write e2e tests for new API endpoints
- Write component tests for new UI components
- Run existing tests before submitting: `pnpm run test`

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.