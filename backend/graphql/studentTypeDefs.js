const { gql } = require("apollo-server");

const studentTypeDefs = gql`
  type Student {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    academicStatus: String
    degreeProgram: DegreeProgram
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
  }
`;

module.exports = studentTypeDefs;
