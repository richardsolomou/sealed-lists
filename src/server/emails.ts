import type { EmailMessage } from '../adapters/email'

/**
 * Plain text only, and short. These land in a group chat's worth of inboxes and
 * exist to get someone back to the page, not to be read.
 */

export const gameStartedEmail = (to: string, group: string, gameNumber: number, url: string): EmailMessage => ({
  to,
  subject: `${group}: your list is due for game ${gameNumber}`,
  text: `A game has started in ${group} and you are in it.\n\nSeal your list here:\n\n${url}\n\nNobody sees it until the last list is in.`,
})

export const gameRevealedEmail = (to: string, group: string, gameNumber: number, url: string): EmailMessage => ({
  to,
  subject: `${group}: every list is in for game ${gameNumber}`,
  text: `The last list landed, so game ${gameNumber} is revealed and locked.\n\nRead them here:\n\n${url}`,
})
