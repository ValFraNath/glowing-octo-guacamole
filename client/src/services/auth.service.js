import axios from "axios";

import queryClient from "../utils/configuredQueryClient";

const LOCAL_STORAGE_KEY = "user_informations";

/**
 * Logs the user to the server
 * @param {string} pseudo The user pseudo
 * @param {string} password The user password
 * @returns {Promise<string>} The user pseudo
 */
async function login(pseudo, password) {
  const {
    data: { accessToken, refreshToken, admin },
  } = await axios.post("/api/v1/users/login", {
    userPseudo: pseudo,
    userPassword: password,
  });

  if (!accessToken || !refreshToken) {
    return null;
  }

  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      pseudo,
      accessToken,
      refreshToken,
      admin,
    })
  );

  return pseudo;
}

/**
 * Update the user access token
 * @param {string} newAccessToken The new access token
 */
function updateAccesToken(newAccessToken) {
  const currentInfos = getCurrentUser();
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      ...currentInfos,
      accessToken: newAccessToken,
    })
  );
}

/**
 * Logs the user out of the server
 */
async function logout() {
  const { refreshToken } = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
  await axios.post("/api/v1/users/logout", { refreshToken });
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  queryClient.clear();
}

/**
 * Get the current user informations
 * @returns {object}
 */
function getCurrentUser() {
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
}

export default { login, logout, getCurrentUser, updateAccesToken };
