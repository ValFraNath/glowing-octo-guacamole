import { queryFormat } from "../../db/database.js";
import { AnalyzerWarning, isString, getTooCloseValues } from "../importationUtils.js";

const PROPERTY_NAME_MAX_LENGTH = 64;
const PROPERTY_VALUE_MAX_LENGTH = 128;
const PROPERTY_VALUE_MIN_DISTANCE = 2;

export const PROPERTY_WARNINGS = {
  TOO_CLOSE_PROPERTY_VALUES: "TOO_CLOSE_PROPERTY_VALUES",
  TOO_LONG_PROPERTY_VALUE: "TOO_LONG_PROPERTY_VALUE",
  INVALID_PROPERTY_VALUE_TYPE: "INVALID_PROPERTY_VALUE_TYPE",
};

export default class Property {
  constructor(matrix, name, id) {
    /** @type {string} */
    this.name = name;
    /** @type {PropertyValue[]} */
    this.values = [];

    this.id = id;
    let autoIncrementId = 1;

    const uniqueId = () => Number(`${this.id}${autoIncrementId++}`);

    for (const row of matrix) {
      for (const value of row) {
        if (this.getValueByName(value)) {
          continue;
        }
        const newValue = new PropertyValue(uniqueId(), value, this.id);
        this.values.push(newValue);
      }
    }
  }

  getValueByName(name) {
    // TODO use regex to compare without case
    return this.values.find((value) => value.name === name);
  }

  analyze() {
    const warnings = [];

    const tooCloseValues = getTooCloseValues(
      this.values.map((v) => v.name),
      PROPERTY_VALUE_MIN_DISTANCE
    ).map(
      (group) =>
        new AnalyzerWarning(
          PROPERTY_WARNINGS.TOO_CLOSE_PROPERTY_VALUES,
          `Ces valeurs de ${this.name} sont très proches : "${group.join('", "')}"`
        )
    );

    warnings.push(...tooCloseValues);

    for (const value of this.values) {
      warnings.push(...value.analyse());
    }

    return warnings;
  }

  import() {
    const sql = queryFormat(`INSERT INTO property VALUES (:id, :name); `, {
      id: Number(this.id),
      name: String(this.name).substring(0, PROPERTY_NAME_MAX_LENGTH),
    });

    return this.values.reduce((sql, value) => `${sql} ${value.createInsertionSql()}`, sql);
  }

  extract() {
    return this.values.map((value) => value.extract());
  }
}

export class PropertyValue {
  constructor(id, name, propertyId) {
    this.id = id;
    this.name = name;
    this.propertyId = propertyId;
  }

  createInsertionSql() {
    return queryFormat(`INSERT INTO property_value VALUES (:id, :name, :property); `, {
      id: Number(this.id),
      name: String(this.name).substring(0, PROPERTY_VALUE_MAX_LENGTH),
      property: Number(this.propertyId),
    });
  }

  extract() {
    return {
      id: this.id,
      name: this.name,
    };
  }

  analyse() {
    const warnings = [];

    if (this.name.length > PROPERTY_VALUE_MAX_LENGTH) {
      warnings.push(
        new AnalyzerWarning(
          PROPERTY_WARNINGS.TOO_LONG_PROPERTY_VALUE,
          `La valeur de ${this.classification} "${this.name}" est trop longue (max ${PROPERTY_VALUE_MAX_LENGTH})`
        )
      );
    }

    if (!isString(this.name)) {
      warnings.push(
        new AnalyzerWarning(
          PROPERTY_WARNINGS.INVALID_PROPERTY_VALUE_TYPE,
          `La valeur de ${this.classification} "${this.name}" devrait être du texte`
        )
      );
    }

    return warnings;
  }
}