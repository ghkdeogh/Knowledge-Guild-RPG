// A response may resolve after a newer question has already replaced it.
export const isCurrentRequest = (requestId, currentRequestId) => requestId === currentRequestId
