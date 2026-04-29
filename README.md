# Student Advising System

Course: CS5600 – Advanced Database Systems  
CRN: 23405  
Name: Rebecca Rubak  
Student ID: 700703020

---

## 📌 Project Overview

This project is a Student Advising System using:

- GraphQL & Apollo Server
- MongoDB Atlas (Cloud Database)
- React + TypeScript (Frontend)
- Ollama (Open-source LLM)

The system supports CRUD (Create, Read, Update, Delete) operations through GraphQL APIs and integrates an open-source LLM to translate natural language user questions into backend logic.

Users interact with the system via a chatbot-style interface.

---

## 🏗️ Architecture

React Frontend  
↓  
Apollo GraphQL Server (Node.js)  
↓  
MongoDB Atlas  
↓  
Ollama (LLM for intent classification)

The LLM performs intent classification.  
It translates natural language into predefined system intents:

- DEGREE_AUDIT
- ENROLLMENTS
- GRADUATION_STATUS
- GENERAL

The backend then executes the appropriate GraphQL-backed business logic and returns structured responses.

---

## 🛠 Technologies Used

- Node.js
- Apollo Server
- MongoDB Atlas
- Mongoose
- React + TypeScript
- Axios
- JWT Authentication
- Ollama (gemma3:1b model)

---

## 🤖 LLM Configuration

Model Used:

- gemma3:1b  
  Platform:
- Ollama (local installation)

The LLM translates natural language into backend logic but does not directly generate raw GraphQL queries.

---

## 🔐 Authentication

Users log in using their student email.

The system:

- Generates a JWT token
- Stores the token in localStorage
- Sends the token with authenticated GraphQL requests

---

## 🗄️ CRUD Operations Implemented

### Student Model

✔ Create Student  
✔ Read Student(s)  
✔ Update Student  
✔ Delete Student

---

### Course Model

✔ Create Course  
✔ Read Courses

---

### DegreeProgram Model

✔ Create Degree Program  
✔ Read Degree Programs  
✔ Assign Required Courses

---

### Enrollment Model (Many-to-Many Relationship)

✔ Enroll Student in Course  
✔ Read Enrollments  
✔ Update Enrollment Status (including grade updates)  
✔ Course Enrollment Summary Reporting

Enrollment enforces:

- Prerequisite validation
- Defensive validation
- Status logic (Enrolled, Completed, etc.)

---

## 📊 Academic Logic Features

- Degree Audit Calculation
- Graduation Eligibility Detection
- Required Course Enforcement
- Prerequisite Enforcement
- Enrollment Status Logic
- Reporting-Level Aggregation Query
- Defensive Validation & Error Handling

---

## 💬 Example Chat Questions

Users may ask:

- "What courses do I still need to graduate?"
- "Am I eligible to graduate?"
- "What am I enrolled in?"
- "What is my graduation status?"

If a question is outside supported categories, the system suggests example prompts.

---

## 🚀 How to Run the Application

### Backend

- Runs on: http://localhost:4000
- Navigate to backend folder
- Run: `npm install`
- Start with: `npm start`

### Frontend

- Runs on: http://localhost:3000
- Navigate to frontend folder
- Run: `npm install`
- Start with: `npm start`

### Ollama

Ensure Ollama is running locally and the following model is installed:

- ollama pull gemma3:1b
- ollama serve

## 🚀 How to Test

The mongodb cluster holding the db information should be available, however, if it is not, the MONGO_URI can be changed in the .env file and a personal cluster can be created.

If a personal cluster is made, there is a seed.js file that can be run to populate the collection with test data.

Test emails to login with:

- alice@example.com
- bob@example.com

1. Start Ollama
2. Start backend
3. Start frontend
4. Login with a seeded student email
5. Ask advising questions in the chat interface

---
