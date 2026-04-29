const { gql } = require("apollo-server");

const courseTypeDefs = gql`
  type Course {
    id: ID!
    courseCode: String!
    courseName: String!
    credits: Int!
  }

  extend type Query {
    getCourses: [Course]
  }

  extend type Mutation {
    createCourse(
      courseCode: String!
      courseName: String!
      credits: Int!
    ): Course
  }
`;

module.exports = courseTypeDefs;
