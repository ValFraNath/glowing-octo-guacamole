import dateFormat from "dateformat";
import mysql from "mysql";

import { queryFormat } from "../../../db/database.js";
import {
  AnalyzerWarning,
  getDuplicates,
  getTooCloseValues,
  TRANSACTION_BEGIN_SQL,
  TRANSACTION_END_SQL,
} from "../../importationUtils.js";
// eslint-disable-next-line no-unused-vars
import FileStructure from "../csv-reader/FileStructure.js";

export const USER_WARNINGS = {
  NO_ADMIN: "NO_ADMIN",
  DUPLICATED_LOGINS: "DUPLICATED_LOGINS",
  INVALID_LOGIN: "INVALID_LOGIN",
  TOO_LONG_LOGIN: "TOO_LONG_LOGIN",
  TOO_CLOSE_LOGINS: "TOO_CLOSE_LOGINS",
  NO_USER: "NO_USER",
};

const VALID_LOGIN_REGEX = /^[a-z\d]+$/i;
const LOGIN_MAX_LENGTH = 32;
const LOGIN_MIN_DISTANCE = 2;

const DEFAULT_AVATAR = {
  eyes: 0,
  hands: 0,
  hat: 0,
  mouth: 0,
  colorBody: "#0c04fc", // navy
  colorBG: "#D3D3D3", // grey
};

/**
 * Class representing a list of users
 */
export default class UsersList {
  /**
   * Create a users list from a matrix
   * @param {any[][]} matrix The matrix of users
   * @param {FileStructure} structure The csv file structure
   */
  constructor(matrix, structure) {
    this.list = [];

    for (const row of matrix) {
      const login = row[structure.getIndexesFor("login")[0]];
      const isAdmin = row[structure.getIndexesFor("admin")[0]];
      this.list.push(new User(login, isAdmin));
    }
  }

  /**
   * Extract user into an array of simple object
   * @returns {object[]}
   */
  extract() {
    return this.list.map((user) => user.extract());
  }

  /**
   * Create the sql script to import the users list in database
   * @returns {string}
   */
  createImportSql() {
    let script = TRANSACTION_BEGIN_SQL;

    script += this.createSqlToArchiveRemovedUsers();

    script += this.list.reduce((sql, user) => sql + user.createImportSql(), "");

    script += TRANSACTION_END_SQL;

    return script;
  }

  /**
   * Analyze the users list
   * @returns {AnalyzerWarning[]} A list of warnings
   */
  analyze() {
    const warnings = [];

    if (this.list.length === 0) {
      warnings.push(new AnalyzerWarning(USER_WARNINGS.NO_USER, "La liste d'utilisateur est vide"));
    }

    if (this.list.filter((u) => u.isAdmin === 1).length === 0) {
      warnings.push(
        new AnalyzerWarning(USER_WARNINGS.NO_ADMIN, "Aucun utilisateur désigné comme admin")
      );
    }

    const userLogins = this.list.map((u) => u.login);

    warnings.push(
      ...getDuplicates(userLogins).map(
        (duplicate) =>
          new AnalyzerWarning(
            USER_WARNINGS.DUPLICATED_LOGINS,
            `Le nom d'utilisateur "${duplicate}" est présent plusieurs fois`
          )
      )
    );

    warnings.push(
      ...getTooCloseValues(userLogins, LOGIN_MIN_DISTANCE).map(
        (group) =>
          new AnalyzerWarning(
            USER_WARNINGS.TOO_CLOSE_LOGINS,
            `Ces noms d'utilisateur sont très proches : "${group.join('", "')}"`
          )
      )
    );

    for (const user of this.list) {
      warnings.push(...user.analyze());
    }

    return warnings;
  }

  /**
   * Create the script to delete all user that have not been imported again
   * @returns {string}
   */
  createSqlToArchiveRemovedUsers() {
    const date = mysql.escape(dateFormat(new Date(), "yyyy-mm-dd"));
    let escapedLogins = this.list
      .map(({ login }) => mysql.escape(String(login).substr(0, LOGIN_MAX_LENGTH).toLowerCase()))
      .join(", ");

    if (escapedLogins.length === 0) {
      escapedLogins = ["''"];
    }

    return `DELETE FROM duel \
				WHERE EXISTS (  SELECT * \
												FROM results \
												WHERE results.du_id = duel.du_id \
												AND results.us_login NOT IN (${escapedLogins}) ); \
				UPDATE user \
				SET us_deleted = ${date}, us_admin = 0 \
				WHERE us_login NOT IN (${escapedLogins}); `;
  }
}

/**
 * Class representing a user
 */
export class User {
  /**
   * Create a user
   * @param {string} login The user login
   * @param {boolean} isAdmin Boolean telling if the user is an admin
   */
  constructor(login, isAdmin) {
    this.login = login;
    this.isAdmin = isAdmin;
  }

  /**
   * Extract the user into a simple object
   * @returns {{login: string, isAdmin: boolean}}
   */
  extract() {
    return {
      login: this.login,
      isAdmin: this.isAdmin,
    };
  }

  /**
   * Create the script to import the user in database
   * @returns {string}
   */
  createImportSql() {
    const sql =
      "INSERT INTO user (us_login,us_admin,us_avatar) \
				VALUES (:login,:admin,:avatar) \
				ON DUPLICATE KEY UPDATE us_admin = :admin, us_deleted = NULL; ";

    return queryFormat(sql, {
      login: String(this.login).substr(0, LOGIN_MAX_LENGTH).toLowerCase(),
      admin: this.isAdmin === 1 ? 1 : 0,
      avatar: JSON.stringify(DEFAULT_AVATAR),
    });
  }

  /**
   * Analyze the user
   * @returns {AnalyzerWarning[]} A list of warnings
   */
  analyze() {
    const warnings = [];

    if (!User.isLoginValid(this.login)) {
      warnings.push(
        new AnalyzerWarning(USER_WARNINGS.INVALID_LOGIN, `Login invalide : "${this.login}"`)
      );
    }

    if (String(this.login).length > LOGIN_MAX_LENGTH) {
      warnings.push(
        new AnalyzerWarning(
          USER_WARNINGS.INVALID_LOGIN,
          `Login trop long : "${this.login}" (max ${LOGIN_MAX_LENGTH})`
        )
      );
    }

    return warnings;
  }

  /**
   * Checks if a login is valid
   * @param {string} login
   * @returns {boolean}
   */
  static isLoginValid(login) {
    return VALID_LOGIN_REGEX.test(String(login));
  }
}
