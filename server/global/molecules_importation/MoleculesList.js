import { queryFormat } from "../../db/database.js";
import FileStructure from "../csv_reader/FileStructure.js";
import { getDuplicates, getTooCloseValues, AnalyzerWarning } from "../importationUtils.js";

import Classification from "./Classification.js";

import Property, { PropertyValue } from "./Property.js";

const MOLECULE_DCI_MAX_LENGTH = 128;
const MOLECULE_DCI_MIN_DISTANCE = 1;
const MOLECULE_SKELETAL_FORMULA_MAX_LENGTH = 64;
const VALID_DCI_REGEX = /^[a-z_]+$/i;

export const MOLECULE_WARNINGS = {
  INVALID_DCI: "INVALID_DCI",
  DUPLICATED_MOLECULES: "DUPLICATED_MOLECULES",
  TOO_CLOSE_MOLECULES: "TOO_CLOSE_MOLECULES",
  TOO_LONG_DCI: "TOO_LONG_DCI",
};

export default class MoleculeList {
  constructor(matrix, structure, data) {
    /** @type {Molecule[]} */
    this.list = [];
    let autoIncrementId = 1;

    matrix.forEach((row) => this.list.push(new Molecule(autoIncrementId++, row, structure, data)));
  }

  extract() {
    return this.list.map((molecule) => molecule.extract());
  }

  analyze() {
    const warnings = [];

    const moleculeNames = this.list.map((m) => m.dci);

    warnings.push(
      ...getDuplicates(moleculeNames).map(
        (duplicate) =>
          new AnalyzerWarning(
            MOLECULE_WARNINGS.DUPLICATED_MOLECULES,
            `Duplications de la molécule "${duplicate}"`
          )
      )
    );

    warnings.push(
      ...getTooCloseValues(moleculeNames, MOLECULE_DCI_MIN_DISTANCE).map(
        (group) =>
          new AnalyzerWarning(
            MOLECULE_WARNINGS.TOO_CLOSE_MOLECULES,
            `Ces molécules ont une DCI très proche : "${group.join('", "')}"`
          )
      )
    );

    for (const molecule of this.list) {
      warnings.push(...molecule.analyze());
    }

    return warnings;
  }

  import() {
    return this.list.reduce((script, molecule) => script + molecule.importSql(), "");
  }
}

export class Molecule {
  /**
   * Create a molecule
   * @param {number} id The unique id
   * @param {any[]} row The complete row
   * @param {FileStructure} structure The file structure
   * @param {object} data  Object containing classifications & properties data
   */
  constructor(id, row, structure, data) {
    this.id = id;

    this.dci = this.getUniquePropertyValue("dci", row, structure);
    this.skeletalFormula = this.getUniquePropertyValue("skeletalFormula", row, structure);
    this.ntr = this.getUniquePropertyValue("ntr", row, structure);
    this.difficulty = this.getUniquePropertyValue("levelEasy", row, structure) ? "EASY" : "HARD";

    this.indications = this.getMultivaluedPropertyValuesIds("indications", row, structure, data);
    this.interactions = this.getMultivaluedPropertyValuesIds("interactions", row, structure, data);
    this.sideEffects = this.getMultivaluedPropertyValuesIds("sideEffects", row, structure, data);

    this.system = this.getClassificationNodeID("system", row, structure, data);
    this.class = this.getClassificationNodeID("class", row, structure, data);
  }

  /**
   * Get the value of a unique property
   * @param {string} property The property name
   * @param {any[]} row The complete row
   * @param {FileStructure} structure The file structure
   */
  getUniquePropertyValue(property, row, structure) {
    const value = row[structure.getIndexesFor(property)[0]];
    return value !== undefined ? value : null;
  }

  /**
   * Get the id of the values of a multi valued property
   * @param {string} property The property name
   * @param {any[]} row The complete row
   * @param {FileStructure} structure The file structure
   * @param {object} data  Object containing classifications & properties data
   */
  getMultivaluedPropertyValuesIds(property, row, structure, data) {
    const indexes = structure.getIndexesFor(property);
    const values = row.filter((_, index) => indexes.includes(index));
    return this.getPropertyValuesIds(data[property], values);
  }

  /**
   * Get the id of the classification value to which the molecule belongs
   * @param {string} classificationName The classification name
   * @param {any[]} row The complete row
   * @param {FileStructure} structure The file structure
   * @param {object} data  Object containing classifications & properties data
   */
  getClassificationNodeID(classificationName, row, structure, data) {
    /** @type {Classification} */
    const classification = data[classificationName];
    const indexes = structure.getIndexesFor(classificationName);
    const values = row.filter((_, index) => indexes.includes(index));

    // console.log("values", classificationName, values);

    let node = classification.getElementByName(values.shift());

    while (node && values.length > 0) {
      const child = node.getChildByName(values.shift());
      if (child) {
        node = child;
      }
    }
    return node?.id || null;
  }

  /**
   *
   * @param {Property} property
   * @param {PropertyValue[]} values
   * @returns
   */
  getPropertyValuesIds(property, values) {
    return values.filter((v) => v).map((value) => property.getValueByName(value).id);
  }

  extract() {
    return JSON.parse(JSON.stringify(this));
  }

  importSql() {
    // Insert the molecule in the table molecule
    const insertMoleculeSql = `INSERT INTO molecule VALUES (:id, :dci, :difficulty, :skeletalFormula, :ntr, :class, :system, NULL); `;

    let script = queryFormat(insertMoleculeSql, {
      id: Number(this.id),
      dci: String(this.dci).substr(0, MOLECULE_DCI_MAX_LENGTH),
      difficulty: this.difficulty,
      skeletalFormula: String(this.skeletalFormula || "").substr(
        0,
        MOLECULE_SKELETAL_FORMULA_MAX_LENGTH
      ),
      ntr: Number(this.ntr) ? 1 : 0,
      class: Number(this.class) || null,
      system: Number(this.system) || null,
    });

    // Insert its properties in the molecule_property table
    const insertMoleculePropertySql = `INSERT INTO molecule_property VALUES (:molecule, :propertyValue); `;

    for (const property of ["indications", "interactions", "sideEffects"]) {
      for (const value of this[property]) {
        script += queryFormat(insertMoleculePropertySql, {
          molecule: this.id,
          propertyValue: value,
        });
      }
    }
    return script;
  }

  analyze() {
    const warnings = [];

    if (!Molecule.isMoleculeDCIValid(this.dci)) {
      warnings.push(
        new AnalyzerWarning(MOLECULE_WARNINGS.INVALID_DCI, `Molécule invalide : "${this.dci}" `)
      );
    }

    if (String(this.dci).length > MOLECULE_DCI_MAX_LENGTH) {
      warnings.push(
        new AnalyzerWarning(
          MOLECULE_WARNINGS.TOO_LONG_DCI,
          `La DCI "${this.dci}" est trop longue (max ${MOLECULE_DCI_MAX_LENGTH})`
        )
      );
    }

    return warnings;
  }

  static isMoleculeDCIValid(dci) {
    return VALID_DCI_REGEX.test(normalizeDCI(dci));
  }
}

/**
 * Normalize a molecule DCI
 * @param {string} dci
 */
export const normalizeDCI = (dci) =>
  String(dci)
    .trim()
    .normalize("NFD") // The unicode normal form decomposes the combined graphemes into a combination of simple graphemes. 'è' => 'e' + '`'
    .replace(/[\u0300-\u036f]/g, "") // Remove all special graphemes : 'e' + '`' => 'e'
    .replace(/[\s-']+/g, "_")
    .toLowerCase();