# Student Advising System

Course: CS5600 – Advanced Database Systems  
CRN: 23405  
Name: Rebecca Rubak  
Student ID: 700703020

---

## Project Overview

This project is a Student Advising and Degree Planner system built with:

- GraphQL & Apollo Server
- MongoDB Atlas (Cloud Database)
- React + TypeScript (Frontend)
- Ollama (Open-source LLM)

The system supports full CRUD (Create, Read, Update, Delete) operations through a GraphQL API and integrates an open-source LLM to translate natural language input into database queries and write operations. Both students and advisors interact with the system through role-specific dashboards, each with their own LLM-powered chat interface.

---

## Architecture

```
React Frontend
↓
Apollo GraphQL Server (Node.js)
↓
MongoDB Atlas
↓
Ollama (LLM for intent classification and name extraction)
```

The LLM performs intent classification — it translates natural language into predefined system intents and then executes the appropriate business logic against MongoDB.

---

## Technologies Used

- Node.js
- Apollo Server
- MongoDB Atlas
- Mongoose
- React + TypeScript
- Axios
- JWT Authentication
- Ollama (gemma3:1b model)

---

## Authentication

Users log in using their email address. The system:

- Looks up the email across Students and Advisors collections
- Generates a JWT token with the user's ID and role (`student` or `advisor`)
- Stores the token in localStorage
- Sends the token with every authenticated GraphQL request
- Enforces role-based access control on all resolvers

---

## Database Collections

| Collection | Purpose |
|---|---|
| `Students` | Demographic info, academic status, degree program, assigned advisor |
| `Advisors` | Advisor profiles and contact info |
| `Courses` | Course catalog with prerequisites |
| `DegreePrograms` | Program definitions and required course lists |
| `Enrollments` | Student-course relationships with status and grade |
| `AdvisingNotes` | Timestamped notes written by advisors on students |
| `ChangeRequests` | Enrollment requests, major changes, and study plan adjustments |
| `Messages` | Per-request message threads between students and advisors |
| `ChatInteractions` | Stored LLM chat history for auditing |

---

## CRUD Operations Implemented

### Student Model
- Create Student
- Read Student(s)
- Update Student
- Delete Student
- Update own profile (self-service: email, phone)

### Advisor Model
- Create Advisor
- Read Advisor(s)
- Update Advisor
- Delete Advisor
- Update own profile (self-service: email, phone)
- Assign Advisor to Student

### Course Model
- Create Course
- Read Courses

### DegreeProgram Model
- Create Degree Program
- Read Degree Programs
- Add Required Course to Program

### Enrollment Model (Many-to-Many)
- Enroll Student in Course
- Read Enrollments
- Update Enrollment Status (Enrolled → Completed / Dropped, with grade)
- Course Enrollment Summary Reporting (aggregation)

Enrollment enforces:
- Prerequisite validation
- Duplicate enrollment prevention
- Status transition logic

### AdvisingNote Model
- Create Advising Note
- Read Advising Notes (per student)
- Delete Advising Note

### ChangeRequest Model
- Submit Change Request (student-initiated)
- Read Pending Requests (advisor view)
- Read Request Summary (all requests per advisor)
- Resolve Change Request (approve / deny with optional notes)
  - Approving an ENROLLMENT_REQUEST automatically creates an Enrollment record

### Message Model
- Send Message (student or advisor, tied to a change request)
- Read Messages (per change request thread)

---

## Academic Logic Features

- Degree Audit Calculation (credits completed vs. required)
- Graduation Eligibility Detection
- Required Course Enforcement
- Prerequisite Validation
- Course Eligibility Checking (what a student can enroll in next)
- Enrollment Status Logic
- Aggregate Reporting Queries (MongoDB aggregation pipelines)
- Defensive Validation and Error Handling

---

## LLM Integration

The LLM (Ollama / gemma3:1b) is used for intent classification and entity extraction. There are two separate chat interfaces — one for students and one for advisors.

### Student Chat — Supported Intents

| Intent | Triggered by | Operation |
|---|---|---|
| `DEGREE_AUDIT` | "What courses do I still need?" | READ — degree audit calculation |
| `ENROLLMENTS` | "What am I currently enrolled in?" | READ — enrollment lookup |
| `GRADUATION_STATUS` | "Am I eligible to graduate?" | READ — credit check |
| `COURSE_ELIGIBILITY` | "What courses can I take next?" | READ — prerequisite check |
| `ENROLL_COURSE` | "Enroll me in Algorithms" | **WRITE** — creates a ChangeRequest |
| `GENERAL` | Anything else | Returns a help message with example prompts |

The `ENROLL_COURSE` intent validates academic status, prerequisites, and existing enrollment before creating a pending change request routed to the student's advisor.

### Advisor Chat — Supported Intents

| Intent | Triggered by | Operation |
|---|---|---|
| `STUDENTS_NEARING_GRADUATION` | "Which students are close to graduating?" | READ — aggregation pipeline |
| `COURSE_ENROLLMENT_SUMMARY` | "Show course enrollment counts" | READ — aggregation pipeline |
| `STUDENT_COUNT` | "How many students do we have?" | READ — count by academic status |
| `PROGRAM_SUMMARY` | "How many students per program?" | READ — group by degree program |
| `DELETE_STUDENT` | "Remove Alice Johnson from the system" | **WRITE** — with in-chat confirmation step |
| `GENERAL` | Anything else | Returns a help message with example prompts |

The `DELETE_STUDENT` intent uses a second LLM call to extract the student name from the request, then returns a confirmation prompt to the frontend before any deletion occurs.

---

## How to Run the Application

### Backend

- Runs on: http://localhost:4000
- Navigate to `backend/` folder
- Run: `npm install`
- Start with: `npm start`

### Frontend

- Runs on: http://localhost:3000
- Navigate to `frontend/` folder
- Run: `npm install`
- Start with: `npm start`

### Ollama

Ensure Ollama is running locally with the required model:

```
ollama pull gemma3:1b
ollama serve
```

---

## How to Test

The MongoDB Atlas cluster should be available. If not, update `MONGO_URI` in the `.env` file with a personal cluster URI and run the seed script to populate test data:

```
node seed.js
```

### Login Credentials (Seeded Data)

**Advisors:**
| Email | Advises |
|---|---|
| `sarah.mitchell@university.edu` | Alice, Bob, Emma |
| `james.carter@university.edu` | Carol, David, Frank |

**Students:**
| Email | Program | Status | Notes |
|---|---|---|---|
| `alice@example.com` | B.S. Computer Science | Active | Mid-progress, 1 pending enrollment request |
| `bob@example.com` | B.S. Computer Science | Active | Near graduation (1 course left) |
| `carol@example.com` | B.S. Data Science | Active | Mid-progress, 1 pending major change request |
| `david@example.com` | B.S. Computer Science | Active | Early stage |
| `emma@example.com` | B.S. Computer Science | Graduated | All courses completed |
| `frank@example.com` | B.S. Computer Science | Suspended | Demonstrates non-active status blocking |

### Test Steps

1. Start Ollama
2. Start backend (`npm start` in `backend/`)
3. Start frontend (`npm start` in `frontend/`)
4. Log in with a student or advisor email
5. Explore the dashboard features and LLM chat interface

---
