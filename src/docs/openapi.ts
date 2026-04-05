/**
 * Static OpenAPI 3.0 document (Swagger UI reads this directly).
 * Kept in one place so routes stay discoverable without empty `apis: []`.
 */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "FinSight API",
    description: [
      "**FinSight** is a REST API for a role-based finance dashboard: income/expense **records**, user administration, and **dashboard** aggregates (totals, categories, trends, insights). This repository is **backend-only** (no SPA); clients use JWT Bearer auth.",
      "",
      "### Bearer JWT authentication",
      "1. Obtain a token via `POST /api/auth/login` or `POST /api/auth/register` and read `data.token` from the JSON body.",
      "2. In **Swagger UI**, click **Authorize** → **bearerAuth** → paste **only** the raw JWT (no `Bearer ` prefix; Swagger adds the scheme).",
      "3. Elsewhere (Postman, curl, mobile), send `Authorization: Bearer <your-jwt>`.",
      "4. Each protected request re-checks the user exists, is **ACTIVE**, and is not soft-deleted; invalid or expired tokens return **401**.",
      "",
      "### Roles",
      "| Role | Typical use |",
      "|------|-------------|",
      "| **VIEWER** | Read-only access to records and summary/recent activity. |",
      "| **ANALYST** | Viewer + category breakdown, monthly trends, insights. |",
      "| **ADMIN** | Analyst + user management + create/update/delete records + **audit log** read API. |",
      "",
      "### Registration",
      "New self-service accounts are always **VIEWER**. Unknown body fields (including `role`) are rejected. **ADMIN** promotes users with `PATCH /api/users/{id}`.",
      "",
      "### Error model",
      "Failures return JSON `{ \"success\": false, \"message\": string, \"details\"?: unknown }`. Common HTTP codes: **400** validation, **401** missing/invalid JWT or bad login password, **403** insufficient role or inactive login, **404** missing user/record, **409** duplicate email, **500** unexpected error. Each operation documents the subset it may emit.",
    ].join("\n"),
    version: "0.1.0",
    contact: { name: "FinSight API" },
  },
  servers: [
    { url: "http://localhost:5000", description: "Local development (default `PORT` in `.env`)" },
    { url: "https://api.finsight.demo", description: "Production placeholder — set to your real API host (no trailing slash)" },
    { url: "/", description: "Relative to current host (useful when Swagger UI is served from the API)" },
  ],
  tags: [
    { name: "Auth", description: "Register, login, and current user profile" },
    { name: "Users", description: "Directory and lifecycle — **ADMIN** only" },
    { name: "Records", description: "Financial ledger (income/expense) — mutate as **ADMIN** only" },
    { name: "Dashboard", description: "Aggregations — summary/recent for all roles; analytics for **ANALYST+**" },
    { name: "Health", description: "Process liveness" },
    { name: "Admin", description: "Compliance / audit — **ADMIN** only" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "HS256 access token returned as `data.token` from `POST /api/auth/login` or `POST /api/auth/register`. Payload includes subject (user id) and role. Send as `Authorization: Bearer <token>`. Expiry is controlled by `JWT_EXPIRES_IN` on the server (default 7d).",
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid Bearer token",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            example: {
              success: false,
              message: "Unauthorized",
              details: "Missing or invalid Bearer token",
            },
          },
        },
      },
      Forbidden: {
        description: "Authenticated but not allowed for this action or role",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            example: {
              success: false,
              message: "Forbidden",
              details: "You do not have permission to perform this action",
            },
          },
        },
      },
      NotFound: {
        description: "Resource does not exist or is not visible",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            example: {
              success: false,
              message: "Not found",
              details: "Record not found",
            },
          },
        },
      },
      Conflict: {
        description: "Request conflicts with current state (e.g. duplicate email)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            example: {
              success: false,
              message: "Conflict",
              details: "Email already registered",
            },
          },
        },
      },
      BadRequest: {
        description: "Validation failed (Zod) — malformed body, query, or path params",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            example: {
              success: false,
              message: "Validation failed",
              details: {
                fieldErrors: { amount: ["Expected number, received nan"], date: ["Invalid datetime"] },
                formErrors: [],
              },
            },
          },
        },
      },
      InternalServerError: {
        description: "Unexpected server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorEnvelope" },
            example: {
              success: false,
              message: "Internal server error",
            },
          },
        },
      },
    },
    schemas: {
      SuccessEnvelope: {
        type: "object",
        required: ["success", "message", "data"],
        properties: {
          success: { type: "boolean", example: true },
          message: {
            type: "string",
            description: "Endpoint-specific success message (see each operation example).",
          },
          data: {},
        },
      },
      ErrorEnvelope: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", example: false },
          message: {
            type: "string",
            description: "Short error category (e.g. Unauthorized, Not found, Conflict).",
            example: "Unauthorized",
          },
          details: {
            description: "Human-readable detail or structured validation payload (400).",
            example: "Missing or invalid Bearer token",
          },
        },
      },
      Role: { type: "string", enum: ["VIEWER", "ANALYST", "ADMIN"] },
      UserStatus: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
      RecordType: { type: "string", enum: ["INCOME", "EXPENSE"] },
      RegisterRequest: {
        type: "object",
        additionalProperties: false,
        description: "Only these fields are allowed; `role` cannot be set (always VIEWER).",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "new.analyst@acmecorp.finance" },
          password: { type: "string", minLength: 8, example: "WelcomeIn2026!" },
          name: { type: "string", example: "Priya Shah" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@example.com" },
          password: { type: "string", example: "Admin@123" },
        },
      },
      AuthUser: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          name: { type: "string", nullable: true },
          role: { $ref: "#/components/schemas/Role" },
          status: { $ref: "#/components/schemas/UserStatus" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        description: "Login and register both return `user` and `token` so the client can authenticate immediately after signup.",
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Login successful" },
              data: {
                type: "object",
                required: ["user", "token"],
                properties: {
                  user: { $ref: "#/components/schemas/AuthUser" },
                  token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                },
              },
            },
          },
        ],
      },
      AdminUser: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          name: { type: "string", nullable: true },
          role: { $ref: "#/components/schemas/Role" },
          status: { $ref: "#/components/schemas/UserStatus" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UserListResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Users fetched successfully" },
              data: {
                type: "object",
                properties: {
                  items: { type: "array", items: { $ref: "#/components/schemas/AdminUser" } },
                  total: { type: "integer", example: 42 },
                },
              },
            },
          },
        ],
      },
      AdminPatchUserRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/Role" },
          status: { $ref: "#/components/schemas/UserStatus" },
        },
        description: "At least one field must be provided.",
      },
      FinancialRecord: {
        type: "object",
        properties: {
          id: { type: "string" },
          amount: { type: "number", format: "double", example: 1200.5, description: "Amount as JSON number" },
          type: { $ref: "#/components/schemas/RecordType" },
          category: { type: "string", example: "Rent" },
          date: { type: "string", format: "date-time" },
          description: { type: "string", nullable: true },
          createdById: { type: "string" },
          isDeleted: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RecordDeletedData: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", description: "Soft-deleted record id" } },
      },
      CreateRecordRequest: {
        type: "object",
        required: ["amount", "type", "category", "date"],
        properties: {
          amount: { type: "number", example: 1847.33 },
          type: { $ref: "#/components/schemas/RecordType" },
          category: { type: "string", example: "Commercial Rent" },
          date: { type: "string", format: "date-time", example: "2026-04-01T00:00:00.000Z" },
          description: { type: "string", example: "Suite 400 — Q2 lease payment" },
        },
      },
      PatchRecordRequest: {
        type: "object",
        properties: {
          amount: { type: "number" },
          type: { $ref: "#/components/schemas/RecordType" },
          category: { type: "string" },
          date: { type: "string", format: "date-time" },
          description: { type: "string", nullable: true },
        },
      },
      RecordListResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Records fetched successfully" },
              data: {
                type: "object",
                properties: {
                  items: { type: "array", items: { $ref: "#/components/schemas/FinancialRecord" } },
                  total: { type: "integer", example: 100 },
                },
              },
            },
          },
        ],
      },
      SummaryResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Dashboard summary fetched successfully" },
              data: {
                type: "object",
                properties: {
                  totalIncome: { type: "number", format: "double", example: 5300 },
                  totalExpense: { type: "number", format: "double", example: 1585.24 },
                  netBalance: { type: "number", format: "double", example: 3714.76 },
                },
              },
            },
          },
        ],
      },
      CategoryBreakdownItem: {
        type: "object",
        description: "Per-category sum across active records (income and expense combined for that label).",
        properties: {
          category: { type: "string", example: "Rent" },
          total: { type: "number", format: "double", example: 12000 },
        },
      },
      MonthlyTrendItem: {
        type: "object",
        properties: {
          month: { type: "string", example: "2026-03" },
          income: { type: "number", format: "double", example: 4500 },
          expense: { type: "number", format: "double", example: 1200 },
        },
      },
      InsightsResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Insights fetched successfully" },
              data: {
                type: "object",
                properties: {
                  highestExpenseCategory: { type: "string", nullable: true, example: "Rent" },
                  averageExpense: { type: "number", format: "double", example: 264.21 },
                  expenseToIncomeRatio: { type: "number", nullable: true, example: 0.42 },
                },
              },
            },
          },
        ],
      },
      FinanceHealthScoreData: {
        type: "object",
        properties: {
          score: { type: "integer", minimum: 0, maximum: 100, example: 78 },
          status: {
            type: "string",
            enum: ["POOR", "FAIR", "GOOD", "EXCELLENT"],
            example: "GOOD",
          },
          insights: {
            type: "array",
            items: { type: "string" },
            example: [
              "Your expenses are within a healthy range versus income",
              "Rent contributes 42% of your expenses — concentration is high",
            ],
          },
          metrics: {
            type: "object",
            properties: {
              totalIncome: { type: "number", format: "double", example: 10000 },
              totalExpense: { type: "number", format: "double", example: 4100 },
              expenseToIncomeRatio: { type: "number", nullable: true, example: 0.41 },
              savingsRate: { type: "number", nullable: true, example: 0.32 },
              highestExpenseCategory: { type: "string", nullable: true, example: "Rent" },
            },
          },
        },
      },
      FinanceHealthScoreResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Finance health score calculated successfully" },
              data: { $ref: "#/components/schemas/FinanceHealthScoreData" },
            },
          },
        ],
      },
      FinancialRecommendationsResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Financial recommendations generated successfully" },
              data: {
                type: "array",
                items: { type: "string" },
                example: [
                  "Reduce Food expenses by 10% to improve savings",
                  "Your Transport costs increased compared to last month",
                  "Income is stable, but monthly discretionary spending is rising",
                ],
              },
            },
          },
        ],
      },
      AuditLogEntry: {
        type: "object",
        properties: {
          action: {
            type: "string",
            example: "USER_DEACTIVATED",
            description: "Prisma enum `AuditAction`",
          },
          performedBy: { type: "string", format: "email", example: "admin@example.com" },
          target: {
            type: "string",
            example: "viewer@example.com",
            description: "Human-readable target (usually email for users, typed label for records)",
          },
          timestamp: { type: "string", format: "date-time", example: "2026-04-05T10:30:00.000Z" },
        },
      },
      AuditLogsListResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Audit logs fetched successfully" },
              data: {
                type: "object",
                properties: {
                  items: { type: "array", items: { $ref: "#/components/schemas/AuditLogEntry" } },
                  total: { type: "integer", example: 42 },
                  page: { type: "integer", example: 1 },
                  limit: { type: "integer", example: 50 },
                },
              },
            },
          },
        ],
      },
      SpendingAnomalyItem: {
        type: "object",
        properties: {
          recordId: { type: "string", description: "FinancialRecord id (cuid)" },
          category: { type: "string", example: "Food" },
          amount: { type: "number", format: "double", example: 9500 },
          reason: {
            type: "string",
            example: "This expense is 3.2× higher than your average Food spending",
          },
        },
      },
      SpendingAnomaliesResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Spending anomalies detected successfully" },
              data: {
                type: "array",
                items: { $ref: "#/components/schemas/SpendingAnomalyItem" },
              },
            },
          },
        ],
      },
      MeResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Current user fetched successfully" },
              data: { $ref: "#/components/schemas/AuthUser" },
            },
          },
        ],
      },
      CategoryBreakdownResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Category breakdown fetched successfully" },
              data: { type: "array", items: { $ref: "#/components/schemas/CategoryBreakdownItem" } },
            },
          },
        ],
      },
      MonthlyTrendsResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Monthly trends fetched successfully" },
              data: { type: "array", items: { $ref: "#/components/schemas/MonthlyTrendItem" } },
            },
          },
        ],
      },
      RecentActivityResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Recent activity fetched successfully" },
              data: { type: "array", items: { $ref: "#/components/schemas/FinancialRecord" } },
            },
          },
        ],
      },
      AdminUserResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "User fetched successfully" },
              data: { $ref: "#/components/schemas/AdminUser" },
            },
          },
        ],
      },
      AdminUserUpdateResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "User updated successfully" },
              data: { $ref: "#/components/schemas/AdminUser" },
            },
          },
        ],
      },
      AdminUserDeactivateResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "User deactivated successfully" },
              data: { $ref: "#/components/schemas/AdminUser" },
            },
          },
        ],
      },
      RecordSingleResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Record fetched successfully" },
              data: { $ref: "#/components/schemas/FinancialRecord" },
            },
          },
        ],
      },
      RecordCreateResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Record created successfully" },
              data: { $ref: "#/components/schemas/FinancialRecord" },
            },
          },
        ],
      },
      RecordUpdateResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Record updated successfully" },
              data: { $ref: "#/components/schemas/FinancialRecord" },
            },
          },
        ],
      },
      RecordDeleteResponse: {
        allOf: [
          { $ref: "#/components/schemas/SuccessEnvelope" },
          {
            type: "object",
            properties: {
              message: { type: "string", example: "Record deleted successfully" },
              data: { $ref: "#/components/schemas/RecordDeletedData" },
            },
          },
        ],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        description:
          "**Role access:** Public (no JWT). Used by load balancers and deploy pipelines. Does not verify database connectivity.",
        responses: {
          "200": {
            description: "Service is accepting HTTP traffic",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", example: "ok" } },
                },
                example: { status: "ok" },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/admin/audit-logs": {
      get: {
        tags: ["Admin"],
        summary: "List audit log entries",
        description:
          "**Role access:** **ADMIN** only. Returns immutable **audit** rows for actions such as user registration, admin user updates/deactivation, and financial record create/update/delete. Each entry stores denormalized `performedByEmail` at write time. Paginate with `page` and `limit`. **ANALYST** / **VIEWER** → **403**.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
        ],
        responses: {
          "200": {
            description: "Paged audit entries (newest first)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditLogsListResponse" },
                example: {
                  success: true,
                  message: "Audit logs fetched successfully",
                  data: {
                    items: [
                      {
                        action: "USER_DEACTIVATED",
                        performedBy: "admin@example.com",
                        target: "viewer@example.com",
                        timestamp: "2026-04-05T10:30:00.000Z",
                      },
                    ],
                    total: 1,
                    page: 1,
                    limit: 50,
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description:
          "**Role access:** Public. Creates an **ACTIVE** **VIEWER** account, hashes the password (bcrypt), and returns a JWT so the client can call protected routes immediately. Body is `.strict()` — sending `role` or other unknown keys yields **400**.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
              examples: {
                financeTeamMember: {
                  summary: "New read-only stakeholder",
                  value: {
                    email: "new.analyst@acmecorp.finance",
                    password: "WelcomeIn2026!",
                    name: "Priya Shah",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Account created; JWT issued for immediate use",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
                example: {
                  success: true,
                  message: "Registration successful",
                  data: {
                    user: {
                      id: "clxregister01",
                      email: "new.analyst@acmecorp.finance",
                      name: "Priya Shah",
                      role: "VIEWER",
                      status: "ACTIVE",
                      createdAt: "2026-04-05T14:22:00.000Z",
                    },
                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  },
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
            description: "Validation error — invalid email, password under 8 chars, or forbidden extra fields (e.g. `role`)",
          },
          "409": {
            description: "Email already belongs to an active user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Conflict",
                  details: "Email already registered",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user profile",
        description:
          "**Role access:** Any authenticated role (**VIEWER**, **ANALYST**, **ADMIN**). Returns the same public user fields as login (`id`, `email`, `name`, `role`, `status`, `createdAt`). **404** if the account was removed, deactivated, or the JWT subject is stale.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile loaded from JWT subject",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MeResponse" },
                example: {
                  success: true,
                  message: "Current user fetched successfully",
                  data: {
                    id: "clxadmin01",
                    email: "admin@example.com",
                    name: "Admin",
                    role: "ADMIN",
                    status: "ACTIVE",
                    createdAt: "2026-01-15T10:00:00.000Z",
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            description: "User id in token no longer exists, is inactive, or is soft-deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Not found",
                  details: "User not found",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and obtain JWT",
        description:
          "**Role access:** Public. Validates email/password (bcrypt). **INACTIVE** or soft-deleted users receive **403** with `Account is inactive`. Wrong password or unknown email → **401** `Invalid credentials`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              examples: {
                adminDemo: {
                  summary: "Seeded admin (after `npm run db:seed`)",
                  value: { email: "admin@example.com", password: "Admin@123" },
                },
                analystDemo: {
                  summary: "Seeded analyst",
                  value: { email: "analyst@example.com", password: "Analyst@123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated; JWT issued for dashboard and API clients",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
                example: {
                  success: true,
                  message: "Login successful",
                  data: {
                    user: {
                      id: "clxadminseed",
                      email: "admin@example.com",
                      name: "Admin",
                      role: "ADMIN",
                      status: "ACTIVE",
                      createdAt: "2026-01-10T09:00:00.000Z",
                    },
                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": {
            description: "Unknown email or password mismatch",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Unauthorized",
                  details: "Invalid credentials",
                },
              },
            },
          },
          "403": {
            description: "Account exists but is **INACTIVE** or soft-deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Forbidden",
                  details: "Account is inactive",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List and filter users",
        description:
          "**Role access:** **ADMIN** only. Paginated directory for operations and compliance; optional filters by `status`, `role`, and `search` (email or name, case-insensitive). Non-admins receive **403**.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          {
            name: "status",
            in: "query",
            schema: { $ref: "#/components/schemas/UserStatus" },
          },
          { name: "role", in: "query", schema: { $ref: "#/components/schemas/Role" } },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Case-insensitive match on email or name",
          },
        ],
        responses: {
          "200": {
            description: "Paged user roster returned",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserListResponse" },
                example: {
                  success: true,
                  message: "Users fetched successfully",
                  data: {
                    total: 3,
                    items: [
                      {
                        id: "clx1",
                        email: "admin@example.com",
                        name: "Admin",
                        role: "ADMIN",
                        status: "ACTIVE",
                        createdAt: "2026-01-10T09:00:00.000Z",
                        updatedAt: "2026-04-01T12:00:00.000Z",
                      },
                      {
                        id: "clx2",
                        email: "analyst@example.com",
                        name: "Analyst",
                        role: "ANALYST",
                        status: "ACTIVE",
                        createdAt: "2026-01-10T09:00:00.000Z",
                        updatedAt: "2026-04-01T12:00:00.000Z",
                      },
                    ],
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get one user by id",
        description:
          "**Role access:** **ADMIN** only. Returns audit-friendly fields including `updatedAt`. **404** if the id is unknown or the user is soft-deleted/hidden from admin views per service rules.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "User profile retrieved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminUserResponse" },
                example: {
                  success: true,
                  message: "User fetched successfully",
                  data: {
                    id: "clx2",
                    email: "analyst@example.com",
                    name: "Analyst",
                    role: "ANALYST",
                    status: "ACTIVE",
                    createdAt: "2026-01-10T09:00:00.000Z",
                    updatedAt: "2026-04-03T11:30:00.000Z",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Not found",
                  details: "User not found",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user (role, status, profile)",
        description:
          "**Role access:** **ADMIN** only. Partial update: any of `name`, `email`, `role`, `status`. At least one field required. Changing `email` to one already taken returns **409**. Use this to promote a **VIEWER** to **ANALYST** for analytics access.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminPatchUserRequest" },
              examples: {
                promoteToAnalyst: {
                  summary: "Grant analytics access",
                  value: { role: "ANALYST" },
                },
                deactivateContractor: {
                  summary: "Offboard — set inactive",
                  value: { status: "INACTIVE" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminUserUpdateResponse" },
                example: {
                  success: true,
                  message: "User updated successfully",
                  data: {
                    id: "clx3",
                    email: "viewer@example.com",
                    name: "Viewer",
                    role: "ANALYST",
                    status: "ACTIVE",
                    createdAt: "2026-01-10T09:00:00.000Z",
                    updatedAt: "2026-04-05T16:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Not found",
                  details: "User not found",
                },
              },
            },
          },
          "409": {
            description: "Email already in use by another account",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Conflict",
                  details: "Email already exists",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Deactivate user (soft)",
        description:
          "**Role access:** **ADMIN** only. Sets `status` to **INACTIVE**; the row remains for audit. Deactivated users cannot log in (**403** on login).",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "User is now INACTIVE",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminUserDeactivateResponse" },
                example: {
                  success: true,
                  message: "User deactivated successfully",
                  data: {
                    id: "clxcontractor",
                    email: "contractor@acmecorp.finance",
                    name: "Temp Contractor",
                    role: "VIEWER",
                    status: "INACTIVE",
                    createdAt: "2026-02-01T00:00:00.000Z",
                    updatedAt: "2026-04-05T15:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Not found",
                  details: "User not found",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/records": {
      post: {
        tags: ["Records"],
        summary: "Create financial record",
        description:
          "**Role access:** **ADMIN** only. Inserts an **INCOME** or **EXPENSE** row (decimal amount, category label, transaction `date`). `createdById` is set from the JWT. **ANALYST** / **VIEWER** receive **403**.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateRecordRequest" },
              examples: {
                expenseRent: {
                  summary: "Operating expense",
                  value: {
                    amount: 1847.33,
                    type: "EXPENSE",
                    category: "Commercial Rent",
                    date: "2026-04-01T00:00:00.000Z",
                    description: "Suite 400 — April lease",
                  },
                },
                incomeSalary: {
                  summary: "Payroll income",
                  value: {
                    amount: 5200.0,
                    type: "INCOME",
                    category: "Salary",
                    date: "2026-04-01T00:00:00.000Z",
                    description: "Bi-weekly payroll deposit",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Ledger row persisted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecordCreateResponse" },
                example: {
                  success: true,
                  message: "Record created successfully",
                  data: {
                    id: "clxrecnew",
                    amount: 1847.33,
                    type: "EXPENSE",
                    category: "Commercial Rent",
                    date: "2026-04-01T00:00:00.000Z",
                    description: "Suite 400 — April lease",
                    createdById: "clxadminseed",
                    isDeleted: false,
                    createdAt: "2026-04-05T17:00:00.000Z",
                    updatedAt: "2026-04-05T17:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      get: {
        tags: ["Records"],
        summary: "List and filter records",
        description:
          "**Role access:** **VIEWER**, **ANALYST**, and **ADMIN** (any authenticated user). Supports pagination, `type`, `category`, `dateFrom`/`dateTo`, and sorting by `date` or `amount` (`order` **asc**/**desc**). Excludes soft-deleted rows.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "type", in: "query", schema: { $ref: "#/components/schemas/RecordType" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date-time" } },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["date", "amount"], default: "date" },
          },
          {
            name: "order",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
        ],
        responses: {
          "200": {
            description: "Paged ledger slice returned",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecordListResponse" },
                example: {
                  success: true,
                  message: "Records fetched successfully",
                  data: {
                    total: 6,
                    items: [
                      {
                        id: "clxr1",
                        amount: 5000,
                        type: "INCOME",
                        category: "Salary",
                        date: "2026-03-11T12:00:00.000Z",
                        description: "Monthly salary",
                        createdById: "clxadminseed",
                        isDeleted: false,
                        createdAt: "2026-03-11T12:00:00.000Z",
                        updatedAt: "2026-03-11T12:00:00.000Z",
                      },
                    ],
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/records/{id}": {
      get: {
        tags: ["Records"],
        summary: "Get one record by id",
        description:
          "**Role access:** **VIEWER+**. Returns a single non-deleted `FinancialRecord` for drill-down in dashboards or audit. **404** if id unknown or soft-deleted.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Ledger entry retrieved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecordSingleResponse" },
                example: {
                  success: true,
                  message: "Record fetched successfully",
                  data: {
                    id: "clxr1",
                    amount: 1200.5,
                    type: "EXPENSE",
                    category: "Rent",
                    date: "2026-03-16T12:00:00.000Z",
                    description: "Apartment rent",
                    createdById: "clxadminseed",
                    isDeleted: false,
                    createdAt: "2026-03-16T12:00:00.000Z",
                    updatedAt: "2026-03-16T12:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            description: "Record not found or soft-deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Not found",
                  details: "Record not found",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      patch: {
        tags: ["Records"],
        summary: "Update record",
        description:
          "**Role access:** **ADMIN** only. Partial update of amount, type, category, date, or description. Non-admins receive **403**.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatchRecordRequest" },
              examples: {
                recategorize: {
                  summary: "Reclassify spend",
                  value: { category: "Facilities", description: "Reclassified from Rent — CAM adjustment" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Record updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecordUpdateResponse" },
                example: {
                  success: true,
                  message: "Record updated successfully",
                  data: {
                    id: "clxr1",
                    amount: 1200.5,
                    type: "EXPENSE",
                    category: "Facilities",
                    date: "2026-03-16T12:00:00.000Z",
                    description: "Reclassified from Rent — CAM adjustment",
                    createdById: "clxadminseed",
                    isDeleted: false,
                    createdAt: "2026-03-16T12:00:00.000Z",
                    updatedAt: "2026-04-05T18:00:00.000Z",
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": {
            description: "Record not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                example: {
                  success: false,
                  message: "Not found",
                  details: "Record not found",
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
      delete: {
        tags: ["Records"],
        summary: "Soft-delete record",
        description:
          "**Role access:** **ADMIN** only. Sets `isDeleted` so the row no longer appears in lists or aggregates. Response returns the affected id for client cache invalidation.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Record marked deleted",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/SuccessEnvelope" },
                    {
                      type: "object",
                      properties: { data: { $ref: "#/components/schemas/RecordDeletedData" } },
                    },
                  ],
                },
                example: {
                  success: true,
                  message: "Record deleted successfully",
                  data: { id: "clxrremoved" },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/health-score": {
      get: {
        tags: ["Dashboard"],
        summary: "Finance health score (0–100) and insights",
        description:
          "**Role access:** **VIEWER+**. Computes a composite **finance health score** from savings rate, expense-to-income ratio, expense concentration in the top category, and recent monthly expense stability. Returns `status` (POOR / FAIR / GOOD / EXCELLENT) and human-readable **insights**. Uses the same aggregate scope as `/api/dashboard/summary` (all non-deleted records).",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Score, status label, insights, and supporting metrics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FinanceHealthScoreResponse" },
                example: {
                  success: true,
                  message: "Finance health score calculated successfully",
                  data: {
                    score: 78,
                    status: "GOOD",
                    insights: [
                      "Your expenses are within a healthy range versus income",
                      "Rent contributes 42% of your expenses — concentration is high",
                      "Savings potential is moderate — room to improve",
                    ],
                    metrics: {
                      totalIncome: 10000,
                      totalExpense: 4100,
                      expenseToIncomeRatio: 0.41,
                      savingsRate: 0.59,
                      highestExpenseCategory: "Rent",
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/recommendations": {
      get: {
        tags: ["Dashboard"],
        summary: "Rule-based financial recommendations",
        description:
          "**Role access:** **VIEWER+**. Returns an ordered list of deterministic, human-readable **recommendations** derived from category spend, month-over-month income/expense trends, savings behavior, and light anomaly-style hints (vs recent category averages). Uses the same aggregate scope as other dashboard endpoints (all non-deleted records).",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Array of recommendation strings",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FinancialRecommendationsResponse" },
                example: {
                  success: true,
                  message: "Financial recommendations generated successfully",
                  data: [
                    "Reduce Food expenses by 10% to improve savings",
                    "Your Transport costs increased compared to last month",
                    "Income is stable, but monthly discretionary spending is rising",
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/anomalies": {
      get: {
        tags: ["Dashboard"],
        summary: "Rule-based spending anomaly flags",
        description:
          "**Role access:** **VIEWER+**. Scans recent **EXPENSE** rows (bounded window, capped row count) and flags outliers using **explainable rules**: vs same-category peer average (excluding the row), vs **recent global median** expense, and **large absolute** amounts vs that median. No ML. Uses the same aggregate scope as other dashboard endpoints unless you scope by `createdById` in code.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of anomalous expense transactions with human-readable reasons",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SpendingAnomaliesResponse" },
                example: {
                  success: true,
                  message: "Spending anomalies detected successfully",
                  data: [
                    {
                      recordId: "clxrecord01",
                      category: "Food",
                      amount: 9500,
                      reason: "This expense is 3.2× higher than your average Food spending",
                    },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Income, expense, and net balance",
        description:
          "**Role access:** **VIEWER+**. Rolls up all non-deleted `FinancialRecord` rows into `totalIncome`, `totalExpense`, and `netBalance` (income minus expense). Suitable for KPI tiles on a finance home dashboard.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Aggregate totals computed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SummaryResponse" },
                example: {
                  success: true,
                  message: "Dashboard summary fetched successfully",
                  data: {
                    totalIncome: 5300,
                    totalExpense: 1586.24,
                    netBalance: 3713.76,
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/category-breakdown": {
      get: {
        tags: ["Dashboard"],
        summary: "Spend and income by category",
        description:
          "**Role access:** **ANALYST** or **ADMIN**. Groups every active record by `category` and sums `amount` (income and expense labels intermixed — clients often split by `type` using raw records if needed). **VIEWER** receives **403**.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Category totals for charts (pie / bar)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CategoryBreakdownResponse" },
                example: {
                  success: true,
                  message: "Category breakdown fetched successfully",
                  data: [
                    { category: "Salary", total: 5000 },
                    { category: "Rent", total: 1200.5 },
                    { category: "Freelance", total: 300 },
                    { category: "Groceries", total: 250.75 },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/monthly-trends": {
      get: {
        tags: ["Dashboard"],
        summary: "Monthly income vs expense",
        description:
          "**Role access:** **ANALYST** or **ADMIN**. SQL aggregation by calendar month (`YYYY-MM`) for trend lines. **VIEWER** → **403**.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Time-series buckets for dashboard charts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MonthlyTrendsResponse" },
                example: {
                  success: true,
                  message: "Monthly trends fetched successfully",
                  data: [
                    { month: "2026-03", income: 5300, expense: 1586.24 },
                    { month: "2026-04", income: 1200, expense: 450 },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/recent-activity": {
      get: {
        tags: ["Dashboard"],
        summary: "Latest ledger movements",
        description:
          "**Role access:** **VIEWER+**. Returns the most recent non-deleted records ordered by `date` then `createdAt`. Optional `limit` (1–10, default 10) for a compact activity feed.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 10, default: 10 },
          },
        ],
        responses: {
          "200": {
            description: "Recent transactions for activity widget",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecentActivityResponse" },
                example: {
                  success: true,
                  message: "Recent activity fetched successfully",
                  data: [
                    {
                      id: "clxr6",
                      amount: 45,
                      type: "EXPENSE",
                      category: "Transport",
                      date: "2026-04-03T12:00:00.000Z",
                      description: "Fuel",
                      createdById: "clxadminseed",
                      isDeleted: false,
                      createdAt: "2026-04-03T12:00:00.000Z",
                      updatedAt: "2026-04-03T12:00:00.000Z",
                    },
                  ],
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/api/dashboard/insights": {
      get: {
        tags: ["Dashboard"],
        summary: "Derived KPIs (ratios & averages)",
        description:
          "**Role access:** **ANALYST** or **ADMIN**. Computes `highestExpenseCategory`, mean expense per expense line (`averageExpense`), and `expenseToIncomeRatio` (null if no income). **VIEWER** → **403**.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Insight payload for executive summary cards",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InsightsResponse" },
                example: {
                  success: true,
                  message: "Insights fetched successfully",
                  data: {
                    highestExpenseCategory: "Rent",
                    averageExpense: 264.37,
                    expenseToIncomeRatio: 0.299,
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
  },
};

