/**
 * @file tokenStorage.js
 * @description Thin wrapper around localStorage for the auth token.
 * Centralises the storage key so it's easy to change later.
 */

const TOKEN_KEY = "cd_token";

export const tokenStorage = {
  get: ()          => localStorage.getItem(TOKEN_KEY),
  set: (token)     => localStorage.setItem(TOKEN_KEY, token),
  clear: ()        => localStorage.removeItem(TOKEN_KEY),
  exists: ()       => !!localStorage.getItem(TOKEN_KEY),
};
