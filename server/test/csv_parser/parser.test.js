import path from "path";
import chai from "chai";
import chaiHttp from "chai-http";
import mocha from "mocha";
import fs from "fs";
import deepEqualAnyOrder from "deep-equal-in-any-order";

import { parseCSV } from "../../modules/CSVParser/Parser.js";
import { expectations } from "./expectations.js";
// eslint-disable-next-line no-unused-vars
import { ClassificationNode } from "../../modules/CSVParser/MoleculesClassification.js";
import { HeaderError } from "../../modules/CSVParser/HeaderChecker.js";

chai.use(chaiHttp);
chai.use(deepEqualAnyOrder);
const { before } = mocha;
const { expect } = chai;

const filesFolderPath = path.resolve("test", "csv_parser", "files");
const badFilesFolderPath = path.resolve(filesFolderPath, "bad_formatted_files");
const snapshotsFolderPath = path.resolve("test", "csv_parser", "snapshots");

describe("Test if values are well imported", function () {
  const files = [
    {
      name: "molecules.xlsx",
      snapshot: "molecules.json",
      expectation: expectations.first_version,
    },
    {
      name: "molecules_moved_columns.xlsx",
      snapshot: "moved_columns.json",
      expectation: expectations.first_version,
    },
    {
      name: "molecules_little_sample.xlsx",
      snapshot: "sample.json",
      expectation: expectations.little_sample,
    },
    {
      name: "molecules_only_dci.xlsx",
      snapshot: "only_dci.json",
      expectation: expectations.only_dci,
    },
    {
      name: "molecules_empty.xlsx",
      snapshot: "empty.json",
      expectation: expectations.empty,
    },
    {
      name: "molecules_separated_rows.xlsx",
      snapshot: "separated_rows.json",
      expectation: expectations.first_version,
    },
  ];

  for (let file of files) {
    describe(`File : ${file.name}`, () => {
      let data;

      before("Import data", (done) => {
        parseCSV(path.resolve(filesFolderPath, file.name), (errors, json) => {
          if (errors) {
            console.table(errors);
          } else {
            data = JSON.parse(json);
            done();
          }
        });
      });

      it("Imported data are equals to its snapshot", function (done) {
        if (!file.snapshot) {
          this.skip();
        }
        let expectedData = fs.readFileSync(path.resolve(snapshotsFolderPath, file.snapshot));
        expect(data).to.be.deep.equals(JSON.parse(expectedData));
        done();
      });

      it("Good number of molecules", function (done) {
        expect(data.molecules.length).to.be.equals(file.expectation.number_of_molecules);
        done();
      });

      for (let classification of ["systems", "classes"]) {
        it(`Classification : ${classification}`, (done) => {
          const expectedValues = file.expectation[classification];

          const names = getAllClassificationValues(data[classification], toName);
          const ids = getAllClassificationValues(data[classification], toId);

          expectNotContainsDuplication(ids, "Unique ids");

          expect(expectedValues.all, "Values are same than expected").to.be.deep.equalInAnyOrder(names);

          for (let expected of expectedValues.nodes) {
            let value = getClassificationValue(data[classification], expected.name);

            expect(value, `Value '${expected.name}' not found.`).to.not.be.undefined;

            expect(expected.children, `'${expected.name}' has same children than expected`).to.be.deep.equalInAnyOrder(
              value.children.map(toName)
            );
          }
          expect(names, "Good number of name").to.have.length(expectedValues.all.length);
          expect(ids, "Good number of ids").to.have.length(expectedValues.all.length);

          done();
        });
      }

      for (let property of ["side_effects", "interactions", "indications"]) {
        it(`Property : ${property}`, function (done) {
          const expectedNames = file.expectation[property];
          const values = data[property];

          expect(values).to.have.length(expectedNames.length);

          expectNotContainsDuplication(
            values.map((v) => v.id),
            "Unique ids"
          );

          expect(expectedNames, "Same values").to.be.deep.equalInAnyOrder(values.map((v) => v.name));

          done();
        });
      }

      for (let expected of file.expectation.molecules) {
        it(`Molecule : ${expected.dci}`, (done) => {
          const molecule = getMoleculeByDci(data, expected.dci);

          expect(molecule, `| Molecule not found : ${expected.dci} |`).not.undefined;

          for (let classification of ["systems", "classes"]) {
            if (expected[classification] === null) {
              continue;
            }
            const value = getClassificationValue(data[classification], expected[classification]);
            expect(value, `| Class not found : ${expected[classification]} |`).not.undefined;
            expect(value.id, `| Invalid class |`).equals(molecule[classification]);
          }

          for (let property of ["skeletal_formule", "ntr", "level_easy", "level_hard"]) {
            expect(molecule[property], `| Invalid property ${property} |`).equals(expected[property]);
          }

          for (let property of ["indications", "interactions", "side_effects"]) {
            let expectedValues = expected[property].map((value) => {
              let found = getPropertyValue(data[property], value);
              expect(found, `| Invalid value '${value}' for property ${property} |`).not.undefined;
              return found.id;
            });
            expect(molecule[property], `| Invalid property : ${property} |`).deep.equalInAnyOrder(expectedValues);
          }

          done();
        });
      }
    });
  }
});

describe("Tests for errors occurred while parsing an incorrectly formatted file", function () {
  const bad_files = [
    {
      name: "empty_file.xlsx",
      errors: [HeaderError.EMPTY_FILE],
    },
    {
      name: "invalid_column.xlsx",
      errors: [HeaderError.INVALID_COLUMN],
    },
    {
      name: "missing_side_effects.xlsx",
      errors: [HeaderError.MISSING_COLUMN],
    },
    {
      name: "missing_skeletal_formule.xlsx",
      errors: [HeaderError.MISSING_COLUMN],
    },
    {
      name: "bad_grouped_property.xlsx",
      errors: [HeaderError.BAD_COLUMNS_GROUP],
    },
    {
      name: "bad_hierarchical_levels.xlsx",
      errors: [HeaderError.BAD_HIERARCHICAL_COLUMNS_ORDER],
    },
    {
      name: "bad_grouped_classification.xlsx",
      errors: [HeaderError.BAD_COLUMNS_GROUP, HeaderError.BAD_COLUMNS_GROUP],
    },
    {
      name: "missing_classification.xlsx",
      errors: [HeaderError.MISSING_COLUMN],
    },
    {
      name: "several_errors.xlsx",
      errors: [HeaderError.INVALID_COLUMN, HeaderError.INVALID_COLUMN, HeaderError.MISSING_COLUMN],
    },
  ];

  for (const file of bad_files) {
    it(`File : ${file.name}`, (done) => {
      parseCSV(path.resolve(badFilesFolderPath, file.name), (errors) => {
        expect(errors).to.not.be.null;
        console.table(errors);
        const errorsCodes = errors.map((error) => error.code);
        expect(errorsCodes).to.be.deep.equalInAnyOrder(file.errors);
        done();
      });
    });
  }
});

// ***** INTERNAL FUNCTIONS *****

/**
 * Test if an array contains duplications
 * @param {[]} array
 */
function expectNotContainsDuplication(array, message = "") {
  expect(array.length === [...new Set(array)].length, `| ${message} : Array do contains duplications |`).to.be.true;
}

/**
 * Return an array of all node of all level of a classification
 * @param {ClassificationNode[]} classification
 * @returns {ClassificationNode[]}
 */
function flattenClassification(classification) {
  function flattenNode(node) {
    let res = [node];
    for (let child of node.children) {
      res.push(...flattenNode(child));
    }
    return res;
  }

  const res = [];
  for (let node of classification) {
    res.push(...flattenNode(node));
  }
  return res;
}

/**
 * Find a molecule by its dci
 * @param {object} data
 * @param {string} dci
 */
function getMoleculeByDci(data, dci) {
  return data.molecules.find((m) => m.dci === dci);
}

/**
 * Find a system by its name
 * @param {ClassificationNode[]} classification
 * @param {string} name
 */
function getClassificationValue(classification, name) {
  return getAllClassificationValues(classification).find((classe) => classe.name === name);
}

/**
 * Get all values of a classification
 * @param {ClassificationNode[]} classification
 * @param {function} filter
 */
function getAllClassificationValues(classification, filter = identity) {
  return flattenClassification(classification).map(filter);
}

/**
 * Find a value in a property
 * @param {{id : number, name : string}[]} property
 * @param {string} name
 */
function getPropertyValue(property, name) {
  return property.find((value) => value.name === name);
}

// Filters
const toId = (object) => object.id;
const toName = (object) => object.name;
const identity = (e) => e;
