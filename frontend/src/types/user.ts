export type User = {
  instagramHandle: string;
  displayName: string;
  settings: {
    displayMessage: string;
    toggleUseAI: boolean
  };
}