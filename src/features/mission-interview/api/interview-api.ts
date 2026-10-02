import { apiClient } from '@/lib/api/client'

import { interviewTurnResponseSchema, type InterviewTurn } from '../schemas/interview-schema'
import { interviewEndpoints } from './interview-endpoints'

export type InterviewMessageInput = {
  prompt: string
  /**
   * The workspace the interview runs in. The backend saves the finished
   * interview's mission and lesson into it.
   */
  workspaceId: string
  /** Null on the opening message; the backend starts a conversation and names it. */
  conversationId: string | null
}

/**
 * Sends the learner's side of one turn and reads the tutor's reply. The backend
 * remembers the conversation, so only the newest message travels.
 */
export async function sendInterviewMessage(input: InterviewMessageInput): Promise<InterviewTurn> {
  const response = await apiClient.post(interviewEndpoints.messages, {
    prompt: input.prompt,
    conversation_id: input.conversationId,
    workspace_id: input.workspaceId,
  })

  return interviewTurnResponseSchema.parse(response.data)
}
