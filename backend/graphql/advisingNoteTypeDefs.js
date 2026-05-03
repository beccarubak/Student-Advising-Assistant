const { gql } = require("apollo-server");

const advisingNoteTypeDefs = gql`
  type AdvisingNote {
    id: ID!
    student: Student!
    advisor: Advisor!
    note: String!
    createdAt: String
  }

  extend type Query {
    getAdvisingNotes(studentId: ID!): [AdvisingNote]
  }

  extend type Mutation {
    createAdvisingNote(studentId: ID!, advisorId: ID!, note: String!): AdvisingNote
    deleteAdvisingNote(id: ID!): Boolean
  }
`;

module.exports = advisingNoteTypeDefs;
