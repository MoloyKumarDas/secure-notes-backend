# Secure Notes — Backend

REST API: Node.js + Express + MongoDB (Mongoose) + JWT + bcrypt, with role-based access (User / Admin).

## Setup

1. Install Node.js 18+ and MongoDB Community (local) — or create a free MongoDB Atlas cluster.
2. In this folder:
   ```bash
   npm install
   cp .env.example .env        # Windows: copy .env.example .env
   ```
3. Edit `.env`: set `MONGO_URI`, a long random `JWT_SECRET` (32+ chars), and the admin credentials.
   Generate a secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
4. Create the first admin (once): `npm run seed:admin`
5. Start: `npm run dev` (auto-reload) or `npm start` → http://localhost:5000

## Roles

| Capability | User | Admin |
|---|---|---|
| Register / login | yes | yes |
| Create, update, delete, list **own** notes | yes | yes |
| View **everyone's** notes | no | yes (view only) |
| Add / update / remove / list users | no | yes |
| Users grouped by interests | no | yes |
| Write posts / read posts | yes / yes | yes / yes |

Public self-registration always creates role `user`. Admins come from the seed script or from another admin.

## Endpoints (all under `/api`, JSON, `Authorization: Bearer <token>`)

| Method & path | Access | Notes |
|---|---|---|
| POST `/auth/register` | public | name, email, password (8+), interests[] |
| POST `/auth/login` | public | returns `{ token, user }` |
| GET `/auth/me` | any user | current profile |
| GET `/notes?page=&limit=` | user / admin | user: own notes; admin: all (`&user=<id>` to filter) |
| POST `/notes` | any user | title, content |
| GET `/notes/:id` | owner / admin | |
| PUT `/notes/:id` | owner | |
| DELETE `/notes/:id` | owner | |
| GET `/users?page=&limit=` | admin | |
| POST `/users` | admin | name, email, password, role, interests[] |
| GET `/users/:id` | admin | |
| PUT `/users/:id` | admin | any of name/email/password/role/interests |
| DELETE `/users/:id` | admin | also deletes that user's notes and posts |
| GET `/users/grouped-by-interests?page=&limit=&interest=` | admin | **Scenario 1** |
| POST `/posts` | any user | title, content |
| GET `/posts?page=&limit=` | public | |
| GET `/posts/user/:userId?page=&limit=` | public | **Scenario 2** |

List responses: `{ data: [...], meta: { total, page, limit, totalPages } }` (limit max 50, default 10).

## Indexing strategy (4 custom indexes, all defined with `schema.index`)

| Collection | Index | Why it is required |
|---|---|---|
| users | `{ email: 1 }` unique | login lookup + unique emails |
| users | `{ interests: 1 }` | index-backed `$match` in the group-by-interests pipeline |
| notes | `{ user: 1, _id: -1 }` | "my notes" list (filter + newest-first + pagination), admin `?user=` filter, per-user count |
| posts | `{ author: 1, _id: -1 }` | `$lookup` that fetches a user's posts (equality + sort + skip/limit) and counts them |

Deliberately **not** indexed:
- Every "get by id" (profile, one note, one user) → default `_id` index.
- Admin "list users", admin "list all notes", public "list all posts" → they sort by `_id` (newest first), which the default `_id` index already serves. No `createdAt` index needed.

## Aggregations

**Scenario 1 – grouped by interests** (`userController.groupedByInterests`): one `User.aggregate()` call:
`[$match (optional)] → $unwind interests → $group by interest ($push users) → $sort → $facet { page of groups, total }`.

**Scenario 2 – posts of a user** (`postController.byUser`): one `User.aggregate()` call:
`$match _id → $lookup posts (pipeline: match author, sort, skip, limit) → $lookup post count → $project`.

Verify index usage in `mongosh`:
```js
db.notes.find({ user: ObjectId("...") }).sort({ _id: -1 }).explain("executionStats")
db.users.explain("executionStats").aggregate([{ $match: { interests: "chess" } }, { $unwind: "$interests" }])
```
Look for `IXSCAN` (not `COLLSCAN`) in the winning plan.

## Security notes
- Passwords hashed with bcrypt (cost 12); never returned by the API (`select: false` + `toJSON`).
- JWT is verified on every request and the user is re-loaded from the DB, so deleted users / role changes apply immediately.
- Inputs are type-checked (blocks NoSQL operator injection like `{ "$gt": "" }`), body size limited to 10 KB.
- `helmet` headers and CORS restricted to `CLIENT_ORIGIN`.
- Login returns the same error for unknown email and wrong password.

## Folder structure
```
backend/
├── package.json
├── .env.example
├── .gitignore
├── scripts/seedAdmin.js
└── src/
    ├── server.js            # boot: env check, DB connect, build indexes, listen
    ├── app.js               # express app, middleware, route mounting
    ├── config/db.js
    ├── models/              # User, Note, Post  (schema.index lives here)
    ├── middleware/          # auth (JWT + RBAC), validateObjectId, errorHandler
    ├── controllers/         # auth, note, user, post
    ├── routes/              # auth, note, user, post
    └── utils/               # pagination, validators, httpError
```
