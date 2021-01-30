import levenshtein from "js-levenshtein";

const DCI_MAX_LENGTH = 128;
const PROPERTY_VALUE_MAX_LENGTH = 128;
const CLASSIFICATION_VALUE_MAX_LENGTH = 128;
const DCI_DISTANCE_MIN = 1;
const PROPERTY_VALUE_MIN_DISTANCE = 2;
const CLASSIFICATION_VALUE_MIN_DISTANCE = 2;

/**
 * Analyse the data object and returns warnings
 * @param {object} data
 * @returns {AnalyzerWarning[]}
 */
export function analyzeData(data) {
  const warnings = [];

  warnings.push(...analyzeClassification("classes", data.classes));
  warnings.push(...analyzeClassification("systèmes", data.systems));

  warnings.push(...analyzeProperty("indications", data.indications, 128));
  warnings.push(...analyzeProperty("effets indésirables", data.side_effects, 128));
  warnings.push(...analyzeProperty("intéractions", data.interactions, 128));

  warnings.push(...analyzeMolecules(data.molecules));

  return warnings;
}

/**
 * Analyze a property
 * @param {string} property The property name
 * @param {{id : number, name : string}[]} values
 * @returns {AnalyzerWarning[]}
 */
function analyzeProperty(property, values) {
  const names = values.map((v) => v.name);
  const tooLongValues = getTooLongValues(names, PROPERTY_VALUE_MAX_LENGTH);
  const closeValues = getTooCloseValues(names, PROPERTY_VALUE_MIN_DISTANCE);

  return [
    ...tooLongValues.map(
      (value) =>
        new AnalyzerWarning(
          AnalyzerWarning.TOO_LONG_VALUE,
          `La valeur '${value}' de la propriété '${property}' est trop long (max ${PROPERTY_VALUE_MAX_LENGTH})`
        )
    ),
    ...closeValues.map(
      (group) =>
        new AnalyzerWarning(
          AnalyzerWarning.TOO_CLOSE_VALUES,
          `Ces valeurs de '${property}' sont très proches : ${group.join(", ")}`
        )
    ),
  ];
}

/**
 * Analyze a classification
 * @param {string} classification The classification names
 * @param {object[]} nodes The classification node
 * @returns {AnalyzerWarning[]}
 */
function analyzeClassification(classification, nodes) {
  const names = flattenClassification(nodes).map((n) => n.name);
  const closeValues = getTooCloseValues(names, CLASSIFICATION_VALUE_MIN_DISTANCE);
  const tooLongValues = getTooLongValues(names, CLASSIFICATION_VALUE_MAX_LENGTH);
  const nodesHavingSeveralParents = findNodeWithDifferentsParents(nodes);

  return [
    ...closeValues.map(
      (group) =>
        new AnalyzerWarning(
          AnalyzerWarning.TOO_CLOSE_VALUES,
          `Ces valeurs de '${classification}' sont très proches : '${group.join("', '")}'`
        )
    ),
    ...nodesHavingSeveralParents.map(
      (node) =>
        new AnalyzerWarning(
          AnalyzerWarning.DUPLICATE_CLASSIFICATION_NODE,
          `La valeur de '${classification}' '${
            node.node
          }' apparait plusieurs fois dans la hiérarchie, enfant de : '${node.parents.join("', '")}'`
        )
    ),
    ...tooLongValues.map(
      (value) =>
        new AnalyzerWarning(
          AnalyzerWarning.TOO_LONG_VALUE,
          `La valeur de '${classification}' '${value}' est trop longue (max ${CLASSIFICATION_VALUE_MAX_LENGTH})'`
        )
    ),
  ];
}

/**
 * Analyze a molecule list
 * @param {object[]} molecules The molecules list
 * @returns {AnalyzerWarning[]}
 */
function analyzeMolecules(molecules) {
  const dciList = molecules.map((m) => m.dci);
  const duplicates = getDuplicates(dciList);
  const closeNames = getTooCloseValues(dciList, DCI_DISTANCE_MIN);
  const tooLongNames = getTooLongValues(dciList, DCI_MAX_LENGTH);
  return [
    ...duplicates.map(
      (mol) =>
        new AnalyzerWarning(
          AnalyzerWarning.DUPLICATE_UNIQUE_VALUE,
          `Duplications de la molécule '${mol}'`
        )
    ),
    ...closeNames.map(
      (group) =>
        new AnalyzerWarning(
          AnalyzerWarning.TOO_CLOSE_VALUES,
          `Ces molécules ont une DCI très proche : '${group.join("', '")}'`
        )
    ),
    ...tooLongNames.map(
      (dci) =>
        new AnalyzerWarning(
          AnalyzerWarning.TOO_LONG_VALUE,
          `La DCI '${dci}' est trop longue (max ${DCI_MAX_LENGTH})`
        )
    ),
  ];
}

export class AnalyzerWarning {
  constructor(type, message) {
    this.type = type;
    this.message = message;
  }
}

AnalyzerWarning.DUPLICATE_UNIQUE_VALUE = 1;
AnalyzerWarning.TOO_LONG_VALUE = 2;
AnalyzerWarning.TOO_CLOSE_VALUES = 3;
AnalyzerWarning.DUPLICATE_CLASSIFICATION_NODE = 4;

/**
 * Returns values that appear more than once in the list
 * @param {any[]} values
 * @returns {any[]} non-unique values
 */
function getDuplicates(values) {
  return [...new Set(values.filter((value, i) => values.slice(i + 1).includes(value)))];
}

/**
 * Get all values which are longer that the max length
 * @param {string[]} values
 * @param {number} maxlength
 * @returns {string[]} The list a too long values
 */
function getTooLongValues(values, maxlength) {
  return values.filter((value) => value.length > maxlength);
}

/**
 * Returns all groups of values that have a distance less than a given one
 * @param {string[]} values The values
 * @param {number} minDistance The maximum distance
 * @returns {string[][]}
 */
function getTooCloseValues(values, minDistance) {
  values = values.slice();
  const groups = [];

  values.forEach((value, i) => {
    if (!value) {
      return;
    }
    const group = values
      .slice(i)
      .filter((other) => other && levenshtein(other, value) <= minDistance);

    if (group.length > 1) {
      groups.push(group);
    }
    values = values.map((value) => (group.includes(value) ? null : value));
  });

  return groups;
}

/**
 * Find nodes with the same name but a different parent
 * @param {object[]} classification The set of nodes
 * @returns {{node : string, parents : string[]}[]}
 */
function findNodeWithDifferentsParents(classification) {
  classification = flattenClassification(classification);
  const groups = [];
  classification.forEach((node, i) => {
    if (!node) {
      return;
    }

    const duplicates = classification
      .slice(i)
      .filter((other) => other && node.name === other.name)
      .map((node) => node.name);

    if (duplicates.length > 1) {
      const parents = classification
        .filter((n) => n && n.children.find((n) => n.name === duplicates[0]))
        .map((p) => p.name);

      groups.push({ node: duplicates[0], parents });
      classification = classification.map((n) => (duplicates.includes(n) ? null : n));
    }
  });
  return groups;
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