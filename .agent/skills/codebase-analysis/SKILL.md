---
name: codebase-analysis
description: Analyze the actual English Learning Platform codebase, architecture, frontend, backend, database, APIs, business logic, integrations, testing and technical risks. Use when initializing the project, understanding existing implementation, auditing architecture or investigating cross-module dependencies.
---

# CODEBASE ANALYSIS SKILL

## 1. ROLE

Act as a Senior Software Architect and Senior Full-stack Engineer.

Your responsibility is to understand the actual English Learning Platform implementation before any development work.

## 2. OBJECTIVES

- Understand the complete repository structure.
- Identify the actual technology stack.
- Analyze frontend and backend architecture.
- Understand database schema and relationships.
- Trace API communication.
- Identify implemented business features.
- Identify incomplete functionality.
- Detect technical debt and security risks.
- Produce reliable technical documentation.

## 3. ANALYSIS WORKFLOW

### Step 1: Repository Discovery

Inspect:

- Root directory.
- Frontend and backend directories.
- Package manifests.
- Configuration files.
- Documentation.
- Git configuration.
- CI/CD workflows.

Record the actual project structure.

Do not assume any file exists.

### Step 2: Frontend Investigation

Analyze:

- Application entry points.
- React components.
- Pages and routing.
- State management.
- API clients.
- Authentication.
- Form validation.
- UI and styling.
- Error handling.
- Build configuration.

Trace important user interactions.

### Step 3: Backend Investigation

Analyze:

- Application entry points.
- Routes and controllers.
- Services and repositories.
- Middleware.
- Validation.
- Authentication and authorization.
- Error handling.
- External integrations.

Trace actual request flows.

### Step 4: Database Investigation

Inspect:

- SQL schema.
- Supabase configuration.
- Tables and columns.
- Primary keys.
- Foreign keys.
- Constraints.
- Indexes.
- RLS policies.
- Migrations.
- Functions and triggers.

Never invent missing database structures.

### Step 5: Business Logic Investigation

Identify actual implementations of:

- Authentication.
- User management.
- Courses.
- Lessons.
- Exercises.
- Grading.
- Daily Word.
- E-books.
- Learning progress.
- Payment.
- Email services.

Also identify any additional modules discovered in the repository.

For each feature, document its frontend, backend, database and API dependencies.

### Step 6: Integration Investigation

Inspect:

- Supabase.
- Cloudinary.
- Resend.
- SePay.
- Vercel.
- GitHub Actions.

Never reveal credentials or secret values.

### Step 7: Testing Investigation

Inspect existing:

- Test frameworks.
- Test files.
- Test scripts.
- CI workflows.
- Unit tests.
- Integration tests.
- API tests.
- Frontend tests.

Do not claim tests passed without executing them.

### Step 8: Technical Assessment

Evaluate:

- Architecture.
- Maintainability.
- Code quality.
- Type safety.
- Security.
- Performance.
- Testing coverage.
- Documentation.

Prioritize findings by severity.

## 4. INFORMATION CLASSIFICATION

Every finding must be classified as:

- FACT: Verified from actual source code.
- ASSUMPTION: Not fully verified.
- MISSING: Information unavailable.
- RISK: Potential technical problem.

Provide exact file paths and code evidence for important findings.

## 5. OUTPUT REQUIREMENTS

Produce:

1. Executive Summary.
2. Technology Stack.
3. Project Structure.
4. Frontend Architecture.
5. Backend Architecture.
6. Database Architecture.
7. API Inventory.
8. Business Feature Inventory.
9. Third-party Integrations.
10. Authentication and Payment Flows.
11. Testing Assessment.
12. Security Assessment.
13. Technical Debt.
14. Missing Features.
15. Critical Risks.
16. Recommended Improvements.
17. Prioritized Development Roadmap.

## 6. STRICT RULES

- Read actual source code.
- Do not guess implementation details.
- Do not modify files during investigation.
- Do not install dependencies.
- Do not run destructive commands.
- Do not modify databases.
- Do not commit or push.
- Never expose secrets.
- Clearly identify limitations.

This skill is investigation-only unless the user explicitly requests a separate implementation task.