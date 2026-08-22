# FaaD (FigmaAsADatabase)

FaaD (FigmaAsADatabase) is a proof-of-concept database architecture that demonstrates how a live Figma design canvas can function as a real-time, persistent backend data store for web applications. 

This repository contains a full-stack, Reddit-like community forum built with Next.js App Router and TypeScript that implements the FaaD concept. Every user account, community directory, discussion topic, nested comment reply, membership role, and vote score is indexed and stored as structured comment pins directly on a live Figma file canvas via the Figma REST API.

---

## The FaaD Concept

FaaD replaces traditional relational databases (such as PostgreSQL or MySQL) and document stores (such as MongoDB) with a spatial database abstraction layer. Instead of executing SQL queries or JSON document mutations, application data operations are translated into structured, coordinate-mapped comment pins on a Figma design canvas.

### Why FaaD?

- Zero Database Infrastructure: No database servers, connection pools, or ORMs are required.
- Visual Database Inspection: Developers and designers can visually inspect the entire application database state by zooming around frames inside the Figma canvas.
- Real-Time Persistence: Data written by web application users immediately reflects on the Figma canvas via the Figma REST API.

---

## Technical Architecture

The Reddit-like forum web application reads and writes entities through a custom spatial database engine (`FigmaStoreEngine`) coupled with an API wrapper (`FigmaAdapter`).

### Architecture Highlights

- Storage Engine: Live Figma REST API File Comments (`/v1/files/{file_key}/comments`).
- Spatial Entity Indexing: Canvas bounding regions organize entities visually on the Figma canvas across dedicated coordinate boxes (`USERS`, `COMMUNITIES`, `MEMBERSHIPS`, `POSTS`, `COMMENTS`, `VOTES`).
- Fault-Tolerant Atomic Hydration: Atomic staging maps parse incoming API payload revisions before swapping store state, guaranteeing zero data wipes or temporary 404 errors during API rate limits (HTTP 429).
- Offline Fallback Engine: Seamless fallback to local JSON storage (`.figma_fallback_comments.json`) when network constraints or unconfigured API keys occur.
- Classic Forum Layout: High-density layout inspired by classic internet forums (vBulletin, phpBB, Reddit), featuring left-author thread post cards, user role badges, nested comment trees, and sticky footers.

---

## System Architecture and Database Schema

Entities are serialized into JSON strings containing an identifying header and tag prefix (`[DB_ENTITY:TYPE]`). Revisions and updates append new comments chronologically, ensuring that the latest payload state supersedes prior records upon store re-hydration.

### Spatial Canvas Bounding Regions

```
+-------------------+-------------------+-------------------+
| USERS             | COMMUNITIES       | MEMBERSHIPS       |
| x: 50, y: 50      | x: 500, y: 50     | x: 950, y: 50     |
| width: 400, h: 600| width: 400, h: 600| width: 400, h: 600|
+-------------------+-------------------+-------------------+
| POSTS             | COMMENTS          | VOTES             |
| x: 50, y: 700     | x: 700, y: 700    | x: 1400, y: 50    |
| width: 600, h: 800| width: 650, h: 800| width: 300, h: 400|
+-------------------+-------------------+-------------------+
```

### Supported Entities

1. User Accounts (`[DB_ENTITY:USER]`)
   - Attributes: `id`, `username`, `passwordHash`, `bio`, `avatarUrl`, `createdAt`
2. Communities (`[DB_ENTITY:COMMUNITY]`)
   - Attributes: `id`, `slug`, `name`, `description`, `ownerId`, `createdAt`
3. Memberships (`[DB_ENTITY:MEMBERSHIP]`)
   - Attributes: `id`, `communityId`, `userId`, `role` (`OWNER` | `MODERATOR` | `MEMBER`), `joinedAt`
4. Posts (`[DB_ENTITY:POST]`)
   - Attributes: `id`, `communityId`, `authorId`, `title`, `content`, `type` (`text` | `image`), `imageUrl`, `createdAt`
5. Comments (`[DB_ENTITY:COMMENT]`)
   - Attributes: `id`, `postId`, `authorId`, `parentCommentId`, `content`, `createdAt`
6. Vote Register (`[DB_ENTITY:VOTE_BATCH]`)
   - Attributes: `batchId`, `votes` (`targetId -> userId -> 1 | -1`), `updatedAt`

---

## Forum Application Features

### Authentication and Session Management
- User Registration and Login with bcrypt password hashing.
- Encrypted JWT cookie sessions (`faad_session`).
- User Profile custom bios and custom avatar URLs with automatic SVG fallback.

### Community Subforums and Management
- Community creation with automatic URL slug generation (`/c/{slug}`).
- Community Owner Controls: Edit community name/description, appoint/remove moderators, and delete communities.
- Join/Leave community memberships with automatic role synchronization.

### Topic Discussions and Threaded Replies
- Topic creation supporting text posts and image embeds.
- Recursive threaded comment trees with arbitrary depth indentation.
- Inline comment editing for comment authors.
- Topic editing for original post authors.

### Lightweight Markdown and Auto-Linkification
- Headers (`#`, `##`, `###`).
- Bold text (`**text**`) and Italic text (`*text*`).
- Bulleted lists (`- item` or `* item`).
- Markdown link syntax (`[link text](url)`) and automatic linkification of raw URLs.

### Voting System
- Upvoting and downvoting on posts and comment replies.
- Batched vote tracking synced asynchronously to the Figma canvas.

---

## Environment Variables

Create a `.env.local` file in the root of the project with the following configuration:

```env
FIGMA_ACCESS_TOKEN=figd_your_personal_access_token
FIGMA_FILE_KEY=your_figma_file_id
JWT_SECRET=your_secure_jwt_secret_key
```

### Obtaining Figma Credentials

1. Personal Access Token: Go to Figma Settings -> Account -> Personal Access Tokens and generate a new token.
2. File Key: Open your Figma design file in the browser. The file key is the string located in the URL between `/file/` and your file name:
   `https://www.figma.com/file/{FIGMA_FILE_KEY}/Your-File-Name`

---

## Getting Started

### Prerequisites

- Node.js version 18.0.0 or higher.
- npm, yarn, or pnpm package manager.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/faad.git
   cd faad
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

### Production Build Verification

To compile TypeScript and build the production bundle:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

---

## License

This project is open-source and available under the MIT License.
