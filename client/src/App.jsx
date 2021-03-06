import axios from "axios";
import React, { lazy, Suspense, Component } from "react";
import { QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import "./styles/styles.scss";
import ProtectedRoute from "./components/ProtectedRoute";
import Loading from "./components/status/Loading";
import TopBar from "./components/system/TopBar";

import HomePage from "./pages/HomePage";
import Menu from "./pages/Menu";
import * as serviceWorker from "./serviceWorker";
import Auth from "./utils/authentication";
import queryClient from "./utils/configuredQueryClient";

const About = lazy(() => import("./pages/About"));
const Admin = lazy(() => import("./pages/Admin"));
const Duel = lazy(() => import("./pages/Duel"));
const DuelCreate = lazy(() => import("./pages/DuelCreate"));
const DuelOverview = lazy(() => import("./pages/DuelOverview"));
const Login = lazy(() => import("./pages/Login"));
const Profile = lazy(() => import("./pages/Profile"));
const Train = lazy(() => import("./pages/Train"));

/**
 * Set up the authorization header in all request if the user is logged in
 */
axios.interceptors.request.use((config) => {
  const { accessToken, pseudo } = Auth.getCurrentUser() || {};
  if (accessToken && pseudo) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/**
 * Automatically try to refresh a token on 401 error
 */
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest.url === "/api/v1/users/logout") {
      // to avoid loop
      return Promise.reject(error);
    }

    const { refreshToken } = Auth.getCurrentUser() || {};

    if (refreshToken && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post("/api/v1/users/token", { refreshToken });
        Auth.updateAccessToken(res.data.accessToken);
        console.info("Access token refreshed!");
        return axios(originalRequest);
      } catch {
        await Auth.logout();
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default class App extends Component {
  constructor(props) {
    super(props);

    let { pseudo } = Auth.getCurrentUser() || {};

    this.state = {
      waitingServiceWorker: null,
      isUpdateAvailable: false,
      installPromptEvent: null,
      user: pseudo || null,
      theme: localStorage.getItem(`theme-${pseudo}`) || "automatic",
    };
  }

  componentDidMount() {
    // Install service-worker
    serviceWorker.register();

    // Display installation button
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      this.setState({
        installPromptEvent: event,
      });
    });

    // Add listener for theme if needed
    if (this.state.theme === "automatic") {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.body.classList.add("dark");
        } else {
          document.body.classList.remove("dark");
        }
      });
    }
  }

  updateTheme = (event) => {
    const { value } = event.target;
    localStorage.setItem(`theme-${this.state.user}`, value);
    this.setState({ theme: value });
  };

  render() {
    const { user, installPromptEvent, theme } = this.state;

    // add theme
    switch (theme) {
      case "light":
        document.body.classList.remove("dark");
        break;
      case "dark":
        document.body.classList.add("dark");
        break;
      default:
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.body.classList.add("dark");
        } else {
          document.body.classList.remove("dark");
        }
    }

    return (
      <QueryClientProvider client={queryClient}>
        <Router>
          <TopBar username={user} />

          <Suspense fallback={<Loading />}>
            <Switch>
              <Route path="/" exact>
                <Menu user={this.state.user} installPromptEvent={installPromptEvent} />
              </Route>
              <Route path="/about" exact component={About} />
              <Route path="/train" exact component={Train} />
              <Route path="/login" exact component={Login} />
              <ProtectedRoute
                path="/profile"
                exact
                component={({ history }) => (
                  <Profile history={history} theme={theme} updateTheme={this.updateTheme} />
                )}
              />
              <ProtectedRoute path="/homepage" exact component={HomePage} />
              <ProtectedRoute path="/duel/create" exact component={DuelCreate} />
              <ProtectedRoute path="/duel/:id" exact component={DuelOverview} />
              <ProtectedRoute path="/duel/:id/play" exact component={Duel} />
              <ProtectedRoute path="/admin" onlyAdmin exact component={Admin} />
            </Switch>
          </Suspense>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    );
  }
}
