import fs from "fs";
import path from "path";

/**
 * Log an error
 * @param {Error} error The error object
 */
function error(error) {
  const line = Array(100).fill("-").join("");
  const txt = `\n${line}\n${formatDate()} | ${error.message}\n${line}\n> ${error.stack}\n${line}`;
  if (isProduction()) {
    logInFile("error.txt", txt);
  } else {
    console.error(txt);
  }
}

/**
 * Log an information
 * @param  {...any} messages Messages to log
 */
function info(...messages) {
  messages = messages.map(prefixByDate);
  if (isProduction()) {
    logInFile("out.txt", ...messages);
  } else {
    console.info(...messages);
  }
}

/**
 * Log a debugging message
 * @param  {...any} messages Messages to log
 */
function debug(...messages) {
  if (!isProduction()) {
    console.debug(...messages.map(prefixByDate));
  }
}

export default { error, info, debug };

// ***** INTERNAL FUNCTIONS *****

const isProduction = () => process.env.NODE_ENV === "production";

const logsDir = path.resolve("logs");

/**
 * Log a message in a file
 * @param {string} file The filename
 * @param  {...string} messages The messages to log
 */
function logInFile(file, ...messages) {
  try {
    fs.mkdirSync(path.resolve("logs"));
  } catch (e) {
    if (e.code !== "EEXIST") {
      throw e;
    }
  }
  messages.forEach((message) =>
    fs.appendFileSync(path.resolve(logsDir, file), message + "\n", {
      encoding: "utf-8",
      flag: "as",
    })
  );
}

/**
 * Prefix a string by the formatted current date
 * @param {string} str
 * @returns {string}
 */
const prefixByDate = (str) => `${formatDate()} | ${str}`;

/**
 * Format the current date
 * @returns {string}
 */
function formatDate() {
  const date = new Date();
  return `${forceTwoDigit(date.getDate())}/${forceTwoDigit(
    date.getMonth() + 1
  )}/${date.getFullYear()} - ${forceTwoDigit(date.getHours())}:${forceTwoDigit(
    date.getMinutes()
  )}:${forceTwoDigit(date.getSeconds())}`;
}

/**
 * Force a number to contains to digit
 * @param {string} number
 */
const forceTwoDigit = (number) => ("0" + number).slice(-2);
