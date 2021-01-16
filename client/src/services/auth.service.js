import axios from "axios";

const AuthService = {};

const LOCAL_STORAGE_KEY = "user_informations";

AuthService.login = async function (pseudo, password) {
  return new Promise((resolve, reject) => {
    axios
      .post("/api/v1/user/login", {
        userPseudo: pseudo,
        userPassword: password,
      })
      .then((res) => {
        const { token } = res.data;
        if (token) {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({
              pseudo,
              token,
            })
          );
        }
        resolve(pseudo);
      })
      .catch((error) => {
        reject((error && error.response && error.response.data && error.response.data.error) || error);
      });
  });
};

AuthService.logout = function () {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

AuthService.getCurrentUser = function () {
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
};

export default AuthService;
