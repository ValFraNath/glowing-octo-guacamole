import { queryPromise } from "../db/database.js";

async function getAllSystems(req, res) {
  const sql = "SELECT sy_id, sy_name FROM system WHERE sy_higher IS NULL;";
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

/**BACKEND*/
/**PROPERTIES*/
async function getAllProperties(req, res) {
  const sql = "SELECT pv_id, pv_name, pr_name FROM property_value JOIN property ON pr_id=pv_property;";
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function getMoleculesByProperty(req,res){
  const { id } = req.params;
  const sql = `SELECT mo_dci FROM molecule JOIN molecule_property ON molecule.mo_id=molecule_property.mo_id WHERE pv_id=${id};`;
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function addProperty(req){
  const {name, property} = req.body;
  const sql = `INSERT IGNORE INTO property_value (pv_name,pv_property) VALUES ('${name}',${property});`;
  await queryPromise(sql);
}

async function deleteProperty(req){
  const {id} = req.body;
  const sql = `DELETE FROM property_value WHERE pv_id=${id};`;
  await queryPromise(sql);
}

async function updateProperty(req){
  const { id, name } = req.body;
  const sql = `UPDATE property_value SET pv_name="${name}" WHERE pv_id=${id};`;
  await queryPromise(sql);
}

/**SYSTEMS*/
async function getSystems(req, res) {
  const sql = "SELECT sy_id, sy_name, sy_higher FROM system;";
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function getMoleculesBySystem(req,res){
  const { id } = req.params;
  const sql = `SELECT mo_dci FROM molecule WHERE mo_system=${id};`;
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function addSystem(req){
  const {name, higher} = req.body;
  const sql = `INSERT IGNORE INTO system (sy_name,sy_higher) VALUES ('${name}',${higher});`;
  await queryPromise(sql);
}

async function deleteSystem(req){
  const {id} = req.body;
  const sql = `DELETE FROM system WHERE sy_id=${id};`;
  await queryPromise(sql);
}

async function updateSystem(req){
  const { id, name } = req.body;
  const sql = `UPDATE system SET sy_name="${name}" WHERE sy_id=${id};`;
  await queryPromise(sql);
}

/**CLASSES*/
async function getClasses(req, res) {
  const sql = "SELECT cl_id, cl_name, cl_higher, cl_level FROM class;";
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function getMoleculesByClass(req,res){
  const { id } = req.params;
  const sql = `SELECT mo_dci FROM molecule WHERE mo_class=${id};`;
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function addClass(req){
  const {name, higherID, level} = req.body;
  const sql = `INSERT IGNORE INTO class (cl_name,cl_higher,cl_level) VALUES ('${name}',${higherID},${level});`;
  await queryPromise(sql);
}

async function deleteClass(req){
  const {id} = req.body;
  const sql = `DELETE FROM class WHERE cl_id=${id};`;
  await queryPromise(sql);
}

async function updateClass(req){
  const { id, name } = req.body;
  const sql = `UPDATE class SET cl_name="${name}" WHERE cl_id=${id};`;
  await queryPromise(sql);
}

/**MOLECULES*/
async function getMolecules(req, res) {
  const sql = "SELECT molecule.mo_id, mo_dci, mo_difficulty, cl_name, sy_name, mo_image, pv_name FROM molecule LEFT JOIN class ON cl_id=mo_class LEFT JOIN system ON sy_id=mo_system LEFT JOIN molecule_property ON molecule.mo_id=molecule_property.mo_id LEFT JOIN property_value ON molecule_property.pv_id=property_value.pv_id";
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function deleteMolecule(req){
  const {id} = req.body;
  const sql = `DELETE FROM molecule_property WHERE mo_id=${id};
  		DELETE FROM molecule WHERE mo_id=${id};`;
  await queryPromise(sql);
}

async function addMolecule(req){
  const {name} = req.body;
  const sql = `INSERT INTO molecule (mo_dci, mo_skeletal_formula, mo_ntr, mo_difficulty, mo_system, mo_class) VALUES ('${name}', '', 0, 1, NULL, NULL);`;
  await queryPromise(sql);
}

async function updateMolecule(req){
  const { id, name, diff, sy, cl, pr } = req.body;
  let sql = '';
  if(pr.length!==0){
    sql += `DELETE FROM molecule_property WHERE mo_id=${id};`
    pr.forEach((propertyID) => sql+=`INSERT INTO molecule_property (mo_id, pv_id) VALUES (${id}, ${propertyID});`);
  }
  sql+=`UPDATE molecule SET mo_dci='${name}', mo_difficulty=${diff}, mo_system=${sy}, mo_class=${cl} WHERE mo_id=${id};`;
  await queryPromise(sql);
}

export default { getAllSystems, getAllProperties, addProperty, deleteProperty, getMoleculesByProperty, updateProperty, getSystems, addSystem, deleteSystem, getMoleculesBySystem, updateSystem, getClasses, addClass, getMoleculesByClass, deleteClass, updateClass, getMolecules, deleteMolecule, addMolecule, updateMolecule};
