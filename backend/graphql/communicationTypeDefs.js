const { gql } = require("apollo-server");

const communicationTypeDefs = gql`
  enum RequestType {
    MAJOR_CHANGE
    STUDY_PLAN_ADJUSTMENT
  }

  enum RequestStatus {
    pending
    approved
    denied
  }

  type ChangeRequest {
    id: ID!
    student: Student!
    advisor: Advisor!
    requestType: RequestType!
    currentValue: String!
    proposedValue: String!
    status: RequestStatus!
    advisorNotes: String
    messages: [Message]
    resolvedAt: String
    createdAt: String
  }

  type Message {
    id: ID!
    changeRequest: ChangeRequest!
    senderId: ID!
    senderRole: String!
    content: String!
    createdAt: String
  }

  extend type Query {
    getChangeRequest(id: ID!): ChangeRequest
    getMyChangeRequests: [ChangeRequest]
    getPendingChangeRequests: [ChangeRequest]
    getAdvisorRequestSummary: [ChangeRequest]
  }

  extend type Mutation {
    submitChangeRequest(
      advisorId: ID!
      requestType: RequestType!
      currentValue: String!
      proposedValue: String!
    ): ChangeRequest

    sendMessage(changeRequestId: ID!, content: String!): Message

    resolveChangeRequest(
      id: ID!
      status: RequestStatus!
      advisorNotes: String
    ): ChangeRequest
  }
`;

module.exports = communicationTypeDefs;
