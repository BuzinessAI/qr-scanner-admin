// src/Instance.js
import axios from 'axios';

// const BaseUrl = 'http://localhost:8080/api';

const BaseUrl = 'https://api.myhomeqr.com/api';

// Create an instance of axios with default configurations
const Instance = axios.create({
  baseURL: BaseUrl,
  headers: {
    'Content-Type': 'application/json',
    // Add any other headers here, such as authorization
  },
});

export const readAuthUser = () => {
  // A throw in the request interceptor rejects every request, so a corrupt
  // authUser entry must not be able to take the whole app down.
  try {
    return JSON.parse(localStorage.getItem("authUser") || "null");
  } catch (err) {
    console.error("Corrupt authUser in localStorage:", err);
    return null;
  }
};

Instance.interceptors.request.use((config) => {
  const authUser = readAuthUser();

  if (authUser?.token) {
    config.headers.Authorization = `Bearer ${authUser.token}`;
  }
  return config;
});

// Codes protectAdmin returns when the session itself is unusable, as opposed to
// FORBIDDEN, which means "signed in correctly, but not allowed to do this".
const SESSION_DEAD_CODES = [
  "NO_TOKEN",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "ADMIN_NOT_FOUND",
  "NOT_ADMIN_TOKEN",
  "ACCOUNT_INACTIVE",
];

const LOGIN_PATH = "/login";

// Several screens fire requests in parallel, so a dead token produces a burst of
// 401s; without this latch each one would kick off its own navigation.
let loggingOut = false;

const forceLogout = () => {
  if (loggingOut) return;
  loggingOut = true;

  localStorage.removeItem("authUser");

  // Already on the login screen (a failed sign-in also answers 401) - there is
  // nothing to navigate away from, so just clear and let the form show the error.
  if (window.location.pathname === LOGIN_PATH) {
    loggingOut = false;
    return;
  }

  const returnTo = `${window.location.pathname}${window.location.search}`;
  // replace() so Back does not land on a page that cannot load anything.
  window.location.replace(
    `${LOGIN_PATH}?sessionExpired=1&next=${encodeURIComponent(returnTo)}`
  );
};

/**
 * Without this, an expired or foreign token left the dashboard in a zombie state:
 * every GET still worked (the read endpoints are public), the sidebar still read
 * "SuperAdmin" from localStorage, and only writes failed - surfacing as a raw
 * "Not authorized, admin not found" inside whichever modal made the call, with no
 * way for the user to guess that re-logging in was the fix.
 */
Instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // No error.response means the request never got an answer (server down,
    // CORS, offline). That is not an auth failure and must not sign anyone out.
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (!error?.config?.skipAuthRedirect) {
      // Older endpoints answer 401 without a `code`; treat a bare 401 on a
      // request we attached a token to as a dead session too.
      const dead =
        (status === 401 && (!code || SESSION_DEAD_CODES.includes(code))) ||
        (status === 403 && code === "ACCOUNT_INACTIVE");

      if (dead) forceLogout();
    }

    return Promise.reject(error);
  }
);

export { Instance, BaseUrl };

const authInstance = axios.create({
  // baseURL: "http://localhost:8080/api/auth",
  baseURL: "https://api.myhomeqr.com/api/auth",
  headers: { "Content-Type": "application/json" },
});


export default authInstance;
