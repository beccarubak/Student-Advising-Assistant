const { gql } = require("apollo-server");
const studentTypeDefs = require("./studentTypeDefs");
const courseTypeDefs = require("./courseTypeDefs");
const degreeProgramTypeDefs = require("./degreeProgramTypeDefs");
const enrollmentTypeDefs = require("./enrollmentTypeDef");
const degreeAuditTypeDefs = require("./degreeAuditTypeDefs");
const chatInteractionTypeDefs = require("./chatInteractionTypeDefs");
const authTypeDefs = require("./authTypeDefs");
const advisorTypeDefs = require("./advisorTypeDefs");
const advisingNoteTypeDefs = require("./advisingNoteTypeDefs");

const rootTypeDefs = gql`
  type Query
  type Mutation
`;

module.exports = [
  rootTypeDefs,
  studentTypeDefs,
  courseTypeDefs,
  degreeProgramTypeDefs,
  enrollmentTypeDefs,
  degreeAuditTypeDefs,
  chatInteractionTypeDefs,
  authTypeDefs,
  advisorTypeDefs,
  advisingNoteTypeDefs,
];
