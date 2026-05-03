---
name: coder-design-pattern
description: Design and implementation guide for scalable NestJS changes in this project, aligned with current architecture and incremental migration to stronger DDD/hexagonal boundaries.
---

# Coder Design Pattern Skill (VenteWeb)

## Objective
Apply a scalable architecture style that fits the existing codebase without disruptive rewrites.

## Recommended Fit for This Project
Use **Modular Monolith with DDD-lite + Ports and Adapters (Hexagonal at module boundary)**.

Why this is the best fit now:
- The code already uses clear Nest modules (`auth`, `user`, `event`, `participation`, `notifications`).
- Repository abstractions already exist and can evolve into explicit outbound ports.
- A full CQRS/event-sourcing rewrite would be high cost for current scope.

## Target Module Internal Structure
Keep/adapt each module with these layers:
1. `interface` layer: controller + DTOs + serialization/response envelope.
2. `application` layer: use-case orchestration services.
3. `domain` layer: entities/value objects/domain rules that are framework-agnostic.
4. `infrastructure` layer: Prisma repositories, Cloudinary adapters, external clients.

## Hard Rules
- Controllers do transport concerns only.
- Application services coordinate use cases and transactions.
- Domain logic should not depend on Nest decorators or Prisma types.
- Data access goes through repository interfaces (ports), implemented by infrastructure adapters.
- Cross-module calls go through explicit service contracts, not deep repository coupling.

## Pattern Selection Guide
- Default CRUD/simple rule changes: service + repository pattern (current baseline).
- Multi-step business workflows: add explicit use-case classes inside `application`.
- High-complexity command/query split: adopt Nest CQRS recipe only in that module/flow.
- External providers (Cloudinary, Firebase, Google): isolate behind adapter interfaces.

## Testing Strategy by Layer
- Domain: pure unit tests, no Nest testing module.
- Application: mocked ports/repositories.
- Infrastructure: integration tests for Prisma queries and external adapter contracts.
- API: e2e for route + guard + DTO validation.

## Incremental Migration Steps
1. Preserve current folders and behavior.
2. Introduce `application/` and `domain/` only for touched features.
3. Convert concrete repository usage to port interfaces when editing those paths.
4. Keep backward compatibility on DTOs and response envelope.

## Official References
- Nest modules: https://docs.nestjs.com/modules
- Nest providers and DI: https://docs.nestjs.com/providers
- Nest custom providers (tokens/interfaces): https://docs.nestjs.com/fundamentals/custom-providers
- Nest validation pipe: https://docs.nestjs.com/techniques/validation
- Nest configuration: https://docs.nestjs.com/techniques/configuration
- Nest testing fundamentals: https://docs.nestjs.com/fundamentals/testing
- Nest CQRS recipe (selective use): https://docs.nestjs.com/recipes/cqrs
