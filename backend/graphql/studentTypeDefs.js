const { gql } = require("apollo-server");

const studentTypeDefs = gql`
  type Student {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    academicStatus: String
    degreeProgram: DegreeProgram
    advisor: Advisor
  }

  type Query {
    getStudents: [Student]
    getStudent(id: ID!): Student
  }

  input StudentInput {
    firstName: String!
    lastName: String!
    email: String!
    academicStatus: String
    degreeProgramId: ID
  }

  type Mutation {
    createStudent(input: StudentInput!): Student
    updateStudent(id: ID!, input: StudentInput!): Student
    deleteStudent(id: ID!): Boolean
    assignAdvisor(studentId: ID!, advisorId: ID!): Student
    updateMyProfile(email: String, phone: String): Student
  }
`;

module.exports = studentTypeDefs;
