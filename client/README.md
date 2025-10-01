# Taskanizer - Full-Stack Todo Application

A modern, full-stack todo application built with React, TypeScript, Node.js, and PostgreSQL. Features user authentication, drag-and-drop task management, categories, due dates, and a clean, responsive UI with dark/light mode support.

## 🚀 Features

- **User Authentication**: Secure signup/signin with JWT tokens and HTTP-only cookies
- **Task Management**: Create, edit, delete, and toggle completion status
- **Drag & Drop**: Reorder tasks with smooth drag-and-drop functionality
- **Categories**: Organize tasks into Work and Personal categories
- **Due Dates**: Set and track task deadlines
- **Responsive Design**: Clean UI with dark/light mode toggle
- **Real-time Updates**: Optimistic UI updates for smooth user experience
- **Account Dashboard**: View user stats and account information

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Ky** for HTTP client with error handling
- **@hello-pangea/dnd** for drag-and-drop functionality
- **CSS** for styling with dark/light theme support

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Prisma** ORM with PostgreSQL database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Zod** for request validation
- **CORS** configured for cross-origin requests

### Database
- **PostgreSQL** with Prisma migrations
- **User** and **Task** models with proper relationships
- **Category** enum for task organization

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database
- **Git** (for cloning the repository)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd todolist
```

### 2. Database Setup
Create a PostgreSQL database and note the connection string:
```sql
CREATE DATABASE todolist;
```

### 3. Environment Configuration

#### Server Environment (.env in `/server` directory)
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/todolist"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
COOKIE_NAME="todolist_token"  # Optional, defaults to "todolist_token"

# Server
PORT=4000
NODE_ENV="development"

# CORS (for production)
CORS_ORIGIN="http://localhost:5173"  # Your frontend URL
```

#### Client Environment (.env in `/client` directory)
```bash
VITE_API_URL="http://localhost:4000/api"
```

### 4. Install Dependencies

#### Server
```bash
cd server
npm install
```

#### Client
```bash
cd client
npm install
```

### 5. Database Migration
```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 6. Start the Application

#### Terminal 1 - Start the Server
```bash
cd server
npm run dev
```
Server will run on `http://localhost:4000`

#### Terminal 2 - Start the Client
```bash
cd client
npm run dev
```
Client will run on `http://localhost:5173`

### 7. Access the Application
Open your browser and navigate to `http://localhost:5173`

## 🏗 Project Structure

```
todolist/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main application component
│   │   ├── api.ts         # HTTP client configuration
│   │   ├── auth.ts        # Authentication utilities
│   │   └── main.tsx       # Application entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                # Node.js backend
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── db.ts          # Shared Prisma client
│   │   ├── middleware/
│   │   │   └── requireAuth.ts
│   │   └── routes/
│   │       ├── auth.ts    # Authentication routes
│   │       ├── account.ts # User account routes
│   │       └── tasks.ts   # Task management routes
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── migrations/   # Database migrations
│   └── package.json
└── README.md
```

## 🔧 Development

### Available Scripts

#### Server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

#### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Database Management
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Reset database (development only)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

## 🔒 Security Features

- **HTTP-only cookies** for secure token storage
- **JWT tokens** with expiration
- **Password hashing** with bcryptjs
- **Input validation** with Zod schemas
- **User-scoped operations** (users can only access their own tasks)
- **CORS protection** configured for production

## 🎨 UI/UX Features

- **Responsive design** that works on desktop and mobile
- **Dark/Light mode** toggle
- **Drag and drop** task reordering
- **Optimistic updates** for smooth interactions
- **Loading states** and error handling
- **Accessible** form controls and navigation

## 🚀 Deployment

### Environment Variables for Production

#### Server
```bash
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-production-jwt-secret"
CORS_ORIGIN="https://your-frontend-domain.com"
PORT=4000
```

#### Client
```bash
VITE_API_URL="https://your-backend-domain.com/api"
```

### Build Commands
```bash
# Build server
cd server && npm run build

# Build client
cd client && npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Built with ❤️ by [Your Name]

---

**Note**: This is a demonstration project showcasing modern full-stack development practices with React, TypeScript, Node.js, and PostgreSQL. Perfect for portfolio presentations and technical interviews!
