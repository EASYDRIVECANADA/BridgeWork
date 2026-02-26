// Shared flags for coordinating auth state between signIn thunk and AuthProvider
// This module exists to avoid circular imports between authSlice and providers

let _skipNextAuthChange = false;

export function setSkipNextAuthChange() {
  _skipNextAuthChange = true;
}

export function consumeSkipNextAuthChange() {
  if (_skipNextAuthChange) {
    _skipNextAuthChange = false;
    return true;
  }
  return false;
}
