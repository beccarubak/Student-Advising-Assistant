const { gql } = require("apollo-server");

const degreeProgramTypeDefs = gql`
  type DegreeProgram {
    id: ID!
    programName: String!
    totalCreditsRequired: Int!
    requiredCourses: [Course]
  }

  extend type Query {
    getDegreePrograms: [DegreeProgram]
    getDegreeProgram(id: ID!): DegreeProgram
  }

  extend type Mutation {
    createDegreeProgram(
      programName: String!
      totalCreditsRequired: Int!
    ): DegreeProgram
    
    addRequiredCourse(
      programId: ID!
      courseId: ID!
    ): DegreeProgram
  }
`;

module.exports = degreeProgramTypeDefs;
